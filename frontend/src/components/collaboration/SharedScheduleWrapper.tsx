'use client';

import { Suspense } from 'react';
import { SharedScheduleManager } from './SharedScheduleManager';

const WRAPPER_LOG = '[shared-schedule-wrapper-debug]';

function SharedScheduleContent({ autoLoadCode }: { autoLoadCode?: string | null }) {
  console.info(`${WRAPPER_LOG} [SharedScheduleContent] rendered`, {
    autoLoadCode,
    autoLoadCodeLength: autoLoadCode?.length ?? null,
    autoLoadCodeType: typeof autoLoadCode,
  });
  return (
    <SharedScheduleManager autoLoadCode={autoLoadCode} />
  );
}

export function SharedScheduleWrapper({ autoLoadCode }: { autoLoadCode?: string | null }) {
  console.info(`${WRAPPER_LOG} [SharedScheduleWrapper] rendered`, {
    autoLoadCode,
    autoLoadCodeLength: autoLoadCode?.length ?? null,
  });
  return (
    <Suspense
      fallback={
        <div className="flex flex-col gap-4 p-6 animate-pulse w-full max-w-4xl mx-auto">
          <div className="h-8 w-64 bg-muted rounded"></div>
          <div className="h-[400px] w-full bg-muted/50 rounded-lg"></div>
        </div>
      }
    >
      <SharedScheduleContent autoLoadCode={autoLoadCode} />
    </Suspense>
  );
}