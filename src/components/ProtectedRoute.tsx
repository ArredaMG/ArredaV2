import React from 'react';
import { Outlet } from 'react-router-dom';

export function ProtectedRoute() {
  // BYPASS LOGIN PARA TESTES LOCAIS
  // Para reativar o login, remova a linha abaixo e desente as linhas seguintes.
  return <Outlet />;
}
