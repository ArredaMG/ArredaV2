import { CostGroup, CostItem, ProjectVersion } from '../types';

/**
 * Calcula o valor de venda baseado no custo e margem bruta (Gross Margin)
 * Fórmula: Custo / (1 - Margem)
 */
export function calculateVenda(cost: number, marginPercent: number): number {
  const margin = marginPercent / 100;
  if (margin >= 1) return cost;
  return cost / (1 - margin);
}

/**
 * Calcula o lucro (markup) baseado no custo e margem
 * Fórmula: Venda - Custo
 */
export function calculateProfit(cost: number, marginPercent: number): number {
  return calculateVenda(cost, marginPercent) - cost;
}

/**
 * Métricas completas de um item
 */
export interface ItemMetrics {
  baseCost: number;
  venda: number;
  lucro: number;
  isIH: boolean;
}

export function getItemMetrics(item: CostItem, groupMargin: number, taxRate: number = 0): ItemMetrics & { valorMargem: number, valorImposto: number, totalFinal: number } {
  const margin = item.margin !== undefined ? item.margin : groupMargin;
  const baseCost = item.unitCost * item.quantity * (item.days || 1);
  const venda = calculateVenda(baseCost, margin);
  const totalFinal = taxRate < 100 ? venda / (1 - (taxRate / 100)) : venda;
  
  const lucro = venda - baseCost;
  const valorImposto = totalFinal - venda;

  return {
    baseCost,
    venda,
    lucro,
    valorMargem: lucro,
    valorImposto,
    totalFinal,
    isIH: item.inHouse
  };
}

/**
 * Métricas de uma categoria (grupo)
 */
export interface GroupMetrics {
  totalCusto: number;
  totalVenda: number;
  totalLucro: number;
  totalLucroIH: number;
}

export function getGroupMetrics(group: CostGroup, defaultMargin: number): GroupMetrics {
  const groupMargin = group.margin !== undefined ? group.margin : defaultMargin;
  
  return group.items.reduce((acc, item) => {
    const metrics = getItemMetrics(item, groupMargin);
    return {
      totalCusto: acc.totalCusto + metrics.baseCost,
      totalVenda: acc.totalVenda + metrics.venda,
      totalLucro: acc.totalLucro + metrics.lucro,
      totalLucroIH: acc.totalLucroIH + (item.inHouse ? metrics.lucro : 0)
    };
  }, { totalCusto: 0, totalVenda: 0, totalLucro: 0, totalLucroIH: 0 });
}

/**
 * Métricas globais da versão do projeto
 */
export interface VersionTotals {
  totalVenda: number;
  totalCost: number;
  totalProfit: number;
  totalTax: number;
  totalClient: number;
  totalExecuted: number;
  lucroReal: number;
}

export function calculateVersionTotals(version: ProjectVersion): VersionTotals {
  let totalVenda = 0;
  let totalCost = 0;
  let totalExecuted = 0;

  version.groups.forEach(group => {
    if (group.isActive === false) return;
    
    const metrics = getGroupMetrics(group, version.defaultMargin);
    totalVenda += metrics.totalVenda;
    
    // Na lógica global, o custo "IH" é zero para fins de lucro total da empresa
    group.items.forEach(item => {
      const baseCost = item.unitCost * item.quantity * (item.days || 1);
      totalCost += item.inHouse ? 0 : baseCost;
      totalExecuted += item.executedCost || 0;
    });
  });

  const taxRate = version.defaultTax / 100;
  const totalClient = taxRate < 1 ? totalVenda / (1 - taxRate) : totalVenda;
  const totalTax = totalClient - totalVenda;
  
  const totalProfit = totalVenda - totalCost;
  const lucroReal = (totalVenda - totalTax) - totalExecuted;

  return {
    totalVenda,
    totalCost,
    totalProfit,
    totalTax,
    totalClient,
    totalExecuted,
    lucroReal
  };
}
