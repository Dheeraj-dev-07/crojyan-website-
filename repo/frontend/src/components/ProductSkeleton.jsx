import React from 'react';

export default function ProductSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-stone-200/80 overflow-hidden shadow-soft flex flex-col h-full animate-pulse">
      <div className="aspect-square bg-stone-200 skeleton-shimmer" />
      <div className="p-3 sm:p-5 flex flex-col flex-grow space-y-3">
        <div className="h-3 bg-stone-200 rounded w-1/3 skeleton-shimmer" />
        <div className="h-5 bg-stone-200 rounded w-3/4 skeleton-shimmer" />
        <div className="h-3 bg-stone-200 rounded w-full skeleton-shimmer" />
        <div className="h-3 bg-stone-200 rounded w-2/3 skeleton-shimmer" />
        <div className="pt-4 mt-auto border-t border-stone-100 space-y-2">
          <div className="h-6 bg-stone-200 rounded w-16 skeleton-shimmer" />
          <div className="h-9 bg-stone-200 rounded-full w-full skeleton-shimmer" />
          <div className="h-9 bg-stone-200 rounded-full w-full skeleton-shimmer" />
        </div>
      </div>
    </div>
  );
}
