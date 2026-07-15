'use client';

import React, { useState } from 'react';
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
  Building2,
  Calendar,
  BookOpen,
  X,
  Eye,
} from 'lucide-react';
import { ButtonLoader } from "@/components/ui/loading-skeletons";
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useFriendProfile } from '../hooks/useFriendProfile';
import type { FriendScheduleDetail, FriendScheduleSummary } from '../types';

interface FriendProfileModalProps {
  friendId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onViewSchedules?: (friendId: string, schedules: FriendScheduleSummary[]) => void;
}

export function FriendProfileModal({ friendId, isOpen, onClose, onViewSchedules }: FriendProfileModalProps) {
  const { toast } = useToast();
  const { profile: friend, loading, schedules, schedulesLoading, loadSchedules, loadScheduleDetail } = useFriendProfile(
    isOpen ? friendId : null
  );
  const [selectedScheduleDetail, setSelectedScheduleDetail] = useState<FriendScheduleDetail | null>(null);
  const [showScheduleDetail, setShowScheduleDetail] = useState(false);

  const getDisplayName = () => {
    if (!friend) return 'Usuario';
    if (friend.nickname) return friend.nickname;
    if (friend.first_name && friend.last_name) return `${friend.first_name} ${friend.last_name}`;
    if (friend.first_name) return friend.first_name;
    return 'Usuario';
  };

  const getInitials = () => {
    const name = getDisplayName();
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handleViewDetail = async (scheduleId: string) => {
    try {
      const detail = await loadScheduleDetail(scheduleId);
      setSelectedScheduleDetail(detail);
      setShowScheduleDetail(true);
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: (error as { message?: string }).message || "No se pudo cargar el horario",
        variant: "destructive",
      });
    }
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
                    src={friend.profile_photo || undefined}
                    alt={friend.first_name || ''}
                  />
                  <AvatarFallback className="text-lg font-semibold bg-muted text-foreground">
                    {getInitials()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-foreground">
                    {getDisplayName()}
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
                        {schedules.map((schedule) => (
                          <div
                            key={schedule.id}
                            className="flex items-center justify-between p-3 border border-border rounded-lg bg-card hover:bg-accent transition-colors"
                          >
                            <div className="flex-1">
                              <p className="font-medium text-foreground">
                                {schedule.name || 'Sin nombre'}
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
                                onClick={() => handleViewDetail(schedule.id)}
                              >
                                <Eye className="w-4 h-4 mr-1" />
                                Ver
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-6">
                        <Button
                          onClick={loadSchedules}
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
                {schedules.length > 0 && onViewSchedules && friendId && (
                  <Button
                    onClick={() => onViewSchedules(friendId, schedules)}
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
              {selectedScheduleDetail?.name || 'Horario'}
            </DialogTitle>
            <DialogDescription>
              Detalle del horario de tu amigo
            </DialogDescription>
          </DialogHeader>

          {selectedScheduleDetail && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg border border-border">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-foreground">
                      {selectedScheduleDetail.name || 'Sin nombre'}
                    </h3>
                  </div>
                  {selectedScheduleDetail.is_favorite && (
                    <span className="px-2 py-1 bg-warning/10 text-warning text-xs rounded-full font-medium border border-warning/20">
                      Favorito
                    </span>
                  )}
                </div>
              </div>

              {/* Courses (flat: one section per course, per the schedule's combination_data) */}
              <div className="space-y-4">
                <h4 className="font-semibold flex items-center gap-2 text-foreground">
                  <BookOpen className="w-4 h-4" />
                  Cursos ({selectedScheduleDetail.combination_data?.courses.length ?? 0})
                </h4>

                {(selectedScheduleDetail.combination_data?.courses ?? []).map((course) => (
                  <Card
                    key={course.course_id}
                    className="bg-card border border-border"
                  >
                    <CardHeader>
                      <CardTitle className="text-lg text-foreground">
                        {course.course_code} - {course.course_name}
                      </CardTitle>
                      {course.professor && (
                        <p className="text-sm text-muted-foreground">
                          Profesor: {course.professor}
                        </p>
                      )}
                    </CardHeader>
                    <CardContent>
                      <div className="mb-2 text-sm text-muted-foreground">
                        Sección {course.section_number}
                      </div>
                      <div className="space-y-1">
                        {course.sessions.map((session) => (
                          <div
                            key={session.session_id}
                            className="flex justify-between items-center text-sm p-3 bg-accent border border-border rounded-lg"
                          >
                            <div className="text-foreground">
                              {session.session_type && (
                                <>
                                  <span className="font-medium">{session.session_type}</span>
                                  <span className="mx-2 text-muted-foreground">•</span>
                                </>
                              )}
                              <span>{session.day}</span>
                              <span className="mx-2 text-muted-foreground">•</span>
                              <span>
                                {session.start_time} - {session.end_time}
                              </span>
                            </div>
                            <div className="text-muted-foreground">
                              {session.location || "Sin ubicación"}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t">
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
