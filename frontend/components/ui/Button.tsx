import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'navy' | 'ghost' | 'danger' | 'outline' | 'teal';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading = false, disabled, children, icon, ...props }, ref) => {
    const baseStyles =
      'inline-flex items-center justify-center font-semibold transition-all duration-150 select-none rounded-btn disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 active:scale-[0.98]';

    const variants = {
      primary: 'bg-brand-500 text-white hover:bg-brand-600 shadow-soft hover:shadow-paytm',
      navy: 'bg-navy-900 text-white hover:bg-navy-800 shadow-soft',
      secondary: 'bg-white text-navy-900 border border-border hover:bg-surface hover:border-slate-300 shadow-soft',
      ghost: 'bg-transparent text-navy-900 hover:bg-sky-50 hover:text-brand-600',
      danger: 'bg-offline text-white hover:bg-red-700 shadow-soft',
      outline: 'bg-transparent border border-border text-navy-900 hover:bg-surface',
      teal: 'bg-teal-500 text-navy-900 hover:bg-teal-400 font-bold shadow-soft',
    };

    const sizes = {
      sm: 'h-9 px-3 text-xs gap-1.5',
      md: 'h-11 px-5 text-sm min-h-[44px] gap-2',
      lg: 'h-14 px-6 text-base min-h-[56px] font-bold gap-2.5',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {loading ? (
          <Loader2 className="w-5 h-5 animate-spin text-current" />
        ) : (
          icon && <span className="inline-flex shrink-0">{icon}</span>
        )}
        <span>{children}</span>
      </button>
    );
  }
);

Button.displayName = 'Button';
