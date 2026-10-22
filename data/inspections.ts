export type Priority = 'Alta' | 'Média' | 'Baixa';
export type InspectionStatus = 'Atribuída' | 'Em Andamento' | 'Atrasada' | 'Devolvida';

// ─────────────────────────────────────────────────────────────
// Formulário de inspeção (checklist por item)
// ─────────────────────────────────────────────────────────────

/** Tipo do campo de resposta do item. */
export type ChecklistItemType =
  | 'CONFORMITY' // Conforme / Atenção / Inconforme / Não verificado
  | 'TEXT'       // Texto livre
  | 'NUMBER'     // Valor numérico
  | 'BOOLEAN'    // Sim / Não
  | 'PHOTO'      // Captura de câmera/galeria
  | 'CHOICE'     // Lista de opções pré-definidas
  | 'DATE';      // Data

/** Resposta de conformidade (usado apenas quando type === 'CONFORMITY'). */
export type ChecklistAnswer =
  | 'Conforme'
  | 'Atenção'
  | 'Inconforme'
  | 'Não verificado'
  | null;

/** Evidência fotográfica vinculada a um item. */
export interface ChecklistEvidence {
  uri: string;    // caminho local (file://) ou base64
  source: 'camera' | 'gallery';
  capturedAt: string; // ISO timestamp
}

export interface ChecklistItem {
  id: string;
  order: number;              // posição (1-based)
  title: string;              // ex: "Alinhamento do eixo"
  description: string;        // instrução + critério de aceite
  required: boolean;          // se true, exibe asterisco vermelho
  type: ChecklistItemType;    // controla qual input renderizar

  // Campos de resposta — preenchidos durante a execução
  answer: ChecklistAnswer;    // CONFORMITY
  textAnswer: string;         // TEXT
  numberAnswer: string;       // NUMBER (string para facilitar TextInput)
  booleanAnswer: boolean | null; // BOOLEAN
  choiceAnswer: string;       // CHOICE — opção selecionada
  dateAnswer: string;         // DATE
  evidences: ChecklistEvidence[]; // fotos/evidências

  /** Opções disponíveis (obrigatório quando type === 'CHOICE'). */
  choices?: string[];

  observation: string;

  /**
   * Quando true, exige evidência fotográfica (ex: resultado Inconforme).
   * Aviso visual é exibido enquanto não houver evidência anexada.
   */
  requiresEvidence?: boolean;
}

export interface InspectionForm {
  inspectionId: string;
  items: ChecklistItem[];
}

