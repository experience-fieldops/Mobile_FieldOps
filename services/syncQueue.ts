import { outboxGet, outboxList, outboxPut, outboxRemove } from './outboxStore';

import { ChecklistItem } from '../data/inspections';
import { deletePhoto, persistPhoto } from './photoStore';
import { mapSeverity, toChecklistResponseRequest } from '../data/mappers';
import { getHttpStatus, isNetworkError } from './api';
import { uploadEvidence } from './evidenceService';
import {
  completeExecution,
  listExecutions,
  saveResponse,
  startExecution,
} from './executionService';
import type { Coordinates } from './location';
import { createNonConformity } from './nonConformityService';

/**
 * Fila de sincronização offline.
 *
 * Quando o técnico finaliza uma inspeção, ela entra nesta fila (salva no
 * aparelho). O envio reproduz as mesmas chamadas do fluxo online
 * (execução → respostas → não conformidades → fotos → conclusão), para que
 * os dados fiquem no mesmo modelo do backend. Com internet, o envio é
 * imediato; sem internet, a inspeção fica na fila até a conexão voltar.
 *
 * O progresso de cada etapa é gravado, então um envio interrompido continua
 * de onde parou sem duplicar não conformidades nem fotos.
 */

export type QueueStatus = 'pending' | 'error';

export interface QueuedInspection {
  inspectionId: number;
  userId: number;
  code: string;
  title: string;
  items: ChecklistItem[];
  /** Execução já criada no servidor (se a inspeção foi aberta online). */
  executionId: number | null;
  /** Data/hora local (yyyy-MM-ddTHH:mm:ss), aceita pelo LocalDateTime do backend. */
  startedAt: string;
  startGps: Coordinates | null;
  completedAt: string;
  endGps: Coordinates | null;
  queuedAt: string;
  status: QueueStatus;
  lastError?: string;
  done: {
    responses: boolean;
    /** snapshotItemId → id da não conformidade criada. */
    ncs: Record<string, number>;
    /** Chaves das fotos já enviadas. */
    evidences: string[];
    completed: boolean;
  };
}

export type NewQueuedInspection = Omit<
  QueuedInspection,
  'queuedAt' | 'status' | 'lastError' | 'done'
>;

export type SyncResult =
  | { status: 'synced' }
  | { status: 'offline'; message: string }
  | { status: 'error'; message: string };

// ── Datas ─────────────────────────────────────────────────────

/** Data/hora local sem fuso (yyyy-MM-ddTHH:mm:ss). */
export function toLocalDateTime(date: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return (
    `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}` +
    `T${p(date.getHours())}:${p(date.getMinutes())}:${p(date.getSeconds())}`
  );
}

// ── Notificação de mudanças (para as telas atualizarem) ───────

const listeners = new Set<() => void>();

