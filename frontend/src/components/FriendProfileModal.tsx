'use client';

import React, { useState, useEffect } from 'react';
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
  User,
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

interface User {
  id: number
  first_name: string
  last_name: string
  nickname?: string
  email: string
  student_id?: string
  profile_photo?: string
  description?: string
  university?: {
    id: number
    name: string
    short_name: string
  }
  last_login?: string
  stats?: {
    friend_count: number
    schedules_count: number
  }
}

interface Schedule {
  id: number
  name: string
  description?: string
  created_at: string
  is_favorite: boolean
}

interface ScheduleDetail {
  id: number
  name: string
  description?: string
  is_favorite: boolean
  created_at: string
  courses: Array<{
    id: number
    code: string
    name: string
    description?: string
    department: string
    sections: Array<{
      id: number
      section_number: string
      professor?: string
      capacity: number
      enrolled: number
      sessions: Array<{
        id: number
        session_type: string
        day: string
        start_time: string
        end_time: string
        location?: string
        building?: string
        room?: string
        modality: string
      }>
    }>
  }>
}

interface FriendProfileModalProps {
  friendId: number | null;
  isOpen: boolean;
  onClose: () => void;
  onViewSchedules?: (friendId: number, schedules: Schedule[]) => void;
}

export function FriendProfileModal({ friendId, isOpen, onClose, onViewSchedules }: FriendProfileModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [schedulesLoading, setSchedulesLoading] = useState(false);
  const [friend, setFriend] = useState<User | null>(null);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [selectedScheduleDetail, setSelectedScheduleDetail] = useState<ScheduleDetail | null>(null);
  const [showScheduleDetail, setShowScheduleDetail] = useState(false);

  useEffect(() => {
    if (isOpen && friendId) {
      loadFriendProfile();
    }
  }, [isOpen, friendId]);

  const loadFriendProfile = async () => {
    if (!friendId) return;
    
    setLoading(true);
    try {
      const response = await friendsAPI.getFriendProfile(friendId);
      setFriend(response.data);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo cargar el perfil",
        variant: "destructive"
      });
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const loadFriendSchedules = async () => {
    if (!friendId) return;
    
    setSchedulesLoading(true);
    try {
      const response = await friendsAPI.getFriendSchedules(friendId);
      setSchedules(response.data);
      
      // Don't trigger onViewSchedules here - only load the schedules for display
      // onViewSchedules should only be called when user explicitly wants to compare
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudieron cargar los horarios",
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
            <User className="w-5 h-5" />
            Perfil de Amigo
          </DialogTitle>
          <DialogDescription>
            Información del perfil y horarios disponibles
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-8 h-8 border-4 border-rose-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : friend ? (
          <div className="space-y-6">
            {/* Profile Header */}
            <div className="flex items-center space-x-4 p-4 bg-gradient-to-r from-rose-900/20 to-pink-900/20 rounded-lg border border-rose-700/30">
              <Avatar className="w-16 h-16">
                <AvatarImage src={friend.profile_photo} />
                <AvatarFallback className="text-lg font-semibold bg-rose-800 text-rose-100">
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
                      <User className="w-5 h-5" />
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
                      {schedules.map((schedule) => (
                        <div key={schedule.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                          <div className="flex-1">
                            <p className="font-medium">{schedule.name}</p>
                            <p className="text-sm text-muted-foreground">{schedule.description}</p>
                            <p className="text-xs text-muted-foreground">
                              Creado: {formatDate(schedule.created_at)}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {schedule.is_favorite && (
                              <span className="px-2 py-1 bg-yellow-900/30 text-yellow-400 text-xs rounded-full border border-yellow-700/30">
                                Favorito
                              </span>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={async () => {
                                try {
                                  const response = await friendsAPI.getFriendScheduleDetail(friendId!, schedule.id);
                                  setSelectedScheduleDetail(response.data);
                                  setShowScheduleDetail(true);
                                } catch (error: any) {
                                  toast({
                                    title: "Error",
                                    description: error.message || "No se pudo cargar el horario",
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
                      ))}
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
                  className="bg-rose-600 hover:bg-rose-700"
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
                
                {selectedScheduleDetail.courses.map((course) => (
                  <Card key={course.id}>
                    <CardHeader>
                      <CardTitle className="text-lg text-foreground">{course.code} - {course.name}</CardTitle>
                      {course.description && (
                        <p className="text-sm text-muted-foreground">{course.description}</p>
                      )}
                    </CardHeader>
                    <CardContent>
                      {course.sections.map((section) => (
                        <div key={section.id} className="mb-4 p-3 border rounded-lg bg-muted/30">
                          <div className="flex justify-between items-center mb-2">
                            <h5 className="font-medium text-foreground">Sección {section.section_number}</h5>
                            <div className="text-sm text-muted-foreground">
                              {section.enrolled}/{section.capacity} estudiantes
                            </div>
                          </div>
                          {section.professor && (
                            <p className="text-sm text-foreground mb-2">
                              Profesor: {section.professor}
                            </p>
                          )}
                          <div className="space-y-1">
                            {section.sessions.map((session) => (
                              <div key={session.id} className="flex justify-between items-center text-sm p-2 bg-background border rounded">
                                <div className="text-foreground">
                                  <span className="font-medium">{session.session_type}</span>
                                  <span className="mx-2">•</span>
                                  <span>{session.day}</span>
                                  <span className="mx-2">•</span>
                                  <span>{session.start_time} - {session.end_time}</span>
                                </div>
                                <div className="text-muted-foreground">
                                  {session.building && session.room ? 
                                    `${session.building} - ${session.room}` : 
                                    session.location || 'Sin ubicación'}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Actions */}
              <div className="flex justify-end space-x-2 pt-4 border-t">
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