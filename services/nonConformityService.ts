import { apiRequest } from './api';
import { ApiResponse } from './inspectionService';
import {
  NonConformityRequest,
  NonConformityResponse,
} from '../types/inspectionApi';

/**
 * Serviço de não conformidades.
 *
 * POST /api/v1/inspections/{id}/non-conformities
 * Cria uma NC vinculada à inspeção e, opcionalmente, a um item do checklist
 * via `snapshotItemId`. Campos obrigatórios no backend: `title` e `severity`.
 *
 * Autenticação e tratamento de erros HTTP (401/403/demais status) ficam no
 * cliente único `apiRequest`; erros são propagados para a tela tratar.
 */
export async function createNonConformity(
  token: string,
  inspectionId: number,
  body: NonConformityRequest,
): Promise<NonConformityResponse> {
  const response = await apiRequest<ApiResponse<NonConformityResponse>>(
    `/api/v1/inspections/${inspectionId}/non-conformities`,
    token,
    { method: 'POST', body: JSON.stringify(body) },
  );
  return response.data;
}
