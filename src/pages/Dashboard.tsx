import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, ListFilter, LayoutGrid, Copy, Trash2, TrendingUp, Clock, CheckCircle2, Flag } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { useModal } from '../context/ModalContext';
import { Project, Template } from '../types';
import { CreateProjectModal } from '../components/CreateProjectModal';
import { cn, formatCurrency } from '../lib/utils';
import { v4 as uuidv4 } from 'uuid';
import { calculateProjectTotals } from '../lib/calculations';
import { calculateFinancials } from '../lib/project-utils';

export const Dashboard: React.FC = () => {
  const { projects, addProject, addProjectVersion, deleteProject, templates, updateProject, refreshData } = useAppContext();
  const { openModal } = useModal();
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('kanban');
  const [filterStatus, setFilterStatus] = useState<'Todos' | 'Pendente' | 'Aprovado' | 'Concluído'>('Todos');

  useEffect(() => {
    refreshData();
  }, []);

  const filteredProjects = projects.filter(p => filterStatus === 'Todos' || p.status === filterStatus);
  const pending = projects.filter(p => p.status === 'Pendente');
  const inProgress = projects.filter(p => p.status === 'Aprovado');
  const completed = projects.filter(p => p.status === 'Concluído');
  
  const calculateTotalValue = (list: Project[]) => list.reduce((acc, p) => acc + calculateFinancials(p).total, 0);

  const totals = {
    'Todos': calculateTotalValue(projects),
    'Pendente': calculateTotalValue(pending),
    'Aprovado': calculateTotalValue(inProgress),
    'Concluído': calculateTotalValue(completed)
  };

  const [showCreateModal, setShowCreateModal] = useState(false);

  const handleCreateNew = () => {
    setShowCreateModal(true);
  };

  const handleDragStart = (e: React.DragEvent, projectId: string) => {
    e.dataTransfer.setData('projectId', projectId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); 
  };

  const handleDrop = async (e: React.DragEvent, newStatus: string) => {
    e.preventDefault();
    const projectId = e.dataTransfer.getData('projectId');
    if (projectId) {
      await updateProject(projectId, { status: newStatus as any });
    }
  };
  
  const createBlankProject = async () => {
    try {
      const newProject = await addProject({
        title: 'Novo Projeto',
        client: 'Cliente Não Informado',
        status: 'Pendente',
        defaultTax: 10,
        defaultMargin: 15,
        groups: []
      });
      setShowCreateModal(false);
      navigate(`/orcamentos/${newProject.id}`);
    } catch (error) {
      console.error('Failed to create blank project:', error);
    }
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

  const handleDelete = (id: string) => {
    openModal({
      title: 'Excluir Projeto',
      message: 'Tem certeza que deseja arquivar ou excluir este projeto? Esta ação não poderá ser desfeita.',
      onConfirm: () => {
        deleteProject(id);
      }
    });
  };

  const renderProjectCard = (p: Project) => {
    const summary = calculateFinancials(p);
    const latestVersion = p.versions[p.versions.length - 1] || { name: 'V1', date: new Date().toISOString() };
    
    return (
      <div 
        key={p.id} 
        draggable
        onDragStart={(e) => handleDragStart(e, p.id)}
        className="bg-white dark:bg-[#1C1C1E] border border-gray-100 dark:border-gray-800 rounded-2xl p-5 shadow-sm hover:shadow-xl transition-all duration-300 group cursor-grab active:cursor-grabbing relative overflow-hidden flex flex-col gap-3" 
        onClick={() => navigate(`/orcamentos/${p.id}`)}
      >
        <div className="flex justify-between items-start">
          <div className="flex flex-col">
            <h3 className="font-black text-gray-900 dark:text-gray-100 group-hover:text-[#ff6b00] transition-colors line-clamp-1 text-sm">{summary.title}</h3>
            <span className="text-xs font-bold text-zinc-500 mt-0.5 tracking-tight">{summary.client}</span>
          </div>
          <span className={cn(
            "px-2 py-0.5 text-[9px] font-black uppercase tracking-widest rounded-md border shrink-0",
            p.status === 'Pendente' && "bg-orange-50 text-orange-600 border-orange-100 dark:bg-orange-950/20 dark:text-orange-400 dark:border-orange-900/30",
            p.status === 'Aprovado' && "bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900/30",
            p.status === 'Concluído' && "bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30"
          )}>
            {p.status}
          </span>
        </div>

        {summary.dates.length > 0 && (
          <div className="text-[10px] font-bold text-[#ff6b00] bg-[#ff6b00]/10 border border-[#ff6b00]/20 px-2 py-1 rounded-md self-start">
            {summary.dates.length} {summary.dates.length === 1 ? 'diária agendada' : 'diárias agendadas'}
          </div>
        )}

        <div className="flex flex-col gap-1.5 w-full bg-zinc-50 dark:bg-zinc-900/50 p-2.5 rounded-lg border border-zinc-100 dark:border-zinc-800">
          <div className="flex justify-between items-center text-[10px]">
            <span className="font-bold text-zinc-500 uppercase tracking-wider">Impostos ({summary.taxPercent.toFixed(1)}%)</span>
            <span className="font-mono font-medium text-zinc-600 dark:text-zinc-400 tabular-nums">{formatCurrency(summary.tax$)}</span>
          </div>
          <div className="flex justify-between items-center text-[10px]">
            <span className="font-bold text-emerald-600 uppercase tracking-wider">Lucro ({summary.profitPercent.toFixed(1)}%)</span>
            <span className="font-mono font-bold text-emerald-600 tabular-nums">{formatCurrency(summary.profit$)}</span>
          </div>
          <div className="flex justify-between items-center pt-2 border-t border-zinc-200 dark:border-zinc-700 mt-1">
            <span className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">Total</span>
            <span className="text-[#ff6b00] dark:text-[#ff8c00] font-mono font-black text-lg tabular-nums leading-none">{formatCurrency(summary.total)}</span>
          </div>
        </div>

        <div className="flex items-center justify-between mt-2 pt-2 border-t border-zinc-100 dark:border-zinc-800/50">
          <div className="flex flex-col">
            <span className="text-[9px] font-bold text-zinc-400">
              ID: {new Date(p.createdAt).getFullYear()}-{String(p.projectNumber).padStart(3, '0')}
            </span>
          </div>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0" onClick={e => e.stopPropagation()}>
            <button 
              onClick={async () => {
                await addProjectVersion(p.id);
                navigate(`/orcamentos/${p.id}`);
              }}
              className="p-1.5 text-zinc-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/20 rounded-md transition-colors"
              title="Nova Versão"
            >
              <Copy size={14} />
            </button>
            <button 
              onClick={() => handleDelete(p.id)}
              className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-md transition-colors"
              title="Excluir"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-[#F5F5F7] dark:bg-[#000000] overflow-hidden font-sans">
      
      {/* ── CABEÇALHO (shrink-0) ───────────────────────────────────────── */}
      <div className="shrink-0 bg-white dark:bg-[#1C1C1E] border-b border-zinc-200 dark:border-zinc-800 px-8 py-8 z-10 shadow-sm">
        <div className="max-w-[1400px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight mb-1 text-gray-900 dark:text-white">Dashboard</h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Gerenciamento comercial e saúde financeira da operação.</p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex bg-zinc-100 dark:bg-zinc-800/50 p-1 rounded-xl">
              <button 
                className={cn(
                  "p-2.5 rounded-lg transition-all duration-200", 
                  viewMode === 'list' 
                    ? "bg-white dark:bg-zinc-700 shadow-md text-[#ff6b00]" 
                    : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300"
                )}
                onClick={() => setViewMode('list')}
                title="Vista em Lista"
              >
                <ListFilter size={20} />
              </button>
              <button 
                className={cn(
                  "p-2.5 rounded-lg transition-all duration-200", 
                  viewMode === 'kanban' 
                    ? "bg-white dark:bg-zinc-700 shadow-md text-[#ff6b00]" 
                    : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300"
                )}
                onClick={() => setViewMode('kanban')}
                title="Vista Kanban"
              >
                <LayoutGrid size={20} />
              </button>
            </div>

            <CreateProjectModal 
              isOpen={showCreateModal} 
              onClose={() => setShowCreateModal(false)}
              templates={templates}
              onCreateBlank={createBlankProject}
              onCreateFromTemplate={createFromTemplate}
            />
            
            <button 
              onClick={handleCreateNew}
              className="flex items-center gap-2 bg-[#ff6b00] hover:bg-[#ff8c00] text-white px-5 py-3 rounded-xl font-bold transition-all shadow-lg shadow-orange-500/20 active:scale-95"
            >
              <Plus size={20} strokeWidth={3} />
              <span>Novo Orçamento</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── ÁREA DE CONTEÚDO SCROLLÁVEL (flex-1) ───────────────────────── */}
      <div className="flex-1 overflow-y-auto px-8 py-8 pb-32">
        <div className="max-w-[1400px] mx-auto space-y-10">
          
          {/* Quick Cards (KPIs) */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              { label: 'Total Enviado', status: 'Todos', color: 'text-zinc-900 dark:text-white', icon: TrendingUp, iconColor: 'text-zinc-400' },
              { label: 'Em Aberto', status: 'Pendente', color: 'text-orange-600 dark:text-orange-400', icon: Clock, iconColor: 'text-orange-400' },
              { label: 'Aprovados', status: 'Aprovado', color: 'text-blue-600 dark:text-blue-400', icon: CheckCircle2, iconColor: 'text-blue-400' },
              { label: 'Concluídos', status: 'Concluído', color: 'text-emerald-600 dark:text-emerald-400', icon: Flag, iconColor: 'text-emerald-400' }
            ].map(card => (
              <button 
                key={card.status}
                onClick={() => setFilterStatus(card.status as any)}
                className={cn(
                  "relative group p-6 rounded-2xl border transition-all duration-300 text-left overflow-hidden",
                  filterStatus === card.status 
                    ? "border-[#ff6b00] ring-1 ring-[#ff6b00] bg-white dark:bg-[#1C1C1E] shadow-xl translate-y-[-4px]" 
                    : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#1C1C1E] hover:border-zinc-300 dark:hover:border-zinc-700 shadow-sm hover:shadow-md"
                )}
              >
                <div className={cn("absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity", card.iconColor)}>
                  <card.icon size={48} />
                </div>
                <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2">{card.label}</h3>
                <p className={cn("text-3xl font-bold tabular-nums", card.color)}>{formatCurrency(totals[card.status as keyof typeof totals])}</p>
                
                {filterStatus === card.status && (
                  <div className="absolute bottom-0 left-0 h-1 bg-[#ff6b00] w-full" />
                )}
              </button>
            ))}
          </div>

          {/* List/Kanban View */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold flex items-center gap-2">
                {filterStatus === 'Todos' ? 'Todos os Projetos' : `Projetos ${filterStatus}`}
                <span className="text-[10px] font-black bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full text-zinc-500 uppercase tracking-tighter">
                  {filteredProjects.length}
                </span>
              </h2>
            </div>

            {viewMode === 'list' ? (
              <div className="bg-white dark:bg-[#1C1C1E] border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
                <div className="w-full overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[800px]">
                    <thead>
                      <tr className="bg-zinc-50 dark:bg-zinc-900/50 text-zinc-500 dark:text-zinc-400 text-[11px] font-black uppercase tracking-wider border-b border-zinc-200 dark:border-zinc-800">
                        <th className="px-6 py-4">Projeto / Versão</th>
                        <th className="px-6 py-4">Cliente</th>
                        <th className="px-6 py-4">Data</th>
                        <th className="px-6 py-4">Valor Total</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4 text-right">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {filteredProjects.map((p) => {
                      const latestVersion = p.versions[p.versions.length - 1] || { name: 'V1', date: new Date().toISOString() };
                      const summary = calculateFinancials(p);
                      return (
                        <tr 
                          key={p.id} 
                          className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30 transition-colors cursor-pointer group"
                          onClick={() => navigate(`/orcamentos/${p.id}`)}
                        >
                          <td className="px-6 py-5">
                            <div className="flex flex-col">
                              <span className="font-bold text-gray-900 dark:text-white group-hover:text-[#ff6b00] transition-colors">{p.title}</span>
                              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-tighter mt-0.5">{latestVersion.name}</span>
                            </div>
                          </td>
                          <td className="px-6 py-5 text-zinc-500 dark:text-zinc-400 font-medium">{p.client}</td>
                          <td className="px-6 py-5 text-zinc-400 text-sm">{new Date(latestVersion.date).toLocaleDateString('pt-BR')}</td>
                          <td className="px-6 py-5 font-mono font-bold text-gray-900 dark:text-white tabular-nums">{formatCurrency(summary.total)}</td>
                          <td className="px-6 py-5">
                            <span className={cn(
                              "px-2.5 py-1 text-[10px] font-black uppercase tracking-widest rounded-md border",
                              p.status === 'Pendente' && "bg-orange-50 text-orange-600 border-orange-100 dark:bg-orange-950/20 dark:text-orange-400 dark:border-orange-900/30",
                              p.status === 'Aprovado' && "bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900/30",
                              p.status === 'Concluído' && "bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30"
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
                              <button onClick={() => handleDelete(p.id)} className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors" title="Excluir"><Trash2 size={16} /></button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                    {filteredProjects.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-6 py-20 text-center">
                            <div className="flex flex-col items-center gap-2">
                              <span className="text-4xl grayscale opacity-50 mb-2">📂</span>
                              <p className="text-zinc-500 font-medium">Nenhum projeto encontrado nesta categoria.</p>
                              <button onClick={handleCreateNew} className="text-[#ff6b00] font-bold text-sm hover:underline">Criar novo orçamento</button>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
                <div 
                  className="flex-1 bg-zinc-50 dark:bg-zinc-900/50 rounded-2xl p-4 flex flex-col gap-4 border border-zinc-200 dark:border-zinc-800 min-h-[500px]"
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, 'Pendente')}
                >
                  <div className="flex items-center justify-between px-2">
                    <h3 className="font-black text-sm uppercase text-zinc-500 tracking-widest">Pendente</h3>
                    <span className="bg-zinc-200 dark:bg-zinc-800 text-[10px] font-bold px-2 py-0.5 rounded-full">{pending.length}</span>
                  </div>
                  <div className="flex flex-col gap-4">
                    {pending.map(renderProjectCard)}
                  </div>
                </div>
                <div 
                  className="flex-1 bg-zinc-50 dark:bg-zinc-900/50 rounded-2xl p-4 flex flex-col gap-4 border border-zinc-200 dark:border-zinc-800 min-h-[500px]"
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, 'Aprovado')}
                >
                  <div className="flex items-center justify-between px-2">
                    <h3 className="font-black text-sm uppercase text-zinc-500 tracking-widest">Aprovados</h3>
                    <span className="bg-zinc-200 dark:bg-zinc-800 text-[10px] font-bold px-2 py-0.5 rounded-full">{inProgress.length}</span>
                  </div>
                  <div className="flex flex-col gap-4">
                    {inProgress.map(renderProjectCard)}
                  </div>
                </div>
                <div 
                  className="flex-1 bg-zinc-50 dark:bg-zinc-900/50 rounded-2xl p-4 flex flex-col gap-4 border border-zinc-200 dark:border-zinc-800 min-h-[500px]"
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, 'Concluído')}
                >
                  <div className="flex items-center justify-between px-2">
                    <h3 className="font-black text-sm uppercase text-zinc-500 tracking-widest">Concluídos</h3>
                    <span className="bg-zinc-200 dark:bg-zinc-800 text-[10px] font-bold px-2 py-0.5 rounded-full">{completed.length}</span>
                  </div>
                  <div className="flex flex-col gap-4">
                    {completed.map(renderProjectCard)}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