export function subscribeQueue(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notify() {
  listeners.forEach((l) => {
    try {
      l();
    } catch {
      // ouvinte com erro não interrompe os demais
    }
  });
}

// ── Persistência ──────────────────────────────────────────────

export async function getQueue(userId: number): Promise<QueuedInspection[]> {
  try {
    return await outboxList<QueuedInspection>(userId);
  } catch {
    return [];
  }
}

export async function getQueuedInspection(
  userId: number,
  inspectionId: number,
): Promise<QueuedInspection | null> {
  try {
    return await outboxGet<QueuedInspection>(userId, inspectionId);
  } catch {
    return null;
  }
}

async function updateEntry(entry: QueuedInspection): Promise<void> {
  await outboxPut(
    entry.userId,
    entry.inspectionId,
    {
      status: entry.status,
      lastError: entry.lastError,
      queuedAt: entry.queuedAt,
    },
    entry,
  );
  notify();
}

async function removeEntry(userId: number, inspectionId: number) {
  await outboxRemove(userId, inspectionId);
  notify();
}

/** Hash curto (djb2) para identificar uma foto sem guardar o conteúdo. */
function shortHash(text: string): string {
  let h = 5381;
  for (let i = 0; i < text.length; i++) {
    h = ((h << 5) + h + text.charCodeAt(i)) | 0;
  }
  return (h >>> 0).toString(36);
}

// ── Enfileirar ────────────────────────────────────────────────

/**
 * Coloca (ou substitui) a inspeção na fila. Se ela já estava na fila
 * (ex.: envio anterior falhou e o técnico corrigiu), preserva o progresso
 * já enviado ao servidor para não duplicar NC/fotos.
 */
export async function enqueueInspection(
  data: NewQueuedInspection,
): Promise<QueuedInspection> {
  const items: ChecklistItem[] = [];
  for (const it of data.items) {
    const evidences = [];
    for (const ev of it.evidences) {
      evidences.push({ ...ev, uri: await persistPhoto(ev.uri) });
    }
    items.push({ ...it, evidences } as ChecklistItem);
  }

  const previous = await getQueuedInspection(data.userId, data.inspectionId);
  const entry: QueuedInspection = {
    ...data,
    items,
    executionId: data.executionId ?? previous?.executionId ?? null,
    startedAt: previous?.startedAt ?? data.startedAt,
    startGps: previous?.startGps ?? data.startGps,
    queuedAt: toLocalDateTime(),
    status: 'pending',
    lastError: undefined,
    done: previous?.done ?? {
      responses: false,
      ncs: {},
      evidences: [],
      completed: false,
    },
  };
  // Respostas podem ter mudado: regrava todas (upsert no backend, seguro).
  entry.done.responses = false;
  await updateEntry(entry);
  return entry;
}

// ── Envio ─────────────────────────────────────────────────────

async function processEntry(token: string, entry: QueuedInspection) {
  // 1) Execução: reaproveita a do servidor ou cria agora.
  if (entry.executionId == null) {
    const executions = await listExecutions(token, entry.inspectionId);
    const running = executions.find((e) => e.status === 'IN_PROGRESS');
    if (running) {
      if (running.technicianId !== entry.userId) {
        throw new Error(
          'Esta inspeção já está sendo executada por outro técnico.',
        );
      }
      entry.executionId = running.id;
    } else {
      // O backend exige GPS para iniciar. Usa a posição registrada no
      // aparelho durante a execução (início ou, na falta, a do fim).
      const gps = entry.startGps ?? entry.endGps;
      if (!gps) {
        throw new Error(
          'Localização não registrada durante a inspeção. ' +
            'Ative a localização e finalize a inspeção novamente.',
        );
      }
      const exec = await startExecution(
        token,
        entry.inspectionId,
        entry.userId,
        {
          gpsLatitude: gps.latitude,
          gpsLongitude: gps.longitude,
          startedAt: entry.startedAt,
        },
      );
      entry.executionId = exec.id;
    }
    await updateEntry(entry);
  }
  const executionId = entry.executionId;
  const answerable = entry.items.filter((it) => it.id != null);

  // 2) Respostas (upsert: repetir é seguro).
  if (!entry.done.responses) {
    for (const it of answerable) {
      await saveResponse(
        token,
        executionId,
        entry.userId,
        toChecklistResponseRequest(it, { respondedAt: entry.completedAt }),
      );
    }
    entry.done.responses = true;
    await updateEntry(entry);
  }

  // 3) Não conformidades e fotos (não idempotentes: marca cada uma enviada).
  for (const it of answerable) {
    const itemKey = String(it.id);
    let ncId: number | undefined = entry.done.ncs[itemKey];

    if (
      it.type === 'CONFORMITY' &&
      it.answer === 'Inconforme' &&
      ncId == null
    ) {
      const nc = await createNonConformity(token, entry.inspectionId, {
        title: it.title,
        severity: mapSeverity(it.ncSeverity ?? 'Média'),
        description: it.observation || undefined,
        snapshotItemId: it.id,
        evidenceAttached: it.evidences.length > 0,
      });
      ncId = nc.id;
      entry.done.ncs[itemKey] = nc.id;
      await updateEntry(entry);
    }

    for (const ev of it.evidences) {
      const evKey = `${itemKey}:${shortHash(ev.uri)}`;
      if (entry.done.evidences.includes(evKey)) continue;
      // Sem responseId: ver BACKEND_MELHORIAS.md (B-12).
      await uploadEvidence(token, entry.inspectionId, entry.userId, ev.uri, {
        nonConformityId: ncId,
      });
      entry.done.evidences.push(evKey);
      await updateEntry(entry);
    }
  }

  // 4) Conclusão.
  if (!entry.done.completed) {
    await completeExecution(token, executionId, entry.userId, {
      endGpsLatitude: entry.endGps?.latitude,
      endGpsLongitude: entry.endGps?.longitude,
      completedAt: entry.completedAt,
    });
    entry.done.completed = true;
    await updateEntry(entry);
  }
}

// Serializa os envios (finalizar, botão e auto-sync não correm juntos).
let chain: Promise<unknown> = Promise.resolve();
function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = chain.then(fn, fn);
  chain = run.catch(() => undefined);
  return run;
}

async function syncEntry(
  token: string,
  entry: QueuedInspection,
): Promise<SyncResult> {
  try {
    await processEntry(token, entry);
    await removeEntry(entry.userId, entry.inspectionId);
    // Enviada: libera as fotos guardadas no aparelho.
    for (const it of entry.items) {
      for (const ev of it.evidences) await deletePhoto(ev.uri);
    }
    return { status: 'synced' };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Erro ao sincronizar a inspeção.';

    // Sem conexão: continua na fila, sem marcar erro.
    if (isNetworkError(err)) {
      entry.lastError = message;
      await updateEntry(entry);
      return { status: 'offline', message };
    }

    // Sessão expirada: continua pendente; envia após novo login.
    if (getHttpStatus(err) === 401) {
      const msg = 'Sessão expirada. Faça login novamente para sincronizar.';
      entry.lastError = msg;
      await updateEntry(entry);
      return { status: 'error', message: msg };
    }

    // Recusa do servidor: marca erro com o motivo (visível na tela de
    // Sincronização) e mantém na fila para nova tentativa.
    entry.status = 'error';
    entry.lastError = message;
    await updateEntry(entry);
    return { status: 'error', message };
  }
}

/** Envia uma inspeção específica da fila. */
export function syncInspection(
  token: string,
  userId: number,
  inspectionId: number,
): Promise<SyncResult> {
  return withLock(async () => {
    const entry = await getQueuedInspection(userId, inspectionId);
    if (!entry) return { status: 'synced' } as SyncResult;
    return syncEntry(token, entry);
  });
}

export interface QueueSyncSummary {
  synced: number;
  failed: number;
  offline: boolean;
}

/**
 * Envia toda a fila do usuário. Para no primeiro problema de conexão.
 * `includeErrors`: também reenvia as que falharam antes (ação manual).
 */
export function syncQueue(
  token: string,
  userId: number,
  options: { includeErrors?: boolean } = {},
): Promise<QueueSyncSummary> {
  return withLock(async () => {
    const summary: QueueSyncSummary = { synced: 0, failed: 0, offline: false };
    const queue = await getQueue(userId);

    for (const entry of queue) {
      if (entry.status === 'error' && !options.includeErrors) continue;
      const result = await syncEntry(token, entry);
      if (result.status === 'synced') summary.synced += 1;
      else if (result.status === 'offline') {
        summary.offline = true;
        break;
      } else summary.failed += 1;
    }
    return summary;
  });
}
