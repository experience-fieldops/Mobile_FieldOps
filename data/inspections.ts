/**
 * View models de UI para inspeções e checklist.
 *
 * Estes tipos descrevem o que as TELAS consomem — não o que o backend
 * entrega. A conversão DTO (backend) → view model (UI) vive em
 * `data/mappers.ts`. Mantê-los separados permite evoluir a UI sem
 * acoplar diretamente ao contrato da API.
 *
 * Campos sem origem no backend estão marcados com TODO(D-xx) e, por ora,
 * recebem valores derivados ou padrão nos mappers — pendentes de decisão
 * de produto (ver INTEGRACAO.md §8 e INTEGRACAO_MODULOS.md).
 */

// Re-exporta os tipos de backend para quem só precisa do contrato da API.
export type {
  BackendInspection,
  BackendInspectionStatus,
  BackendResponseType,
  InspectionItemSnapshotResponse,
} from '../types/inspectionApi';

// ─────────────────────────────────────────────────────────────
// Inspeção (view model)
// ─────────────────────────────────────────────────────────────

/**
 * Prioridade exibida na UI.
 * TODO(D-06): o backend não expõe prioridade hoje. Origem a definir
 * (campo novo no InspectionResponse ou derivação). Mapper usa padrão.
 */
export type Priority = 'Alta' | 'Média' | 'Baixa';

/**
 * Status como rótulo em português usado pelos filtros/telas.
 * Derivado do BackendInspectionStatus (EN) no mapper. "Atrasada" não é
 * status nativo — é derivado de scheduledDate + status (D-14).
 */
export type InspectionStatus =
  'Atribuída' | 'Em Andamento' | 'Atrasada' | 'Devolvida' | 'Concluída';

/** Inspeção no formato que as telas de lista e detalhe consomem. */
export interface Inspection {
  /** Mesmo id numérico do backend (D-02). */
  id: number;
  /** Código amigável. TODO(D-06): backend não tem; mapper usa `INSP-{id}`. */
  code: string;
  title: string;
  priority: Priority;
  /** 0–100. TODO(D-06): obtido via endpoint de progresso; mapper usa 0 por ora. */
  progress: number;
  deadline: string;
  deadlineOverdue: boolean;
  status: InspectionStatus;
  assignee: string;
  equipment: string;
  /** TODO(D-06): backend não expõe; mapper usa '—'. */
  estimatedTime: string;
  area: string;
  location: string;
}

// ─────────────────────────────────────────────────────────────
// Checklist (view model)
// ─────────────────────────────────────────────────────────────

/**
 * Resposta de conformidade (itens CONFORMITY).
 * TODO(D-07): não há enum canônico no backend; o `value` é string livre.
 * A correspondência rótulo PT ↔ `value` precisa ser alinhada com o backend.
 */
export type ChecklistAnswer =
  'Conforme' | 'Atenção' | 'Inconforme' | 'Não verificado' | null;

/** Evidência fotográfica anexada localmente a um item. */
export interface ChecklistEvidence {
  uri: string;
  source: 'camera' | 'gallery';
  capturedAt: string;
}

/**
 * Tipos de input da UI.
 * TODO(D-08): mapear a partir de BackendResponseType
 * (TEXT_SHORT/TEXT_LONG→TEXT, SINGLE_CHOICE→CHOICE). PHOTO não é um
 * responseType do backend — é tratado via recurso de evidência.
 */
export type ChecklistItemType =
  'CONFORMITY' | 'TEXT' | 'NUMBER' | 'BOOLEAN' | 'CHOICE' | 'DATE' | 'PHOTO';

/** Severidade da não conformidade (espelha o enum do backend). */
export type Severity = 'Baixa' | 'Média' | 'Alta' | 'Crítica';

/** Campos comuns a todos os itens, acessados sem checar `type`. */
interface ChecklistItemBase {
  /** id do snapshot (snapshotItemId) quando vindo do backend. */
  id?: number;
  order: number;
  title: string;
  description: string;
  required: boolean;
  observation: string;
  requiresEvidence?: boolean;
  evidences: ChecklistEvidence[];
  /**
   * Severidade escolhida quando o item é marcado como Inconforme.
   * Usada para abrir uma não conformidade no backend (D-07/M5).
   */
  ncSeverity?: Severity;
}

export interface ConformityItem extends ChecklistItemBase {
  type: 'CONFORMITY';
  answer: ChecklistAnswer;
}
export interface TextItem extends ChecklistItemBase {
  type: 'TEXT';
  textAnswer: string;
}
export interface NumberItem extends ChecklistItemBase {
  type: 'NUMBER';
  numberAnswer: string;
}
export interface BooleanItem extends ChecklistItemBase {
  type: 'BOOLEAN';
  booleanAnswer: boolean | null;
}
export interface ChoiceItem extends ChecklistItemBase {
  type: 'CHOICE';
  choiceAnswer: string;
  choices?: string[];
}
export interface DateItem extends ChecklistItemBase {
  type: 'DATE';
  dateAnswer: string;
}
export interface PhotoItem extends ChecklistItemBase {
  type: 'PHOTO';
}

/** Item de checklist (union discriminado por `type`). */
export type ChecklistItem =
  | ConformityItem
  | TextItem
  | NumberItem
  | BooleanItem
  | ChoiceItem
  | DateItem
  | PhotoItem;

// ─────────────────────────────────────────────────────────────
// MOCKS PROVISÓRIOS — ⚠ remover ao integrar cada tela (M2+)
// ─────────────────────────────────────────────────────────────
//
// Ainda referenciados por telas não integradas (Detail, Form, Checklist,
// QRScanner). Servem apenas para o app compilar/rodar enquanto a
// integração real não chega. NÃO usar em telas já integradas.

/** @deprecated Mock provisório — substituir por getAssignedInspections (M2). */
export const MOCK_INSPECTIONS: Inspection[] = [];

/** @deprecated Mock provisório — substituir por fetch de itemSnapshots (M4). */
export const MOCK_CHECKLIST: Record<number, ChecklistItem[]> = {};
