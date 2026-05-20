import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Mail, MessageCircle, Instagram, Linkedin, Globe, X, Users, ArrowRight, Trash2, ShieldAlert } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { useModal } from '../context/ModalContext';
import { cn } from '../lib/utils';
import { Client } from '../types';

export const ClientesList: React.FC = () => {
  const { clientes, addClient, deleteClient } = useAppContext();
  const { openModal } = useModal();
  const navigate = useNavigate();

  // Search and filtering state
  const [searchQuery, setSearchQuery] = useState('');

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactInput, setContactInput] = useState('');
  const [tempContacts, setTempContacts] = useState<{ type: string; value: string }[]>([]);

  const handleOpenModal = () => {
    setName('');
    setContactName('');
    setContactInput('');
    setTempContacts([]);
    setIsModalOpen(true);
  };

  // Helper function to detect contact type using Regex
  const detectContactType = (val: string): 'email' | 'whatsapp' | 'instagram' | 'linkedin' | 'website' => {
    const value = val.trim().toLowerCase();
    
    // Check if it's an email
    if (value.includes('@') && value.includes('.com')) {
      return 'email';
    }
    
    // Check if it's whatsapp / numeric
    const cleanPhone = value.replace(/[\s\-\+\(\)]/g, '');
    if (/^\d{8,15}$/.test(cleanPhone)) {
      return 'whatsapp';
    }
    
    // Check for instagram
    if (value.includes('instagram.com') || val.trim().startsWith('@')) {
      return 'instagram';
    }
    
    // Check for linkedin
    if (value.includes('linkedin.com')) {
      return 'linkedin';
    }
    
    // Default to general website URL
    return 'website';
  };

  // Handle adding contact from input
  const handleAddContact = () => {
    if (!contactInput.trim()) return;
    const value = contactInput.trim();
    const type = detectContactType(value);
    
    // Avoid duplicates in local state
    if (!tempContacts.some(c => c.value === value)) {
      setTempContacts(prev => [...prev, { type, value }]);
    }
    setContactInput('');
  };

  const handleRemoveContact = (indexToRemove: number) => {
    setTempContacts(prev => prev.filter((_, i) => i !== indexToRemove));
  };

  const handleSaveClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    await addClient({
      name: name.trim(),
      contactName: contactName.trim() || null,
      contactRole: null,
      leadSource: null,
      contacts: tempContacts,
    });

    setIsModalOpen(false);
  };

  const handleDeleteClient = (id: string, clientName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    openModal({
      title: 'Excluir Cliente',
      message: `Tem certeza que deseja excluir o cliente "${clientName}"? Esta ação não afetará os orçamentos já criados.`,
      onConfirm: () => {
        deleteClient(id);
      }
    });
  };

  // Filtered clients list
  const filteredClientes = clientes.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.contactName && c.contactName.toLowerCase().includes(searchQuery.toLowerCase()))
  );

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
      <div className="shrink-0 bg-white dark:bg-[#1C1C1E] border-b border-gray-200 dark:border-gray-800 px-8 py-8 z-10 shadow-sm">
        <div className="max-w-[1400px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight mb-1 text-gray-900 dark:text-white">Clientes</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Gerencie a carteira de contatos e visualize o relacionamento comercial em tempo real.</p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-orange-500 transition-colors w-4 h-4" />
              <input 
                type="text" 
                placeholder="Buscar empresa ou contato..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full md:w-80 bg-zinc-100 dark:bg-zinc-800/50 border border-transparent focus:border-orange-500/50 focus:bg-white dark:focus:bg-zinc-800 rounded-xl pl-10 pr-4 py-2.5 outline-none transition-all text-sm"
              />
            </div>

            <button 
              onClick={handleOpenModal}
              className="flex items-center gap-2 bg-[#ff6b00] hover:bg-[#ff8c00] text-white px-5 py-3 rounded-xl font-bold transition-all shadow-lg shadow-orange-500/20 active:scale-95 shrink-0"
            >
              <Plus size={20} strokeWidth={3} />
              <span>Novo Cliente</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── LISTAGEM SCROLLÁVEL (flex-1) ─────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-8 py-8 pb-32">
        <div className="max-w-[1400px] mx-auto">
          
          <div className="bg-white dark:bg-[#1C1C1E] border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="w-full overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                  <tr className="bg-zinc-50 dark:bg-zinc-900/50 text-zinc-500 dark:text-zinc-400 text-[11px] font-black uppercase tracking-wider border-b border-gray-200 dark:border-gray-800">
                    <th className="px-6 py-4">Empresa / Razão Social</th>
                    <th className="px-6 py-4">Contato Principal</th>
                    <th className="px-6 py-4">Meios de Contato</th>
                    <th className="px-6 py-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {filteredClientes.map((c) => (
                    <tr 
                      key={c.id} 
                      onClick={() => navigate(`/clientes/${c.id}`)}
                      className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30 transition-colors cursor-pointer group"
                    >
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-orange-50 dark:bg-orange-950/20 flex items-center justify-center text-orange-500 group-hover:bg-orange-500 group-hover:text-white transition-all shrink-0">
                            <Users size={20} />
                          </div>
                          <div className="flex flex-col">
                            <span className="font-bold text-gray-900 dark:text-white group-hover:text-[#ff6b00] transition-colors">{c.name}</span>
                            {c.document && <span className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500 mt-0.5">{c.document}</span>}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        {c.contactName ? (
                          <div className="flex flex-col">
                            <span className="font-semibold text-zinc-800 dark:text-zinc-200 text-sm">{c.contactName}</span>
                            {c.contactRole && <span className="text-xs text-zinc-400 mt-0.5">{c.contactRole}</span>}
                          </div>
                        ) : (
                          <span className="text-zinc-400 dark:text-zinc-600 text-xs italic">Não informado</span>
                        )}
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex flex-wrap gap-1.5" onClick={e => e.stopPropagation()}>
                          {c.contacts && c.contacts.length > 0 ? (
                            c.contacts.map((contact, idx) => (
                              <a
                                key={idx}
                                href={getContactLink(contact.type, contact.value)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-zinc-800/40 text-gray-600 dark:text-zinc-300 hover:border-orange-500/50 hover:bg-orange-50/20 dark:hover:bg-orange-950/10 transition-all shadow-sm"
                                title={contact.value}
                              >
                                {getContactIcon(contact.type)}
                                <span className="max-w-[120px] truncate text-[11px]">{contact.value}</span>
                              </a>
                            ))
                          ) : (
                            <span className="text-zinc-400 dark:text-zinc-600 text-xs italic">Nenhum canal salvo</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0" onClick={e => e.stopPropagation()}>
                          <button 
                            onClick={() => navigate(`/clientes/${c.id}`)}
                            className="p-2 text-zinc-600 hover:text-[#ff6b00] hover:bg-orange-50 dark:text-zinc-400 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                            title="Acessar Perfil"
                          >
                            <ArrowRight size={16} />
                          </button>
                          <button 
                            onClick={(e) => handleDeleteClient(c.id, c.name, e)}
                            className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors"
                            title="Excluir"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredClientes.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-20 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <span className="text-4xl grayscale opacity-50 mb-2">👥</span>
                          <p className="text-zinc-500 font-medium">Nenhum cliente cadastrado.</p>
                          {searchQuery && (
                            <button onClick={() => setSearchQuery('')} className="text-[#ff6b00] font-bold text-sm hover:underline">Limpar busca</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* ── MODAL CADASTRO EXPRESS ──────────────────────────────────────── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white dark:bg-[#1C1C1E] border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl p-6 text-gray-900 dark:text-gray-100 overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Header */}
            <div className="flex justify-between items-center mb-6 shrink-0">
              <h3 className="text-xl font-bold tracking-tight">➕ Novo Cadastro Express</h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Form Content */}
            <form onSubmit={handleSaveClient} className="space-y-5 flex-1 overflow-y-auto pr-1">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2">Nome da Empresa *</label>
                <input 
                  type="text" 
                  required
                  placeholder="Ex: Arreda Audiovisual Ltda"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full bg-zinc-100 dark:bg-zinc-800/60 border border-transparent focus:border-orange-500/50 focus:bg-white dark:focus:bg-zinc-800 rounded-xl px-4 py-3 outline-none transition-all text-sm font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2">Nome do Contato Principal</label>
                <input 
                  type="text" 
                  placeholder="Ex: João Silva"
                  value={contactName}
                  onChange={e => setContactName(e.target.value)}
                  className="w-full bg-zinc-100 dark:bg-zinc-800/60 border border-transparent focus:border-orange-500/50 focus:bg-white dark:focus:bg-zinc-800 rounded-xl px-4 py-3 outline-none transition-all text-sm font-medium"
                />
              </div>

              <div className="border-t border-gray-100 dark:border-gray-800 pt-4">
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1">Adicionar Contato ou Link</label>
                <span className="block text-[11px] text-zinc-400 dark:text-zinc-500 mb-3">O sistema detectará automaticamente: Whatsapp, E-mail, Instagram, Linkedin ou Site.</span>
                
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="Cole um link, e-mail, número com DDD ou @username..."
                    value={contactInput}
                    onChange={e => setContactInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddContact();
                      }
                    }}
                    className="flex-1 bg-zinc-100 dark:bg-zinc-800/60 border border-transparent focus:border-orange-500/50 focus:bg-white dark:focus:bg-zinc-800 rounded-xl px-4 py-3 outline-none transition-all text-sm"
                  />
                  <button
                    type="button"
                    onClick={handleAddContact}
                    className="px-4 bg-zinc-800 hover:bg-zinc-700 dark:bg-zinc-700 dark:hover:bg-zinc-600 text-white rounded-xl font-bold transition-all active:scale-95 text-sm"
                  >
                    Adicionar
                  </button>
                </div>

                {/* Real-time parse indicator */}
                {contactInput.trim() && (
                  <div className="mt-2 flex items-center gap-1.5 text-xs text-orange-600 dark:text-orange-400 font-semibold px-1">
                    <span>Reconhecido como:</span>
                    <span className="capitalize px-2 py-0.5 bg-orange-100 dark:bg-orange-950/40 rounded border border-orange-200/50 dark:border-orange-900/30 flex items-center gap-1">
                      {getContactIcon(detectContactType(contactInput))}
                      {detectContactType(contactInput)}
                    </span>
                  </div>
                )}

                {/* Selected/added contacts list */}
                <div className="mt-4 flex flex-wrap gap-2">
                  {tempContacts.map((c, idx) => (
                    <div 
                      key={idx}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-orange-50/50 dark:bg-orange-950/10 border border-orange-500/20 text-xs font-medium text-zinc-800 dark:text-zinc-200 shadow-sm"
                    >
                      {getContactIcon(c.type)}
                      <span className="truncate max-w-[150px]">{c.value}</span>
                      <button 
                        type="button" 
                        onClick={() => handleRemoveContact(idx)}
                        className="p-0.5 rounded-full hover:bg-orange-100 dark:hover:bg-orange-900/50 text-zinc-400 hover:text-orange-600 transition-colors"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                  {tempContacts.length === 0 && (
                    <p className="text-zinc-400 dark:text-zinc-600 text-xs italic py-2">Nenhum meio de contato adicionado ainda.</p>
                  )}
                </div>
              </div>

              {/* Actions Footer */}
              <div className="border-t border-gray-100 dark:border-gray-800 pt-6 shrink-0 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-3 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 font-bold transition-all text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!name.trim()}
                  className="bg-[#ff6b00] hover:bg-[#ff8c00] disabled:bg-zinc-300 dark:disabled:bg-zinc-800 disabled:text-zinc-500 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg shadow-orange-500/20 active:scale-95 text-sm"
                >
                  Salvar Cliente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
