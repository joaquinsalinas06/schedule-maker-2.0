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
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Sesión Colaborativa</h1>
              <p className="text-muted-foreground">
                Colaborando en: {currentSession.name}
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => useCollaborationStore.getState().clearSession()}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver a Sesiones
            </Button>
          </div>
          <EnhancedCollaborativeBuilder />
        </div>
      ) : (
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Centro de Colaboración</h1>
            <p className="text-muted-foreground mt-2">
              Crea, comparte y compara horarios con tus compañeros de clase
            </p>
          </div>

          <Tabs value={collaborationTab} onValueChange={setCollaborationTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="sessions" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Sesiones
              </TabsTrigger>
              <TabsTrigger value="shared" className="flex items-center gap-2">
                <Share className="h-4 w-4" />
                Compartidos
              </TabsTrigger>
              <TabsTrigger value="compare" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Comparar
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