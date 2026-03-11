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

type SharedSchedulePayload = {
  share_token?: string;
  schedule?: {
    name?: string;
    combination?: {
      courses?: any[];
    };
  };
  shared_by?: {
    name?: string;
  };
};

const SHARED_SCHEDULE_LOG_PREFIX = '[shared-schedule-debug]';

const SharedScheduleManagerComponent = ({ autoLoadCode }: SharedScheduleManagerProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [viewScheduleToken, setViewScheduleToken] = useState('');
  const [viewingSchedule, setViewingSchedule] = useState<SharedSchedulePayload | null>(null);
  const [hasAutoLoaded, setHasAutoLoaded] = useState(false);

  // LOG: component mounted
  useEffect(() => {
    console.info(`${SHARED_SCHEDULE_LOG_PREFIX} [MOUNT] component mounted`, {
      autoLoadCode,
      autoLoadCodeLength: autoLoadCode?.length ?? null,
      autoLoadCodeType: typeof autoLoadCode,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setLoading(false); // No need to load shared schedules list anymore
  }, []);

  // Auto-load schedule if code is provided
  useEffect(() => {
    console.info(`${SHARED_SCHEDULE_LOG_PREFIX} [AUTO-LOAD effect] fired`, {
      autoLoadCode,
      autoLoadCodeLength: autoLoadCode?.length ?? null,
      hasAutoLoaded,
      willTriggerLoad: Boolean(autoLoadCode && autoLoadCode.length === 8 && !hasAutoLoaded),
    });
    if (autoLoadCode && autoLoadCode.length === 8 && !hasAutoLoaded) {
      setViewScheduleToken(autoLoadCode);
      setHasAutoLoaded(true);
      viewSharedSchedule(autoLoadCode);
    }
  }, [autoLoadCode, hasAutoLoaded]);

  // Transform shared schedule data to ScheduleVisualization format
  const transformSharedScheduleData = (sharedSchedule: SharedSchedulePayload | null) => {
    console.info(`${SHARED_SCHEDULE_LOG_PREFIX} [TRANSFORM] called`, {
      sharedScheduleIsNull: sharedSchedule === null,
      hasSchedule: Boolean(sharedSchedule?.schedule),
      scheduleKeys: sharedSchedule?.schedule ? Object.keys(sharedSchedule.schedule) : [],
      hasCombination: Boolean(sharedSchedule?.schedule?.combination),
      combinationKeys: sharedSchedule?.schedule?.combination ? Object.keys(sharedSchedule.schedule.combination) : [],
      coursesIsArray: Array.isArray(sharedSchedule?.schedule?.combination?.courses),
      coursesLength: Array.isArray(sharedSchedule?.schedule?.combination?.courses)
        ? sharedSchedule!.schedule!.combination!.courses!.length
        : null,
      rawCoursesValue: sharedSchedule?.schedule?.combination?.courses,
    });

    if (!Array.isArray(sharedSchedule?.schedule?.combination?.courses)) {
      console.error(`${SHARED_SCHEDULE_LOG_PREFIX} [TRANSFORM] FAILED - invalid courses payload`, {
        hasSchedule: Boolean(sharedSchedule?.schedule),
        hasCombination: Boolean(sharedSchedule?.schedule?.combination),
        coursesType: typeof sharedSchedule?.schedule?.combination?.courses,
        coursesValue: sharedSchedule?.schedule?.combination?.courses,
      });
      return null;
    }

    const courses = sharedSchedule.schedule.combination.courses.map((course: any, index: number) => {
      return {
        course_id: course.course_id || index + 1,
        course_code: course.course_code,
        course_name: course.course_name,
        section_id: course.section_id || index + 1,
        section_number: course.section_number,
        professor: course.professor,
        sessions: course.sessions?.map((session: any, sessionIndex: number) => {
          return {
            session_id: session.session_id || sessionIndex + 1,
            session_type: session.session_type || 'TEORÍA',
            day: session.day_of_week || session.day, // Handle both formats
            start_time: session.start_time,
            end_time: session.end_time,
            location: session.classroom || session.location || 'TBA',
            modality: session.modality || 'Presencial',
          };
        }) || [],
      };
    });

    const transformedData = {
      combinations: [{
        combination_id: 'shared',
        course_count: courses.length,
        courses,
        sections: [], // Keep empty for compatibility
        conflicts: [], // Keep empty for compatibility
      }],
      total_combinations: 1,
      selected_courses_count: courses.length,
    };

    console.info(`${SHARED_SCHEDULE_LOG_PREFIX} [TRANSFORM] SUCCESS`, {
      coursesCount: courses.length,
      firstCourse: courses[0] ?? null,
      firstCourseSessionsCount: courses[0]?.sessions?.length ?? null,
      firstSession: courses[0]?.sessions?.[0] ?? null,
      transformedCombinationId: transformedData.combinations[0].combination_id,
    });

    return transformedData;
  };

  const viewSharedSchedule = async (token: string) => {
    if (!token.trim()) {
      toast({
        title: 'Error',
        description: 'Por favor ingresa un código válido de horario',
        variant: 'destructive',
      });
      return;
    }

    const normalizedToken = token.trim().toUpperCase();

    // Don't load if already loading this token
    if (viewingSchedule?.share_token === normalizedToken) {
      return;
    }

    try {
      console.info(`${SHARED_SCHEDULE_LOG_PREFIX} fetching shared schedule`, {
        token: normalizedToken,
      });

      const result = await CollaborationAPI.getSharedSchedule(normalizedToken);

      console.info(`${SHARED_SCHEDULE_LOG_PREFIX} [API RESPONSE] full payload dump`, {
        token: normalizedToken,
        topLevelKeys: result && typeof result === 'object' ? Object.keys(result) : [],
        hasSchedule: Boolean(result?.schedule),
        scheduleKeys: result?.schedule ? Object.keys(result.schedule) : [],
        scheduleName: result?.schedule?.name,
        hasCombination: Boolean(result?.schedule?.combination),
        combinationKeys: result?.schedule?.combination ? Object.keys(result.schedule.combination) : [],
        hasSharedBy: Boolean(result?.shared_by),
        sharedByKeys: result?.shared_by ? Object.keys(result.shared_by) : [],
        hasCourses: Array.isArray(result?.schedule?.combination?.courses),
        coursesLength: Array.isArray(result?.schedule?.combination?.courses)
          ? result.schedule.combination.courses.length
          : null,
        firstCourseKeys: Array.isArray(result?.schedule?.combination?.courses) && result.schedule.combination.courses.length > 0
          ? Object.keys(result.schedule.combination.courses[0])
          : [],
        firstCourseSessionsLength: Array.isArray(result?.schedule?.combination?.courses) && result.schedule.combination.courses.length > 0
          ? result.schedule.combination.courses[0]?.sessions?.length ?? null
          : null,
        firstSession: Array.isArray(result?.schedule?.combination?.courses) && result.schedule.combination.courses.length > 0
          ? result.schedule.combination.courses[0]?.sessions?.[0] ?? null
          : null,
      });

      if (!result?.schedule) {
        console.error(`${SHARED_SCHEDULE_LOG_PREFIX} missing schedule in payload`, {
          token: normalizedToken,
          payload: result,
        });
        throw new Error('Shared schedule payload is missing schedule');
      }

      setViewingSchedule(result as SharedSchedulePayload);

      const scheduleName = result.schedule?.name || 'Horario sin nombre';
      const sharedByName = result.shared_by?.name || 'usuario desconocido';

      toast({
        title: 'Horario Cargado',
        description: `Viendo "${scheduleName}" compartido por ${sharedByName}`,
      });
    } catch (error: any) {
      console.error(`${SHARED_SCHEDULE_LOG_PREFIX} failed to load shared schedule`, {
        token: normalizedToken,
        errorMessage: error?.message,
        status: error?.response?.status,
        responseData: error?.response?.data,
      });
      toast({
        title: 'Horario No Encontrado',
        description: 'Por favor verifica que el código sea correcto.',
        variant: 'destructive',
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
                      <CardTitle className="text-xl">{viewingSchedule?.schedule?.name || 'Horario compartido'}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        Compartido por {viewingSchedule?.shared_by?.name || 'usuario desconocido'} • {viewingSchedule?.schedule?.combination?.courses?.length || 0} materias
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
                    console.info(`${SHARED_SCHEDULE_LOG_PREFIX} [RENDER] ScheduleVisualization decision`, {
                      transformedDataIsNull: transformedData === null,
                      combinationsLength: transformedData?.combinations?.length ?? null,
                      coursesInFirstCombination: transformedData?.combinations?.[0]?.courses?.length ?? null,
                      scheduleNameProp: viewingSchedule?.schedule?.name || 'Horario compartido',
                    });
                    return transformedData ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <div className="text-center p-3 bg-primary/10 border border-primary/20 rounded-lg backdrop-blur-sm">
                            <div className="text-2xl font-bold text-primary">
                              {transformedData.selected_courses_count}
                            </div>
                            <div className="text-sm text-muted-foreground">Materias</div>
                          </div>
                          <div className="text-center p-3 bg-muted border border-border rounded-lg backdrop-blur-sm">
                            <div className="text-2xl font-bold text-foreground">
                              {viewScheduleToken}
                            </div>
                            <div className="text-sm text-muted-foreground">Código Compartir</div>
                          </div>
                        </div>

                        {/* Schedule Canvas Visualization */}
                        <ScheduleVisualization
                          scheduleName={viewingSchedule?.schedule?.name || 'Horario compartido'}
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
