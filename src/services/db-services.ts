import { ProjectVersion, Deal, Client, Professional, Equipment, Template, Project, Pipeline, CostGroup } from '../types';

export type FetchAllDataResult = {
  clients: Client[];
  professionals: Professional[];
  equipments: Equipment[];
  templates: Template[];
  projects: Project[];
};

async function apiFetch<T>(url: string, token: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as { error?: string }).error || 'Erro na requisição.');
  }

  if (res.status === 204) {
    return undefined as T;
  }

  const contentType = res.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    const preview = (await res.text()).slice(0, 200);
    throw new Error(
      `Resposta inválida da API (${res.status}). Esperado JSON, recebido: ${contentType || 'sem content-type'}. ` +
        `Verifique se o backend Express está rodando e se o proxy /api aponta para a porta correta. Preview: ${preview}`
    );
  }

  return res.json();
}

// ── Leitura ───────────────────────────────────────────────────────────────────

export const fetchAllData = async (token: string): Promise<FetchAllDataResult> => {
  return apiFetch<FetchAllDataResult>('/api/db/all', token);
};

export const loadVersionData = async (versionId: string, token: string): Promise<CostGroup[]> => {
  return apiFetch<CostGroup[]>(`/api/db/version/${encodeURIComponent(versionId)}`, token);
};

export const fetchCRMData = async (token: string): Promise<Pipeline[]> => {
  return apiFetch<Pipeline[]>('/api/db/crm', token);
};

export const fetchClients = async (token: string) => {
  return apiFetch('/api/db/clients', token);
};

export const fetchProfessionals = async (token: string) => {
  return apiFetch('/api/db/professionals', token);
};

export const fetchEquipments = async (token: string) => {
  return apiFetch('/api/db/equipments', token);
};

export const fetchTemplates = async (token: string) => {
  return apiFetch('/api/db/templates', token);
};

export const fetchProjects = async (token: string): Promise<Project[]> => {
  return apiFetch<Project[]>('/api/db/projects', token);
};

export async function isProjectNumberTaken(
  projectNumber: number,
  excludeProjectId: string | undefined,
  token: string
): Promise<boolean> {
  const params = new URLSearchParams({ projectNumber: String(projectNumber) });
  if (excludeProjectId) params.set('excludeProjectId', excludeProjectId);
  const { taken } = await apiFetch<{ taken: boolean }>(
    `/api/db/projects/check-number?${params}`,
    token
  );
  return taken;
}

// ── Projects ──────────────────────────────────────────────────────────────────

export type CreateProjectResult = {
  id: string;
  title: string;
  status: string;
  projectNumber: number;
  createdAt: Date | string;
  versions: Array<{
    id: string;
    name: string;
    date: string;
    defaultTax: number;
    defaultMargin: number;
    groups: [];
  }>;
};

export const createProject = async (projectData: any, token: string): Promise<CreateProjectResult> => {
  return apiFetch<CreateProjectResult>('/api/db/projects', token, {
    method: 'POST',
    body: JSON.stringify(projectData),
  });
};

