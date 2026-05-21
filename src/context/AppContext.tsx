import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface AppContextType {
  editingTemplateId: string | null;
  setEditingTemplateId: (id: string | null) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);

  return (
    <AppContext.Provider value={{ editingTemplateId, setEditingTemplateId }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppContext must be used within AppProvider');
  return context;
};
