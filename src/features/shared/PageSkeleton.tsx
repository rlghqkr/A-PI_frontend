import { Skeleton } from '../../components/ui';

export function PageSkeleton() {
  return (
    <div className="space-y-4" role="status" aria-busy="true" aria-label="화면 불러오는 중">
      <Skeleton className="h-14 w-full" />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <Skeleton className="h-72 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
