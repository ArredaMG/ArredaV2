import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Project, ProjectVersion, Professional, Equipment, Client, Template, CostGroup } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../services/supabase';

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
  deleteClient: (id: string) => Promise<void>;
  addTemplate: (template: Omit<Template, 'id'>) => Promise<void>;
  deleteTemplate: (id: string) => Promise<void>;
  deleteProjectVersion: (projectId: string, versionId: string) => Promise<void>;
  updateTemplate?: (id: string, updatedTemplate: Template) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [clientes, setClientes] = useState<Client[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [hasActiveColumn, setHasActiveColumn] = useState<boolean>(false); // Seguro por padrão

  // Initial Fetch from Supabase
  useEffect(() => {
    const fetchAllData = async () => {
      try {
        // Verifica se a coluna 'is_active' existe para evitar erros de salvamento
        const { error: schemaErr } = await supabase.from('cost_groups').select('is_active').limit(1);
        if (!schemaErr) {
          setHasActiveColumn(true);
        } else {
          console.warn("⚠️ Coluna 'is_active' não disponível em 'cost_groups'. Desabilitando gravação desta coluna.");
        }

        const [
          { data: clientsData },
          { data: profsData },
          { data: equipData },
          { data: templatesData },
          { data: projectsData },
          { data: versionsData },
          { data: groupsData },
          { data: itemsData }
        ] = await Promise.all([
          supabase.from('clients').select('*'),
          supabase.from('professionals').select('*'),
          supabase.from('equipment').select('*'),
          supabase.from('templates').select('*'),
          supabase.from('projects').select('*').order('created_at', { ascending: false }),
          supabase.from('project_versions').select('*'),
          supabase.from('cost_groups').select('*'),
          supabase.from('cost_items').select('*')
        ]);

        let localClients = clientsData ? clientsData.map(c => ({ id: c.id, nome: c.name, cnpj: c.cnpj_cpf || '' })) : [];
        setClientes(localClients);
        
        if (profsData) setProfessionals(profsData.map(p => ({ id: p.id, name: p.name, role: p.role || '', pix: p.pix || '', dailyRate: p.daily_rate })));
        if (equipData) setEquipments(equipData.map(e => ({ id: e.id, name: e.name, category: e.category || '', rentalValue: e.rental_value })));
        if (templatesData) setTemplates(templatesData.map(t => ({ id: t.id, name: t.name, data: t.data })));

        if (projectsData) {
          const assembledProjects: Project[] = projectsData.map(p => {
            const clientObj = localClients.find(c => c.id === p.client_id);
            const clientName = clientObj ? clientObj.nome : 'Cliente Não Encontrado';

            const pVersions = (versionsData || []).filter(v => v.project_id === p.id).map(v => {
              const vGroups = (groupsData || []).filter(g => g.version_id === v.id).map(g => {
                const gItems = (itemsData || []).filter(i => i.group_id === g.id).map(i => ({
                  id: i.id,
                  role: i.role,
                  name: i.name,
                  quantity: Number(i.quantity),
                  days: Number(i.days),
                  unitCost: Number(i.unit_cost),
                  tax: Number(i.tax),
                  inHouse: Boolean(i.in_house),
                  executedCost: i.executed_cost ? Number(i.executed_cost) : undefined,
                  receiptLink: i.receipt_link
                }));
                return { 
                  id: g.id, 
                  name: g.name, 
                  margin: g.margin !== null ? Number(g.margin) * 100 : undefined, // Conv decimal para %
                  isActive: g.is_active !== false,
                  items: gItems 
                };
              });
              return {
                id: v.id,
                name: v.name,
                date: v.date,
                defaultTax: Number(v.default_tax) * 100, // Conv decimal para %
                defaultMargin: Number(v.default_margin) * 100, // Conv decimal para %
                groups: vGroups
              };
            });

            return {
              id: p.id,
              title: p.title,
              client: clientName,
              status: p.status as any,
              versions: pVersions.sort((a,b) => a.name.localeCompare(b.name))
            };
          });
          setProjects(assembledProjects);
        }
      } catch (error) {
        console.error('Error fetching data from Supabase:', error);
      }
    };

    fetchAllData();
  }, []);

  const getClientIdByName = async (clientName: string) => {
    let clientMatch = clientes.find(c => c.nome === clientName);
    if (clientMatch) return clientMatch.id;
    
    const newClientId = uuidv4();
    const { error } = await supabase.from('clients').insert({ id: newClientId, name: clientName });
    if (error) console.error("Error creating client:", error);
    
    setClientes(prev => [...prev, { id: newClientId, nome: clientName, cnpj: '' }]);
    return newClientId;
  };

  const addProject = async (projectData: Omit<Project, 'id' | 'versions'> & { defaultTax: number; defaultMargin: number; groups: CostGroup[] }) => {
    const parentId = uuidv4();
    const versionId = uuidv4();
    
    const newProject: Project = {
      id: parentId,
      title: projectData.title,
      client: projectData.client,
      status: projectData.status,
      versions: [{
        id: versionId,
        name: 'V1',
        date: new Date().toISOString().split('T')[0],
        defaultTax: projectData.defaultTax,
        defaultMargin: projectData.defaultMargin,
        groups: projectData.groups,
      }]
    };
    setProjects(prev => [newProject, ...prev]);

    try {
        const client_id = await getClientIdByName(projectData.client);

        const { error: pErr } = await supabase.from('projects').insert({
            id: parentId,
            title: projectData.title,
            client_id: client_id,
            status: projectData.status
        });
        if (pErr) throw pErr;

        const { error: vErr } = await supabase.from('project_versions').insert({
            id: versionId,
            project_id: parentId,
            name: 'V1',
            date: new Date().toISOString(),
            default_tax: projectData.defaultTax / 100,
            default_margin: projectData.defaultMargin / 100
        });
        if (vErr) throw vErr;

        if (projectData.groups.length > 0) {
            const groupsToInsert = projectData.groups.map(g => {
                const data: any = {
                    id: g.id,
                    version_id: versionId,
                    name: g.name,
                    margin: g.margin !== undefined ? g.margin / 100 : null
                };
                if (hasActiveColumn) data.is_active = g.isActive !== false;
                return data;
            });
            const { error: gErr } = await supabase.from('cost_groups').insert(groupsToInsert);
            if (gErr) throw gErr;
            
            const allItems: any[] = [];
            projectData.groups.forEach(g => {
                g.items.forEach(i => {
                    allItems.push({
                        id: i.id,
                        group_id: g.id,
                        role: i.role,
                        name: i.name,
                        quantity: i.quantity,
                        days: i.days,
                        unit_cost: i.unitCost,
                        tax: i.tax,
                        in_house: i.inHouse,
                        executed_cost: i.executedCost,
                        receipt_link: i.receiptLink
                    });
                });
            });

            if (allItems.length > 0) {
                const { error: iErr } = await supabase.from('cost_items').insert(allItems);
                if (iErr) throw iErr;
            }
        }
    } catch (error) {
        console.error("Error creating project in Supabase:", error);
        throw error;
    }

    return newProject;
  };

  const updateProject = async (id: string, updates: Partial<Project>) => {
    // Debug log as requested
    console.log("Dados salvos (updateProject):", updates);

    setProjects(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
    
    try {
      const dbUpdates: any = {};
      if (updates.title) dbUpdates.title = updates.title;
      if (updates.status) dbUpdates.status = updates.status;
      if (updates.client) dbUpdates.client_id = await getClientIdByName(updates.client);
      
      if (Object.keys(dbUpdates).length > 0) {
        await supabase.from('projects').update(dbUpdates).eq('id', id);
      }

      // If full project object was passed with versions, sync all versions
      if (updates.versions && updates.versions.length > 0) {
          for (const v of updates.versions) {
              await syncVersionWithSupabase(v);
          }
      }
    } catch (error) {
      console.error('Error updating project:', error);
      throw error;
    }
  };

  const syncVersionWithSupabase = async (version: ProjectVersion) => {
    try {
      // 1. Update version metadata
      const { error: vErr } = await supabase.from('project_versions').update({
        name: version.name,
        date: version.date,
        default_tax: version.defaultTax / 100,
        default_margin: version.defaultMargin / 100
      }).eq('id', version.id);
      if (vErr) throw vErr;

      // 2. Clear existing groups/items
      const { error: delErr } = await supabase.from('cost_groups').delete().eq('version_id', version.id);
      if (delErr) throw delErr;

      // 3. Batch insert groups
      if (version.groups.length > 0) {
        const groupsToInsert = version.groups.map(g => {
          const data: any = {
            id: g.id,
            version_id: version.id,
            name: g.name,
            margin: g.margin !== undefined ? g.margin / 100 : null
          };
          if (hasActiveColumn) data.is_active = g.isActive !== false;
          return data;
        });
        
        const { error: gError } = await supabase.from('cost_groups').insert(groupsToInsert);
        if (gError) throw gError;

        // 4. Batch insert all items from all groups
        const allItems: any[] = [];
        version.groups.forEach(g => {
          g.items.forEach(i => {
            allItems.push({
              id: i.id,
              group_id: g.id,
              role: i.role,
              name: i.name,
              quantity: i.quantity,
              days: i.days,
              unit_cost: i.unitCost,
              tax: i.tax,
              in_house: i.inHouse,
              executed_cost: i.executedCost,
              receipt_link: i.receiptLink
            });
          });
        });

        if (allItems.length > 0) {
          const { error: iError } = await supabase.from('cost_items').insert(allItems);
          if (iError) throw iError;
        }
      }
    } catch (error) {
      console.error('Error syncing version with Supabase:', error);
      throw error;
    }
  };

  const deleteProject = async (id: string) => {
    setProjects(prev => prev.filter(p => p.id !== id));
    const { error } = await supabase.from('projects').delete().eq('id', id);
    if (error) {
      console.error("Error deleting project:", error);
      throw error;
    }
  };

  const addProjectVersion = async (projectId: string, versionIdToClone?: string) => {
    const project = projects.find(p => p.id === projectId);
    if (!project) return undefined;

    let baseVersion = project.versions[project.versions.length - 1];
    if (versionIdToClone) {
      const found = project.versions.find(v => v.id === versionIdToClone);
      if (found) baseVersion = found;
    }

    const nextVNumber = project.versions.length + 1;
    const newVersion = {
      ...baseVersion,
      id: uuidv4(),
      name: `V${nextVNumber}`,
      date: new Date().toISOString().split('T')[0],
      groups: baseVersion.groups.map(g => ({
        ...g,
        id: uuidv4(),
        items: g.items.map(i => ({ ...i, id: uuidv4() }))
      }))
    };

    setProjects(prev => prev.map(p => p.id === projectId ? { ...p, versions: [...p.versions, newVersion] } : p));
    
    try {
      const { error: vErr } = await supabase.from('project_versions').insert({
        id: newVersion.id, project_id: projectId, name: newVersion.name, date: new Date().toISOString(),
        default_tax: newVersion.defaultTax / 100, default_margin: newVersion.defaultMargin / 100
      });
      if (vErr) throw vErr;

      if (newVersion.groups.length > 0) {
        const groupsToInsert = newVersion.groups.map(g => {
            const data: any = {
                id: g.id, 
                version_id: newVersion.id, 
                name: g.name, 
                margin: g.margin !== undefined ? g.margin / 100 : null
            };
            if (hasActiveColumn) data.is_active = g.isActive !== false;
            return data;
        });
        const { error: gErr } = await supabase.from('cost_groups').insert(groupsToInsert);
        if (gErr) throw gErr;

        const allItems: any[] = [];
        newVersion.groups.forEach(g => {
            g.items.forEach(i => {
                allItems.push({
                    id: i.id, group_id: g.id, role: i.role, name: i.name, quantity: i.quantity, days: i.days,
                    unit_cost: i.unitCost, tax: i.tax, in_house: i.inHouse, executed_cost: i.executedCost, receipt_link: i.receiptLink
                });
            });
        });
        if (allItems.length > 0) {
            const { error: iErr } = await supabase.from('cost_items').insert(allItems);
            if (iErr) throw iErr;
        }
      }
    } catch (error) {
        console.error("Error creating project version:", error);
        throw error;
    }

    return { ...project, versions: [...project.versions, newVersion] };
  };

  const updateProjectVersion = async (projectId: string, versionId: string, updates: Partial<ProjectVersion>) => {
    setProjects(prev => {
        return prev.map(p => p.id === projectId ? {
            ...p, versions: p.versions.map(v => v.id === versionId ? { ...v, ...updates } : v)
        } : p);
    });

    try {
        // If updates include structural changes (groups), sync the whole version
        if (updates.groups) {
            const project = projects.find(p => p.id === projectId);
            const version = project?.versions.find(v => v.id === versionId);
            if (version) {
                await syncVersionWithSupabase({ ...version, ...updates });
            }
        } else if (updates.name || updates.date || updates.defaultMargin || updates.defaultTax) {
            const dbUpdates: any = {};
            if (updates.name) dbUpdates.name = updates.name;
            if (updates.date) dbUpdates.date = updates.date;
            if (updates.defaultMargin !== undefined) dbUpdates.default_margin = updates.defaultMargin / 100;
            if (updates.defaultTax !== undefined) dbUpdates.default_tax = updates.defaultTax / 100;
            
            await supabase.from('project_versions').update(dbUpdates).eq('id', versionId);
        }
    } catch (error) {
        console.error('Error updating project version:', error);
        throw error;
    }
  };

  const addProfessional = async (professional: Omit<Professional, 'id'>) => {
    const id = uuidv4();
    setProfessionals(prev => [...prev, { ...professional, id }]);
    const { error } = await supabase.from('professionals').insert({ id, name: professional.name, role: professional.role, pix: professional.pix, daily_rate: professional.dailyRate });
    if (error) {
        console.error("Error adding professional:", error);
        throw error;
    }
  };

  const updateProfessional = async (id: string, updates: Partial<Professional>) => {
    setProfessionals(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
    const { error } = await supabase.from('professionals').update({ name: updates.name, role: updates.role, pix: updates.pix, daily_rate: updates.dailyRate }).eq('id', id);
    if (error) {
        console.error("Error updating professional:", error);
        throw error;
    }
  };

  const deleteProfessional = async (id: string) => {
    setProfessionals(prev => prev.filter(p => p.id !== id));
    const { error } = await supabase.from('professionals').delete().eq('id', id);
    if (error) {
        console.error("Error deleting professional:", error);
        throw error;
    }
  };

  const addEquipment = async (equipment: Omit<Equipment, 'id'>) => {
    const id = uuidv4();
    setEquipments(prev => [...prev, { ...equipment, id }]);
    const { error } = await supabase.from('equipment').insert({ id, name: equipment.name, category: equipment.category, rental_value: equipment.rentalValue });
    if (error) {
        console.error("Error adding equipment:", error);
        throw error;
    }
  };

  const updateEquipment = async (id: string, updates: Partial<Equipment>) => {
    setEquipments(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));
    const { error } = await supabase.from('equipment').update({ name: updates.name, category: updates.category, rental_value: updates.rentalValue }).eq('id', id);
    if (error) {
        console.error("Error updating equipment:", error);
        throw error;
    }
  };

  const deleteEquipment = async (id: string) => {
    setEquipments(prev => prev.filter(e => e.id !== id));
    const { error } = await supabase.from('equipment').delete().eq('id', id);
    if (error) {
        console.error("Error deleting equipment:", error);
        throw error;
    }
  };

  const addClient = async (client: Omit<Client, 'id'>) => {
    const id = uuidv4();
    setClientes(prev => [...prev, { ...client, id }]);
    const { error } = await supabase.from('clients').insert({ id, name: client.nome, cnpj_cpf: client.cnpj });
    if (error) {
        console.error("Error adding client:", error);
        throw error;
    }
  };

  const deleteClient = async (id: string) => {
    setClientes(prev => prev.filter(c => c.id !== id));
    const { error } = await supabase.from('clients').delete().eq('id', id);
    if (error) {
        console.error("Error deleting client:", error);
        throw error;
    }
  };

  const addTemplate = async (template: Omit<Template, 'id'>) => {
    const id = uuidv4();
    setTemplates(prev => [...prev, { ...template, id }]);
    const { error } = await supabase.from('templates').insert({ id, name: template.name, data: template.data });
    if (error) {
        console.error("Error adding template:", error);
        throw error;
    }
  };

  const deleteTemplate = async (id: string) => {
    setTemplates(prev => prev.filter(t => t.id !== id));
    const { error } = await supabase.from('templates').delete().eq('id', id);
    if (error) {
        console.error("Error deleting template:", error);
        throw error;
    }
  };

  const updateTemplate = async (id: string, updatedTemplate: Template) => {
    setTemplates(prev => prev.map(t => t.id === id ? updatedTemplate : t));
    const { error } = await supabase.from('templates').update({ name: updatedTemplate.name, data: updatedTemplate.data }).eq('id', id);
    if (error) {
        console.error("Error updating template:", error);
        throw error;
    }
  };

  const deleteProjectVersion = async (projectId: string, versionId: string) => {
    setProjects(prev => prev.map(p => {
      if (p.id !== projectId) return p;
      if (p.versions.length <= 1) return p; // Keep at least one version or handle project deletion
      return { ...p, versions: p.versions.filter(v => v.id !== versionId) };
    }));
    const { error } = await supabase.from('project_versions').delete().eq('id', versionId);
    if (error) {
        console.error("Error deleting project version:", error);
        throw error;
    }
  };

  return (
    <AppContext.Provider value={{
      projects, professionals, equipments, clientes, templates, editingTemplateId, setEditingTemplateId,
      addProject, updateProject, deleteProject, addProjectVersion, updateProjectVersion,
      addProfessional, updateProfessional, deleteProfessional,
      addEquipment, updateEquipment, deleteEquipment,
      addClient, deleteClient,
      addTemplate, deleteTemplate, updateTemplate, deleteProjectVersion
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
