import AsyncStorage from '@react-native-async-storage/async-storage';

import { BackendInspection } from '../types/inspectionApi';
import { getInspectionById } from './inspectionService';

/**
 * Cache local das inspeções atribuídas, para abrir e executar sem internet.
 *
 * Tudo é salvo por usuário (chave inclui o id), para que dados de um
 * técnico não apareçam para outro no mesmo aparelho. Usa AsyncStorage,
 * que funciona no celular e no web (localStorage).
 */

const listKey = (userId: number) => `fieldops:cache:${userId}:inspections`;
const detailKey = (userId: number, inspectionId: number) =>
  `fieldops:cache:${userId}:inspection:${inspectionId}`;

/** Status em que a inspeção ainda pode ser executada. */
export function isExecutable(status: BackendInspection['status']): boolean {
  return status === 'SCHEDULED' || status === 'IN_PROGRESS';
}

async function readJson<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export async function saveCachedInspections(
  userId: number,
  list: BackendInspection[],
): Promise<void> {
  await AsyncStorage.setItem(listKey(userId), JSON.stringify(list));
}

export function getCachedInspections(
  userId: number,
): Promise<BackendInspection[] | null> {
  return readJson<BackendInspection[]>(listKey(userId));
}

export async function saveCachedInspectionDetail(
  userId: number,
  detail: BackendInspection,
): Promise<void> {
  await AsyncStorage.setItem(
    detailKey(userId, detail.id),
    JSON.stringify(detail),
  );
}

export function getCachedInspectionDetail(
  userId: number,
  inspectionId: number,
): Promise<BackendInspection | null> {
  return readJson<BackendInspection>(detailKey(userId, inspectionId));
}

/**
 * Baixa e guarda o detalhe (com os itens do checklist) das inspeções que
 * ainda podem ser executadas, para que abram sem internet depois.
 * Falhas individuais são ignoradas: o cache é "melhor esforço".
 */
export async function prefetchExecutableDetails(
  token: string,
  userId: number,
  list: BackendInspection[],
): Promise<void> {
  for (const insp of list) {
    if (!isExecutable(insp.status)) continue;
    try {
      const detail = await getInspectionById(token, insp.id);
      await saveCachedInspectionDetail(userId, detail);
    } catch {
      // Sem rede ou erro pontual: mantém o que já estiver em cache.
    }
  }
}
