import { SkeletonList } from "@/components/Skeleton";

export default function Loading() {
  return (
    <main className="flex-1 p-4 max-w-2xl mx-auto w-full">
      <div className="h-8 w-40 skeleton rounded-lg mb-4" />
      <div className="h-10 skeleton rounded-xl mb-4" />
      <SkeletonList count={10} />
    </main>
  );
}
