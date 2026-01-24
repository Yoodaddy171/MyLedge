import React from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  options?: Array<{ value: string | number; label: string }>;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, helperText, options, children, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="text-xs font-semibold text-slate-700 mb-2 block">
            {label}
            {props.required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}

        <div className="relative">
          <select
            ref={ref}
            className={cn(
              'w-full bg-white border-2 rounded-[1.2rem] px-6 py-4 text-sm font-bold text-black outline-none transition-all shadow-sm appearance-none cursor-pointer',
              'focus:border-blue-500 focus:ring-2 focus:ring-blue-100',
              'disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed',
              error && 'border-red-300 focus:border-red-500 focus:ring-red-100',
              className
            )}
            {...props}
          >
            {options ? (
              options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))
            ) : (
              children
            )}
          </select>

          <ChevronDown
            className={cn(
              'absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none transition-colors',
              error ? 'text-red-500' : 'text-slate-400'
            )}
            size={20}
          />
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

Select.displayName = 'Select';
