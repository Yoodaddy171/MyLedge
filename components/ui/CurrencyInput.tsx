import React, { forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { formatDisplayAmount } from '@/lib/utils';

export interface CurrencyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  label?: string;
  error?: string;
  helperText?: string;
  value: string | number;
  onChange: (value: string) => void;
  currency?: string;
}

export const CurrencyInput = forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ className, label, error, helperText, value, onChange, currency = 'IDR', ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      // Remove all non-digit characters
      const rawValue = e.target.value.replace(/\D/g, '');
      onChange(rawValue);
    };

    const displayValue = value ? formatDisplayAmount(value.toString()) : '';

    return (
      <div className="w-full">
        {label && (
          <label className="text-xs font-semibold text-slate-700 mb-2 block">
            {label}
            {props.required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}

        <div className="relative">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 font-semibold text-sm pointer-events-none">
            {currency}
          </div>

          <input
            ref={ref}
            type="text"
            inputMode="numeric"
            value={displayValue}
            onChange={handleChange}
            className={cn(
              'w-full bg-white border-2 rounded-[1.2rem] pl-16 pr-6 py-4 text-sm font-bold text-black outline-none transition-all shadow-sm',
              'focus:border-blue-500 focus:ring-2 focus:ring-blue-100',
              'disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed',
              error && 'border-red-300 focus:border-red-500 focus:ring-red-100',
              className
            )}
            {...props}
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

CurrencyInput.displayName = 'CurrencyInput';
