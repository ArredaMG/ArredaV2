import { describe, it, expect } from 'vitest';
import { calculateProjectTotals } from './calculations';
import { ProjectVersion, CostGroup, CostItem } from '../types';

describe('Cálculos Financeiros de Orçamentos', () => {
  const mockGroup = (items: Partial<CostItem>[]): CostGroup => ({
    id: 'group-1',
    name: 'Grupo de Teste',
    items: items.map((item, index) => ({
      id: `item-${index}`,
      name: `Item ${index}`,
      quantity: 1,
      days: 1,
      unitCost: 0,
      tax: 0,
      isInHouse: false,
      category: 'Equipe',
      ...item,
    })) as CostItem[],
  });

  const mockVersion = (groups: CostGroup[], tax: number, margin: number): ProjectVersion => ({
    id: 'v1',
    name: 'V1',
    date: '2024-01-01',
    defaultTax: tax,
    defaultMargin: margin,
    groups,
  });

  it('Cenário 1: Apenas Equipa (Validação de Lucro e Imposto)', () => {
    const items = [{ category: 'Equipe' as const, unitCost: 1000 }];
    const version = mockVersion([mockGroup(items)], 5, 20);
    
    const result = calculateProjectTotals(version);

    expect(result.custoEquipe).toBeCloseTo(1000.00, 2);
    expect(result.lucroOperacional).toBeCloseTo(200.00, 2);
    expect(result.vendaEquipe).toBeCloseTo(1200.00, 2);
    expect(result.subtotal).toBeCloseTo(1200.00, 2);
    expect(result.totalProposta).toBeCloseTo(1263.16, 2);
    expect(result.valorImpostos).toBeCloseTo(63.16, 2);
  });

  it('Cenário 2: Apenas Logística (Validação de Isenção de Margem)', () => {
    const items = [{ category: 'Logistica' as const, unitCost: 500 }];
    const version = mockVersion([mockGroup(items)], 10, 20);
    
    const result = calculateProjectTotals(version);

    expect(result.vendaLogistica).toBeCloseTo(500.00, 2);
    expect(result.subtotal).toBeCloseTo(500.00, 2);
    expect(result.totalProposta).toBeCloseTo(555.56, 2);
    expect(result.valorImpostos).toBeCloseTo(55.56, 2);
    expect(result.lucroOperacional).toBeCloseTo(0.00, 2);
  });

  it('Cenário 3: Cenário Híbrido (Equipa + Logística juntos)', () => {
    const items = [
      { category: 'Equipe' as const, unitCost: 1000 },
      { category: 'Logistica' as const, unitCost: 500 }
    ];
    const version = mockVersion([mockGroup(items)], 10, 20);
    
    const result = calculateProjectTotals(version);

    expect(result.vendaEquipe).toBeCloseTo(1200.00, 2);
    expect(result.vendaLogistica).toBeCloseTo(500.00, 2);
    expect(result.subtotal).toBeCloseTo(1700.00, 2);
    expect(result.totalProposta).toBeCloseTo(1888.89, 2);
    expect(result.valorImpostos).toBeCloseTo(188.89, 2);
    expect(result.lucroOperacional).toBeCloseTo(200.00, 2);
  });
});
