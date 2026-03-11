'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { SharedScheduleManager } from './SharedScheduleManager';

function SharedScheduleContent() {
  const searchParams = useSearchParams();
  const code = searchParams.get('code');
  
  
  return (
    <SharedScheduleManager autoLoadCode={code} />
  );
}

export function SharedScheduleWrapper() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col gap-4 p-6 animate-pulse w-full max-w-4xl mx-auto">
          <div className="h-8 w-64 bg-muted rounded"></div>
          <div className="h-[400px] w-full bg-muted/50 rounded-lg"></div>
        </div>
      }
    >
      <SharedScheduleContent />
    </Suspense>
  );
}