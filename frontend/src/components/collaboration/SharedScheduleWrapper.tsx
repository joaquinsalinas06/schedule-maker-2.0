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
    <Suspense fallback={<div>Cargando horarios compartidos...</div>}>
      <SharedScheduleContent />
    </Suspense>
  );
}