"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Users, Share2, BarChart3, ArrowLeft } from "lucide-react"
import { useCollaborationStore } from '@/stores/collaborationStore'

import { SessionManager } from '@/components/collaboration/SessionManager'
import { EnhancedCollaborativeBuilder } from '@/components/collaboration/EnhancedCollaborativeBuilder'
import { SharedScheduleWrapper } from '@/components/collaboration/SharedScheduleWrapper'
import { IntegratedScheduleComparison } from '@/components/collaboration/IntegratedScheduleComparison'

const COLLAB_ROUTE_LOG_PREFIX = '[collab-route-debug]'

export default function CollaborationPage() {
  const { currentSession } = useCollaborationStore();
  const searchParams = useSearchParams();
  const sharedCode = searchParams.get("code")?.toUpperCase() || "";
  const comparisonCode = searchParams.get("compcode") || "";
  const hasDirectNavigation =
    sharedCode.length === 8 || Boolean(comparisonCode);

  const [activeTab, setActiveTab] = useState(() => {
    if (sharedCode.length === 8) return "shared";
    if (comparisonCode) return "compare";
    return "sessions";
  });

  // LOG: raw URL params and computed values
  console.info(`${COLLAB_ROUTE_LOG_PREFIX} [CollaborationPage] rendered`, {
    rawCodeParam: searchParams.get("code"),
    sharedCode,
    sharedCodeLength: sharedCode.length,
    comparisonCode,
    hasDirectNavigation,
    hasCurrentSession: Boolean(currentSession),
    activeTab,
  });

  useEffect(() => {
    console.info(`${COLLAB_ROUTE_LOG_PREFIX} navigation state`, {
      activeTab,
      hasCurrentSession: Boolean(currentSession),
      sharedCode,
      comparisonCode,
      hasDirectNavigation,
    });
  }, [
    activeTab,
    comparisonCode,
    currentSession,
    hasDirectNavigation,
    sharedCode,
  ]);

  const tabs = [
    { id: 'sessions', label: 'Sesiones', icon: Users },
    { id: 'shared', label: 'Compartidos', icon: Share2 },
    { id: 'compare', label: 'Comparar', icon: BarChart3 },
  ]

  if (currentSession && !hasDirectNavigation) {
    return (
      <div className="h-full flex flex-col">
        <header className="px-6 py-4 border-b border-border bg-background/50 backdrop-blur-sm sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-foreground">Sesion Colaborativa</h1>
              <p className="text-sm text-muted-foreground">{currentSession.name}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => useCollaborationStore.getState().clearSession()}
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Volver
            </Button>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-6">
          <EnhancedCollaborativeBuilder />
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <header className="px-6 py-4 border-b border-border bg-background/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Colaboracion</h1>
            <p className="text-sm text-muted-foreground">Crea, comparte y compara horarios</p>
          </div>
        </div>

        {/* Tabs */}
        <nav className="flex gap-1 mt-4 -mb-4">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'text-foreground border-primary bg-background'
                    : 'text-muted-foreground border-transparent hover:text-foreground hover:bg-muted/50'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            )
          })}
        </nav>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === 'sessions' && <SessionManager />}
        {activeTab === 'shared' && <SharedScheduleWrapper autoLoadCode={sharedCode || null} />}
        {activeTab === 'compare' && <IntegratedScheduleComparison />}
      </div>
    </div>
  )
}
