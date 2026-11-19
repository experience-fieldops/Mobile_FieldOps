import type { ChecklistItem } from '../data/inspections';
import type { QueuedInspection } from '../services/syncQueue';

// ── Dublês: armazenamento em memória e serviços HTTP ──────────
const mockStore = new Map<string, unknown>();
const k = (u: number, i: number) => `${u}:${i}`;

jest.mock('../services/outboxStore', () => ({
  outboxList: async (u: number) =>
    [...mockStore.entries()]
      .filter(([key]) => key.startsWith(`${u}:`))
      .map(([, v]) => JSON.parse(JSON.stringify(v))),
  outboxGet: async (u: number, i: number) => {
    const v = mockStore.get(k(u, i));
    return v ? JSON.parse(JSON.stringify(v)) : null;
  },
  outboxPut: async (u: number, i: number, _m: unknown, payload: unknown) => {
    mockStore.set(k(u, i), JSON.parse(JSON.stringify(payload)));
  },
  outboxRemove: async (u: number, i: number) => {
    mockStore.delete(k(u, i));
  },
}));

jest.mock('../services/photoStore', () => ({
  persistPhoto: async (uri: string) => uri,
  deletePhoto: jest.fn(),
}));

jest.mock('../services/api', () => ({
  isNetworkError: (e: unknown) =>
    typeof e === 'object' &&
    e !== null &&
    (e as { network?: boolean }).network === true,
  getHttpStatus: (e: unknown) =>
    typeof e === 'object' && e !== null && 'status' in e
      ? (e as { status: number }).status
      : undefined,
}));

const mockListExecutions = jest.fn();
const mockStartExecution = jest.fn();
const mockSaveResponse = jest.fn();
const mockCompleteExecution = jest.fn();
const mockCreateNc = jest.fn();
const mockUpload = jest.fn();

jest.mock('../services/executionService', () => ({
  listExecutions: (...a: unknown[]) => mockListExecutions(...a),
  startExecution: (...a: unknown[]) => mockStartExecution(...a),
  saveResponse: (...a: unknown[]) => mockSaveResponse(...a),
  completeExecution: (...a: unknown[]) => mockCompleteExecution(...a),
}));
jest.mock('../services/nonConformityService', () => ({
  createNonConformity: (...a: unknown[]) => mockCreateNc(...a),
}));
jest.mock('../services/evidenceService', () => ({
  uploadEvidence: (...a: unknown[]) => mockUpload(...a),
}));

import {
  enqueueInspection,
  getQueue,
  syncInspection,
  syncQueue,
} from '../services/syncQueue';

const networkError = () =>
  Object.assign(new Error('Sem conexão'), { network: true });
const httpError = (status: number, message: string) =>
  Object.assign(new Error(message), { status });

const item: ChecklistItem = {
  type: 'CONFORMITY',
  id: 11,
  order: 1,
  title: 'Extintor',
  description: '',
  required: true,
  observation: 'Vazando',
  answer: 'Inconforme',
  ncSeverity: 'Alta',
  evidences: [
    { uri: 'file:///foto1.jpg', source: 'camera', capturedAt: '2026-01-01' },
  ],
};

function newEntry(over: Partial<QueuedInspection> = {}) {
  return {
    inspectionId: 2,
    userId: 3,
    code: 'INSP-2',
    title: 'Teste',
    items: [item],
    executionId: null,
    startedAt: '2026-01-01T10:00:00',
    startGps: { latitude: -23.5, longitude: -46.6 },
    completedAt: '2026-01-01T11:00:00',
    endGps: { latitude: -23.5, longitude: -46.6 },
    ...over,
  };
}

beforeEach(() => {
  mockStore.clear();
  jest.clearAllMocks();
  mockListExecutions.mockResolvedValue([]);
  mockStartExecution.mockResolvedValue({ id: 500 });
  mockSaveResponse.mockResolvedValue({});
  mockCompleteExecution.mockResolvedValue({});
  mockCreateNc.mockResolvedValue({ id: 900 });
  mockUpload.mockResolvedValue({});
});

