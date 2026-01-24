import React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helperText, leftIcon, rightIcon, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="text-xs font-semibold text-slate-700 mb-2 block">
            {label}
            {props.required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}

        <div className="relative">
          {leftIcon && (
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
              {leftIcon}
            </div>
          )}

          <input
            ref={ref}
            className={cn(
              'w-full bg-white border-2 rounded-[1.2rem] px-6 py-4 text-sm font-bold text-black outline-none transition-all shadow-sm',
              'focus:border-blue-500 focus:ring-2 focus:ring-blue-100',
              'disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed',
              error && 'border-red-300 focus:border-red-500 focus:ring-red-100',
              leftIcon && 'pl-12',
              rightIcon && 'pr-12',
              className
            )}
            {...props}
          />

          {rightIcon && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
              {rightIcon}
            </div>
          )}
        </div>

        {error && (
          <p className="text-xs font-medium text-red-600 mt-2">
            {error}
          </p>
        )}

        {helperText && !error && (
          <p className="text-xs font-medium text-slate-500 mt-2">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
