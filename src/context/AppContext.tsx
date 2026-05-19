import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Project, ProjectVersion, Professional, Equipment, Client, Template, CostGroup } from '../types';
import { v4 as uuidv4 } from 'uuid';
import * as dbService from '../services/db-services';

export interface AppContextType {
  projects: Project[];
  professionals: Professional[];
  equipments: Equipment[];
  clientes: Client[];
  templates: Template[];
  editingTemplateId: string | null;
  setEditingTemplateId: (id: string | null) => void;
  addProject: (project: Omit<Project, 'id' | 'versions'> & { defaultTax: number; defaultMargin: number; groups: CostGroup[] }) => Promise<Project>;
  updateProject: (id: string, updates: Partial<Project>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  addProjectVersion: (projectId: string, versionIdToClone?: string) => Promise<Project | undefined>;
  updateProjectVersion: (projectId: string, versionId: string, updates: Partial<ProjectVersion>) => Promise<void>;
  addProfessional: (professional: Omit<Professional, 'id'>) => Promise<void>;
  updateProfessional: (id: string, updates: Partial<Professional>) => Promise<void>;
  deleteProfessional: (id: string) => Promise<void>;
  addEquipment: (equipment: Omit<Equipment, 'id'>) => Promise<void>;
  updateEquipment: (id: string, updates: Partial<Equipment>) => Promise<void>;
  deleteEquipment: (id: string) => Promise<void>;
  addClient: (client: Omit<Client, 'id'>) => Promise<void>;
  updateClient: (id: string, updates: Partial<Client>) => Promise<void>;
  deleteClient: (id: string) => Promise<void>;
  addTemplate: (template: Omit<Template, 'id'>) => Promise<void>;
  deleteTemplate: (id: string) => Promise<void>;
  deleteProjectVersion: (projectId: string, versionId: string) => Promise<void>;
  updateTemplate?: (id: string, updatedTemplate: Template) => Promise<void>;
  isVersionLoading: boolean;
  loadVersionData: (versionId: string) => Promise<void>;
  clearVersionData: (versionId: string) => void;
  refreshData: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [clientes, setClientes] = useState<Client[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);

  // Initial Fetch from Neon (via Drizzle)
  const refreshData = async () => {
    try {
      const data = await dbService.fetchAllData();
      setClientes(data.clients);
      setProfessionals(data.professionals);
      setEquipments(data.equipments);
      setTemplates(data.templates);
      setProjects(data.projects);
    } catch (error) {
      console.error('Error fetching data from Neon:', error);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  const getClientIdByName = async (clientName: string) => {
    let clientMatch = clientes.find(c => c.nome === clientName);
    if (clientMatch) return clientMatch.id;
    
    // Snapshot
    const previousClients = [...clientes];
    const newClient: Client = { id: uuidv4(), nome: clientName, cnpj: '' };
    
    // Mutação Otimista
    setClientes(prev => [...prev, newClient]);
    
    try {
        await dbService.addClient(newClient);
        return newClient.id;
    } catch (error) {
        console.error('Erro ao resolver cliente:', error);
        setClientes(previousClients);
        // Não lançamos erro aqui para não quebrar o fluxo do projeto, 
        // mas o rollback garantirá integridade.
        return newClient.id; 
    }
  };

  const [isVersionLoading, setIsVersionLoading] = useState(false);

  const loadVersionData = async (versionId: string) => {
    setIsVersionLoading(true);
    try {
      const vGroups = await dbService.loadVersionData(versionId);

      setProjects(prev => prev.map(p => {
        const hasVersion = p.versions.some(v => v.id === versionId);
        if (!hasVersion) return p;
        return {
          ...p,
          versions: p.versions.map(v => v.id === versionId ? { ...v, groups: vGroups } : v)
        };
      }));
    } catch (err) {
      console.error("Error loading version data:", err);
    } finally {
      setIsVersionLoading(false);
    }
  };

  const clearVersionData = (versionId: string) => {
    setProjects(prev => prev.map(p => {
      const hasVersion = p.versions.some(v => v.id === versionId);
      if (!hasVersion) return p;
      return {
        ...p,
        versions: p.versions.map(v => v.id === versionId ? { ...v, groups: [] } : v)
      };
    }));
  };

  const addProject = async (projectData: Omit<Project, 'id' | 'versions'> & { defaultTax: number; defaultMargin: number; groups: CostGroup[] }) => {
    const parentId = uuidv4();
    const versionId = uuidv4();
    
    try {
      const clientId = await getClientIdByName(projectData.client);
      
      const maxNumber = projects.length > 0 ? Math.max(...projects.map(p => p.projectNumber || 0)) : 0;
      const nextProjectNumber = maxNumber + 1;

      const newProjectData = {
        id: parentId,
        title: projectData.title,
        clientId: clientId,
        status: projectData.status,
        projectNumber: nextProjectNumber,
        versions: [{
          id: versionId,
          name: 'V1',
          date: new Date().toISOString().split('T')[0],
          defaultTax: projectData.defaultTax,
          defaultMargin: projectData.defaultMargin,
          groups: projectData.groups,
        }]
      };

      const savedProject = await dbService.createProject(newProjectData);
      
      const projectWithGroups: Project = {
          id: savedProject.id,
          title: savedProject.title,
          client: projectData.client,
          status: savedProject.status as any,
          projectNumber: savedProject.projectNumber,
          recordingDates: projectData.recordingDates || [],
          createdAt: savedProject.createdAt,
          versions: [{
              ...savedProject.versions[0],
              groups: projectData.groups
          }]
      };

      if (projectData.groups.length > 0) {
          const fullySyncedProject = await dbService.syncVersionWithDb(projectWithGroups.versions[0]);
          if (fullySyncedProject) {
              console.log("Atualizando lista. Projetos anteriores:", projects.length);
              setProjects(prev => [fullySyncedProject, ...prev]);
              return fullySyncedProject;
          }
      }

      console.log("Atualizando lista. Projetos anteriores:", projects.length);
      setProjects(prev => [projectWithGroups, ...prev]);
      return projectWithGroups;
    } catch (error) {
      console.error('Error adding project:', error);
      throw error;
    }
  };

  const updateProject = async (id: string, updates: Partial<Project>) => {
    // Validação de duplicidade de número
    if (updates.projectNumber !== undefined) {
      const isTaken = await dbService.isProjectNumberTaken(updates.projectNumber, id);
      if (isTaken) {
        alert("Este número de orçamento já está em uso. Por favor, escolha outro.");
        throw new Error("Duplicate project number");
      }
    }

    console.log("1. Iniciando Update. Projetos atuais no estado:", projects.length);
    console.log("2. Enviando para o BD:", updates);

    // 1. Snapshot
    const previousProjects = [...projects];

    // 2. Mutação Otimista (UI Imediata)
    setProjects(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
    
    try {
      // 3. Chamada ao Banco (Background, silenciosa)
      const dbUpdates: any = {};
      if (updates.title) dbUpdates.title = updates.title;
      if (updates.status) dbUpdates.status = updates.status;
      if (updates.client) dbUpdates.clientId = await getClientIdByName(updates.client);
      if (updates.projectNumber !== undefined) dbUpdates.projectNumber = updates.projectNumber;
      if ('startDate' in updates) dbUpdates.startDate = updates.startDate || null;
      if ('endDate' in updates) dbUpdates.endDate = updates.endDate || null;
      if ('recordingDates' in updates) dbUpdates.recordingDates = updates.recordingDates;

      await dbService.updateProject(id, dbUpdates);
    } catch (error) {
      // 4. Rollback em caso de falha
      console.error("ERRO NEON DB:", error);
      console.error('Erro detalhado ao sincronizar o projeto no DB:', {
        projectId: id,
        attemptedUpdates: updates,
        error: error instanceof Error ? { message: error.message, stack: error.stack } : error,
      });
      setProjects(previousProjects);
      alert("Falha de conexão: As alterações no projeto não puderam ser salvas e foram desfeitas.");
      throw error;
    }
  };

  const deleteProject = async (id: string) => {
    // 1. Snapshot
    const previousProjects = [...projects];

    // 2. Mutação Otimista
    setProjects(prev => prev.filter(p => p.id !== id));

    try {
      // 3. Chamada ao Banco
      await dbService.deleteProject(id);
    } catch (error) {
      // 4. Rollback
      console.error('Erro ao excluir projeto:', error);
      setProjects(previousProjects);
      alert("Falha de conexão: O projeto não pôde ser excluído e foi restaurado na lista.");
      throw error;
    }
  };

  const addProjectVersion = async (projectId: string, versionIdToClone?: string) => {
    const project = projects.find(p => p.id === projectId);
    if (!project) return undefined;

    // 1. Snapshot
    const previousProjects = [...projects];

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
        items: g.items.map(i => ({ ...i, id: uuidv4() }))
      }))
    };

    // 2. Mutação Otimista
    setProjects(prev => prev.map(p => p.id === projectId ? { ...p, versions: [...p.versions, newVersion] } : p));

    try {
      // 3. Chamada ao Banco
      await dbService.addProjectVersion({
          id: newVersion.id,
          projectId: projectId,
          name: newVersion.name,
          date: newVersion.date,
          defaultTax: newVersion.defaultTax,
          defaultMargin: newVersion.defaultMargin
      });

      if (newVersion.groups.length > 0) {
          await dbService.syncVersionWithDb(newVersion);
      }
      
      return { ...project, versions: [...project.versions, newVersion] };
    } catch (error) {
      // 4. Rollback
      console.error('Erro ao adicionar versão:', error);
      setProjects(previousProjects);
      alert("Falha de conexão: A nova versão não pôde ser criada no servidor.");
      return undefined;
    }
  };

