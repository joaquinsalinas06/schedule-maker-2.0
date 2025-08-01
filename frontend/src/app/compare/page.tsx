'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, 
  Plus, 
  Calendar, 
  Clock, 
  MapPin, 
  User,
  Copy,
  BarChart3
} from 'lucide-react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

interface CourseSession {
  day: string;
  start_time: string;
  end_time: string;
  location: string;
}

interface ComparisonCourse {
  course_code: string;
  course_name: string;
  professor: string;
  sessions?: CourseSession[];
}

interface ScheduleComparison {
  id: string;
  name: string;
  total_courses: number;
  courses: ComparisonCourse[];
  shared_by?: string;
  created_at?: string;
}

function ComparePageContent() {
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [schedules, setSchedules] = useState<ScheduleComparison[]>([]);
  const [shareCode, setShareCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const code = searchParams.get('code');
    if (code) {
      setShareCode(code);
      loadScheduleByCode(code);
    }
  }, [searchParams]);

  const loadScheduleByCode = async (code: string) => {
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch(`http://localhost:8001/collaboration/shares/${code}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const shareData = await response.json();
        const schedule: ScheduleComparison = {
          id: shareData.id,
          name: shareData.title,
          total_courses: shareData.schedule_data.courses?.length || 0,
          courses: shareData.schedule_data.courses || [],
          shared_by: shareData.shared_by?.name || 'Usuario anónimo',
          created_at: shareData.created_at
        };
        
        setSchedules(prev => {
          const existing = prev.find(s => s.id === schedule.id);
          if (existing) return prev;
          return [...prev, schedule];
        });
      } else if (response.status === 404) {
        setError('Código de horario no encontrado. Verifica que el código sea correcto.');
      } else {
        setError('Error al cargar el horario compartido.');
      }
    } catch {
      setError('Error de conexión. Verifica tu conexión a internet.');
    } finally {
      setLoading(false);
    }
  };

  const addScheduleByCode = () => {
    if (!shareCode.trim()) {
      setError('Por favor ingresa un código válido');
      return;
    }
    loadScheduleByCode(shareCode.trim());
  };

  const removeSchedule = (id: string) => {
    setSchedules(schedules.filter(s => s.id !== id));
  };

  const getTimeSlot = (session: CourseSession) => {
    return `${session.start_time} - ${session.end_time}`;
  };

  const getDayAbbr = (day: string) => {
    const dayMap: { [key: string]: string } = {
      'Monday': 'LUN',
      'Tuesday': 'MAR', 
      'Wednesday': 'MIE',
      'Thursday': 'JUE',
      'Friday': 'VIE',
      'Saturday': 'SAB',
      'Sunday': 'DOM'
    };
    return dayMap[day] || day.slice(0, 3).toUpperCase();
  };

  const copyCurrentUrl = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast({
        title: 'Link copiado',
        description: 'Link de comparación copiado al portapapeles',
        variant: 'success'
      });
    } catch {
      toast({
        title: 'Error',
        description: 'No se pudo copiar el link al portapapeles',
        variant: 'destructive'
      });
    }
  };

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              onClick={() => router.push('/')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver al Dashboard
            </Button>
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <BarChart3 className="h-8 w-8" />
                Comparar Horarios
              </h1>
              <p className="text-muted-foreground">
                Compara múltiples horarios lado a lado
              </p>
            </div>
          </div>
          
          {schedules.length > 0 && (
            <Button variant="outline" onClick={copyCurrentUrl}>
              <Copy className="h-4 w-4 mr-2" />
              Copiar Link
            </Button>
          )}
        </div>

        {/* Add Schedule by Code */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Agregar Horario para Comparar</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                placeholder="Ingresa el código del horario compartido"
                value={shareCode}
                onChange={(e) => setShareCode(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addScheduleByCode()}
              />
              <Button onClick={addScheduleByCode} disabled={loading}>
                <Plus className="h-4 w-4 mr-2" />
                {loading ? 'Cargando...' : 'Agregar'}
              </Button>
            </div>
            {error && (
              <p className="text-red-500 text-sm mt-2">{error}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Schedules Comparison */}
      {schedules.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <BarChart3 className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-semibold mb-2">No hay horarios para comparar</h3>
              <p>Ingresa un código de horario compartido para comenzar la comparación</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Resumen de Comparación</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {schedules.map((schedule) => (
                  <div key={schedule.id} className="text-center p-4 border rounded-lg">
                    <h4 className="font-semibold">{schedule.name}</h4>
                    <p className="text-sm text-muted-foreground">
                      {schedule.total_courses} cursos • {schedule.courses.length} secciones
                    </p>
                    <p className="text-xs text-muted-foreground">
                      por {schedule.shared_by}
                    </p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-2"
                      onClick={() => removeSchedule(schedule.id)}
                    >
                      Quitar
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Detailed Comparison */}
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {schedules.map((schedule) => (
              <Card key={schedule.id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{schedule.name}</span>
                    <Badge variant="secondary">
                      {schedule.total_courses} cursos
                    </Badge>
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Compartido por {schedule.shared_by}
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {schedule.courses.map((course, idx) => (
                      <div key={idx} className="border rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-sm">
                            {course.course_code} - {course.course_name}
                          </h4>
                        </div>
                        <div className="text-xs text-muted-foreground space-y-1">
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {course.professor}
                          </div>
                          {course.sessions?.map((session: CourseSession, sessionIdx: number) => (
                            <div key={sessionIdx} className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {getDayAbbr(session.day)}
                              <Clock className="h-3 w-3 ml-1" />
                              {getTimeSlot(session)}
                              <MapPin className="h-3 w-3 ml-1" />
                              {session.location}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ComparePage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ComparePageContent />
    </Suspense>
  );
}
