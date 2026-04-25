import React from 'react';

export function SkeletonLoader({ 
  type = 'profile', 
  count = 1,
  className = '' 
}) {
  const baseClass = 'animate-pulse';

  const skeletonTypes = {
    profile: (
      <div className={`${baseClass} space-y-6 ${className}`}>
        {/* Avatar */}
        <div className="flex justify-center">
          <div className="w-32 h-32 rounded-full bg-zinc-200 dark:bg-zinc-700" />
        </div>

        {/* Two column grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="h-4 w-20 bg-zinc-200 dark:bg-zinc-700 rounded" />
            <div className="h-10 bg-zinc-200 dark:bg-zinc-700 rounded" />
          </div>
          <div className="space-y-2">
            <div className="h-4 w-24 bg-zinc-200 dark:bg-zinc-700 rounded" />
            <div className="h-10 bg-zinc-200 dark:bg-zinc-700 rounded" />
          </div>
        </div>

        {/* Single field */}
        <div className="space-y-2">
          <div className="h-4 w-16 bg-zinc-200 dark:bg-zinc-700 rounded" />
          <div className="h-10 bg-zinc-200 dark:bg-zinc-700 rounded" />
        </div>

        {/* Three column grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-2">
            <div className="h-4 w-12 bg-zinc-200 dark:bg-zinc-700 rounded" />
            <div className="h-10 bg-zinc-200 dark:bg-zinc-700 rounded" />
          </div>
          <div className="space-y-2">
            <div className="h-4 w-16 bg-zinc-200 dark:bg-zinc-700 rounded" />
            <div className="h-10 bg-zinc-200 dark:bg-zinc-700 rounded" />
          </div>
          <div className="space-y-2">
            <div className="h-4 w-20 bg-zinc-200 dark:bg-zinc-700 rounded" />
            <div className="h-10 bg-zinc-200 dark:bg-zinc-700 rounded" />
          </div>
        </div>

        {/* Textarea */}
        <div className="space-y-2">
          <div className="h-4 w-16 bg-zinc-200 dark:bg-zinc-700 rounded" />
          <div className="h-32 bg-zinc-200 dark:bg-zinc-700 rounded" />
        </div>

        {/* Buttons */}
        <div className="flex justify-end gap-4">
          <div className="h-10 w-24 bg-zinc-200 dark:bg-zinc-700 rounded" />
          <div className="h-10 w-32 bg-zinc-200 dark:bg-zinc-700 rounded" />
        </div>
      </div>
    ),

    card: (
      <div className={`${baseClass} space-y-4 p-4 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 ${className}`}>
        <div className="h-6 w-2/3 bg-zinc-200 dark:bg-zinc-700 rounded" />
        <div className="space-y-2">
          <div className="h-4 w-full bg-zinc-200 dark:bg-zinc-700 rounded" />
          <div className="h-4 w-5/6 bg-zinc-200 dark:bg-zinc-700 rounded" />
          <div className="h-4 w-4/6 bg-zinc-200 dark:bg-zinc-700 rounded" />
        </div>
      </div>
    ),

    table: (
      <div className={`${baseClass} space-y-4 ${className}`}>
        {/* Header */}
        <div className="grid grid-cols-4 gap-4 p-4 bg-zinc-100 dark:bg-zinc-800 rounded">
          <div className="h-4 bg-zinc-200 dark:bg-zinc-700 rounded" />
          <div className="h-4 bg-zinc-200 dark:bg-zinc-700 rounded" />
          <div className="h-4 bg-zinc-200 dark:bg-zinc-700 rounded" />
          <div className="h-4 bg-zinc-200 dark:bg-zinc-700 rounded" />
        </div>

        {/* Rows */}
        {[...Array(5)].map((_, i) => (
          <div key={i} className="grid grid-cols-4 gap-4 p-4 border border-zinc-200 dark:border-zinc-800 rounded">
            <div className="h-4 bg-zinc-200 dark:bg-zinc-700 rounded" />
            <div className="h-4 bg-zinc-200 dark:bg-zinc-700 rounded" />
            <div className="h-4 bg-zinc-200 dark:bg-zinc-700 rounded" />
            <div className="h-4 bg-zinc-200 dark:bg-zinc-700 rounded" />
          </div>
        ))}
      </div>
    ),

    list: (
      <div className={`${baseClass} space-y-3 ${className}`}>
        {[...Array(count)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-4 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
            <div className="w-12 h-12 bg-zinc-200 dark:bg-zinc-700 rounded" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-2/3 bg-zinc-200 dark:bg-zinc-700 rounded" />
              <div className="h-3 w-1/2 bg-zinc-200 dark:bg-zinc-700 rounded" />
            </div>
          </div>
        ))}
      </div>
    ),

    grid: (
      <div className={`${baseClass} grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 ${className}`}>
        {[...Array(count || 3)].map((_, i) => (
          <div key={i} className="p-4 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 space-y-4">
            <div className="w-full h-32 bg-zinc-200 dark:bg-zinc-700 rounded" />
            <div className="h-4 w-2/3 bg-zinc-200 dark:bg-zinc-700 rounded" />
            <div className="space-y-2">
              <div className="h-3 w-full bg-zinc-200 dark:bg-zinc-700 rounded" />
              <div className="h-3 w-4/5 bg-zinc-200 dark:bg-zinc-700 rounded" />
            </div>
          </div>
        ))}
      </div>
    ),
  };

  return skeletonTypes[type] || skeletonTypes.card;
}

export default SkeletonLoader;
