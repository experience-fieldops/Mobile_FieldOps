import { apiRequest } from './api';
import { ApiResponse } from './inspectionService';
import { EquipmentResponse } from '../types/inspectionApi';

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
