import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { cn } from '../../lib/utils';

type ErrorPanelProps = {
  message: string;
  onRetry?: () => void;
  className?: string;
};

export const ErrorPanel: React.FC<ErrorPanelProps> = ({
  message,
  onRetry,
  className,
}) => (
  <div
    className={cn(
      'flex flex-col items-center justify-center min-h-[40vh] w-full px-6 text-center',
      className
    )}
    role="alert"
  >
    <div className="flex items-center justify-center w-14 h-14 rounded-full bg-red-50 dark:bg-red-950/30 mb-4">
      <AlertCircle className="h-7 w-7 text-[#AE0000]" aria-hidden />
    </div>
    <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-2">
      Não foi possível carregar os dados
    </h2>
    <p className="text-sm text-zinc-600 dark:text-zinc-400 max-w-md mb-6">{message}</p>
    {onRetry && (
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#AE0000] hover:bg-[#8f0000] text-white text-sm font-semibold transition-colors"
      >
        <RefreshCw size={16} />
        Tentar novamente
      </button>
    )}
  </div>
);
