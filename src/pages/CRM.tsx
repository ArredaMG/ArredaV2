import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  ChevronDown, 
  Calendar, 
  DollarSign, 
  AlertCircle, 
  Trash2, 
  Edit3, 
  CheckCircle2, 
  XCircle, 
  TrendingUp, 
  Users, 
  Loader2, 
  Sparkles, 
  FolderKanban,
  Lock,
  ExternalLink,
  UserPlus,
  Mail,
  MessageCircle,
  Instagram,
  Linkedin,
  Globe,
  X
} from 'lucide-react';
import { CreateProjectModal } from '../components/CreateProjectModal';
import { FileText } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { useAppContext } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';
import * as dbService from '../services/db-services';
import { Pipeline, Stage, Deal, Client, Template } from '../types';
import { calculateFinancials } from '../lib/project-utils';
import { cn } from '../lib/utils';

const detectContactType = (val: string) => {
  const value = val.trim().toLowerCase();
  if (value.includes('@') && value.includes('.com')) return 'email';
  const cleanPhone = value.replace(/[\s\-\+\(\)]/g, '');
  if (/^\d{8,15}$/.test(cleanPhone)) return 'whatsapp';
  if (value.includes('instagram.com') || val.trim().startsWith('@')) return 'instagram';
  if (value.includes('linkedin.com')) return 'linkedin';
  return 'website';
};

const getContactIcon = (type: string) => {
  switch (type) {
    case 'email': return <Mail size={12} className="text-zinc-500" />;
    case 'whatsapp': return <MessageCircle size={12} className="text-emerald-500" />;
    case 'instagram': return <Instagram size={12} className="text-pink-500" />;
    case 'linkedin': return <Linkedin size={12} className="text-blue-500" />;
    default: return <Globe size={12} className="text-teal-500" />;
  }
};

