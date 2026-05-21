import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Copy, 
  Trash2, 
  Search, 
  FileText, 
  Users, 
  Camera, 
  FileStack, 
  Eye, 
  Edit2, 
  Check, 
  X,
  FileSpreadsheet,
  Mail,
  MessageCircle,
  Instagram,
  Linkedin,
  Globe,
  ArrowRight,
  ShieldAlert
} from 'lucide-react';
import { useAuth } from '@clerk/clerk-react';
import { useQueryClient } from '@tanstack/react-query';
import { useAppContext } from '../context/AppContext';
import { useProjects, projectKeys } from '../hooks/useProjects';
import { useClients, useProfessionals, useEquipments, useTemplates, resourceKeys } from '../hooks/useResources';
import { LoadingSpinner, ErrorPanel } from '../components/ui';
import { loadVersionData } from '../services/db-services';
import { useModal } from '../context/ModalContext';
import { cn, formatCurrency } from '../lib/utils';
import { Template, Professional, Equipment, Project, ProjectVersion, Client } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { CreateProjectModal } from '../components/CreateProjectModal';
import { PropostaModal } from '../components/PropostaModal';

export const Recursos: React.FC = () => {
  const {
    projects = [],
    isLoading: isLoadingProjects,
    isError: isErrorProjects,
    refetchProjects,
    createProjectMutation,
    addVersionMutation,
    deleteProjectMutation,
  } = useProjects();
  const { setEditingTemplateId } = useAppContext();
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  const { clients: clientes, isLoading: isLoadingClients, isError: isErrorClients, addClientMutation, deleteClientMutation } = useClients();
  const { professionals, isLoading: isLoadingProfessionals, isError: isErrorProfessionals, addProfessionalMutation, updateProfessionalMutation, deleteProfessionalMutation } = useProfessionals();
  const { equipments, isLoading: isLoadingEquipments, isError: isErrorEquipments, addEquipmentMutation, updateEquipmentMutation, deleteEquipmentMutation } = useEquipments();
  const { templates, isLoading: isLoadingTemplates, isError: isErrorTemplates, deleteTemplateMutation } = useTemplates();

  const isLoading =
    isLoadingProjects ||
    isLoadingClients ||
    isLoadingProfessionals ||
    isLoadingEquipments ||
    isLoadingTemplates;
  const isError =
    isErrorProjects ||
    isErrorClients ||
    isErrorProfessionals ||
    isErrorEquipments ||
    isErrorTemplates;

  const handleRetry = () => {
    void refetchProjects();
    void queryClient.invalidateQueries({ queryKey: resourceKeys.clients });
    void queryClient.invalidateQueries({ queryKey: resourceKeys.professionals });
    void queryClient.invalidateQueries({ queryKey: resourceKeys.equipments });
    void queryClient.invalidateQueries({ queryKey: resourceKeys.templates });
  };

  if (isLoading) {
    return <LoadingSpinner label="Carregando recursos..." />;
  }

  if (isError) {
    return (
      <ErrorPanel
        message="Não conseguimos carregar projetos, clientes ou cadastros. Verifique sua conexão e tente novamente."
        onRetry={handleRetry}
      />
    );
  }

  const { openModal } = useModal();
  const navigate = useNavigate();
  
  // Navigation & UI States
  const [activeTab, setActiveTab] = useState<'clientes' | 'orcamentos' | 'profissionais' | 'equipamentos' | 'templates' | 'ordens'>('clientes');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // OS Modal & Print States
  const [selectedOSProject, setSelectedOSProject] = useState<Project | null>(null);
  const [selectedOSVersion, setSelectedOSVersion] = useState<ProjectVersion | null>(null);
  const [isLoadingOS, setIsLoadingOS] = useState<string | null>(null);

  // Inline editing state for professionals
  const [editingProf, setEditingProf] = useState<string | null>(null);
  const [editProfData, setEditProfData] = useState<Partial<Professional>>({});
  const [newProfData, setNewProfData] = useState<Partial<Professional>>({});

  // Inline editing state for equipments
  const [editingEquip, setEditingEquip] = useState<string | null>(null);
  const [editEquipData, setEditEquipData] = useState<Partial<Equipment>>({});
  const [newEquipData, setNewEquipData] = useState<Partial<Equipment>>({});

  // Clientes Cadastro Express modal state
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientContactName, setNewClientContactName] = useState('');
  const [newClientContactInput, setNewClientContactInput] = useState('');
  const [newClientTempContacts, setNewClientTempContacts] = useState<{ type: string; value: string }[]>([]);

  // Reset search when changing tabs
  useEffect(() => {
    setSearchQuery('');
  }, [activeTab]);

  // Handlers for Projects/Orçamentos
  const handleCreateNewProject = () => {
    setShowCreateModal(true);
  };

  const createBlankProject = async () => {
    setShowCreateModal(false);
    const newProject = await createProjectMutation.mutateAsync({
      title: 'Novo Projeto',
      client: 'Cliente Não Informado',
      status: 'Pendente',
      defaultTax: 10,
      defaultMargin: 15,
      groups: []
    });
    navigate(`/orcamentos/${newProject.id}`);
  };

  const createFromTemplate = async (selected: Template) => {
    setShowCreateModal(false);
    const newProject = await createProjectMutation.mutateAsync({
      title: 'Novo Projeto (Template: ' + selected.name + ')',
      client: 'Cliente Não Informado',
      status: 'Pendente',
      defaultTax: selected.data.defaultTax,
      defaultMargin: selected.data.defaultMargin,
      groups: selected.data.groups.map(g => ({
        ...g,
        id: uuidv4(),
        items: g.items.map(i => ({ ...i, id: uuidv4() }))
      }))
    });
    navigate(`/orcamentos/${newProject.id}`);
  };

  const handleDeleteProject = (id: string) => {
    openModal({
      title: 'Excluir Projeto',
      message: 'Tem certeza que deseja arquivar ou excluir este projeto? Esta ação não poderá ser desfeita.',
      onConfirm: () => {
        deleteProjectMutation.mutate(id);
      }
    });
  };

  // Handlers for Professionals
  const handleDeleteProf = (id: string) => {
    openModal({
      title: 'Excluir Profissional',
      message: 'Tem certeza que deseja excluir? Esta ação não afetará os orçamentos já criados.',
      onConfirm: () => {
        deleteProfessionalMutation.mutate(id);
      }
    });
  };

  const handleSaveProf = async (id: string) => {
    if (id === 'new') {
      if (newProfData.name) {
        await addProfessionalMutation.mutateAsync({
          name: newProfData.name || '',
          role: newProfData.role || '',
          pix: newProfData.pix || '',
          dailyRate: newProfData.dailyRate || 0
        });
        setNewProfData({});
      }
    } else {
      await updateProfessionalMutation.mutateAsync({ id, updates: editProfData });
      setEditingProf(null);
    }
  };

  // Handlers for Equipment
  const handleDeleteEquip = (id: string) => {
    openModal({
      title: 'Excluir Equipamento',
      message: 'Tem certeza que deseja excluir? Esta ação não afetará os orçamentos já criados.',
      onConfirm: () => {
        deleteEquipmentMutation.mutate(id);
      }
    });
  };

  const handleSaveEquip = async (id: string) => {
    if (id === 'new') {
      if (newEquipData.name) {
        await addEquipmentMutation.mutateAsync({
          name: newEquipData.name || '',
          category: newEquipData.category || '',
          rentalValue: newEquipData.rentalValue || 0
        });
        setNewEquipData({});
      }
    } else {
      await updateEquipmentMutation.mutateAsync({ id, updates: editEquipData });
      setEditingEquip(null);
    }
  };

  // Handlers for Clientes Cadastro Express
  const handleOpenClientModal = () => {
    setNewClientName('');
    setNewClientContactName('');
    setNewClientContactInput('');
    setNewClientTempContacts([]);
    setIsClientModalOpen(true);
  };

  const detectContactType = (val: string): 'email' | 'whatsapp' | 'instagram' | 'linkedin' | 'website' => {
    const value = val.trim().toLowerCase();
    
    if (value.includes('@') && value.includes('.com')) {
      return 'email';
    }
    
    const cleanPhone = value.replace(/[\s\-\+\(\)]/g, '');
    if (/^\d{8,15}$/.test(cleanPhone)) {
      return 'whatsapp';
    }
    
    if (value.includes('instagram.com') || val.trim().startsWith('@')) {
      return 'instagram';
    }
    
    if (value.includes('linkedin.com')) {
      return 'linkedin';
    }
    
    return 'website';
  };

  const handleAddContact = () => {
    if (!newClientContactInput.trim()) return;
    const value = newClientContactInput.trim();
    const type = detectContactType(value);
    
    if (!newClientTempContacts.some(c => c.value === value)) {
      setNewClientTempContacts(prev => [...prev, { type, value }]);
    }
    setNewClientContactInput('');
  };

  const handleRemoveContact = (indexToRemove: number) => {
    setNewClientTempContacts(prev => prev.filter((_, i) => i !== indexToRemove));
  };

  const handleSaveClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName.trim()) return;

    await addClientMutation.mutateAsync({
      name: newClientName.trim(),
      contactName: newClientContactName.trim() || null,
      contactRole: null,
      leadSource: null,
      contacts: newClientTempContacts,
      decisores: [],
    });

    setIsClientModalOpen(false);
  };

  const handleDeleteClient = (id: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    openModal({
      title: 'Excluir Cliente',
      message: `Tem certeza que deseja excluir o cliente "${name}"? Esta ação não afetará os orçamentos já criados.`,
      onConfirm: () => {
        deleteClientMutation.mutate(id);
      }
    });
  };

  const getContactIcon = (type: string) => {
    switch (type) {
      case 'email': return <Mail size={16} className="text-zinc-500" />;
      case 'whatsapp': return <MessageCircle size={16} className="text-emerald-500" />;
      case 'instagram': return <Instagram size={16} className="text-pink-500" />;
      case 'linkedin': return <Linkedin size={16} className="text-blue-500" />;
      default: return <Globe size={16} className="text-teal-500" />;
    }
  };

  const getContactLink = (type: string, value: string) => {
    if (type === 'email') return `mailto:${value}`;
    if (type === 'whatsapp') {
      const clean = value.replace(/\D/g, '');
      return `https://wa.me/${clean}`;
    }
    if (type === 'instagram') {
      if (value.startsWith('@')) {
        return `https://instagram.com/${value.substring(1)}`;
      }
      return value.startsWith('http') ? value : `https://${value}`;
    }
    if (type === 'linkedin' || type === 'website') {
      return value.startsWith('http') ? value : `https://${value}`;
    }
    return value;
  };

  // Filtering Lists
  const filteredClientes = useMemo(() => {
    return clientes.filter(c =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.contactName && c.contactName.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [clientes, searchQuery]);

  const filteredProjects = useMemo(() => {
    return projects.filter(p => 
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      p.client.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [projects, searchQuery]);

  const filteredProfessionals = useMemo(() => {
    return professionals.filter(p => 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      p.role.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [professionals, searchQuery]);

  const filteredEquipments = useMemo(() => {
    return equipments.filter(e => 
      e.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      e.category.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [equipments, searchQuery]);

  const filteredTemplates = useMemo(() => {
    return templates.filter(t => 
      t.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [templates, searchQuery]);

  const savedOSList = useMemo(() => projects.flatMap(p => 
    p.versions.filter(v => v.propostaData && Object.keys(v.propostaData).length > 0).map(v => ({ project: p, version: v }))
  ), [projects]);
  
  const filteredOSList = useMemo(() => {
    return savedOSList.filter(os => 
      os.project.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      os.project.client.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [savedOSList, searchQuery]);

  // Tabs layout data
  const tabs = [
    { id: 'clientes', label: 'Clientes', icon: Users },
    { id: 'orcamentos', label: 'Orçamentos', icon: FileSpreadsheet },
    { id: 'profissionais', label: 'Profissionais', icon: Users },
    { id: 'equipamentos', label: 'Equipamentos', icon: Camera },
    { id: 'templates', label: 'Templates', icon: FileStack },
    { id: 'ordens', label: 'Ordens de Serviço', icon: FileText },
  ] as const;

  const getSearchPlaceholder = () => {
    switch (activeTab) {
      case 'clientes': return 'Buscar empresa ou contato...';
      case 'orcamentos': return 'Buscar orçamento ou cliente...';
      case 'profissionais': return 'Buscar profissional ou função...';
      case 'equipamentos': return 'Buscar equipamento ou categoria...';
      case 'templates': return 'Buscar template...';
      case 'ordens': return 'Buscar projeto ou cliente da O.S...';
      default: return 'Buscar...';
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#F5F5F7] dark:bg-[#000000] overflow-hidden">
      
      {/* ── CABEÇALHO (shrink-0) ───────────────────────────────────────── */}
      <div className="shrink-0 bg-white dark:bg-[#1C1C1E] border-b border-zinc-200 dark:border-zinc-800 px-8 py-8 z-10 shadow-sm">
        <div className="max-w-[1400px] mx-auto">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
            <div>
              <h1 className="text-3xl font-bold tracking-tight mb-1 text-gray-900 dark:text-white">Banco de Recursos</h1>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">MDM Central - Gestão unificada de clientes, orçamentos, freelancers, equipamentos, templates e ordens de serviço.</p>
            </div>
            
            <div className="flex items-center gap-4 self-end md:self-auto">
              <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-orange-500 transition-colors w-4 h-4" />
                <input 
                  type="text" 
                  placeholder={getSearchPlaceholder()} 
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full md:w-80 bg-zinc-100 dark:bg-zinc-800/50 border border-transparent focus:border-orange-500/50 focus:bg-white dark:focus:bg-zinc-800 rounded-xl pl-10 pr-4 py-2.5 outline-none transition-all text-sm"
                />
              </div>

              {activeTab === 'clientes' && (
                <button 
                  onClick={handleOpenClientModal}
                  className="flex items-center gap-2 bg-[#AE0000] hover:bg-[#AE0000] text-white px-5 py-3 rounded-xl font-bold transition-all shadow-lg shadow-orange-500/20 active:scale-95 whitespace-nowrap animate-fadeIn shrink-0"
                >
                  <Plus size={20} strokeWidth={3} />
                  <span>Novo Cliente</span>
                </button>
              )}

              {activeTab === 'orcamentos' && (
                <>
                  <CreateProjectModal 
                    isOpen={showCreateModal} 
                    onClose={() => setShowCreateModal(false)}
                    templates={templates}
                    onCreateBlank={createBlankProject}
                    onCreateFromTemplate={createFromTemplate}
                  />
                  <button 
                    onClick={handleCreateNewProject}
                    className="flex items-center gap-2 bg-[#AE0000] hover:bg-[#AE0000] text-white px-5 py-3 rounded-xl font-bold transition-all shadow-lg shadow-orange-500/20 active:scale-95 whitespace-nowrap animate-fadeIn shrink-0"
                  >
                    <Plus size={20} strokeWidth={3} />
                    <span>Novo Projeto</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-2 p-1 bg-zinc-100 dark:bg-zinc-800/50 rounded-xl w-fit overflow-x-auto scrollbar-none max-w-full">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  "flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all duration-200 whitespace-nowrap",
                  activeTab === tab.id 
                    ? "bg-white dark:bg-zinc-700 text-[#AE0000] shadow-md" 
                    : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300"
                )}
              >
                <tab.icon size={16} strokeWidth={2.5} />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── ÁREA DE CONTEÚDO SCROLLÁVEL (flex-1) ───────────────────────── */}
      <div className="flex-1 overflow-y-auto px-8 py-8 pb-32">
        <div className="max-w-[1400px] mx-auto">
          
          {/* TAB 1: CLIENTES */}
          {activeTab === 'clientes' && (
            <div className="bg-white dark:bg-[#1C1C1E] border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden shadow-sm animate-fadeIn">
              <div className="w-full overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[800px]">
                  <thead>
                    <tr className="bg-zinc-50 dark:bg-zinc-900/50 text-zinc-500 dark:text-zinc-400 text-[11px] font-black uppercase tracking-wider border-b border-gray-200 dark:border-gray-800">
                      <th className="px-6 py-4">Empresa / Razão Social</th>
                      <th className="px-6 py-4">Contato Principal</th>
                      <th className="px-6 py-4">Meios de Contato</th>
                      <th className="px-6 py-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {filteredClientes.map((c) => (
                      <tr 
                        key={c.id} 
                        onClick={() => navigate(`/clientes/${c.id}`)}
                        className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30 transition-colors cursor-pointer group"
                      >
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-orange-50 dark:bg-orange-950/20 flex items-center justify-center text-orange-500 group-hover:bg-orange-500 group-hover:text-white transition-all shrink-0">
                              <Users size={20} />
                            </div>
                            <div className="flex flex-col">
                              <span className="font-bold text-gray-900 dark:text-white group-hover:text-[#AE0000] transition-colors">{c.name}</span>
                              {c.document && <span className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500 mt-0.5">{c.document}</span>}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          {c.contactName ? (
                            <div className="flex flex-col">
                              <span className="font-semibold text-zinc-800 dark:text-zinc-200 text-sm">{c.contactName}</span>
                              {c.contactRole && <span className="text-xs text-zinc-400 mt-0.5">{c.contactRole}</span>}
                            </div>
                          ) : (
                            <span className="text-zinc-400 dark:text-zinc-600 text-xs italic">Não informado</span>
                          )}
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex flex-wrap gap-1.5" onClick={e => e.stopPropagation()}>
                            {c.contacts && c.contacts.length > 0 ? (
                              c.contacts.map((contact, idx) => (
                                <a
                                  key={idx}
                                  href={getContactLink(contact.type, contact.value)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-zinc-800/40 text-gray-600 dark:text-zinc-300 hover:border-orange-500/50 hover:bg-orange-50/20 dark:hover:bg-orange-950/10 transition-all shadow-sm"
                                  title={contact.value}
                                >
                                  {getContactIcon(contact.type)}
                                  <span className="max-w-[120px] truncate text-[11px]">{contact.value}</span>
                                </a>
                              ))
                            ) : (
                              <span className="text-zinc-400 dark:text-zinc-600 text-xs italic">Nenhum canal salvo</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-5 text-right">
                          <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0" onClick={e => e.stopPropagation()}>
                            <button 
                              onClick={() => navigate(`/clientes/${c.id}`)}
                              className="p-2 text-zinc-600 hover:text-[#AE0000] hover:bg-orange-50 dark:text-zinc-400 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                              title="Acessar Perfil"
                            >
                              <ArrowRight size={16} />
                            </button>
                            <button 
                              onClick={(e) => handleDeleteClient(c.id, c.name, e)}
                              className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors"
                              title="Excluir"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredClientes.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-6 py-20 text-center">
                          <div className="flex flex-col items-center gap-2">
                            <span className="text-4xl grayscale opacity-50 mb-2">👥</span>
                            <p className="text-zinc-500 font-medium">Nenhum cliente cadastrado.</p>
                            {searchQuery && (
                              <button onClick={() => setSearchQuery('')} className="text-[#AE0000] font-bold text-sm hover:underline">Limpar busca</button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: ORÇAMENTOS */}
          {activeTab === 'orcamentos' && (
            <div className="bg-white dark:bg-[#1C1C1E] border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden shadow-sm animate-fadeIn">
              <div className="w-full overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[800px]">
                  <thead>
                    <tr className="bg-zinc-50 dark:bg-zinc-900/50 text-zinc-500 dark:text-zinc-400 text-[11px] font-black uppercase tracking-wider border-b border-gray-200 dark:border-gray-800">
                      <th className="px-6 py-4">Projeto / Versão</th>
                      <th className="px-6 py-4">Cliente</th>
                      <th className="px-6 py-4">Data</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {filteredProjects.map((p) => {
                      const latestVersion = p.versions[p.versions.length - 1] || { name: 'V1', date: new Date().toISOString() };
                      return (
                        <tr 
                          key={p.id} 
                          className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30 transition-colors cursor-pointer group"
                          onClick={() => navigate(`/orcamentos/${p.id}`)}
                        >
                          <td className="px-6 py-5">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-orange-50 dark:bg-orange-950/20 flex items-center justify-center text-orange-500 group-hover:bg-orange-500 group-hover:text-white transition-all">
                                <FileText size={20} />
                              </div>
                              <div className="flex flex-col">
                                <span className="font-bold text-gray-900 dark:text-white group-hover:text-[#AE0000] transition-colors">{p.title}</span>
                                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-tighter mt-0.5">{latestVersion.name}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-5 text-gray-500 dark:text-gray-400 font-medium">{p.client}</td>
                          <td className="px-6 py-5 text-gray-400 text-sm">{new Date(latestVersion.date).toLocaleDateString('pt-BR')}</td>
                          <td className="px-6 py-5">
                            <span className={cn(
                              "px-2.5 py-1 text-[10px] font-black uppercase tracking-widest rounded-md border",
                              p.status === 'Pendente' && "bg-orange-50 text-orange-600 border-orange-200 dark:bg-orange-950/20 dark:text-orange-400 dark:border-orange-900/30",
                              p.status === 'Aprovado' && "bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900/30",
                              p.status === 'Concluído' && "bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30"
                            )}>
                              {p.status}
                            </span>
                          </td>
                          <td className="px-6 py-5 text-right">
                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0" onClick={e => e.stopPropagation()}>
                              <button onClick={async () => {
                                await addVersionMutation.mutateAsync({ projectId: p.id });
                                navigate(`/orcamentos/${p.id}`);
                              }} className="p-2 text-zinc-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/20 rounded-lg transition-colors" title="Duplicar Versão"><Copy size={16} /></button>
                              <button onClick={() => handleDeleteProject(p.id)} className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors" title="Excluir"><Trash2 size={16} /></button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {filteredProjects.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-6 py-20 text-center">
                          <div className="flex flex-col items-center gap-2">
                            <span className="text-4xl grayscale opacity-50 mb-2">📂</span>
                            <p className="text-zinc-500 font-medium">Nenhum orçamento encontrado.</p>
                            {searchQuery && (
                              <button onClick={() => setSearchQuery('')} className="text-[#AE0000] font-bold text-sm hover:underline">Limpar busca</button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: PROFISSIONAIS */}
          {activeTab === 'profissionais' && (
            <div className="bg-white dark:bg-[#1C1C1E] border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm animate-fadeIn">
              <div className="w-full overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[800px]">
                  <thead>
                    <tr className="bg-zinc-50 dark:bg-zinc-900/50 text-zinc-500 dark:text-zinc-400 text-[11px] font-black uppercase tracking-wider border-b border-zinc-200 dark:border-zinc-800">
                      <th className="px-6 py-4">Nome / Razão Social</th>
                      <th className="px-6 py-4">Função</th>
                      <th className="px-6 py-4">Chave PIX</th>
                      <th className="px-6 py-4 w-40 text-right">Diária (R$)</th>
                      <th className="px-6 py-4 w-24 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    <tr className="bg-orange-50/30 dark:bg-orange-950/5">
                      <td className="px-4 py-4">
                        <input type="text" placeholder="Adicionar novo profissional..." value={newProfData.name || ''} onChange={e => setNewProfData({...newProfData, name: e.target.value})} className="w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 outline-none focus:border-orange-500 text-sm font-bold" />
                      </td>
                      <td className="px-4 py-4">
                        <input type="text" placeholder="Função" value={newProfData.role || ''} onChange={e => setNewProfData({...newProfData, role: e.target.value})} className="w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 outline-none focus:border-orange-500 text-sm" />
                      </td>
                      <td className="px-4 py-4">
                        <input type="text" placeholder="Chave PIX" value={newProfData.pix || ''} onChange={e => setNewProfData({...newProfData, pix: e.target.value})} className="w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 outline-none focus:border-orange-500 text-sm font-mono" />
                      </td>
                      <td className="px-4 py-4">
                        <input type="number" placeholder="0.00" value={newProfData.dailyRate || ''} onChange={e => setNewProfData({...newProfData, dailyRate: Number(e.target.value)})} className="w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 outline-none focus:border-orange-500 text-right font-mono font-bold" />
                      </td>
                      <td className="px-4 py-4 text-right">
                        <button onClick={() => handleSaveProf('new')} className="p-2.5 bg-[#AE0000] text-white hover:bg-[#AE0000] transition-all rounded-xl shadow-lg shadow-orange-500/20 active:scale-95"><Plus size={18} strokeWidth={3} /></button>
                      </td>
                    </tr>
                    
                    {filteredProfessionals.map((p) => (
                      <tr key={p.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30 transition-colors group">
                        {editingProf === p.id ? (
                          <>
                            <td className="px-4 py-4"><input type="text" value={editProfData.name} onChange={e => setEditProfData({...editProfData, name: e.target.value})} className="w-full bg-white dark:bg-zinc-800 border border-orange-500 rounded-lg px-3 py-2 outline-none font-bold" /></td>
                            <td className="px-4 py-4"><input type="text" value={editProfData.role} onChange={e => setEditProfData({...editProfData, role: e.target.value})} className="w-full bg-white dark:bg-zinc-800 border border-orange-500 rounded-lg px-3 py-2 outline-none" /></td>
                            <td className="px-4 py-4"><input type="text" value={editProfData.pix} onChange={e => setEditProfData({...editProfData, pix: e.target.value})} className="w-full bg-white dark:bg-zinc-800 border border-orange-500 rounded-lg px-3 py-2 outline-none font-mono" /></td>
                            <td className="px-4 py-4"><input type="number" value={editProfData.dailyRate} onChange={e => setEditProfData({...editProfData, dailyRate: Number(e.target.value)})} className="w-full bg-white dark:bg-zinc-800 border border-orange-500 rounded-lg px-3 py-2 outline-none text-right font-mono font-bold" /></td>
                            <td className="px-4 py-4 text-right">
                              <div className="flex justify-end gap-2">
                                <button onClick={() => handleSaveProf(p.id)} className="p-2 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-lg transition-all"><Check size={18} strokeWidth={3} /></button>
                                <button onClick={() => setEditingProf(null)} className="p-2 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-all"><X size={18} /></button>
                              </div>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="px-6 py-5 font-bold text-gray-900 dark:text-white">{p.name}</td>
                            <td className="px-6 py-5 text-zinc-500 dark:text-zinc-400 font-medium">{p.role}</td>
                            <td className="px-6 py-5 text-zinc-400 font-mono text-xs">{p.pix || '-'}</td>
                            <td className="px-6 py-5 text-right font-mono font-bold text-gray-900 dark:text-white tabular-nums">{formatCurrency(p.dailyRate)}</td>
                            <td className="px-6 py-5 text-right">
                              <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                                <button onClick={() => { setEditingProf(p.id); setEditProfData(p); }} className="p-2 text-zinc-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/20 rounded-lg transition-colors"><Edit2 size={16} /></button>
                                <button onClick={() => handleDeleteProf(p.id)} className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors"><Trash2 size={16} /></button>
                              </div>
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                    {filteredProfessionals.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-6 py-10 text-center text-zinc-500">
                          Nenhum profissional encontrado.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: EQUIPAMENTOS */}
          {activeTab === 'equipamentos' && (
            <div className="bg-white dark:bg-[#1C1C1E] border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm animate-fadeIn">
              <div className="w-full overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[800px]">
                  <thead>
                    <tr className="bg-zinc-50 dark:bg-zinc-900/50 text-zinc-500 dark:text-zinc-400 text-[11px] font-black uppercase tracking-wider border-b border-zinc-200 dark:border-zinc-800">
                      <th className="px-6 py-4">Equipamento / Recurso</th>
                      <th className="px-6 py-4">Categoria</th>
                      <th className="px-6 py-4 w-40 text-right">Locação (R$)</th>
                      <th className="px-6 py-4 w-24 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    <tr className="bg-orange-50/30 dark:bg-orange-950/5">
                      <td className="px-4 py-4">
                        <input type="text" placeholder="Adicionar novo equipamento..." value={newEquipData.name || ''} onChange={e => setNewEquipData({...newEquipData, name: e.target.value})} className="w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 outline-none focus:border-orange-500 text-sm font-bold" />
                      </td>
                      <td className="px-4 py-4">
                        <input type="text" placeholder="Categoria (ex: Luz, Câmera)" value={newEquipData.category || ''} onChange={e => setNewEquipData({...newEquipData, category: e.target.value})} className="w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 outline-none focus:border-orange-500 text-sm" />
                      </td>
                      <td className="px-4 py-4">
                        <input type="number" placeholder="0.00" value={newEquipData.rentalValue || ''} onChange={e => setNewEquipData({...newEquipData, rentalValue: Number(e.target.value)})} className="w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 outline-none focus:border-orange-500 text-right font-mono font-bold" />
                      </td>
                      <td className="px-4 py-4 text-right">
                        <button onClick={() => handleSaveEquip('new')} className="p-2.5 bg-[#AE0000] text-white hover:bg-[#AE0000] transition-all rounded-xl shadow-lg shadow-orange-500/20 active:scale-95"><Plus size={18} strokeWidth={3} /></button>
                      </td>
                    </tr>
                    
                    {filteredEquipments.map((eq) => (
                      <tr key={eq.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30 transition-colors group">
                        {editingEquip === eq.id ? (
                          <>
                            <td className="px-4 py-4"><input type="text" value={editEquipData.name} onChange={e => setEditEquipData({...editEquipData, name: e.target.value})} className="w-full bg-white dark:bg-zinc-800 border border-orange-500 rounded-lg px-3 py-2 outline-none font-bold" /></td>
                            <td className="px-4 py-4"><input type="text" value={editEquipData.category} onChange={e => setEditEquipData({...editEquipData, category: e.target.value})} className="w-full bg-white dark:bg-zinc-800 border border-orange-500 rounded-lg px-3 py-2 outline-none" /></td>
                            <td className="px-4 py-4"><input type="number" value={editEquipData.rentalValue} onChange={e => setEditEquipData({...editEquipData, rentalValue: Number(e.target.value)})} className="w-full bg-white dark:bg-zinc-800 border border-orange-500 rounded-lg px-3 py-2 outline-none text-right font-mono font-bold" /></td>
                            <td className="px-4 py-4 text-right">
                              <div className="flex justify-end gap-2">
                                <button onClick={() => handleSaveEquip(eq.id)} className="p-2 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-lg transition-all"><Check size={18} strokeWidth={3} /></button>
                                <button onClick={() => setEditingEquip(null)} className="p-2 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-all"><X size={18} /></button>
                              </div>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="px-6 py-5 font-bold text-gray-900 dark:text-white">{eq.name}</td>
                            <td className="px-6 py-5 text-zinc-500 dark:text-zinc-400 font-medium">{eq.category}</td>
                            <td className="px-6 py-5 text-right font-mono font-bold text-gray-900 dark:text-white tabular-nums">{formatCurrency(eq.rentalValue)}</td>
                            <td className="px-6 py-5 text-right">
                              <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                                <button onClick={() => { setEditingEquip(eq.id); setEditEquipData(eq); }} className="p-2 text-zinc-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/20 rounded-lg transition-colors"><Edit2 size={16} /></button>
                                <button onClick={() => handleDeleteEquip(eq.id)} className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors"><Trash2 size={16} /></button>
                              </div>
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                    {filteredEquipments.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-6 py-10 text-center text-zinc-500">
                          Nenhum equipamento encontrado.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 5: TEMPLATES */}
          {activeTab === 'templates' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="bg-white dark:bg-[#1C1C1E] border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
                <div className="w-full overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[600px]">
                    <thead>
                      <tr className="bg-zinc-50 dark:bg-zinc-900/50 text-zinc-500 dark:text-zinc-400 text-[11px] font-black uppercase tracking-wider border-b border-zinc-200 dark:border-zinc-800">
                        <th className="px-6 py-4">Nome do Template</th>
                        <th className="px-6 py-4 w-24 text-right">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                      {filteredTemplates.map((t) => (
                        <tr key={t.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30 transition-colors group">
                          <td className="px-6 py-5 font-bold text-gray-900 dark:text-white">{t.name}</td>
                          <td className="px-6 py-5 text-right">
                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transform translate-x-2 group-hover:translate-x-0 transition-all">
                              <button 
                                onClick={async () => {
                                  setEditingTemplateId(t.id);
                                  const newProj = await createProjectMutation.mutateAsync({
                                    title: t.name,
                                    client: 'Edição de Template',
                                    status: 'Pendente',
                                    defaultTax: t.data.defaultTax,
                                    defaultMargin: t.data.defaultMargin,
                                    groups: []
                                  });
                                  navigate('/orcamentos/' + newProj.id);
                                }} 
                                className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/20 rounded-lg transition-colors"
                                title="Visualizar/Editar"
                              >
                                <Eye size={16} />
                              </button>
                              <button onClick={() => deleteTemplateMutation.mutate(t.id)} className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors"><Trash2 size={16} /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {filteredTemplates.length === 0 && (
                        <tr>
                          <td colSpan={2} className="px-6 py-20 text-center">
                            <div className="flex flex-col items-center gap-2">
                              <span className="text-4xl grayscale opacity-50 mb-2">📂</span>
                              <p className="text-zinc-500 font-medium">Nenhum template encontrado.</p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: ORDENS DE SERVIÇO */}
          {activeTab === 'ordens' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="bg-white dark:bg-[#1C1C1E] border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
                <div className="w-full overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[800px]">
                    <thead>
                      <tr className="bg-zinc-50 dark:bg-zinc-900/50 text-zinc-500 dark:text-zinc-400 text-[11px] font-black uppercase tracking-wider border-b border-zinc-200 dark:border-zinc-800">
                        <th className="px-6 py-4">O.S. Nº / Projeto</th>
                        <th className="px-6 py-4">Cliente</th>
                        <th className="px-6 py-4">Data da Versão</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4 w-24 text-right">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                      {filteredOSList.map((os) => (
                        <tr key={os.version.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30 transition-colors group">
                          <td className="px-6 py-5">
                            <div className="font-bold text-gray-900 dark:text-white">{os.project.title}</div>
                            <div className="text-xs text-zinc-500">O.S. {os.project.projectNumber || '---'} - {os.version.name}</div>
                          </td>
                          <td className="px-6 py-5 font-medium text-zinc-600 dark:text-zinc-300">{os.project.client}</td>
                          <td className="px-6 py-5 text-zinc-500">{new Date(os.version.date).toLocaleDateString('pt-BR')}</td>
                          <td className="px-6 py-5">
                            <span className={cn(
                              "px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full",
                              os.project.status === 'Concluído' ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" :
                              os.project.status === 'Aprovado' ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" :
                              "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                            )}>
                              {os.project.status}
                            </span>
                          </td>
                          <td className="px-6 py-5 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button 
                                onClick={async () => {
                                  setIsLoadingOS(os.version.id);
                                  try {
                                    const token = await getToken();
                                    if (!token) throw new Error('Não autenticado');
                                    const groups = await queryClient.fetchQuery({
                                      queryKey: projectKeys.version(os.version.id),
                                      queryFn: () => loadVersionData(os.version.id, token),
                                    });
                                    setSelectedOSProject(os.project);
                                    setSelectedOSVersion({ ...os.version, groups });
                                  } finally {
                                    setIsLoadingOS(null);
                                  }
                                }} 
                                disabled={isLoadingOS === os.version.id}
                                className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/20 rounded-lg transition-colors shadow-sm bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 disabled:opacity-50 flex items-center justify-center"
                                title="Visualizar/Imprimir O.S."
                              >
                                {isLoadingOS === os.version.id ? (
                                  <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                ) : (
                                  <Eye size={16} />
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {filteredOSList.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-6 py-20 text-center">
                            <div className="flex flex-col items-center gap-2">
                              <span className="text-4xl grayscale opacity-50 mb-2">📄</span>
                              <p className="text-zinc-500 font-medium">Nenhuma Ordem de Serviço salva encontrada.</p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── MODAL CADASTRO EXPRESS ──────────────────────────────────────── */}
      {isClientModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white dark:bg-[#1C1C1E] border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl p-6 text-gray-900 dark:text-gray-100 overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Header */}
            <div className="flex justify-between items-center mb-6 shrink-0">
              <h3 className="text-xl font-bold tracking-tight">➕ Novo Cadastro Express</h3>
              <button 
                onClick={() => setIsClientModalOpen(false)}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Form Content */}
            <form onSubmit={handleSaveClient} className="space-y-5 flex-1 overflow-y-auto pr-1">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2">Nome da Empresa *</label>
                <input 
                  type="text" 
                  required
                  placeholder="Ex: Arreda Audiovisual Ltda"
                  value={newClientName}
                  onChange={e => setNewClientName(e.target.value)}
                  className="w-full bg-zinc-100 dark:bg-zinc-800/60 border border-transparent focus:border-orange-500/50 focus:bg-white dark:focus:bg-zinc-800 rounded-xl px-4 py-3 outline-none transition-all text-sm font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2">Nome do Contato Principal</label>
                <input 
                  type="text" 
                  placeholder="Ex: João Silva"
                  value={newClientContactName}
                  onChange={e => setNewClientContactName(e.target.value)}
                  className="w-full bg-zinc-100 dark:bg-zinc-800/60 border border-transparent focus:border-orange-500/50 focus:bg-white dark:focus:bg-zinc-800 rounded-xl px-4 py-3 outline-none transition-all text-sm font-medium"
                />
              </div>

              <div className="border-t border-gray-100 dark:border-gray-800 pt-4">
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1">Adicionar Contato ou Link</label>
                <span className="block text-[11px] text-zinc-400 dark:text-zinc-500 mb-3">O sistema detectará automaticamente: Whatsapp, E-mail, Instagram, Linkedin ou Site.</span>
                
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="Cole um link, e-mail, número com DDD ou @username..."
                    value={newClientContactInput}
                    onChange={e => setNewClientContactInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddContact();
                      }
                    }}
                    className="flex-1 bg-zinc-100 dark:bg-zinc-800/60 border border-transparent focus:border-orange-500/50 focus:bg-white dark:focus:bg-zinc-800 rounded-xl px-4 py-3 outline-none transition-all text-sm"
                  />
                  <button
                    type="button"
                    onClick={handleAddContact}
                    className="px-4 bg-zinc-800 hover:bg-zinc-700 dark:bg-zinc-700 dark:hover:bg-zinc-600 text-white rounded-xl font-bold transition-all active:scale-95 text-sm"
                  >
                    Adicionar
                  </button>
                </div>

                {/* Real-time parse indicator */}
                {newClientContactInput.trim() && (
                  <div className="mt-2 flex items-center gap-1.5 text-xs text-orange-600 dark:text-orange-400 font-semibold px-1">
                    <span>Reconhecido como:</span>
                    <span className="capitalize px-2 py-0.5 bg-orange-100 dark:bg-orange-950/40 rounded border border-orange-200/50 dark:border-orange-900/30 flex items-center gap-1">
                      {getContactIcon(detectContactType(newClientContactInput))}
                      {detectContactType(newClientContactInput)}
                    </span>
                  </div>
                )}

                {/* Selected/added contacts list */}
                <div className="mt-4 flex flex-wrap gap-2">
                  {newClientTempContacts.map((c, idx) => (
                    <div 
                      key={idx}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-orange-50/50 dark:bg-orange-950/10 border border-orange-500/20 text-xs font-medium text-zinc-800 dark:text-zinc-200 shadow-sm"
                    >
                      {getContactIcon(c.type)}
                      <span className="truncate max-w-[150px]">{c.value}</span>
                      <button 
                        type="button" 
                        onClick={() => handleRemoveContact(idx)}
                        className="p-0.5 rounded-full hover:bg-orange-100 dark:hover:bg-orange-900/50 text-zinc-400 hover:text-orange-600 transition-colors"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                  {newClientTempContacts.length === 0 && (
                    <p className="text-zinc-400 dark:text-zinc-600 text-xs italic py-2">Nenhum meio de contato adicionado ainda.</p>
                  )}
                </div>
              </div>

              {/* Actions Footer */}
              <div className="border-t border-gray-100 dark:border-gray-800 pt-6 shrink-0 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsClientModalOpen(false)}
                  className="px-5 py-3 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 font-bold transition-all text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!newClientName.trim()}
                  className="bg-[#AE0000] hover:bg-[#AE0000] disabled:bg-zinc-300 dark:disabled:bg-zinc-800 disabled:text-zinc-500 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg shadow-orange-500/20 active:scale-95 text-sm"
                >
                  Salvar Cliente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* OS Details Modal */}
      {selectedOSProject && selectedOSVersion && (
        <PropostaModal 
          project={selectedOSProject}
          activeVersion={selectedOSVersion}
          totalClient={selectedOSVersion.totalProposta || 0}
          clientName={selectedOSProject.client}
          onClose={() => {
            setSelectedOSProject(null);
            setSelectedOSVersion(null);
          }}
        />
      )}
    </div>
  );
};

