"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Users, Share, BarChart3, ArrowLeft } from "lucide-react"
import { useCollaborationStore } from '@/stores/collaborationStore'

// Collaboration Components
import { SessionManager } from '@/components/collaboration/SessionManager'
import { EnhancedCollaborativeBuilder } from '@/components/collaboration/EnhancedCollaborativeBuilder'
import { SharedScheduleWrapper } from '@/components/collaboration/SharedScheduleWrapper'
import { IntegratedScheduleComparison } from '@/components/collaboration/IntegratedScheduleComparison'

export default function CollaborationPage() {
  const { currentSession } = useCollaborationStore()
  const [collaborationTab, setCollaborationTab] = useState('sessions')
  const searchParams = useSearchParams()

  // Auto-load shared schedule if code is in URL (moved from /collaboration route)
  useEffect(() => {
    const code = searchParams.get('code');
    const compCode = searchParams.get('compcode');
    
    console.log('🔍 Collaboration page params:', { code, compCode });
    
    if (code && code.length === 8) {
      // Switch to shared tab and auto-load the schedule
      console.log('📋 Switching to shared tab for code:', code);
      setCollaborationTab('shared');
    } else if (compCode) {
      // Switch to compare tab and auto-load the comparison schedule
      console.log('🔀 Switching to compare tab for compcode:', compCode);
      setCollaborationTab('compare');
      
      // Check if there's a schedule stored for comparison
      const comparisonSchedule = sessionStorage.getItem('comparison_schedule');
      console.log('🔍 Found comparison schedule in storage:', !!comparisonSchedule);
      
      if (comparisonSchedule) {
        try {
          const scheduleData = JSON.parse(comparisonSchedule);
          console.log('📊 Auto-loading comparison schedule:', scheduleData);
          // The IntegratedScheduleComparison component will handle this
        } catch (error) {
          console.error('❌ Error parsing comparison schedule:', error);
        }
      } else {
        console.log('⚠️ No comparison schedule found in sessionStorage');
      }
    } else {
      console.log('ℹ️ No special codes found, using default tab');
    }
  }, [searchParams]);

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8">
      {currentSession ? (
        <div className="space-y-4 sm:space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="min-w-0 flex-1">
              <h1 className="text-xl sm:text-2xl font-bold truncate">Sesión Colaborativa</h1>
              <p className="text-muted-foreground text-sm sm:text-base truncate">
                Colaborando en: {currentSession.name}
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => useCollaborationStore.getState().clearSession()}
              className="text-xs sm:text-sm px-3 sm:px-4 w-full sm:w-auto"
            >
              <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
              Volver a Sesiones
            </Button>
          </div>
          <EnhancedCollaborativeBuilder />
        </div>
      ) : (
        <div className="space-y-4 sm:space-y-6">
          <div className="text-center sm:text-left">
            <h1 className="text-2xl sm:text-3xl font-bold">Centro de Colaboración</h1>
            <p className="text-muted-foreground mt-1 sm:mt-2 text-sm sm:text-base">
              Crea, comparte y compara horarios con tus compañeros de clase
            </p>
          </div>

          <Tabs value={collaborationTab} onValueChange={setCollaborationTab}>
            <TabsList className="grid w-full grid-cols-3 h-12 sm:h-10">
              <TabsTrigger value="sessions" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
                <Users className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Sesiones</span>
                <span className="sm:hidden">Sesiones</span>
              </TabsTrigger>
              <TabsTrigger value="shared" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
                <Share className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Compartidos</span>
                <span className="sm:hidden">Compartir</span>
              </TabsTrigger>
              <TabsTrigger value="compare" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
                <BarChart3 className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Comparar</span>
                <span className="sm:hidden">Comparar</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="sessions" className="mt-6">
              <SessionManager />
            </TabsContent>

            <TabsContent value="shared" className="mt-6">
              <SharedScheduleWrapper />
            </TabsContent>

            <TabsContent value="compare" className="mt-6">
              <IntegratedScheduleComparison />
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  )
}