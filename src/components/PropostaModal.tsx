import React, { useState, useRef, useEffect } from 'react';
import { X, Printer, Upload, Eye, Trash2, Plus, Save } from 'lucide-react';
import { Project, ProjectVersion } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { getGroupMetrics } from '../lib/calculations';
import { useAppContext } from '../context/AppContext';

interface PropostaModalProps {
  project: Project;
  activeVersion: ProjectVersion;
  totalClient: number;
  clientName: string;
  onClose: () => void;
}

interface InvestmentLine {
  id: string;
  qty: number;
  name: string;
  description: string;
  unitCost: number;
  total: number;
}

export function PropostaModal({ project, activeVersion, totalClient, clientName, onClose }: PropostaModalProps) {
  const { updateProjectVersion } = useAppContext();
  
  // Config States
  const [logoCliente, setLogoCliente] = useState<string | null>(null);
  const [showSubtotals, setShowSubtotals] = useState(activeVersion.propostaData?.showSubtotals ?? true);

  // Data States
  const [dataEmissao, setDataEmissao] = useState(new Date().toLocaleDateString('pt-BR'));
  const [validade, setValidade] = useState('09/10/2025');
  const [previsaoEntrega, setPrevisaoEntrega] = useState('até 10 dias após captação');
  
  const [briefingTitle, setBriefingTitle] = useState(activeVersion.propostaData?.briefingTitle ?? 'PROJETO & BRIEFING:');
  const [briefingText, setBriefingText] = useState(
    activeVersion.propostaData?.briefingText ?? `PROJETO: Produção audiovisual para criação de conteúdo pontual com foco em desenvolver materiais educativos em vídeo voltados para um infoproduto.

ETAPAS DO PROJETO:
01 - Contrato/autorização de serviço;
02 - Reunião de briefing e definição de estratégias;
03 - Criação de roteiro/cronograma de atividades;
04 - Produção de conteúdo;
05 - Edição e finalização;
06 - Apresentação do material;
07 - Ajustes/aprovação.`
  );

  const [formaPagamento, setFormaPagamento] = useState(
    activeVersion.propostaData?.paymentTerms ?? "até 30 dias após a emissão da Nota Fiscal"
  );
  
  const [observacoes, setObservacoes] = useState(
    activeVersion.propostaData?.observations ?? "- Em vídeo: até dois envios de solicitações de ajustes (quantos ajustes forem necessários) durante o processo de aprovação/entrega do vídeo fazem parte do orçamento. Depois disso, cobramos R$ 250,00 hora/edição.\n- Em áudio: para regravação motivada por alteração de texto/redação, poderá haver custos a serem repassados ao locutor (a)."
  );

  const [investmentLines, setInvestmentLines] = useState<InvestmentLine[]>(() => {
    if (activeVersion.propostaData?.investmentLines && activeVersion.propostaData.investmentLines.length > 0) {
      return activeVersion.propostaData.investmentLines;
    }
    return activeVersion.groups.map(group => {
      const groupMargin = group.margin ?? activeVersion.defaultMargin;
      const metrics = getGroupMetrics(group, groupMargin, activeVersion.defaultTax);
      return {
        id: group.id,
        qty: 1,
        name: group.name,
        description: '- PRODUÇÃO: duas diárias (até 7h) para captação de cenas na planta de Belo Horizonte/MG.\n- EQUIPE: Diretor de cena, Diretor de fotografia, Assistente de Câmera e Editor.\n- ENTREGA: montagem, edição e finalização de três vídeos módulos com até 1h de duração, no formato horizontal (16:9).',
        unitCost: metrics.totalProposta,
        total: metrics.totalProposta
      };
    });
  });

  const calculatedTotal = investmentLines.reduce((acc, line) => acc + line.total, 0);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, setter: (value: string | null) => void) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setter(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleAutoResize = (e: React.ChangeEvent<HTMLTextAreaElement> | React.FocusEvent<HTMLTextAreaElement>) => {
    const target = e.currentTarget;
    target.style.height = 'auto';
    target.style.height = target.scrollHeight + 'px';
  };

  // Auto-resize on mount for all textareas
  const textareaRefs = useRef<(HTMLTextAreaElement | null)[]>([]);
  useEffect(() => {
    textareaRefs.current.forEach(textarea => {
      if (textarea) {
        textarea.style.height = 'auto';
        textarea.style.height = textarea.scrollHeight + 'px';
      }
    });
  }, [briefingText, formaPagamento, observacoes, investmentLines]);

  const updateLine = (id: string, updates: Partial<InvestmentLine>) => {
    setInvestmentLines(lines => lines.map(line => {
      if (line.id === id) {
        const updated = { ...line, ...updates };
        if (updates.qty !== undefined || updates.unitCost !== undefined) {
          updated.total = updated.qty * updated.unitCost;
        }
        return updated;
      }
      return line;
    }));
  };

  const addLine = () => {
    setInvestmentLines([
      ...investmentLines,
      { id: crypto.randomUUID(), qty: 1, name: '', description: '', unitCost: 0, total: 0 }
    ]);
  };

  const removeLine = (id: string) => {
    setInvestmentLines(lines => lines.filter(l => l.id !== id));
  };

  return (
    <div className="fixed inset-0 z-[200] flex bg-zinc-900 overflow-y-auto print:absolute print:inset-0 print:block print:h-auto print:min-h-screen print:overflow-visible print:bg-white print:p-0">
      
      {/* ─── PAINEL ESQUERDO: CONTROLES ─── */}
      <div className="w-[450px] h-full overflow-y-auto bg-zinc-950 border-r border-zinc-800 p-6 flex flex-col gap-8 print:hidden shrink-0">
        <div>
          <h2 className="text-xl font-bold text-white mb-1 tracking-tight">Gerador de Orçamento</h2>
          <p className="text-xs text-zinc-500 font-medium">Configure os parâmetros do documento PDF.</p>
        </div>

        {/* Logos */}
        <div className="flex flex-col gap-4">
          <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest border-b border-zinc-800 pb-2">Identidade Visual</h3>
          
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase">Logo Cliente (Opcional)</label>
            <div className="relative group">
              <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, setLogoCliente)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
              <div className="flex items-center justify-center gap-2 p-3 bg-zinc-900 border border-zinc-800 rounded-xl group-hover:border-zinc-700 transition-colors">
                {logoCliente ? <img src={logoCliente} alt="Logo Cliente" className="h-8 object-contain" /> : <><Upload size={14} className="text-zinc-500" /><span className="text-xs text-zinc-500 font-medium">Fazer upload</span></>}
              </div>
            </div>
          </div>
        </div>

        {/* Configurações da Tabela */}
        <div className="flex flex-col gap-4">
          <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest border-b border-zinc-800 pb-2">Tabela de Escopo</h3>
          
          <label className="flex items-center gap-2 text-xs font-medium text-zinc-400 cursor-pointer w-max mb-2">
            <input type="checkbox" checked={showSubtotals} onChange={e => setShowSubtotals(e.target.checked)} className="accent-zinc-500" />
            Mostrar colunas de "Valor Unitário" e "Subtotal"
          </label>

          <div className="flex flex-col gap-4">
            {investmentLines.map((line, index) => (
              <div key={line.id} className="bg-zinc-900 p-4 rounded-xl border border-zinc-800 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-500 uppercase">Item {index + 1}</span>
                  <button onClick={() => removeLine(line.id)} className="text-zinc-500 hover:text-red-500 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
                
                <div className="grid grid-cols-4 gap-2">
                  <div className="col-span-1">
                    <label className="text-[10px] font-bold text-zinc-600 block mb-1">Qtd.</label>
                    <input type="number" value={line.qty} onChange={e => updateLine(line.id, { qty: Number(e.target.value) })} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-xs text-white focus:border-zinc-500 outline-none" />
                  </div>
                  <div className="col-span-3">
                    <label className="text-[10px] font-bold text-zinc-600 block mb-1">Produto/Serviço</label>
                    <input type="text" value={line.name} onChange={e => updateLine(line.id, { name: e.target.value })} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-xs text-white focus:border-zinc-500 outline-none" />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-zinc-600 block mb-1">Descrição detalhada</label>
                  <textarea 
                    value={line.description} 
                    onChange={e => updateLine(line.id, { description: e.target.value })} 
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-xs text-white focus:border-zinc-500 outline-none resize-y min-h-[60px]"
                    placeholder="Descreva o escopo deste item..."
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-zinc-600 block mb-1">Valor Unitário</label>
                  <input type="number" value={line.unitCost} onChange={e => updateLine(line.id, { unitCost: Number(e.target.value) })} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-xs text-white focus:border-zinc-500 outline-none font-mono" />
                </div>
              </div>
            ))}
            
            <button 
              onClick={addLine}
              className="w-full flex items-center justify-center gap-2 p-3 border border-dashed border-zinc-800 rounded-xl text-xs font-bold text-zinc-500 hover:text-white hover:border-zinc-500 transition-colors"
            >
              <Plus size={14} /> Adicionar Linha de Escopo
            </button>
          </div>
        </div>

        <button 
          onClick={async () => {
            try {
              await updateProjectVersion(project.id, activeVersion.id, {
                propostaData: {
                  briefingTitle,
                  briefingText,
                  paymentTerms: formaPagamento,
                  observations: observacoes,
                  showSubtotals,
                  investmentLines
                }
              });
              alert("✅ Dados da O.S. salvos com sucesso!");
            } catch (err) {
              alert("Erro ao salvar dados.");
            }
          }}
          className="w-full flex items-center justify-center gap-2 p-3 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-xs font-bold text-white transition-colors shadow-lg shadow-emerald-900/20 mt-4"
        >
          <Save size={16} /> 💾 Salvar Dados da O.S.
        </button>
      </div>

      {/* ─── PAINEL DIREITO: LIVE PREVIEW (A4) ─── */}
      <div className="flex-1 h-full overflow-y-auto bg-zinc-300 flex flex-col items-center print:w-full print:block print:overflow-visible print:h-auto print:m-0 print:p-0 print:bg-white">
        
        {/* Topbar Preview (Hidden in Print) */}
        <div className="sticky top-0 z-10 w-full flex items-center justify-between p-4 bg-white/80 backdrop-blur-md border-b border-zinc-200 print:hidden shadow-sm">
          <div className="text-xs font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
            <Eye size={14} /> Preview A4
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={handlePrint}
              className="flex items-center gap-2 bg-zinc-900 hover:bg-black text-white px-5 py-2.5 rounded-xl font-bold uppercase tracking-wider text-xs shadow-md transition-all"
            >
              <Printer size={16} /> Exportar PDF
            </button>
            <button 
              onClick={onClose}
              className="p-2.5 bg-zinc-200 hover:bg-zinc-300 text-zinc-600 rounded-xl transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* CONTÊINER A4 (Resolução do Corte e Paginação) */}
        <div className="relative w-full max-w-[210mm] min-h-[297mm] h-auto mx-auto bg-white text-zinc-900 p-10 shadow-2xl print:max-w-none print:w-full print:min-h-0 print:shadow-none print:p-0 print:m-0 flex flex-col text-[10px] print:block">
          
          {/* GUIA VISUAL DE QUEBRA DE PÁGINA (297mm) */}
          <div className="absolute top-[297mm] left-0 w-full border-t-2 border-dashed border-zinc-300 print:hidden pointer-events-none flex justify-center -translate-y-1/2 z-10">
            <span className="bg-white px-2 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Corte de Página A4 (Apenas para Visualização)</span>
          </div>

          <table className="w-full bg-transparent border-none">
            <thead className="print:table-header-group">
              <tr>
                <td>
                  {/* A) CABEÇALHO */}
                  <div className="flex justify-between items-start w-full print:break-inside-avoid">
                    {/* Esquerda */}
                    <div className="flex flex-col text-zinc-900 leading-snug">
                      <div className="font-medium text-zinc-900 mb-2">Data: {dataEmissao}</div>
                      
                      <div className="mb-2">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 247.53 31.24" className="w-36 h-auto text-zinc-900 fill-current">
                          <path d="M210.77,10.93h14.8l9.9,20.31h-7.38l-1.78-3.71h-16.21l-1.78,3.71h-7.41l9.87-20.31ZM223.96,22.73l-3-6.2h-5.57l-2.97,6.2h11.54Z"/>
                          <path d="M9.87,10.93h30.4l9.9,20.31h-7.38l-1.78-3.71H9.2l-1.78,3.71H0L9.87,10.93ZM38.66,22.73l-3-6.2H14.49l-2.97,6.2h27.15Z"/>
                          <path d="M51.85,10.93h26.48c5.57,0,8.35,2.12,8.35,6.22,0,2.8-1.53,4.64-4.27,5.46,2.6.17,4.24,1.67,4.24,4.16v4.47h-6.65v-3.4c0-1.81-.51-2.35-2.32-2.35h-19.18v5.74h-6.65V10.93ZM76.75,20.18c1.78,0,3-.34,3-1.98s-1.22-1.95-3-1.95h-18.25v3.93h18.25Z"/>
                          <path d="M88.35,10.93h26.48c5.57,0,8.35,2.12,8.35,6.22,0,2.8-1.53,4.64-4.27,5.46,2.6.17,4.24,1.67,4.24,4.16v4.47h-6.65v-3.4c0-1.81-.51-2.35-2.32-2.35h-19.18v5.74h-6.65V10.93ZM113.25,20.18c1.78,0,3-.34,3-1.98s-1.22-1.95-3-1.95h-18.25v3.93h18.25Z"/>
                          <path d="M125.92,10.93h34.86v5.01h-28.21v2.86h27.64v4.56h-27.64v2.89h28.21v5.01h-34.86V10.93Z"/>
                          <path d="M164.32,10.93h25.75c5.88,0,10.16,4.24,10.16,10.13s-4.27,10.19-10.16,10.19h-25.75V10.93ZM187.38,25.64c4.02,0,5.97-1.53,5.97-4.58s-1.95-4.53-5.97-4.53h-16.41v9.11h16.41Z"/>
                          <path d="M235.83,4.66c0-2.83,2.33-4.66,5.98-4.66s5.72,1.82,5.72,4.66-2.23,4.68-5.72,4.68-5.98-1.82-5.98-4.68ZM241.81,7.97c2.57,0,4.2-1.29,4.2-3.31s-1.63-3.28-4.2-3.28c-2.75,0-4.48,1.28-4.48,3.28s1.73,3.31,4.48,3.31ZM239.27,2.29h3.48c1.23,0,1.99.61,1.99,1.58,0,.71-.35,1.21-.91,1.45l.99,1.49h-1.86l-.72-1.2h-1.44v1.2h-1.52V2.29ZM242.5,4.43c.43,0,.67-.18.67-.47s-.24-.46-.67-.46h-1.71v.92h1.71Z"/>
                        </svg>
                      </div>

                      <div className="text-[9px] leading-snug font-medium">
                        <div>ARREDA CONTEUDO AUDIOVISUAL LTDA / CNPJ: 46.479.013/0001-96</div>
                        <div>CONSELHEIRO QUINTILIANO SILVA, 143 - SANTO ANTÔNIO - Belo Horizonte MG CEP: 30350-040</div>
                        <div>(31) 98794-1716 / contato@arreda.rec.br</div>
                      </div>
                    </div>

                    {/* Direita */}
                    <div className="flex flex-col items-end text-right justify-start text-zinc-900 pt-6">
                      {logoCliente && (
                        <div className="h-10 mb-4 flex justify-end">
                          <img src={logoCliente} className="max-h-full object-contain" alt="Logo Cliente" />
                        </div>
                      )}
                      <div className="text-lg font-bold uppercase mb-2">
                        CLIENTE: {clientName || 'NÃO INFORMADO'}
                      </div>
                      <div className="text-sm font-medium mb-4">
                        Orçamento {project.projectNumber || '62'}
                      </div>
                      
                      <div className="flex items-center gap-2 justify-end w-full">
                        <span className="text-[10px] text-zinc-500 whitespace-nowrap">Validade da proposta:</span>
                        <input 
                          type="text" 
                          value={validade} 
                          onChange={e => setValidade(e.target.value)} 
                          className="w-24 bg-transparent text-right outline-none hover:bg-zinc-100 focus:bg-zinc-100 p-0.5 rounded font-bold text-zinc-900 text-[10px] print:border-none print:resize-none print:shadow-none print:bg-transparent print:p-0"
                        />
                      </div>
                      <div className="flex items-center gap-2 justify-end w-full mt-1">
                        <span className="text-[10px] text-zinc-500 whitespace-nowrap">Previsão de entrega:</span>
                        <input 
                          type="text" 
                          value={previsaoEntrega} 
                          onChange={e => setPrevisaoEntrega(e.target.value)} 
                          className="w-32 bg-transparent text-right outline-none hover:bg-zinc-100 focus:bg-zinc-100 p-0.5 rounded font-bold text-zinc-900 text-[10px] print:border-none print:resize-none print:shadow-none print:bg-transparent print:p-0"
                        />
                      </div>
                    </div>
                  </div>

                  {/* SEPARADOR 1 */}
                  <hr className="border-t-[3px] border-zinc-900 my-4 print:my-4" />
                </td>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>

                  {/* B) NOVO BOX DE PROJETO & BRIEFING */}
                  <div className="flex flex-col gap-2 print:break-inside-avoid w-full">
                    <input
                      type="text"
                      value={briefingTitle}
                      onChange={e => setBriefingTitle(e.target.value)}
                      className="font-bold text-xs uppercase text-zinc-900 w-full bg-transparent border-none outline-none focus:border-b focus:border-zinc-300 transition-colors print:border-none print:p-0 print:m-0"
                    />
                    <textarea 
                      ref={el => textareaRefs.current[0] = el}
                      value={briefingText}
                      onChange={(e) => { setBriefingText(e.target.value); handleAutoResize(e); }}
                      className="w-full min-h-[60px] h-auto overflow-hidden resize-none text-[10px] font-normal text-zinc-800 bg-transparent outline-none hover:bg-zinc-50 focus:bg-zinc-50 p-2 rounded -ml-2 leading-snug print:border-none print:resize-none print:shadow-none print:bg-transparent print:p-0 print:ml-0 print:overflow-hidden print:h-auto"
                    />
                  </div>

                  {/* SEPARADOR 2 */}
                  <hr className="border-t-[3px] border-zinc-900 my-4 print:my-4" />

                  {/* C) TABELA DE ESCALAO & INVESTIMENTO (A "Zebra") */}
                  <div>
                    <table className="w-full text-sm text-left border-collapse border border-zinc-200">
                      <thead>
                        <tr className="border-b border-zinc-300 font-bold text-[9px] uppercase tracking-widest text-zinc-400">
                          <th className="py-2 px-2 text-center w-8">Qt.</th>
                          <th className="py-2 px-2 w-48">Produto/Serviço</th>
                          <th className="py-2 px-2">Detalhe do item</th>
                          {showSubtotals && (
                            <>
                              <th className="py-2 px-2 text-right w-24">Valor unitário</th>
                              <th className="py-2 px-2 text-right w-24">Subtotal</th>
                            </>
                          )}
                        </tr>
                      </thead>
                      <tbody className="text-[10px] text-zinc-900 align-top">
                        {investmentLines.map((line, idx) => (
                          <tr key={line.id} className="odd:bg-zinc-50 border-b border-zinc-100 print:break-inside-avoid">
                            <td className="py-2 px-2 text-center tabular-nums">
                              {line.qty}
                            </td>
                            <td className="py-2 px-2 uppercase font-bold text-zinc-900">
                              {line.name}
                            </td>
                            <td className="py-2 px-2">
                              <textarea 
                                ref={el => textareaRefs.current[idx + 1] = el}
                                value={line.description}
                                onChange={(e) => {
                                  updateLine(line.id, { description: e.target.value });
                                  handleAutoResize(e);
                                }}
                                className="w-full min-h-[40px] text-[10px] text-zinc-900 bg-transparent outline-none hover:bg-black/5 focus:bg-black/5 px-1 rounded resize-none overflow-hidden leading-snug print:border-none print:resize-none print:shadow-none print:bg-transparent print:p-0 print:h-auto print:overflow-hidden"
                                placeholder="Descreva os detalhes..."
                              />
                            </td>
                            {showSubtotals && (
                              <>
                                <td className="py-2 px-2 text-right tabular-nums">
                                  {formatCurrency(line.unitCost)}
                                </td>
                                <td className="py-2 px-2 text-right tabular-nums">
                                  {formatCurrency(line.total)}
                                </td>
                              </>
                            )}
                          </tr>
                        ))}
                      </tbody>
                      
                      {/* 4. TOTAIS ANCORADOS NA TABELA (tfoot) */}
                      <tfoot className="print:break-inside-avoid">
                        <tr className="border-t-[3px] border-zinc-900">
                          <td colSpan={showSubtotals ? 3 : 2} className="py-2 px-2 text-right text-[10px] text-zinc-500 uppercase tracking-wider">Total</td>
                          <td colSpan={showSubtotals ? 2 : 1} className="py-2 px-2 text-right font-bold tabular-nums text-zinc-900">{formatCurrency(calculatedTotal)}</td>
                        </tr>
                        <tr>
                          <td colSpan={showSubtotals ? 3 : 2} className="pb-2 px-2 text-right text-[10px] font-bold text-zinc-900 uppercase tracking-wider">Valor líquido</td>
                          <td colSpan={showSubtotals ? 2 : 1} className="pb-2 px-2 text-right font-bold tabular-nums text-zinc-900">{formatCurrency(calculatedTotal)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  {/* SEPARADOR 3 */}
                  <hr className="border-t-[3px] border-zinc-900 my-4 print:my-4" />

                  {/* 5. FORMA DE PAGAMENTO & OBSERVAÇÕES */}
                  <div className="flex flex-col gap-4 print:break-inside-avoid text-[10px] text-zinc-900">
                    <div className="print:break-inside-avoid flex flex-col gap-1">
                      <div className="font-bold">Forma de pagamento:</div>
                      <textarea 
                        ref={el => textareaRefs.current[investmentLines.length + 1] = el}
                        value={formaPagamento}
                        onChange={(e) => { setFormaPagamento(e.target.value); handleAutoResize(e); }}
                        className="w-full bg-transparent outline-none hover:bg-zinc-50 focus:bg-zinc-50 px-1 rounded resize-none overflow-hidden leading-snug print:border-none print:resize-none print:shadow-none print:bg-transparent print:p-0 print:h-auto print:overflow-hidden"
                        rows={1}
                      />
                    </div>
                    <div className="print:break-inside-avoid flex flex-col gap-1">
                      <div className="font-bold">Observações:</div>
                      <textarea 
                        ref={el => textareaRefs.current[investmentLines.length + 2] = el}
                        value={observacoes}
                        onChange={(e) => { setObservacoes(e.target.value); handleAutoResize(e); }}
                        className="w-full bg-transparent outline-none hover:bg-zinc-50 focus:bg-zinc-50 px-1 rounded resize-none overflow-hidden leading-snug print:border-none print:resize-none print:shadow-none print:bg-transparent print:p-0 print:h-auto print:overflow-hidden"
                        rows={3}
                      />
                    </div>
                  </div>

                </td>
              </tr>
            </tbody>
          </table>

        </div>
      </div>
    </div>
  );
}
