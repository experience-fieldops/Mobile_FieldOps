import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Outbox no web: o SQLite do Expo ainda é experimental nesta plataforma,
 * então a fila fica no AsyncStorage (localStorage). Mesma API do
 * outboxStore.ts (SQLite) usado no celular.
 */

export interface OutboxMeta {
  status: string;
  lastError?: string | null;
  queuedAt: string;
}

type Stored = { inspectionId: number } & Record<string, unknown>;

const key = (userId: number) => `fieldops:queue:${userId}`;

async function read(userId: number): Promise<Stored[]> {
  try {
    const raw = await AsyncStorage.getItem(key(userId));
    return raw ? (JSON.parse(raw) as Stored[]) : [];
  } catch {
    return [];
  }
}

export async function outboxList<T>(userId: number): Promise<T[]> {
  return (await read(userId)) as unknown as T[];
}

export async function outboxGet<T>(
  userId: number,
  inspectionId: number,
): Promise<T | null> {
  const found = (await read(userId)).find(
    (e) => e.inspectionId === inspectionId,
  );
  return (found as unknown as T) ?? null;
}

export async function outboxPut(
  userId: number,
  inspectionId: number,
  _meta: OutboxMeta,
  payload: unknown,
): Promise<void> {
  const list = (await read(userId)).filter(
    (e) => e.inspectionId !== inspectionId,
  );
  list.push(payload as Stored);
  await AsyncStorage.setItem(key(userId), JSON.stringify(list));
}

export async function outboxRemove(
  userId: number,
  inspectionId: number,
): Promise<void> {
  const list = (await read(userId)).filter(
    (e) => e.inspectionId !== inspectionId,
  );
  await AsyncStorage.setItem(key(userId), JSON.stringify(list));
}
