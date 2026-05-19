import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useParams, useNavigate, useBlocker } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronRight, Plus, Trash2, Home, Printer, Save, ArrowLeft, Link as LinkIcon, Copy, Info, X, UserPlus, TrendingUp, TrendingDown, AlertTriangle, ShieldCheck, Check, Paperclip, Eye, Loader2, Lock, FileText } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { useModal } from '../context/ModalContext';
import { useAuth } from '@clerk/clerk-react';
import { CostGroup, CostItem, Project, ProjectVersion } from '../types';
import { cn, formatCurrency } from '../lib/utils';
import { v4 as uuidv4 } from 'uuid';
import { getItemMetrics, calculateProjectTotals, getGroupMetrics } from '../lib/calculations';
import { PropostaModal } from '../components/PropostaModal';
export const Planilha: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getToken } = useAuth();
  const { projects, updateProject, updateProjectVersion, addProjectVersion, professionals, equipments, clientes, addTemplate, templates, editingTemplateId, setEditingTemplateId, updateTemplate, deleteProjectVersion, isVersionLoading, loadVersionData, clearVersionData, addProfessional, addEquipment } = useAppContext();
  const { openModal } = useModal();
  
  const [project, setProject] = useState<Project | null>(null);
  const [showOS, setShowOS] = useState(false);
  const [activeVersionId, setActiveVersionId] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [expandedPriceRows, setExpandedPriceRows] = useState<Set<string>>(new Set());
  const [isDirty, setIsDirty] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [newDate, setNewDate] = useState('');
  const [resourceToSave, setResourceToSave] = useState<CostItem | null>(null);
  const [isSavingResource, setIsSavingResource] = useState(false);
  const [uploadingItemIds, setUploadingItemIds] = useState<Set<string>>(new Set());
  const [deletingItemIds, setDeletingItemIds] = useState<Set<string>>(new Set());
  const [isGeneralInfoExpanded, setIsGeneralInfoExpanded] = useState(false);
  const [isFinancialHealthExpanded, setIsFinancialHealthExpanded] = useState(false);
  const [isPaymentsExpanded, setIsPaymentsExpanded] = useState(false);
  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, groupId: string, itemId: string, itemName: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('Arquivo muito grande. O limite é 5MB.');
      if (fileInputRefs.current[itemId]) fileInputRefs.current[itemId]!.value = '';
      return;
    }
    const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (!validTypes.includes(file.type)) {
      alert('Formato não suportado. Envie PDF, JPG ou PNG.');
      if (fileInputRefs.current[itemId]) fileInputRefs.current[itemId]!.value = '';
      return;
    }

    setUploadingItemIds(prev => new Set(prev).add(itemId));

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('projectName', project?.title || 'Projeto_Sem_Nome');
      formData.append('itemName', itemName);

      const token = await getToken();
      
      // Timeout de Proteção: 60 segundos
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
        alert("O upload está demorando mais que o esperado, verifique sua conexão.");
      }, 60000);

      const res = await fetch('/api/upload-drive', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('text/html')) {
        throw new Error('Servidor de API inativo. Para testar uploads localmente, lembre-se de iniciar o servidor backend usando "npm start" em outro terminal.');
      }

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro no upload');
      }

      // PROTOCOLO DE SINCRONIA ATÔMICA: Localiza o link antigo para log
      const currentItem = activeVersion?.groups.find(g => g.id === groupId)?.items.find(i => i.id === itemId);
      console.log("💾 ID antigo era: ", currentItem?.receiptLink || "Nenhum", " -> Novo ID é: ", data.url);
      console.log("🔗 Link retornado pelo servidor:", data.url);
      console.log("💾 Atualizando banco de dados (Neon) com o link novo...");
      
      // 1. Atualiza estado do React imediatamente
      handleUpdateItem(groupId, itemId, { receiptLink: data.url });

      // 2. Persiste imediatamente no banco AWAITANDO a resposta
      if (project && activeVersionId && activeVersion) {
        const updatedGroups = activeVersion.groups.map(g => {
          if (g.id !== groupId) return g;
          return {
            ...g,
            items: g.items.map(i => i.id === itemId ? { ...i, receiptLink: data.url } : i)
          };
        });
        const updatedVersion = { ...activeVersion, groups: updatedGroups };
        await updateProjectVersion(project.id, activeVersionId, updatedVersion);
        setIsDirty(false); // Sincronizado
      }
      
      setToastMessage('Anexo salvo com sucesso!');
    } catch (error: any) {
      alert('Erro: ' + error.message);
    } finally {
      setUploadingItemIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(itemId);
        return newSet;
      });
      if (fileInputRefs.current[itemId]) fileInputRefs.current[itemId]!.value = '';
    }
  };

  const handleDeleteAttachment = async (groupId: string, itemId: string, receiptLink: string) => {
    // Limpeza rigorosa da URL antes da extração
    const cleanLink = (receiptLink || '').trim();
    
    // Extrai o fileId do link do Google Drive
    // Suporta formatos /d/ID/view e ?id=ID
    const match = cleanLink.match(/\/d\/([a-zA-Z0-9_-]+)|id=([a-zA-Z0-9_-]+)/);
    const fileId = match ? (match[1] || match[2]) : null;

    setDeletingItemIds(prev => new Set(prev).add(itemId));
    try {
      if (fileId) {
        console.log('🗑️ [AUDITORIA] Tentando deletar fileId:', fileId);
        console.log('🔗 URL Original:', cleanLink);
        
        const token = await getToken();
        const res = await fetch(`/api/delete-file/${fileId}`, {
          method: 'DELETE',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Erro ao deletar no Drive.');
        }
      } else {
        console.warn('⚠️ Não foi possível extrair fileId de:', receiptLink);
      }
      // Limpa o link localmente e persiste no banco (Neon)
      handleUpdateItem(groupId, itemId, { receiptLink: '' });
      
      // PROTOCOLO DE SINCRONIA ATÔMICA: Garante que o banco seja limpo
      if (project && activeVersionId && activeVersion) {
        const updatedGroups = activeVersion.groups.map(g => {
          if (g.id !== groupId) return g;
          return {
            ...g,
            items: g.items.map(i => i.id === itemId ? { ...i, receiptLink: '' } : i)
          };
        });
        const updatedVersion = { ...activeVersion, groups: updatedGroups };
        await updateProjectVersion(project.id, activeVersionId, updatedVersion);
        setIsDirty(false);
      }

      setToastMessage('Anexo removido com sucesso!');
    } catch (error: any) {
      alert('Erro ao remover anexo: ' + error.message);
    } finally {
      setDeletingItemIds(prev => {
        const next = new Set(prev);
        next.delete(itemId);
        return next;
      });
    }
  };

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const [isSaving, setIsSaving] = useState(false);

  // Refs para acessar estado mais recente dentro de callbacks assíncronos
  const projectRef = useRef<Project | null>(null);
  const activeVersionIdRef = useRef<string | null>(null);
  projectRef.current = project;
  activeVersionIdRef.current = activeVersionId;

  // Função interna de persistência — sempre executa, independente de isSaving
  const _persist = useCallback(async () => {
    const currentProject = projectRef.current;
    const currentVersionId = activeVersionIdRef.current;
    if (!currentProject) return;

    setIsSaving(true);
    try {
      await updateProject(currentProject.id, {
        title: currentProject.title,
        client: currentProject.client,
        status: currentProject.status,
        projectNumber: currentProject.projectNumber,
        recordingDates: currentProject.recordingDates,
        startDate: currentProject.startDate,
        endDate: currentProject.endDate,
      });

      if (currentVersionId) {
        const activeVer = currentProject.versions.find(v => v.id === currentVersionId);
        if (activeVer) {
          await updateProjectVersion(currentProject.id, currentVersionId, activeVer);
        }
      }

      setIsDirty(false);
      setToastMessage('Alterações salvas com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar:', error);
      setToastMessage('Erro ao salvar projeto.');
    } finally {
      setIsSaving(false);
    }
  }, [updateProject, updateProjectVersion]);

  // Botão manual: sempre força o salvamento
  const saveProject = useCallback(() => _persist(), [_persist]);

  // ── DEBOUNCE: aguarda 1500ms de pausa na digitação antes de persistir ──────
  useEffect(() => {
    if (!isDirty || isSaving) return;          // não enfileira se já há save em curso
    const timer = setTimeout(() => _persist(), 1500);
    return () => clearTimeout(timer);
  }, [isDirty, project, _persist, isSaving]);

  // Carrega os dados da versão ativa sob demanda (Lazy Loading)
  useEffect(() => {
    if (activeVersionId) {
      loadVersionData(activeVersionId);
    }
    return () => {
      if (activeVersionId) {
        clearVersionData(activeVersionId);
      }
    };
  }, [activeVersionId]);


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
    if (!activeVersion) return { totalClient: 0, totalCost: 0, totalProfit: 0, totalTax: 0, totalExecuted: 0, totalVenda: 0, lucroReal: 0 };
    const totals = calculateProjectTotals(activeVersion);
    return { 
      totalClient: totals.totalProposta, 
      totalCost: totals.totalCost, 
      totalProfit: totals.totalProfit, 
      totalTax: totals.totalTax, 
      totalExecuted: totals.totalExecuted, 
      totalVenda: totals.subtotal, 
      lucroReal: totals.lucroReal 
    };
  }, [activeVersion]);

  // ── MÉTRICAS DE SAÚde FINANCEIRA (só relevante em modo de execução) ──
  const healthMetrics = useMemo(() => {
    if (!activeVersion) return { totalOverbudget: 0, realMarginPct: 0, breakEven: 0, overbudgetItems: 0 };

    let totalOverbudget = 0;
    let overbudgetItems = 0;

    activeVersion.groups.forEach(group => {
      if (group.isActive === false) return;
      const groupMargin = group.margin !== undefined ? group.margin : activeVersion.defaultMargin;
      group.items.forEach(item => {
        if (!item.executedCost) return;
        const baseCost = (item.unitCost || 0) * (item.quantity || 1) * (item.days || 1);
        const diff = item.executedCost - baseCost;
        if (diff > 0) {
          totalOverbudget += diff;
          overbudgetItems++;
        }
      });
    });

    const realMarginPct = globals.totalClient > 0
      ? (globals.lucroReal / globals.totalClient) * 100
      : 0;

    const breakEven = globals.totalCost + globals.totalTax;

    return { totalOverbudget, realMarginPct, breakEven, overbudgetItems };
  }, [activeVersion, globals]);

  // ── LISTA DE PAGAMENTOS (freelas/terceiros com PIX) ───────────────
  const paymentList = useMemo(() => {
    if (!activeVersion) return [];
    const rows: {
      id: string;
      name: string;
      role: string;
      pix: string;
      amount: number;
    }[] = [];

    activeVersion.groups.forEach(group => {
      if (group.isActive === false) return;
      group.items.forEach(item => {
        if (item.isInHouse === true) return;          // só freelas/terceiros
        const baseCost = (item.unitCost || 0) * (item.quantity || 1) * (item.days || 1);
        const amount = (item.executedCost && item.executedCost > 0)
          ? item.executedCost
          : baseCost;
        const prof = professionals.find(p => p.name === item.name);
        rows.push({
          id: item.id,
          name: item.name || '—',
          role: item.role || '—',
          pix: prof?.pix || 'Não cadastrado',
          amount,
        });
      });
    });

    return rows;
  }, [activeVersion, professionals]);

  const [copiedPixId, setCopiedPixId] = useState<string | null>(null);

  const handleCopyPix = (itemId: string, pix: string) => {
    if (pix === 'Não cadastrado') return;
    navigator.clipboard.writeText(pix).then(() => {
      setCopiedPixId(itemId);
      setTimeout(() => setCopiedPixId(null), 2000);
    });
  };

  if (!project || !activeVersion) return null;

  // Atualiza apenas o rascunho local; o debounce persiste no banco
  const handleProjectUpdate = (updates: Partial<Project>) => {
    if (!project) return;
    setProject(prev => prev ? { ...prev, ...updates } : null);
    setIsDirty(true);
  };

  // Atualiza apenas o rascunho local; o debounce persiste no banco
  const handleVersionUpdate = (updates: Partial<ProjectVersion>) => {
    if (!activeVersionId || !project) return;
    setProject(prev => {
      if (!prev) return null;
      return {
        ...prev,
        versions: prev.versions.map(v =>
          v.id === activeVersionId ? { ...v, ...updates } : v
        ),
      };
    });
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
      onConfirm: () =>
        handleVersionUpdate({ groups: activeVersion.groups.filter(g => g.id !== groupId) })
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
      isInHouse: false
    };
    handleVersionUpdate({
      groups: activeVersion.groups.map(g => g.id === groupId ? { ...g, items: [...g.items, newItem] } : g)
    });
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
  };

  const handleDeleteItem = (groupId: string, itemId: string) => {
    openModal({
      title: 'Excluir Item',
      message: 'Confirma a exclusão deste item?',
      onConfirm: () =>
        handleVersionUpdate({
          groups: activeVersion.groups.map(g =>
            g.id === groupId ? { ...g, items: g.items.filter(i => i.id !== itemId) } : g
          )
        })
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
      <div className={showOS ? 'print:hidden flex flex-col h-full' : 'flex flex-col h-full'}>
      
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg font-medium animate-in fade-in slide-in-from-top-4">
          {toastMessage}
        </div>
      )}

      {/* ── CABEÇALHO FIXO DO TOPO (Título e Ações) ── */}
      <div className="shrink-0 bg-white dark:bg-[#1C1C1E] border-b border-zinc-200 dark:border-zinc-800 px-8 py-4 z-20 shadow-sm print:relative print:shadow-none print:border-b-2 print:border-zinc-900 print:mb-8 text-black print:px-0">
        <div className="max-w-[1400px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-550 dark:text-zinc-400 print:hidden transition-colors">
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-2xl font-black tracking-tight text-zinc-900 dark:text-white uppercase tracking-wider">Ficha do Projeto</h1>
          </div>
          <div className="flex gap-2 print:hidden overflow-x-auto pb-1 md:pb-0">
            <button 
              onClick={saveProject}
              disabled={isSaving}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-white font-black text-xs uppercase tracking-widest transition-colors relative shadow-sm",
                isSaving ? "bg-zinc-400 cursor-not-allowed" : "bg-[#27ae60] hover:bg-[#219150]"
              )}
            >
              {isDirty && !isSaving && <span className="absolute -top-1 -right-1 block h-3 w-3 rounded-full bg-orange-500 ring-2 ring-white animate-pulse"></span>}
              <Save size={16} className={isSaving ? "animate-spin" : ""} />
              <span>{isSaving ? "SALVANDO..." : "SALVAR"}</span>
            </button>
            <button 
              onClick={() => setIsSaveModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-xl text-zinc-650 dark:text-zinc-300 font-black text-xs uppercase tracking-widest transition-colors border border-zinc-200/50 dark:border-zinc-700/50"
            >
              <Save size={16} />
              <span>Template</span>
            </button>
            <AnimatePresence>
            {isSaveModalOpen && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm">
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="w-full max-w-sm bg-white dark:bg-[#1C1C1E] border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl p-8"
                >
                  <h3 className="text-xl font-black mb-2 text-zinc-900 dark:text-white uppercase tracking-tight">Salvar como Template</h3>
                  <p className="text-xs text-zinc-550 dark:text-zinc-400 mb-6 font-medium leading-relaxed">Dê um nome para este padrão de orçamento para reutilizá-lo depois.</p>
                  <input
                    type="text"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    placeholder="Nome do Template"
                    className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 mb-6 focus:border-[#ff6b00] focus:ring-2 focus:ring-[#ff6b00]/20 focus:outline-none transition-all font-medium text-sm text-zinc-800 dark:text-zinc-150"
                    autoFocus
                  />
                  <div className="flex justify-end gap-3">
                    <button onClick={() => { setIsSaveModalOpen(false); setTemplateName(''); }} className="px-4 py-2 text-zinc-400 font-black text-xs uppercase tracking-widest hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors">Cancelar</button>
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
                      className="bg-[#ff6b00] text-white px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-[#e55e00] transition-colors shadow-lg shadow-orange-500/20"
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
              className="flex items-center gap-2 px-4 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-xl text-zinc-650 dark:text-zinc-300 font-black text-xs uppercase tracking-widest transition-colors border border-zinc-200/50 dark:border-zinc-700/50"
            >
              <Copy size={16} />
              <span>Nova Versão</span>
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
              className="p-2 bg-red-50 dark:bg-red-950/20 text-red-650 hover:bg-red-100 dark:hover:bg-red-900/40 border border-red-100 dark:border-red-900/20 rounded-xl transition-colors"
              title="Excluir Versão"
            >
              <Trash2 size={16} />
            </button>
            <button onClick={() => setShowOS(true)} className="flex items-center gap-2 p-2 px-4 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-xl text-zinc-650 dark:text-zinc-300 font-black text-xs uppercase tracking-widest transition-colors border border-zinc-200/50 dark:border-zinc-700/50">
              <FileText size={16} />
              <span>Gerar Proposta</span>
            </button>
            <button onClick={() => window.print()} className="flex items-center gap-2 p-2 px-4 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-xl text-zinc-650 dark:text-zinc-300 font-black text-xs uppercase tracking-widest transition-colors border border-zinc-200/50 dark:border-zinc-700/50">
              <Printer size={16} />
              <span>PDF</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── ÁREA DE SCROLL (flex-1) ─────────────────── */}
      <div className="flex-1 overflow-y-auto px-8 py-8 pb-32">
        <div className="max-w-[1400px] mx-auto w-full space-y-6">
        
          {/* Version Selector Tabs (Outside collapsible for supreme UX) */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1.5 print:hidden shrink-0">
            {project.versions.map(v => (
              <button
                key={v.id}
                onClick={() => setActiveVersionId(v.id)}
                className={cn(
                  "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border shadow-sm",
                  activeVersionId === v.id
                    ? "bg-[#ff6b00] text-white border-[#ff6b00] shadow-md shadow-orange-500/20"
                    : "bg-white dark:bg-zinc-900 text-zinc-500 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
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
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest bg-zinc-50 dark:bg-zinc-900 border border-dashed border-zinc-300 dark:border-zinc-800 text-[#ff6b00] hover:bg-[#ff6b00]/10 transition-colors whitespace-nowrap"
            >
              <Plus size={12} strokeWidth={3} /> Nova Versão
            </button>
          </div>

          {/* SEÇÃO 1: INFORMAÇÕES GERAIS (Collapsible Accordion) */}
          <div className="bg-white dark:bg-[#1C1C1E] border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden print:border-none print:shadow-none print:bg-transparent transition-all">
            <button
              type="button"
              onClick={() => setIsGeneralInfoExpanded(prev => !prev)}
              className="w-full flex flex-col md:flex-row md:items-center justify-between p-5 hover:bg-zinc-50 dark:hover:bg-zinc-800/10 transition-all text-left print:hidden focus:outline-none"
            >
              <div className="flex items-center gap-3">
                <div className="text-[#ff6b00] p-1.5 rounded-lg bg-orange-500/10 dark:bg-orange-500/5 transition-transform duration-200">
                  <motion.div
                    animate={{ rotate: isGeneralInfoExpanded ? 90 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronRight size={18} strokeWidth={2.5} />
                  </motion.div>
                </div>
                <div>
                  <h2 className="text-[10px] font-black uppercase tracking-widest text-zinc-700 dark:text-zinc-300">Informações Gerais</h2>
                </div>
              </div>

              {!isGeneralInfoExpanded && (
                <div className="mt-2 md:mt-0 text-[10px] font-mono text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-900/60 px-3 py-1.5 rounded-xl border border-zinc-150 dark:border-zinc-800/80 tabular-nums uppercase tracking-widest flex flex-wrap gap-x-2 gap-y-1">
                  <span>ID: <span className="font-bold text-[#ff6b00]">{new Date(project.createdAt || new Date()).getFullYear()}-{project.projectNumber || '—'}</span></span>
                  <span className="text-zinc-300 dark:text-zinc-700">|</span>
                  <span>Status: <span className="font-bold text-zinc-700 dark:text-zinc-300">{project.status}</span></span>
                  <span className="text-zinc-300 dark:text-zinc-700">|</span>
                  <span>Cliente: <span className="font-bold text-zinc-700 dark:text-zinc-300">{project.client || '—'}</span></span>
                  <span className="text-zinc-300 dark:text-zinc-700">|</span>
                  <span>Margem: <span className="font-bold text-zinc-700 dark:text-zinc-300">{activeVersion.defaultMargin.toFixed(1)}%</span></span>
                  <span className="text-zinc-300 dark:text-zinc-700">|</span>
                  <span>NF: <span className="font-bold text-zinc-700 dark:text-zinc-300">{activeVersion.defaultTax.toFixed(1)}%</span></span>
                </div>
              )}
            </button>

            {/* Print header version (always visible in print) */}
            <div className="hidden print:block border-b border-zinc-250 dark:border-zinc-800 pb-4 mb-4">
              <h2 className="text-xs font-black uppercase tracking-widest text-zinc-800 mb-2">Informações Gerais</h2>
              <div className="text-xs font-mono text-zinc-700 grid grid-cols-3 gap-2">
                <div><strong>ID Orçamento:</strong> {new Date(project.createdAt || new Date()).getFullYear()}-{project.projectNumber || '—'}</div>
                <div><strong>Status:</strong> {project.status}</div>
                <div><strong>Cliente:</strong> {project.client || '—'}</div>
                <div><strong>Margem Padrão:</strong> {activeVersion.defaultMargin.toFixed(1)}%</div>
                <div><strong>Imposto / NF:</strong> {activeVersion.defaultTax.toFixed(1)}%</div>
              </div>
            </div>

            <AnimatePresence initial={false}>
              {isGeneralInfoExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  className="overflow-hidden border-t border-zinc-100 dark:border-zinc-800 print:!h-auto print:!opacity-100 print:border-none"
                >
                  <div className="p-6 bg-zinc-50/15 dark:bg-zinc-950/20 grid grid-cols-1 lg:grid-cols-3 gap-4 print:p-0 print:bg-transparent">
                    
                    {/* BOX 1: IDENTIFICAÇÃO */}
                    <div className="bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-850 rounded-xl p-4 shadow-sm flex flex-col gap-3">
                      <h3 className="text-[9px] font-black uppercase text-zinc-400 dark:text-zinc-550 tracking-widest border-b border-zinc-100 dark:border-zinc-800/60 pb-1.5">Identificação</h3>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[9px] font-black uppercase text-zinc-400 dark:text-zinc-550 mb-0.5 tracking-widest">ID Orçamento</label>
                          <div className="flex items-center bg-zinc-50 dark:bg-zinc-800/40 rounded-xl px-3 py-1.5 border border-zinc-200 dark:border-zinc-800 focus-within:border-[#ff6b00] focus-within:ring-2 focus-within:ring-[#ff6b00]/20 transition-all duration-200">
                            <span className="text-zinc-400 font-mono text-xs font-bold mr-1">{new Date(project.createdAt || new Date()).getFullYear()}-</span>
                            <input
                              type="number"
                              value={project.projectNumber || ''}
                              onChange={e => handleProjectUpdate({ projectNumber: Number(e.target.value) })}
                              className="w-full bg-transparent border-none outline-none font-mono text-xs font-bold text-[#ff6b00]"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-[9px] font-black uppercase text-zinc-400 dark:text-zinc-550 mb-0.5 tracking-widest">Status</label>
                          <select
                            value={project.status}
                            onChange={e => handleProjectUpdate({ status: e.target.value as any })}
                            className="w-full bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 outline-none focus:border-[#ff6b00] focus:ring-2 focus:ring-[#ff6b00]/20 transition-all duration-200 font-bold text-xs text-zinc-700 dark:text-zinc-200"
                          >
                            <option value="Pendente">Pendente</option>
                            <option value="Aprovado">Aprovado</option>
                            <option value="Concluído">Concluído</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[9px] font-black uppercase text-zinc-400 dark:text-zinc-550 mb-0.5 tracking-widest">Título</label>
                          <input
                            type="text"
                            value={project.title}
                            onChange={e => handleProjectUpdate({ title: e.target.value })}
                            className="w-full bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 outline-none focus:border-[#ff6b00] focus:ring-2 focus:ring-[#ff6b00]/20 transition-all duration-200 font-bold text-xs text-zinc-900 dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-black uppercase text-zinc-400 dark:text-zinc-550 mb-0.5 tracking-widest">Cliente</label>
                          <input
                            type="text"
                            list="lista-clientes"
                            value={project.client}
                            onChange={e => handleProjectUpdate({ client: e.target.value })}
                            className="w-full bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 outline-none focus:border-[#ff6b00] focus:ring-2 focus:ring-[#ff6b00]/20 transition-all duration-200 font-bold text-xs text-[#ff6b00]"
                          />
                        </div>
                      </div>
                    </div>

                    {/* BOX 2: CRONOGRAMA */}
                    <div className="bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-850 rounded-xl p-4 shadow-sm flex flex-col gap-3">
                      <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800/60 pb-1.5">
                        <h3 className="text-[9px] font-black uppercase text-zinc-400 dark:text-zinc-550 tracking-widest">Cronograma</h3>
                        {(project.recordingDates && project.recordingDates.length > 0) || (project.startDate && project.endDate) ? (
                          <span className="text-[9px] font-black bg-[#ff6b00]/10 text-[#ff6b00] px-2.5 py-0.5 rounded-full font-mono tracking-tighter">
                            DURAÇÃO: {project.recordingDates?.length > 0 ? project.recordingDates.length : Math.ceil((new Date(project.endDate!).getTime() - new Date(project.startDate!).getTime()) / (1000 * 60 * 60 * 24)) + 1} DIAS
                          </span>
                        ) : null}
                      </div>
                      
                      <div>
                        <label className="block text-[9px] font-black uppercase text-zinc-400 dark:text-zinc-550 mb-0.5 tracking-widest">Data do Orçamento</label>
                        <input
                          type="date"
                          value={activeVersion.date}
                          onChange={e => handleVersionUpdate({ date: e.target.value })}
                          className="w-full bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 outline-none focus:border-[#ff6b00] focus:ring-2 focus:ring-[#ff6b00]/20 transition-all duration-200 font-bold text-xs text-zinc-700 dark:text-zinc-200"
                        />
                      </div>

                      <div>
                        <label className="block text-[9px] font-black uppercase text-zinc-400 dark:text-zinc-550 mb-0.5 tracking-widest">Adicionar Diária</label>
                        <div className="flex gap-2">
                          <input
                            type="date"
                            value={newDate}
                            onChange={e => setNewDate(e.target.value)}
                            className="flex-1 bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 outline-none focus:border-[#ff6b00] focus:ring-2 focus:ring-[#ff6b00]/20 transition-all duration-200 font-bold text-xs text-zinc-700 dark:text-zinc-200"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              if (newDate && !project.recordingDates?.includes(newDate)) {
                                handleProjectUpdate({ recordingDates: [...(project.recordingDates || []), newDate].sort() });
                                setNewDate('');
                              }
                            }}
                            className="bg-[#ff6b00]/10 text-[#ff6b00] border border-[#ff6b00]/20 rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest hover:bg-[#ff6b00] hover:text-white transition-colors flex items-center justify-center whitespace-nowrap"
                            title="Adicionar Diária"
                          >
                            <Plus size={14} strokeWidth={3} className="mr-1" /> Adicionar
                          </button>
                        </div>
                      </div>

                      {project.recordingDates && project.recordingDates.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {project.recordingDates.map((dateStr) => {
                            const [year, month, day] = dateStr.split('-');
                            const formattedDate = `${day}/${month}`;
                            return (
                              <div key={dateStr} className="flex items-center gap-1 bg-[#ff6b00]/10 text-[#ff6b00] border border-[#ff6b00]/20 rounded-full pl-2 pr-1 py-0.5 text-[10px] font-bold font-mono">
                                <span>{formattedDate}</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleProjectUpdate({ recordingDates: project.recordingDates.filter(d => d !== dateStr) });
                                  }}
                                  className="hover:bg-[#ff6b00]/20 rounded-full p-0.5 transition-colors"
                                >
                                  <X size={10} strokeWidth={3} />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* BOX 3: COMERCIAL */}
                    <div className="bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-850 rounded-xl p-4 shadow-sm flex flex-col gap-3 print:hidden">
                      <h3 className="text-[9px] font-black uppercase text-zinc-400 dark:text-zinc-550 tracking-widest border-b border-zinc-100 dark:border-zinc-800/60 pb-1.5">Comercial</h3>
                      
                      <div>
                        <label className="block text-[9px] font-black uppercase text-zinc-400 dark:text-zinc-550 mb-0.5 tracking-widest">Margem Padrão</label>
                        <div className="flex items-center bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-1.5 focus-within:border-[#ff6b00] focus-within:ring-2 focus-within:ring-[#ff6b00]/20 transition-all duration-200">
                          <input
                            type="number"
                            step="0.01"
                            value={activeVersion.defaultMargin.toFixed(2)}
                            onChange={e => {
                              const val = parseFloat(e.target.value);
                              handleVersionUpdate({ defaultMargin: isNaN(val) ? 0 : val });
                            }}
                            className="flex-1 bg-transparent border-none outline-none font-bold text-xs text-zinc-900 dark:text-zinc-100 font-mono tabular-nums"
                          />
                          <span className="text-zinc-400 font-bold text-[10px] font-mono">%</span>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[9px] font-black uppercase text-zinc-400 dark:text-zinc-550 mb-0.5 tracking-widest">Imposto / NF</label>
                        <div className="flex items-center bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-1.5 focus-within:border-[#ff6b00] focus-within:ring-2 focus-within:ring-[#ff6b00]/20 transition-all duration-200">
                          <input
                            type="number"
                            step="0.01"
                            value={activeVersion.defaultTax.toFixed(2)}
                            onChange={e => {
                              const val = parseFloat(e.target.value);
                              handleVersionUpdate({ defaultTax: isNaN(val) ? 0 : val });
                            }}
                            className="flex-1 bg-transparent border-none outline-none font-bold text-xs text-zinc-900 dark:text-zinc-100 font-mono tabular-nums"
                          />
                          <span className="text-zinc-400 font-bold text-[10px] font-mono">%</span>
                        </div>
                      </div>
                    </div>

                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

        
        {isVersionLoading ? (
          <div className="flex flex-col items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-zinc-200 border-t-[#ff6b00]"></div>
            <p className="mt-4 text-sm font-medium text-zinc-500 animate-pulse">Carregando dados do projeto...</p>
          </div>
        ) : activeVersion.groups.length === 0 ? (
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
                const metrics = getGroupMetrics(group, activeVersion.defaultMargin, activeVersion.defaultTax);
                const gTotalCost = metrics.totalCost;
                const gTotalVenda = metrics.totalVenda;
                const gTotalProfit = metrics.totalProfit;
                const gTotalProposta = metrics.totalProposta;
                const groupMargin = group.margin !== undefined ? group.margin : activeVersion.defaultMargin;
                const isOverridden = group.margin !== undefined;
                const taxRate = activeVersion.defaultTax || 0;

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
                            Custo: <span className="font-mono tabular-nums">{formatCurrency(gTotalCost)}</span>
                          </span>
                          <span className={cn(
                            "px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-all text-emerald-600 dark:text-green-400 bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/50",
                            isOverridden && "ring-1 ring-emerald-500"
                          )}>
                            Lucro: <span className="font-mono tabular-nums font-bold">{formatCurrency(gTotalProfit)}</span> <span className="font-mono tabular-nums opacity-80">({groupMargin.toFixed(1)}%)</span> {isOverridden && "*"}
                          </span>
                          <span className="px-3 py-1 rounded-lg bg-orange-500 text-white text-[10px] font-black uppercase tracking-widest shadow-md shadow-orange-500/20">
                            Venda: <span className="font-mono tabular-nums">{formatCurrency(gTotalProposta)}</span>
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

                    <div className="w-full overflow-x-auto">
                      <table className="w-full text-left text-sm border-collapse min-w-[900px] print:min-w-0">
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
                              <>
                                <th className="py-4 px-4 w-32 bg-yellow-50/30 dark:bg-yellow-950/5 text-right">Executado</th>
                                <th className="py-4 px-4 w-24 text-center">Anexo</th>
                              </>
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
                                    onClick={() => handleUpdateItem(group.id, item.id, { isInHouse: !item.isInHouse })}
                                    className={cn("p-1.5 rounded-lg transition-all", item.isInHouse ? "bg-orange-500 text-white shadow-md shadow-orange-500/20" : "text-zinc-300 hover:text-zinc-500")}
                                  >
                                    <Home size={14} />
                                  </button>
                                </td>
                                <td className="py-3 px-4">
                                    <input 
                                      type="text" 
                                      list="lista-banco-cargos"
                                      value={item.role || ''} 
                                      onChange={e => handleUpdateItem(group.id, item.id, { role: e.target.value })} 
                                      className="w-full bg-zinc-50 dark:bg-zinc-800/40 border border-transparent focus:border-[#ff6b00] focus:ring-2 focus:ring-[#ff6b00]/20 rounded-lg px-3 py-1.5 outline-none font-bold text-xs text-zinc-700 dark:text-zinc-300 placeholder:text-zinc-400 transition-all" 
                                      placeholder="Diretor de Arte..." 
                                    />
                                </td>
                                <td className="py-3 px-4">
                                  {(() => {
                                    const filteredProfessionals = item.role ? professionals.filter(p => p.role === item.role) : professionals;
                                    const filteredEquipments = item.role ? equipments.filter(e => e.category === item.role) : equipments;

                                    const isUnregistered =
                                      item.name.trim() !== '' &&
                                      !professionals.some(p => p.name === item.name) &&
                                      !equipments.some(e => e.name === item.name);
                                    return (
                                      <div className="relative flex items-center gap-1 group/name">
                                        <input
                                          type="text"
                                          list={`lista-banco-recursos-${item.id}`}
                                          value={item.name}
                                          onChange={e => handleUpdateItem(group.id, item.id, { name: e.target.value })}
                                          className="w-full bg-zinc-50 dark:bg-zinc-800/40 border border-transparent focus:border-[#ff6b00] focus:ring-2 focus:ring-[#ff6b00]/20 rounded-lg px-3 py-1.5 outline-none font-bold text-xs text-zinc-900 dark:text-white transition-all"
                                          placeholder="Nome ou Empresa..."
                                        />
                                        <datalist id={`lista-banco-recursos-${item.id}`}>
                                          {filteredProfessionals.map(p => <option key={`p-${p.id}`} value={p.name} />)}
                                          {filteredEquipments.map(e => <option key={`e-${e.id}`} value={e.name} />)}
                                        </datalist>
                                        {isUnregistered && (
                                          <div className="flex-shrink-0 flex items-center gap-1.5">
                                            <div data-tooltip="Este recurso não está cadastrado no Banco de Recursos. Clique em Salvar para registrá-lo.">
                                              <AlertTriangle size={14} className="text-amber-500 cursor-help" />
                                            </div>
                                            <button
                                              onClick={() => setResourceToSave(item)}
                                              className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/60 transition-all"
                                            >
                                              <UserPlus size={11} strokeWidth={2.5} />
                                              <span className="text-[9px] font-black uppercase tracking-wider">Salvar</span>
                                            </button>
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })()}
                                </td>
                                <td className="py-3 px-4 print:hidden text-right">
                                    <input 
                                      type="number" 
                                      value={item.unitCost || ''} 
                                      onChange={e => handleUpdateItem(group.id, item.id, { unitCost: Number(e.target.value) })} 
                                      className="w-full bg-zinc-50 dark:bg-zinc-800/40 border border-transparent focus:border-[#ff6b00] focus:ring-2 focus:ring-[#ff6b00]/20 rounded-lg px-3 py-1.5 outline-none text-right font-mono text-xs font-bold text-zinc-500 dark:text-zinc-400 tabular-nums transition-all" 
                                      placeholder="0.00" 
                                    />
                                </td>
                                <td className="py-3 px-4 text-center">
                                  <input 
                                    type="number" 
                                    min="1" 
                                    value={item.quantity || 1} 
                                    onChange={e => handleUpdateItem(group.id, item.id, { quantity: Number(e.target.value) })} 
                                    className="w-16 mx-auto bg-zinc-50 dark:bg-zinc-800/40 border border-transparent focus:border-[#ff6b00] focus:ring-2 focus:ring-[#ff6b00]/20 rounded-lg px-2 py-1.5 outline-none text-center font-mono text-xs font-bold tabular-nums transition-all" 
                                  />
                                </td>
                                <td className="py-3 px-4 text-center">
                                  <input 
                                    type="number" 
                                    min="1" 
                                    value={item.days || 1} 
                                    onChange={e => handleUpdateItem(group.id, item.id, { days: Number(e.target.value) })} 
                                    className="w-16 mx-auto bg-zinc-50 dark:bg-zinc-800/40 border border-transparent focus:border-[#ff6b00] focus:ring-2 focus:ring-[#ff6b00]/20 rounded-lg px-2 py-1.5 outline-none text-center font-mono text-xs font-bold tabular-nums transition-all" 
                                  />
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
                                  <>
                                    {(() => {
                                      const isOverbudget = item.executedCost !== undefined && item.executedCost > metrics.baseCost;
                                      const overbudgetDiff = item.executedCost ? item.executedCost - metrics.baseCost : 0;
                                      return (
                                        <td className={cn("py-3 px-4 transition-colors", project.status === 'Concluído' && item.executedCost && item.executedCost > 0 && !item.receiptLink ? "bg-yellow-50 dark:bg-yellow-900/20" : "bg-yellow-50/20 dark:bg-yellow-950/5")}>
                                          <div className="relative flex items-center gap-2">
                                            {isOverbudget && (
                                              <div data-tooltip={`Atenção: Este item ultrapassou ${formatCurrency(overbudgetDiff)} do valor previsto!`}>
                                                <AlertTriangle size={14} className="text-red-500 animate-pulse cursor-help flex-shrink-0" />
                                              </div>
                                            )}
                                            <input 
                                              type="number" 
                                              value={item.executedCost || ''} 
                                              onChange={e => handleUpdateItem(group.id, item.id, { executedCost: Number(e.target.value) })} 
                                              className={cn(
                                                "w-full rounded-lg py-1 px-2 text-right font-mono text-xs font-bold tabular-nums outline-none transition-all",
                                                isOverbudget
                                                  ? "bg-red-50/50 dark:bg-red-950/10 border border-red-300 dark:border-red-900/50 text-red-700 dark:text-red-400 focus:ring-2 focus:ring-red-500/20"
                                                  : "bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white focus:border-[#ff6b00] focus:ring-2 focus:ring-[#ff6b00]/20"
                                              )} 
                                              placeholder="0.00" 
                                            />
                                          </div>
                                        </td>
                                      );
                                    })()}
                                    <td className={cn("py-3 px-4 text-center transition-colors", project.status === 'Concluído' && item.executedCost && item.executedCost > 0 && !item.receiptLink ? "bg-yellow-50 dark:bg-yellow-900/20" : "")}>
                                      {project.status === 'Concluído' ? (
                                        <div className="flex items-center justify-center gap-2">
                                          {uploadingItemIds.has(item.id) ? (
                                            <div className="flex items-center gap-2">
                                              <Loader2 size={18} className="animate-spin text-[#ff6b00]" />
                                              <span className="text-[10px] font-bold text-zinc-400 animate-pulse">UPLOADING...</span>
                                            </div>
                                          ) : item.receiptLink ? (
                                            <>
                                              <button 
                                                onClick={() => window.open(item.receiptLink, '_blank')}
                                                className="p-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-500 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors shadow-sm"
                                                title="Ver anexo"
                                              >
                                                <Eye size={16} />
                                              </button>
                                              <button 
                                                onClick={() => handleDeleteAttachment(group.id, item.id, item.receiptLink!)}
                                                disabled={deletingItemIds.has(item.id)}
                                                className="p-1 text-red-400 hover:text-red-600 transition-colors disabled:opacity-50"
                                                title="Remover anexo"
                                              >
                                                {deletingItemIds.has(item.id)
                                                  ? <Loader2 size={14} className="animate-spin" />
                                                  : <Trash2 size={14} />}
                                              </button>
                                            </>
                                          ) : (
                                            <>
                                              <input
                                                type="file"
                                                id={`file-upload-${item.id}`}
                                                className="hidden"
                                                accept=".pdf,.jpg,.jpeg,.png"
                                                ref={(el) => fileInputRefs.current[item.id] = el}
                                                onChange={(e) => handleFileUpload(e, group.id, item.id, item.name || 'SemNome')}
                                              />
                                              <label
                                                htmlFor={`file-upload-${item.id}`}
                                                className="p-1.5 text-zinc-400 hover:text-[#ff6b00] hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg cursor-pointer transition-colors"
                                                title="Anexar comprovante"
                                              >
                                                <Paperclip size={18} />
                                              </label>
                                            </>
                                          )}
                                        </div>
                                      ) : (
                                        <div className="flex justify-center text-zinc-300 dark:text-zinc-700" title="Apenas orçamentos concluídos aceitam anexos">
                                          <Lock size={14} />
                                        </div>
                                      )}
                                    </td>
                                  </>
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
                                    <td colSpan={showFinancialControl ? 10 : 8} className="p-0 border-b border-zinc-200 dark:border-zinc-800">
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
                                            <span className="text-sm font-bold text-emerald-600 tabular-nums">+{formatCurrency(metrics.profitValue)}</span>
                                          </div>
                                          <div className="text-zinc-300 font-light text-2xl">+</div>
                                          <div className="flex flex-col gap-1">
                                            <span className="text-[9px] font-black uppercase text-blue-500 tracking-tighter">Imposto ({taxRate.toFixed(1)}%)</span>
                                            <span className="text-sm font-bold text-blue-600 tabular-nums">+{formatCurrency(metrics.taxValue)}</span>
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
        
        {/* FIM DA LISTA DE GRUPOS */}
        </div>
      </div>

      {/* ── CONTAINER DO RODAPÉ FIXO COMPLETO (Acordeons + Totais) ───────────── */}
      <div className="shrink-0 flex flex-col z-30 shadow-[0_-10px_40px_rgba(0,0,0,0.08)] print:hidden relative">
        
        {/* ACORDEON: ORDEM DE PAGAMENTOS (Topo) */}
        {project.status === 'Concluído' && paymentList.length > 0 && (
          <div className="bg-white dark:bg-[#1C1C1E] border-t border-zinc-200 dark:border-zinc-800 flex flex-col">
            <button
              type="button"
              onClick={() => setIsPaymentsExpanded(prev => !prev)}
              className="w-full flex items-center justify-between px-8 py-3 bg-zinc-50 dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 transition-colors focus:outline-none"
            >
              <div className="flex items-center gap-3">
                <motion.div animate={{ rotate: isPaymentsExpanded ? 90 : 0 }} transition={{ duration: 0.2 }}>
                  <ChevronRight size={16} className="text-zinc-400" />
                </motion.div>
                <h2 className="text-[10px] font-black uppercase tracking-widest text-zinc-700 dark:text-zinc-300">Ordem de Pagamentos</h2>
              </div>

              {!isPaymentsExpanded && (
                <div className="flex items-center gap-3 text-[10px] font-mono">
                  <span className="text-zinc-500 font-bold uppercase tracking-widest">Pagamentos de Terceiros:</span>
                  <span className="font-bold text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-800 px-2 py-0.5 rounded shadow-sm border border-zinc-200 dark:border-zinc-700">
                    {paymentList.length} {paymentList.length === 1 ? 'prestador' : 'prestadores'}
                  </span>
                  <span className="text-zinc-300 dark:text-zinc-700">|</span>
                  <span className="font-bold text-zinc-500 uppercase tracking-widest">Total a pagar:</span>
                  <span className="font-black text-zinc-900 dark:text-white tabular-nums">
                    {formatCurrency(paymentList.reduce((sum, r) => sum + r.amount, 0))}
                  </span>
                </div>
              )}
            </button>

            <AnimatePresence initial={false}>
              {isPaymentsExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  className="overflow-hidden border-t border-zinc-100 dark:border-zinc-800"
                >
                  <div className="max-h-[300px] overflow-y-auto bg-white dark:bg-[#1C1C1E]">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-zinc-50/95 dark:bg-zinc-900/95 backdrop-blur-sm z-10 shadow-sm">
                        <tr className="text-[9px] font-black uppercase tracking-widest text-zinc-400 border-b border-zinc-100 dark:border-zinc-800">
                          <th className="py-4 px-8 text-left">Recurso</th>
                          <th className="py-4 px-4 text-left">Função</th>
                          <th className="py-4 px-4 text-left">Chave PIX</th>
                          <th className="py-4 px-4 text-right">Valor a Pagar</th>
                          <th className="py-4 px-8 text-center w-32">Ação</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-50 dark:divide-zinc-900/50">
                        {paymentList.map(row => {
                          const isCopied = copiedPixId === row.id;
                          const hasPix = row.pix !== 'Não cadastrado';
                          return (
                            <tr key={row.id} className="hover:bg-zinc-50/60 dark:hover:bg-zinc-900/30 transition-colors">
                              <td className="py-3 px-8 font-black text-zinc-900 dark:text-white text-xs">{row.name}</td>
                              <td className="py-3 px-4 text-zinc-500 text-xs font-medium">{row.role}</td>
                              <td className="py-3 px-4">
                                <span className={cn(
                                  "font-mono text-xs px-2 py-0.5 rounded-md",
                                  hasPix
                                    ? "bg-[#ff6b00]/10 text-[#ff6b00] border border-[#ff6b00]/20"
                                    : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400 border border-zinc-200 dark:border-zinc-700 italic"
                                )}>
                                  {row.pix}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-right font-black font-mono text-zinc-900 dark:text-white tabular-nums">
                                {formatCurrency(row.amount)}
                              </td>
                              <td className="py-3 px-8 text-center">
                                <button
                                  onClick={() => handleCopyPix(row.id, row.pix)}
                                  disabled={!hasPix}
                                  title={hasPix ? `Copiar PIX: ${row.pix}` : 'PIX não cadastrado'}
                                  className={cn(
                                    "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all",
                                    isCopied
                                      ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/30"
                                      : hasPix
                                        ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 hover:border-[#ff6b00] hover:text-[#ff6b00]"
                                        : "bg-zinc-50 dark:bg-zinc-900/50 text-zinc-300 dark:text-zinc-600 cursor-not-allowed border border-transparent"
                                  )}
                                >
                                  {isCopied
                                    ? <><Check size={11} strokeWidth={3} /> Copiado!</>
                                    : <><Copy size={11} strokeWidth={2.5} /> Copiar PIX</>}
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="bg-zinc-50/50 dark:bg-zinc-900/30 border-t border-zinc-100 dark:border-zinc-800">
                          <td colSpan={3} className="py-4 px-8 text-[9px] font-black uppercase tracking-widest text-zinc-500">
                            Total a Pagar (Terceiros)
                          </td>
                          <td className="py-4 px-4 text-right font-black font-mono text-lg text-zinc-900 dark:text-white tabular-nums">
                            {formatCurrency(paymentList.reduce((sum, r) => sum + r.amount, 0))}
                          </td>
                          <td className="px-8" />
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* ACORDEON: SAÚDE FINANCEIRA (Meio) */}
        {showFinancialControl && (
          <div className="bg-white dark:bg-[#1C1C1E] border-t border-zinc-200 dark:border-zinc-800 flex flex-col">
            <button
              type="button"
              onClick={() => setIsFinancialHealthExpanded(prev => !prev)}
              className="w-full flex items-center justify-between px-8 py-3 bg-zinc-50 dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 transition-colors focus:outline-none"
            >
              <div className="flex items-center gap-3">
                <motion.div animate={{ rotate: isFinancialHealthExpanded ? 90 : 0 }} transition={{ duration: 0.2 }}>
                  <ChevronRight size={16} className="text-zinc-400" />
                </motion.div>
                <h2 className="text-[10px] font-black uppercase tracking-widest text-zinc-700 dark:text-zinc-300">Saúde Financeira</h2>
              </div>

              {!isFinancialHealthExpanded && (
                <div className="flex items-center gap-3 text-[10px] font-mono">
                  <span className={cn(
                    "px-2 py-0.5 rounded font-black uppercase tracking-wider",
                    healthMetrics.totalOverbudget > 0
                      ? "text-red-500 bg-red-50 dark:bg-red-950/30"
                      : "text-emerald-500 bg-emerald-50 dark:bg-emerald-950/30"
                  )}>
                    {healthMetrics.totalOverbudget > 0 ? "⚠ Atenção" : "✓ Dentro do previsto"}
                  </span>
                  <span className="text-zinc-300 dark:text-zinc-700">|</span>
                  <span className="font-bold text-zinc-500 uppercase tracking-widest">Lucro Real:</span>
                  <span className={cn("font-black tabular-nums", globals.lucroReal < 0 ? "text-red-500" : "text-emerald-500")}>
                    {formatCurrency(globals.lucroReal)}
                  </span>
                </div>
              )}
            </button>

            <AnimatePresence initial={false}>
              {isFinancialHealthExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  className="overflow-hidden border-t border-zinc-100 dark:border-zinc-800"
                >
                  <div className="p-8 bg-zinc-50/15 dark:bg-zinc-950/20 grid grid-cols-1 md:grid-cols-3 gap-6 max-h-[400px] overflow-y-auto">
                    {/* CARD 1: Margem Planejada vs. Realizada */}
                    <div className="bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-850 rounded-xl p-5 shadow-sm flex flex-col gap-4">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Margem Operacional</span>
                        {healthMetrics.realMarginPct >= (activeVersion.defaultMargin * 0.8)
                          ? <TrendingUp size={16} className="text-emerald-500" />
                          : <TrendingDown size={16} className="text-red-500" />}
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                          <span>Planejada</span>
                          <span className="font-mono font-bold text-xs tabular-nums text-zinc-500">
                            {formatCurrency(globals.totalCost * (activeVersion.defaultMargin / 100))} ({activeVersion.defaultMargin.toFixed(1)}%)
                          </span>
                        </div>
                        <div className="h-2.5 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-emerald-400 transition-all duration-700"
                            style={{ width: `${Math.min(activeVersion.defaultMargin, 100)}%` }}
                          />
                        </div>

                        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider mt-3"
                          style={{ color: healthMetrics.realMarginPct < activeVersion.defaultMargin * 0.8 ? '#ef4444' : '#10b981' }}>
                          <span>Realizada</span>
                          <span className="font-mono font-bold text-xs tabular-nums">
                            {formatCurrency(globals.lucroReal)} ({healthMetrics.realMarginPct.toFixed(1)}%)
                          </span>
                        </div>
                        <div className="h-2.5 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all duration-700",
                              healthMetrics.realMarginPct >= activeVersion.defaultMargin * 0.8
                                ? "bg-emerald-500"
                                : "bg-red-400"
                            )}
                            style={{ width: `${Math.max(0, Math.min(healthMetrics.realMarginPct, 100))}%` }}
                          />
                        </div>
                      </div>

                      <div className="flex items-end justify-between mt-auto pt-4 border-t border-zinc-100 dark:border-zinc-800">
                        <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">Lucro Real</span>
                        <span className={cn(
                          "font-black font-mono tabular-nums text-xl leading-none",
                          globals.lucroReal < 0 ? "text-red-500" : "text-emerald-500"
                        )}>
                          {formatCurrency(globals.lucroReal)}
                        </span>
                      </div>
                    </div>

                    {/* CARD 2: Estouro de Orçamento */}
                    <div className={cn(
                      "bg-white dark:bg-zinc-900/50 border rounded-xl p-5 shadow-sm flex flex-col gap-4 transition-colors",
                      healthMetrics.totalOverbudget > 0
                        ? "border-red-200 dark:border-red-900/50"
                        : "border-zinc-200 dark:border-zinc-850"
                    )}>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Desvio de Custo</span>
                        {healthMetrics.totalOverbudget > 0
                          ? <AlertTriangle size={16} className="text-red-500" />
                          : <ShieldCheck size={16} className="text-emerald-500" />}
                      </div>

                      {healthMetrics.totalOverbudget > 0 ? (
                        <>
                          <div className="flex flex-col">
                            <span className="text-[10px] text-red-500 font-bold uppercase tracking-wider mb-1">
                              🚨 {healthMetrics.overbudgetItems} {healthMetrics.overbudgetItems === 1 ? 'item' : 'itens'} acima do planejado
                            </span>
                            <span className="font-black font-mono text-3xl text-red-500 tabular-nums">
                              +{formatCurrency(healthMetrics.totalOverbudget)}
                            </span>
                            <span className="text-[10px] text-red-400 font-medium mt-1">além do previsto nos custos</span>
                          </div>
                          <div className="flex items-center gap-2 mt-auto pt-4 border-t border-red-100 dark:border-red-900/30">
                            <div className="w-2.5 h-2.5 rounded-full bg-red-400 animate-pulse" />
                            <span className="text-[10px] text-red-500 font-bold">Revise os itens executados em vermelho</span>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex flex-col">
                            <span className="text-[10px] text-emerald-500 font-bold uppercase tracking-wider mb-1">Execução dentro do orçado</span>
                            <span className="font-black font-mono text-3xl text-emerald-500 tabular-nums">
                              {formatCurrency(0)}
                            </span>
                            <span className="text-[10px] text-zinc-400 font-medium mt-1">nenhum item estourou o custo previsto</span>
                          </div>
                          <div className="flex items-center gap-2 mt-auto pt-4 border-t border-zinc-100 dark:border-zinc-800">
                            <ShieldCheck size={14} className="text-emerald-400" />
                            <span className="text-[10px] text-emerald-500 font-bold">Orçamento sob controle</span>
                          </div>
                        </>
                      )}
                    </div>

                    {/* CARD 3: Break-Even e Cobertura */}
                    <div className="bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-850 rounded-xl p-5 shadow-sm flex flex-col gap-4">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Break-Even</span>
                        <ShieldCheck size={16} className="text-blue-400" />
                      </div>

                      <div className="flex flex-col">
                        <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mb-1">Mínimo para não ter prejuízo</span>
                        <span className="font-black font-mono text-3xl text-blue-500 tabular-nums">
                          {formatCurrency(healthMetrics.breakEven)}
                        </span>
                        <span className="text-[10px] text-zinc-400 font-medium mt-1">
                          custo total + impostos = {formatCurrency(globals.totalCost)} + {formatCurrency(globals.totalTax)}
                        </span>
                      </div>

                      <div className="mt-auto pt-4 border-t border-zinc-100 dark:border-zinc-800 space-y-2">
                        <div className="flex justify-between text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                          <span>Execução vs. Break-Even</span>
                          <span>{healthMetrics.breakEven > 0 ? Math.min(100, (globals.totalExecuted / healthMetrics.breakEven) * 100).toFixed(0) : 0}%</span>
                        </div>
                        <div className="h-2.5 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all duration-700",
                              globals.totalExecuted > healthMetrics.breakEven ? "bg-red-400" : "bg-blue-400"
                            )}
                            style={{
                              width: `${healthMetrics.breakEven > 0
                                ? Math.min(100, (globals.totalExecuted / healthMetrics.breakEven) * 100)
                                : 0}%`
                            }}
                          />
                        </div>
                        <div className="flex justify-between text-[10px] text-zinc-400 font-medium">
                          <span>Executado: {formatCurrency(globals.totalExecuted)}</span>
                          <span className={cn(
                            "font-bold",
                            globals.totalExecuted > healthMetrics.breakEven ? "text-red-500" : "text-zinc-500"
                          )}>
                            {globals.totalExecuted > healthMetrics.breakEven ? "ACIMA" : "ABAIXO"} do break-even
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* BARRA PRINCIPAL DO RODAPÉ (Base) */}
        <div className="bg-white dark:bg-[#1C1C1E] border-t border-zinc-200 dark:border-zinc-800 px-8 py-4">
          <div className="max-w-[1400px] mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
               {/* Espaço reservado para ações secundárias ou breadcrumbs */}
            </div>
            
            <div className="flex items-center gap-8">
              <div className="flex flex-col items-end">
                <span className="text-[9px] font-black uppercase tracking-tighter text-zinc-400">Lucro Real (Executado)</span>
                <span className={cn("font-mono font-black text-xl tabular-nums", globals.lucroReal < 0 ? "text-red-500" : "text-emerald-500")}>
                  {formatCurrency(globals.lucroReal)}
                </span>
              </div>
              
              <div className="bg-[#ff6b00] px-8 py-4 rounded-2xl shadow-xl shadow-orange-500/30 flex flex-col items-end">
                <span className="text-[10px] font-black uppercase tracking-widest text-white/80 mb-1">Total da Proposta</span>
                <span className="font-mono font-black text-3xl text-white tabular-nums leading-none">{formatCurrency(globals.totalClient)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── MODAL: Salvar Recurso no Banco ───────────────────────────────── */}
      <AnimatePresence>
        {resourceToSave && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 8 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="w-full max-w-sm mx-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden"
            >
              {/* Header */}
              <div className="px-6 pt-6 pb-4 border-b border-zinc-100 dark:border-zinc-800">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-6 h-6 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
                        <UserPlus size={13} className="text-amber-600 dark:text-amber-400" />
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Novo Recurso</span>
                    </div>
                    <h3 className="text-base font-black text-zinc-900 dark:text-white">
                      Salvar <span className="text-amber-500">&ldquo;{resourceToSave.name}&rdquo;</span>
                    </h3>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      Como deseja cadastrar este recurso no banco de dados?
                    </p>
                  </div>
                  <button
                    onClick={() => setResourceToSave(null)}
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* Preview */}
              <div className="px-6 py-4 bg-zinc-50 dark:bg-zinc-800/40">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-zinc-400 font-semibold block mb-0.5">Cargo / Função</span>
                    <span className="font-bold text-zinc-700 dark:text-zinc-200">{resourceToSave.role || '—'}</span>
                  </div>
                  <div>
                    <span className="text-zinc-400 font-semibold block mb-0.5">Valor Unitário</span>
                    <span className="font-black text-[#ff6b00] font-mono">{formatCurrency(resourceToSave.unitCost)}</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="px-6 py-5 flex flex-col gap-2">
                <button
                  disabled={isSavingResource}
                  onClick={async () => {
                    setIsSavingResource(true);
                    try {
                      await addProfessional({
                        name: resourceToSave.name,
                        role: resourceToSave.role || '',
                        dailyRate: resourceToSave.unitCost,
                        pix: ''
                      });
                      setToastMessage(`✅ "${resourceToSave.name}" salvo como Profissional!`);
                      setResourceToSave(null);
                    } catch {
                      setToastMessage('Erro ao salvar profissional.');
                    } finally {
                      setIsSavingResource(false);
                    }
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#ff6b00] hover:bg-[#e55e00] disabled:opacity-50 disabled:cursor-not-allowed text-white font-black text-xs uppercase tracking-widest rounded-xl transition-colors shadow-lg shadow-orange-500/20"
                >
                  <UserPlus size={14} />
                  Salvar como Profissional
                </button>
                <button
                  disabled={isSavingResource}
                  onClick={async () => {
                    setIsSavingResource(true);
                    try {
                      await addEquipment({
                        name: resourceToSave.name,
                        category: resourceToSave.role || 'Geral',
                        rentalValue: resourceToSave.unitCost
                      });
                      setToastMessage(`✅ "${resourceToSave.name}" salvo como Equipamento!`);
                      setResourceToSave(null);
                    } catch {
                      setToastMessage('Erro ao salvar equipamento.');
                    } finally {
                      setIsSavingResource(false);
                    }
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-700 dark:text-zinc-200 font-black text-xs uppercase tracking-widest rounded-xl transition-colors"
                >
                  Salvar como Equipamento
                </button>
                <button
                  onClick={() => setResourceToSave(null)}
                  className="w-full py-2 text-xs text-zinc-400 hover:text-zinc-600 font-medium transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {(() => {
        const uniqueRoles = Array.from(new Set([
          ...professionals.map(p => p.role),
          ...equipments.map(e => e.category)
        ])).filter(Boolean);
        return (
          <datalist id="lista-banco-cargos">
            {uniqueRoles.map(role => <option key={role} value={role} />)}
          </datalist>
        );
      })()}
      <datalist id="lista-clientes">
        {clientes.map(c => <option key={c.id} value={c.nome} />)}
      </datalist>
      </div>

      {showOS && project && activeVersion && (
        <PropostaModal
          project={project}
          activeVersion={activeVersion}
          totalClient={globals.totalClient}
          clientName={clientes.find(c => c.id === project.clientId)?.nome || 'Cliente não encontrado'}
          onClose={() => setShowOS(false)}
        />
      )}
    </div>
  );
};
