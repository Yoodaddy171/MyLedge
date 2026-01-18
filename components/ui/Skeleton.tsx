import { cn } from '@/lib/utils';

interface SkeletonProps {
  className?: string;
  style?: React.CSSProperties;
}

export function Skeleton({ className, style }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-xl bg-slate-200',
        className
      )}
      style={style}
    />
  );
}

// Specific skeleton components for common patterns

export function SkeletonText({ width = '100%', lines = 1 }: { width?: string; lines?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className="h-4"
          style={{ width: i === lines - 1 ? '70%' : width }}
        />
      ))}
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="bg-white p-6 rounded-[1.5rem] border-2 border-slate-100 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-10 w-10 rounded-xl" />
        <Skeleton className="h-4 w-20" />
      </div>
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-3 w-24" />
    </div>
  );
}

export function SkeletonTable({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="bg-white rounded-[1.5rem] border-2 border-slate-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-slate-50 border-b-2 border-slate-100 p-4">
        <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton key={i} className="h-4" />
          ))}
        </div>
      </div>

      {/* Rows */}
      <div className="divide-y-2 divide-slate-50">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="p-4">
            <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
              {Array.from({ length: columns }).map((_, colIndex) => (
                <Skeleton key={colIndex} className="h-4" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonChart({ height = 300 }: { height?: number }) {
  return (
    <div className="bg-white p-6 rounded-[1.5rem] border-2 border-slate-100 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-32" />
      </div>
      <Skeleton className="w-full" style={{ height: `${height}px` }} />
    </div>
  );
}

export function SkeletonDashboard() {
  return (
    <div className="space-y-8">
      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Chart */}
        <div className="lg:col-span-2">
          <SkeletonChart />
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    </div>
  );
}

export function SkeletonList({ items = 5 }: { items?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="bg-white p-4 rounded-xl border-2 border-slate-100 flex items-center gap-4">
          <Skeleton className="h-12 w-12 rounded-xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-8 w-20" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonForm() {
  return (
    <div className="space-y-6">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-12 w-full rounded-xl" />
        </div>
      ))}
      <Skeleton className="h-12 w-full rounded-xl" />
    </div>
  );
}