  const updateProjectVersion = async (projectId: string, versionId: string, updates: Partial<ProjectVersion>) => {
    // 1. Snapshot
    const previousProjects = [...projects];

    // 2. Mutação Otimista
    setProjects(prev => {
        return prev.map(p => p.id === projectId ? {
            ...p, versions: p.versions.map(v => v.id === versionId ? { ...v, ...updates } : v)
        } : p);
    });

    try {
        // 3. Chamada ao Banco (Background, silenciosa)
        const project = previousProjects.find(p => p.id === projectId);
        const prevVersion = project?.versions.find(v => v.id === versionId);
        
        if (!prevVersion) throw new Error("Versão não encontrada para sincronização.");
        
        const updatedVersion = { ...prevVersion, ...updates } as ProjectVersion;
        await dbService.syncVersionWithDb(updatedVersion);
    } catch (error) {
        // 4. Rollback
        console.error('Erro ao atualizar versão:', error);
        setProjects(previousProjects);
        alert("Falha de conexão: As alterações na versão não puderam ser salvas e foram desfeitas por segurança.");
        throw error;
    }
  };

  const addProfessional = async (professional: Omit<Professional, 'id'>) => {
    const previousProfessionals = [...professionals];
    const id = uuidv4();
    const newProf = { ...professional, id };
    
    setProfessionals(prev => [...prev, newProf]);
    
    try {
        await dbService.addProfessional(newProf);
    } catch (error) {
        console.error('Erro ao adicionar profissional:', error);
        setProfessionals(previousProfessionals);
        alert("Falha de conexão: O profissional não pôde ser salvo no servidor.");
    }
  };

