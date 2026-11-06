import { apiRequest } from './api';
import { ApiResponse, PageResponse } from './inspectionService';
import { EquipmentResponse, EquipmentStatus } from '../types/inspectionApi';

/**
 * Serviço de equipamentos.
 */

/**
 * GET /api/v1/equipments/qrcode/{qrCode}
 * Resolve um equipamento a partir do conteúdo lido de um QR code.
 */
export async function getEquipmentByQrCode(
  token: string,
  qrCode: string,
): Promise<EquipmentResponse> {
  const response = await apiRequest<ApiResponse<EquipmentResponse>>(
    `/api/v1/equipments/qrcode/${encodeURIComponent(qrCode)}`,
    token,
  );
  return response.data;
}

/**
 * GET /api/v1/sites/{siteId}/equipments
 * Lista (paginada) os equipamentos de um site, com filtros opcionais.
 */
export async function getEquipmentsBySite(
  token: string,
  siteId: number,
  options: {
    name?: string;
    status?: EquipmentStatus;
    page?: number;
    size?: number;
  } = {},
): Promise<PageResponse<EquipmentResponse>> {
  const params = new URLSearchParams({
    page: String(options.page ?? 0),
    size: String(options.size ?? 50),
  });
  if (options.name) params.append('name', options.name);
  if (options.status) params.append('status', options.status);

  const response = await apiRequest<
    ApiResponse<PageResponse<EquipmentResponse>>
  >(`/api/v1/sites/${siteId}/equipments?${params.toString()}`, token);
  return response.data;
}
