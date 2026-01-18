import React from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple';
  size?: 'sm' | 'md' | 'lg';
}

const variantStyles = {
  default: 'bg-slate-100 text-slate-700 border-slate-200',
  success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  warning: 'bg-orange-50 text-orange-700 border-orange-200',
  danger: 'bg-red-50 text-red-700 border-red-200',
  info: 'bg-blue-50 text-blue-700 border-blue-200',
  purple: 'bg-purple-50 text-purple-700 border-purple-200'
};

const sizeStyles = {
  sm: 'px-2 py-0.5 text-[8px]',
  md: 'px-3 py-1 text-[9px]',
  lg: 'px-4 py-1.5 text-[10px]'
};

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'default', size = 'md', children, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center font-black uppercase tracking-widest rounded-full border transition-colors',
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        {...props}
      >
        {children}
      </span>
    );
  }
);

Badge.displayName = 'Badge';

// Status Badge with dot indicator
export interface StatusBadgeProps extends BadgeProps {
  showDot?: boolean;
}

export const StatusBadge = React.forwardRef<HTMLSpanElement, StatusBadgeProps>(
  ({ showDot = true, children, ...props }, ref) => {
    return (
      <Badge ref={ref} {...props}>
        {showDot && (
          <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5" />
        )}
        {children}
      </Badge>
    );
  }
);

StatusBadge.displayName = 'StatusBadge';
