"use client";

export function SkeletonLine({ className = "" }: { className?: string }) {
  return (
    <div className={`h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse ${className}`} />
  );
}

export function SkeletonCard() {
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4 space-y-3">
      <SkeletonLine className="w-3/4 h-5" />
      <SkeletonLine className="w-1/2" />
      <SkeletonLine className="w-full h-1.5 mt-2" />
    </div>
  );
}

export function SkeletonQuizCard() {
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 space-y-4">
      <div className="flex justify-center">
        <div className="w-full h-40 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
      </div>
      <SkeletonLine className="w-full h-5" />
      <SkeletonLine className="w-4/5" />
      <div className="flex gap-4 pt-2">
        <div className="flex-1 h-14 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
        <div className="flex-1 h-14 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
      </div>
    </div>
  );
}

export function SkeletonList({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}
