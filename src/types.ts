export type ProjectStatus = 'Pendente' | 'Aprovado' | 'Concluído';

export interface Client {
  id: string;
  nome: string;
  cnpj: string;
}

export interface Template {
  id: string;
  name: string;
  data: {
    groups: CostGroup[];
    defaultTax: number;
    defaultMargin: number;
  };
}

export interface ProjectVersion {
  id: string;
  name: string;
  date: string;
  defaultTax: number;
  defaultMargin: number;
  groups: CostGroup[];
  // Calculated totals
  totalCost?: number;
  subtotal?: number;
  totalTax?: number;
  totalProposta?: number;
  totalProfit?: number;
  totalExecuted?: number;
}

export interface Project {
  id: string;
  title: string;
  client: string;
  status: ProjectStatus;
  projectNumber: number;
  startDate?: string | Date;
  endDate?: string | Date;
  recordingDates: string[];
  createdAt: string | Date;
  versions: ProjectVersion[];
}

export interface CostGroup {
  id: string;
  name: string;
  margin?: number;
  isActive?: boolean;
  items: CostItem[];
  // Group-level totals
  totalCost?: number;
  totalVenda?: number;
  totalTax?: number;
  totalProposta?: number;
}

export interface CostItem {
  id: string;
  role?: string;
  name: string;
  quantity: number;
  days?: number;
  unitCost: number;
  tax?: number;
  isInHouse: boolean;
  customMargin?: number;
  executedCost?: number;
  receiptLink?: string;
  category?: string;
}

export interface Professional {
  id: string;
  name: string;
  role: string;
  pix: string;
  dailyRate: number;
}

export interface Equipment {
  id: string;
  name: string;
  category: string;
  rentalValue: number;
}
