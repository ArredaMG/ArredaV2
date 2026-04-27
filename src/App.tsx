import React from 'react';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { ModalProvider } from './context/ModalContext';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Orcamentos } from './pages/Orcamentos';
import { Planilha } from './pages/Planilha';
import { Recursos } from './pages/Recursos';

const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: "orcamentos", element: <Orcamentos /> },
      { path: "orcamentos/:id", element: <Planilha /> },
      { path: "recursos", element: <Recursos /> },
      { path: "*", element: <Navigate to="/" replace /> }
    ]
  }
]);

export default function App() {
  return (
    <AppProvider>
      <ModalProvider>
        <RouterProvider router={router} />
      </ModalProvider>
    </AppProvider>
  );
}
