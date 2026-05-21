// src/components/crm/types.ts

export interface DecisionMaker {
  id: string;
  name: string;
  role?: string;
  avatarUrl?: string;
}

export interface Deal {
  id: string;
  title: string;
  value: number;
  clientId: string;
  client?: { name: string };
  stageId: string;
  status: 'open' | 'won' | 'lost';
  nextActionDate?: string | null;
  lossReason?: string | null;
  notes?: string;
  linkedDecisores?: string[];
  projectId?: string;
  // other fields as used in CRM
}

export interface Stage {
  id: string;
  name: string;
  color: string;
  order: number;
}
