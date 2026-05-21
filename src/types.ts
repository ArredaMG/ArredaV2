export type ProjectStatus = 'Pendente' | 'Aprovado' | 'Concluído';

export interface Client {
  id: string;
  name: string;
  document?: string | null;
  contactName?: string | null;
  contactRole?: string | null;
  leadSource?: string | null;
  contacts?: { type: string; value: string }[] | null;
  decisores?: { id: string; name: string; role: string; contacts: { type: string; value: string }[] }[] | null;
  createdAt?: string | Date | null;
  updatedAt?: string | Date | null;
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
  propostaData?: { briefingTitle?: string; briefingText?: string; paymentTerms?: string; observations?: string; showSubtotals?: boolean; investmentLines?: any[]; };
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

export interface Pipeline {
  id: string;
  name: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  stages?: Stage[];
  deals?: Deal[];
}

export interface Stage {
  id: string;
  pipelineId: string;
  name: string;
  order: number;
  color: string;
  deals?: Deal[];
}

export interface Deal {
  id: string;
  clientId: string;
  pipelineId: string;
  stageId: string;
  projectId?: string | null;
  title: string;
  value: number;
  status: 'open' | 'won' | 'lost';
  nextActionDate?: string | Date | null;
  lossReason?: string | null;
  notes?: string | null;
  linkedDecisores?: string[] | null;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  client?: Client;
}


