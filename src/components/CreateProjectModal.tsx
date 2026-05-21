import React, { useEffect, useState } from 'react';
import { X, Copy } from 'lucide-react';
import { Template } from '../types';

export type CreateProjectFormData = {
  title: string;
  client: string;
  defaultTax: number;
  defaultMargin: number;
};

interface Props {
  isOpen: boolean;
  onClose: () => void;
  templates: Template[];
  onCreateBlank: (data: CreateProjectFormData) => void;
  onCreateFromTemplate: (template: Template) => void;
  isSubmitting?: boolean;
}

export const CreateProjectModal: React.FC<Props> = ({
  isOpen,
  onClose,
  templates,
  onCreateBlank,
  onCreateFromTemplate,
  isSubmitting = false,
}) => {
  const [title, setTitle] = useState('Novo Projeto');
  const [client, setClient] = useState('');
  const [defaultTax, setDefaultTax] = useState(10);
  const [defaultMargin, setDefaultMargin] = useState(15);

  useEffect(() => {
    if (isOpen) {
      setTitle('Novo Projeto');
      setClient('');
      setDefaultTax(10);
      setDefaultMargin(15);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreateBlank({
      title: title.trim() || 'Novo Projeto',
      client: client.trim() || 'Cliente Não Informado',
      defaultTax,
      defaultMargin,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-white dark:bg-[#1C1C1E] border border-gray-200 dark:border-gray-800 rounded-xl shadow-2xl p-6 text-gray-900 dark:text-gray-100 max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-semibold">Novo Orçamento</h3>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 mb-6">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">
              Título do Projeto *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-gray-100 dark:bg-zinc-800 border border-gray-200 dark:border-gray-700 rounded-xl py-3 px-4 text-sm font-medium focus:ring-2 focus:ring-[#AE0000] outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">
              Cliente
            </label>
            <input
              type="text"
              value={client}
              onChange={(e) => setClient(e.target.value)}
              placeholder="Nome do cliente"
              className="w-full bg-gray-100 dark:bg-zinc-800 border border-gray-200 dark:border-gray-700 rounded-xl py-3 px-4 text-sm font-medium focus:ring-2 focus:ring-[#AE0000] outline-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">
                Imposto (%)
              </label>
              <input
                type="number"
                min={0}
                step={0.1}
                value={defaultTax}
                onChange={(e) => setDefaultTax(Number(e.target.value))}
                className="w-full bg-gray-100 dark:bg-zinc-800 border border-gray-200 dark:border-gray-700 rounded-xl py-3 px-4 text-sm font-medium focus:ring-2 focus:ring-[#AE0000] outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">
                Margem (%)
              </label>
              <input
                type="number"
                min={0}
                step={0.1}
                value={defaultMargin}
                onChange={(e) => setDefaultMargin(Number(e.target.value))}
                className="w-full bg-gray-100 dark:bg-zinc-800 border border-gray-200 dark:border-gray-700 rounded-xl py-3 px-4 text-sm font-medium focus:ring-2 focus:ring-[#AE0000] outline-none"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-[#AE0000] hover:bg-[#AE0000]/90 text-white py-3 rounded-xl font-bold transition-all shadow-lg shadow-orange-500/20 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Criando...' : 'Criar Projeto'}
          </button>
        </form>

        {templates.length > 0 && (
          <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
            <h4 className="font-medium text-sm text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wider">
              Ou escolha um Template
            </h4>
            <div className="space-y-3">
              {templates.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => onCreateFromTemplate(t)}
                  className="w-full flex items-center gap-4 p-4 text-left border border-gray-200 dark:border-gray-800 hover:border-[#AE0000] dark:hover:border-[#AE0000] rounded-xl hover:bg-[#AE0000]/5 dark:hover:bg-[#AE0000]/10 transition-all group disabled:opacity-60"
                >
                  <div className="bg-gray-100 dark:bg-gray-800 group-hover:bg-[#AE0000]/10 p-3 rounded-lg text-gray-500 group-hover:text-[#AE0000] transition-colors">
                    <Copy size={24} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-md">{t.name}</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {t.data.groups?.length || 0} grupos de custo pré-definidos
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
