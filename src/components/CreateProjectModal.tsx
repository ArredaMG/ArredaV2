import React from 'react';
import { useNavigate } from 'react-router-dom';
import { X, FilePlus, LayoutTemplate, Loader2 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { useTemplates } from '../hooks/useResources';
import { useProjects, CreateProjectInput } from '../hooks/useProjects';
import { Project, Template } from '../types';
import { cn } from '../lib/utils';

export type CreateProjectDefaults = {
  title?: string;
  client?: string;
};

interface Props {
  isOpen: boolean;
  onClose: () => void;
  defaults?: CreateProjectDefaults;
  onProjectCreated?: (projectId: string) => void | Promise<void>;
}

function cloneTemplateGroups(template: Template) {
  return template.data.groups.map((g) => ({
    ...g,
    id: uuidv4(),
    items: g.items.map((i) => ({ ...i, id: uuidv4() })),
  }));
}

export const CreateProjectModal: React.FC<Props> = ({
  isOpen,
  onClose,
  defaults,
  onProjectCreated,
}) => {
  const navigate = useNavigate();
  const { templates, isLoading: isLoadingTemplates, isError: isTemplatesError } = useTemplates();
  const { createProjectMutation } = useProjects();

  const isSubmitting = createProjectMutation.isPending;
  const clientName = defaults?.client?.trim() || 'Cliente Não Informado';

  const redirectToPlanilha = async (project: Project) => {
    const projectId = project.id;
    if (!projectId) {
      console.error('[CreateProjectModal] Backend não retornou ID do projeto criado.', project);
      return;
    }

    if (onProjectCreated) {
      await onProjectCreated(projectId);
    }

    onClose();
    navigate(`/orcamentos/${projectId}`);
  };

  const handleCreate = async (payload: CreateProjectInput) => {
    try {
      const project = await createProjectMutation.mutateAsync(payload);
      await redirectToPlanilha(project);
    } catch (error) {
      console.error('[CreateProjectModal] Erro ao criar projeto:', error);
    }
  };

  const handleCreateBlank = () => {
    void handleCreate({
      title: defaults?.title?.trim() || 'Novo Projeto',
      client: clientName,
      status: 'Pendente',
      defaultTax: 10,
      defaultMargin: 15,
      groups: [],
    });
  };

  const handleCreateFromTemplate = (template: Template) => {
    const baseTitle = defaults?.title?.trim() || 'Novo Projeto';
    void handleCreate({
      title: `${baseTitle} (Template: ${template.name})`,
      client: clientName,
      status: 'Pendente',
      defaultTax: template.data.defaultTax,
      defaultMargin: template.data.defaultMargin,
      groups: cloneTemplateGroups(template),
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-white dark:bg-[#1C1C1E] border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl text-gray-900 dark:text-gray-100 max-h-[85vh] overflow-hidden flex flex-col">
        <div className="flex justify-between items-center px-6 py-5 border-b border-gray-100 dark:border-gray-800 shrink-0">
          <h3 className="text-xl font-bold tracking-tight">Novo Orçamento</h3>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>

        <div className="overflow-y-auto p-6 space-y-8">
          {/* Hero — projeto em branco */}
          <section className="flex flex-col items-center text-center">
            <button
              type="button"
              onClick={handleCreateBlank}
              disabled={isSubmitting}
              className={cn(
                'group w-full max-w-sm flex flex-col items-center gap-4 p-8 rounded-2xl border-2 border-dashed transition-all duration-200',
                'border-zinc-200 dark:border-zinc-700 hover:border-[#AE0000] hover:bg-[#AE0000]/5 dark:hover:bg-[#AE0000]/10',
                'disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:border-zinc-200'
              )}
            >
              <div className="w-16 h-16 rounded-2xl bg-[#AE0000]/10 text-[#AE0000] flex items-center justify-center group-hover:bg-[#AE0000] group-hover:text-white transition-colors">
                {isSubmitting ? (
                  <Loader2 size={32} className="animate-spin" />
                ) : (
                  <FilePlus size={32} strokeWidth={2} />
                )}
              </div>
              <div>
                <span className="block text-lg font-bold text-gray-900 dark:text-white group-hover:text-[#AE0000] transition-colors">
                  Novo Orçamento
                </span>
                <span className="block text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Começar do zero, sem grupos ou itens
                </span>
              </div>
            </button>
          </section>

          {/* Templates dinâmicos */}
          <section>
            <h4 className="text-xs font-black uppercase tracking-widest text-zinc-400 mb-4 text-center">
              Modelos salvos
            </h4>

            {isLoadingTemplates && (
              <div className="flex justify-center py-10">
                <Loader2 size={28} className="animate-spin text-[#AE0000]" />
              </div>
            )}

            {isTemplatesError && (
              <p className="text-center text-sm text-red-500 py-6">
                Não foi possível carregar os templates.
              </p>
            )}

            {!isLoadingTemplates && !isTemplatesError && templates.length === 0 && (
              <p className="text-center text-sm text-zinc-500 py-6">
                Nenhum template cadastrado ainda.
              </p>
            )}

            {!isLoadingTemplates && templates.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {templates.map((template) => (
                  <button
                    key={template.id}
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => handleCreateFromTemplate(template)}
                    className={cn(
                      'flex flex-col items-start gap-2 p-4 rounded-xl border text-left transition-all',
                      'border-gray-200 dark:border-gray-800 hover:border-[#AE0000] hover:bg-[#AE0000]/5 dark:hover:bg-[#AE0000]/10',
                      'disabled:opacity-60 disabled:cursor-not-allowed'
                    )}
                  >
                    <div className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
                      <LayoutTemplate size={18} />
                    </div>
                    <span className="font-semibold text-sm line-clamp-2 leading-snug">
                      {template.name}
                    </span>
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">
                      {template.data.groups?.length ?? 0} grupos
                    </span>
                  </button>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};
