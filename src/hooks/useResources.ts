import { useAuth } from '@clerk/clerk-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { v4 as uuidv4 } from 'uuid';
import {
  fetchClients,
  fetchProfessionals,
  fetchEquipments,
  fetchTemplates,
  addClient,
  updateClient,
  deleteClient,
  addProfessional,
  updateProfessional,
  deleteProfessional,
  addEquipment,
  updateEquipment,
  deleteEquipment,
  addTemplate,
  updateTemplate,
  deleteTemplate,
} from '../services/db-services';
import { Client, Professional, Equipment, Template } from '../types';

export const resourceKeys = {
  clients: ['clients'] as const,
  professionals: ['professionals'] as const,
  equipments: ['equipments'] as const,
  templates: ['templates'] as const,
};

async function resolveToken(getToken: ReturnType<typeof useAuth>['getToken']) {
  const token = await getToken();
  if (!token) throw new Error('Não autenticado');
  return token;
}

function useAuthQueryEnabled() {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  return {
    getToken,
    enabled: isLoaded && isSignedIn,
  };
}

export function useClients() {
  const queryClient = useQueryClient();
  const { getToken, enabled } = useAuthQueryEnabled();

  const query = useQuery({
    queryKey: resourceKeys.clients,
    queryFn: async () => {
      const token = await resolveToken(getToken);
      return fetchClients(token) as Promise<Client[]>;
    },
    enabled,
  });

  const addMutation = useMutation({
    mutationFn: async (client: Omit<Client, 'id'> & { id?: string }) => {
      const token = await resolveToken(getToken);
      const payload = { ...client, id: client.id ?? uuidv4() };
      await addClient(payload, token);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: resourceKeys.clients }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Client> }) => {
      const token = await resolveToken(getToken);
      await updateClient(id, updates, token);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: resourceKeys.clients }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const token = await resolveToken(getToken);
      await deleteClient(id, token);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: resourceKeys.clients }),
  });

  return {
    clients: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    addClientMutation: addMutation,
    updateClientMutation: updateMutation,
    deleteClientMutation: deleteMutation,
  };
}

export function useProfessionals() {
  const queryClient = useQueryClient();
  const { getToken, enabled } = useAuthQueryEnabled();

  const query = useQuery({
    queryKey: resourceKeys.professionals,
    queryFn: async () => {
      const token = await resolveToken(getToken);
      return fetchProfessionals(token) as Promise<Professional[]>;
    },
    enabled,
  });

  const addMutation = useMutation({
    mutationFn: async (professional: Omit<Professional, 'id'>) => {
      const token = await resolveToken(getToken);
      await addProfessional({ ...professional, id: uuidv4() }, token);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: resourceKeys.professionals }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Professional> }) => {
      const token = await resolveToken(getToken);
      await updateProfessional(id, updates, token);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: resourceKeys.professionals }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const token = await resolveToken(getToken);
      await deleteProfessional(id, token);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: resourceKeys.professionals }),
  });

  return {
    professionals: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    addProfessionalMutation: addMutation,
    updateProfessionalMutation: updateMutation,
    deleteProfessionalMutation: deleteMutation,
  };
}

export function useEquipments() {
  const queryClient = useQueryClient();
  const { getToken, enabled } = useAuthQueryEnabled();

  const query = useQuery({
    queryKey: resourceKeys.equipments,
    queryFn: async () => {
      const token = await resolveToken(getToken);
      return fetchEquipments(token) as Promise<Equipment[]>;
    },
    enabled,
  });

  const addMutation = useMutation({
    mutationFn: async (equipment: Omit<Equipment, 'id'>) => {
      const token = await resolveToken(getToken);
      await addEquipment({ ...equipment, id: uuidv4() }, token);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: resourceKeys.equipments }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Equipment> }) => {
      const token = await resolveToken(getToken);
      await updateEquipment(id, updates, token);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: resourceKeys.equipments }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const token = await resolveToken(getToken);
      await deleteEquipment(id, token);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: resourceKeys.equipments }),
  });

  return {
    equipments: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    addEquipmentMutation: addMutation,
    updateEquipmentMutation: updateMutation,
    deleteEquipmentMutation: deleteMutation,
  };
}

export function useTemplates() {
  const queryClient = useQueryClient();
  const { getToken, enabled } = useAuthQueryEnabled();

  const query = useQuery({
    queryKey: resourceKeys.templates,
    queryFn: async () => {
      const token = await resolveToken(getToken);
      return fetchTemplates(token) as Promise<Template[]>;
    },
    enabled,
  });

  const addMutation = useMutation({
    mutationFn: async (template: Omit<Template, 'id'>) => {
      const token = await resolveToken(getToken);
      await addTemplate({ ...template, id: uuidv4() }, token);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: resourceKeys.templates }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Template> | Template }) => {
      const token = await resolveToken(getToken);
      await updateTemplate(id, updates, token);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: resourceKeys.templates }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const token = await resolveToken(getToken);
      await deleteTemplate(id, token);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: resourceKeys.templates }),
  });

  return {
    templates: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    addTemplateMutation: addMutation,
    updateTemplateMutation: updateMutation,
    deleteTemplateMutation: deleteMutation,
  };
}
