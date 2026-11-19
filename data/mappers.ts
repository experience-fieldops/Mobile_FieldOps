/**
 * Conversão DTO (backend) → view model (UI).
 *
 * Isola a tradução do contrato da API para o formato que as telas
 * consomem. Campos sem origem no backend recebem valores derivados ou
 * padrão, marcados com TODO(D-xx) (ver INTEGRACAO.md §8).
 */

import {
  BackendInspection,
  BackendInspectionStatus,
  BackendResponseType,
  InspectionItemSnapshotResponse,
  ChecklistResponseRequest,
  NonConformitySeverity,
} from '../types/inspectionApi';
import {
  Inspection,
  Severity,
  InspectionStatus,
  Priority,
  ChecklistItem,
  ChecklistItemType,
  ChecklistAnswer,
} from './inspections';

// ─────────────────────────────────────────────────────────────
// Datas
// ─────────────────────────────────────────────────────────────

/** Formata uma data ISO (yyyy-mm-dd ou date-time) para dd/mm/aaaa. */
export function formatDateBR(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const yyyy = d.getUTCFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

/**
 * Verdadeiro quando a inspeção está atrasada: prazo (scheduledDate) no
 * passado e ainda não finalizada/cancelada (D-14).
 */
export function isOverdue(
  scheduledDate: string,
  status: BackendInspectionStatus,
  now: Date = new Date(),
): boolean {
  const closed: BackendInspectionStatus[] = [
    'COMPLETED',
    'APPROVED',
    'CANCELLED',
  ];
  if (closed.includes(status)) return false;
  const due = new Date(scheduledDate);
  if (Number.isNaN(due.getTime())) return false;
  return due.getTime() < now.getTime();
}

// ─────────────────────────────────────────────────────────────
// Status EN → rótulo PT (D-14)
// ─────────────────────────────────────────────────────────────

/**
 * Converte o status do backend no rótulo exibido pela UI.
 * `REJECTED` vira "Devolvida". "Atrasada" é derivado à parte (ver
 * mapInspection) e tem precedência visual nos filtros.
 */
export function mapStatus(status: BackendInspectionStatus): InspectionStatus {
  switch (status) {
    case 'SCHEDULED':
      return 'Atribuída';
    case 'IN_PROGRESS':
      return 'Em Andamento';
    case 'REJECTED':
      return 'Devolvida';
    case 'COMPLETED':
    case 'APPROVED':
    case 'UNDER_REVIEW':
      return 'Concluída';
    case 'CANCELLED':
      // Sem rótulo dedicado na UI atual; aproxima para "Devolvida".
      return 'Devolvida';
    default:
      return 'Atribuída';
  }
}

// ─────────────────────────────────────────────────────────────
// Prioridade (D-06 — pendente de decisão)
// ─────────────────────────────────────────────────────────────

/**
 * TODO(D-06): backend não expõe prioridade. Enquanto não houver origem
 * definida, retorna 'Média' como padrão neutro.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function derivePriority(_inspection: BackendInspection): Priority {
  return 'Média';
}

// ─────────────────────────────────────────────────────────────
// Inspeção: BackendInspection → Inspection (UI)
// ─────────────────────────────────────────────────────────────

export function mapInspection(
  dto: BackendInspection,
  now: Date = new Date(),
): Inspection {
  const overdue = isOverdue(dto.scheduledDate, dto.status, now);
  return {
    id: dto.id, // D-02: id numérico
    // TODO(D-06): backend não tem código amigável; derivado de id.
    code: `INSP-${dto.id}`,
    title: dto.templateTitle,
    priority: derivePriority(dto),
    // TODO(D-06): progresso real vem de GET /inspections/{id}/responses/progress (M3).
    progress: 0,
    deadline: formatDateBR(dto.scheduledDate),
    deadlineOverdue: overdue,
    // Iniciada e ainda não finalizada fica sempre em "Em Andamento", mesmo
    // com prazo vencido (o prazo segue destacado via deadlineOverdue).
    // "Atrasada" vale para as não iniciadas com prazo vencido.
    status:
      dto.status === 'IN_PROGRESS'
        ? 'Em Andamento'
        : dto.status === 'REJECTED'
          ? 'Devolvida'
          : overdue
            ? 'Atrasada'
            : mapStatus(dto.status),
    assignee: dto.assignedToName,
    equipment: dto.equipmentName ?? '—',
    // TODO(D-06): backend não expõe tempo estimado.
    estimatedTime: '—',
    area: dto.siteName,
    location: dto.siteName,
  };
}

export function mapInspections(
  dtos: BackendInspection[],
  now: Date = new Date(),
): Inspection[] {
  return dtos.map((d) => mapInspection(d, now));
}

// ─────────────────────────────────────────────────────────────
// Item de checklist: snapshot → ChecklistItem (UI) (D-08)
// ─────────────────────────────────────────────────────────────

/**
 * Mapeia o responseType do backend para o tipo de input da UI.
 * TEXT_SHORT/TEXT_LONG → TEXT; SINGLE_CHOICE → CHOICE.
 * (PHOTO não existe no backend; é tratado via evidências.)
 */
export function mapResponseType(rt: BackendResponseType): ChecklistItemType {
  switch (rt) {
    case 'TEXT_SHORT':
    case 'TEXT_LONG':
      return 'TEXT';
    case 'NUMBER':
      return 'NUMBER';
    case 'BOOLEAN':
      return 'BOOLEAN';
    case 'CONFORMITY':
      return 'CONFORMITY';
    case 'SINGLE_CHOICE':
      return 'CHOICE';
    case 'DATE':
      return 'DATE';
    default:
      return 'TEXT';
  }
}

/** Extrai as opções de um item SINGLE_CHOICE a partir do optionsJson. */
function parseChoices(optionsJson: string | null): string[] {
  if (!optionsJson) return [];
  try {
    const parsed = JSON.parse(optionsJson);
    if (Array.isArray(parsed)) return parsed.map((o) => String(o));
    return [];
  } catch {
    return [];
  }
}

/**
 * Converte um snapshot do backend num ChecklistItem vazio (sem respostas),
 * pronto para a tela de execução preencher. `order` usa itemDisplayOrder.
 */
export function mapSnapshotToChecklistItem(
  snap: InspectionItemSnapshotResponse,
): ChecklistItem {
  const uiType = mapResponseType(snap.responseType);
  const base = {
    id: snap.id,
    order: snap.itemDisplayOrder,
    title: snap.title,
    description: snap.description ?? '',
    required: snap.required,
    observation: '',
    requiresEvidence: snap.evidenceRequiredOnFailure,
    evidences: [],
  };

  switch (uiType) {
    case 'CONFORMITY':
      return { ...base, type: 'CONFORMITY', answer: null };
    case 'NUMBER':
      return { ...base, type: 'NUMBER', numberAnswer: '' };
    case 'BOOLEAN':
      return { ...base, type: 'BOOLEAN', booleanAnswer: null };
    case 'CHOICE':
      return {
        ...base,
        type: 'CHOICE',
        choiceAnswer: '',
        choices: parseChoices(snap.optionsJson),
      };
    case 'DATE':
      return { ...base, type: 'DATE', dateAnswer: '' };
    case 'TEXT':
    default:
      return { ...base, type: 'TEXT', textAnswer: '' };
  }
}

export function mapSnapshotsToChecklist(
  snaps: InspectionItemSnapshotResponse[],
): ChecklistItem[] {
  return [...snaps]
    .sort(
      (a, b) =>
        a.sectionDisplayOrder - b.sectionDisplayOrder ||
        a.itemDisplayOrder - b.itemDisplayOrder,
    )
    .map(mapSnapshotToChecklistItem);
}

// ─────────────────────────────────────────────────────────────
// Resposta de checklist: ChecklistItem (UI) → request do backend
// ─────────────────────────────────────────────────────────────

/**
 * Rótulo de conformidade da UI → enum `ConformityValue` do backend
 * (B-01/D-07). O backend valida o `value` de itens CONFORMITY contra
 * esse enum e responde 400 para qualquer outro texto.
 */
const CONFORMITY_VALUE: Record<NonNullable<ChecklistAnswer>, string> = {
  Conforme: 'CONFORMING',
  Atenção: 'ATTENTION',
  Inconforme: 'NON_CONFORMING',
  'Não verificado': 'NOT_VERIFIED',
};

/** Converte a resposta de conformidade no `value` enviado ao backend. */
export function conformityToValue(answer: ChecklistAnswer): string | undefined {
  return answer ? CONFORMITY_VALUE[answer] : undefined;
}

/**
 * Data digitada na UI (dd/mm/aaaa) → ISO yyyy-MM-dd, exigido pelo backend.
 * Já em ISO é mantida. Retorna undefined se não for uma data completa e
 * válida, para não enviar um valor que o backend rejeitaria com 400.
 */
export function dateToIso(input: string): string | undefined {
  const text = input.trim();
  if (!text) return undefined;

  let year: number;
  let month: number;
  let day: number;

  const br = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text);
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (br) {
    [day, month, year] = [Number(br[1]), Number(br[2]), Number(br[3])];
  } else if (iso) {
    [year, month, day] = [Number(iso[1]), Number(iso[2]), Number(iso[3])];
  } else {
    return undefined;
  }

  // Rejeita datas inexistentes (ex.: 31/02), como o LocalDate.parse do backend.
  const d = new Date(Date.UTC(year, month - 1, day));
  if (
    d.getUTCFullYear() !== year ||
    d.getUTCMonth() !== month - 1 ||
    d.getUTCDate() !== day
  ) {
    return undefined;
  }

  const pad = (n: number) => String(n).padStart(2, '0');
  return `${year}-${pad(month)}-${pad(day)}`;
}