export const CRM: React.FC = () => {
  const { clientes, addProject, templates, refreshData, updateClient, projects } = useAppContext();
  const navigate = useNavigate();
  
  // Local state
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [currentPipelineId, setCurrentPipelineId] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSeeding, setIsSeeding] = useState<boolean>(false);
  
  // Drag states
  const [draggedDealId, setDraggedDealId] = useState<string | null>(null);
  const [draggedOverStageId, setDraggedOverStageId] = useState<string | null>(null);

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [selectedStageId, setSelectedStageId] = useState<string>('');
  const [isPipelineModalOpen, setIsPipelineModalOpen] = useState<boolean>(false);
  const [newPipelineName, setNewPipelineName] = useState<string>('');
  const [isEditPipelineModalOpen, setIsEditPipelineModalOpen] = useState<boolean>(false);
  const [editingPipelineId, setEditingPipelineId] = useState<string>('');
  const [editingPipelineName, setEditingPipelineName] = useState<string>('');
  
  // Form states
  const [dealTitle, setDealTitle] = useState<string>('');
  const [dealClientId, setDealClientId] = useState<string>('');
  const [dealValue, setDealValue] = useState<string>('');
  const [dealNextActionDate, setDealNextActionDate] = useState<string>('');
  const [dealStatus, setDealStatus] = useState<'open' | 'won' | 'lost'>('open');
  const [dealToCreateProject, setDealToCreateProject] = useState<Deal | null>(null);
  const [showCreateProjectModal, setShowCreateProjectModal] = useState(false);
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null);

  const [dealLossReason, setDealLossReason] = useState<string>('');
  const [dealNotes, setDealNotes] = useState<string>('');
  const [linkedDecisores, setLinkedDecisores] = useState<string[]>([]);
  const [newDecisorName, setNewDecisorName] = useState<string>('');
  const [newDecisorRole, setNewDecisorRole] = useState<string>('');
  const [newDecisorContact, setNewDecisorContact] = useState<string>('');
  const [isAddingNewDecisor, setIsAddingNewDecisor] = useState<boolean>(false);

  const [isStageModalOpen, setIsStageModalOpen] = useState(false);
  const [editingStage, setEditingStage] = useState<Stage | null>(null);
  const [stageNameInput, setStageNameInput] = useState('');

  // Load pipelines on mount
  const loadCRMData = async (shouldLoadSilence = false) => {
    if (!shouldLoadSilence) setIsLoading(true);
    try {
      const data = await dbService.fetchCRMData();
      
      if (data.length === 0) {
        // Need to run Seeder
        await seedDefaultPipeline();
      } else {
        setPipelines(data as Pipeline[]);
        // Select first pipeline if none selected
        if (!currentPipelineId && data[0]) {
          setCurrentPipelineId(data[0].id);
        }
      }
    } catch (error) {
      console.error('Error loading CRM Data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCRMData();
  }, []);

  // Seeder for default pipeline
  const seedDefaultPipeline = async () => {
    setIsSeeding(true);
    try {
      const pipelineId = uuidv4();
      
      // 1. Create Default Pipeline
      await dbService.createPipeline({
        id: pipelineId,
        name: 'Prospecção Padrão'
      });

      // 2. Create Default Stages
      const defaultStages = [
        { name: 'Lead Frio', color: '#3b82f6', order: 0 },
        { name: 'Reunião/Briefing', color: '#a855f7', order: 1 },
        { name: 'Proposta Enviada', color: '#ff6b00', order: 2 },
        { name: 'Em Negociação', color: '#eab308', order: 3 },
        { name: 'Ganho/Perdido', color: '#10b981', order: 4 },
      ];

      for (const stage of defaultStages) {
        await dbService.createStage({
          id: uuidv4(),
          pipelineId,
          name: stage.name,
          color: stage.color,
          order: stage.order
        });
      }

      // Reload CRM data
      const data = await dbService.fetchCRMData();
      setPipelines(data as Pipeline[]);
      setCurrentPipelineId(pipelineId);
    } catch (error) {
      console.error('Failed to seed default pipeline:', error);
    } finally {
      setIsSeeding(false);
    }
  };

  // Create custom pipeline with default stages
  const handleCreatePipeline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPipelineName.trim()) {
      alert('Preencha o nome do funil.');
      return;
    }

    const pipelineId = uuidv4();
    const newPipeline: Pipeline = {
      id: pipelineId,
      name: newPipelineName,
      stages: []
    };

    const defaultStages = [
      { name: 'Lead Frio', color: '#3b82f6', order: 0 },
      { name: 'Reunião/Briefing', color: '#a855f7', order: 1 },
      { name: 'Proposta Enviada', color: '#ff6b00', order: 2 },
      { name: 'Em Negociação', color: '#eab308', order: 3 },
      { name: 'Ganho/Perdido', color: '#10b981', order: 4 },
    ];

    // Optimistic Update
    const optimisticStages = defaultStages.map((stage, idx) => ({
      id: `opt-stage-${idx}-${pipelineId}`,
      pipelineId,
      name: stage.name,
      color: stage.color,
      order: stage.order,
      deals: []
    }));

    const optimisticPipeline: Pipeline = {
      ...newPipeline,
      stages: optimisticStages,
      deals: []
    };

    setPipelines(prev => [...prev, optimisticPipeline]);
    setCurrentPipelineId(pipelineId);
    setIsPipelineModalOpen(false);
    setNewPipelineName('');

    try {
      // 1. Save pipeline
      await dbService.createPipeline({
        id: pipelineId,
        name: newPipelineName
      });

      // 2. Save default stages
      for (const stage of defaultStages) {
        await dbService.createStage({
          id: uuidv4(),
          pipelineId,
          name: stage.name,
          color: stage.color,
          order: stage.order
        });
      }

      // Reload from database to get real IDs
      await loadCRMData(true);
    } catch (error) {
      console.error('Error creating new pipeline:', error);
      alert('Erro ao criar o funil no banco de dados.');
      loadCRMData();
    }
  };

  const handleUpdatePipeline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPipelineName.trim()) {
      alert('Preencha o nome do funil.');
      return;
    }

    const previousPipelines = [...pipelines];
    setPipelines(prev => prev.map(p => {
      if (p.id === editingPipelineId) {
        return { ...p, name: editingPipelineName };
      }
      return p;
    }));
    setIsEditPipelineModalOpen(false);

    try {
      await dbService.updatePipeline(editingPipelineId, editingPipelineName);
      await loadCRMData(true);
    } catch (error) {
      console.error('Error updating pipeline name:', error);
      alert('Erro ao atualizar o nome do funil no banco de dados.');
      setPipelines(previousPipelines);
    }
  };

  const handleDeletePipeline = async (pipelineId: string) => {
    const pipelineToDelete = pipelines.find(p => p.id === pipelineId);
    if (!pipelineToDelete) return;

    if (!confirm(`Deseja realmente excluir o funil "${pipelineToDelete.name}"? Isso excluirá todas as etapas e oportunidades associadas permanentemente!`)) {
      return;
    }

    const previousPipelines = [...pipelines];
    const remainingPipelines = pipelines.filter(p => p.id !== pipelineId);

    const nextPipeline = remainingPipelines[0];
    setPipelines(remainingPipelines);
    if (nextPipeline) {
      setCurrentPipelineId(nextPipeline.id);
    } else {
      setCurrentPipelineId('');
    }

    try {
      await dbService.deletePipeline(pipelineId);
      await loadCRMData(true);
    } catch (error) {
      console.error('Error deleting pipeline:', error);
      alert('Erro ao excluir o funil.');
      setPipelines(previousPipelines);
      setCurrentPipelineId(pipelineId);
    }
  };

  const activePipeline = pipelines.find(p => p.id === currentPipelineId);
  const sortedStages = activePipeline?.stages?.sort((a, b) => a.order - b.order) || [];

  // Helper to format currency
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
    }).format(val);
  };

  const getDealValue = (deal: Deal) => {
    if (deal.projectId) {
      const linkedProject = projects.find(p => p.id === deal.projectId);
      if (linkedProject) {
        return calculateFinancials(linkedProject).total;
      }
    }
    return deal.value;
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
    return value.startsWith('http') ? value : `https://${value}`;
  };

  // Drag and drop event handlers
  const handleDragStart = (e: React.DragEvent, dealId: string) => {
    setDraggedDealId(dealId);
    e.dataTransfer.setData('text/plain', dealId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, stageId: string) => {
    e.preventDefault();
    if (draggedOverStageId !== stageId) {
      setDraggedOverStageId(stageId);
    }
  };

  const handleDragLeave = () => {
    setDraggedOverStageId(null);
  };

  const handleDrop = async (e: React.DragEvent, targetStageId: string) => {
    e.preventDefault();
    const dealId = e.dataTransfer.getData('text/plain') || draggedDealId;
    
    setDraggedOverStageId(null);
    setDraggedDealId(null);

    if (!dealId) return;

    // Find the deal to see if it's actually changing stages
    const currentDeal = activePipeline?.deals?.find(d => d.id === dealId);
    if (!currentDeal || currentDeal.stageId === targetStageId) return;

    // Optimistic Update
    const previousPipelines = [...pipelines];
    setPipelines(prev => prev.map(p => {
      if (p.id !== currentPipelineId) return p;
      return {
        ...p,
        deals: p.deals?.map(d => d.id === dealId ? { ...d, stageId: targetStageId } : d)
      };
    }));

    try {
      await dbService.updateDealStage(dealId, targetStageId);
    } catch (error) {
      console.error('Failed to update deal stage in database:', error);
      // Rollback
      setPipelines(previousPipelines);
      alert('Erro ao mover a oportunidade. Tente novamente.');
    }
  };

  // Save new deal
  const handleCreateDeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dealTitle.trim() || !dealClientId) {
      alert('Preencha os campos obrigatórios.');
      return;
    }

    let value = 0;
    if (dealValue && dealValue.trim()) {
      value = parseFloat(dealValue.replace(/[^\d,.-]/g, '').replace(',', '.'));
      if (isNaN(value)) {
        alert('Insira um valor numérico válido.');
        return;
      }
    }

    const nextActionDate = dealNextActionDate ? new Date(dealNextActionDate) : null;
    const newDealId = uuidv4();

    const dealPayload = {
      id: newDealId,
      clientId: dealClientId,
      pipelineId: currentPipelineId,
      stageId: selectedStageId || sortedStages[0]?.id,
      title: dealTitle,
      value,
      projectId: dealToCreateProject?.id,
      status: 'open' as const,
      nextActionDate,
      lossReason: dealStatus === 'lost' ? dealLossReason : null,
      notes: dealNotes,
      linkedDecisores: linkedDecisores,
    };

    // Optimistic insert state
    const optimisticDeal: Deal = {
      ...dealPayload,
      nextActionDate: nextActionDate ? nextActionDate.toISOString() : null,
      client: clientes.find(c => c.id === dealClientId),
    };

    setPipelines(prev => prev.map(p => {
      if (p.id !== currentPipelineId) return p;
      return {
        ...p,
        deals: [...(p.deals || []), optimisticDeal]
      };
    }));

    setIsCreateModalOpen(false);
    resetForm();

    try {
      await dbService.createDeal(dealPayload);
      // Silence load to ensure database state
      await loadCRMData(true);
    } catch (error) {
      console.error('Error creating deal:', error);
      alert('Erro ao salvar oportunidade.');
      loadCRMData();
    }
  };

  // Update existing deal
  const handleUpdateDeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDeal) return;

    if (!dealTitle.trim()) {
      alert('Preencha os campos obrigatórios.');
      return;
    }

    let value = 0;
    if (dealValue && dealValue.toString().trim()) {
      value = parseFloat(dealValue.toString().replace(/[^\d,.-]/g, '').replace(',', '.'));
      if (isNaN(value)) {
        alert('Insira um valor numérico válido.');
        return;
      }
    }

    const nextActionDateStr = dealNextActionDate ? new Date(dealNextActionDate).toISOString() : null;

    const updates: Partial<Deal> = {
      title: dealTitle,
      value,
      status: dealStatus,
      nextActionDate: nextActionDateStr,
      clientId: dealClientId,
      lossReason: dealStatus === 'lost' ? dealLossReason : null,
      notes: dealNotes,
      linkedDecisores: linkedDecisores,
    };

    // Optimistic Update
    setPipelines(prev => prev.map(p => {
      if (p.id !== currentPipelineId) return p;
      return {
        ...p,
        deals: p.deals?.map(d => d.id === editingDeal.id ? { 
          ...d, 
          ...updates, 
          client: clientes.find(c => c.id === dealClientId) 
        } : d)
      };
    }));

    setIsEditModalOpen(false);
    setEditingDeal(null);
    resetForm();

    try {
      await dbService.updateDeal(editingDeal.id, updates);
      await loadCRMData(true);
    } catch (error) {
      console.error('Error updating deal:', error);
      alert('Erro ao salvar as alterações da oportunidade.');
      loadCRMData();
    }
  };
  // Delete a deal
  const handleDeleteDeal = async (dealId: string) => {
    if (!window.confirm('Deseja excluir esta oportunidade?')) return;
    try {
      await dbService.deleteDeal(dealId);
      await loadCRMData(true);
    } catch (error) {
      console.error('Error deleting deal:', error);
      alert('Erro ao excluir a oportunidade.');
    }
  };

  const handleSaveStage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stageNameInput.trim()) return;
    
    if (editingStage) {
      await dbService.updateStage(editingStage.id, stageNameInput);
    } else {
      const newOrder = sortedStages.length > 0 ? sortedStages[sortedStages.length - 1].order + 1 : 0;
      await dbService.createStage({
        id: uuidv4(),
        pipelineId: currentPipelineId,
        name: stageNameInput,
        color: '#9ca3af',
        order: newOrder
      });
    }
    setIsStageModalOpen(false);
    setStageNameInput('');
    setEditingStage(null);
    await loadCRMData(true);
  };

  const handleDeleteStage = async (id: string, name: string) => {
    if (!confirm(`Excluir a coluna "${name}"? Todas as oportunidades dentro dela serão PERDIDAS!`)) return;
    await dbService.deleteStage(id);
    await loadCRMData(true);
  };
  // Create a blank project from a deal
  const createBlankProjectFromDeal = async () => {
    if (!dealToCreateProject) return;
    const clientName = dealToCreateProject.client?.name || clientes.find(c => c.id === dealToCreateProject.clientId)?.name || 'Cliente Não Informado';
    const newProject = await addProject({
      title: dealToCreateProject.title,
      client: clientName,
      status: 'Pendente',
      defaultTax: 10,
      defaultMargin: 15,
      groups: []
    });
    await dbService.updateDeal(dealToCreateProject.id, { projectId: newProject.id });
    setShowCreateProjectModal(false);
    setDealToCreateProject(null);
    navigate(`/orcamentos/${newProject.id}`);
  };

  // Create a project from a template based on a deal
  const createFromTemplateFromDeal = async (selected: Template) => {
    if (!dealToCreateProject) return;
    const clientName = dealToCreateProject.client?.name || clientes.find(c => c.id === dealToCreateProject.clientId)?.name || 'Cliente Não Informado';
    const newProject = await addProject({
      title: `${dealToCreateProject.title} (Template: ${selected.name})`,
      client: clientName,
      status: 'Pendente',
      defaultTax: selected.data.defaultTax,
      defaultMargin: selected.data.defaultMargin,
      groups: selected.data.groups.map(g => ({
        ...g,
        id: uuidv4(),
        items: g.items.map(i => ({ ...i, id: uuidv4() }))
      }))
    });
    await dbService.updateDeal(dealToCreateProject.id, { projectId: newProject.id });
    setShowCreateProjectModal(false);
    setDealToCreateProject(null);
    navigate(`/orcamentos/${newProject.id}`);
  };

  // Open Edit Modal
  const openEditModal = (deal: Deal) => {
    setEditingDeal(deal);
    setDealTitle(deal.title);
    setDealClientId(deal.clientId);
    setDealValue(deal.value.toString());
    setDealStatus(deal.status);
    setDealLossReason(deal.lossReason || '');
    setDealNotes(deal.notes || '');
    setLinkedDecisores(deal.linkedDecisores || []);
    
    if (deal.nextActionDate) {
      const date = new Date(deal.nextActionDate);
      setDealNextActionDate(date.toISOString().split('T')[0]);
    } else {
      setDealNextActionDate('');
    }
    
    setIsEditModalOpen(true);
  };

  // Reset form helper
  const resetForm = () => {
    setDealTitle('');
    setDealClientId('');
    setDealValue('');
    setDealNextActionDate('');
    setDealStatus('open');
    setDealLossReason('');
    setDealNotes('');
    setLinkedDecisores([]);
    setNewDecisorName('');
    setNewDecisorRole('');
    setNewDecisorContact('');
    setIsAddingNewDecisor(false);
  };

  // Check if date is overdue
  const isDateOverdue = (dateStr?: string | Date | null) => {
    if (!dateStr) return false;
    const date = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  // Check if date is today
  const isDateToday = (dateStr?: string | Date | null) => {
    if (!dateStr) return false;
    const date = new Date(dateStr);
    const today = new Date();
    return date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();
  };

  // Aggregate stats
  const dealsList = activePipeline?.deals || [];
  const openDeals = dealsList.filter(d => d.status === 'open');
  const wonDeals = dealsList.filter(d => d.status === 'won');
  const lostDeals = dealsList.filter(d => d.status === 'lost');
  
  const totalPipelineValue = openDeals.reduce((sum, d) => sum + getDealValue(d), 0);
  const totalWonValue = wonDeals.reduce((sum, d) => sum + getDealValue(d), 0);
  const totalCardsCount = dealsList.length;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const radarDeals = openDeals.filter(d => {
    if (!d.nextActionDate) return false;
    const actionDate = new Date(d.nextActionDate);
    actionDate.setHours(0, 0, 0, 0);
    return actionDate <= today;
  }).sort((a, b) => new Date(a.nextActionDate!).getTime() - new Date(b.nextActionDate!).getTime());

  if (isLoading || isSeeding) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-gray-50 dark:bg-black text-gray-500">
        <Loader2 className="h-10 w-10 animate-spin text-[#ff6b00] mb-4" />
        <p className="text-sm font-medium animate-pulse">
          {isSeeding ? 'Configurando pipeline de vendas inicial...' : 'Carregando funil comercial...'}
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-gray-50 dark:bg-black overflow-hidden h-full">
      {/* Upper Navigation / Filters */}
      <header className="flex flex-col border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1C1C1E] p-6 z-10 space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-[#ff6b00]/10 flex items-center justify-center text-[#ff6b00]">
              <FolderKanban className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
                CRM / Gestão Comercial
              </h1>
              <p className="text-xs text-gray-500">
                Acompanhe e movimente suas oportunidades de vendas
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-auto">
            {/* Pipeline Dropdown selector with Create/Edit/Delete actions */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <select
                  value={currentPipelineId}
                  onChange={(e) => setCurrentPipelineId(e.target.value)}
                  className="appearance-none bg-gray-100 dark:bg-[#2C2C2E] text-gray-900 dark:text-white pl-4 pr-10 py-2.5 rounded-xl text-sm font-semibold border-none focus:ring-2 focus:ring-[#ff6b00] cursor-pointer hover:bg-gray-200 dark:hover:bg-[#3A3A3C] transition-all"
                >
                  {pipelines.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              </div>

              <button
                onClick={() => setIsPipelineModalOpen(true)}
                className="p-2.5 bg-gray-100 dark:bg-[#2C2C2E] hover:bg-gray-200 dark:hover:bg-[#3A3A3C] text-gray-700 dark:text-gray-300 rounded-xl transition-all"
                title="Criar Novo Funil"
              >
                <Plus className="h-4 w-4" />
              </button>

              <button
                onClick={() => {
                  if (activePipeline) {
                    setEditingPipelineId(activePipeline.id);
                    setEditingPipelineName(activePipeline.name);
                    setIsEditPipelineModalOpen(true);
                  }
                }}
                className="p-2.5 bg-gray-100 dark:bg-[#2C2C2E] hover:bg-gray-200 dark:hover:bg-[#3A3A3C] text-gray-700 dark:text-gray-300 rounded-xl transition-all"
                title="Renomear Funil Atual"
              >
                <Edit3 className="h-4 w-4" />
              </button>

              {pipelines.length > 1 && (
                <button
                  onClick={() => handleDeletePipeline(currentPipelineId)}
                  className="p-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl transition-all"
                  title="Excluir Funil Atual"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>

            <button
              onClick={() => {
                setSelectedStageId(sortedStages[0]?.id || '');
                setIsCreateModalOpen(true);
              }}
              className="flex items-center gap-2 bg-[#ff6b00] hover:bg-[#e05e00] text-white px-4 py-2.5 rounded-xl text-sm font-bold shadow-md hover:shadow-lg active:scale-95 transition-all"
            >
              <Plus className="h-4 w-4" />
              <span>Nova Oportunidade</span>
            </button>
          </div>
        </div>

        {/* Aggregated KPI Badges */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
          <div className="bg-gray-50 dark:bg-[#2C2C2E] border border-gray-100 dark:border-[#3A3A3C] rounded-2xl p-4 flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Em Negociação</span>
              <span className="text-lg font-extrabold text-gray-900 dark:text-white tabular-nums">
                {formatCurrency(totalPipelineValue)}
              </span>
            </div>
            <TrendingUp className="h-6 w-6 text-blue-500 opacity-80" />
          </div>

          <div className="bg-gray-50 dark:bg-[#2C2C2E] border border-gray-100 dark:border-[#3A3A3C] rounded-2xl p-4 flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Ganho (Fechados)</span>
              <span className="text-lg font-extrabold text-emerald-600 dark:text-emerald-500 tabular-nums">
                {formatCurrency(totalWonValue)}
              </span>
            </div>
            <CheckCircle2 className="h-6 w-6 text-emerald-500 opacity-80" />
          </div>

          <div className="bg-gray-50 dark:bg-[#2C2C2E] border border-gray-100 dark:border-[#3A3A3C] rounded-2xl p-4 flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Total de Oportunidades</span>
              <span className="text-lg font-extrabold text-gray-900 dark:text-white">
                {totalCardsCount} {totalCardsCount === 1 ? 'card' : 'cards'}
              </span>
            </div>
            <FolderKanban className="h-6 w-6 text-[#ff6b00] opacity-80" />
          </div>

          <div className="bg-gray-50 dark:bg-[#2C2C2E] border border-gray-100 dark:border-[#3A3A3C] rounded-2xl p-4 flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Clientes Vinculados</span>
              <span className="text-lg font-extrabold text-gray-900 dark:text-white">
                {clientes.length} {clientes.length === 1 ? 'cliente' : 'clientes'}
              </span>
            </div>
            <Users className="h-6 w-6 text-purple-500 opacity-80" />
          </div>
        </div>

        {/* Radar do Dia */}
        {radarDeals.length > 0 && (
          <div className="mt-6 pt-5 border-t border-gray-100 dark:border-[#3A3A3C]/50 animate-fadeIn">
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle className="h-5 w-5 text-red-500" />
              <h2 className="text-sm font-black uppercase tracking-widest text-gray-900 dark:text-white">
                Radar do Dia <span className="ml-1 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-2 py-0.5 rounded-full text-[10px]">{radarDeals.length}</span>
              </h2>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
              {radarDeals.map(deal => {
                const isOverdue = isDateOverdue(deal.nextActionDate);
                return (
                  <div 
                    key={`radar-${deal.id}`}
                    onClick={() => openEditModal(deal)}
                    className={cn(
                      "flex-shrink-0 w-64 p-3 rounded-xl border cursor-pointer hover:shadow-md transition-all flex flex-col gap-1.5",
                      isOverdue 
                        ? "bg-red-50/50 dark:bg-red-950/10 border-red-200 dark:border-red-900/30 hover:border-red-400" 
                        : "bg-amber-50/50 dark:bg-amber-950/10 border-amber-200 dark:border-amber-900/30 hover:border-amber-400"
                    )}
                  >
                    <div className="flex justify-between items-start">
                      <span className={cn("text-[9px] font-black uppercase tracking-widest", isOverdue ? "text-red-500" : "text-amber-600")}>
                        {isOverdue ? "Atrasado" : "Hoje"}
                      </span>
                      <span className="text-[10px] font-bold text-gray-500">{new Date(deal.nextActionDate!).toLocaleDateString('pt-BR')}</span>
                    </div>
                    <h4 className="text-sm font-bold text-gray-900 dark:text-white truncate">{deal.title}</h4>
                    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 truncate">
                      {deal.client?.name || clientes.find(c => c.id === deal.clientId)?.name || 'Sem Cliente'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </header>

      {/* Main Kanban Board (Scrollable Container) */}
      <div className="flex-1 overflow-x-auto p-6 scrollbar-thin">
        <div className="flex gap-5 h-full items-start min-w-[1200px] select-none pb-4">
          {sortedStages.map(stage => {
            const stageDeals = dealsList.filter(d => d.stageId === stage.id) || [];
            const stageTotalSum = stageDeals.reduce((sum, d) => sum + getDealValue(d), 0);
            const isDragTarget = draggedOverStageId === stage.id;

            return (
              <div 
                key={stage.id}
                className="w-80 flex-shrink-0 flex flex-col bg-white dark:bg-[#1C1C1E] border border-gray-200 dark:border-gray-800 rounded-2xl max-h-[calc(100vh-270px)] shadow-sm transition-all duration-200 h-full relative"
                style={{
                  borderTop: `4px solid ${stage.color}`
                }}
                onDragOver={(e) => handleDragOver(e, stage.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, stage.id)}
              >
                {/* Column Header */}
                <div className="p-4 flex items-center justify-between border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-[#252529]/30 rounded-t-2xl">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5">
                        <h2 className="text-sm font-bold text-gray-800 dark:text-gray-200">{stage.name}</h2>
                        <button onClick={() => { setEditingStage(stage); setStageNameInput(stage.name); setIsStageModalOpen(true); }} className="text-gray-400 hover:text-blue-500 ml-1" title="Renomear Coluna"><Edit3 className="w-3.5 h-3.5" /></button>
                        <button onClick={() => handleDeleteStage(stage.id, stage.name)} className="text-gray-400 hover:text-red-500" title="Excluir Coluna"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                      <span className="px-2 py-0.5 text-[11px] font-black rounded-full bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                        {stageDeals.length}
                      </span>
                    </div>
                    <span className="text-xs font-bold text-gray-400 dark:text-gray-500 block mt-1 tabular-nums">
                      {formatCurrency(stageTotalSum)}
                    </span>
                  </div>

                  <button
                    onClick={() => {
                      setSelectedStageId(stage.id);
                      setIsCreateModalOpen(true);
                    }}
                    className="p-1.5 hover:bg-gray-200 dark:hover:bg-[#2C2C2E] rounded-lg text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
                    title="Nova Oportunidade nesta Coluna"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>

                {/* Cards Container */}
                <div 
                  className={`flex-1 overflow-y-auto p-3.5 space-y-3 scrollbar-thin transition-colors duration-200 ${
                    isDragTarget ? 'bg-[#ff6b00]/5 dark:bg-[#ff6b00]/10 border-2 border-dashed border-[#ff6b00]/40 rounded-b-2xl' : ''
                  }`}
                  style={{ minHeight: '150px' }}
                >
                  {stageDeals.length === 0 ? (
                    <div className="h-full min-h-[200px] flex flex-col items-center justify-center text-center p-6 text-gray-400">
                      <FolderKanban className="h-8 w-8 stroke-[1.25] text-gray-300 dark:text-gray-700 mb-2" />
                      <span className="text-xs font-medium">Nenhum card aqui</span>
                    </div>
                  ) : (
                    stageDeals.map(deal => {
                      const dealClientName = deal.client?.name || 
                        clientes.find(c => c.id === deal.clientId)?.name || 
                        'Sem Cliente';

                      const overdue = isDateOverdue(deal.nextActionDate);
                      const isToday = isDateToday(deal.nextActionDate);

                      const clientRecord = clientes.find(c => c.id === deal.clientId);
                      const linkedDecisoresIds = deal.linkedDecisores || [];
                      const linkedDecisoresObjects = clientRecord?.decisores?.filter(d => linkedDecisoresIds.includes(d.id)) || [];

                      return (
                        <div
                          key={deal.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, deal.id)}
                          onClick={() => openEditModal(deal)}
                          className={cn(
                            "group rounded-xl p-4 cursor-grab active:cursor-grabbing transition-all hover:shadow-md border",
                            draggedDealId === deal.id ? "opacity-40 scale-95" : "",
                            overdue && deal.status === 'open'
                              ? "bg-red-50/30 dark:bg-red-950/10 border-red-300 dark:border-red-800 shadow-[0_0_10px_rgba(239,68,68,0.1)] hover:border-red-500"
                              : isToday && deal.status === 'open'
                                ? "bg-amber-50/30 dark:bg-amber-950/10 border-amber-300 dark:border-amber-800 hover:border-amber-500"
                                : "bg-gray-50 dark:bg-[#2C2C2E] border-gray-100 dark:border-[#3A3A3C] hover:border-[#ff6b00] dark:hover:border-[#ff6b00]"
                          )}
                        >
                          <div className="flex items-start justify-between gap-2">
                            {/* Client Tag */}
                            <span className="text-[10px] font-extrabold uppercase tracking-wide text-[#ff6b00] dark:text-[#ff8c00] truncate max-w-[150px]">
                              {dealClientName}
                            </span>
                            
                            {/* Status Pill */}
                            {deal.status !== 'open' && (
                              <span className={`px-2 py-0.5 text-[9px] font-bold rounded-md uppercase tracking-wider ${
                                deal.status === 'won' 
                                  ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' 
                                  : 'bg-red-500/10 text-red-500 border border-red-500/20'
                              }`}>
                                {deal.status === 'won' ? 'Ganho' : 'Perdido'}
                              </span>
                            )}
                          </div>

                          {/* Deal Title */}
                          <h3 className="text-sm font-bold text-gray-900 dark:text-white mt-1.5 leading-snug line-clamp-2">
                            {deal.title}
                          </h3>
                          {deal.status === 'lost' && deal.lossReason && (
                            <div className="mt-1.5 flex items-center gap-1 text-[9px] font-bold text-red-500/80 bg-red-500/10 px-2 py-0.5 rounded w-fit border border-red-500/20">
                              <AlertCircle className="w-3 h-3" />
                              <span className="truncate max-w-[180px]">{deal.lossReason}</span>
                            </div>
                          )}

                          {/* BRL Value */}
                          <div className="mt-3 flex items-center justify-between">
                            <span className={cn("text-base font-black tabular-nums", deal.status === 'won' ? 'text-emerald-500' : deal.status === 'lost' ? 'text-red-500' : 'text-amber-500 dark:text-amber-400')}>
                              {getDealValue(deal) > 0 ? formatCurrency(getDealValue(deal)) : 'A definir'}
                            </span>
                            
                            {/* Actions overlay visible on hover */}
                            <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openEditModal(deal);
                                }}
                                className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
                                title="Detalhes da Oportunidade"
                              >
                                <Edit3 className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteDeal(deal.id);
                                }}
                                className="p-1 hover:bg-red-500/10 rounded text-gray-400 hover:text-red-500"
                                title="Excluir Oportunidade"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if ((deal as any).projectId) {
                                    navigate('/orcamentos/' + (deal as any).projectId);
                                  } else {
                                    setDealToCreateProject(deal);
                                    setShowCreateProjectModal(true);
                                  }
                                }}
                                className="p-1 hover:bg-blue-500/10 rounded text-blue-400 hover:text-blue-500 transition-colors"
                                title={(deal as any).projectId ? "Ver Orçamento" : "Gerar Orçamento"}
                              >
                                <FileText className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Calendar / Action Date Alarm or Avatar Stack */}
                          {(deal.nextActionDate || linkedDecisoresObjects.length > 0) && (
                            <div className="mt-3 pt-3 border-t border-gray-100 dark:border-[#3A3A3C]/50 flex items-center gap-1.5">
                              {deal.nextActionDate && (
                                <>
                                  <Calendar className={`h-3.5 w-3.5 ${
                                    overdue ? 'text-red-500' : isToday ? 'text-amber-500' : 'text-gray-400'
                                  }`} />
                                  <span className={`text-[11px] font-bold ${
                                    overdue 
                                      ? 'text-red-500' 
                                      : isToday 
                                        ? 'text-amber-500' 
                                        : 'text-gray-500 dark:text-gray-400'
                                  }`}>
                                    {overdue ? 'Atrasado: ' : isToday ? 'Hoje: ' : ''}
                                    {new Date(deal.nextActionDate).toLocaleDateString('pt-BR')}
                                  </span>
                                  {overdue && (
                                    <AlertCircle className="h-3.5 w-3.5 text-red-500 ml-0.5 animate-pulse" />
                                  )}
                                </>
                              )}
                              
                              {/* Avatar Stack with linked decisores */}
                              {linkedDecisoresObjects.length > 0 && (
                                <div className="flex -space-x-1.5 overflow-hidden ml-auto">
                                  {linkedDecisoresObjects.slice(0, 3).map((decisor, idx) => {
                                    const nameParts = decisor.name.trim().split(' ');
                                    const initials = nameParts.length > 1 
                                      ? (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase()
                                      : (nameParts[0][0] || '').toUpperCase();
                                    const bgColors = [
                                      'bg-amber-50 text-white',
                                      'bg-indigo-50 text-white',
                                      'bg-rose-50 text-white',
                                      'bg-teal-50 text-white',
                                      'bg-purple-50 text-white',
                                    ];
                                    const colorClass = bgColors[idx % bgColors.length];
                                    return (
                                      <div 
                                        key={decisor.id} 
                                        className={cn(
                                          "inline-flex items-center justify-center h-5 w-5 rounded-full text-[9px] font-black border border-white dark:border-[#1C1C1E] shadow-sm select-none",
                                          colorClass
                                        )}
                                        title={`${decisor.name} - ${decisor.role}`}
                                      >
                                        {initials}
                                      </div>
                                    );
                                  })}
                                  {linkedDecisoresObjects.length > 3 && (
                                    <div 
                                      className="inline-flex items-center justify-center h-5 w-5 rounded-full text-[8px] font-black border border-white dark:border-[#1C1C1E] bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-400 shadow-sm"
                                      title={`${linkedDecisoresObjects.length - 3} mais`}
                                    >
                                      +{linkedDecisoresObjects.length - 3}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
          <button
            onClick={() => { setEditingStage(null); setStageNameInput(''); setIsStageModalOpen(true); }}
            className="w-80 flex-shrink-0 flex flex-col items-center justify-center bg-gray-50/50 dark:bg-[#1C1C1E]/50 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-2xl max-h-[calc(100vh-270px)] h-full min-h-[200px] text-gray-400 hover:text-[#ff6b00] hover:border-[#ff6b00] transition-all"
          >
            <Plus className="h-8 w-8 mb-2" />
            <span className="font-bold text-sm">Adicionar Estágio</span>
          </button>
        </div>
      </div>

      {/* Creation Deal Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white dark:bg-[#1C1C1E] border border-gray-200 dark:border-gray-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl scale-up">
            <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50/50 dark:bg-[#252529]/30">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-[#ff6b00]" />
                Nova Oportunidade
              </h2>
              <button 
                onClick={() => {
                  setIsCreateModalOpen(false);
                  resetForm();
                }}
                className="text-gray-400 hover:text-gray-900 dark:hover:text-white text-lg font-bold"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateDeal} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">
                  Cliente Vinculado *
                </label>
                <select
                  required
                  value={dealClientId}
                  onChange={(e) => setDealClientId(e.target.value)}
                  className="w-full bg-gray-100 dark:bg-[#2C2C2E] border-none text-gray-900 dark:text-white rounded-xl py-3 px-4 text-sm font-medium focus:ring-2 focus:ring-[#ff6b00]"
                >
                  <option value="">Selecione um cliente...</option>
                  {clientes.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">
                  Título da Oportunidade *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Comercial 30s ou Cobertura de Evento..."
                  value={dealTitle}
                  onChange={(e) => setDealTitle(e.target.value)}
                  className="w-full bg-gray-100 dark:bg-[#2C2C2E] border-none text-gray-900 dark:text-white placeholder-gray-400 rounded-xl py-3 px-4 text-sm font-medium focus:ring-2 focus:ring-[#ff6b00]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">
                    Valor Estimado (R$)
                  </label>
                  <input
                    type="text"
                    placeholder="0.000,00"
                    value={dealValue}
                    onChange={(e) => setDealValue(e.target.value)}
                    className="w-full bg-gray-100 dark:bg-[#2C2C2E] border-none text-gray-900 dark:text-white placeholder-gray-400 rounded-xl py-3 px-4 text-sm font-semibold focus:ring-2 focus:ring-[#ff6b00]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">
                    Próxima Ação
                  </label>
                  <input
                    type="date"
                    value={dealNextActionDate}
                    onChange={(e) => setDealNextActionDate(e.target.value)}
                    className="w-full bg-gray-100 dark:bg-[#2C2C2E] border-none text-gray-900 dark:text-white rounded-xl py-3 px-4 text-sm font-medium focus:ring-2 focus:ring-[#ff6b00]"
                  />
                </div>
              </div>

              <div className="pt-4 flex gap-3 border-t border-gray-100 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreateModalOpen(false);
                    resetForm();
                  }}
                  className="flex-1 bg-gray-100 dark:bg-[#2C2C2E] hover:bg-gray-200 dark:hover:bg-[#3A3A3C] text-gray-800 dark:text-white py-3 rounded-xl text-sm font-semibold transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-[#ff6b00] hover:bg-[#e05e00] text-white py-3 rounded-xl text-sm font-bold shadow-md transition-colors"
                >
                  Criar Card
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Editing Deal Modal */}
      {isEditModalOpen && editingDeal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white dark:bg-[#1C1C1E] border border-gray-200 dark:border-gray-800 rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl scale-up flex flex-col max-h-[90vh]">
            
            <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50/50 dark:bg-[#252529]/30 shrink-0">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Edit3 className="h-5 w-5 text-[#ff6b00]" />
                Detalhes da Oportunidade e Cliente
              </h2>
              <button onClick={() => { setIsEditModalOpen(false); setEditingDeal(null); resetForm(); }} className="text-gray-400 hover:text-gray-900 dark:hover:text-white text-lg font-bold">&times;</button>
            </div>

            <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
              {/* Lado Esquerdo: Negociação */}
              <div className="flex-1 p-6 overflow-y-auto space-y-5 border-r border-gray-100 dark:border-gray-800">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-black uppercase tracking-widest text-gray-400">Dados da Negociação</h3>
                  {editingDeal.projectId ? (
                    <button type="button" onClick={() => navigate('/orcamentos/' + editingDeal.projectId)} className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 px-3 py-1.5 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors">
                      <ExternalLink size={12} /> Ver Orçamento
                    </button>
                  ) : (
                    <button type="button" onClick={() => { setDealToCreateProject(editingDeal); setShowCreateProjectModal(true); setIsEditModalOpen(false); }} className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest bg-[#ff6b00]/10 text-[#ff6b00] px-3 py-1.5 rounded-lg hover:bg-[#ff6b00]/20 transition-colors border border-[#ff6b00]/20">
                      <FileText size={12} /> Gerar Orçamento
                    </button>
                  )}
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Título da Oportunidade *</label>
                  <input type="text" required value={dealTitle} onChange={(e) => setDealTitle(e.target.value)} className="w-full bg-gray-100 dark:bg-[#2C2C2E] border-none text-gray-900 dark:text-white rounded-xl py-3 px-4 text-sm font-medium focus:ring-2 focus:ring-[#ff6b00]" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Valor (R$)</label>
                    <div className="relative">
                      <input type="text" value={dealValue} onChange={(e) => setDealValue(e.target.value)} disabled={!!editingDeal.projectId} className={cn("w-full border-none rounded-xl py-3 px-4 text-sm font-semibold focus:ring-2 focus:ring-[#ff6b00]", editingDeal.projectId ? "bg-gray-200 dark:bg-gray-800 text-gray-500 cursor-not-allowed" : "bg-gray-100 dark:bg-[#2C2C2E] text-gray-900 dark:text-white")} />
                      {editingDeal.projectId && <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" title="Sincronizado com Orçamento" />}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Próxima Ação</label>
                    <input type="date" value={dealNextActionDate} onChange={(e) => setDealNextActionDate(e.target.value)} className="w-full bg-gray-100 dark:bg-[#2C2C2E] border-none text-gray-900 dark:text-white rounded-xl py-3 px-4 text-sm font-medium focus:ring-2 focus:ring-[#ff6b00]" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Anotações da Negociação</label>
                  <textarea rows={3} placeholder="Dores do cliente, resumo da reunião..." value={dealNotes} onChange={(e) => setDealNotes(e.target.value)} className="w-full bg-gray-100 dark:bg-[#2C2C2E] border-none text-gray-900 dark:text-white rounded-xl py-3 px-4 text-sm font-medium focus:ring-2 focus:ring-[#ff6b00] resize-none"></textarea>
                </div>

                <div className="border-t border-gray-100 dark:border-gray-800 pt-4">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Estágio Comercial</label>
                  <div className="grid grid-cols-3 gap-2">
                    <button type="button" onClick={() => setDealStatus('open')} className={`py-2 px-3 text-xs font-bold rounded-xl border text-center transition-all ${dealStatus === 'open' ? 'bg-amber-500/10 text-amber-500 border-amber-500' : 'bg-transparent border-gray-200 dark:border-gray-800 text-gray-400 hover:border-gray-400'}`}>Em Negociação</button>
                    <button type="button" onClick={() => setDealStatus('won')} className={`py-2 px-3 text-xs font-bold rounded-xl border text-center transition-all ${dealStatus === 'won' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500' : 'bg-transparent border-gray-200 dark:border-gray-800 text-gray-400 hover:border-gray-400'}`}>Ganho</button>
                    <button type="button" onClick={() => setDealStatus('lost')} className={`py-2 px-3 text-xs font-bold rounded-xl border text-center transition-all ${dealStatus === 'lost' ? 'bg-red-500/10 text-red-500 border-red-500' : 'bg-transparent border-gray-200 dark:border-gray-800 text-gray-400 hover:border-gray-400'}`}>Perdido</button>
                  </div>
                  {dealStatus === 'lost' && (
                    <div className="mt-3 p-3 bg-red-50/50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 rounded-xl animate-fadeIn">
                      <label className="block text-[10px] font-bold text-red-500 uppercase tracking-wide mb-1">Motivo da Perda *</label>
                      <select required value={dealLossReason} onChange={(e) => setDealLossReason(e.target.value)} className="w-full bg-white dark:bg-[#1C1C1E] border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-400 rounded-lg py-2 px-3 text-xs font-bold outline-none focus:ring-2 focus:ring-red-500/20">
                        <option value="">Selecione o motivo...</option>
                        <option value="Preço alto">Preço alto</option>
                        <option value="Perdemos para a concorrência">Perdemos para a concorrência</option>
                        <option value="Prazo incompatível">Prazo incompatível</option>
                        <option value="Cliente sumiu / Sem resposta">Cliente sumiu / Sem resposta</option>
                        <option value="Projeto cancelado">Projeto cancelado</option>
                        <option value="Outros">Outros</option>
                      </select>
                    </div>
                  )}
                </div>
              </div>

              {/* Lado Direito: Perfil do Cliente & Contatos */}
              {(() => {
                const currentClient = clientes.find(c => c.id === dealClientId);
                const clientDecisores = currentClient?.decisores || [];
                const linkedDecisoresObjects = clientDecisores.filter(d => linkedDecisores.includes(d.id));
                const unlinkedDecisores = clientDecisores.filter(d => !linkedDecisores.includes(d.id));

                const handleUpdateClientDecisor = async (decisorId: string, updates: Partial<{ name: string; role: string; contacts: { type: string; value: string }[] }>) => {
                  if (!currentClient) return;
                  const updatedDecisores = clientDecisores.map(d => {
                    if (d.id === decisorId) {
                      return { ...d, ...updates };
                    }
                    return d;
                  });
                  try {
                    await updateClient(currentClient.id, { decisores: updatedDecisores });
                  } catch (error) {
                    console.error('Error updating client decisor:', error);
                  }
                };

                return (
                  <div className="w-full md:w-96 bg-gray-50 dark:bg-[#1C1C1E]/50 p-6 overflow-y-auto space-y-5 flex flex-col justify-between border-l border-gray-100 dark:border-gray-800">
                    <div className="space-y-5">
                      <div>
                        <h3 className="text-sm font-black uppercase tracking-widest text-gray-400 mb-4">Vínculo Comercial</h3>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1">Empresa Vinculada *</label>
                        <select required value={dealClientId} onChange={(e) => setDealClientId(e.target.value)} className="w-full bg-white dark:bg-[#2C2C2E] border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-xl py-3 px-4 text-sm font-medium focus:ring-2 focus:ring-[#ff6b00]">
                          <option value="">Selecione um cliente...</option>
                          {clientes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      </div>

                      {dealClientId && currentClient && (
                        <div className="border-t border-gray-200 dark:border-gray-800 pt-4">
                          <h3 className="text-sm font-black uppercase tracking-widest text-gray-400 mb-3">Decisores desta Negociação</h3>
                          
                          {/* VINCULAR DECISOR EXISTENTE (Dropdown Notion-style) */}
                          {unlinkedDecisores.length > 0 && (
                            <div className="mb-4 animate-fadeIn">
                              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1">Vincular Decisor Existente</label>
                              <select 
                                value=""
                                onChange={(e) => {
                                  const selectedId = e.target.value;
                                  if (selectedId && !linkedDecisores.includes(selectedId)) {
                                    setLinkedDecisores(prev => [...prev, selectedId]);
                                  }
                                }}
                                className="w-full bg-white dark:bg-[#2C2C2E] border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-xl py-2.5 px-3.5 text-xs font-semibold focus:ring-2 focus:ring-[#ff6b00]"
                              >
                                <option value="">Selecione um decisor cadastrado...</option>
                                {unlinkedDecisores.map(d => (
                                  <option key={d.id} value={d.id}>{d.name} ({d.role || 'Sem Cargo'})</option>
                                ))}
                              </select>
                            </div>
                          )}

                          {/* LISTA DOS DECISORES VINCULADOS COM VISUALIZAÇÃO HIGIENIZADA */}
                          <div className="flex flex-col gap-3 mb-4">
                            {linkedDecisoresObjects.length === 0 ? (
                              <div className="text-center p-6 border border-dashed border-gray-200 dark:border-gray-800 rounded-xl text-gray-400">
                                <span className="text-xs">Nenhum decisor vinculado a esta negociação.</span>
                              </div>
                            ) : (
                              linkedDecisoresObjects.map((person) => (
                                <div key={person.id} className="bg-white dark:bg-[#2C2C2E] border border-gray-200 dark:border-gray-700 p-3.5 rounded-xl flex flex-col gap-2 shadow-sm transition-all">
                                  
                                  {/* EXIBIÇÃO DE NOME E CARGO SEM EDIÇÃO INLINE */}
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex flex-col flex-1">
                                      <span className="font-bold text-sm text-gray-900 dark:text-white">{person.name}</span>
                                      <span className="text-[10px] font-black uppercase tracking-wider text-[#ff6b00] mt-0.5">{person.role || 'Sem Cargo'}</span>
                                    </div>
                                    <button 
                                      type="button" 
                                      onClick={() => setLinkedDecisores(prev => prev.filter(id => id !== person.id))} 
                                      className="text-gray-400 hover:text-red-500 p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                      title="Remover Vínculo desta Oportunidade"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </div>

                                  {/* LISTA DE CONTATOS DO DECISOR COMO BADGES ACIONÁVEIS */}
                                  {person.contacts && person.contacts.length > 0 ? (
                                    <div className="flex flex-wrap gap-1.5 mt-1">
                                      {person.contacts.map((c: any, cIdx: number) => (
                                        <a 
                                          key={cIdx} 
                                          href={c.type === 'whatsapp' ? `https://wa.me/${c.value.replace(/\D/g, '')}` : c.type === 'email' ? `mailto:${c.value}` : '#'} 
                                          target="_blank" 
                                          rel="noopener noreferrer" 
                                          className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-gray-50 dark:bg-[#1C1C1E] border border-gray-200 dark:border-gray-800 text-[10px] font-medium text-gray-700 dark:text-gray-300 hover:text-[#ff6b00] hover:border-[#ff6b00]/30 transition-all truncate"
                                        >
                                          {getContactIcon(c.type)}
                                          <span className="truncate max-w-[120px]">{c.value}</span>
                                        </a>
                                      ))}
                                    </div>
                                  ) : (
                                    <span className="text-[10px] text-gray-400 italic">Nenhum meio de contato registrado.</span>
                                  )}
                                </div>
                              ))
                            )}
                          </div>

                          {/* QUICK FORM: CRIAR NOVO DECISOR DIRETAMENTE NO CLIENTE */}
                          {isAddingNewDecisor ? (
                            <div className="bg-gray-100 dark:bg-[#2C2C2E]/40 border border-gray-200 dark:border-gray-800 p-4 rounded-xl space-y-3 animate-fadeIn">
                              <h4 className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Novo Decisor para {currentClient.name}</h4>
                              <div className="space-y-2.5">
                                <div>
                                  <label className="block text-[9px] font-bold text-gray-400 uppercase mb-1">Nome *</label>
                                  <input 
                                    type="text"
                                    value={newDecisorName}
                                    onChange={(e) => setNewDecisorName(e.target.value)}
                                    placeholder="Nome completo"
                                    className="w-full bg-white dark:bg-[#2C2C2E] border border-gray-200 dark:border-gray-700 rounded-lg py-1.5 px-2.5 text-xs text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:ring-1 focus:ring-[#ff6b00]"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[9px] font-bold text-gray-400 uppercase mb-1">Cargo *</label>
                                  <input 
                                    type="text"
                                    value={newDecisorRole}
                                    onChange={(e) => setNewDecisorRole(e.target.value)}
                                    placeholder="Ex: CEO, Gerente..."
                                    className="w-full bg-white dark:bg-[#2C2C2E] border border-gray-200 dark:border-gray-700 rounded-lg py-1.5 px-2.5 text-xs text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:ring-1 focus:ring-[#ff6b00]"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[9px] font-bold text-gray-400 uppercase mb-1">Contato (E-mail ou WhatsApp)</label>
                                  <input 
                                    type="text"
                                    value={newDecisorContact}
                                    onChange={(e) => setNewDecisorContact(e.target.value)}
                                    placeholder="Ex: cel@whats.com ou @insta"
                                    className="w-full bg-white dark:bg-[#2C2C2E] border border-gray-200 dark:border-gray-700 rounded-lg py-1.5 px-2.5 text-xs text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:ring-1 focus:ring-[#ff6b00]"
                                  />
                                </div>
                              </div>
                              
                              <div className="flex gap-2 pt-1.5">
                                <button 
                                  type="button" 
                                  onClick={() => {
                                    setNewDecisorName('');
                                    setNewDecisorRole('');
                                    setNewDecisorContact('');
                                    setIsAddingNewDecisor(false);
                                  }} 
                                  className="flex-1 py-1.5 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 py-1.5 rounded-lg text-xs font-bold transition-colors"
                                >
                                  Cancelar
                                </button>
                                <button 
                                  type="button" 
                                  onClick={async () => {
                                    if (!newDecisorName.trim() || !newDecisorRole.trim()) {
                                      alert('Preencha Nome e Cargo do novo decisor.');
                                      return;
                                    }
                                    const decisorId = uuidv4();
                                    const newDecisorObj = {
                                      id: decisorId,
                                      name: newDecisorName.trim(),
                                      role: newDecisorRole.trim(),
                                      contacts: newDecisorContact.trim() ? [{ type: detectContactType(newDecisorContact), value: newDecisorContact.trim() }] : []
                                    };
                                    const updatedDecisores = [...clientDecisores, newDecisorObj];
                                    try {
                                      await updateClient(currentClient.id, { decisores: updatedDecisores });
                                      setLinkedDecisores(prev => {
                                        if (prev.includes(decisorId)) return prev;
                                        return [...prev, decisorId];
                                      });
                                      setNewDecisorName('');
                                      setNewDecisorRole('');
                                      setNewDecisorContact('');
                                      setIsAddingNewDecisor(false);
                                    } catch (error) {
                                      console.error('Error creating decisor:', error);
                                      alert('Erro ao criar decisor.');
                                    }
                                  }} 
                                  className="flex-1 py-1.5 bg-[#ff6b00] hover:bg-[#e05e00] text-white rounded-lg text-xs font-bold transition-colors shadow-sm"
                                >
                                  Salvar &amp; Vincular
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button 
                              type="button" 
                              onClick={() => setIsAddingNewDecisor(true)} 
                              className="w-full flex items-center justify-center gap-2 p-3 border border-dashed border-gray-300 dark:border-gray-700 rounded-xl text-xs font-bold text-gray-500 hover:text-[#ff6b00] hover:border-[#ff6b00] hover:bg-[#ff6b00]/5 transition-all"
                            >
                              <UserPlus size={14} /> Novo Decisor
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>

            <div className="px-6 py-4 bg-gray-50/50 dark:bg-[#252529]/30 border-t border-gray-100 dark:border-gray-800 flex gap-3 shrink-0">
              <button type="button" onClick={() => { handleDeleteDeal(editingDeal.id); setIsEditModalOpen(false); setEditingDeal(null); resetForm(); }} className="px-4 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center" title="Excluir Oportunidade"><Trash2 className="h-4 w-4" /></button>
              <button type="button" onClick={() => { setIsEditModalOpen(false); setEditingDeal(null); resetForm(); }} className="flex-1 bg-gray-100 dark:bg-[#2C2C2E] hover:bg-gray-200 dark:hover:bg-[#3A3A3C] text-gray-800 dark:text-white py-3 rounded-xl text-sm font-semibold transition-colors">Cancelar</button>
              <button type="button" onClick={handleUpdateDeal} className="flex-1 bg-[#ff6b00] hover:bg-[#e05e00] text-white py-3 rounded-xl text-sm font-bold shadow-md transition-colors">Salvar Alterações</button>
            </div>
          </div>
        </div>
      )}

      {/* Creation Pipeline Modal */}
      {isPipelineModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white dark:bg-[#1C1C1E] border border-gray-200 dark:border-gray-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl scale-up">
            <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50/50 dark:bg-[#252529]/30">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-[#ff6b00]" />
                Novo Funil de Vendas
              </h2>
              <button 
                onClick={() => {
                  setIsPipelineModalOpen(false);
                  setNewPipelineName('');
                }}
                className="text-gray-400 hover:text-gray-900 dark:hover:text-white text-lg font-bold"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreatePipeline} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">
                  Nome do Funil de Vendas *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Eventos, Corporativo, Parcerias..."
                  value={newPipelineName}
                  onChange={(e) => setNewPipelineName(e.target.value)}
                  className="w-full bg-gray-100 dark:bg-[#2C2C2E] border-none text-gray-900 dark:text-white placeholder-gray-400 rounded-xl py-3 px-4 text-sm font-medium focus:ring-2 focus:ring-[#ff6b00]"
                />
              </div>

              <div className="pt-4 flex gap-3 border-t border-gray-100 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => {
                    setIsPipelineModalOpen(false);
                    setNewPipelineName('');
                  }}
                  className="flex-1 bg-gray-100 dark:bg-[#2C2C2E] hover:bg-gray-200 dark:hover:bg-[#3A3A3C] text-gray-800 dark:text-white py-3 rounded-xl text-sm font-semibold transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-[#ff6b00] hover:bg-[#e05e00] text-white py-3 rounded-xl text-sm font-bold shadow-md transition-colors"
                >
                  Criar Funil
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Pipeline Modal */}
      {isEditPipelineModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white dark:bg-[#1C1C1E] border border-gray-200 dark:border-gray-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl scale-up">
            <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50/50 dark:bg-[#252529]/30">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-[#ff6b00]" />
                Renomear Funil de Vendas
              </h2>
              <button 
                onClick={() => {
                  setIsEditPipelineModalOpen(false);
                  setEditingPipelineName('');
                  setEditingPipelineId('');
                }}
                className="text-gray-400 hover:text-gray-900 dark:hover:text-white text-lg font-bold"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleUpdatePipeline} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">
                  Nome do Funil de Vendas *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Eventos, Corporativo, Parcerias..."
                  value={editingPipelineName}
                  onChange={(e) => setEditingPipelineName(e.target.value)}
                  className="w-full bg-gray-100 dark:bg-[#2C2C2E] border-none text-gray-900 dark:text-white placeholder-gray-400 rounded-xl py-3 px-4 text-sm font-medium focus:ring-2 focus:ring-[#ff6b00]"
                />
              </div>

              <div className="pt-4 flex gap-3 border-t border-gray-100 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditPipelineModalOpen(false);
                    setEditingPipelineName('');
                    setEditingPipelineId('');
                  }}
                  className="flex-1 bg-gray-100 dark:bg-[#2C2C2E] hover:bg-gray-200 dark:hover:bg-[#3A3A3C] text-gray-800 dark:text-white py-3 rounded-xl text-sm font-semibold transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-[#ff6b00] hover:bg-[#e05e00] text-white py-3 rounded-xl text-sm font-bold shadow-md transition-colors"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Create Project Modal */}
      <CreateProjectModal
        isOpen={showCreateProjectModal}
        onClose={() => {
          setShowCreateProjectModal(false);
          setDealToCreateProject(null);
        }}
        templates={templates}
        onCreateBlank={createBlankProjectFromDeal}
        onCreateFromTemplate={createFromTemplateFromDeal}
      />

      {/* Stage Modal */}
      {isStageModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white dark:bg-[#1C1C1E] border border-gray-200 dark:border-gray-800 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl scale-up">
            <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                {editingStage ? 'Renomear Coluna' : 'Nova Coluna'}
              </h2>
              <button onClick={() => setIsStageModalOpen(false)} className="text-gray-400 hover:text-gray-900 dark:hover:text-white text-lg font-bold">&times;</button>
            </div>
            <form onSubmit={handleSaveStage} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Nome da Coluna *</label>
                <input type="text" required value={stageNameInput} onChange={(e) => setStageNameInput(e.target.value)} className="w-full bg-gray-100 dark:bg-[#2C2C2E] border-none text-gray-900 dark:text-white rounded-xl py-3 px-4 text-sm font-medium focus:ring-2 focus:ring-[#ff6b00]" placeholder="Ex: Contrato Assinado" />
              </div>
              <div className="pt-2 flex gap-3">
                <button type="button" onClick={() => setIsStageModalOpen(false)} className="flex-1 bg-gray-100 dark:bg-[#2C2C2E] text-gray-800 dark:text-white py-3 rounded-xl text-sm font-semibold">Cancelar</button>
                <button type="submit" className="flex-1 bg-[#ff6b00] text-white py-3 rounded-xl text-sm font-bold shadow-md">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CRM;
