import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, Check, Copy, TrendingUp, TrendingDown, AlertTriangle, ShieldCheck } from 'lucide-react';
import { cn, formatCurrency } from '../../lib/utils';

export interface FinancialPanelsProps {
  projectStatus: string;
  paymentList: { id: string; name: string; role: string; pix: string; amount: number; }[];
  healthMetrics: { totalOverbudget: number; realMarginPct: number; breakEven: number; overbudgetItems: number; };
  globals: { totalClient: number; totalCost: number; totalProfit: number; totalTax: number; totalExecuted: number; totalVenda: number; lucroReal: number; };
  defaultMargin: number;
  
  isPaymentsExpanded: boolean;
  onTogglePayments: () => void;
  
  isFinancialHealthExpanded: boolean;
  onToggleFinancialHealth: () => void;
  
  copiedPixId: string | null;
  onCopyPix: (itemId: string, pix: string) => void;
}

const FinancialPanels: React.FC<FinancialPanelsProps> = ({
  projectStatus,
  paymentList,
  healthMetrics,
  globals,
  defaultMargin,
  isPaymentsExpanded,
  onTogglePayments,
  isFinancialHealthExpanded,
  onToggleFinancialHealth,
  copiedPixId,
  onCopyPix
}) => {
  const showFinancialControl = projectStatus === 'Aprovado' || projectStatus === 'Concluído';

  return (
    <div className="shrink-0 flex flex-col z-30 shadow-[0_-10px_40px_rgba(0,0,0,0.08)] print:hidden relative">
      
      {/* ACORDEON: ORDEM DE PAGAMENTOS (Topo) */}
      {projectStatus === 'Concluído' && paymentList.length > 0 && (
        <div className="bg-white dark:bg-[#1C1C1E] border-t border-zinc-200 dark:border-zinc-800 flex flex-col">
          <button
            type="button"
            onClick={onTogglePayments}
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
                                  ? "bg-[#AE0000]/10 text-[#AE0000] border border-[#AE0000]/20"
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
                                onClick={() => onCopyPix(row.id, row.pix)}
                                disabled={!hasPix}
                                title={hasPix ? `Copiar PIX: ${row.pix}` : 'PIX não cadastrado'}
                                className={cn(
                                  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all",
                                  isCopied
                                    ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/30"
                                    : hasPix
                                      ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 hover:border-[#AE0000] hover:text-[#AE0000]"
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
            onClick={onToggleFinancialHealth}
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
                      {healthMetrics.realMarginPct >= (defaultMargin * 0.8)
                        ? <TrendingUp size={16} className="text-emerald-500" />
                        : <TrendingDown size={16} className="text-red-500" />}
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                        <span>Planejada</span>
                        <span className="font-mono font-bold text-xs tabular-nums text-zinc-500">
                          {formatCurrency(globals.totalCost * (defaultMargin / 100))} ({defaultMargin.toFixed(1)}%)
                        </span>
                      </div>
                      <div className="h-2.5 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-emerald-400 transition-all duration-700"
                          style={{ width: `${Math.min(defaultMargin, 100)}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider mt-3"
                        style={{ color: healthMetrics.realMarginPct < defaultMargin * 0.8 ? '#ef4444' : '#10b981' }}>
                        <span>Realizada</span>
                        <span className="font-mono font-bold text-xs tabular-nums">
                          {formatCurrency(globals.lucroReal)} ({healthMetrics.realMarginPct.toFixed(1)}%)
                        </span>
                      </div>
                      <div className="h-2.5 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all duration-700",
                            healthMetrics.realMarginPct >= defaultMargin * 0.8
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
            
            <div className="bg-[#AE0000] px-8 py-4 rounded-2xl shadow-xl shadow-orange-500/30 flex flex-col items-end">
              <span className="text-[10px] font-black uppercase tracking-widest text-white/80 mb-1">Total da Proposta</span>
              <span className="font-mono font-black text-3xl text-white tabular-nums leading-none">{formatCurrency(globals.totalClient)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FinancialPanels;
