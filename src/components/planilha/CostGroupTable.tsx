import React from 'react';
import { ChevronDown, ChevronRight, X, Trash2, Plus } from 'lucide-react';
import { CostGroup, CostItem } from '../../types';
import { cn, formatCurrency } from '../../lib/utils';
import { getGroupMetrics } from '../../lib/calculations';
import CostItemRow from './CostItemRow';

export interface CostGroupTableProps {
  group: CostGroup;
  isExpanded: boolean;
  defaultMargin: number;
  defaultTax: number;
  showFinancialControl: boolean;
  projectStatus: string;
  uploadingItemIds: Set<string>;
  deletingItemIds: Set<string>;
  expandedPriceRows: Set<string>;
  
  onToggleGroup: (groupId: string) => void;
  onUpdateGroupName: (groupId: string, name: string) => void;
  onToggleGroupActive: (groupId: string, currentIsActive: boolean) => void;
  onUpdateGroupMargin: (groupId: string, margin: number | undefined) => void;
  onDeleteGroup: (groupId: string) => void;
  onAddItem: (groupId: string) => void;
  
  onUpdateItem: (groupId: string, itemId: string, updates: Partial<CostItem>) => void;
  onDeleteItem: (groupId: string, itemId: string) => void;
  onTogglePriceRow: (itemId: string) => void;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>, groupId: string, itemId: string, itemName: string) => void;
  onDeleteAttachment: (groupId: string, itemId: string, receiptLink: string) => void;
  onSaveResource: (item: CostItem) => void;
}

const CostGroupTable: React.FC<CostGroupTableProps> = ({
  group,
  isExpanded,
  defaultMargin,
  defaultTax,
  showFinancialControl,
  projectStatus,
  uploadingItemIds,
  deletingItemIds,
  expandedPriceRows,
  onToggleGroup,
  onUpdateGroupName,
  onToggleGroupActive,
  onUpdateGroupMargin,
  onDeleteGroup,
  onAddItem,
  onUpdateItem,
  onDeleteItem,
  onTogglePriceRow,
  onFileUpload,
  onDeleteAttachment,
  onSaveResource
}) => {
  const isActive = group.isActive !== false;
  const metrics = getGroupMetrics(group, defaultMargin, defaultTax);
  const gTotalCost = metrics.totalCost;
  const gTotalVenda = metrics.totalVenda;
  const gTotalProfit = metrics.totalProfit;
  const gTotalProposta = metrics.totalProposta;
  const groupMargin = group.margin !== undefined ? group.margin : defaultMargin;
  const isOverridden = group.margin !== undefined;
  const taxRate = defaultTax || 0;

  return (
    <details 
      className={cn(
        "bg-white dark:bg-[#09090b] rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden transition-all duration-300",
        !isActive && "opacity-40 grayscale"
      )}
      open={isExpanded}
      onToggle={(e) => {
        if (isExpanded !== e.currentTarget.open) {
          onToggleGroup(group.id);
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
              onChange={e => onUpdateGroupName(group.id, e.target.value)}
              onClick={e => e.preventDefault()}
              className="font-black text-lg bg-transparent border-none outline-none focus:text-[#AE0000] rounded px-1 transition-all disabled:cursor-not-allowed uppercase tracking-tight"
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
              onToggleGroupActive(group.id, isActive);
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
                value={isOverridden ? group.margin : defaultMargin}
                onChange={e => {
                  const val = parseFloat(e.target.value);
                  onUpdateGroupMargin(group.id, isNaN(val) ? undefined : val);
                }}
                className={cn(
                  "w-16 bg-white dark:bg-zinc-900 border outline-none px-2 py-1 rounded-xl text-center text-xs font-black transition-all",
                  isOverridden ? "border-orange-500 text-orange-500" : "border-zinc-200 dark:border-zinc-800 text-zinc-400"
                )}
              />
              {isOverridden && (
                <button 
                  onClick={() => onUpdateGroupMargin(group.id, undefined)}
                  className="absolute -top-2 -right-2 bg-zinc-800 text-white rounded-full p-0.5 border border-white"
                  title="Resetar"
                >
                  <X size={8} />
                </button>
              )}
            </div>
          </div>
          <button onClick={e => { e.preventDefault(); onDeleteGroup(group.id); }} className="p-2 text-zinc-400 hover:text-red-500 transition-colors"><Trash2 size={18} /></button>
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
            {group.items.map((item) => (
              <CostItemRow
                key={item.id}
                item={item}
                groupId={group.id}
                groupMargin={groupMargin}
                taxRate={taxRate}
                showFinancialControl={showFinancialControl}
                projectStatus={projectStatus}
                uploadingItemIds={uploadingItemIds}
                deletingItemIds={deletingItemIds}
                expandedPriceRows={expandedPriceRows}
                onUpdateItem={onUpdateItem}
                onDeleteItem={onDeleteItem}
                onTogglePriceRow={onTogglePriceRow}
                onFileUpload={onFileUpload}
                onDeleteAttachment={onDeleteAttachment}
                onSaveResource={onSaveResource}
              />
            ))}
          </tbody>
        </table>
      </div>
      <div className="p-4 border-t border-zinc-50 dark:border-zinc-900 bg-zinc-50/30 dark:bg-zinc-950/10">
        <button onClick={() => onAddItem(group.id)} className="text-xs font-black uppercase tracking-widest text-[#AE0000] hover:text-[#AE0000] flex items-center gap-2 px-3 py-2 rounded-xl transition-all hover:bg-orange-50 dark:hover:bg-orange-950/20">
          <Plus size={16} strokeWidth={3} /> Adicionar Item
        </button>
      </div>
    </details>
  );
};

export default CostGroupTable;
