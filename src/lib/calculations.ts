import { CostGroup, CostItem, ProjectVersion } from '../types';

export interface ItemMetrics {
  baseCost: number;
  vendaValue: number;
  profitValue: number;
  taxValue: number;
  totalFinal: number;
  isInHouse: boolean;
}

export interface GroupMetrics {
  totalCost: number;
  totalVenda: number;
  totalProfit: number;
  totalTax: number;
  totalProposta: number;
}

export interface VersionTotals {
  totalCost: number;
  subtotal: number;
  totalTax: number;
  totalProposta: number;
  totalProfit: number;
  totalExecuted: number;
  lucroReal: number;
}

/**
 * 1. Cálculo de Venda (Markup Multiplicador):
 *    - Custo Base = quantity * days * unitCost
 *    - Valor de Venda = Custo Base * (1 + (margin / 100))
 * 
 * 2. Cálculo de Lucro (In-House vs Freelancer):
 *    - Se isInHouse === true: Lucro = Valor de Venda
 *    - Se isInHouse === false: Lucro = Valor de Venda - Custo Base
 * 
 * 3. Cálculo de Imposto (Markup Divisor / Gross-up):
 *    - Valor Total Final = Valor de Venda / (1 - (taxRate / 100))
 *    - Valor do Imposto = Valor Total Final - Valor de Venda
 */

export function getItemMetrics(item: CostItem, groupMargin: number, defaultTax: number): ItemMetrics {
  const margin = item.customMargin !== undefined ? item.customMargin : groupMargin;
  const taxRate = item.tax !== undefined ? item.tax : defaultTax;
  const isInHouse = item.isInHouse === true;

  const baseCost = (item.unitCost || 0) * (item.quantity || 1) * (item.days || 1);
  const vendaValue = baseCost * (1 + (margin / 100));
  
  let profitValue = 0;
  if (isInHouse) {
    profitValue = vendaValue;
  } else {
    profitValue = vendaValue - baseCost;
  }
  
  let totalFinal = vendaValue;
  if (taxRate > 0 && taxRate < 100) {
    totalFinal = vendaValue / (1 - (taxRate / 100));
  }
  
  const taxValue = totalFinal - vendaValue;

  return {
    baseCost,
    vendaValue,
    profitValue,
    taxValue,
    totalFinal,
    isInHouse
  };
}

export function getGroupMetrics(group: CostGroup, defaultMargin: number, defaultTax: number): GroupMetrics {
  const groupMargin = group.margin !== undefined ? group.margin : defaultMargin;
  
  return group.items.reduce((acc, item) => {
    const metrics = getItemMetrics(item, groupMargin, defaultTax);
    
    return {
      totalCost: acc.totalCost + metrics.baseCost,
      totalVenda: acc.totalVenda + metrics.vendaValue,
      totalProfit: acc.totalProfit + metrics.profitValue,
      totalTax: acc.totalTax + metrics.taxValue,
      totalProposta: acc.totalProposta + metrics.totalFinal
    };
  }, {
    totalCost: 0,
    totalVenda: 0,
    totalProfit: 0,
    totalTax: 0,
    totalProposta: 0
  });
}

export function calculateProjectTotals(version: ProjectVersion): VersionTotals {
  let totalCost = 0;
  let subtotal = 0;
  let totalProfit = 0;
  let totalExecuted = 0;

  version.groups.forEach(group => {
    if (group.isActive === false) return;
    
    const metrics = getGroupMetrics(group, version.defaultMargin, version.defaultTax);
    
    totalCost += metrics.totalCost;
    subtotal += metrics.totalVenda;
    totalProfit += metrics.totalProfit;
    
    group.items.forEach(item => {
      if (!item.isInHouse) {
        const itemBaseCost = (item.unitCost || 0) * (item.quantity || 1) * (item.days || 1);
        totalExecuted += (item.executedCost && item.executedCost > 0) ? item.executedCost : itemBaseCost;
      }
    });
  });

  const taxRate = version.defaultTax || 0;
  let totalProposta = subtotal;
  
  if (taxRate > 0 && taxRate < 100) {
    totalProposta = subtotal / (1 - (taxRate / 100));
  }
  
  const totalTax = totalProposta - subtotal;

  return {
    totalCost,
    subtotal,
    totalTax,
    totalProposta,
    totalProfit,
    totalExecuted,
    lucroReal: subtotal - totalExecuted
  };
}
