import { apiRequest } from './api';
import { ApiResponse } from './inspectionService';
import {
  ExecutionResponse,
  StartExecutionRequest,
  CompleteExecutionRequest,
  ChecklistResponseRequest,
  ChecklistResponseDTO,
} from '../types/inspectionApi';

/**
 * Serviço de execução de inspeção em campo (perfil TECNICO).
 *
 * Fluxo: iniciar execução (com GPS) → gravar respostas por item →
 * finalizar. Todos os endpoints exigem o requestingUserId na query.
 */

/**
 * POST /api/v1/inspections/{inspectionId}/executions
 * Inicia a execução da inspeção. GPS é obrigatório no backend.
 */
export async function startExecution(
  token: string,
  inspectionId: number,
  requestingUserId: number,
  body: StartExecutionRequest,
): Promise<ExecutionResponse> {
  const response = await apiRequest<ApiResponse<ExecutionResponse>>(
    `/api/v1/inspections/${inspectionId}/executions?requestingUserId=${requestingUserId}`,
    token,
    { method: 'POST', body: JSON.stringify(body) },
  );
  return response.data;
}

/**
 * POST /api/v1/executions/{executionId}/responses
 * Grava a resposta de um item do checklist.
 */
export async function saveResponse(
  token: string,
  executionId: number,
  requestingUserId: number,
  body: ChecklistResponseRequest,
): Promise<ChecklistResponseDTO> {
  const response = await apiRequest<ApiResponse<ChecklistResponseDTO>>(
    `/api/v1/executions/${executionId}/responses?requestingUserId=${requestingUserId}`,
    token,
    { method: 'POST', body: JSON.stringify(body) },
  );
  return response.data;
}

/**
 * PATCH /api/v1/executions/{executionId}/complete
 * Finaliza a execução.
 */
export async function completeExecution(
  token: string,
  executionId: number,
  requestingUserId: number,
  body: CompleteExecutionRequest,
): Promise<ExecutionResponse> {
  const response = await apiRequest<ApiResponse<ExecutionResponse>>(
    `/api/v1/executions/${executionId}/complete?requestingUserId=${requestingUserId}`,
    token,
    { method: 'PATCH', body: JSON.stringify(body) },
  );
  return response.data;
}

/**
 * PATCH /api/v1/executions/{executionId}/pause
 * Pausa a execução temporariamente.
 */
export async function pauseExecution(
  token: string,
  executionId: number,
  requestingUserId: number,
): Promise<ExecutionResponse> {
  const response = await apiRequest<ApiResponse<ExecutionResponse>>(
    `/api/v1/executions/${executionId}/pause?requestingUserId=${requestingUserId}`,
    token,
    { method: 'PATCH' },
  );
  return response.data;
}

/**
 * GET /api/v1/executions/{executionId}
 * Busca uma execução por ID.
 */
export async function getExecutionById(
  token: string,
  executionId: number,
): Promise<ExecutionResponse> {
  const response = await apiRequest<ApiResponse<ExecutionResponse>>(
    `/api/v1/executions/${executionId}`,
    token,
  );
  return response.data;
}
