export default function Loading() {
  return (
    <div className="max-w-2xl mx-auto mt-24 px-4 animate-pulse">
      <div className="h-6 w-40 bg-neutral-200 rounded mb-6" />
      <div className="h-10 bg-neutral-200 rounded mb-6" />
      <div className="space-y-2">
        <div className="h-14 bg-neutral-200 rounded" />
        <div className="h-14 bg-neutral-200 rounded" />
      </div>
    </div>
  );
}
