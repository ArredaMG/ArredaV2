import { useAuth } from '@clerk/clerk-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { v4 as uuidv4 } from 'uuid';
import {
  fetchProjects,
  loadVersionData,
  createProject,
  updateProject,
  deleteProject,
  syncVersionWithDb,
  addProjectVersion,
  deleteProjectVersion,
  isProjectNumberTaken,
  updateDealByProjectId,
  addClient,
} from '../services/db-services';
import { resourceKeys } from './useResources';
import { Project, ProjectVersion, Client, CostGroup, ProjectStatus } from '../types';

export const projectKeys = {
  all: ['projects'] as const,
  version: (versionId: string) => ['project-version', versionId] as const,
};

export type CreateProjectInput = Omit<Project, 'id' | 'versions'> & {
  defaultTax: number;
  defaultMargin: number;
  groups: CostGroup[];
};

async function resolveToken(getToken: ReturnType<typeof useAuth>['getToken']) {
  const token = await getToken();
  if (!token) throw new Error('Não autenticado');
  return token;
}

function useAuthQueryEnabled() {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  return { getToken, enabled: isLoaded && isSignedIn };
}

async function resolveClientId(
  clientName: string,
  getToken: ReturnType<typeof useAuth>['getToken'],
  queryClient: ReturnType<typeof useQueryClient>
): Promise<string> {
  const clientes = queryClient.getQueryData<Client[]>(resourceKeys.clients) ?? [];
  const clientMatch = clientes.find(c => c.name === clientName);
  if (clientMatch) return clientMatch.id;

  const newClient: Client = { id: uuidv4(), name: clientName, document: '' };
  const token = await resolveToken(getToken);
  await addClient(newClient, token);
  await queryClient.invalidateQueries({ queryKey: resourceKeys.clients });
  return newClient.id;
}

