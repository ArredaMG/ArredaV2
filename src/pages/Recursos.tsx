import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Check, X, Search, Users, Camera, Briefcase, FileStack } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { useModal } from '../context/ModalContext';
import { Professional, Equipment, Client } from '../types';
import { cn, formatCurrency } from '../lib/utils';
import { useNavigate } from 'react-router-dom';

export const Recursos: React.FC = () => {
  const { professionals, equipments, clientes, templates, addProfessional, updateProfessional, deleteProfessional, addEquipment, updateEquipment, deleteEquipment, addClient, deleteClient, deleteTemplate, setEditingTemplateId, addProject } = useAppContext();
  const { openModal } = useModal();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'profissionais' | 'equipamentos' | 'clientes' | 'templates'>('profissionais');
  const [searchQuery, setSearchQuery] = useState('');

  // Reset search when changing tabs
  useEffect(() => {
    setSearchQuery('');
  }, [activeTab]);

  // Inline editing state for professionals
  const [editingProf, setEditingProf] = useState<string | null>(null);
  const [editProfData, setEditProfData] = useState<Partial<Professional>>({});
  const [newProfData, setNewProfData] = useState<Partial<Professional>>({});

  // Inline editing state for equipments
  const [editingEquip, setEditingEquip] = useState<string | null>(null);
  const [editEquipData, setEditEquipData] = useState<Partial<Equipment>>({});
  const [newEquipData, setNewEquipData] = useState<Partial<Equipment>>({});
  const [newClientData, setNewClientData] = useState<Partial<Client>>({});

  const filteredProfessionals = professionals.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.role.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredEquipments = equipments.filter(e => e.name.toLowerCase().includes(searchQuery.toLowerCase()) || e.category.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredClientes = clientes.filter(c => c.nome.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredTemplates = templates.filter(t => t.name.toLowerCase().includes(searchQuery.toLowerCase()));

  const handleDeleteProf = (id: string) => {
    openModal({
      title: 'Excluir Profissional',
      message: 'Tem certeza que deseja excluir? Esta ação não afetará os orçamentos já criados.',
      onConfirm: () => {
        deleteProfessional(id);
      }
    });
  };

  const handleDeleteEquip = (id: string) => {
    openModal({
      title: 'Excluir Equipamento',
      message: 'Tem certeza que deseja excluir? Esta ação não afetará os orçamentos já criados.',
      onConfirm: () => {
        deleteEquipment(id);
      }
    });
  };

  const handleSaveProf = async (id: string) => {
    if (id === 'new') {
      if (newProfData.name) {
        await addProfessional({
          name: newProfData.name || '',
          role: newProfData.role || '',
          pix: newProfData.pix || '',
          dailyRate: newProfData.dailyRate || 0
        });
        setNewProfData({});
      }
    } else {
      await updateProfessional(id, editProfData);
      setEditingProf(null);
    }
  };

  const handleSaveEquip = async (id: string) => {
    if (id === 'new') {
      if (newEquipData.name) {
        await addEquipment({
          name: newEquipData.name || '',
          category: newEquipData.category || '',
          rentalValue: newEquipData.rentalValue || 0
        });
        setNewEquipData({});
      }
    } else {
      await updateEquipment(id, editEquipData);
      setEditingEquip(null);
    }
  };

  const tabs = [
    { id: 'profissionais', label: 'Profissionais', icon: Users },
    { id: 'equipamentos', label: 'Equipamentos', icon: Camera },
    { id: 'clientes', label: 'Clientes', icon: Briefcase },
    { id: 'templates', label: 'Templates', icon: FileStack },
  ];

  return (
    <div className="flex flex-col h-full bg-[#F5F5F7] dark:bg-[#000000] overflow-hidden">
      
      {/* ── CABEÇALHO (shrink-0) ───────────────────────────────────────── */}
      <div className="shrink-0 bg-white dark:bg-[#1C1C1E] border-b border-zinc-200 dark:border-zinc-800 px-8 py-8 z-10 shadow-sm">
        <div className="max-w-[1400px] mx-auto">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
            <div>
              <h1 className="text-3xl font-bold tracking-tight mb-1 text-gray-900 dark:text-white">Banco de Recursos</h1>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Gerencie freelancers, equipamentos e modelos base para seus projetos.</p>
            </div>
            
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-orange-500 transition-colors w-4 h-4" />
              <input 
                type="text" 
                placeholder={`Buscar em ${activeTab}...`} 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full md:w-80 bg-zinc-100 dark:bg-zinc-800/50 border border-transparent focus:border-orange-500/50 focus:bg-white dark:focus:bg-zinc-800 rounded-xl pl-10 pr-4 py-2.5 outline-none transition-all text-sm"
              />
            </div>
          </div>

          <div className="flex gap-2 p-1 bg-zinc-100 dark:bg-zinc-800/50 rounded-xl w-fit">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  "flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all duration-200",
                  activeTab === tab.id 
                    ? "bg-white dark:bg-zinc-700 text-[#ff6b00] shadow-md" 
                    : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300"
                )}
              >
                <tab.icon size={16} strokeWidth={2.5} />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── ÁREA DE CONTEÚDO SCROLLÁVEL (flex-1) ───────────────────────── */}
      <div className="flex-1 overflow-y-auto px-8 py-8 pb-32">
        <div className="max-w-[1400px] mx-auto">
          
          {activeTab === 'profissionais' && (
            <div className="bg-white dark:bg-[#1C1C1E] border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
              <div className="w-full overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[800px]">
                  <thead>
                    <tr className="bg-zinc-50 dark:bg-zinc-900/50 text-zinc-500 dark:text-zinc-400 text-[11px] font-black uppercase tracking-wider border-b border-zinc-200 dark:border-zinc-800">
                      <th className="px-6 py-4">Nome / Razão Social</th>
                      <th className="px-6 py-4">Função</th>
                      <th className="px-6 py-4">Chave PIX</th>
                      <th className="px-6 py-4 w-40 text-right">Diária (R$)</th>
                      <th className="px-6 py-4 w-24 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    <tr className="bg-orange-50/30 dark:bg-orange-950/5">
                      <td className="px-4 py-4">
                        <input type="text" placeholder="Adicionar novo profissional..." value={newProfData.name || ''} onChange={e => setNewProfData({...newProfData, name: e.target.value})} className="w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 outline-none focus:border-orange-500 text-sm font-bold" />
                      </td>
                      <td className="px-4 py-4">
                        <input type="text" placeholder="Função" value={newProfData.role || ''} onChange={e => setNewProfData({...newProfData, role: e.target.value})} className="w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 outline-none focus:border-orange-500 text-sm" />
                      </td>
                      <td className="px-4 py-4">
                        <input type="text" placeholder="Chave PIX" value={newProfData.pix || ''} onChange={e => setNewProfData({...newProfData, pix: e.target.value})} className="w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 outline-none focus:border-orange-500 text-sm font-mono" />
                      </td>
                      <td className="px-4 py-4">
                        <input type="number" placeholder="0.00" value={newProfData.dailyRate || ''} onChange={e => setNewProfData({...newProfData, dailyRate: Number(e.target.value)})} className="w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 outline-none focus:border-orange-500 text-right font-mono font-bold" />
                      </td>
                      <td className="px-4 py-4 text-right">
                        <button onClick={() => handleSaveProf('new')} className="p-2.5 bg-[#ff6b00] text-white hover:bg-[#ff8c00] transition-all rounded-xl shadow-lg shadow-orange-500/20 active:scale-95"><Plus size={18} strokeWidth={3} /></button>
                      </td>
                    </tr>
                    
                    {filteredProfessionals.map((p) => (
                      <tr key={p.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30 transition-colors group">
                        {editingProf === p.id ? (
                          <>
                            <td className="px-4 py-4"><input type="text" value={editProfData.name} onChange={e => setEditProfData({...editProfData, name: e.target.value})} className="w-full bg-white dark:bg-zinc-800 border border-orange-500 rounded-lg px-3 py-2 outline-none font-bold" /></td>
                            <td className="px-4 py-4"><input type="text" value={editProfData.role} onChange={e => setEditProfData({...editProfData, role: e.target.value})} className="w-full bg-white dark:bg-zinc-800 border border-orange-500 rounded-lg px-3 py-2 outline-none" /></td>
                            <td className="px-4 py-4"><input type="text" value={editProfData.pix} onChange={e => setEditProfData({...editProfData, pix: e.target.value})} className="w-full bg-white dark:bg-zinc-800 border border-orange-500 rounded-lg px-3 py-2 outline-none font-mono" /></td>
                            <td className="px-4 py-4"><input type="number" value={editProfData.dailyRate} onChange={e => setEditProfData({...editProfData, dailyRate: Number(e.target.value)})} className="w-full bg-white dark:bg-zinc-800 border border-orange-500 rounded-lg px-3 py-2 outline-none text-right font-mono font-bold" /></td>
                            <td className="px-4 py-4 text-right">
                              <div className="flex justify-end gap-2">
                                <button onClick={() => handleSaveProf(p.id)} className="p-2 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-lg transition-all"><Check size={18} strokeWidth={3} /></button>
                                <button onClick={() => setEditingProf(null)} className="p-2 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-all"><X size={18} /></button>
                              </div>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="px-6 py-5 font-bold text-gray-900 dark:text-white">{p.name}</td>
                            <td className="px-6 py-5 text-zinc-500 dark:text-zinc-400 font-medium">{p.role}</td>
                            <td className="px-6 py-5 text-zinc-400 font-mono text-xs">{p.pix || '-'}</td>
                            <td className="px-6 py-5 text-right font-mono font-bold text-gray-900 dark:text-white tabular-nums">{formatCurrency(p.dailyRate)}</td>
                            <td className="px-6 py-5 text-right">
                              <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                                <button onClick={() => { setEditingProf(p.id); setEditProfData(p); }} className="p-2 text-zinc-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/20 rounded-lg transition-colors"><Edit2 size={16} /></button>
                                <button onClick={() => handleDeleteProf(p.id)} className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors"><Trash2 size={16} /></button>
                              </div>
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'equipamentos' && (
            <div className="bg-white dark:bg-[#1C1C1E] border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
              <div className="w-full overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[800px]">
                  <thead>
                    <tr className="bg-zinc-50 dark:bg-zinc-900/50 text-zinc-500 dark:text-zinc-400 text-[11px] font-black uppercase tracking-wider border-b border-zinc-200 dark:border-zinc-800">
                      <th className="px-6 py-4">Equipamento / Recurso</th>
                      <th className="px-6 py-4">Categoria</th>
                      <th className="px-6 py-4 w-40 text-right">Locação (R$)</th>
                      <th className="px-6 py-4 w-24 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    <tr className="bg-orange-50/30 dark:bg-orange-950/5">
                      <td className="px-4 py-4">
                        <input type="text" placeholder="Adicionar novo equipamento..." value={newEquipData.name || ''} onChange={e => setNewEquipData({...newEquipData, name: e.target.value})} className="w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 outline-none focus:border-orange-500 text-sm font-bold" />
                      </td>
                      <td className="px-4 py-4">
                        <input type="text" placeholder="Categoria (ex: Luz, Câmera)" value={newEquipData.category || ''} onChange={e => setNewEquipData({...newEquipData, category: e.target.value})} className="w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 outline-none focus:border-orange-500 text-sm" />
                      </td>
                      <td className="px-4 py-4">
                        <input type="number" placeholder="0.00" value={newEquipData.rentalValue || ''} onChange={e => setNewEquipData({...newEquipData, rentalValue: Number(e.target.value)})} className="w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 outline-none focus:border-orange-500 text-right font-mono font-bold" />
                      </td>
                      <td className="px-4 py-4 text-right">
                        <button onClick={() => handleSaveEquip('new')} className="p-2.5 bg-[#ff6b00] text-white hover:bg-[#ff8c00] transition-all rounded-xl shadow-lg shadow-orange-500/20 active:scale-95"><Plus size={18} strokeWidth={3} /></button>
                      </td>
                    </tr>
                    
                    {filteredEquipments.map((eq) => (
                      <tr key={eq.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30 transition-colors group">
                        {editingEquip === eq.id ? (
                          <>
                            <td className="px-4 py-4"><input type="text" value={editEquipData.name} onChange={e => setEditEquipData({...editEquipData, name: e.target.value})} className="w-full bg-white dark:bg-zinc-800 border border-orange-500 rounded-lg px-3 py-2 outline-none font-bold" /></td>
                            <td className="px-4 py-4"><input type="text" value={editEquipData.category} onChange={e => setEditEquipData({...editEquipData, category: e.target.value})} className="w-full bg-white dark:bg-zinc-800 border border-orange-500 rounded-lg px-3 py-2 outline-none" /></td>
                            <td className="px-4 py-4"><input type="number" value={editEquipData.rentalValue} onChange={e => setEditEquipData({...editEquipData, rentalValue: Number(e.target.value)})} className="w-full bg-white dark:bg-zinc-800 border border-orange-500 rounded-lg px-3 py-2 outline-none text-right font-mono font-bold" /></td>
                            <td className="px-4 py-4 text-right">
                              <div className="flex justify-end gap-2">
                                <button onClick={() => handleSaveEquip(eq.id)} className="p-2 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-lg transition-all"><Check size={18} strokeWidth={3} /></button>
                                <button onClick={() => setEditingEquip(null)} className="p-2 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-all"><X size={18} /></button>
                              </div>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="px-6 py-5 font-bold text-gray-900 dark:text-white">{eq.name}</td>
                            <td className="px-6 py-5 text-zinc-500 dark:text-zinc-400 font-medium">{eq.category}</td>
                            <td className="px-6 py-5 text-right font-mono font-bold text-gray-900 dark:text-white tabular-nums">{formatCurrency(eq.rentalValue)}</td>
                            <td className="px-6 py-5 text-right">
                              <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                                <button onClick={() => { setEditingEquip(eq.id); setEditEquipData(eq); }} className="p-2 text-zinc-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/20 rounded-lg transition-colors"><Edit2 size={16} /></button>
                                <button onClick={() => handleDeleteEquip(eq.id)} className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors"><Trash2 size={16} /></button>
                              </div>
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'clientes' && (
            <div className="bg-white dark:bg-[#1C1C1E] border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
              <div className="w-full overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[600px]">
                  <thead>
                    <tr className="bg-zinc-50 dark:bg-zinc-900/50 text-zinc-500 dark:text-zinc-400 text-[11px] font-black uppercase tracking-wider border-b border-zinc-200 dark:border-zinc-800">
                      <th className="px-6 py-4">Nome / Razão Social</th>
                      <th className="px-6 py-4">CNPJ</th>
                      <th className="px-6 py-4 w-24 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    <tr className="bg-orange-50/30 dark:bg-orange-950/5">
                      <td className="px-4 py-4">
                        <input 
                          type="text" 
                          placeholder="Adicionar novo cliente..." 
                          value={newClientData.nome || ''} 
                          onChange={e => setNewClientData({...newClientData, nome: e.target.value})} 
                          className="w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 outline-none focus:border-orange-500 text-sm font-bold" 
                        />
                      </td>
                      <td className="px-4 py-4">
                        <input 
                          type="text" 
                          placeholder="CNPJ" 
                          value={newClientData.cnpj || ''} 
                          onChange={e => setNewClientData({...newClientData, cnpj: e.target.value})} 
                          className="w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 outline-none focus:border-orange-500 text-sm font-mono" 
                        />
                      </td>
                      <td className="px-4 py-4 text-right">
                        <button 
                          onClick={async () => {
                            if (newClientData.nome) {
                              await addClient({ nome: newClientData.nome, cnpj: newClientData.cnpj || '' });
                              setNewClientData({});
                            }
                          }} 
                          className="p-2.5 bg-[#ff6b00] text-white hover:bg-[#ff8c00] transition-all rounded-xl shadow-lg shadow-orange-500/20 active:scale-95"
                        >
                          <Plus size={18} strokeWidth={3} />
                        </button>
                      </td>
                    </tr>
                    {filteredClientes.map(c => (
                      <tr key={c.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30 transition-colors group">
                        <td className="px-6 py-5 font-bold text-gray-900 dark:text-white">{c.nome}</td>
                        <td className="px-6 py-5 text-zinc-500 dark:text-zinc-400 font-mono text-sm">{c.cnpj}</td>
                        <td className="px-6 py-5 text-right">
                          <button onClick={() => deleteClient(c.id)} className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors opacity-0 group-hover:opacity-100 transform translate-x-2 group-hover:translate-x-0 transition-all"><Trash2 size={16} /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'templates' && (
            <div className="space-y-6">
              <div className="bg-white dark:bg-[#1C1C1E] border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
                <div className="w-full overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[600px]">
                    <thead>
                      <tr className="bg-zinc-50 dark:bg-zinc-900/50 text-zinc-500 dark:text-zinc-400 text-[11px] font-black uppercase tracking-wider border-b border-zinc-200 dark:border-zinc-800">
                        <th className="px-6 py-4">Nome do Template</th>
                        <th className="px-6 py-4 w-24 text-right">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                      {filteredTemplates.map((t) => (
                        <tr key={t.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30 transition-colors group">
                          <td className="px-6 py-5 font-bold text-gray-900 dark:text-white">{t.name}</td>
                          <td className="px-6 py-5 text-right">
                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transform translate-x-2 group-hover:translate-x-0 transition-all">
                              <button 
                                onClick={async () => {
                                  setEditingTemplateId(t.id);
                                  const newProj = await addProject({
                                    title: t.name,
                                    client: 'Edição de Template',
                                    status: 'Pendente',
                                    defaultTax: t.data.defaultTax,
                                    defaultMargin: t.data.defaultMargin,
                                    groups: []
                                  });
                                  navigate('/orcamentos/' + newProj.id);
                                }} 
                                className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/20 rounded-lg transition-colors"
                                title="Visualizar/Editar"
                              >
                                🔍
                              </button>
                              <button onClick={() => deleteTemplate(t.id)} className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors"><Trash2 size={16} /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {filteredTemplates.length === 0 && (
                        <tr>
                          <td colSpan={2} className="px-6 py-20 text-center">
                            <div className="flex flex-col items-center gap-2">
                              <span className="text-4xl grayscale opacity-50 mb-2">📂</span>
                              <p className="text-zinc-500 font-medium">Nenhum template encontrado.</p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