export const updateProject = async (id: string, updates: any, token: string) => {
  return apiFetch(`/api/db/projects/${encodeURIComponent(id)}`, token, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
};

export const deleteProject = async (id: string, token: string) => {
  return apiFetch(`/api/db/projects/${encodeURIComponent(id)}`, token, {
    method: 'DELETE',
  });
};

export const syncVersionWithDb = async (version: ProjectVersion, token: string) => {
  return apiFetch('/api/db/projects/sync-version', token, {
    method: 'POST',
    body: JSON.stringify(version),
  });
};

export const addProjectVersion = async (version: any, token: string) => {
  return apiFetch('/api/db/project-versions', token, {
    method: 'POST',
    body: JSON.stringify(version),
  });
};

export const deleteProjectVersion = async (id: string, token: string) => {
  return apiFetch(`/api/db/project-versions/${encodeURIComponent(id)}`, token, {
    method: 'DELETE',
  });
};

// ── Professionals ─────────────────────────────────────────────────────────────

export const addProfessional = async (prof: any, token: string) => {
  return apiFetch('/api/db/professionals', token, {
    method: 'POST',
    body: JSON.stringify(prof),
  });
};

export const updateProfessional = async (id: string, updates: any, token: string) => {
  return apiFetch(`/api/db/professionals/${encodeURIComponent(id)}`, token, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
};

export const deleteProfessional = async (id: string, token: string) => {
  return apiFetch(`/api/db/professionals/${encodeURIComponent(id)}`, token, {
    method: 'DELETE',
  });
};

// ── Equipments ────────────────────────────────────────────────────────────────

export const addEquipment = async (equip: any, token: string) => {
  return apiFetch('/api/db/equipments', token, {
    method: 'POST',
    body: JSON.stringify(equip),
  });
};

export const updateEquipment = async (id: string, updates: any, token: string) => {
  return apiFetch(`/api/db/equipments/${encodeURIComponent(id)}`, token, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
};

export const deleteEquipment = async (id: string, token: string) => {
  return apiFetch(`/api/db/equipments/${encodeURIComponent(id)}`, token, {
    method: 'DELETE',
  });
};

// ── Clients ───────────────────────────────────────────────────────────────────

export const addClient = async (client: any, token: string) => {
  return apiFetch('/api/db/clients', token, {
    method: 'POST',
    body: JSON.stringify(client),
  });
};

export const updateClient = async (id: string, updates: any, token: string) => {
  return apiFetch(`/api/db/clients/${encodeURIComponent(id)}`, token, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
};

export const deleteClient = async (id: string, token: string) => {
  return apiFetch(`/api/db/clients/${encodeURIComponent(id)}`, token, {
    method: 'DELETE',
  });
};

// ── Templates ─────────────────────────────────────────────────────────────────

export const addTemplate = async (template: any, token: string) => {
  return apiFetch('/api/db/templates', token, {
    method: 'POST',
    body: JSON.stringify(template),
  });
};

export const updateTemplate = async (id: string, updates: any, token: string) => {
  return apiFetch(`/api/db/templates/${encodeURIComponent(id)}`, token, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
};

export const deleteTemplate = async (id: string, token: string) => {
  return apiFetch(`/api/db/templates/${encodeURIComponent(id)}`, token, {
    method: 'DELETE',
  });
};

// ── CRM: Pipelines, Stages, Deals ─────────────────────────────────────────────

export const createPipeline = async (pipeline: { id: string; name: string }, token: string) => {
  return apiFetch('/api/db/pipelines', token, {
    method: 'POST',
    body: JSON.stringify(pipeline),
  });
};

export const updatePipeline = async (id: string, name: string, token: string) => {
  return apiFetch(`/api/db/pipelines/${encodeURIComponent(id)}`, token, {
    method: 'PUT',
    body: JSON.stringify({ name }),
  });
};

export const deletePipeline = async (id: string, token: string) => {
  return apiFetch(`/api/db/pipelines/${encodeURIComponent(id)}`, token, {
    method: 'DELETE',
  });
};

export const createStage = async (
  stage: { id: string; pipelineId: string; name: string; order: number; color: string },
  token: string
) => {
  return apiFetch('/api/db/stages', token, {
    method: 'POST',
    body: JSON.stringify(stage),
  });
};

export const updateStage = async (id: string, name: string, token: string) => {
  return apiFetch(`/api/db/stages/${encodeURIComponent(id)}`, token, {
    method: 'PUT',
    body: JSON.stringify({ name }),
  });
};

export const deleteStage = async (id: string, token: string) => {
  return apiFetch(`/api/db/stages/${encodeURIComponent(id)}`, token, {
    method: 'DELETE',
  });
};

export const createDeal = async (
  deal: {
    id: string;
    clientId: string;
    pipelineId: string;
    stageId: string;
    projectId?: string;
    title: string;
    value: number;
    status: 'open' | 'won' | 'lost';
    nextActionDate?: Date | null;
    lossReason?: string | null;
    notes?: string | null;
    linkedDecisores?: string[] | null;
  },
  token: string
) => {
  return apiFetch('/api/db/deals', token, {
    method: 'POST',
    body: JSON.stringify(deal),
  });
};

export const updateDealStage = async (dealId: string, stageId: string, token: string) => {
  return apiFetch(`/api/db/deals/${encodeURIComponent(dealId)}/stage`, token, {
    method: 'PUT',
    body: JSON.stringify({ stageId }),
  });
};

export const updateDeal = async (dealId: string, updates: Partial<Deal>, token: string) => {
  return apiFetch(`/api/db/deals/${encodeURIComponent(dealId)}`, token, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
};

export const updateDealByProjectId = async (projectId: string, updates: Partial<Deal>, token: string) => {
  return apiFetch(`/api/db/deals/by-project/${encodeURIComponent(projectId)}`, token, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
};

export const deleteDeal = async (dealId: string, token: string) => {
  return apiFetch(`/api/db/deals/${encodeURIComponent(dealId)}`, token, {
    method: 'DELETE',
  });
};
