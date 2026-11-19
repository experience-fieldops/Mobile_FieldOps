import AsyncStorage from './kvStorage';

import { ChecklistItem } from '../data/inspections';
import type { Coordinates } from './location';

/**
 * Rascunho da execução: as respostas são gravadas no aparelho enquanto o
 * técnico responde, para não se perderem se a tela ou o app fecharem antes
 * do "Finalizar". Ao finalizar, o rascunho vira um item da fila de
 * sincronização e é apagado.
 */

export interface InspectionDraft {
  items: ChecklistItem[];
  /** Data/hora local (yyyy-MM-ddTHH:mm:ss) do início da execução. */
  startedAt: string;
  startGps: Coordinates | null;
  /** Execução já criada no servidor, se a inspeção foi aberta online. */
  executionId: number | null;
  updatedAt: string;
}

const draftKey = (userId: number, inspectionId: number) =>
  `fieldops:draft:${userId}:${inspectionId}`;

export async function getDraft(
  userId: number,
  inspectionId: number,
): Promise<InspectionDraft | null> {
  try {
    const raw = await AsyncStorage.getItem(draftKey(userId, inspectionId));
    return raw ? (JSON.parse(raw) as InspectionDraft) : null;
  } catch {
    return null;
  }
}

export async function saveDraft(
  userId: number,
  inspectionId: number,
  draft: InspectionDraft,
): Promise<void> {
  await AsyncStorage.setItem(
    draftKey(userId, inspectionId),
    JSON.stringify(draft),
  );
}

export async function clearDraft(
  userId: number,
  inspectionId: number,
): Promise<void> {
  await AsyncStorage.removeItem(draftKey(userId, inspectionId));
}
