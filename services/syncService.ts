import { apiRequest } from './api';
import { ApiResponse } from './inspectionService';
import {
  PendingSyncInspectionResponse,
  SyncStatusResponse,
  SyncRequest,
  SyncResponse,
} from '../types/inspectionApi';

/**
 * Serviço de sincronização offline.
 *
 * Nota: o upload de lote (pushSync) está tipado e disponível, mas o app
 * ainda não mantém uma fila offline — a execução grava online (M4/M5).
 * A fila de upload offline é um trabalho futuro (ver INTEGRACAO_MODULOS.md
 * e BACKEND_MELHORIAS.md, B-11).
 */

/**
 * GET /api/v1/my-orders/pending-sync?technicianId
 * Ordens disponíveis para download offline (SCHEDULED/IN_PROGRESS do técnico).
 */
export async function getPendingSync(
  token: string,
  technicianId: number,
): Promise<PendingSyncInspectionResponse[]> {
  const response = await apiRequest<
    ApiResponse<PendingSyncInspectionResponse[]>
  >(`/api/v1/my-orders/pending-sync?technicianId=${technicianId}`, token);
  return response.data;
}

/**
 * GET /api/v1/inspections/{id}/sync-status
 * Status de sincronização de uma inspeção.
 */
export async function getSyncStatus(
  token: string,
  inspectionId: number,
): Promise<SyncStatusResponse> {
  const response = await apiRequest<ApiResponse<SyncStatusResponse>>(
    `/api/v1/inspections/${inspectionId}/sync-status`,
    token,
  );
  return response.data;
}

/**
 * POST /api/v1/sync?technicianId
 * Envia um lote de operações offline. (Reservado para quando houver fila
 * local — ainda não acionado pela UI.)
 */
export async function pushSync(
  token: string,
  technicianId: number,
  body: SyncRequest,
): Promise<SyncResponse> {
  const response = await apiRequest<ApiResponse<SyncResponse>>(
    `/api/v1/sync?technicianId=${technicianId}`,
    token,
    { method: 'POST', body: JSON.stringify(body) },
  );
  return response.data;
}
