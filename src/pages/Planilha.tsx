import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useBlocker } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronRight, Plus, Trash2, Home, Printer, Save, ArrowLeft, Link as LinkIcon, Copy, Info, X } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { useModal } from '../context/ModalContext';
import { CostGroup, CostItem, Project, ProjectVersion } from '../types';
import { cn, formatCurrency } from '../lib/utils';
import { v4 as uuidv4 } from 'uuid';
import { getItemMetrics } from '../lib/calculations';

export const Planilha: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { projects, updateProject, updateProjectVersion, addProjectVersion, professionals, equipments, clientes, addTemplate, templates, editingTemplateId, setEditingTemplateId, updateTemplate, deleteProjectVersion } = useAppContext();
  const { openModal } = useModal();
  
  const [project, setProject] = useState<Project | null>(null);
  const [activeVersionId, setActiveVersionId] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [expandedPriceRows, setExpandedPriceRows] = useState<Set<string>>(new Set());
  const [isDirty, setIsDirty] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

    const [isSaving, setIsSaving] = useState(false);
    const saveProject = async () => {
        if (project) {
            setIsSaving(true);
            try {
                await updateProject(project.id, project);
                setIsDirty(false);
                setToastMessage("Alterações salvas com sucesso!");
            } catch (error) {
                console.error("Erro ao salvar:", error);
                setToastMessage("Erro ao salvar projeto.");
            } finally {
                setIsSaving(false);
            }
        }
    };

  useEffect(() => {
    const found = projects.find(p => p.id === id);
    if (found) {
      setProject(found);
      
      let currentV = activeVersionId;
      if (!currentV || !found.versions.some(v => v.id === currentV)) {
        currentV = found.versions[found.versions.length - 1].id;
        setActiveVersionId(currentV);
      }

      const active = found.versions.find(v => v.id === currentV);
      if (active && Object.keys(expandedGroups).length === 0) {
        const initialExpanded: Record<string, boolean> = {};
        active.groups.forEach(g => {
          initialExpanded[g.id] = true;
        });
        setExpandedGroups(initialExpanded);
      }
    } else {
      navigate('/');
    }
  }, [id, projects, navigate]);

  const activeVersion = useMemo(() => {
    if (!project || !activeVersionId) return null;
    return project.versions.find(v => v.id === activeVersionId) || null;
  }, [project, activeVersionId]);

  useEffect(() => {
    if (editingTemplateId && project && activeVersion) {
      const template = templates.find(t => t.id === editingTemplateId);
      if (template) {
        handleVersionUpdate({
          groups: template.data.groups.map(g => ({
            ...g,
            margin: undefined 
          })),
          defaultTax: template.data.defaultTax,
          defaultMargin: activeVersion.defaultMargin 
        });
        handleProjectUpdate({ title: template.name });
        setEditingTemplateId(null);
        alert("Template carregado com sucesso!");
      }
    }
  }, [editingTemplateId, project, activeVersion, templates]);

  const globals = useMemo(() => {
    let totalVenda = 0;
    let totalCost = 0;
    let totalExecuted = 0;

    if (activeVersion) {
      activeVersion.groups.forEach(g => {
        if (g.isActive === false) return; 
        const groupMargin = g.margin !== undefined ? g.margin : activeVersion.defaultMargin;
        const m = groupMargin / 100;
        
        g.items.forEach(i => {
          const baseCost = i.unitCost * i.quantity * (i.days || 1);
          const valorVenda = m < 1 ? baseCost / (1 - m) : baseCost;
          
          totalVenda += valorVenda;
          totalCost += i.inHouse ? 0 : baseCost;
          totalExecuted += i.executedCost || 0;
        });
      });
    }

    const taxRate = (activeVersion?.defaultTax || 0) / 100;
    const totalClient = taxRate < 1 ? totalVenda / (1 - taxRate) : totalVenda;
    const totalTax = totalClient - totalVenda;
    
    const totalProfit = totalVenda - totalCost;
    const lucroReal = (totalVenda - totalTax) - totalExecuted;

    return { totalClient, totalCost, totalProfit, totalTax, totalExecuted, totalVenda, lucroReal };
  }, [activeVersion]);

  if (!project || !activeVersion) return null;

  const handleProjectUpdate = (updates: Partial<Project>) => {
    setProject(prev => prev ? { ...prev, ...updates } : null);
    updateProject(project.id, updates);
    setIsDirty(true);
  };

  const handleVersionUpdate = (updates: Partial<ProjectVersion>) => {
    if (activeVersionId && project) {
      setProject(prev => {
        if (!prev) return null;
        return {
          ...prev,
          versions: prev.versions.map(v => v.id === activeVersionId ? { ...v, ...updates } : v)
        };
      });
      updateProjectVersion(project.id, activeVersionId, updates);
    }
    setIsDirty(true);
  };

  const handleAddGroup = () => {
    const newGroup: CostGroup = { id: uuidv4(), name: 'Nova Categoria', items: [] };
    handleVersionUpdate({ groups: [...activeVersion.groups, newGroup] });
    setExpandedGroups(prev => ({ ...prev, [newGroup.id]: true }));
  };

  const handleDeleteGroup = (groupId: string) => {
    openModal({
      title: 'Excluir Categoria',
      message: 'Tem certeza que deseja excluir esta categoria e todos os seus itens?',
      onConfirm: () => {
        handleVersionUpdate({ groups: activeVersion.groups.filter(g => g.id !== groupId) });
        setIsDirty(true);
      }
    });
  };

  const handleAddItem = (groupId: string) => {
    const newItem: CostItem = {
      id: uuidv4(),
      role: '',
      name: '',
      quantity: 1,
      days: 1,
      unitCost: 0,
      tax: activeVersion.defaultTax,
      inHouse: false
    };
    handleVersionUpdate({
      groups: activeVersion.groups.map(g => g.id === groupId ? { ...g, items: [...g.items, newItem] } : g)
    });
    setIsDirty(true);
  };

  const handleUpdateItem = (groupId: string, itemId: string, updates: Partial<CostItem>) => {
    handleVersionUpdate({
      groups: activeVersion.groups.map(g => {
        if (g.id !== groupId) return g;
        return {
          ...g,
          items: g.items.map(i => {
            if (i.id !== itemId) return i;
            
            if (updates.name !== undefined && updates.name !== i.name) {
              const prof = professionals.find(p => p.name === updates.name);
              const equip = equipments.find(e => e.name === updates.name);
              if (prof) {
                updates.unitCost = prof.dailyRate;
                updates.role = prof.role;
              } else if (equip) {
                updates.unitCost = equip.rentalValue;
                updates.role = equip.category;
              }
            }
            
            return { ...i, ...updates };
          })
        };
      })
    });
    setIsDirty(true);
  };

  const handleDeleteItem = (groupId: string, itemId: string) => {
    openModal({
      title: 'Excluir Item',
      message: 'Confirma a exclusão deste item?',
      onConfirm: () => {
        handleVersionUpdate({
          groups: activeVersion.groups.map(g => g.id === groupId ? { ...g, items: g.items.filter(i => i.id !== itemId) } : g)
        });
        setIsDirty(true);
      }
    });
  };

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  const togglePriceRow = (itemId: string) => {
    setExpandedPriceRows(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  };

  const showFinancialControl = project.status === 'Aprovado' || project.status === 'Concluído';

  return (
    <div className="flex flex-col h-full bg-[#F5F5F7] dark:bg-[#000000] printable-area overflow-hidden">
      
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg font-medium animate-in fade-in slide-in-from-top-4">
          {toastMessage}
        </div>
      )}

      {/* ── CABEÇALHO (shrink-0) ───────────────────────── */}
      <div className="shrink-0 bg-white dark:bg-[#1C1C1E] border-b border-gray-200 dark:border-gray-800 px-6 py-6 z-20 shadow-sm print:relative print:shadow-none print:border-b-2 print:border-gray-900 print:mb-8 text-black print:px-0">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 print:hidden">
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-2xl font-bold tracking-tight">Ficha do Projeto</h1>
          </div>
            <div className="flex gap-2 print:hidden">
            <button 
              onClick={saveProject}
              disabled={isSaving}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg text-white font-bold transition-colors relative",
                isSaving ? "bg-gray-400 cursor-not-allowed" : "bg-[#27ae60] hover:bg-[#219150]"
              )}
            >
              {isDirty && !isSaving && <span className="absolute -top-1 -right-1 block h-3 w-3 rounded-full bg-orange-500 ring-2 ring-white"></span>}
              <Save size={18} className={isSaving ? "animate-spin" : ""} />
              <span>{isSaving ? "SALVANDO..." : "SALVAR"}</span>
            </button>
            <button 
              onClick={() => setIsSaveModalOpen(true)}
              className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg text-gray-600 dark:text-gray-300 font-medium transition-colors"
            >
              <Save size={18} />
              <span className="hidden md:inline">Template</span>
            </button>
            <AnimatePresence>
            {isSaveModalOpen && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm">
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="w-full max-w-sm bg-white dark:bg-[#1C1C1E] border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl p-8"
                >
                  <h3 className="text-xl font-bold mb-4">Salvar como Template</h3>
                  <p className="text-sm text-gray-500 mb-6">Dê um nome para este padrão de orçamento para reutilizá-lo depois.</p>
                  <input
                    type="text"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    placeholder="Nome do Template"
                    className="w-full bg-gray-100 dark:bg-gray-800 border-none rounded-xl p-4 mb-6 focus:ring-2 focus:ring-[#ff6b00] outline-none font-medium"
                    autoFocus
                  />
                  <div className="flex justify-end gap-3">
                    <button onClick={() => { setIsSaveModalOpen(false); setTemplateName(''); }} className="px-4 py-2 text-gray-500 font-medium hover:text-gray-700">Cancelar</button>
                    <button 
                      onClick={() => {
                        if (templateName.trim()) {
                          addTemplate({
                            name: templateName,
                            data: {
                              groups: JSON.parse(JSON.stringify(activeVersion.groups)),
                              defaultTax: activeVersion.defaultTax,
                              defaultMargin: activeVersion.defaultMargin
                            }
                          });
                          setToastMessage(`✅ Template ${templateName} salvo com sucesso!`);
                          setIsSaveModalOpen(false);
                          setTemplateName('');
                        } else {
                          alert("Por favor, digite um nome para o template.");
                        }
                      }}
                      className="bg-[#ff6b00] text-white px-6 py-2 rounded-xl font-bold hover:bg-[#ff8c00] transition-colors shadow-lg shadow-orange-500/20"
                    >
                      Salvar
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
            </AnimatePresence>
            <button 
              onClick={async () => {
                const newProj = await addProjectVersion(project.id, activeVersionId || undefined);
                if (newProj) {
                  setActiveVersionId(newProj.versions[newProj.versions.length - 1].id);
                }
              }} 
              className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg text-gray-600 dark:text-gray-300 font-medium transition-colors"
            >
              <Copy size={18} />
              <span className="hidden md:inline">Nova Versão</span>
            </button>
            <button 
              onClick={() => {
                if (project.versions.length <= 1) {
                  alert("Não é possível deletar a única versão do projeto.");
                  return;
                }
                openModal({
                  title: 'Excluir Versão',
                  message: `Tem certeza que deseja deletar a ${activeVersion?.name} deste orçamento?`,
                  onConfirm: () => {
                    const currentVersionId = activeVersionId;
                    const index = project.versions.findIndex(v => v.id === currentVersionId);
                    const nextVersion = project.versions[index > 0 ? index - 1 : index + 1];
                    setActiveVersionId(nextVersion.id);
                    if (currentVersionId) {
                      deleteProjectVersion(project.id, currentVersionId);
                    }
                  }
                });
              }}
              className="p-2 bg-red-100 dark:bg-red-900/20 text-red-600 hover:bg-red-200 dark:hover:bg-red-900/40 rounded-lg transition-colors"
              title="Excluir Versão"
            >
              <Trash2 size={18} />
            </button>
            <button onClick={() => window.print()} className="flex items-center gap-2 p-2 px-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg text-gray-600 dark:text-gray-300 font-medium transition-colors">
              <Printer size={18} />
              <span className="hidden md:inline">PDF</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 print:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-black uppercase text-zinc-400 mb-1 tracking-widest">Título do Projeto</label>
            <input 
              type="text" 
              value={project.title} 
              onChange={e => handleProjectUpdate({ title: e.target.value })}
              className="w-full bg-transparent border-b border-gray-200 dark:border-gray-700 focus:border-[#ff6b00] dark:focus:border-[#ff8c00] outline-none py-1 transition-colors font-bold text-lg"
            />
          </div>
          <div>
            <label className="block text-xs font-black uppercase text-zinc-400 mb-1 tracking-widest">Cliente</label>
            <input 
              type="text" 
              list="lista-clientes"
              value={project.client} 
              onChange={e => handleProjectUpdate({ client: e.target.value })}
              className="w-full bg-transparent border-b border-gray-200 dark:border-gray-700 focus:border-[#ff6b00] dark:focus:border-[#ff8c00] outline-none py-1 transition-colors font-bold text-lg text-[#ff6b00]"
            />
          </div>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-xs font-black uppercase text-zinc-400 mb-1 tracking-widest">Status</label>
              <select 
                value={project.status} 
                onChange={e => handleProjectUpdate({ status: e.target.value as any })}
                className="w-full bg-transparent border-b border-gray-200 dark:border-gray-700 focus:border-[#ff6b00] outline-none py-1.5 transition-colors font-bold"
              >
                <option value="Pendente">Pendente</option>
                <option value="Aprovado">Aprovado</option>
                <option value="Concluído">Concluído</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-xs font-black uppercase text-zinc-400 mb-1 tracking-widest">Data</label>
              <input 
                type="date" 
                value={activeVersion.date} 
                onChange={e => handleVersionUpdate({ date: e.target.value })}
                className="w-full bg-transparent border-b border-gray-200 dark:border-gray-700 focus:border-[#ff6b00] outline-none py-1 transition-colors font-bold"
              />
            </div>
          </div>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-xs font-black uppercase text-zinc-400 mb-2 tracking-widest">Margem Padrão</label>
              <div className="flex items-center bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 focus-within:border-orange-500 transition-all">
                <input 
                  type="number" 
                  step="0.01"
                  value={activeVersion.defaultMargin.toFixed(2)} 
                  onChange={e => {
                    const val = parseFloat(e.target.value);
                    handleVersionUpdate({ defaultMargin: isNaN(val) ? 0 : val });
                  }}
                  className="flex-1 bg-transparent border-none outline-none font-black text-zinc-800 dark:text-zinc-200"
                />
                <span className="ml-2 text-zinc-400 font-black text-xs">%</span>
              </div>
            </div>
            <div className="flex-1">
              <label className="block text-xs font-black uppercase text-zinc-400 mb-2 tracking-widest">NF Padrão</label>
              <div className="flex items-center bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 focus-within:border-orange-500 transition-all">
                <input 
                  type="number" 
                  step="0.01"
                  value={activeVersion.defaultTax.toFixed(2)} 
                  onChange={e => {
                    const val = parseFloat(e.target.value);
                    handleVersionUpdate({ defaultTax: isNaN(val) ? 0 : val });
                  }}
                  className="flex-1 bg-transparent border-none outline-none font-black text-zinc-800 dark:text-zinc-200"
                />
                <span className="ml-2 text-zinc-400 font-black text-xs">%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Version Selector */}
        <div className="mt-6 flex items-center gap-2 overflow-x-auto pb-1 print:hidden">
          {project.versions.map(v => (
            <button
              key={v.id}
              onClick={() => setActiveVersionId(v.id)}
              className={cn(
                "px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest transition-all border",
                activeVersionId === v.id
                  ? "bg-[#ff6b00] text-white border-[#ff6b00] shadow-md shadow-orange-500/20"
                  : "bg-white dark:bg-zinc-900 text-zinc-500 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300"
              )}
            >
              {v.name}
            </button>
          ))}
          <button
            onClick={async () => {
              const newProj = await addProjectVersion(project.id, activeVersionId || undefined);
              if (newProj) {
                setActiveVersionId(newProj.versions[newProj.versions.length - 1].id);
              }
            }}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-widest bg-zinc-50 dark:bg-zinc-900 border border-dashed border-zinc-300 dark:border-zinc-700 text-[#ff6b00] hover:bg-[#ff6b00]/10 transition-colors whitespace-nowrap"
          >
            <Plus size={14} strokeWidth={3} /> Nova Versão
          </button>
        </div>
      </div>

      {/* ── ÁREA DE SCROLL (flex-1) ─────────────────── */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-8 max-w-[1400px] mx-auto w-full">
        
        {activeVersion.groups.length === 0 ? (
          <div className="bg-white dark:bg-zinc-900 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl p-20 text-center">
            <div className="text-4xl mb-4 grayscale opacity-40">📝</div>
            <p className="text-zinc-500 font-medium mb-6">Este orçamento ainda está vazio.</p>
            <button onClick={handleAddGroup} className="bg-[#ff6b00] text-white px-6 py-3 rounded-xl font-bold inline-flex items-center gap-2 shadow-lg shadow-orange-500/20 active:scale-95 transition-all">
              <Plus size={20} strokeWidth={3} /> Começar Orçamento
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            {activeVersion.groups.map(group => {
                const isExpanded = expandedGroups[group.id];
                const isActive = group.isActive !== false;
                const groupMargin = group.margin !== undefined ? group.margin : activeVersion.defaultMargin;
                const taxRate = activeVersion.defaultTax;
                
                let gTotalCusto = 0;
                let gTotalVenda = 0;
                group.items.forEach(i => {
                  const base = i.unitCost * i.quantity * (i.days || 1);
                  gTotalCusto += base;
                  const m = groupMargin / 100;
                  gTotalVenda += m < 1 ? base / (1 - m) : base;
                });
                const gLucroBruto = gTotalVenda - gTotalCusto;
                const isOverridden = group.margin !== undefined;

                return (
                  <details 
                    key={group.id} 
                    className={cn(
                      "bg-white dark:bg-[#09090b] rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden transition-all duration-300",
                      !isActive && "opacity-40 grayscale"
                    )}
                    open={isExpanded}
                    onToggle={(e) => {
                      if (expandedGroups[group.id] !== e.currentTarget.open) {
                        toggleGroup(group.id);
                      }
                    }}
                  >
                  <summary className="flex items-center justify-between p-5 bg-zinc-50 dark:bg-zinc-900/50 border-b border-zinc-100 dark:border-zinc-800 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="text-zinc-400">
                        {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                      </div>
                      <div className="flex flex-col md:flex-row md:items-center gap-4">
                        <input 
                          type="text" 
                          value={group.name} 
                          disabled={!isActive}
                          onChange={e => {
                            handleVersionUpdate({
                              groups: activeVersion.groups.map(g => g.id === group.id ? { ...g, name: e.target.value } : g)
                            });
                          }}
                          onClick={e => e.preventDefault()}
                          className="font-black text-lg bg-transparent border-none outline-none focus:text-[#ff6b00] rounded px-1 transition-all disabled:cursor-not-allowed uppercase tracking-tight"
                        />
                        
                        <div className="flex items-center gap-2 overflow-x-auto">
                          <span className="px-3 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-500 text-[10px] font-black uppercase tracking-widest border border-zinc-200 dark:border-zinc-700">
                            Custo: {formatCurrency(gTotalCusto)}
                          </span>
                          <span className={cn(
                            "px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-all",
                            isOverridden ? "bg-orange-50 text-orange-600 border-orange-200" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400 border-zinc-200 dark:border-zinc-700"
                          )}>
                            Margem: {groupMargin.toFixed(1)}% {isOverridden && "*"}
                          </span>
                          <span className="px-3 py-1 rounded-lg bg-orange-500 text-white text-[10px] font-black uppercase tracking-widest shadow-md shadow-orange-500/20">
                            Venda: {formatCurrency(gTotalVenda)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-6 print:hidden" onClick={e => e.preventDefault()}>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          handleVersionUpdate({
                            groups: activeVersion.groups.map(g => g.id === group.id ? { ...g, isActive: !isActive } : g)
                          });
                        }}
                        className={cn(
                          "relative inline-flex h-6 w-11 items-center rounded-full transition-all focus:outline-none shadow-inner",
                          isActive ? "bg-emerald-500" : "bg-zinc-300 dark:bg-zinc-700"
                        )}
                      >
                        <span className={cn("inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-all", isActive ? "translate-x-6" : "translate-x-1")} />
                      </button>

                      <div className="flex items-center gap-2">
                        <div className="relative flex items-center">
                          <input
                            type="number"
                            step="0.1"
                            disabled={!isActive}
                            value={isOverridden ? group.margin : activeVersion.defaultMargin}
                            onChange={e => {
                              const val = parseFloat(e.target.value);
                              handleVersionUpdate({
                                groups: activeVersion.groups.map(g => g.id === group.id ? { ...g, margin: isNaN(val) ? undefined : val } : g)
                              });
                            }}
                            className={cn(
                              "w-16 bg-white dark:bg-zinc-900 border outline-none px-2 py-1 rounded-xl text-center text-xs font-black transition-all",
                              isOverridden ? "border-orange-500 text-orange-500" : "border-zinc-200 dark:border-zinc-800 text-zinc-400"
                            )}
                          />
                          {isOverridden && (
                            <button 
                              onClick={() => handleVersionUpdate({ groups: activeVersion.groups.map(g => g.id === group.id ? { ...g, margin: undefined } : g) })}
                              className="absolute -top-2 -right-2 bg-zinc-800 text-white rounded-full p-0.5 border border-white"
                              title="Resetar"
                            >
                              <X size={8} />
                            </button>
                          )}
                        </div>
                      </div>
                      <button onClick={e => { e.preventDefault(); handleDeleteGroup(group.id); }} className="p-2 text-zinc-400 hover:text-red-500 transition-colors"><Trash2 size={18} /></button>
                    </div>
                  </summary>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm border-collapse min-w-[800px] print:min-w-0">
                        <thead>
                          <tr className="text-zinc-400 dark:text-zinc-500 text-[10px] font-black uppercase tracking-widest border-b border-zinc-100 dark:border-zinc-800">
                            <th className="py-4 px-6 w-16 text-center border-r border-zinc-100 dark:border-zinc-800">🏠</th>
                            <th className="py-4 px-4 w-[250px]">Cargo / Recurso</th>
                            <th className="py-4 px-4 w-[250px]">Nome</th>
                            <th className="py-4 px-4 w-32 print:hidden text-right">Custo Unit.</th>
                            <th className="py-4 px-4 w-20 text-center">Qtd</th>
                            <th className="py-4 px-4 w-20 text-center">Dias</th>
                            <th className="py-4 px-4 w-40 text-right">Valor Venda</th>
                            {showFinancialControl && (
                              <th className="py-4 px-4 w-32 bg-yellow-50/30 dark:bg-yellow-950/5">Executado</th>
                            )}
                            <th className="py-4 px-2 w-10"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-50 dark:divide-zinc-900">
                          {group.items.map((item, idx) => {
                            const metrics = getItemMetrics(item, groupMargin, taxRate);
                            return (
                              <React.Fragment key={item.id}>
                              <tr className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30 transition-all group/row">
                                <td className="py-3 px-6 text-center border-r border-zinc-100 dark:border-zinc-800">
                                  <button
                                    onClick={() => handleUpdateItem(group.id, item.id, { inHouse: !item.inHouse })}
                                    className={cn("p-1.5 rounded-lg transition-all", item.inHouse ? "bg-orange-500 text-white shadow-md shadow-orange-500/20" : "text-zinc-300 hover:text-zinc-500")}
                                  >
                                    <Home size={14} />
                                  </button>
                                </td>
                                <td className="py-3 px-4">
                                    <input type="text" value={item.role || ''} onChange={e => handleUpdateItem(group.id, item.id, { role: e.target.value })} className="w-full bg-transparent outline-none font-medium text-zinc-700 dark:text-zinc-300 placeholder:text-zinc-300" placeholder="Diretor de Arte..." />
                                </td>
                                <td className="py-3 px-4">
                                    <input type="text" list="lista-banco-recursos" value={item.name} onChange={e => handleUpdateItem(group.id, item.id, { name: e.target.value })} className="w-full bg-transparent outline-none font-bold text-zinc-900 dark:text-white" />
                                </td>
                                <td className="py-3 px-4 print:hidden text-right">
                                    <input type="number" value={item.unitCost || ''} onChange={e => handleUpdateItem(group.id, item.id, { unitCost: Number(e.target.value) })} className="w-full bg-transparent outline-none text-right font-mono text-zinc-500" placeholder="0.00" />
                                </td>
                                <td className="py-3 px-4 text-center">
                                  <input type="number" min="1" value={item.quantity || 1} onChange={e => handleUpdateItem(group.id, item.id, { quantity: Number(e.target.value) })} className="w-12 bg-zinc-100 dark:bg-zinc-800 rounded-lg py-1 text-center font-bold" />
                                </td>
                                <td className="py-3 px-4 text-center">
                                  <input type="number" min="1" value={item.days || 1} onChange={e => handleUpdateItem(group.id, item.id, { days: Number(e.target.value) })} className="w-12 bg-zinc-100 dark:bg-zinc-800 rounded-lg py-1 text-center font-bold" />
                                </td>
                                <td className="py-3 px-4 text-right font-black text-zinc-900 dark:text-white whitespace-nowrap">
                                  <div className="flex items-center justify-end gap-2">
                                    <span className="font-mono tabular-nums">{formatCurrency(metrics.totalFinal)}</span>
                                    <button onClick={() => togglePriceRow(item.id)} className={cn("p-1 rounded transition-colors", expandedPriceRows.has(item.id) ? "text-[#ff6b00]" : "text-zinc-300 hover:text-zinc-500")}>
                                      <Info size={14} />
                                    </button>
                                  </div>
                                </td>
                                {showFinancialControl && (
                                  <td className="py-3 px-4 bg-yellow-50/20 dark:bg-yellow-950/5">
                                    <input type="number" value={item.executedCost || ''} onChange={e => handleUpdateItem(group.id, item.id, { executedCost: Number(e.target.value) })} className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg py-1 px-2 text-right font-mono" placeholder="0.00" />
                                  </td>
                                )}
                                <td className="py-3 px-2 text-right">
                                  <button onClick={() => handleDeleteItem(group.id, item.id)} className="p-1.5 text-zinc-300 hover:text-red-500 opacity-0 group-hover/row:opacity-100 transition-all"><Trash2 size={16} /></button>
                                </td>
                              </tr>

                              <AnimatePresence>
                                {expandedPriceRows.has(item.id) && (
                                  <motion.tr 
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                                    className="overflow-hidden"
                                  >
                                    <td colSpan={showFinancialControl ? 9 : 8} className="p-0 border-b border-zinc-200 dark:border-zinc-800">
                                      <div className="bg-zinc-50/50 dark:bg-zinc-900/40 p-8 flex flex-col gap-6">
                                        <div className="flex items-center gap-3">
                                          <div className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
                                          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Raio-X do Valor de Venda</span>
                                        </div>
                                        <div className="flex items-center justify-between max-w-4xl">
                                          <div className="flex flex-col gap-1">
                                            <span className="text-[9px] font-black uppercase text-zinc-400 tracking-tighter">Custo Base</span>
                                            <span className="text-sm font-bold text-zinc-600 dark:text-zinc-400 tabular-nums">{formatCurrency(item.unitCost * item.quantity * (item.days || 1))}</span>
                                          </div>
                                          <div className="text-zinc-300 font-light text-2xl">+</div>
                                          <div className="flex flex-col gap-1">
                                            <span className="text-[9px] font-black uppercase text-emerald-500 tracking-tighter">Margem ({groupMargin.toFixed(1)}%)</span>
                                            <span className="text-sm font-bold text-emerald-600 tabular-nums">+{formatCurrency(metrics.valorMargem)}</span>
                                          </div>
                                          <div className="text-zinc-300 font-light text-2xl">+</div>
                                          <div className="flex flex-col gap-1">
                                            <span className="text-[9px] font-black uppercase text-blue-500 tracking-tighter">Imposto ({taxRate.toFixed(1)}%)</span>
                                            <span className="text-sm font-bold text-blue-600 tabular-nums">+{formatCurrency(metrics.valorImposto)}</span>
                                          </div>
                                          <div className="w-px h-10 bg-zinc-200 dark:bg-zinc-800 mx-4" />
                                          <div className="flex flex-col gap-1">
                                            <span className="text-[10px] font-black uppercase text-orange-500 tracking-tighter">Total Final</span>
                                            <span className="text-2xl font-black text-orange-500 tabular-nums">{formatCurrency(metrics.totalFinal)}</span>
                                          </div>
                                        </div>
                                      </div>
                                    </td>
                                  </motion.tr>
                                )}
                              </AnimatePresence>
                              </React.Fragment>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    <div className="p-4 border-t border-zinc-50 dark:border-zinc-900 bg-zinc-50/30 dark:bg-zinc-950/10">
                      <button onClick={() => handleAddItem(group.id)} className="text-xs font-black uppercase tracking-widest text-[#ff6b00] hover:text-[#ff8c00] flex items-center gap-2 px-3 py-2 rounded-xl transition-all hover:bg-orange-50 dark:hover:bg-orange-950/20">
                        <Plus size={16} strokeWidth={3} /> Adicionar Item
                      </button>
                    </div>
                  </details>
                );
            })}
            
            <div className="mt-10 flex justify-center pb-20">
              <button onClick={handleAddGroup} className="group flex items-center gap-3 bg-white dark:bg-zinc-900 border-2 border-zinc-200 dark:border-zinc-800 hover:border-[#ff6b00] px-8 py-4 rounded-2xl transition-all shadow-sm hover:shadow-xl active:scale-95">
                <div className="w-10 h-10 rounded-xl bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 group-hover:bg-[#ff6b00] group-hover:text-white transition-all">
                  <Plus size={24} strokeWidth={3} />
                </div>
                <div className="flex flex-col items-start">
                  <span className="font-black text-sm uppercase tracking-widest text-zinc-600 dark:text-zinc-300 group-hover:text-[#ff6b00] transition-colors">Nova Categoria</span>
                  <span className="text-[10px] text-zinc-400 font-medium">Divida seu orçamento em blocos</span>
                </div>
              </button>
            </div>
          </div>
        )}
        </div>
      </div>

      {/* ── RODAPÉ (shrink-0) ───────────────── */}
      <div className="shrink-0 bg-white dark:bg-[#1C1C1E] border-t border-zinc-200 dark:border-zinc-800 px-8 py-6 z-30 shadow-[0_-10px_30px_rgba(0,0,0,0.05)] print:hidden">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between gap-8">
          
          <div className="flex items-center gap-10">
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1">Custo Total</span>
              <span className="font-mono font-bold text-zinc-600 dark:text-zinc-400 tabular-nums">{formatCurrency(globals.totalCost)}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1">Impostos</span>
              <span className="font-mono font-bold text-zinc-600 dark:text-zinc-400 tabular-nums">{formatCurrency(globals.totalTax)}</span>
            </div>
            <div className="bg-emerald-50 dark:bg-emerald-950/20 px-4 py-2 rounded-2xl border border-emerald-100 dark:border-emerald-900/30 flex flex-col">
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-1">Lucro Operacional</span>
              <span className="font-mono font-black text-emerald-600 text-xl tabular-nums">{formatCurrency(globals.totalProfit)}</span>
            </div>
          </div>

          <div className="flex items-center gap-6">
            {showFinancialControl && (
              <div className="bg-zinc-50 dark:bg-zinc-900/50 px-5 py-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 flex flex-col items-end">
                <span className="text-[9px] font-black uppercase tracking-tighter text-zinc-400">Lucro Real (Executado)</span>
                <span className={cn("font-mono font-black text-lg tabular-nums", globals.lucroReal < 0 ? "text-red-500" : "text-emerald-500")}>
                  {formatCurrency(globals.lucroReal)}
                </span>
              </div>
            )}
            
            <div className="bg-[#ff6b00] px-8 py-4 rounded-2xl shadow-xl shadow-orange-500/30 flex flex-col items-end">
              <span className="text-[10px] font-black uppercase tracking-widest text-white/70 mb-1">Total da Proposta</span>
              <span className="font-mono font-black text-3xl text-white tabular-nums leading-none">{formatCurrency(globals.totalClient)}</span>
            </div>
          </div>

        </div>
      </div>

      <datalist id="lista-banco-recursos">
        {professionals.map(p => <option key={p.id} value={p.name} />)}
        {equipments.map(e => <option key={e.id} value={e.name} />)}
      </datalist>
      <datalist id="lista-clientes">
        {clientes.map(c => <option key={c.id} value={c.nome} />)}
      </datalist>
    </div>
  );
};
