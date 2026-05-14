import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react'; // Exemplo de ícone de loading
// import toast from 'react-hot-toast'; // Assumindo o uso de react-hot-toast

export function ExampleForm() {
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Exemplo simulado
      console.log('Sucesso!', name);
      setName('');
      
      // Opcional: navigate para listagem
      // navigate('/orcamentos');
    } catch (error: any) {
      console.error('Erro ao salvar:', error);
      // toast.error(error.message || 'Erro ao criar projeto');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-sm p-4 bg-white rounded shadow">
      <div>
        <label className="block text-sm font-medium text-gray-700">Nome do Projeto</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
          required
          disabled={isLoading} // Desabilita input durante loading
        />
      </div>
      
      <button
        type="submit"
        disabled={isLoading} // Desabilita botão para evitar múltiplos clicks
        className="inline-flex items-center justify-center w-full px-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? (
          <>
            <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" />
            Salvando...
          </>
        ) : (
          'Criar Projeto'
        )}
      </button>
    </form>
  );
}
