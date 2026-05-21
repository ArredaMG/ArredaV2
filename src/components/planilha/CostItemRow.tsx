import React, { useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, UserPlus, AlertTriangle, Info, Trash2, Eye, Loader2, Paperclip, Lock } from 'lucide-react';
import { CostItem } from '../../types';
import { cn, formatCurrency } from '../../lib/utils';
import { getItemMetrics } from '../../lib/calculations';
import { useProfessionals, useEquipments } from '../../hooks/useResources';

export interface CostItemRowProps {
  item: CostItem;
  groupId: string;
  groupMargin: number;
  taxRate: number;
  showFinancialControl: boolean;
  projectStatus: string;
  uploadingItemIds: Set<string>;
  deletingItemIds: Set<string>;
  expandedPriceRows: Set<string>;
  
  onUpdateItem: (groupId: string, itemId: string, updates: Partial<CostItem>) => void;
  onDeleteItem: (groupId: string, itemId: string) => void;
  onTogglePriceRow: (itemId: string) => void;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>, groupId: string, itemId: string, itemName: string) => void;
  onDeleteAttachment: (groupId: string, itemId: string, receiptLink: string) => void;
  onSaveResource: (item: CostItem) => void;
}

const CostItemRow: React.FC<CostItemRowProps> = ({
  item,
  groupId,
  groupMargin,
  taxRate,
  showFinancialControl,
  projectStatus,
  uploadingItemIds,
  deletingItemIds,
  expandedPriceRows,
  onUpdateItem,
  onDeleteItem,
  onTogglePriceRow,
  onFileUpload,
  onDeleteAttachment,
  onSaveResource
}) => {
  const { professionals = [] } = useProfessionals();
  const { equipments = [] } = useEquipments();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const metrics = getItemMetrics(item, groupMargin, taxRate);
  
  const filteredProfessionals = item.role ? professionals.filter(p => p.role === item.role) : professionals;
  const filteredEquipments = item.role ? equipments.filter(e => e.category === item.role) : equipments;

  const isUnregistered =
    item.name.trim() !== '' &&
    !professionals.some(p => p.name === item.name) &&
    !equipments.some(e => e.name === item.name);
    
  const isOverbudget = item.executedCost !== undefined && item.executedCost > metrics.baseCost;
  const overbudgetDiff = item.executedCost ? item.executedCost - metrics.baseCost : 0;
  const isFinalizedWithoutReceipt = projectStatus === 'Concluído' && item.executedCost && item.executedCost > 0 && !item.receiptLink;

  return (
    <React.Fragment>
      <tr className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30 transition-all group/row">
        <td className="py-3 px-6 text-center border-r border-zinc-100 dark:border-zinc-800">
          <button
            onClick={() => onUpdateItem(groupId, item.id, { isInHouse: !item.isInHouse })}
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
            onChange={e => onUpdateItem(groupId, item.id, { role: e.target.value })} 
            className="w-full bg-zinc-50 dark:bg-zinc-800/40 border border-transparent focus:border-[#AE0000] focus:ring-2 focus:ring-[#AE0000]/20 rounded-lg px-3 py-1.5 outline-none font-bold text-xs text-zinc-700 dark:text-zinc-300 placeholder:text-zinc-400 transition-all" 
            placeholder="Diretor de Arte..." 
          />
        </td>
        <td className="py-3 px-4">
          <div className="relative flex items-center gap-1 group/name">
            <input
              type="text"
              list={`lista-banco-recursos-${item.id}`}
              value={item.name}
              onChange={e => onUpdateItem(groupId, item.id, { name: e.target.value })}
              className="w-full bg-zinc-50 dark:bg-zinc-800/40 border border-transparent focus:border-[#AE0000] focus:ring-2 focus:ring-[#AE0000]/20 rounded-lg px-3 py-1.5 outline-none font-bold text-xs text-zinc-900 dark:text-white transition-all"
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
                  onClick={() => onSaveResource(item)}
                  className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/60 transition-all"
                >
                  <UserPlus size={11} strokeWidth={2.5} />
                  <span className="text-[9px] font-black uppercase tracking-wider">Salvar</span>
                </button>
              </div>
            )}
          </div>
        </td>
        <td className="py-3 px-4 print:hidden text-right">
          <input 
            type="number" 
            value={item.unitCost || ''} 
            onChange={e => onUpdateItem(groupId, item.id, { unitCost: Number(e.target.value) })} 
            className="w-full bg-zinc-50 dark:bg-zinc-800/40 border border-transparent focus:border-[#AE0000] focus:ring-2 focus:ring-[#AE0000]/20 rounded-lg px-3 py-1.5 outline-none text-right font-mono text-xs font-bold text-zinc-500 dark:text-zinc-400 tabular-nums transition-all" 
            placeholder="0.00" 
          />
        </td>
        <td className="py-3 px-4 text-center">
          <input 
            type="number" 
            min="1" 
            value={item.quantity || 1} 
            onChange={e => onUpdateItem(groupId, item.id, { quantity: Number(e.target.value) })} 
            className="w-16 mx-auto bg-zinc-50 dark:bg-zinc-800/40 border border-transparent focus:border-[#AE0000] focus:ring-2 focus:ring-[#AE0000]/20 rounded-lg px-2 py-1.5 outline-none text-center font-mono text-xs font-bold tabular-nums transition-all" 
          />
        </td>
        <td className="py-3 px-4 text-center">
          <input 
            type="number" 
            min="1" 
            value={item.days || 1} 
            onChange={e => onUpdateItem(groupId, item.id, { days: Number(e.target.value) })} 
            className="w-16 mx-auto bg-zinc-50 dark:bg-zinc-800/40 border border-transparent focus:border-[#AE0000] focus:ring-2 focus:ring-[#AE0000]/20 rounded-lg px-2 py-1.5 outline-none text-center font-mono text-xs font-bold tabular-nums transition-all" 
          />
        </td>
        <td className="py-3 px-4 text-right font-black text-zinc-900 dark:text-white whitespace-nowrap">
          <div className="flex items-center justify-end gap-2">
            <span className="font-mono tabular-nums">{formatCurrency(metrics.totalFinal)}</span>
            <button onClick={() => onTogglePriceRow(item.id)} className={cn("p-1 rounded transition-colors", expandedPriceRows.has(item.id) ? "text-[#AE0000]" : "text-zinc-300 hover:text-zinc-500")}>
              <Info size={14} />
            </button>
          </div>
        </td>
        {showFinancialControl && (
          <>
            <td className={cn("py-3 px-4 transition-colors", isFinalizedWithoutReceipt ? "bg-yellow-50 dark:bg-yellow-900/20" : "bg-yellow-50/20 dark:bg-yellow-950/5")}>
              <div className="relative flex items-center gap-2">
                {isOverbudget && (
                  <div data-tooltip={`Atenção: Este item ultrapassou ${formatCurrency(overbudgetDiff)} do valor previsto!`}>
                    <AlertTriangle size={14} className="text-red-500 animate-pulse cursor-help flex-shrink-0" />
                  </div>
                )}
                <input 
                  type="number" 
                  value={item.executedCost || ''} 
                  onChange={e => onUpdateItem(groupId, item.id, { executedCost: Number(e.target.value) })} 
                  className={cn(
                    "w-full rounded-lg py-1 px-2 text-right font-mono text-xs font-bold tabular-nums outline-none transition-all",
                    isOverbudget
                      ? "bg-red-50/50 dark:bg-red-950/10 border border-red-300 dark:border-red-900/50 text-red-700 dark:text-red-400 focus:ring-2 focus:ring-red-500/20"
                      : "bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white focus:border-[#AE0000] focus:ring-2 focus:ring-[#AE0000]/20"
                  )} 
                  placeholder="0.00" 
                />
              </div>
            </td>
            <td className={cn("py-3 px-4 text-center transition-colors", isFinalizedWithoutReceipt ? "bg-yellow-50 dark:bg-yellow-900/20" : "")}>
              {projectStatus === 'Concluído' ? (
                <div className="flex items-center justify-center gap-2">
                  {uploadingItemIds.has(item.id) ? (
                    <div className="flex items-center gap-2">
                      <Loader2 size={18} className="animate-spin text-[#AE0000]" />
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
                        onClick={() => onDeleteAttachment(groupId, item.id, item.receiptLink!)}
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
                        ref={fileInputRef}
                        onChange={(e) => {
                          onFileUpload(e, groupId, item.id, item.name || 'SemNome');
                          if (fileInputRef.current) fileInputRef.current.value = '';
                        }}
                      />
                      <label
                        htmlFor={`file-upload-${item.id}`}
                        className="p-1.5 text-zinc-400 hover:text-[#AE0000] hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg cursor-pointer transition-colors"
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
          <button onClick={() => onDeleteItem(groupId, item.id)} className="p-1.5 text-zinc-300 hover:text-red-500 opacity-0 group-hover/row:opacity-100 transition-all"><Trash2 size={16} /></button>
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
};

export default CostItemRow;
