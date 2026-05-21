import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

type LoadingSpinnerProps = {
  label?: string;
  className?: string;
};

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  label = 'Carregando dados...',
  className,
}) => (
  <div
    className={cn(
      'flex flex-col items-center justify-center min-h-[40vh] w-full px-6',
      className
    )}
    role="status"
    aria-live="polite"
  >
    <Loader2 className="h-10 w-10 animate-spin text-[#AE0000] mb-4" aria-hidden />
    <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">{label}</p>
  </div>
);
