export type Priority = 'Alta' | 'Médio' | 'Baixo';
export type InspectionStatus = 'Atribuída' | 'Em Andamento' | 'Atrasada' | 'Devolvida';

// ─────────────────────────────────────────────────────────────
// Formulário de inspeção (checklist por item)
// ─────────────────────────────────────────────────────────────

export type ChecklistAnswer = 'Conforme' | 'Atenção' | 'Inconforme' | 'Não verificado' | null;

export interface ChecklistItem {
  id: string;
  order: number;         // posição (1-based)
  title: string;         // ex: "Alinhamento do eixo"
  description: string;   // instrução + critério de aceite
  required: boolean;     // se true, exibe asterisco vermelho
  answer: ChecklistAnswer;
  observation: string;
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
      title: 'Alinhamento do eixo',
      description:
        'Verificar se o alinhamento do eixo esta dentro dos limites permitidos : entre 2mm e 5mm.',
      required: true,
      answer: null,
      observation: '',
    },
    {
      id: 'c2',
      order: 2,
      title: 'Nível de vibração',
      description:
        'Medir a vibração do motor em operação. Valor máximo permitido: 4,5 mm/s RMS.',
      required: true,
      answer: null,
      observation: '',
    },
    {
      id: 'c3',
      order: 3,
      title: 'Temperatura do rolamento',
      description:
        'Verificar temperatura superficial do rolamento. Limite: até 70°C em operação normal.',
      required: true,
      answer: null,
      observation: '',
    },
    {
      id: 'c4',
      order: 4,
      title: 'Nível de óleo lubrificante',
      description:
        'Confirmar nível do óleo no visor lateral. O nível deve estar entre as marcas MIN e MAX.',
      required: false,
      answer: null,
      observation: '',
    },
    {
      id: 'c5',
      order: 5,
      title: 'Correia de transmissão',
      description:
        'Inspecionar tensão e estado da correia. Deflexão máxima permitida: 10mm sob força de 5N.',
      required: true,
      answer: null,
      observation: '',
    },
    {
      id: 'c6',
      order: 6,
      title: 'Fixação dos parafusos de base',
      description:
        'Verificar torque dos parafusos de fixação da base. Torque especificado: 45 Nm.',
      required: true,
      answer: null,
      observation: '',
    },
    {
      id: 'c7',
      order: 7,
      title: 'Estado do acoplamento',
      description:
        'Inspecionar visualmente o acoplamento flexível. Verificar desgaste, trincas ou folgas excessivas.',
      required: false,
      answer: null,
      observation: '',
    },
    {
      id: 'c8',
      order: 8,
      title: 'Proteção da parte elétrica',
      description:
        'Confirmar integridade das proteções elétricas (caixa de terminais, conduítes, aterramento).',
      required: true,
      answer: null,
      observation: '',
    },
    {
      id: 'c9',
      order: 9,
      title: 'Limpeza geral do equipamento',
      description:
        'Verificar ausência de sujeira, óleo derramado, resíduos ou obstruções nas grades de ventilação.',
      required: false,
      answer: null,
      observation: '',
    },
    {
      id: 'c10',
      order: 10,
      title: 'Plaqueta de identificação',
      description:
        'Confirmar que a plaqueta de identificação do equipamento está legível e corretamente afixada.',
      required: false,
      answer: null,
      observation: '',
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
    priority: 'Médio',
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
    priority: 'Baixo',
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
