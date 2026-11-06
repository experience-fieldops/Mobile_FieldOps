import { apiRequest } from './api';
import {
  BackendInspection,
  InspectionProgressResponse,
} from '../types/inspectionApi';

export interface ApiResponse<T> {
  data: T;
  message?: string;
  timestamp: string;
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}

export async function getAssignedInspections(
  token: string,
  technicianId: number,
  page = 0,
  size = 20,
): Promise<PageResponse<BackendInspection>> {
  const params = new URLSearchParams({
    technicianId: String(technicianId),
    page: String(page),
    size: String(size),
  });

  const response = await apiRequest<
    ApiResponse<PageResponse<BackendInspection>>
  >(`/api/v1/inspections/assigned?${params.toString()}`, token);

  return response.data;
}

/**
 * GET /api/v1/inspections/{id}
 * Detalhe de uma inspeção, incluindo os itemSnapshots do checklist.
 */
export async function getInspectionById(
  token: string,
  id: number,
): Promise<BackendInspection> {
  const response = await apiRequest<ApiResponse<BackendInspection>>(
    `/api/v1/inspections/${id}`,
    token,
  );

  return response.data;
}

/**
 * GET /api/v1/inspections/{inspectionId}/responses/progress
 * Progresso de preenchimento do checklist.
 */
export async function getInspectionProgress(
  token: string,
  inspectionId: number,
): Promise<InspectionProgressResponse> {
  const response = await apiRequest<ApiResponse<InspectionProgressResponse>>(
    `/api/v1/inspections/${inspectionId}/responses/progress`,
    token,
  );

  return response.data;
}
