/**
 * Tipos utilizados pela API de inspeções do Spring Boot.
 *
 * Origem:
 * Backend - InspectionResponse.java
 * Backend - InspectionStatus.java
 */

// Estados possíveis de uma inspeção no backend
export type BackendInspectionStatus =
  | 'SCHEDULED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'CANCELLED';

// Tipo de resposta esperado por um item do checklist (snapshot do template)
export type BackendResponseType =
  | 'TEXT_SHORT'
  | 'TEXT_LONG'
  | 'NUMBER'
  | 'BOOLEAN'
  | 'CONFORMITY'
  | 'SINGLE_CHOICE'
  | 'DATE';

/**
 * Item congelado (snapshot) do template no momento da criação da inspeção.
 *
 * Origem: Backend - InspectionItemSnapshotResponse.java
 * Retornado dentro de InspectionResponse.itemSnapshots no
 * GET /api/v1/inspections/{id}.
 */
export interface InspectionItemSnapshotResponse {
  id: number;
  originalItemId: number;
  code: string;
  title: string;
  description: string | null;
  responseType: BackendResponseType;
  required: boolean;
  observationRequiredOnFailure: boolean;
  evidenceRequiredOnFailure: boolean;
  /** JSON (string) com as opções, quando responseType = SINGLE_CHOICE. */
  optionsJson: string | null;
  sectionTitle: string;
  sectionDisplayOrder: number;
  itemDisplayOrder: number;
}

// Estrutura de uma inspeção recebida da API
export interface BackendInspection {
  id: number;

  // Cliente
  clientId: number;
  clientName: string;

  // Local
  siteId: number;
  siteName: string;

  // Técnico responsável
  assignedToId: number;
  assignedToName: string;

  // Modelo de checklist
  templateVersionId: number;
  templateVersionNumber: number;
  templateTitle: string;

  // Equipamento (opcional)
  equipmentId: number | null;
  equipmentName: string | null;

  // Agendamento
  scheduledDate: string;

  // Situação da inspeção
  status: BackendInspectionStatus;

  // Início da execução
  startedAtDevice: string | null;
  startedAtServer: string | null;

  // Conclusão
  completedAtDevice: string | null;
  completedAtServer: string | null;

  // Cancelamento
  cancelledById: number | null;
  cancelledAt: string | null;
  cancellationReason: string | null;

  // Controle e auditoria
  version: number;
  createdAt: string;
  updatedAt: string;

  /**
   * Itens do checklist (snapshots do template).
   *
   * Retornados pelo GET /api/v1/inspections/{id}
   * (ausentes na listagem paginada).
   */
  itemSnapshots?: InspectionItemSnapshotResponse[] | null;
}

/**
 * Progresso de preenchimento do checklist de uma inspeção.
 *
 * Origem: Backend - InspectionProgressResponse.java
 * GET /api/v1/inspections/{inspectionId}/responses/progress
 */
export interface InspectionProgressResponse {
  inspectionId: number;
  totalItems: number;
  answeredItems: number;
  notApplicableItems: number;
  applicableItems: number;
  pendingItems: number;
  /** Percentual 0–100 (double). */
  progressPercentage: number;
}
