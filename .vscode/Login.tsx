import React, { useState } from 'react';
import { supabase } from '../services/supabase';
import { useNavigate } from 'react-router-dom';
import { Loader2, Lock, Mail, AlertCircle } from 'lucide-react';

export function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const navigate = useNavigate();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg('');

    try {
      if (isLogin) {
        // LOGIN
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        
        // Redireciona pro painel se sucesso
        navigate('/');
      } else {
        // REGISTRO
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        
        // Em muitos casos o Supabase envia um email de confirmação.
        // Se a confirmação de email estiver ativada, avisamos o usuário.
        setErrorMsg('Cadastro realizado! Verifique seu email para confirmar a conta.');
        // Se a confirmação estiver desativada no painel do supabase, ele fará login direto.
      }
    } catch (error: any) {
      console.error('Auth error:', error);
      setErrorMsg(error.message || 'Ocorreu um erro durante a autenticação.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-gradient-to-br from-gray-900 to-gray-800">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-white">
          {isLogin ? 'Entre na sua conta' : 'Crie sua conta'}
        </h2>
        <p className="mt-2 text-center text-sm text-gray-400">
          Ou{' '}
          <button
            onClick={() => { setIsLogin(!isLogin); setErrorMsg(''); }}
            className="font-medium text-blue-500 hover:text-blue-400 focus:outline-none transition-colors"
          >
            {isLogin ? 'cadastre-se agora' : 'faça login na conta existente'}
          </button>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-gray-800 py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-gray-700">
          
          {errorMsg && (
            <div className={`mb-4 p-3 rounded-md flex items-center gap-2 text-sm ${errorMsg.includes('Verifique') ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}`}>
              <AlertCircle size={16} />
              {errorMsg}
            </div>
          )}

          <form className="space-y-6" onSubmit={handleAuth}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300">
                Email
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-500" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 sm:text-sm border-gray-600 bg-gray-700 text-white rounded-md p-2.5 transition-colors disabled:opacity-50"
                  placeholder="seu@email.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300">
                Senha
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-500" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete={isLogin ? "current-password" : "new-password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 sm:text-sm border-gray-600 bg-gray-700 text-white rounded-md p-2.5 transition-colors disabled:opacity-50"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:-translate-y-0.5"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" />
                    {isLogin ? 'Entrando...' : 'Cadastrando...'}
                  </>
                ) : (
                  isLogin ? 'Entrar' : 'Criar Conta'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
