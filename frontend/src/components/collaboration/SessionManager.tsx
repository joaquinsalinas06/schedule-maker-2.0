'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCollaborationStore } from '@/stores/collaborationStore';
import { CollaborativeSession } from '@/types/collaboration';
import { CollaborationAPI } from '@/services/collaborationAPI';
import { websocketService } from '@/services/websocketService';
import { CreateSessionDialog, JoinSessionDialog } from './CreateJoinSession';
import { FriendInviteModal } from './FriendInviteModal';
import { 
  Users, 
  Clock, 
  Copy, 
  Play, 
  Calendar,
  MapPin,
  UserPlus
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export function SessionManager() {
  const [loading, setLoading] = useState(true);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState<CollaborativeSession | null>(null);
  const { 
    sessions,  
    currentSession, 
    setCurrentSession,
    setSessions,
    isConnected,
    clearUserData 
  } = useCollaborationStore();

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      // Load sessions from API if we don't have any in store
      // This preserves sessions across tab switches and reloads
      if (sessions.length === 0) {
        try {
          // Check if we're in comparison mode (URL has compcode)
          const urlParams = new URLSearchParams(window.location.search);
          const compCode = urlParams.get('compcode');
          
          if (compCode) {
            // In comparison mode - don't try to load sessions from API
          } else {
            // Normal mode - try to load sessions from API
            const userSessions = await CollaborationAPI.getUserSessions();
            setSessions(userSessions);
          }
        } catch (apiError) {
          // Check if it's a 405 error (endpoint not implemented)
          const error = apiError as any;
          if (error.status === 405) {
            // User sessions endpoint not implemented yet, this is expected
          } else {
            // Failed to load sessions from API
          }
          // Keep existing sessions from secure storage
        }
      } else {
        // Sessions already loaded
      }
    } catch (error) {
      // Error in loadSessions - continuing without API session loading
    } finally {
      setLoading(false);
    }
  };

  const copySessionCode = (sessionCode: string) => {
    navigator.clipboard.writeText(sessionCode);
    toast({
      title: "¡Copiado!",
      description: `Código de sesión ${sessionCode} copiado al portapapeles`,
    });
  };

  const joinSession = (session: CollaborativeSession) => {
    setCurrentSession(session);
    const token = localStorage.getItem('token');
    
    if (token) {
      websocketService.connect(session.session_code, token);
    } else {
      // No authentication token found
      toast({
        title: "Error de Autenticación",
        description: "Por favor inicia sesión nuevamente para unirte a la sesión",
        variant: "destructive",
      });
    }
  };

  const leaveSession = () => {
    websocketService.disconnect();
    // Explicitly clear the current session when user chooses to leave
    setCurrentSession(null);
  };

  const getSessionStatus = (session: CollaborativeSession) => {
    if (!session.is_active) return 'inactive';
    if (session.expires_at && new Date(session.expires_at) < new Date()) return 'expired';
    return 'active';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500/20 text-green-400 border border-green-500/30">Activa</Badge>;
      case 'expired':
        return <Badge variant="secondary">Expirada</Badge>;
      case 'inactive':
        return <Badge variant="outline">Inactiva</Badge>;
      default:
        return null;
    }
  };

  const formatTimeRemaining = (expiresAt: string) => {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diff = expiry.getTime() - now.getTime();

    if (diff <= 0) return 'Expirada';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) return `${days}d ${hours}h restantes`;
    if (hours > 0) return `${hours}h ${minutes}m restantes`;
    return `${minutes}m restantes`;
  };

  const openInviteModal = (session: CollaborativeSession) => {
    setSelectedSession(session);
    setInviteModalOpen(true);
  };

  const handleInviteSent = (friendIds: number[]) => {
    toast({
      title: "¡Invitaciones enviadas!",
      description: `Se enviaron ${friendIds.length} invitación${friendIds.length !== 1 ? 'es' : ''} exitosamente`,
    });
    setInviteModalOpen(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="text-muted-foreground">Cargando sesiones...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="min-w-0 flex-1">
          <h2 className="text-xl sm:text-2xl font-bold">Sesiones Colaborativas</h2>
          <p className="text-muted-foreground text-sm sm:text-base">
            Trabaja en conjunto en horarios con compañeros de tu universidad
          </p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <CreateSessionDialog />
          <JoinSessionDialog />
        </div>
      </div>

      {/* Current Session */}
      {currentSession && (
        <Card className="border-blue-500/30 bg-blue-500/10 backdrop-blur-sm">
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
              <div className="min-w-0 flex-1">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Play className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 flex-shrink-0" />
                  <span className="truncate">Sesión Actual: {currentSession.name}</span>
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Estás actualmente conectado a esta sesión
                </CardDescription>
              </div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full sm:w-auto">
                {isConnected ? (
                  <Badge className="bg-green-500/20 text-green-400 border border-green-500/30 text-xs">Conectado</Badge>
                ) : (
                  <Badge variant="destructive" className="text-xs">Desconectado</Badge>
                )}
                <div className="flex gap-2 w-full sm:w-auto">
                  <Button 
                    onClick={() => openInviteModal(currentSession)} 
                    variant="outline" 
                    size="sm"
                    className="bg-blue-500/20 hover:bg-blue-500/30 border-blue-500/40 text-blue-300 hover:text-blue-200 text-xs flex-1 sm:flex-initial"
                  >
                    <UserPlus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                    <span className="hidden sm:inline">Invitar Amigos</span>
                    <span className="sm:hidden">Invitar</span>
                  </Button>
                  <Button onClick={leaveSession} variant="outline" size="sm" className="text-xs flex-1 sm:flex-initial">
                    <span className="hidden sm:inline">Salir de Sesión</span>
                    <span className="sm:hidden">Salir</span>
                  </Button>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 text-xs sm:text-sm">
              <div className="flex items-center gap-2 min-w-0">
                <Copy className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                <span className="font-mono text-xs truncate">{currentSession.session_code}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copySessionCode(currentSession.session_code)}
                  className="text-xs px-2 py-1 h-auto flex-shrink-0"
                >
                  Copiar
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                <span>{currentSession.participants.length} participantes</span>
              </div>
              <div className="flex items-center gap-2 min-w-0">
                <Clock className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                <span className="truncate">
                  {currentSession.expires_at 
                    ? formatTimeRemaining(currentSession.expires_at)
                    : 'Sin expiración'
                  }
                </span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                <span>Máx {currentSession.max_participants} personas</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sessions List */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sessions.map((session) => {
          const status = getSessionStatus(session);
          const isCurrentSession = currentSession?.id === session.id;
          
          return (
            <Card key={session.id} className={isCurrentSession ? 'ring-2 ring-blue-500' : ''}>
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base sm:text-lg truncate">{session.name}</CardTitle>
                    <CardDescription className="mt-1 text-xs sm:text-sm line-clamp-2">
                      {session.description || 'Sin descripción'}
                    </CardDescription>
                  </div>
                  <div className="flex-shrink-0">
                    {getStatusBadge(status)}
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="space-y-3">
                  {/* Session Info */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs sm:text-sm">
                    <div className="flex items-center gap-2 min-w-0">
                      <Copy className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                      <span className="font-mono text-xs truncate">{session.session_code}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 flex-shrink-0"
                        onClick={() => copySessionCode(session.session_code)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                      <span>{session.participants.length}/{session.max_participants}</span>
                    </div>
                  </div>

                  {/* Time remaining */}
                  {session.expires_at && (
                    <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground min-w-0">
                      <Clock className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                      <span className="truncate">{formatTimeRemaining(session.expires_at)}</span>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    {status === 'active' && !isCurrentSession && (
                      <Button 
                        onClick={() => joinSession(session)}
                        size="sm"
                        className="flex-1 text-xs"
                      >
                        <Play className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                        Unirse
                      </Button>
                    )}
                    
                    {isCurrentSession && (
                      <Button variant="outline" size="sm" className="flex-1 text-xs" disabled>
                        Sesión Actual
                      </Button>
                    )}

                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => openInviteModal(session)}
                      className="px-3"
                    >
                      <UserPlus className="h-3 w-3 sm:h-4 sm:w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Empty State */}
      {sessions.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No hay sesiones colaborativas</h3>
            <p className="text-muted-foreground text-center mb-4">
              Crea una nueva sesión o únete a una existente para empezar a colaborar en horarios
            </p>
            <div className="flex gap-2">
              <CreateSessionDialog />
              <JoinSessionDialog />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Friend Invite Modal */}
      {selectedSession && (
        <FriendInviteModal
          isOpen={inviteModalOpen}
          onClose={() => setInviteModalOpen(false)}
          sessionCode={selectedSession.session_code}
          sessionName={selectedSession.name}
          onInviteSent={handleInviteSent}
        />
      )}
    </div>
  );
}
