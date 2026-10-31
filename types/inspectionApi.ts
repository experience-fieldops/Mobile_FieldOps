
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
   * Itens do checklist.
   *
   * O backend informa que são retornados
   * no GET /api/v1/inspections/{id}.
   *
   * Vamos tipar esses itens quando analisarmos
   * InspectionItemSnapshotResponse.java.
   */
  itemSnapshots?: unknown[] | null;
}
