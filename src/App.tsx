import React from 'react';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { ModalProvider } from './context/ModalContext';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Orcamentos } from './pages/Orcamentos';
import { Planilha } from './pages/Planilha';
import { Recursos } from './pages/Recursos';
import { Calendario } from './pages/Calendario';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Login } from './pages/Login';

const router = createBrowserRouter([
  {
    path: "/login",
    element: <Login />
  },
  {
    path: "/",
    element: <ProtectedRoute />, // Rota protegida envolvendo o Layout
    children: [
      {
        path: "/",
        element: <Layout />,
        children: [
      { index: true, element: <Dashboard /> },
      { path: "orcamentos", element: <Orcamentos /> },
      { path: "orcamentos/:id", element: <Planilha /> },
          { path: "recursos", element: <Recursos /> },
          { path: "calendario", element: <Calendario /> },
          { path: "*", element: <Navigate to="/" replace /> }
        ]
      }
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
