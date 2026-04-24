import { SkeletonCard } from "@/components/Skeleton";

export default function Loading() {
  return (
    <main className="flex-1 p-4 max-w-2xl mx-auto w-full">
      <div className="h-8 w-48 skeleton rounded-lg mb-6" />
      <div className="grid grid-cols-2 gap-3 mb-6">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
      <SkeletonCard />
    </main>
  );
}
