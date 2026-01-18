import React from 'react';
import { cn } from '@/lib/utils';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, helperText, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-800 mb-3 block">
            {label}
            {props.required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}

        <textarea
          ref={ref}
          className={cn(
            'w-full bg-white border-2 rounded-[1.2rem] px-6 py-4 text-sm font-bold text-black outline-none transition-all shadow-sm resize-none',
            'focus:border-blue-500 focus:ring-2 focus:ring-blue-100',
            'disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed',
            error && 'border-red-300 focus:border-red-500 focus:ring-red-100',
            className
          )}
          {...props}
        />

        {error && (
          <p className="text-[10px] font-black text-red-600 uppercase tracking-wide mt-2">
            {error}
          </p>
        )}

        {helperText && !error && (
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide mt-2">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
