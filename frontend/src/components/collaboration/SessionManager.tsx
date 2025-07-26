'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCollaborationStore, CollaborativeSession } from '@/stores/collaborationStore';
import { CollaborationAPI } from '@/services/collaborationAPI';
import { websocketService } from '@/services/websocketService';
import { CreateSessionDialog, JoinSessionDialog } from './CreateJoinSession';
import { 
  Users, 
  Clock, 
  Copy, 
  Play, 
  BarChart3, 
  Calendar,
  MapPin
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export function SessionManager() {
  const [loading, setLoading] = useState(true);
  const { 
    sessions, 
    setSessions, 
    currentSession, 
    setCurrentSession,
    isConnected 
  } = useCollaborationStore();

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      const userSessions = await CollaborationAPI.getUserSessions();
      setSessions(userSessions);
    } catch (error: any) {
      console.error('Failed to load sessions:', error);
      toast({
        title: "Error",
        description: "Failed to load your sessions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const copySessionCode = (sessionCode: string) => {
    navigator.clipboard.writeText(sessionCode);
    toast({
      title: "Copied!",
      description: `Session code ${sessionCode} copied to clipboard`,
    });
  };

  const joinSession = (session: CollaborativeSession) => {
    setCurrentSession(session);
    const token = localStorage.getItem('access_token');
    if (token) {
      websocketService.connect(session.session_code, token);
    }
  };

  const leaveSession = () => {
    websocketService.disconnect();
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
        return <Badge className="bg-green-100 text-green-800">Active</Badge>;
      case 'expired':
        return <Badge variant="secondary">Expired</Badge>;
      case 'inactive':
        return <Badge variant="outline">Inactive</Badge>;
      default:
        return null;
    }
  };

  const formatTimeRemaining = (expiresAt: string) => {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diff = expiry.getTime() - now.getTime();

    if (diff <= 0) return 'Expired';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) return `${days}d ${hours}h remaining`;
    if (hours > 0) return `${hours}h ${minutes}m remaining`;
    return `${minutes}m remaining`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="text-muted-foreground">Loading sessions...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Collaborative Sessions</h2>
          <p className="text-muted-foreground">
            Work together on schedules with classmates from your university
          </p>
        </div>
        <div className="flex gap-2">
          <CreateSessionDialog />
          <JoinSessionDialog />
        </div>
      </div>

      {/* Current Session */}
      {currentSession && (
        <Card className="border-blue-200 bg-blue-50/50">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Play className="h-5 w-5 text-blue-600" />
                  Current Session: {currentSession.name}
                </CardTitle>
                <CardDescription>
                  You are currently connected to this session
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                {isConnected ? (
                  <Badge className="bg-green-100 text-green-800">Connected</Badge>
                ) : (
                  <Badge variant="destructive">Disconnected</Badge>
                )}
                <Button onClick={leaveSession} variant="outline" size="sm">
                  Leave Session
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Copy className="h-4 w-4" />
                <span className="font-mono">{currentSession.session_code}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copySessionCode(currentSession.session_code)}
                >
                  Copy
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span>{currentSession.participants.length} participants</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>
                  {currentSession.expires_at 
                    ? formatTimeRemaining(currentSession.expires_at)
                    : 'No expiry'
                  }
                </span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                <span>Max {currentSession.max_participants} people</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sessions List */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {sessions.map((session) => {
          const status = getSessionStatus(session);
          const isCurrentSession = currentSession?.id === session.id;
          
          return (
            <Card key={session.id} className={isCurrentSession ? 'ring-2 ring-blue-500' : ''}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{session.name}</CardTitle>
                    <CardDescription className="mt-1">
                      {session.description || 'No description'}
                    </CardDescription>
                  </div>
                  {getStatusBadge(status)}
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="space-y-3">
                  {/* Session Info */}
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Copy className="h-4 w-4" />
                      <span className="font-mono">{session.session_code}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => copySessionCode(session.session_code)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      <span>{session.participants.length}/{session.max_participants}</span>
                    </div>
                  </div>

                  {/* Time remaining */}
                  {session.expires_at && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>{formatTimeRemaining(session.expires_at)}</span>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    {status === 'active' && !isCurrentSession && (
                      <Button 
                        onClick={() => joinSession(session)}
                        size="sm"
                        className="flex-1"
                      >
                        <Play className="h-4 w-4 mr-2" />
                        Join
                      </Button>
                    )}
                    
                    {isCurrentSession && (
                      <Button variant="outline" size="sm" className="flex-1" disabled>
                        Current Session
                      </Button>
                    )}

                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        // Navigate to comparison view
                        window.open(`/collaboration/compare/${session.session_code}`, '_blank');
                      }}
                    >
                      <BarChart3 className="h-4 w-4" />
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
            <h3 className="text-lg font-semibold mb-2">No collaborative sessions</h3>
            <p className="text-muted-foreground text-center mb-4">
              Create a new session or join an existing one to start collaborating on schedules
            </p>
            <div className="flex gap-2">
              <CreateSessionDialog />
              <JoinSessionDialog />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
