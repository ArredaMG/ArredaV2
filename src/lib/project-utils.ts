import { Project } from '../types';
import { calculateProjectTotals } from './calculations';

export const calculateFinancials = (project: Project) => {
  const activeVersion = project.versions?.[project.versions.length - 1] || project.versions?.[0];
  if (!activeVersion || !activeVersion.groups) {
    return { total: 0, profit$: 0, tax$: 0, profitPercent: 0, taxPercent: 0, title: project.title, client: project.client, dates: project.recordingDates || [] };
  }

  const totals = calculateProjectTotals(activeVersion);

  return {
    total: totals.totalProposta,
    profit$: totals.totalProfit,
    tax$: totals.totalTax,
    profitPercent: activeVersion.defaultMargin || 0,
    taxPercent: activeVersion.defaultTax || 0,
    title: project.title,
    client: project.client,
    dates: project.recordingDates || []
  };
};
