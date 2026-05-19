import React, { useState, useMemo, useEffect } from 'react';
import { X, Instagram, Linkedin, Youtube, Globe, MessageCircle, Mail, Edit2, Check, User, Briefcase, Link } from 'lucide-react';
import { Client } from '../types';
import { useAppContext } from '../context/AppContext';
import { formatCurrency, cn } from '../lib/utils';

interface ClientProfileDrawerProps {
  client: Client;
  onClose: () => void;
}

export function ClientProfileDrawer({ client, onClose }: ClientProfileDrawerProps) {
  const { projects, updateClient } = useAppContext();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<Client>>({ ...client });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setFormData({ ...client });
  }, [client]);

  // Calcula o LTV (Lifetime Value)
  const ltv = useMemo(() => {
    return projects
      .filter(p => p.client === client.nome && (p.status === 'Concluído' || p.status === 'Aprovado'))
      .reduce((acc, p) => {
        // Considera a última versão do projeto
        const latestVersion = p.versions[p.versions.length - 1];
        return acc + (latestVersion?.totalClient || 0);
      }, 0);
  }, [projects, client.nome]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateClient(client.id, formData);
      setIsEditing(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const SocialButton = ({ href, icon: Icon, label, colorClass }: { href?: string | null, icon: any, label: string, colorClass: string }) => {
    if (!href && !isEditing) return null;
    
    // Se não tiver href completo, monta caso pareça ser um @ ou numero cru (básico)
    let finalHref = href || '';
    if (finalHref && !finalHref.startsWith('http') && !finalHref.startsWith('mailto:') && !finalHref.startsWith('tel:')) {
      if (label === 'Instagram' || label === 'LinkedIn' || label === 'YouTube') {
        // Assume https://
        finalHref = `https://${finalHref}`;
      }
    }

    return (
      <a 
        href={finalHref} 
        target="_blank" 
        rel="noopener noreferrer"
        onClick={(e) => {
          if (!href) e.preventDefault();
        }}
        className={cn(
          "flex items-center justify-center p-3 rounded-xl transition-all shadow-sm",
          href ? `hover:-translate-y-1 ${colorClass}` : "bg-zinc-100 text-zinc-400 dark:bg-zinc-800/50 cursor-default",
          isEditing && "pointer-events-none opacity-50"
        )}
        title={label}
      >
        <Icon size={20} />
      </a>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 backdrop-blur-sm bg-black/50 transition-opacity" 
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div className="relative w-full max-w-md bg-white dark:bg-zinc-900 shadow-2xl h-full flex flex-col transform transition-transform z-50">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-zinc-100 dark:border-zinc-800">
          <div>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
              <Briefcase className="text-emerald-500" size={24} />
              {client.nome}
            </h2>
            {client.cnpj && <p className="text-sm text-zinc-500 mt-1">CNPJ: {client.cnpj}</p>}
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          
          {/* LTV Block */}
          <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-2xl p-6 text-white shadow-lg shadow-emerald-500/20">
            <h3 className="text-emerald-50 text-sm font-medium uppercase tracking-wider mb-1">Lifetime Value (LTV)</h3>
            <div className="text-3xl font-black">{formatCurrency(ltv)}</div>
            <p className="text-emerald-100 text-xs mt-2">Valor total gerado em projetos aprovados e concluídos.</p>
          </div>

          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white uppercase tracking-wider">Raio-X do Cliente</h3>
            <button
              onClick={() => isEditing ? handleSave() : setIsEditing(true)}
              disabled={isSaving}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors",
                isEditing 
                  ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400"
                  : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300"
              )}
            >
              {isEditing ? (
                <>{isSaving ? <span className="animate-pulse">Salvando...</span> : <><Check size={14} /> Salvar</>}</>
              ) : (
                <><Edit2 size={14} /> Editar</>
              )}
            </button>
          </div>

          {/* Dados do Contato */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Contato Principal</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 sm:col-span-1">
                <label className="text-xs text-zinc-500 mb-1 block">Nome do Contato</label>
                {isEditing ? (
                  <input type="text" name="contactName" value={formData.contactName || ''} onChange={handleChange} className="w-full text-sm p-2 rounded border border-zinc-200 dark:border-zinc-700 bg-transparent" placeholder="Ex: João Silva" />
                ) : (
                  <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{client.contactName || '---'}</div>
                )}
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="text-xs text-zinc-500 mb-1 block">Cargo</label>
                {isEditing ? (
                  <input type="text" name="contactRole" value={formData.contactRole || ''} onChange={handleChange} className="w-full text-sm p-2 rounded border border-zinc-200 dark:border-zinc-700 bg-transparent" placeholder="Ex: Diretor de Marketing" />
                ) : (
                  <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{client.contactRole || '---'}</div>
                )}
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="text-xs text-zinc-500 mb-1 block">WhatsApp</label>
                {isEditing ? (
                  <input type="text" name="whatsapp" value={formData.whatsapp || ''} onChange={handleChange} className="w-full text-sm p-2 rounded border border-zinc-200 dark:border-zinc-700 bg-transparent" placeholder="Ex: 11999999999" />
                ) : (
                  <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{client.whatsapp || '---'}</div>
                )}
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="text-xs text-zinc-500 mb-1 block">E-mail</label>
                {isEditing ? (
                  <input type="email" name="email" value={formData.email || ''} onChange={handleChange} className="w-full text-sm p-2 rounded border border-zinc-200 dark:border-zinc-700 bg-transparent" placeholder="Ex: joao@empresa.com" />
                ) : (
                  <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">{client.email || '---'}</div>
                )}
              </div>
              <div className="col-span-2">
                <label className="text-xs text-zinc-500 mb-1 block">Origem do Lead</label>
                {isEditing ? (
                  <input type="text" name="leadSource" value={formData.leadSource || ''} onChange={handleChange} className="w-full text-sm p-2 rounded border border-zinc-200 dark:border-zinc-700 bg-transparent" placeholder="Ex: Instagram, Indicação, Cold Call" />
                ) : (
                  <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{client.leadSource || '---'}</div>
                )}
              </div>
            </div>
          </div>

          <hr className="border-zinc-100 dark:border-zinc-800" />

          {/* Arsenal Digital */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Arsenal Digital</h4>
            
            {isEditing ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2"><Globe size={16} className="text-zinc-400"/><input type="text" name="website" value={formData.website || ''} onChange={handleChange} placeholder="Site Oficial" className="flex-1 text-sm p-2 rounded border border-zinc-200 dark:border-zinc-700 bg-transparent" /></div>
                <div className="flex items-center gap-2"><Instagram size={16} className="text-pink-500"/><input type="text" name="instagramCompany" value={formData.instagramCompany || ''} onChange={handleChange} placeholder="Instagram (Empresa)" className="flex-1 text-sm p-2 rounded border border-zinc-200 dark:border-zinc-700 bg-transparent" /></div>
                <div className="flex items-center gap-2"><Linkedin size={16} className="text-blue-600"/><input type="text" name="linkedinCompany" value={formData.linkedinCompany || ''} onChange={handleChange} placeholder="LinkedIn (Empresa)" className="flex-1 text-sm p-2 rounded border border-zinc-200 dark:border-zinc-700 bg-transparent" /></div>
                <div className="flex items-center gap-2"><Youtube size={16} className="text-red-500"/><input type="text" name="youtubeCompany" value={formData.youtubeCompany || ''} onChange={handleChange} placeholder="YouTube" className="flex-1 text-sm p-2 rounded border border-zinc-200 dark:border-zinc-700 bg-transparent" /></div>
                
                <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mt-4 mb-2 block">Redes do Contato (Pessoal)</h4>
                <div className="flex items-center gap-2"><Instagram size={16} className="text-pink-400"/><input type="text" name="instagramContact" value={formData.instagramContact || ''} onChange={handleChange} placeholder="Instagram do Contato" className="flex-1 text-sm p-2 rounded border border-zinc-200 dark:border-zinc-700 bg-transparent" /></div>
                <div className="flex items-center gap-2"><Linkedin size={16} className="text-blue-500"/><input type="text" name="linkedinContact" value={formData.linkedinContact || ''} onChange={handleChange} placeholder="LinkedIn do Contato" className="flex-1 text-sm p-2 rounded border border-zinc-200 dark:border-zinc-700 bg-transparent" /></div>
              </div>
            ) : (
              <div className="grid grid-cols-5 gap-3">
                <SocialButton href={client.whatsapp ? `https://wa.me/${client.whatsapp.replace(/\D/g,'')}` : null} icon={MessageCircle} label="WhatsApp" colorClass="bg-[#25D366] text-white hover:bg-[#128C7E] shadow-[#25D366]/20" />
                <SocialButton href={client.email ? `mailto:${client.email}` : null} icon={Mail} label="E-mail" colorClass="bg-zinc-800 text-white hover:bg-black dark:bg-zinc-200 dark:text-black dark:hover:bg-white shadow-zinc-800/20" />
                <SocialButton href={client.website} icon={Globe} label="Website" colorClass="bg-indigo-500 text-white hover:bg-indigo-600 shadow-indigo-500/20" />
                <SocialButton href={client.instagramCompany} icon={Instagram} label="Instagram" colorClass="bg-gradient-to-tr from-[#FD1D1D] to-[#833AB4] text-white shadow-pink-500/20" />
                <SocialButton href={client.linkedinCompany} icon={Linkedin} label="LinkedIn" colorClass="bg-[#0A66C2] text-white hover:bg-[#004182] shadow-[#0A66C2]/20" />
                <SocialButton href={client.youtubeCompany} icon={Youtube} label="YouTube" colorClass="bg-[#FF0000] text-white hover:bg-[#CC0000] shadow-[#FF0000]/20" />
              </div>
            )}
            
            {!isEditing && (client.instagramContact || client.linkedinContact) && (
              <div className="mt-4">
                <h5 className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2">Contato Pessoal</h5>
                <div className="flex gap-3">
                   <SocialButton href={client.instagramContact} icon={Instagram} label="Instagram do Contato" colorClass="bg-gradient-to-tr from-[#FD1D1D] to-[#833AB4] text-white shadow-pink-500/20" />
                   <SocialButton href={client.linkedinContact} icon={Linkedin} label="LinkedIn do Contato" colorClass="bg-[#0A66C2] text-white hover:bg-[#004182] shadow-[#0A66C2]/20" />
                </div>
              </div>
            )}
            
            {!isEditing && !client.website && !client.instagramCompany && !client.linkedinCompany && !client.youtubeCompany && !client.whatsapp && !client.email && (
              <div className="text-sm text-zinc-500 italic p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl text-center">
                Nenhum canal digital cadastrado.
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