/** Número digitado (aceita vírgula decimal) → formato com ponto do backend. */
export function numberToBackend(input: string): string | undefined {
  const text = input.trim().replace(',', '.');
  return text && Number.isFinite(Number(text)) ? text : undefined;
}

/**
 * Extrai o `value` (string) de qualquer item do checklist, conforme o
 * tipo de input da UI.
 */
export function checklistItemValue(item: ChecklistItem): string | undefined {
  switch (item.type) {
    case 'CONFORMITY':
      return conformityToValue(item.answer);
    case 'TEXT':
      return item.textAnswer || undefined;
    case 'NUMBER':
      return numberToBackend(item.numberAnswer);
    case 'BOOLEAN':
      return item.booleanAnswer == null
        ? undefined
        : String(item.booleanAnswer);
    case 'CHOICE':
      return item.choiceAnswer || undefined;
    case 'DATE':
      return dateToIso(item.dateAnswer);
    case 'PHOTO':
      // Fotos vão como evidência (M5), não como value.
      return undefined;
    default:
      return undefined;
  }
}

/**
 * Monta o corpo da requisição de resposta de um item.
 * Requer o `snapshotItemId` (vindo do backend via itemSnapshots).
 * GPS e respondedAt são opcionais e preenchidos pelo chamador.
 */
export function toChecklistResponseRequest(
  item: ChecklistItem,
  options?: {
    gpsLatitude?: number;
    gpsLongitude?: number;
    respondedAt?: string;
  },
): ChecklistResponseRequest {
  if (item.id == null) {
    throw new Error(
      'Item sem snapshotItemId: não é possível enviar a resposta ao backend.',
    );
  }
  return {
    snapshotItemId: item.id,
    value: checklistItemValue(item),
    observation: item.observation || undefined,
    notApplicable: false,
    gpsLatitude: options?.gpsLatitude,
    gpsLongitude: options?.gpsLongitude,
    respondedAt: options?.respondedAt,
  };
}

// ─────────────────────────────────────────────────────────────
// Severidade de não conformidade: rótulo PT (UI) → enum backend
// ─────────────────────────────────────────────────────────────

export function mapSeverity(sev: Severity): NonConformitySeverity {
  switch (sev) {
    case 'Baixa':
      return 'LOW';
    case 'Média':
      return 'MEDIUM';
    case 'Alta':
      return 'HIGH';
    case 'Crítica':
      return 'CRITICAL';
    default:
      return 'MEDIUM';
  }
}