// Dados mockados — substituir pela chamada real à API futuramente
// GET /api/v1/inspections/:id/checklist
export const MOCK_CHECKLIST: Record<string, ChecklistItem[]> = {
  '1': [
    {
      id: 'c1',
      order: 1,
      type: 'CONFORMITY',
      title: 'Alinhamento do eixo',
      description:
        'Verificar se o alinhamento do eixo esta dentro dos limites permitidos : entre 2mm e 5mm.',
      required: true,
      answer: null,
      textAnswer: '',
      numberAnswer: '',
      booleanAnswer: null,
      choiceAnswer: '',
      dateAnswer: '',
      evidences: [],
      observation: '',
      requiresEvidence: false,
    },
    {
      id: 'c2',
      order: 2,
      type: 'CONFORMITY',
      title: 'Nível de vibração',
      description:
        'Medir a vibração do motor em operação. Valor máximo permitido: 4,5 mm/s RMS.',
      required: true,
      answer: null,
      textAnswer: '',
      numberAnswer: '',
      booleanAnswer: null,
      choiceAnswer: '',
      dateAnswer: '',
      evidences: [],
      observation: '',
      requiresEvidence: true,
    },
    {
      id: 'c3',
      order: 3,
      type: 'NUMBER',
      title: 'Temperatura do rolamento',
      description:
        'Registrar a temperatura superficial do rolamento. Limite: até 70°C em operação normal.',
      required: true,
      answer: null,
      textAnswer: '',
      numberAnswer: '',
      booleanAnswer: null,
      choiceAnswer: '',
      dateAnswer: '',
      evidences: [],
      observation: '',
    },
    {
      id: 'c4',
      order: 4,
      type: 'BOOLEAN',
      title: 'Nível de óleo lubrificante',
      description:
        'O nível do óleo no visor lateral está entre as marcas MIN e MAX?',
      required: false,
      answer: null,
      textAnswer: '',
      numberAnswer: '',
      booleanAnswer: null,
      choiceAnswer: '',
      dateAnswer: '',
      evidences: [],
      observation: '',
    },
    {
      id: 'c5',
      order: 5,
      type: 'CONFORMITY',
      title: 'Correia de transmissão',
      description:
        'Inspecionar tensão e estado da correia. Deflexão máxima permitida: 10mm sob força de 5N.',
      required: true,
      answer: null,
      textAnswer: '',
      numberAnswer: '',
      booleanAnswer: null,
      choiceAnswer: '',
      dateAnswer: '',
      evidences: [],
      observation: '',
      requiresEvidence: false,
    },
    {
      id: 'c6',
      order: 6,
      type: 'NUMBER',
      title: 'Fixação dos parafusos de base',
      description:
        'Registrar o torque dos parafusos de fixação da base. Torque especificado: 45 Nm.',
      required: true,
      answer: null,
      textAnswer: '',
      numberAnswer: '',
      booleanAnswer: null,
      choiceAnswer: '',
      dateAnswer: '',
      evidences: [],
      observation: '',
    },
    {
      id: 'c7',
      order: 7,
      type: 'CONFORMITY',
      title: 'Estado do acoplamento',
      description:
        'Inspecionar visualmente o acoplamento flexível. Verificar desgaste, trincas ou folgas excessivas.',
      required: false,
      answer: null,
      textAnswer: '',
      numberAnswer: '',
      booleanAnswer: null,
      choiceAnswer: '',
      dateAnswer: '',
      evidences: [],
      observation: '',
    },
    {
      id: 'c8',
      order: 8,
      type: 'CHOICE',
      title: 'Proteção da parte elétrica',
      description:
        'Selecionar o estado das proteções elétricas (caixa de terminais, conduítes, aterramento).',
      required: true,
      answer: null,
      textAnswer: '',
      numberAnswer: '',
      booleanAnswer: null,
      choiceAnswer: '',
      dateAnswer: '',
      evidences: [],
      observation: '',
      choices: ['Íntegra', 'Com desgaste leve', 'Danificada', 'Ausente'],
    },
    {
      id: 'c9',
      order: 9,
      type: 'TEXT',
      title: 'Limpeza geral do equipamento',
      description:
        'Descreva as condições de limpeza: presença de sujeira, óleo derramado, resíduos ou obstruções.',
      required: false,
      answer: null,
      textAnswer: '',
      numberAnswer: '',
      booleanAnswer: null,
      choiceAnswer: '',
      dateAnswer: '',
      evidences: [],
      observation: '',
    },
    {
      id: 'c10',
      order: 10,
      type: 'PHOTO',
      title: 'Plaqueta de identificação',
      description:
        'Fotografar a plaqueta de identificação do equipamento para confirmar legibilidade.',
      required: true,
      answer: null,
      textAnswer: '',
      numberAnswer: '',
      booleanAnswer: null,
      choiceAnswer: '',
      dateAnswer: '',
      evidences: [],
      observation: '',
      requiresEvidence: true,
    },
  ],
};

export interface Inspection {
  id: string;
  code: string;
  title: string;
  priority: Priority;
  status: InspectionStatus;
  progress: number;       // 0–100
  deadline: string;       // ex: "09/08/2026"
  deadlineOverdue: boolean;
  assignee: string;       // Atribuinte
  estimatedTime: string;  // Tempo estimado
  equipment: string;      // Equipamento/ativo
  area: string;           // Área
}

// Dados mockados — substituir pela chamada real à API futuramente
// GET /api/v1/inspections/assigned
export const MOCK_INSPECTIONS: Inspection[] = [
  {
    id: '1',
    code: 'INSP-01',
    title: 'Alinhamento no Motor 02',
    priority: 'Alta',
    status: 'Atrasada',
    progress: 60,
    deadline: '09/08/2026',
    deadlineOverdue: true,
    assignee: 'SV Rodrigo',
    estimatedTime: '15 min',
    equipment: 'Motor 02',
    area: 'Turn do Chassis',
  },
  {
    id: '2',
    code: 'INSP-02',
    title: 'Alinhamento no Motor 02',
    priority: 'Média',
    status: 'Em Andamento',
    progress: 80,
    deadline: '20/08/2026',
    deadlineOverdue: false,
    assignee: 'SV Rodrigo',
    estimatedTime: '30 min',
    equipment: 'Motor 02',
    area: 'Galpão B',
  },
  {
    id: '3',
    code: 'INSP-03',
    title: 'Alinhamento no Motor 02',
    priority: 'Baixa',
    status: 'Atribuída',
    progress: 0,
    deadline: '30/08/2026',
    deadlineOverdue: false,
    assignee: 'SV Rodrigo',
    estimatedTime: '45 min',
    equipment: 'Motor 02',
    area: 'Galpão C',
  },
  {
    id: '4',
    code: 'INSP-04',
    title: 'Verificação de Válvula de Pressão',
    priority: 'Alta',
    status: 'Devolvida',
    progress: 100,
    deadline: '05/08/2026',
    deadlineOverdue: true,
    assignee: 'SV Rodrigo',
    estimatedTime: '20 min',
    equipment: 'Válvula P-07',
    area: 'Sala de Controle',
  },
];
