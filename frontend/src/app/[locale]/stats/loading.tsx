import { SkeletonCard } from "@/components/Skeleton";

export default function Loading() {
  return (
    <main className="flex-1 p-4 max-w-2xl mx-auto w-full">
      <div className="h-8 w-40 skeleton rounded-lg mb-6" />
      <div className="space-y-4">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    </main>
  );
}
