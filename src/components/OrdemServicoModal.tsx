import React, { useState, useRef, useEffect } from 'react';
import { X, Printer, Upload, Eye, Trash2, Plus } from 'lucide-react';
import { Project, ProjectVersion } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { getGroupMetrics } from '../lib/calculations';

interface OrdemServicoModalProps {
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

export function OrdemServicoModal({ project, activeVersion, totalClient, clientName, onClose }: OrdemServicoModalProps) {
  // Config States
  const [logoProdutora, setLogoProdutora] = useState<string | null>(null);
  const [logoCliente, setLogoCliente] = useState<string | null>(null);
  const [showSubtotals, setShowSubtotals] = useState(true);

  // Data States
  const [dataEmissao, setDataEmissao] = useState(new Date().toLocaleDateString('pt-BR'));
  const [validade, setValidade] = useState('15 dias');
  const [previsaoEntrega, setPrevisaoEntrega] = useState('A combinar');
  
  const [projetoText, setProjetoText] = useState(project.title);
  const [etapasText, setEtapasText] = useState(
    activeVersion.groups.map(g => `• ${g.name.toUpperCase()}`).join('\n')
  );

  const [formaPagamento, setFormaPagamento] = useState(
    "50% de sinal no ato da aprovação para reserva de data e equipe.\n50% no momento da entrega do material aprovado.\nPagamento via PIX ou Transferência Bancária."
  );
  
  const [observacoes, setObservacoes] = useState(
    "• Estão inclusas até 2 (duas) rodadas de alterações no material.\n• Ajustes solicitados após aprovação final ou refações devido a mudança de roteiro terão custos adicionais.\n• O presente orçamento contempla exclusivamente os serviços descritos acima."
  );

  // Initialize lines from groups
  const [investmentLines, setInvestmentLines] = useState<InvestmentLine[]>(() => {
    return activeVersion.groups.map(group => {
      const groupMargin = group.margin ?? activeVersion.defaultMargin;
      const metrics = getGroupMetrics(group, groupMargin, activeVersion.defaultTax);
      return {
        id: group.id,
        qty: 1,
        name: group.name,
        description: '',
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

  // Helper for auto-resizing textareas
  const handleAutoResize = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    e.target.style.height = 'auto';
    e.target.style.height = e.target.scrollHeight + 'px';
  };

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
    <div className="fixed inset-0 z-[200] flex bg-zinc-900 print:bg-transparent overflow-hidden">
      
      {/* ─── PAINEL ESQUERDO: CONTROLES ─── */}
      <div className="w-[450px] h-full overflow-y-auto bg-zinc-950 border-r border-zinc-800 p-6 flex flex-col gap-8 print:hidden shrink-0">
        <div>
          <h2 className="text-xl font-black text-white mb-1 tracking-tight">Gerador de Orçamento</h2>
          <p className="text-xs text-zinc-500 font-medium">Configure os parâmetros do documento A4.</p>
        </div>

        {/* Logos */}
        <div className="flex flex-col gap-4">
          <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest border-b border-zinc-800 pb-2">Identidade Visual</h3>
          
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase">Logo Produtora (Opcional)</label>
            <div className="relative group">
              <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, setLogoProdutora)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
              <div className="flex items-center justify-center gap-2 p-3 bg-zinc-900 border border-zinc-800 rounded-xl group-hover:border-zinc-700 transition-colors">
                {logoProdutora ? <img src={logoProdutora} alt="Logo Produtora" className="h-8 object-contain" /> : <><Upload size={14} className="text-zinc-500" /><span className="text-xs text-zinc-500 font-medium">Fazer upload</span></>}
              </div>
            </div>
          </div>

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
            <input type="checkbox" checked={showSubtotals} onChange={e => setShowSubtotals(e.target.checked)} className="accent-[#ff6b00]" />
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
                    <input type="number" value={line.qty} onChange={e => updateLine(line.id, { qty: Number(e.target.value) })} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-xs text-white focus:border-[#ff6b00] outline-none" />
                  </div>
                  <div className="col-span-3">
                    <label className="text-[10px] font-bold text-zinc-600 block mb-1">Produto/Serviço</label>
                    <input type="text" value={line.name} onChange={e => updateLine(line.id, { name: e.target.value })} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-xs text-white focus:border-[#ff6b00] outline-none" />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-zinc-600 block mb-1">Descrição detalhada</label>
                  <textarea 
                    value={line.description} 
                    onChange={e => updateLine(line.id, { description: e.target.value })} 
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-xs text-white focus:border-[#ff6b00] outline-none resize-y min-h-[60px]"
                    placeholder="Descreva o escopo deste item..."
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-zinc-600 block mb-1">Valor Unitário</label>
                  <input type="number" value={line.unitCost} onChange={e => updateLine(line.id, { unitCost: Number(e.target.value) })} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-xs text-white focus:border-[#ff6b00] outline-none font-mono" />
                </div>
              </div>
            ))}
            
            <button 
              onClick={addLine}
              className="w-full flex items-center justify-center gap-2 p-3 border border-dashed border-zinc-800 rounded-xl text-xs font-bold text-zinc-500 hover:text-[#ff6b00] hover:border-[#ff6b00] transition-colors"
            >
              <Plus size={14} /> Adicionar Linha de Escopo
            </button>
          </div>
        </div>

      </div>

      {/* ─── PAINEL DIREITO: LIVE PREVIEW (A4) ─── */}
      <div className="flex-1 h-full overflow-y-auto bg-zinc-300 print:bg-transparent flex flex-col items-center">
        
        {/* Topbar Preview */}
        <div className="sticky top-0 z-10 w-full flex items-center justify-between p-4 bg-white/80 backdrop-blur-md border-b border-zinc-200 print:hidden shadow-sm">
          <div className="text-xs font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
            <Eye size={14} /> Preview A4
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={handlePrint}
              className="flex items-center gap-2 bg-[#ff6b00] hover:bg-[#e66000] text-white px-5 py-2.5 rounded-xl font-black uppercase tracking-wider text-xs shadow-md shadow-[#ff6b00]/20 transition-all"
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

        {/* CONTÊINER A4 */}
        <div className="w-[210mm] bg-white text-black px-12 py-14 my-8 shadow-2xl print:shadow-none print:m-0 print:w-[210mm] print:p-0 print:overflow-visible">
          
          {/* HEADER PRINCIPAL */}
          <div className="flex justify-between items-start mb-8 pb-6 border-b-2 border-zinc-900 print:break-inside-avoid">
            {/* Esquerda: Arreda Info */}
            <div className="flex flex-col">
              <div className="h-14 mb-4 flex items-center">
                {logoProdutora ? (
                  <img src={logoProdutora} className="max-h-full object-contain" alt="Logo Produtora" />
                ) : (
                  <div className="text-2xl font-black tracking-tighter">ARREDA AUDIOVISUAL</div>
                )}
              </div>
              <div className="text-[10px] leading-tight text-zinc-600 font-medium">
                ARREDA AUDIOVISUAL LTDA<br/>
                CNPJ: 00.000.000/0000-00<br/>
                Endereço: Rua Exemplo, 123 - Cidade/UF<br/>
                Contato: contato@arreda.com.br
              </div>
            </div>

            {/* Direita: Cliente Info e Metadados */}
            <div className="flex flex-col items-end text-right">
              {logoCliente && (
                <div className="h-14 mb-4 flex justify-end">
                  <img src={logoCliente} className="max-h-full object-contain" alt="Logo Cliente" />
                </div>
              )}
              
              <div className="text-lg font-black uppercase tracking-tight mb-2">
                Orçamento <span className="text-[#ff6b00]">#{new Date(project.createdAt || new Date()).getFullYear()}-{project.projectNumber || '0000'}</span>
              </div>
              
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px] text-zinc-600 font-medium">
                <div className="font-bold text-zinc-800">Data:</div>
                <div>{dataEmissao}</div>
                
                <div className="font-bold text-zinc-800">Validade:</div>
                <input 
                  type="text" 
                  value={validade} 
                  onChange={e => setValidade(e.target.value)} 
                  className="text-right bg-transparent border-none outline-none p-0 w-24 hover:bg-zinc-50 focus:bg-zinc-50 print:hover:bg-transparent" 
                />
                
                <div className="font-bold text-zinc-800">Entrega:</div>
                <input 
                  type="text" 
                  value={previsaoEntrega} 
                  onChange={e => setPrevisaoEntrega(e.target.value)} 
                  className="text-right bg-transparent border-none outline-none p-0 w-24 hover:bg-zinc-50 focus:bg-zinc-50 print:hover:bg-transparent" 
                />
              </div>
            </div>
          </div>

          {/* IDENTIFICAÇÃO DO PROJETO */}
          <div className="mb-8 print:break-inside-avoid">
            <div className="mb-4">
              <label className="block text-xs font-black uppercase tracking-widest text-[#ff6b00] mb-1">PROJETO:</label>
              <textarea 
                value={projetoText}
                onChange={(e) => { setProjetoText(e.target.value); handleAutoResize(e); }}
                className="w-full text-sm font-bold text-zinc-900 bg-transparent border border-transparent hover:border-zinc-200 focus:border-zinc-300 outline-none p-1 -ml-1 resize-none overflow-hidden print:border-transparent print:p-0 print:ml-0"
                style={{ height: 'auto', minHeight: '30px' }}
                rows={1}
              />
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-[#ff6b00] mb-1">ETAPAS DO PROJETO:</label>
              <textarea 
                value={etapasText}
                onChange={(e) => { setEtapasText(e.target.value); handleAutoResize(e); }}
                className="w-full text-sm font-medium text-zinc-700 bg-transparent border border-transparent hover:border-zinc-200 focus:border-zinc-300 outline-none p-1 -ml-1 resize-none overflow-hidden leading-relaxed print:border-transparent print:p-0 print:ml-0"
                style={{ height: 'auto', minHeight: '60px' }}
                rows={3}
              />
            </div>
          </div>

          {/* TABELA DE ESCOPO */}
          <div className="mb-8 w-full border border-zinc-900 rounded-md overflow-hidden">
            {/* Header da Tabela */}
            <div className="flex bg-zinc-900 text-white text-[10px] font-black uppercase tracking-wider print:bg-zinc-900 print:text-white print:break-inside-avoid">
              <div className="w-12 p-3 text-center border-r border-zinc-700">Qt.</div>
              <div className="w-48 p-3 border-r border-zinc-700">Produto/Serviço</div>
              <div className="flex-1 p-3 border-r border-zinc-700">Detalhe do Item</div>
              {showSubtotals && (
                <>
                  <div className="w-28 p-3 text-right border-r border-zinc-700">Valor Unit.</div>
                  <div className="w-28 p-3 text-right">Subtotal</div>
                </>
              )}
            </div>

            {/* Linhas da Tabela */}
            <div className="flex flex-col bg-white">
              {investmentLines.map((line, idx) => (
                <div key={line.id} className={cn(
                  "flex text-[11px] print:break-inside-avoid",
                  idx !== investmentLines.length - 1 ? "border-b border-zinc-200" : ""
                )}>
                  <div className="w-12 p-3 text-center font-bold text-zinc-900 border-r border-zinc-200 flex items-center justify-center">
                    {line.qty}
                  </div>
                  <div className="w-48 p-3 font-bold text-zinc-900 border-r border-zinc-200">
                    {line.name}
                  </div>
                  <div className="flex-1 p-3 border-r border-zinc-200">
                    <textarea 
                      value={line.description}
                      onChange={(e) => {
                        updateLine(line.id, { description: e.target.value });
                        handleAutoResize(e);
                      }}
                      className="w-full text-[11px] font-medium text-zinc-700 bg-transparent border border-transparent hover:border-zinc-200 focus:border-zinc-300 outline-none p-1 -ml-1 resize-none overflow-hidden leading-snug print:border-transparent print:p-0 print:ml-0"
                      style={{ height: 'auto', minHeight: '40px' }}
                      placeholder="Descreva o escopo deste item..."
                    />
                  </div>
                  {showSubtotals && (
                    <>
                      <div className="w-28 p-3 text-right font-mono text-zinc-700 border-r border-zinc-200 flex items-center justify-end">
                        {formatCurrency(line.unitCost)}
                      </div>
                      <div className="w-28 p-3 text-right font-mono font-bold text-zinc-900 flex items-center justify-end">
                        {formatCurrency(line.total)}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* RODAPÉ FINANCEIRO E COMERCIAL */}
          <div className="flex flex-col gap-6 print:break-inside-avoid">
            
            {/* Resumo Financeiro */}
            <div className="flex justify-end">
              <div className="w-72 bg-zinc-50 border border-zinc-200 rounded-lg p-4">
                <div className="flex justify-between items-center mb-2 pb-2 border-b border-zinc-200">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Valor Líquido</span>
                  <span className="text-sm font-mono font-medium text-zinc-700">{formatCurrency(calculatedTotal)}</span>
                </div>
                <div className="flex justify-between items-center pt-1">
                  <span className="text-xs font-black uppercase tracking-widest text-zinc-900">Total</span>
                  <span className="text-lg font-mono font-black text-[#ff6b00]">{formatCurrency(calculatedTotal)}</span>
                </div>
              </div>
            </div>

            {/* Forma de Pagamento e Observações */}
            <div className="grid grid-cols-2 gap-8 text-sm">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-[#ff6b00] mb-2">FORMA DE PAGAMENTO:</label>
                <textarea 
                  value={formaPagamento}
                  onChange={(e) => { setFormaPagamento(e.target.value); handleAutoResize(e); }}
                  className="w-full text-[11px] font-medium text-zinc-700 bg-transparent border border-transparent hover:border-zinc-200 focus:border-zinc-300 outline-none p-2 -ml-2 resize-none overflow-hidden leading-relaxed print:border-transparent print:p-0 print:ml-0"
                  style={{ height: 'auto', minHeight: '60px' }}
                />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-[#ff6b00] mb-2">OBSERVAÇÕES:</label>
                <textarea 
                  value={observacoes}
                  onChange={(e) => { setObservacoes(e.target.value); handleAutoResize(e); }}
                  className="w-full text-[11px] font-medium text-zinc-700 bg-transparent border border-transparent hover:border-zinc-200 focus:border-zinc-300 outline-none p-2 -ml-2 resize-none overflow-hidden leading-relaxed print:border-transparent print:p-0 print:ml-0"
                  style={{ height: 'auto', minHeight: '60px' }}
                />
              </div>
            </div>
            
            {/* Assinatura (Opcional, mas comum em orçamentos ARREDA) */}
            <div className="mt-12 pt-8 flex justify-center print:break-inside-avoid">
              <div className="w-64 border-t border-zinc-400 pt-2 text-center">
                <div className="text-xs font-bold text-zinc-900">ARREDA AUDIOVISUAL</div>
                <div className="text-[10px] text-zinc-500 uppercase tracking-widest">Depto. Comercial</div>
              </div>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
}
