import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from './Button';
import { cn } from '@/lib/utils';
import { Language, t } from '@/lib/i18n';

export interface ErrorStateProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  message: string;
  onRetry?: () => void;
  lang?: Language;
  compact?: boolean;
}

export function ErrorState({
  title,
  message,
  onRetry,
  lang = 'hi',
  compact = false,
  className,
  ...props
}: ErrorStateProps) {
  if (compact) {
    return (
      <div
        className={cn(
          'flex items-center justify-between p-3 rounded-btn bg-red-50 border border-red-200 text-offline text-sm',
          className
        )}
        {...props}
      >
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{message}</span>
        </div>
        {onRetry && (
          <button
            onClick={onRetry}
            className="text-xs font-semibold underline hover:opacity-80 ml-2"
          >
            {t('retry', lang)}
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center p-6 text-center rounded-card bg-red-50/50 border border-red-200',
        className
      )}
      {...props}
    >
      <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-offline mb-3">
        <AlertTriangle className="w-6 h-6" />
      </div>
      <h4 className="font-heading font-semibold text-base text-text mb-1">
        {title || t('error', lang)}
      </h4>
      <p className="text-sm text-text-muted max-w-sm mb-4">{message}</p>
      {onRetry && (
        <Button
          variant="secondary"
          size="sm"
          onClick={onRetry}
          icon={<RefreshCw className="w-4 h-4" />}
        >
          {t('retry', lang)}
        </Button>
      )}
    </div>
  );
}
