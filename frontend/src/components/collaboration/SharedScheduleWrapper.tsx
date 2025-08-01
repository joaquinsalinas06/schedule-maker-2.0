'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { SharedScheduleManager } from './SharedScheduleManager';

function SharedScheduleContent() {
  const searchParams = useSearchParams();
  const code = searchParams.get('code');
  
  console.log('=== SHARED SCHEDULE WRAPPER ===')
  console.log('Code from searchParams:', code)
  console.log('Code length:', code?.length)
  console.log('===============================')
  
  return (
    <SharedScheduleManager autoLoadCode={code} />
  );
}

export function SharedScheduleWrapper() {
  return (
    <Suspense fallback={<div>Loading shared schedules...</div>}>
      <SharedScheduleContent />
    </Suspense>
  );
}