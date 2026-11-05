/**
 * Conversão DTO (backend) → view model (UI).
 *
 * Isola a tradução do contrato da API para o formato que as telas
 * consomem. Campos sem origem no backend recebem valores derivados ou
 * padrão, marcados com TODO(D-xx) (ver INTEGRACAO.md §8).
 */

import {
  BackendInspection,
  BackendInspectionStatus,
  BackendResponseType,
  InspectionItemSnapshotResponse,
} from '../types/inspectionApi';
import {
  Inspection,
  InspectionStatus,
  Priority,
  ChecklistItem,
  ChecklistItemType,
} from './inspections';

// ─────────────────────────────────────────────────────────────
// Datas
// ─────────────────────────────────────────────────────────────

/** Formata uma data ISO (yyyy-mm-dd ou date-time) para dd/mm/aaaa. */
export function formatDateBR(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const yyyy = d.getUTCFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

/**
 * Verdadeiro quando a inspeção está atrasada: prazo (scheduledDate) no
 * passado e ainda não finalizada/cancelada (D-14).
 */
export function isOverdue(
  scheduledDate: string,
  status: BackendInspectionStatus,
  now: Date = new Date()
): boolean {
  const closed: BackendInspectionStatus[] = [
    'COMPLETED',
    'APPROVED',
    'CANCELLED',
  ];
  if (closed.includes(status)) return false;
  const due = new Date(scheduledDate);
  if (Number.isNaN(due.getTime())) return false;
  return due.getTime() < now.getTime();
}

// ─────────────────────────────────────────────────────────────
// Status EN → rótulo PT (D-14)
// ─────────────────────────────────────────────────────────────

/**
 * Converte o status do backend no rótulo exibido pela UI.
 * `REJECTED` vira "Devolvida". "Atrasada" é derivado à parte (ver
 * mapInspection) e tem precedência visual nos filtros.
 */
export function mapStatus(status: BackendInspectionStatus): InspectionStatus {
  switch (status) {
    case 'SCHEDULED':
      return 'Atribuída';
    case 'IN_PROGRESS':
      return 'Em Andamento';
    case 'REJECTED':
      return 'Devolvida';
    case 'COMPLETED':
    case 'APPROVED':
    case 'UNDER_REVIEW':
      return 'Concluída';
    case 'CANCELLED':
      // Sem rótulo dedicado na UI atual; aproxima para "Devolvida".
      return 'Devolvida';
    default:
      return 'Atribuída';
  }
}

// ─────────────────────────────────────────────────────────────
// Prioridade (D-06 — pendente de decisão)
// ─────────────────────────────────────────────────────────────

/**
 * TODO(D-06): backend não expõe prioridade. Enquanto não houver origem
 * definida, retorna 'Média' como padrão neutro.
 */
export function derivePriority(_inspection: BackendInspection): Priority {
  return 'Média';
}

// ─────────────────────────────────────────────────────────────
// Inspeção: BackendInspection → Inspection (UI)
// ─────────────────────────────────────────────────────────────

export function mapInspection(
  dto: BackendInspection,
  now: Date = new Date()
): Inspection {
  const overdue = isOverdue(dto.scheduledDate, dto.status, now);
  return {
    id: dto.id, // D-02: id numérico
    // TODO(D-06): backend não tem código amigável; derivado de id.
    code: `INSP-${dto.id}`,
    title: dto.templateTitle,
    priority: derivePriority(dto),
    // TODO(D-06): progresso real vem de GET /inspections/{id}/responses/progress (M3).
    progress: 0,
    deadline: formatDateBR(dto.scheduledDate),
    deadlineOverdue: overdue,
    status: overdue ? 'Atrasada' : mapStatus(dto.status),
    assignee: dto.assignedToName,
    equipment: dto.equipmentName ?? '—',
    // TODO(D-06): backend não expõe tempo estimado.
    estimatedTime: '—',
    area: dto.siteName,
    location: dto.siteName,
  };
}

export function mapInspections(
  dtos: BackendInspection[],
  now: Date = new Date()
): Inspection[] {
  return dtos.map((d) => mapInspection(d, now));
}

// ─────────────────────────────────────────────────────────────
// Item de checklist: snapshot → ChecklistItem (UI) (D-08)
// ─────────────────────────────────────────────────────────────

/**
 * Mapeia o responseType do backend para o tipo de input da UI.
 * TEXT_SHORT/TEXT_LONG → TEXT; SINGLE_CHOICE → CHOICE.
 * (PHOTO não existe no backend; é tratado via evidências.)
 */
export function mapResponseType(rt: BackendResponseType): ChecklistItemType {
  switch (rt) {
    case 'TEXT_SHORT':
    case 'TEXT_LONG':
      return 'TEXT';
    case 'NUMBER':
      return 'NUMBER';
    case 'BOOLEAN':
      return 'BOOLEAN';
    case 'CONFORMITY':
      return 'CONFORMITY';
    case 'SINGLE_CHOICE':
      return 'CHOICE';
    case 'DATE':
      return 'DATE';
    default:
      return 'TEXT';
  }
}

/** Extrai as opções de um item SINGLE_CHOICE a partir do optionsJson. */
function parseChoices(optionsJson: string | null): string[] {
  if (!optionsJson) return [];
  try {
    const parsed = JSON.parse(optionsJson);
    if (Array.isArray(parsed)) return parsed.map((o) => String(o));
    return [];
  } catch {
    return [];
  }
}

/**
 * Converte um snapshot do backend num ChecklistItem vazio (sem respostas),
 * pronto para a tela de execução preencher. `order` usa itemDisplayOrder.
 */
export function mapSnapshotToChecklistItem(
  snap: InspectionItemSnapshotResponse
): ChecklistItem {
  const uiType = mapResponseType(snap.responseType);
  const base = {
    id: snap.id,
    order: snap.itemDisplayOrder,
    title: snap.title,
    description: snap.description ?? '',
    required: snap.required,
    observation: '',
    requiresEvidence: snap.evidenceRequiredOnFailure,
    evidences: [],
  };

  switch (uiType) {
    case 'CONFORMITY':
      return { ...base, type: 'CONFORMITY', answer: null };
    case 'NUMBER':
      return { ...base, type: 'NUMBER', numberAnswer: '' };
    case 'BOOLEAN':
      return { ...base, type: 'BOOLEAN', booleanAnswer: null };
    case 'CHOICE':
      return {
        ...base,
        type: 'CHOICE',
        choiceAnswer: '',
        choices: parseChoices(snap.optionsJson),
      };
    case 'DATE':
      return { ...base, type: 'DATE', dateAnswer: '' };
    case 'TEXT':
    default:
      return { ...base, type: 'TEXT', textAnswer: '' };
  }
}

export function mapSnapshotsToChecklist(
  snaps: InspectionItemSnapshotResponse[]
): ChecklistItem[] {
  return [...snaps]
    .sort((a, b) =>
      a.sectionDisplayOrder - b.sectionDisplayOrder ||
      a.itemDisplayOrder - b.itemDisplayOrder
    )
    .map(mapSnapshotToChecklistItem);
}
