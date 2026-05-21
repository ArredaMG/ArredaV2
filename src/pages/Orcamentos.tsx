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
  FileSpreadsheet
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { useModal } from '../context/ModalContext';
import { cn, formatCurrency } from '../lib/utils';
import { Template, Professional, Equipment, Project, ProjectVersion } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { CreateProjectModal } from '../components/CreateProjectModal';
import { PropostaModal } from '../components/PropostaModal';

export const Orcamentos: React.FC = () => {
  const { 
    projects, 
    addProject, 
    addProjectVersion, 
    deleteProject, 
    templates,
    professionals,
    equipments,
    addProfessional,
    updateProfessional,
    deleteProfessional,
    addEquipment,
    updateEquipment,
    deleteEquipment,
    deleteTemplate,
    setEditingTemplateId,
    loadVersionData
  } = useAppContext();

  const { openModal } = useModal();
  const navigate = useNavigate();
  
  // Navigation & UI States
  const [activeTab, setActiveTab] = useState<'projetos' | 'profissionais' | 'equipamentos' | 'templates' | 'ordens'>('projetos');
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

  // Reset search when changing tabs
  useEffect(() => {
    setSearchQuery('');
  }, [activeTab]);

  // Handlers for Projects
  const handleCreateNew = () => {
    setShowCreateModal(true);
  };

  const createBlankProject = async () => {
    setShowCreateModal(false);
    const newProject = await addProject({
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
    const newProject = await addProject({
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
        deleteProject(id);
      }
    });
  };

  // Handlers for Professionals
  const handleDeleteProf = (id: string) => {
    openModal({
      title: 'Excluir Profissional',
      message: 'Tem certeza que deseja excluir? Esta ação não afetará os orçamentos já criados.',
      onConfirm: () => {
        deleteProfessional(id);
      }
    });
  };

  const handleSaveProf = async (id: string) => {
    if (id === 'new') {
      if (newProfData.name) {
        await addProfessional({
          name: newProfData.name || '',
          role: newProfData.role || '',
          pix: newProfData.pix || '',
          dailyRate: newProfData.dailyRate || 0
        });
        setNewProfData({});
      }
    } else {
      await updateProfessional(id, editProfData);
      setEditingProf(null);
    }
  };

  // Handlers for Equipment
  const handleDeleteEquip = (id: string) => {
    openModal({
      title: 'Excluir Equipamento',
      message: 'Tem certeza que deseja excluir? Esta ação não afetará os orçamentos já criados.',
      onConfirm: () => {
        deleteEquipment(id);
      }
    });
  };

  const handleSaveEquip = async (id: string) => {
    if (id === 'new') {
      if (newEquipData.name) {
        await addEquipment({
          name: newEquipData.name || '',
          category: newEquipData.category || '',
          rentalValue: newEquipData.rentalValue || 0
        });
        setNewEquipData({});
      }
    } else {
      await updateEquipment(id, editEquipData);
      setEditingEquip(null);
    }
  };

  // Filtering Lists
  const filteredProjects = projects.filter(p => 
    p.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.client.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredProfessionals = professionals.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredEquipments = equipments.filter(e => 
    e.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    e.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredTemplates = templates.filter(t => 
    t.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const savedOSList = useMemo(() => projects.flatMap(p => 
    p.versions.filter(v => v.propostaData && Object.keys(v.propostaData).length > 0).map(v => ({ project: p, version: v }))
  ), [projects]);
  
  const filteredOSList = savedOSList.filter(os => 
    os.project.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    os.project.client.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Tabs layout data
  const tabs = [
    { id: 'projetos', label: 'Projetos', icon: FileSpreadsheet },
    { id: 'profissionais', label: 'Profissionais', icon: Users },
    { id: 'equipamentos', label: 'Equipamentos', icon: Camera },
    { id: 'templates', label: 'Templates', icon: FileStack },
    { id: 'ordens', label: 'Ordens de Serviço', icon: FileText },
  ];

  const getSearchPlaceholder = () => {
    switch (activeTab) {
      case 'projetos': return 'Buscar projeto ou cliente...';
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
              <h1 className="text-3xl font-bold tracking-tight mb-1 text-gray-900 dark:text-white">Orçamentos</h1>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Central unificada de projetos, diárias, equipamentos, templates e ordens de serviço.</p>
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

              {activeTab === 'projetos' && (
                <>
                  <CreateProjectModal 
                    isOpen={showCreateModal} 
                    onClose={() => setShowCreateModal(false)}
                    templates={templates}
                    onCreateBlank={createBlankProject}
                    onCreateFromTemplate={createFromTemplate}
                  />
                  <button 
                    onClick={handleCreateNew}
                    className="flex items-center gap-2 bg-[#AE0000] hover:bg-[#AE0000] text-white px-5 py-3 rounded-xl font-bold transition-all shadow-lg shadow-orange-500/20 active:scale-95 whitespace-nowrap animate-fadeIn"
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
          
          {/* TAB 1: PROJETOS (ORÇAMENTOS) */}
          {activeTab === 'projetos' && (
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
                                await addProjectVersion(p.id);
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

          {/* TAB 2: PROFISSIONAIS */}
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

          {/* TAB 3: EQUIPAMENTOS */}
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

          {/* TAB 4: TEMPLATES */}
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
                                  const newProj = await addProject({
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
                              <button onClick={() => deleteTemplate(t.id)} className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors"><Trash2 size={16} /></button>
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

          {/* TAB 5: ORDENS DE SERVIÇO */}
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
                                  await loadVersionData(os.version.id);
                                  setIsLoadingOS(null);
                                  
                                  // Find the updated project and version
                                  const updatedProject = projects.find(p => p.id === os.project.id);
                                  const updatedVersion = updatedProject?.versions.find(v => v.id === os.version.id);
                                  
                                  if (updatedProject && updatedVersion) {
                                    setSelectedOSProject(updatedProject);
                                    setSelectedOSVersion(updatedVersion);
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

