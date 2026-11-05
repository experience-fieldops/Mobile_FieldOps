
import { apiRequest } from './api';
import { BackendInspection } from '../types/inspectionApi';

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
  size = 20
): Promise<PageResponse<BackendInspection>> {
  const params = new URLSearchParams({
    technicianId: String(technicianId),
    page: String(page),
    size: String(size),
  });

  const response = await apiRequest<
    ApiResponse<PageResponse<BackendInspection>>
  >(
    `/api/v1/inspections/assigned?${params.toString()}`,
    token
  );

  return response.data;
}
