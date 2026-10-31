export type BackendInspectionStatus =
  | 'SCHEDULED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'CANCELLED';

export interface BackendInspection {
  id: number;
  clientId: number;
  clientName: string;
  siteId: number;
  siteName: string;
  assignedToId: number;
  assignedToName: string;
  templateVersionId: number;
  templateVersionNumber: number;
  templateTitle: string;
  equipmentId: number | null;
  equipmentName: string | null;
  scheduledDate: string;
  status: BackendInspectionStatus;

  startedAtDevice: string | null;
  startedAtServer: string | null;
  completedAtDevice: string | null;
  completedAtServer: string | null;

  cancelledById: number | null;
  cancelledAt: string | null;
  cancellationReason: string | null;

  version: number;
  createdAt: string;
  updatedAt: string;
}