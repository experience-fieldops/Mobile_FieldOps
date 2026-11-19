import * as SQLite from 'expo-sqlite';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Outbox: fila de inspeções finalizadas aguardando envio ao servidor.
 * Fica numa tabela SQLite (uma linha por inspeção e usuário), então a
 * gravação de uma inspeção é atômica e sobrevive ao fechamento do app.
 *
 * `status` e `last_error` ficam em colunas para consulta; o restante da
 * inspeção (respostas, fotos, progresso por etapa) fica em `payload` (JSON).
 */

const DB_NAME = 'fieldops.db';
const DB_VERSION = 1;

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function migrate(db: SQLite.SQLiteDatabase): Promise<void> {
  const row = await db.getFirstAsync<{ user_version: number }>(
    'PRAGMA user_version',
  );
  let version = row?.user_version ?? 0;
  if (version >= DB_VERSION) return;

  await db.execAsync('PRAGMA journal_mode = WAL');
  if (version === 0) {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS outbox (
        user_id       INTEGER NOT NULL,
        inspection_id INTEGER NOT NULL,
        status        TEXT NOT NULL,
        last_error    TEXT,
        queued_at     TEXT NOT NULL,
        payload       TEXT NOT NULL,
        PRIMARY KEY (user_id, inspection_id)
      );
    `);
    version = 1;
  }
  await db.execAsync(`PRAGMA user_version = ${DB_VERSION}`);
}

function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync(DB_NAME);
      await migrate(db);
      return db;
    })();
    // Se a abertura falhar, permite tentar de novo na próxima chamada.
    dbPromise.catch(() => {
      dbPromise = null;
    });
  }
  return dbPromise;
}

export interface OutboxMeta {
  status: string;
  lastError?: string | null;
  queuedAt: string;
}

// Versões anteriores guardavam a fila no AsyncStorage. Importa uma vez.
const migratedUsers = new Set<number>();

async function importLegacy(userId: number): Promise<void> {
  if (migratedUsers.has(userId)) return;
  migratedUsers.add(userId);
  const key = `fieldops:queue:${userId}`;
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return;
    const list = JSON.parse(raw) as Array<
      OutboxMeta & { inspectionId: number }
    >;
    for (const entry of list) {
      await outboxPut(userId, entry.inspectionId, entry, entry);
    }
    await AsyncStorage.removeItem(key);
  } catch {
    // mantém a cópia antiga se a importação falhar
    migratedUsers.delete(userId);
  }
}

export async function outboxList<T>(userId: number): Promise<T[]> {
  await importLegacy(userId);
  const db = await getDb();
  const rows = await db.getAllAsync<{ payload: string }>(
    'SELECT payload FROM outbox WHERE user_id = ? ORDER BY queued_at',
    userId,
  );
  return rows.map((r) => JSON.parse(r.payload) as T);
}

export async function outboxGet<T>(
  userId: number,
  inspectionId: number,
): Promise<T | null> {
  await importLegacy(userId);
  const db = await getDb();
  const row = await db.getFirstAsync<{ payload: string }>(
    'SELECT payload FROM outbox WHERE user_id = ? AND inspection_id = ?',
    userId,
    inspectionId,
  );
  return row ? (JSON.parse(row.payload) as T) : null;
}

export async function outboxPut(
  userId: number,
  inspectionId: number,
  meta: OutboxMeta,
  payload: unknown,
): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO outbox (user_id, inspection_id, status, last_error, queued_at, payload)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT (user_id, inspection_id) DO UPDATE SET
       status = excluded.status,
       last_error = excluded.last_error,
       queued_at = excluded.queued_at,
       payload = excluded.payload`,
    userId,
    inspectionId,
    meta.status,
    meta.lastError ?? null,
    meta.queuedAt,
    JSON.stringify(payload),
  );
}

export async function outboxRemove(
  userId: number,
  inspectionId: number,
): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'DELETE FROM outbox WHERE user_id = ? AND inspection_id = ?',
    userId,
    inspectionId,
  );
}
