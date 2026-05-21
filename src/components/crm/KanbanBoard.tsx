import React from 'react';
import { Plus, Edit3, Trash2, FolderKanban } from 'lucide-react';
import { cn } from '../../lib/utils';
import DealCard from './DealCard';
import { Pipeline, Stage, Deal, Client } from '../../types';

export interface KanbanBoardProps {
  sortedStages: Stage[];
  dealsList: Deal[];
  draggedOverStageId: string | null;
  draggedDealId: string | null;
  clientes: Client[];
  
  getDealValue: (deal: Deal) => number;
  formatCurrency: (value: number) => string;
  isDateOverdue: (dateStr?: string | Date | null) => boolean;
  isDateToday: (dateStr?: string | Date | null) => boolean;
  
  handleDragOver: (e: React.DragEvent, stageId: string) => void;
  handleDragLeave: () => void;
  handleDrop: (e: React.DragEvent, stageId: string) => void;
  handleDragStart: (e: React.DragEvent, dealId: string) => void;
  
  setEditingStage: (stage: Stage | null) => void;
  setStageNameInput: (name: string) => void;
  setIsStageModalOpen: (open: boolean) => void;
  handleDeleteStage: (id: string, name: string) => void;
  
  setSelectedStageId: (stageId: string) => void;
  setIsCreateModalOpen: (open: boolean) => void;
  
  openEditModal: (deal: Deal) => void;
  handleDeleteDeal: (dealId: string) => void;
  navigate: (path: string) => void;
  setDealToCreateProject: (deal: Deal) => void;
  setShowCreateProjectModal: (show: boolean) => void;
}

const KanbanBoard: React.FC<KanbanBoardProps> = ({
  sortedStages,
  dealsList,
  draggedOverStageId,
  draggedDealId,
  clientes,
  getDealValue,
  formatCurrency,
  isDateOverdue,
  isDateToday,
  handleDragOver,
  handleDragLeave,
  handleDrop,
  handleDragStart,
  setEditingStage,
  setStageNameInput,
  setIsStageModalOpen,
  handleDeleteStage,
  setSelectedStageId,
  setIsCreateModalOpen,
  openEditModal,
  handleDeleteDeal,
  navigate,
  setDealToCreateProject,
  setShowCreateProjectModal,
}) => {
  return (
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
                  isDragTarget ? 'bg-[#AE0000]/5 dark:bg-[#AE0000]/10 border-2 border-dashed border-[#AE0000]/40 rounded-b-2xl' : ''
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
                      <DealCard
                        key={deal.id}
                        deal={deal}
                        dealClientName={dealClientName}
                        overdue={overdue}
                        isToday={isToday}
                        linkedDecisoresObjects={linkedDecisoresObjects}
                        draggedDealId={draggedDealId}
                        getDealValue={getDealValue}
                        formatCurrency={formatCurrency}
                        handleDragStart={handleDragStart}
                        openEditModal={openEditModal}
                        handleDeleteDeal={handleDeleteDeal}
                        navigate={navigate}
                        setDealToCreateProject={setDealToCreateProject}
                        setShowCreateProjectModal={setShowCreateProjectModal}
                      />
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
        <button
          onClick={() => { setEditingStage(null); setStageNameInput(''); setIsStageModalOpen(true); }}
          className="w-80 flex-shrink-0 flex flex-col items-center justify-center bg-gray-50/50 dark:bg-[#1C1C1E]/50 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-2xl max-h-[calc(100vh-270px)] h-full min-h-[200px] text-gray-400 hover:text-[#AE0000] hover:border-[#AE0000] transition-all"
        >
          <Plus className="h-8 w-8 mb-2" />
          <span className="font-bold text-sm">Adicionar Estágio</span>
        </button>
      </div>
    </div>
  );
};

export default KanbanBoard;
