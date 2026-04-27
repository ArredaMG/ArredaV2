import React from 'react';
import { X, FilePlus, Copy } from 'lucide-react';
import { Template } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  templates: Template[];
  onCreateBlank: () => void;
  onCreateFromTemplate: (template: Template) => void;
}

export const CreateProjectModal: React.FC<Props> = ({ isOpen, onClose, templates, onCreateBlank, onCreateFromTemplate }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-white dark:bg-[#1C1C1E] border border-gray-200 dark:border-gray-800 rounded-xl shadow-2xl p-6 text-gray-900 dark:text-gray-100 max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-semibold">Novo Orçamento</h3>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          <button 
            onClick={onCreateBlank}
            className="w-full flex items-center gap-4 p-4 text-left border border-gray-200 dark:border-gray-800 hover:border-[#ff6b00] dark:hover:border-[#ff6b00] rounded-xl hover:bg-[#ff6b00]/5 dark:hover:bg-[#ff6b00]/10 transition-all group"
          >
            <div className="bg-gray-100 dark:bg-gray-800 group-hover:bg-[#ff6b00]/10 p-3 rounded-lg text-gray-500 group-hover:text-[#ff6b00] transition-colors">
              <FilePlus size={24} />
            </div>
            <div>
              <h4 className="font-semibold text-lg">Começar do Zero</h4>
              <p className="text-sm text-gray-500 dark:text-gray-400">Criar um projeto em branco sem itens pré-definidos.</p>
            </div>
          </button>

          {templates.length > 0 && (
            <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
              <h4 className="font-medium text-sm text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wider">Ou escolha um Template</h4>
              <div className="space-y-3">
                {templates.map(t => (
                  <button
                    key={t.id}
                    onClick={() => onCreateFromTemplate(t)}
                    className="w-full flex items-center gap-4 p-4 text-left border border-gray-200 dark:border-gray-800 hover:border-[#ff6b00] dark:hover:border-[#ff6b00] rounded-xl hover:bg-[#ff6b00]/5 dark:hover:bg-[#ff6b00]/10 transition-all group"
                  >
                    <div className="bg-gray-100 dark:bg-gray-800 group-hover:bg-[#ff6b00]/10 p-3 rounded-lg text-gray-500 group-hover:text-[#ff6b00] transition-colors">
                      <Copy size={24} />
                    </div>
                    <div>
                      <h4 className="font-semibold text-md">{t.name}</h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{t.data.groups?.length || 0} grupos de custo pré-definidos</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
