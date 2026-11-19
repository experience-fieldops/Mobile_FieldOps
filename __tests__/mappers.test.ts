import {
  conformityToValue,
  dateToIso,
  isOverdue,
  mapInspection,
  numberToBackend,
} from '../data/mappers';
import type { BackendInspection } from '../types/inspectionApi';

const NOW = new Date('2026-06-15T12:00:00Z');

const base: BackendInspection = {
  id: 42,
  clientId: 1,
  clientName: 'Cliente A',
  siteId: 7,
  siteName: 'Unidade Centro',
  assignedToId: 3,
  assignedToName: 'João',
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

describe('status das inspeções', () => {
  it('prazo futuro fica Atribuída e não atrasada', () => {
    const vm = mapInspection(base, NOW);
    expect(vm.status).toBe('Atribuída');
    expect(vm.deadlineOverdue).toBe(false);
  });

  it('não iniciada com prazo vencido fica Atrasada', () => {
    const vm = mapInspection({ ...base, scheduledDate: '2026-06-01' }, NOW);
    expect(vm.status).toBe('Atrasada');
    expect(vm.deadlineOverdue).toBe(true);
  });

  it('iniciada fica Em Andamento, mesmo com prazo vencido', () => {
    const vm = mapInspection(
      { ...base, status: 'IN_PROGRESS', scheduledDate: '2026-06-01' },
      NOW,
    );
    expect(vm.status).toBe('Em Andamento');
    expect(vm.deadlineOverdue).toBe(true);
  });

  it('devolvida (REJECTED) fica Devolvida, mesmo com prazo vencido', () => {
    const vm = mapInspection(
      { ...base, status: 'REJECTED', scheduledDate: '2026-06-01' },
      NOW,
    );
    expect(vm.status).toBe('Devolvida');
  });

  it('finalizada ou cancelada nunca é atrasada', () => {
    for (const status of ['COMPLETED', 'APPROVED', 'CANCELLED'] as const) {
      expect(isOverdue('2026-06-01', status, NOW)).toBe(false);
    }
  });
});

describe('conversão de valores para o backend', () => {
  it('conformidade vira o enum do backend', () => {
    expect(conformityToValue('Conforme')).toBe('CONFORMING');
    expect(conformityToValue('Atenção')).toBe('ATTENTION');
    expect(conformityToValue('Inconforme')).toBe('NON_CONFORMING');
    expect(conformityToValue(null)).toBeUndefined();
  });

  it('número aceita vírgula e rejeita texto', () => {
    expect(numberToBackend('12,5')).toBe('12.5');
    expect(numberToBackend('  7 ')).toBe('7');
    expect(numberToBackend('abc')).toBeUndefined();
    expect(numberToBackend('')).toBeUndefined();
  });

  it('data vira yyyy-MM-dd e ignora valor inválido', () => {
    expect(dateToIso('25/12/2026')).toBe('2026-12-25');
    expect(dateToIso('')).toBeUndefined();
    expect(dateToIso('99/99/9999')).toBeUndefined();
  });
});
