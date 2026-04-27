import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Copy, Trash2, Search, FileText } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { useModal } from '../context/ModalContext';
import { cn } from '../lib/utils';
import { Template } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { CreateProjectModal } from '../components/CreateProjectModal';

export const Orcamentos: React.FC = () => {
  const { projects, addProject, addProjectVersion, deleteProject, templates } = useAppContext();
  const { openModal } = useModal();
  const navigate = useNavigate();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleCreateNew = () => {
    setShowCreateModal(true);
  };

  const createBlankProject = async () => {
    setShowCreateModal(false);
    const newProject = await addProject({
      title: 'Novo Projeto',
      client: 'Cliente Não Informado',
      status: 'Pendente',
      defaultTax: 10,
      defaultMargin: 15,
      groups: []
    });
    navigate(`/orcamentos/${newProject.id}`);
  };

  const createFromTemplate = async (selected: Template) => {
    setShowCreateModal(false);
    const newProject = await addProject({
      title: 'Novo Projeto (Template: ' + selected.name + ')',
      client: 'Cliente Não Informado',
      status: 'Pendente',
      defaultTax: selected.data.defaultTax,
      defaultMargin: selected.data.defaultMargin,
      groups: selected.data.groups.map(g => ({
        ...g,
        id: uuidv4(),
        items: g.items.map(i => ({ ...i, id: uuidv4() }))
      }))
    });
    navigate(`/orcamentos/${newProject.id}`);
  };

  const handleDelete = (id: string) => {
    openModal({
      title: 'Excluir Projeto',
      message: 'Tem certeza que deseja arquivar ou excluir este projeto? Esta ação não poderá ser desfeita.',
      onConfirm: () => {
        deleteProject(id);
      }
    });
  };

  const filteredProjects = projects.filter(p => 
    p.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.client.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-[#F5F5F7] dark:bg-[#000000] overflow-hidden">
      
      {/* ── CABEÇALHO (shrink-0) ───────────────────────────────────────── */}
      <div className="shrink-0 bg-white dark:bg-[#1C1C1E] border-b border-gray-200 dark:border-gray-800 px-8 py-8 z-10 shadow-sm">
        <div className="max-w-[1400px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight mb-1 text-gray-900 dark:text-white">Orçamentos</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Gerencie todos os seus projetos e versões em um só lugar.</p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-orange-500 transition-colors w-4 h-4" />
              <input 
                type="text" 
                placeholder="Buscar projeto ou cliente..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full md:w-80 bg-zinc-100 dark:bg-zinc-800/50 border border-transparent focus:border-orange-500/50 focus:bg-white dark:focus:bg-zinc-800 rounded-xl pl-10 pr-4 py-2.5 outline-none transition-all text-sm"
              />
            </div>

            <CreateProjectModal 
              isOpen={showCreateModal} 
              onClose={() => setShowCreateModal(false)}
              templates={templates}
              onCreateBlank={createBlankProject}
              onCreateFromTemplate={createFromTemplate}
            />
            
            <button 
              onClick={handleCreateNew}
              className="flex items-center gap-2 bg-[#ff6b00] hover:bg-[#ff8c00] text-white px-5 py-3 rounded-xl font-bold transition-all shadow-lg shadow-orange-500/20 active:scale-95"
            >
              <Plus size={20} strokeWidth={3} />
              <span>Novo Projeto</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── ÁREA DE CONTEÚDO SCROLLÁVEL (flex-1) ───────────────────────── */}
      <div className="flex-1 overflow-y-auto px-8 py-8">
        <div className="max-w-[1400px] mx-auto">
          
          <div className="bg-white dark:bg-[#1C1C1E] border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-zinc-50 dark:bg-zinc-900/50 text-zinc-500 dark:text-zinc-400 text-[11px] font-black uppercase tracking-wider border-b border-gray-200 dark:border-gray-800">
                  <th className="px-6 py-4">Projeto / Versão</th>
                  <th className="px-6 py-4">Cliente</th>
                  <th className="px-6 py-4">Data</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {filteredProjects.map((p) => {
                  const latestVersion = p.versions[p.versions.length - 1] || { name: 'V1', date: new Date().toISOString() };
                  return (
                    <tr 
                      key={p.id} 
                      className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30 transition-colors cursor-pointer group"
                      onClick={() => navigate(`/orcamentos/${p.id}`)}
                    >
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-orange-50 dark:bg-orange-950/20 flex items-center justify-center text-orange-500 group-hover:bg-orange-500 group-hover:text-white transition-all">
                            <FileText size={20} />
                          </div>
                          <div className="flex flex-col">
                            <span className="font-bold text-gray-900 dark:text-white group-hover:text-[#ff6b00] transition-colors">{p.title}</span>
                            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-tighter mt-0.5">{latestVersion.name}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-gray-500 dark:text-gray-400 font-medium">{p.client}</td>
                      <td className="px-6 py-5 text-gray-400 text-sm">{new Date(latestVersion.date).toLocaleDateString('pt-BR')}</td>
                      <td className="px-6 py-5">
                        <span className={cn(
                          "px-2.5 py-1 text-[10px] font-black uppercase tracking-widest rounded-md border",
                          p.status === 'Pendente' && "bg-orange-50 text-orange-600 border-orange-200 dark:bg-orange-950/20 dark:text-orange-400 dark:border-orange-900/30",
                          p.status === 'Aprovado' && "bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900/30",
                          p.status === 'Concluído' && "bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30"
                        )}>
                          {p.status}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0" onClick={e => e.stopPropagation()}>
                          <button onClick={async () => {
                            await addProjectVersion(p.id);
                            navigate(`/orcamentos/${p.id}`);
                          }} className="p-2 text-zinc-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/20 rounded-lg transition-colors" title="Duplicar Versão"><Copy size={16} /></button>
                          <button onClick={() => handleDelete(p.id)} className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors" title="Excluir"><Trash2 size={16} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredProjects.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-20 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <span className="text-4xl grayscale opacity-50 mb-2">📂</span>
                        <p className="text-zinc-500 font-medium">Nenhum orçamento encontrado.</p>
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
  );
};
