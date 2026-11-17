import { Platform } from 'react-native';
import { apiRequest } from './api';
import { ApiResponse } from './inspectionService';
import { EvidenceResponse } from '../types/inspectionApi';

/**
 * Serviço de evidências (upload de fotos).
 *
 * POST /api/v1/inspections/{id}/evidences — multipart/form-data, campo `file`.
 * A evidência pode ser vinculada a uma não conformidade (nonConformityId).
 *
 * Atenção: `responseId` é o id de um InspectionResponse (fluxo
 * /inspections/{id}/responses), NÃO o id de ChecklistResponse da execução.
 * Passar o id da execução gera 404. Ver BACKEND_MELHORIAS.md (B-12).
 * Tipos aceitos pelo backend: JPEG, PNG, WEBP, HEIC, PDF (até 10 MB).
 */

export interface UploadEvidenceOptions {
  /** Id de InspectionResponse (não de ChecklistResponse). */
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
  const form = new FormData();

  if (Platform.OS === 'web') {
    // No navegador o FormData não entende { uri, name, type } (vira texto e
    // o backend não recebe a parte `file`). A URI do image-picker no web é
    // blob:/data:, então lemos o arquivo como Blob e anexamos com nome.
    const blob = await (await fetch(fileUri)).blob();
    const type = blob.type || 'image/jpeg';
    const ext =
      type === 'image/png' ? 'png' : type === 'image/webp' ? 'webp' : 'jpg';
    form.append('file', blob, `evidence-${Date.now()}.${ext}`);
  } else {
    // No React Native nativo, arquivos em FormData usam { uri, name, type }.
    const { name, type } = fileInfoFromUri(fileUri);
    form.append('file', {
      uri: fileUri,
      name,
      type,
    } as unknown as Blob);
  }

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
