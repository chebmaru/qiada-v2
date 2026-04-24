import { SkeletonCard } from "@/components/Skeleton";

export default function Loading() {
  return (
    <main className="flex-1 p-4 max-w-2xl mx-auto w-full">
      <div className="h-8 w-40 skeleton rounded-lg mb-6" />
      <div className="space-y-3">
        <div className="h-20 skeleton rounded-xl" />
        <div className="h-20 skeleton rounded-xl" />
        <div className="h-20 skeleton rounded-xl" />
        <div className="h-20 skeleton rounded-xl" />
      </div>
    </main>
  );
}
