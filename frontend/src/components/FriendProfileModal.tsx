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
  BarChart3,
  ArrowLeft
} from 'lucide-react';
import { ButtonLoader } from "@/components/ui/loading-skeletons";
import { format } from "date-fns";
import { Skeleton } from '@/components/ui/skeleton';
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
            <div className="space-y-6 py-4">
              <div className="flex items-center space-x-4 p-4">
                <Skeleton className="w-16 h-16 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
              <div className="space-y-3 px-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            </div>
          ) : friend ? (
            <div className="space-y-6">
              {/* Profile Header */}
              <div className="flex items-center space-x-4 p-4 bg-card rounded-lg border border-border">
                <Avatar className="w-16 h-16">
                  <AvatarImage
                    src={friend.profile_photo}
                    alt={friend.first_name}
                  />
                  <AvatarFallback className="text-lg font-semibold bg-muted text-foreground">
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
                      <span className="font-medium text-foreground">
                        {friend.email}
                      </span>
                    </div>
                    {friend.student_id && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Código:</span>
                        <span className="font-medium text-foreground">
                          {friend.student_id}
                        </span>
                      </div>
                    )}
                    {friend.last_login && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Último acceso:
                        </span>
                        <span className="font-medium text-foreground">
                          {formatDate(friend.last_login)}
                        </span>
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
                      <p className="text-foreground leading-relaxed">
                        {friend.description}
                      </p>
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
                        <div className="text-center p-3 bg-muted rounded-lg border border-border">
                          <div className="text-2xl font-bold text-foreground">
                            {friend.stats.friend_count}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Amigos
                          </div>
                        </div>
                        <div className="text-center p-3 bg-muted rounded-lg border border-border">
                          <div className="text-2xl font-bold text-foreground">
                            {friend.stats.schedules_count}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Horarios
                          </div>
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
                        {schedules.map((schedule) => {
                          return (
                            <div
                              key={schedule.id}
                              className="flex items-center justify-between p-3 border border-border rounded-lg bg-card hover:bg-accent transition-colors"
                            >
                              <div className="flex-1">
                                <p className="font-medium text-foreground">
                                  {schedule.name}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {schedule.description}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Creado: {formatDate(schedule.created_at)}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                {schedule.is_favorite && (
                                  <span className="px-2 py-1 bg-warning/10 text-warning text-xs rounded-full border border-warning/20">
                                    Favorito
                                  </span>
                                )}
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className=""
                                  onClick={async () => {
                                    try {
                                      const response =
                                        await friendsAPI.getFriendScheduleDetail(
                                          friendId!,
                                          schedule.id,
                                        );
                                      setSelectedScheduleDetail(response.data);
                                      setShowScheduleDetail(true);
                                    } catch (error: unknown) {
                                      toast({
                                        title: "Error",
                                        description:
                                          (error as { message?: string })
                                            .message ||
                                          "No se pudo cargar el horario",
                                        variant: "destructive",
                                      });
                                    }
                                  }}
                                >
                                  <Eye className="w-4 h-4 mr-1" />
                                  Ver
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-6">
                        <Button
                          onClick={loadFriendSchedules}
                          disabled={schedulesLoading}
                          variant="outline"
                        >
                          {schedulesLoading ? (
                            <span className="flex items-center gap-1"><ButtonLoader /></span>
                          ) : (
                            <>
                              <BookOpen className="w-4 h-4 mr-2" />
                              Ver Horarios
                            </>
                          )}
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
                    className="bg-primary hover:bg-primary/90 text-primary-foreground"
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
              <div className="p-4 bg-muted rounded-lg border border-border">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-foreground">
                      {selectedScheduleDetail.name}
                    </h3>
                    {selectedScheduleDetail.description && (
                      <p className="text-sm text-muted-foreground">
                        {selectedScheduleDetail.description}
                      </p>
                    )}
                  </div>
                  {selectedScheduleDetail.is_favorite && (
                    <span className="px-2 py-1 bg-warning/10 text-warning text-xs rounded-full font-medium border border-warning/20">
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

                {selectedScheduleDetail.courses.map((course) => {
                  return (
                    <Card
                      key={course.id}
                      className="bg-card border border-border"
                    >
                      <CardHeader>
                        <CardTitle className="text-lg text-foreground">
                          {course.code} - {course.name}
                        </CardTitle>
                        {course.description && (
                          <p className="text-sm text-muted-foreground">
                            {course.description}
                          </p>
                        )}
                      </CardHeader>
                      <CardContent>
                        {course.sections.map((section) => (
                          <div
                            key={section.id}
                            className="mb-4 p-3 border rounded-lg bg-muted border-border"
                          >
                            <div className="flex justify-between items-center mb-2">
                              <h5 className="font-medium text-foreground">
                                Sección {section.section_number}
                              </h5>
                              <div className="text-sm text-muted-foreground">
                                {section.enrolled}/{section.capacity}{" "}
                                estudiantes
                              </div>
                            </div>
                            {section.professor && (
                              <p className="text-sm text-muted-foreground mb-2">
                                Profesor: {section.professor}
                              </p>
                            )}
                            <div className="space-y-1">
                              {section.sessions.map((session) => {
                                return (
                                  <div
                                    key={session.id}
                                    className="flex justify-between items-center text-sm p-3 bg-accent border border-border rounded-lg"
                                  >
                                    <div className="text-foreground">
                                      <span className="font-medium">
                                        {session.session_type}
                                      </span>
                                      <span className="mx-2 text-muted-foreground">
                                        •
                                      </span>
                                      <span>{session.day}</span>
                                      <span className="mx-2 text-muted-foreground">
                                        •
                                      </span>
                                      <span>
                                        {session.start_time} -{" "}
                                        {session.end_time}
                                      </span>
                                    </div>
                                    <div className="text-muted-foreground">
                                      {session.building && session.room
                                        ? `${session.building} - ${session.room}`
                                        : session.location || "Sin ubicación"}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  );
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
                  className="bg-primary hover:bg-primary/90 text-primary-foreground border-0"
                >
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Comparar
                </Button>*/}
                <Button
                  variant="outline"
                  onClick={() => setShowScheduleDetail(false)}
                >
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