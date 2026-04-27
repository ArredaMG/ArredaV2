import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';

interface ModalState {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel?: () => void;
}

interface ModalContextType {
  openModal: (options: Omit<ModalState, 'isOpen' | 'onCancel'> & { onCancel?: () => void }) => void;
  closeModal: () => void;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export const ModalProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [modalState, setModalState] = useState<ModalState>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const closeModal = useCallback(() => {
    setModalState(prev => ({ ...prev, isOpen: false }));
  }, []);

  const openModal = useCallback((options: Omit<ModalState, 'isOpen'>) => {
    setModalState({
      ...options,
      isOpen: true,
      onConfirm: () => {
        options.onConfirm();
        closeModal();
      },
      onCancel: () => {
        if (options.onCancel) options.onCancel();
        closeModal();
      }
    });
  }, [closeModal]);

  return (
    <ModalContext.Provider value={{ openModal, closeModal }}>
      {children}
      {modalState.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div
            className="w-full max-w-md bg-white dark:bg-[#1C1C1E] border border-gray-200 dark:border-gray-800 rounded-xl shadow-2xl p-6 text-gray-900 dark:text-gray-100 animate-in zoom-in-95 duration-200"
          >
            <h3 className="text-xl font-semibold mb-2">{modalState.title}</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">{modalState.message}</p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={modalState.onCancel || closeModal}
                className="px-4 py-2 font-medium bg-gray-100/50 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-lg transition-colors cursor-pointer"
              >
                {modalState.cancelText || 'Cancelar'}
              </button>
              <button
                type="button"
                onClick={modalState.onConfirm}
                className="px-4 py-2 font-medium bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors cursor-pointer"
              >
                {modalState.confirmText || 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ModalContext.Provider>
  );
};

export const useModal = () => {
  const context = useContext(ModalContext);
  if (!context) throw new Error('useModal must be used within ModalProvider');
  return context;
};