describe('fila de sincronização (outbox)', () => {
  it('enfileira a inspeção como pendente', async () => {
    await enqueueInspection(newEntry());
    const queue = await getQueue(3);
    expect(queue).toHaveLength(1);
    expect(queue[0].status).toBe('pending');
  });

  it('envia na ordem do fluxo e remove da fila', async () => {
    await enqueueInspection(newEntry());
    const result = await syncInspection('tok', 3, 2);

    expect(result.status).toBe('synced');
    expect(mockStartExecution).toHaveBeenCalledTimes(1);
    expect(mockSaveResponse).toHaveBeenCalledTimes(1);
    expect(mockCreateNc).toHaveBeenCalledTimes(1);
    expect(mockUpload).toHaveBeenCalledTimes(1);
    expect(mockCompleteExecution).toHaveBeenCalledTimes(1);
    expect(await getQueue(3)).toHaveLength(0);
  });

  it('sem conexão, mantém na fila como pendente e guarda o motivo', async () => {
    mockStartExecution.mockRejectedValueOnce(networkError());
    await enqueueInspection(newEntry());

    const result = await syncInspection('tok', 3, 2);
    expect(result.status).toBe('offline');

    const [entry] = await getQueue(3);
    expect(entry.status).toBe('pending');
    expect(entry.lastError).toBe('Sem conexão');
  });

  it('retoma sem duplicar não conformidade nem foto', async () => {
    mockUpload.mockRejectedValueOnce(networkError());
    await enqueueInspection(newEntry());

    expect((await syncInspection('tok', 3, 2)).status).toBe('offline');
    expect(mockCreateNc).toHaveBeenCalledTimes(1);

    // A execução já existe no servidor: não cria outra.
    expect((await syncInspection('tok', 3, 2)).status).toBe('synced');
    expect(mockStartExecution).toHaveBeenCalledTimes(1);
    expect(mockCreateNc).toHaveBeenCalledTimes(1);
    expect(mockUpload).toHaveBeenCalledTimes(2);
    expect(mockCompleteExecution).toHaveBeenCalledTimes(1);
  });

  it('recusa do servidor marca erro com o motivo e mantém na fila', async () => {
    mockSaveResponse.mockRejectedValueOnce(httpError(400, 'Valor inválido'));
    await enqueueInspection(newEntry());

    const result = await syncInspection('tok', 3, 2);
    expect(result).toEqual({ status: 'error', message: 'Valor inválido' });
    const [entry] = await getQueue(3);
    expect(entry.status).toBe('error');
    expect(entry.lastError).toBe('Valor inválido');
  });

  it('sessão vencida (401) continua pendente', async () => {
    mockStartExecution.mockRejectedValueOnce(httpError(401, 'Unauthorized'));
    await enqueueInspection(newEntry());

    const result = await syncInspection('tok', 3, 2);
    expect(result.status).toBe('error');
    const [entry] = await getQueue(3);
    expect(entry.status).toBe('pending');
  });

  it('syncQueue para no primeiro problema de conexão', async () => {
    mockStartExecution.mockRejectedValue(networkError());
    await enqueueInspection(newEntry({ inspectionId: 2 }));
    await enqueueInspection(newEntry({ inspectionId: 5 }));

    const summary = await syncQueue('tok', 3);
    expect(summary).toEqual({ synced: 0, failed: 0, offline: true });
    expect(mockStartExecution).toHaveBeenCalledTimes(1);
  });

  it('reaproveita a execução em andamento do mesmo técnico', async () => {
    mockListExecutions.mockResolvedValue([
      { id: 77, status: 'IN_PROGRESS', technicianId: 3 },
    ]);
    await enqueueInspection(newEntry());
    await syncInspection('tok', 3, 2);
    expect(mockStartExecution).not.toHaveBeenCalled();
    expect(mockCompleteExecution.mock.calls[0][1]).toBe(77);
  });

  it('não mistura filas de usuários diferentes', async () => {
    await enqueueInspection(newEntry({ userId: 3 }));
    await enqueueInspection(newEntry({ userId: 8 }));
    expect(await getQueue(3)).toHaveLength(1);
    expect(await getQueue(8)).toHaveLength(1);
  });
});
