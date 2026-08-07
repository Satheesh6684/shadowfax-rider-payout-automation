export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-border/60 ${className}`} />;
}

export function TableSkeleton({ rows = 6, columns = 8 }: { rows?: number; columns?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-3">
          {Array.from({ length: columns }).map((_, c) => (
            <Skeleton key={c} className="h-8 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}
