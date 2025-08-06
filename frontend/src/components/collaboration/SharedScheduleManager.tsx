import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { CollaborationAPI } from '@/services/collaborationAPI';
import { ScheduleVisualization } from '@/components/ScheduleVisualization';
import { 
  Eye,
  Calendar,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SharedScheduleManagerProps {
  autoLoadCode?: string | null;
}

const SharedScheduleManagerComponent = ({ autoLoadCode }: SharedScheduleManagerProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [viewScheduleToken, setViewScheduleToken] = useState('');
  const [viewingSchedule, setViewingSchedule] = useState<any>(null);
  const [hasAutoLoaded, setHasAutoLoaded] = useState(false);

  useEffect(() => {
    setLoading(false); // No need to load shared schedules list anymore
  }, []);

  // Auto-load schedule if code is provided
  useEffect(() => {
    if (autoLoadCode && autoLoadCode.length === 8 && !hasAutoLoaded) {
      setViewScheduleToken(autoLoadCode);
      setHasAutoLoaded(true);
      viewSharedSchedule(autoLoadCode);
    }
  }, [autoLoadCode, hasAutoLoaded]);
  // Transform shared schedule data to ScheduleVisualization format
  const transformSharedScheduleData = (sharedSchedule: any) => {
    console.log('🔄 Transforming shared schedule data:', sharedSchedule);
    
    if (!sharedSchedule?.schedule?.combination?.courses) {
      console.log('❌ No courses found in shared schedule data');
      return null;
    }

    const courses = sharedSchedule.schedule.combination.courses.map((course: any, index: number) => {
      console.log('📚 Processing course:', course);
      
      return {
        course_id: course.course_id || index + 1,
        course_code: course.course_code,
        course_name: course.course_name,
        section_id: course.section_id || index + 1,
        section_number: course.section_number,
        professor: course.professor,
        sessions: course.sessions?.map((session: any, sessionIndex: number) => {
          console.log('🕐 Processing session:', session);
          
          return {
            session_id: session.session_id || sessionIndex + 1,
            session_type: session.session_type || "TEORÍA",
            day: session.day_of_week || session.day, // Handle both formats
            start_time: session.start_time,
            end_time: session.end_time,
            location: session.classroom || session.location || "TBA",
            modality: session.modality || "Presencial"
          };
        }) || []
      };
    });

    const transformedData = {
      combinations: [{
        combination_id: "shared",
        course_count: courses.length,
        courses: courses,
        sections: [], // Keep empty for compatibility
        conflicts: [] // Keep empty for compatibility
      }],
      total_combinations: 1,
      selected_courses_count: courses.length
    };
    
    console.log('✅ Transformed schedule data:', transformedData);
    return transformedData;
  };

  const viewSharedSchedule = async (token: string) => {
    if (!token.trim()) {
      toast({
        title: "Error",
        description: "Por favor ingresa un código válido de horario",
        variant: "destructive",
      });
      return;
    }

    // Don't load if already loading this token
    if (viewingSchedule?.share_token === token) {
      return;
    }

    try {
      const result = await CollaborationAPI.getSharedSchedule(token);
      console.log(result);
      setViewingSchedule(result);
      toast({
        title: "Horario Cargado",
        description: `Viendo "${result.schedule.name}" compartido por ${result.shared_by.name}`,
      });
    } catch (error: any) {
      // Failed to load shared schedule
      toast({
        title: "Horario No Encontrado",
        description: "Por favor verifica que el código sea correcto.",
        variant: "destructive",
      });
    }
  };



  return (
    <div className="space-y-6">
      {/* View Shared Schedule */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Ver Horario Compartido
          </CardTitle>
          <CardDescription>
            Ingresa un código de horario para ver el horario compartido de alguien más
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="Ingresa código de 8 caracteres (ej., A3B7K9M2)"
              value={viewScheduleToken}
              onChange={(e) => setViewScheduleToken(e.target.value.toUpperCase())}
              className="flex-1"
              maxLength={8}
            />
            <Button 
              onClick={() => viewSharedSchedule(viewScheduleToken)}
              disabled={!viewScheduleToken.trim() || viewScheduleToken.length !== 8}
            >
              <Eye className="h-4 w-4 mr-2" />
              Ver Horario
            </Button>
          </div>

          {viewingSchedule && (
            <div className="mt-4">
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-xl">{viewingSchedule.schedule.name}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        Compartido por {viewingSchedule.shared_by.name} • {viewingSchedule.schedule.combination?.courses?.length || 0} materias
                      </p>
                      <div className="flex gap-2 mt-2">
                        <Badge variant="outline">Código: {viewScheduleToken}</Badge>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setViewingSchedule(null)}
                    >
                      Cerrar
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {(() => {
                    const transformedData = transformSharedScheduleData(viewingSchedule);
                    return transformedData ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <div className="text-center p-3 bg-cyan-500/20 border border-cyan-500/30 rounded-lg backdrop-blur-sm">
                            <div className="text-2xl font-bold text-cyan-400">
                              {transformedData.selected_courses_count}
                            </div>
                            <div className="text-sm text-cyan-300">Materias</div>
                          </div>
                          <div className="text-center p-3 bg-purple-500/20 border border-purple-500/30 rounded-lg backdrop-blur-sm">
                            <div className="text-2xl font-bold text-purple-400">
                              {viewScheduleToken}
                            </div>
                            <div className="text-sm text-purple-300">Código Compartir</div>
                          </div>
                        </div>
                        
                        {/* Schedule Canvas Visualization */}
                          <ScheduleVisualization 
                            scheduleName={viewingSchedule.schedule.name}
                            scheduleData={transformedData}
                            showBackButton={false}
                          />

                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No hay datos de horario disponibles</p>
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export const SharedScheduleManager = SharedScheduleManagerComponent;