export function useProjects() {
  const queryClient = useQueryClient();
  const { getToken, enabled } = useAuthQueryEnabled();

  const query = useQuery({
    queryKey: projectKeys.all,
    queryFn: async () => {
      const token = await resolveToken(getToken);
      return fetchProjects(token);
    },
    enabled,
  });

  const createProjectMutation = useMutation({
    mutationFn: async (projectData: CreateProjectInput) => {
      const token = await resolveToken(getToken);
      const parentId = uuidv4();
      const versionId = uuidv4();

      const clientId = await resolveClientId(projectData.client, getToken, queryClient);
      const projects = queryClient.getQueryData<Project[]>(projectKeys.all) ?? [];
      const maxNumber = projects.length > 0 ? Math.max(...projects.map(p => p.projectNumber || 0)) : 0;

      const newProjectData = {
        id: parentId,
        title: projectData.title,
        clientId,
        status: projectData.status,
        projectNumber: maxNumber + 1,
        versions: [{
          id: versionId,
          name: 'V1',
          date: new Date().toISOString().split('T')[0],
          defaultTax: projectData.defaultTax,
          defaultMargin: projectData.defaultMargin,
          groups: projectData.groups,
        }],
      };

      const savedProject = await createProject(newProjectData, token);

      const projectWithGroups: Project = {
        id: savedProject.id,
        title: savedProject.title,
        client: projectData.client,
        status: savedProject.status as ProjectStatus,
        projectNumber: savedProject.projectNumber,
        recordingDates: projectData.recordingDates || [],
        createdAt: savedProject.createdAt,
        versions: [{
          ...savedProject.versions[0],
          groups: projectData.groups,
        }],
      };

      if (projectData.groups.length > 0) {
        const fullySyncedProject = await syncVersionWithDb(projectWithGroups.versions[0], token);
        if (fullySyncedProject) return fullySyncedProject as Project;
      }

      return projectWithGroups;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.all });
    },
  });

  const updateProjectMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Project> }) => {
      const token = await resolveToken(getToken);

      if (updates.projectNumber !== undefined) {
        const taken = await isProjectNumberTaken(updates.projectNumber, id, token);
        if (taken) {
          alert('Este número de orçamento já está em uso. Por favor, escolha outro.');
          throw new Error('Duplicate project number');
        }
      }

      const dbUpdates: Record<string, unknown> = {};
      if (updates.title) dbUpdates.title = updates.title;
      if (updates.status) dbUpdates.status = updates.status;
      if (updates.client) dbUpdates.clientId = await resolveClientId(updates.client, getToken, queryClient);
      if (updates.projectNumber !== undefined) dbUpdates.projectNumber = updates.projectNumber;
      if ('startDate' in updates) dbUpdates.startDate = updates.startDate || null;
      if ('endDate' in updates) dbUpdates.endDate = updates.endDate || null;
      if ('recordingDates' in updates) dbUpdates.recordingDates = updates.recordingDates;

      await updateProject(id, dbUpdates, token);

      if (updates.title) {
        try {
          await updateDealByProjectId(id, { title: updates.title }, token);
        } catch (err) {
          console.error('Erro ao sincronizar titulo do deal:', err);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.all });
    },
  });

  const deleteProjectMutation = useMutation({
    mutationFn: async (id: string) => {
      const token = await resolveToken(getToken);
      await deleteProject(id, token);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.all });
    },
  });

  const addVersionMutation = useMutation({
    mutationFn: async ({
      projectId,
      versionIdToClone,
    }: {
      projectId: string;
      versionIdToClone?: string;
    }) => {
      const token = await resolveToken(getToken);
      const projects = queryClient.getQueryData<Project[]>(projectKeys.all) ?? [];
      const project = projects.find(p => p.id === projectId);
      if (!project) return undefined;

      let baseVersion = project.versions[project.versions.length - 1];
      if (versionIdToClone) {
        const found = project.versions.find(v => v.id === versionIdToClone);
        if (found) baseVersion = found;
      }

      const nextVNumber = project.versions.length + 1;
      const newVersionId = uuidv4();
      const newVersion: ProjectVersion = {
        ...baseVersion,
        id: newVersionId,
        name: `V${nextVNumber}`,
        date: new Date().toISOString().split('T')[0],
        groups: baseVersion.groups.map(g => ({
          ...g,
          id: uuidv4(),
          items: g.items.map(i => ({ ...i, id: uuidv4() })),
        })),
      };

      await addProjectVersion({
        id: newVersion.id,
        projectId,
        name: newVersion.name,
        date: newVersion.date,
        defaultTax: newVersion.defaultTax,
        defaultMargin: newVersion.defaultMargin,
      }, token);

      if (newVersion.groups.length > 0) {
        await syncVersionWithDb(newVersion, token);
      }

      return { ...project, versions: [...project.versions, newVersion] };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.all });
    },
  });

  const updateVersionMutation = useMutation({
    mutationFn: async ({
      projectId,
      versionId,
      updates,
    }: {
      projectId: string;
      versionId: string;
      updates: Partial<ProjectVersion>;
    }) => {
      const token = await resolveToken(getToken);
      const projects = queryClient.getQueryData<Project[]>(projectKeys.all) ?? [];
      const project = projects.find(p => p.id === projectId);
      const prevVersion = project?.versions.find(v => v.id === versionId);
      if (!prevVersion) throw new Error('Versão não encontrada para sincronização.');

      const updatedVersion = { ...prevVersion, ...updates } as ProjectVersion;
      await syncVersionWithDb(updatedVersion, token);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.all });
      queryClient.invalidateQueries({ queryKey: projectKeys.version(variables.versionId) });
    },
  });

  const deleteVersionMutation = useMutation({
    mutationFn: async ({
      projectId,
      versionId,
    }: {
      projectId: string;
      versionId: string;
    }) => {
      const token = await resolveToken(getToken);
      const projects = queryClient.getQueryData<Project[]>(projectKeys.all) ?? [];
      const project = projects.find(p => p.id === projectId);
      if (!project || project.versions.length <= 1) return;

      await deleteProjectVersion(versionId, token);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.all });
      queryClient.removeQueries({ queryKey: projectKeys.version(variables.versionId) });
    },
  });

  return {
    projects: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    refetchProjects: query.refetch,
    createProjectMutation,
    updateProjectMutation,
    deleteProjectMutation,
    addVersionMutation,
    updateVersionMutation,
    deleteVersionMutation,
  };
}

export function useProjectVersion(versionId: string | null | undefined) {
  const { getToken, enabled: authEnabled } = useAuthQueryEnabled();

  const query = useQuery({
    queryKey: projectKeys.version(versionId ?? ''),
    queryFn: async () => {
      const token = await resolveToken(getToken);
      return loadVersionData(versionId!, token);
    },
    enabled: authEnabled && !!versionId,
  });

  return {
    versionGroups: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
  };
}
