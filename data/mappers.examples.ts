/**
 * Exemplos verificáveis dos mappers Backend → UI (M1).
 *
 * O projeto ainda não tem runner de teste configurado (sem jest/vitest),
 * então este arquivo documenta o comportamento esperado dos mappers com
 * casos reais e asserções leves. É type-checado pelo `tsc --noEmit` e pode
 * ser executado para conferência manual:
 *
 *   npx tsx data/mappers.examples.ts
 *   # ou transpilando com o próprio TypeScript, se preferir.
 *
 * Ao adicionar um runner no futuro, estes casos migram direto para `.test.ts`.
 */

import { BackendInspection } from '../types/inspectionApi';
import {
  mapInspection,
  mapStatus,
  isOverdue,
  formatDateBR,
  mapResponseType,
} from './mappers';

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(`✗ ${msg}`);
  // eslint-disable-next-line no-console
  console.log(`✓ ${msg}`);
}

// Data de referência fixa para tornar "Atrasada" determinístico.
const NOW = new Date('2026-06-15T12:00:00Z');

// DTO base reutilizável nos exemplos.
const baseDto: BackendInspection = {
  id: 42,
  clientId: 1,
  clientName: 'Cliente A',
  siteId: 7,
  siteName: 'Unidade Centro',
  assignedToId: 3,
  assignedToName: 'João Silva',
  templateVersionId: 10,
  templateVersionNumber: 1,
  templateTitle: 'Inspeção estrutural',
  equipmentId: 99,
  equipmentName: 'Compressor X',
  scheduledDate: '2026-07-01',
  status: 'SCHEDULED',
  startedAtDevice: null,
  startedAtServer: null,
  completedAtDevice: null,
  completedAtServer: null,
  cancelledById: null,
  cancelledAt: null,
  cancellationReason: null,
  version: 0,
  createdAt: '2026-06-01T00:00:00Z',
  updatedAt: '2026-06-01T00:00:00Z',
};

// ── mapStatus: EN → PT ───────────────────────────────────────
assert(mapStatus('SCHEDULED') === 'Atribuída', "mapStatus SCHEDULED → 'Atribuída'");
assert(mapStatus('IN_PROGRESS') === 'Em Andamento', "mapStatus IN_PROGRESS → 'Em Andamento'");
assert(mapStatus('REJECTED') === 'Devolvida', "mapStatus REJECTED → 'Devolvida'");
assert(mapStatus('APPROVED') === 'Concluída', "mapStatus APPROVED → 'Concluída'");

// ── isOverdue: derivação de "Atrasada" (D-14) ────────────────
assert(
  isOverdue('2026-06-01', 'SCHEDULED', NOW) === true,
  'isOverdue: prazo no passado e não concluída → true',
);
assert(
  isOverdue('2026-07-01', 'SCHEDULED', NOW) === false,
  'isOverdue: prazo no futuro → false',
);
assert(
  isOverdue('2026-06-01', 'COMPLETED', NOW) === false,
  'isOverdue: concluída não é atrasada mesmo com prazo vencido',
);

// ── formatDateBR ─────────────────────────────────────────────
assert(formatDateBR('2026-07-01') === '01/07/2026', 'formatDateBR ISO date → dd/mm/aaaa');
assert(formatDateBR(null) === '—', 'formatDateBR null → —');

// ── mapResponseType: backend → tipo de input da UI (D-08) ────
assert(mapResponseType('TEXT_SHORT') === 'TEXT', 'mapResponseType TEXT_SHORT → TEXT');
assert(mapResponseType('TEXT_LONG') === 'TEXT', 'mapResponseType TEXT_LONG → TEXT');
assert(mapResponseType('SINGLE_CHOICE') === 'CHOICE', 'mapResponseType SINGLE_CHOICE → CHOICE');
assert(mapResponseType('CONFORMITY') === 'CONFORMITY', 'mapResponseType CONFORMITY → CONFORMITY');

// ── mapInspection: caso no prazo ─────────────────────────────
const vmFuturo = mapInspection(baseDto, NOW);
assert(vmFuturo.id === 42, 'mapInspection: id numérico preservado (D-02)');
assert(vmFuturo.code === 'INSP-42', 'mapInspection: code derivado do id (D-06)');
assert(vmFuturo.title === 'Inspeção estrutural', 'mapInspection: title ← templateTitle');
assert(vmFuturo.assignee === 'João Silva', 'mapInspection: assignee ← assignedToName');
assert(vmFuturo.equipment === 'Compressor X', 'mapInspection: equipment ← equipmentName');
assert(vmFuturo.area === 'Unidade Centro', 'mapInspection: area ← siteName');
assert(vmFuturo.location === 'Unidade Centro', 'mapInspection: location ← siteName');
assert(vmFuturo.deadline === '01/07/2026', 'mapInspection: deadline formatado');
assert(vmFuturo.deadlineOverdue === false, 'mapInspection: não atrasada no futuro');
assert(vmFuturo.status === 'Atribuída', 'mapInspection: status PT quando no prazo');
assert(vmFuturo.priority === 'Média', 'mapInspection: prioridade padrão (TODO D-06)');
assert(vmFuturo.progress === 0, 'mapInspection: progresso 0 por ora (TODO D-06)');

// ── mapInspection: caso atrasado ─────────────────────────────
const vmAtrasado = mapInspection({ ...baseDto, scheduledDate: '2026-06-01' }, NOW);
assert(vmAtrasado.deadlineOverdue === true, 'mapInspection: deadlineOverdue quando vencida');
assert(vmAtrasado.status === 'Atrasada', 'mapInspection: status "Atrasada" tem precedência (D-14)');

// ── equipamento nulo ─────────────────────────────────────────
const vmSemEquip = mapInspection({ ...baseDto, equipmentId: null, equipmentName: null }, NOW);
assert(vmSemEquip.equipment === '—', 'mapInspection: equipment ausente → —');

// eslint-disable-next-line no-console
console.log('\nTodos os exemplos de mapeamento passaram.');