  const updateProfessional = async (id: string, updates: Partial<Professional>) => {
    const previousProfessionals = [...professionals];
    setProfessionals(prevList => prevList.map(p => p.id === id ? { ...p, ...updates } : p));
    
    try {
        await dbService.updateProfessional(id, updates);
    } catch (error) {
        console.error('Erro ao atualizar profissional:', error);
        setProfessionals(previousProfessionals);
        alert("Falha de conexão: As alterações no profissional foram desfeitas por segurança.");
    }
  };

  const deleteProfessional = async (id: string) => {
    const previousProfessionals = [...professionals];
    setProfessionals(prevList => prevList.filter(p => p.id !== id));
    
    try {
        await dbService.deleteProfessional(id);
    } catch (error) {
        console.error('Erro ao excluir profissional:', error);
        setProfessionals(previousProfessionals);
        alert("Falha de conexão: O profissional não pôde ser excluído.");
    }
  };

  const addEquipment = async (equipment: Omit<Equipment, 'id'>) => {
    const previousEquipments = [...equipments];
    const id = uuidv4();
    const newEquip = { ...equipment, id };
    
    setEquipments(prev => [...prev, newEquip]);
    
    try {
        await dbService.addEquipment(newEquip);
    } catch (error) {
        console.error('Erro ao adicionar equipamento:', error);
        setEquipments(previousEquipments);
        alert("Falha de conexão: O equipamento não pôde ser salvo no servidor.");
    }
  };

  const updateEquipment = async (id: string, updates: Partial<Equipment>) => {
    const previousEquipments = [...equipments];
    setEquipments(prevList => prevList.map(e => e.id === id ? { ...e, ...updates } : e));
    
    try {
        await dbService.updateEquipment(id, updates);
    } catch (error) {
        console.error('Erro ao atualizar equipamento:', error);
        setEquipments(previousEquipments);
        alert("Falha de conexão: As alterações no equipamento foram desfeitas.");
    }
  };

