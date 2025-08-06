'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  User as UserIcon,
  Mail,
  Building2,
  Calendar,
  BookOpen,
  X,
  Eye,
  BarChart3
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { friendsAPI } from '@/services/friendsAPI';
import { User, Schedule, ScheduleDetail, FriendProfileModalProps } from '@/types';

export function FriendProfileModal({ friendId, isOpen, onClose, onViewSchedules }: FriendProfileModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [schedulesLoading, setSchedulesLoading] = useState(false);
  const [friend, setFriend] = useState<User | null>(null);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [selectedScheduleDetail, setSelectedScheduleDetail] = useState<ScheduleDetail | null>(null);
  const [showScheduleDetail, setShowScheduleDetail] = useState(false);

  const loadFriendProfile = useCallback(async () => {
    if (!friendId) return;
    
    setLoading(true);
    try {
      const response = await friendsAPI.getFriendProfile(friendId);
      setFriend(response.data);
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: (error as { message?: string }).message || "No se pudo cargar el perfil",
        variant: "destructive"
      });
      onClose();
    } finally {
      setLoading(false);
    }
  }, [friendId, toast, onClose]);

  useEffect(() => {
    if (isOpen && friendId) {
      loadFriendProfile();
    }
  }, [isOpen, friendId, loadFriendProfile]);

  const loadFriendSchedules = async () => {
    if (!friendId) return;
    
    setSchedulesLoading(true);
    try {
      const response = await friendsAPI.getFriendSchedules(friendId);
      setSchedules(response.data);
      
      // Don't trigger onViewSchedules here - only load the schedules for display
      // onViewSchedules should only be called when user explicitly wants to compare
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: (error as { message?: string }).message || "No se pudieron cargar los horarios",
        variant: "destructive"
      });
    } finally {
      setSchedulesLoading(false);
    }
  };

  const getDisplayName = (user: User) => {
    if (user.nickname) return user.nickname;
    if (user.first_name && user.last_name) return `${user.first_name} ${user.last_name}`;
    if (user.first_name) return user.first_name;
    return user.email?.split('@')[0] || 'Usuario';
  };

  const getInitials = (user: User) => {
    const name = getDisplayName(user);
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (!friend && !loading) {
    return null;
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserIcon className="w-5 h-5" />
            Perfil de Amigo
          </DialogTitle>
          <DialogDescription>
            Información del perfil y horarios disponibles
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : friend ? (
          <div className="space-y-6">
            {/* Profile Header */}
                        <div className="flex items-center space-x-4 p-4 bg-gradient-to-r from-gray-800/80 to-gray-700/80 rounded-lg border border-gray-600/50">
              <Avatar className="w-16 h-16">
                <AvatarImage src={friend.profile_photo} alt={friend.first_name} />
                <AvatarFallback className="text-lg font-semibold bg-gray-700 text-gray-100">
                  {getInitials(friend)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-foreground">
                  {getDisplayName(friend)}
                </h3>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Building2 className="w-4 h-4" />
                  {friend.university?.short_name}
                </p>
                {friend.student_id && (
                  <p className="text-xs text-muted-foreground">
                    ID: {friend.student_id}
                  </p>
                )}
              </div>
            </div>

            {/* Profile Details */}
            <div className="grid gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Mail className="w-5 h-5" />
                    Información de Contacto
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Email:</span>
                    <span className="font-medium text-foreground">{friend.email}</span>
                  </div>
                  {friend.student_id && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Código:</span>
                      <span className="font-medium text-foreground">{friend.student_id}</span>
                    </div>
                  )}
                  {friend.last_login && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Último acceso:</span>
                      <span className="font-medium text-foreground">{formatDate(friend.last_login)}</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Description */}
              {friend.description && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <UserIcon className="w-5 h-5" />
                      Acerca de
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-foreground leading-relaxed">{friend.description}</p>
                  </CardContent>
                </Card>
              )}

              {/* Stats */}
              {friend.stats && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <BarChart3 className="w-5 h-5" />
                      Estadísticas
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-3 bg-blue-900/20 rounded-lg border border-blue-700/30">
                        <div className="text-2xl font-bold text-blue-400">
                          {friend.stats.friend_count}
                        </div>
                        <div className="text-sm text-blue-300">Amigos</div>
                      </div>
                      <div className="text-center p-3 bg-green-900/20 rounded-lg border border-green-700/30">
                        <div className="text-2xl font-bold text-green-400">
                          {friend.stats.schedules_count}
                        </div>
                        <div className="text-sm text-green-300">Horarios</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Schedules Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    Horarios Disponibles
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {schedules.length > 0 ? (
                    <div className="space-y-2">
                      {schedules.map((schedule, index) => {
                        // Assign different gradient colors to schedule cards
                        const scheduleGradients = [
                          'from-purple-900/20 to-blue-900/20 border-purple-500/30 hover:from-purple-900/30 hover:to-blue-900/30',
                          'from-cyan-900/20 to-teal-900/20 border-cyan-500/30 hover:from-cyan-900/30 hover:to-teal-900/30',
                          'from-emerald-900/20 to-green-900/20 border-emerald-500/30 hover:from-emerald-900/30 hover:to-green-900/30',
                          'from-amber-900/20 to-orange-900/20 border-amber-500/30 hover:from-amber-900/30 hover:to-orange-900/30',
                          'from-pink-900/20 to-rose-900/20 border-pink-500/30 hover:from-pink-900/30 hover:to-rose-900/30'
                        ];
                        const scheduleGradient = scheduleGradients[index % scheduleGradients.length];
                        
                        return (
                          <div key={schedule.id} className={`flex items-center justify-between p-3 border rounded-lg bg-gradient-to-r ${scheduleGradient} transition-all duration-200`}>
                            <div className="flex-1">
                              <p className="font-medium text-white">{schedule.name}</p>
                              <p className="text-sm text-gray-200">{schedule.description}</p>
                              <p className="text-xs text-gray-300">
                                Creado: {formatDate(schedule.created_at)}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              {schedule.is_favorite && (
                                <span className="px-2 py-1 bg-yellow-900/40 text-yellow-300 text-xs rounded-full border border-yellow-600/40">
                                  Favorito
                                </span>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                                onClick={async () => {
                                  try {
                                    const response = await friendsAPI.getFriendScheduleDetail(friendId!, schedule.id);
                                    setSelectedScheduleDetail(response.data);
                                    setShowScheduleDetail(true);
                                  } catch (error: unknown) {
                                    toast({
                                      title: "Error",
                                      description: (error as { message?: string }).message || "No se pudo cargar el horario",
                                      variant: "destructive"
                                    });
                                  }
                                }}
                              >
                                <Eye className="w-4 h-4 mr-1" />
                                Ver
                              </Button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <Button
                        onClick={loadFriendSchedules}
                        disabled={schedulesLoading}
                        variant="outline"
                      >
                        <BookOpen className="w-4 h-4 mr-2" />
                        {schedulesLoading ? 'Cargando...' : 'Ver Horarios'}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-2 pt-4 border-t">
              {schedules.length > 0 && onViewSchedules && (
                <Button
                  onClick={() => onViewSchedules(friendId!, schedules)}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Comparar Horarios
                </Button>
              )}
              <Button variant="outline" onClick={onClose}>
                <X className="w-4 h-4 mr-2" />
                Cerrar
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <p>No se pudo cargar el perfil del amigo</p>
          </div>
        )}
      </DialogContent>
      </Dialog>

      {/* Schedule Detail Modal */}
      <Dialog open={showScheduleDetail} onOpenChange={setShowScheduleDetail}>
        <DialogContent className="sm:max-w-[800px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              {selectedScheduleDetail?.name}
            </DialogTitle>
            <DialogDescription>
              Detalle del horario de tu amigo
            </DialogDescription>
          </DialogHeader>

          {selectedScheduleDetail && (
            <div className="space-y-4">
              {/* Schedule Info */}
              <div className="p-4 bg-blue-900/20 rounded-lg border border-blue-700/30">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-foreground">{selectedScheduleDetail.name}</h3>
                    {selectedScheduleDetail.description && (
                      <p className="text-sm text-muted-foreground">{selectedScheduleDetail.description}</p>
                    )}
                  </div>
                  {selectedScheduleDetail.is_favorite && (
                    <span className="px-2 py-1 bg-yellow-900/30 text-yellow-400 text-xs rounded-full font-medium border border-yellow-700/30">
                      Favorito
                    </span>
                  )}
                </div>
              </div>

              {/* Courses */}
              <div className="space-y-4">
                <h4 className="font-semibold flex items-center gap-2 text-foreground">
                  <BookOpen className="w-4 h-4" />
                  Cursos ({selectedScheduleDetail.courses.length})
                </h4>
                
                {selectedScheduleDetail.courses.map((course, courseIndex) => {
                  // Assign different gradient colors based on course index  
                  const courseGradients = [
                    'from-purple-900/30 to-blue-900/30 border-purple-500/50',
                    'from-cyan-900/30 to-teal-900/30 border-cyan-500/50',
                    'from-emerald-900/30 to-green-900/30 border-emerald-500/50', 
                    'from-amber-900/30 to-orange-900/30 border-amber-500/50',
                    'from-pink-900/30 to-rose-900/30 border-pink-500/50',
                    'from-indigo-900/30 to-violet-900/30 border-indigo-500/50'
                  ];
                  const courseGradient = courseGradients[courseIndex % courseGradients.length];
                  
                  return (
                    <Card key={course.id} className={`bg-gradient-to-r ${courseGradient} border`}>
                      <CardHeader>
                        <CardTitle className="text-lg text-white">{course.code} - {course.name}</CardTitle>
                        {course.description && (
                          <p className="text-sm text-gray-200">{course.description}</p>
                        )}
                      </CardHeader>
                      <CardContent>
                        {course.sections.map((section) => (
                        <div key={section.id} className="mb-4 p-3 border rounded-lg bg-gradient-to-r from-purple-900/20 to-blue-900/20 border-purple-500/30">
                          <div className="flex justify-between items-center mb-2">
                            <h5 className="font-medium text-purple-100">Sección {section.section_number}</h5>
                            <div className="text-sm text-purple-300">
                              {section.enrolled}/{section.capacity} estudiantes
                            </div>
                          </div>
                          {section.professor && (
                            <p className="text-sm text-purple-200 mb-2">
                              Profesor: {section.professor}
                            </p>
                          )}
                          <div className="space-y-1">
                            {section.sessions.map((session, sessionIndex) => {
                              // Assign different gradient colors based on session index
                              const gradients = [
                                'from-cyan-900/40 to-blue-900/40 border-cyan-500/40',
                                'from-purple-900/40 to-pink-900/40 border-purple-500/40', 
                                'from-emerald-900/40 to-teal-900/40 border-emerald-500/40',
                                'from-amber-900/40 to-orange-900/40 border-amber-500/40',
                                'from-indigo-900/40 to-violet-900/40 border-indigo-500/40'
                              ];
                              const gradient = gradients[sessionIndex % gradients.length];
                              
                              return (
                                <div key={session.id} className={`flex justify-between items-center text-sm p-3 bg-gradient-to-r ${gradient} border rounded-lg`}>
                                  <div className="text-white">
                                    <span className="font-medium">{session.session_type}</span>
                                    <span className="mx-2 text-gray-300">•</span>
                                    <span>{session.day}</span>
                                    <span className="mx-2 text-gray-300">•</span>
                                    <span>{session.start_time} - {session.end_time}</span>
                                  </div>
                                  <div className="text-gray-200">
                                    {session.building && session.room ? 
                                      `${session.building} - ${session.room}` : 
                                      session.location || 'Sin ubicación'}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                  )
                })}
              </div>

              {/* Actions */}
              <div className="flex justify-end space-x-2 pt-4 border-t">
                {/*<Button 
                  variant="outline"
                  onClick={async () => {
                    try {
                      if (!selectedScheduleDetail || !friendId) {
                        console.log('❌ Missing data for comparison:', { selectedScheduleDetail: !!selectedScheduleDetail, friendId });
                        return;
                      }
                      
                      console.log('🚀 Starting comparison process...');
                      console.log('📊 Selected schedule:', selectedScheduleDetail);
                      console.log('👤 Friend ID:', friendId);
                      console.log('👤 Friend data:', friend);
                      
                      // Generate comparison code
                      const compCode = `comp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                      console.log('🔑 Generated comparison code:', compCode);
                      
                      // Store schedule data for comparison
                      const scheduleData = {
                        id: selectedScheduleDetail.id,
                        name: selectedScheduleDetail.name,
                        description: selectedScheduleDetail.description,
                        // Transform nested courses structure to flat CourseSection array
                        courses: selectedScheduleDetail.courses.flatMap(course => 
                          course.sections.map(section => ({
                            course_id: course.id,
                            course_code: course.code,
                            course_name: course.name,
                            section_id: section.id,
                            section_number: section.section_number,
                            professor: section.professor || 'TBD',
                            sessions: section.sessions.map(session => ({
                              id: session.id,
                              session_type: session.session_type,
                              day: session.day,
                              start_time: session.start_time,
                              end_time: session.end_time,
                              location: session.location || '',
                              building: session.building || '',
                              room: session.room || '',
                              modality: session.modality
                            }))
                          }))
                        ),
                        owner: friend?.first_name || friend?.email || 'Amigo',
                        compCode: compCode
                      };
                      
                      console.log('💾 Storing schedule data:', scheduleData);
                      sessionStorage.setItem('comparison_schedule', JSON.stringify(scheduleData));
                      
                      // Verify storage
                      const stored = sessionStorage.getItem('comparison_schedule');
                      console.log('✅ Verified storage:', !!stored);
                      
                      // Navigate to collaboration tab with comparison code
                      const targetUrl = `/dashboard/collaboration?compcode=${compCode}`;
                      console.log('🔄 Navigating to:', targetUrl);
                      window.location.href = targetUrl;
                      
                    } catch (error) {
                      console.error('❌ Error in comparison process:', error);
                      toast({
                        title: "Error",
                        description: "No se pudo iniciar la comparación",
                        variant: "destructive"
                      });
                    }
                  }}
                  className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white border-0"
                >
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Comparar
                </Button>*/}
                <Button variant="outline" onClick={() => setShowScheduleDetail(false)}>
                  <X className="w-4 h-4 mr-2" />
                  Cerrar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}