import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit2, Mail, MessageCircle, Instagram, Linkedin, Globe, Briefcase, Info, X, Plus, Trash2, Calendar, FileText, Users } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { useModal } from '../context/ModalContext';
import { Client } from '../types';

export const ClienteProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { clientes, updateClient, deleteClient } = useAppContext();
  const { openModal } = useModal();

  const client = clientes.find(c => c.id === id);

  // Editing state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDocument, setEditDocument] = useState('');
  const [editContactName, setEditContactName] = useState('');
  const [editContactRole, setEditContactRole] = useState('');
  const [editLeadSource, setEditLeadSource] = useState('');
  const [editContactInput, setEditContactInput] = useState('');
  const [editContacts, setEditContacts] = useState<{ type: string; value: string }[]>([]);

  if (!client) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-[#F5F5F7] dark:bg-[#000000] text-gray-900 dark:text-gray-100 p-8">
        <div className="bg-white dark:bg-[#1C1C1E] border border-gray-200 dark:border-gray-800 rounded-2xl p-8 max-w-md w-full text-center shadow-xl">
          <span className="text-5xl mb-4 block">🔍</span>
          <h2 className="text-xl font-bold mb-2">Cliente Não Encontrado</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">O cliente solicitado não pôde ser localizado ou foi excluído do sistema.</p>
          <button 
            onClick={() => navigate('/clientes')}
            className="flex items-center gap-2 bg-[#AE0000] hover:bg-[#AE0000] text-white px-5 py-3 rounded-xl font-bold transition-all shadow-lg shadow-orange-500/20 active:scale-95 mx-auto text-sm"
          >
            <ArrowLeft size={16} />
            <span>Voltar para Lista</span>
          </button>
        </div>
      </div>
    );
  }

  // Open edit modal and populate values
  const handleOpenEditModal = () => {
    setEditName(client.name || '');
    setEditDocument(client.document || '');
    setEditContactName(client.contactName || '');
    setEditContactRole(client.contactRole || '');
    setEditLeadSource(client.leadSource || '');
    setEditContacts(client.contacts ? [...client.contacts] : []);
    setEditContactInput('');
    setIsEditModalOpen(true);
  };

  // Regex helper inside edit
  const detectContactType = (val: string): 'email' | 'whatsapp' | 'instagram' | 'linkedin' | 'website' => {
    const value = val.trim().toLowerCase();
    if (value.includes('@') && value.includes('.com')) return 'email';
    const cleanPhone = value.replace(/[\s\-\+\(\)]/g, '');
    if (/^\d{8,15}$/.test(cleanPhone)) return 'whatsapp';
    if (value.includes('instagram.com') || val.trim().startsWith('@')) return 'instagram';
    if (value.includes('linkedin.com')) return 'linkedin';
    return 'website';
  };

  const handleAddEditContact = () => {
    if (!editContactInput.trim()) return;
    const value = editContactInput.trim();
    const type = detectContactType(value);
    
    if (!editContacts.some(c => c.value === value)) {
      setEditContacts(prev => [...prev, { type, value }]);
    }
    setEditContactInput('');
  };

  const handleRemoveEditContact = (idx: number) => {
    setEditContacts(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) return;

    await updateClient(client.id, {
      name: editName.trim(),
      document: editDocument.trim() || null,
      contactName: editContactName.trim() || null,
      contactRole: editContactRole.trim() || null,
      leadSource: editLeadSource.trim() || null,
      contacts: editContacts,
    });

    setIsEditModalOpen(false);
  };

  const handleDeleteClient = () => {
    openModal({
      title: 'Excluir Cliente',
      message: `Tem certeza que deseja excluir o cliente "${client.name}" definitivamente? Esta ação não afetará os orçamentos já criados.`,
      onConfirm: async () => {
        await deleteClient(client.id);
        navigate('/clientes');
      }
    });
  };

  const getContactIcon = (type: string) => {
    switch (type) {
      case 'email': return <Mail size={16} className="text-zinc-500" />;
      case 'whatsapp': return <MessageCircle size={16} className="text-emerald-500" />;
      case 'instagram': return <Instagram size={16} className="text-pink-500" />;
      case 'linkedin': return <Linkedin size={16} className="text-blue-500" />;
      default: return <Globe size={16} className="text-teal-500" />;
    }
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
    if (type === 'linkedin' || type === 'website') {
      return value.startsWith('http') ? value : `https://${value}`;
    }
    return value;
  };

  return (
    <div className="flex flex-col h-full bg-[#F5F5F7] dark:bg-[#000000] overflow-hidden">
      
      {/* ── CABEÇALHO (shrink-0) ───────────────────────────────────────── */}
      <div className="shrink-0 bg-white dark:bg-[#1C1C1E] border-b border-gray-200 dark:border-gray-800 px-8 py-6 z-10 shadow-sm">
        <div className="max-w-[1400px] mx-auto flex flex-col gap-4">
          
          {/* Back button and page status */}
          <div className="flex items-center justify-between">
            <button 
              onClick={() => navigate('/clientes')}
              className="flex items-center gap-2 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 font-bold transition-all text-sm group"
            >
              <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
              <span>Voltar para Clientes</span>
            </button>
            
            <div className="flex gap-2">
              <button 
                onClick={handleOpenEditModal}
                className="flex items-center gap-1.5 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 px-4 py-2.5 rounded-xl font-bold transition-all text-xs"
              >
                <Edit2 size={13} />
                <span>Editar Dados</span>
              </button>
              <button 
                onClick={handleDeleteClient}
                className="flex items-center gap-1.5 border border-red-200 hover:border-red-500 bg-red-50/50 hover:bg-red-500 text-red-600 hover:text-white px-4 py-2.5 rounded-xl font-bold transition-all text-xs"
              >
                <Trash2 size={13} />
                <span>Excluir Cliente</span>
              </button>
            </div>
          </div>

          {/* Main Title Area */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mt-2">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-[#AE0000] dark:text-[#AE0000]">Perfil do Cliente</span>
              <h1 className="text-3xl font-extrabold tracking-tight mt-1 text-gray-900 dark:text-white">{client.name}</h1>
              {client.document && (
                <div className="flex items-center gap-1.5 mt-1.5 text-xs font-mono text-zinc-400 dark:text-zinc-500">
                  <span className="font-bold">CPF/CNPJ:</span>
                  <span>{client.document}</span>
                </div>
              )}
            </div>

            {/* Premium Financial Card */}
            <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-900/30 rounded-2xl px-6 py-4 flex flex-col justify-center shadow-sm shrink-0">
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">LTV (Total Investido)</span>
              <span className="text-2xl font-black text-emerald-700 dark:text-emerald-300 mt-1">R$ 0,00</span>
            </div>
          </div>

        </div>
      </div>

      {/* ── CORPO COM LAYOUT EM GRID (flex-1) ─────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-8 py-8 pb-32">
        <div className="max-w-[1400px] mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Coluna Esquerda (1/3) */}
          <div className="lg:col-span-1 space-y-6">

            {/* Card Pessoas & Contatos */}
            <div className="bg-white dark:bg-[#1C1C1E] p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col gap-6">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-5 w-5 text-[#AE0000]" />
                <h2 className="text-sm font-bold text-gray-900 dark:text-white">Pessoas &amp; Contatos</h2>
              </div>

              {client.decisores && client.decisores.length > 0 ? (
                <div className="flex flex-col gap-4">
                  {client.decisores.map((decisor: any) => (
                    <div key={decisor.id} className="bg-gray-50 dark:bg-[#2C2C2E]/50 p-4 rounded-xl border border-gray-200 dark:border-gray-800">
                      <div className="font-bold text-sm text-gray-900 dark:text-white">{decisor.name}</div>
                      <div className="text-[10px] font-black uppercase tracking-wider text-[#AE0000] mb-3">{decisor.role}</div>
                      <div className="flex flex-col gap-2">
                        {decisor.contacts && decisor.contacts.length > 0 ? (
                          decisor.contacts.map((c: any, i: number) => (
                            <div key={i} className="flex items-center gap-2 text-xs font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-[#1C1C1E] p-2 rounded-lg border border-gray-100 dark:border-gray-800">
                              <span className="text-gray-400 capitalize w-20">[{c.type}]</span>
                              <a href={c.type === 'whatsapp' ? `https://wa.me/${c.value.replace(/\D/g, '')}` : c.type === 'email' ? `mailto:${c.value}` : '#'} target="_blank" rel="noopener noreferrer" className="hover:text-[#AE0000] transition-colors truncate">{c.value}</a>
                            </div>
                          ))
                        ) : (
                          <span className="text-xs text-gray-400 italic">Nenhum meio de contato registrado.</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 bg-gray-50 dark:bg-[#2C2C2E]/50 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
                  <span className="text-sm font-medium text-gray-500">Nenhuma pessoa cadastrada nesta empresa.</span>
                </div>
              )}
            </div>

            {/* Card Metadata (Cadastro) */}
            <div className="bg-white dark:bg-[#1C1C1E] border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm text-xs text-zinc-400 dark:text-zinc-500">
              <div className="flex justify-between py-1.5">
                <span>Criado em:</span>
                <span className="font-semibold text-zinc-600 dark:text-zinc-400">
                  {client.createdAt ? new Date(client.createdAt).toLocaleDateString('pt-BR') : 'Hoje'}
                </span>
              </div>
              <div className="flex justify-between py-1.5">
                <span>Última atualização:</span>
                <span className="font-semibold text-zinc-600 dark:text-zinc-400">
                  {client.updatedAt ? new Date(client.updatedAt).toLocaleDateString('pt-BR') : 'Hoje'}
                </span>
              </div>
            </div>
          </div>

          {/* Coluna Direita (2/3) - Histórico de Orçamentos */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white dark:bg-[#1C1C1E] border border-gray-200 dark:border-gray-800 rounded-2xl p-8 shadow-sm min-h-[500px] flex flex-col">
              <h3 className="text-base font-bold text-gray-900 dark:text-white mb-6 border-b border-zinc-100 dark:border-zinc-800 pb-3">
                Histórico de Orçamentos
              </h3>
              
              {/* Beautiful Empty State */}
              <div className="flex-1 flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 rounded-2xl bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center text-zinc-400 dark:text-zinc-600 mb-4 border border-zinc-100 dark:border-zinc-800 shadow-inner">
                  <FileText size={28} />
                </div>
                <h4 className="font-bold text-zinc-800 dark:text-zinc-200 mb-1.5">Histórico Comercial Limpo</h4>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-sm">Nenhum orçamento gerado para este cliente ainda, pois faremos essa integração na Fase 2.</p>
              </div>

            </div>
          </div>

        </div>
      </div>

      {/* ── MODAL EDITAR DADOS ────────────────────────────────────────── */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white dark:bg-[#1C1C1E] border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl p-6 text-gray-900 dark:text-gray-100 overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Header */}
            <div className="flex justify-between items-center mb-6 shrink-0">
              <h3 className="text-xl font-bold tracking-tight">📝 Editar Perfil de Cliente</h3>
              <button 
                onClick={() => setIsEditModalOpen(false)}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Edit Form */}
            <form onSubmit={handleSaveEdit} className="space-y-4 flex-1 overflow-y-auto pr-1">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">Nome da Empresa *</label>
                <input 
                  type="text" 
                  required
                  placeholder="Ex: Empresa Exemplo Ltda"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="w-full bg-zinc-100 dark:bg-zinc-800/60 border border-transparent focus:border-orange-500/50 focus:bg-white dark:focus:bg-zinc-800 rounded-xl px-4 py-2.5 outline-none transition-all text-sm font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">CNPJ ou CPF</label>
                <input 
                  type="text" 
                  placeholder="Ex: 00.000.000/0001-00"
                  value={editDocument}
                  onChange={e => setEditDocument(e.target.value)}
                  className="w-full bg-zinc-100 dark:bg-zinc-800/60 border border-transparent focus:border-orange-500/50 focus:bg-white dark:focus:bg-zinc-800 rounded-xl px-4 py-2.5 outline-none transition-all text-sm font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">Nome do Contato</label>
                  <input 
                    type="text" 
                    placeholder="Ex: João"
                    value={editContactName}
                    onChange={e => setEditContactName(e.target.value)}
                    className="w-full bg-zinc-100 dark:bg-zinc-800/60 border border-transparent focus:border-orange-500/50 focus:bg-white dark:focus:bg-zinc-800 rounded-xl px-4 py-2.5 outline-none transition-all text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">Cargo do Contato</label>
                  <input 
                    type="text" 
                    placeholder="Ex: Diretor Financeiro"
                    value={editContactRole}
                    onChange={e => setEditContactRole(e.target.value)}
                    className="w-full bg-zinc-100 dark:bg-zinc-800/60 border border-transparent focus:border-orange-500/50 focus:bg-white dark:focus:bg-zinc-800 rounded-xl px-4 py-2.5 outline-none transition-all text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">Origem do Lead</label>
                <input 
                  type="text" 
                  placeholder="Ex: Indicação, Instagram, Google..."
                  value={editLeadSource}
                  onChange={e => setEditLeadSource(e.target.value)}
                  className="w-full bg-zinc-100 dark:bg-zinc-800/60 border border-transparent focus:border-orange-500/50 focus:bg-white dark:focus:bg-zinc-800 rounded-xl px-4 py-2.5 outline-none transition-all text-sm"
                />
              </div>

              <div className="border-t border-gray-100 dark:border-gray-800 pt-4">
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1">Adicionar Canal de Contato</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="Link, e-mail, telefone com DDD ou @user..."
                    value={editContactInput}
                    onChange={e => setEditContactInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddEditContact();
                      }
                    }}
                    className="flex-1 bg-zinc-100 dark:bg-zinc-800/60 border border-transparent focus:border-orange-500/50 focus:bg-white dark:focus:bg-zinc-800 rounded-xl px-4 py-2.5 outline-none transition-all text-sm"
                  />
                  <button
                    type="button"
                    onClick={handleAddEditContact}
                    className="px-4 bg-zinc-800 hover:bg-zinc-700 dark:bg-zinc-700 dark:hover:bg-zinc-600 text-white rounded-xl font-bold transition-all active:scale-95 text-xs"
                  >
                    Adicionar
                  </button>
                </div>

                {/* Added contacts list */}
                <div className="mt-4 flex flex-wrap gap-2 max-h-[120px] overflow-y-auto pr-1">
                  {editContacts.map((c, idx) => (
                    <div 
                      key={idx}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-orange-50/50 dark:bg-orange-950/10 border border-orange-500/20 text-xs font-medium text-zinc-800 dark:text-zinc-200 shadow-sm"
                    >
                      {getContactIcon(c.type)}
                      <span className="truncate max-w-[150px]">{c.value}</span>
                      <button 
                        type="button" 
                        onClick={() => handleRemoveEditContact(idx)}
                        className="p-0.5 rounded-full hover:bg-orange-100 dark:hover:bg-orange-900/50 text-zinc-400 hover:text-orange-600 transition-colors"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions Footer */}
              <div className="border-t border-gray-100 dark:border-gray-800 pt-6 shrink-0 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-5 py-3 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 font-bold transition-all text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!editName.trim()}
                  className="bg-[#AE0000] hover:bg-[#AE0000] disabled:bg-zinc-300 dark:disabled:bg-zinc-800 disabled:text-zinc-500 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg shadow-orange-500/20 active:scale-95 text-sm"
                >
                  Confirmar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

