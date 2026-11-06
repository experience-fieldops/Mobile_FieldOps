import { apiRequest } from './api';
import { ApiResponse } from './inspectionService';
import {
  NonConformityRequest,
  NonConformityResponse,
} from '../types/inspectionApi';

/**
 * Serviço de não conformidades.
 *
 * POST /api/v1/inspections/{id}/non-conformities — cria uma NC vinculada
 * (opcionalmente) a um item do checklist via snapshotItemId.
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
