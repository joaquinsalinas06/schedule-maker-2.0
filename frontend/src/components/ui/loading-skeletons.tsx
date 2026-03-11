import { Skeleton } from "./skeleton"

/** Full-page loading skeleton for dashboard layout */
export function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-muted animate-pulse" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-24" />
      </div>
    </div>
  )
}

/** Skeleton for the sidebar navigation */
export function SidebarSkeleton() {
  return (
    <div className="space-y-2 p-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-3 py-2">
          <Skeleton className="w-4 h-4 rounded" />
          <Skeleton className="h-4 flex-1" />
        </div>
      ))}
    </div>
  )
}

/** Skeleton for course search results */
export function CourseCardSkeleton() {
  return (
    <div className="p-3 border border-border rounded-lg space-y-2.5">
      <div className="flex justify-between items-start">
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/3" />
        </div>
        <Skeleton className="w-7 h-7 rounded-md flex-shrink-0" />
      </div>
    </div>
  )
}

/** Skeleton for a list of course cards */
export function CourseListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <CourseCardSkeleton key={i} />
      ))}
    </div>
  )
}

/** Skeleton for the schedule canvas area */
export function ScheduleCanvasSkeleton() {
  return (
    <div className="w-full aspect-[16/10] rounded-lg border border-border bg-card overflow-hidden">
      {/* Header row */}
      <div className="flex gap-1 p-3 border-b border-border">
        <Skeleton className="w-16 h-5" />
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="flex-1 h-5" />
        ))}
      </div>
      {/* Grid rows */}
      <div className="p-3 space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex gap-1">
            <Skeleton className="w-16 h-8" />
            {Array.from({ length: 6 }).map((_, j) => (
              <Skeleton
                key={j}
                className="flex-1 h-8"
                style={{ opacity: Math.random() > 0.7 ? 0.6 : 0.2 }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

/** Skeleton for profile page */
export function ProfileSkeleton() {
  return (
    <div className="max-w-2xl mx-auto space-y-6 p-6">
      <div className="flex items-center gap-4">
        <Skeleton className="w-16 h-16 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-28" />
        </div>
      </div>
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full rounded-md" />
          </div>
        ))}
      </div>
    </div>
  )
}

/** Skeleton for friend cards */
export function FriendCardSkeleton() {
  return (
    <div className="flex items-center gap-3 p-3 border border-border rounded-lg">
      <Skeleton className="w-10 h-10 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-20" />
      </div>
      <Skeleton className="w-8 h-8 rounded-md" />
    </div>
  )
}

/** Skeleton for friend list */
export function FriendListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <FriendCardSkeleton key={i} />
      ))}
    </div>
  )
}

/** Skeleton for the selected sections card */
export function SelectedSectionsSkeleton() {
  return (
    <div className="border border-border rounded-lg p-4 space-y-3">
      <div className="flex justify-between items-center">
        <Skeleton className="h-5 w-36" />
        <Skeleton className="h-4 w-12" />
      </div>
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-2 p-2 rounded-md bg-muted/30">
            <Skeleton className="w-3 h-3 rounded-full" />
            <div className="flex-1 space-y-1">
              <Skeleton className="h-3.5 w-2/3" />
              <Skeleton className="h-3 w-1/3" />
            </div>
            <Skeleton className="w-5 h-5 rounded" />
          </div>
        ))}
      </div>
      <Skeleton className="h-9 w-full rounded-md" />
    </div>
  )
}

/** Inline loading indicator for buttons */
export function ButtonLoader() {
  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-1">
        <div className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" style={{ animationDelay: '0ms' }} />
        <div className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" style={{ animationDelay: '150ms' }} />
        <div className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  )
}

/** Card skeleton for admin/import page */
export function ImportCardSkeleton() {
  return (
    <div className="border border-border rounded-lg p-6 space-y-4">
      <div className="flex items-center gap-3">
        <Skeleton className="w-10 h-10 rounded-lg" />
        <div className="space-y-2">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
      <Skeleton className="h-32 w-full rounded-lg" />
      <Skeleton className="h-10 w-full rounded-md" />
    </div>
  )
}