  const deleteEquipment = async (id: string) => {
    const previousEquipments = [...equipments];
    setEquipments(prevList => prevList.filter(e => e.id !== id));
    
    try {
        await dbService.deleteEquipment(id);
    } catch (error) {
        console.error('Erro ao excluir equipamento:', error);
        setEquipments(previousEquipments);
        alert("Falha de conexão: O equipamento não pôde ser excluído.");
    }
  };

  const addClient = async (client: Omit<Client, 'id'>) => {
    const previousClients = [...clientes];
    const id = uuidv4();
    const newClient = { ...client, id };
    
    setClientes(prev => [...prev, newClient]);
    
    try {
        await dbService.addClient(newClient);
    } catch (error) {
        console.error('Erro ao adicionar cliente:', error);
        setClientes(previousClients);
        alert("Falha de conexão: O cliente não pôde ser salvo.");
    }
  };

  const updateClient = async (id: string, updates: Partial<Client>) => {
    const previousClients = [...clientes];
    setClientes(prevList => prevList.map(c => c.id === id ? { ...c, ...updates } : c));
    
    try {
        await dbService.updateClient(id, updates);
    } catch (error) {
        console.error('Erro ao atualizar cliente:', error);
        setClientes(previousClients);
        alert("Falha de conexão: As alterações no cliente foram desfeitas.");
    }
  };

  const deleteClient = async (id: string) => {
    const previousClients = [...clientes];
    setClientes(prev => prev.filter(c => c.id !== id));
    
    try {
        await dbService.deleteClient(id);
    } catch (error) {
        console.error('Erro ao excluir cliente:', error);
        setClientes(previousClients);
        alert("Falha de conexão: O cliente não pôde ser excluído.");
    }
  };

  const addTemplate = async (template: Omit<Template, 'id'>) => {
    const previousTemplates = [...templates];
    const id = uuidv4();
    const newTemplate = { ...template, id };
    
    setTemplates(prev => [...prev, newTemplate]);
    
    try {
        await dbService.addTemplate(newTemplate);
    } catch (error) {
        console.error('Erro ao adicionar modelo:', error);
        setTemplates(previousTemplates);
        alert("Falha de conexão: O modelo não pôde ser salvo.");
    }
  };

  const deleteTemplate = async (id: string) => {
    const previousTemplates = [...templates];
    setTemplates(prev => prev.filter(t => t.id !== id));
    
    try {
        await dbService.deleteTemplate(id);
    } catch (error) {
        console.error('Erro ao excluir modelo:', error);
        setTemplates(previousTemplates);
        alert("Falha de conexão: O modelo não pôde ser excluído.");
    }
  };

  const updateTemplate = async (id: string, updatedTemplate: Template) => {
    const previousTemplates = [...templates];
    const idToUpdate = updatedTemplate.id;
    setTemplates(prevList => prevList.map(t => t.id === idToUpdate ? updatedTemplate : t));
    
    try {
        await dbService.updateTemplate(idToUpdate, updatedTemplate);
    } catch (error) {
        console.error('Erro ao atualizar modelo:', error);
        setTemplates(previousTemplates);
        alert("Falha de conexão: As alterações no modelo foram desfeitas.");
    }
  };

  const deleteProjectVersion = async (projectId: string, versionId: string) => {
    const project = projects.find(p => p.id === projectId);
    if (!project || project.versions.length <= 1) return;

    const prevVersions = [...project.versions];
    setProjects(prev => prev.map(p => {
      if (p.id !== projectId) return p;
      return { ...p, versions: p.versions.filter(v => v.id !== versionId) };
    }));

    try {
      await dbService.deleteProjectVersion(versionId);
    } catch (error) {
      setProjects(prev => prev.map(p => p.id === projectId ? { ...p, versions: prevVersions } : p));
      throw error;
    }
  };

  return (
    <AppContext.Provider value={{
      projects, professionals, equipments, clientes, templates, editingTemplateId, setEditingTemplateId,
      addProject, updateProject, deleteProject, addProjectVersion, updateProjectVersion,
      addProfessional, updateProfessional, deleteProfessional,
      addEquipment, updateEquipment, deleteEquipment,
      addClient, updateClient, deleteClient,
      addTemplate, deleteTemplate, updateTemplate, deleteProjectVersion,
      isVersionLoading, loadVersionData, clearVersionData, refreshData
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppContext must be used within AppProvider');
  return context;
};
