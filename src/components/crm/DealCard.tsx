import React from 'react';
import { Calendar, AlertCircle, Edit3, Trash2, FileText } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Deal, Client } from '../../types';

export interface DealCardProps {
  deal: Deal;
  dealClientName: string;
  overdue: boolean;
  isToday: boolean;
  linkedDecisoresObjects: any[];
  draggedDealId: string | null;
  getDealValue: (deal: Deal) => number;
  formatCurrency: (val: number) => string;
  handleDragStart: (e: React.DragEvent, dealId: string) => void;
  openEditModal: (deal: Deal) => void;
  handleDeleteDeal: (dealId: string) => void;
  navigate: (path: string) => void;
  setDealToCreateProject: (deal: Deal) => void;
  setShowCreateProjectModal: (show: boolean) => void;
}

const DealCard: React.FC<DealCardProps> = ({
  deal,
  dealClientName,
  overdue,
  isToday,
  linkedDecisoresObjects,
  draggedDealId,
  getDealValue,
  formatCurrency,
  handleDragStart,
  openEditModal,
  handleDeleteDeal,
  navigate,
  setDealToCreateProject,
  setShowCreateProjectModal,
}) => {
  return (
    <div
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
            : "bg-gray-50 dark:bg-[#2C2C2E] border-gray-100 dark:border-[#3A3A3C] hover:border-[#AE0000] dark:hover:border-[#AE0000]"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        {/* Client Tag */}
        <span className="text-[10px] font-extrabold uppercase tracking-wide text-[#AE0000] dark:text-[#AE0000] truncate max-w-[150px]">
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
};

export default DealCard;
