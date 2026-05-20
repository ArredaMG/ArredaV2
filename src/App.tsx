import React from 'react';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { SignedIn, SignedOut, SignIn } from '@clerk/clerk-react';
import { AppProvider } from './context/AppContext';
import { ModalProvider } from './context/ModalContext';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Recursos } from './pages/Recursos';
import { Planilha } from './pages/Planilha';
import { Calendario } from './pages/Calendario';
import { ClienteProfile } from './pages/ClienteProfile';
import { CRM } from './pages/CRM';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Login } from './pages/Login';

const router = createBrowserRouter([
  {
    path: "/",
    element: (
      <>
        <SignedIn>
          <Layout />
        </SignedIn>
        <SignedOut>
          <div className="min-h-screen flex items-center justify-center bg-gray-900">
            <SignIn routing="hash" />
          </div>
        </SignedOut>
      </>
    ),
    children: [
      { index: true, element: <Dashboard /> },
      { path: "orcamentos", element: <Navigate to="/recursos" replace /> },
      { path: "orcamentos/:id", element: <Planilha /> },
      { path: "recursos", element: <Recursos /> },
      { path: "calendario", element: <Calendario /> },
      { path: "clientes", element: <Navigate to="/recursos" replace /> },
      { path: "clientes/:id", element: <ClienteProfile /> },
      { path: "comercial", element: <CRM /> },
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
