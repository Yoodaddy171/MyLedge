'use client';

import { X } from 'lucide-react';

interface TagBadgeProps {
  tag: {
    id: any;
    name: string;
    color: string;
    icon?: string | null;
  };
  onRemove?: () => void;
  size?: 'sm' | 'md';
}

export default function TagBadge({ tag, onRemove, size = 'sm' }: TagBadgeProps) {
  const sizeClasses = size === 'sm'
    ? 'text-[9px] px-2 py-0.5'
    : 'text-xs px-3 py-1';

  return (
    <span
      className={`inline-flex items-center gap-1 ${sizeClasses} rounded-full font-bold uppercase tracking-wider transition-all`}
      style={{
        backgroundColor: `${tag.color}20`,
        color: tag.color,
        border: `1px solid ${tag.color}40`,
      }}
    >
      {tag.icon && <span>{tag.icon}</span>}
      <span>{tag.name}</span>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="hover:opacity-70 transition-opacity"
        >
          <X size={size === 'sm' ? 10 : 12} />
        </button>
      )}
    </span>
  );
}
