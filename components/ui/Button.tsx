import React from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const variantStyles = {
  primary: 'bg-black text-white hover:bg-slate-800 shadow-xl',
  secondary: 'bg-blue-600 text-white hover:bg-blue-700 shadow-xl',
  outline: 'bg-white text-black border-2 border-slate-200 hover:bg-slate-50',
  ghost: 'bg-transparent text-black hover:bg-slate-100',
  danger: 'bg-red-600 text-white hover:bg-red-700 shadow-xl'
};

const sizeStyles = {
  sm: 'px-4 py-2 text-[9px]',
  md: 'px-6 py-3 text-[10px]',
  lg: 'px-8 py-4 text-[11px]'
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      disabled,
      leftIcon,
      rightIcon,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          'inline-flex items-center justify-center gap-2 font-black uppercase tracking-widest rounded-xl transition-all',
          'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        {...props}
      >
        {isLoading ? (
          <>
            <Loader2 className="animate-spin" size={16} />
            <span>Loading...</span>
          </>
        ) : (
          <>
            {leftIcon && <span>{leftIcon}</span>}
            {children}
            {rightIcon && <span>{rightIcon}</span>}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';
