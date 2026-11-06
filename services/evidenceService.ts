import { apiRequest } from './api';
import { ApiResponse } from './inspectionService';
import { EvidenceResponse } from '../types/inspectionApi';

/**
 * Serviço de evidências (upload de fotos).
 *
 * POST /api/v1/inspections/{id}/evidences — multipart/form-data, campo `file`.
 * A evidência pode ser vinculada a uma resposta (responseId) e/ou a uma
 * não conformidade (nonConformityId).
 */

export interface UploadEvidenceOptions {
  responseId?: number;
  nonConformityId?: number;
}

/**
 * Deriva nome e mime a partir da URI local do arquivo (expo-image-picker).
 */
function fileInfoFromUri(uri: string): { name: string; type: string } {
  const name = uri.split('/').pop() || `evidence-${Date.now()}.jpg`;
  const ext = name.includes('.') ? name.split('.').pop()!.toLowerCase() : 'jpg';
  const type = ext === 'png' ? 'image/png' : 'image/jpeg';
  return { name, type };
}

export async function uploadEvidence(
  token: string,
  inspectionId: number,
  uploadedByUserId: number,
  fileUri: string,
  options: UploadEvidenceOptions = {},
): Promise<EvidenceResponse> {
  const { name, type } = fileInfoFromUri(fileUri);

  const form = new FormData();
  // No React Native, arquivos em FormData usam { uri, name, type }.
  form.append('file', {
    uri: fileUri,
    name,
    type,
  } as unknown as Blob);

  const params = new URLSearchParams({
    uploadedByUserId: String(uploadedByUserId),
  });
  if (options.responseId != null) {
    params.append('responseId', String(options.responseId));
  }
  if (options.nonConformityId != null) {
    params.append('nonConformityId', String(options.nonConformityId));
  }

  const response = await apiRequest<ApiResponse<EvidenceResponse>>(
    `/api/v1/inspections/${inspectionId}/evidences?${params.toString()}`,
    token,
    { method: 'POST', body: form },
  );
  return response.data;
}
