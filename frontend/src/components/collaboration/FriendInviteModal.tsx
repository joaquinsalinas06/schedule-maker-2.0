'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { 
  Users,
  Search,
  UserPlus,
  X,
  Send,
  Check
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
  university?: {
    id: number
    name: string
    short_name: string
  }
}

interface FriendInviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionCode: string;
  sessionName: string;
  onInviteSent?: (friendIds: number[]) => void;
}

export function FriendInviteModal({ isOpen, onClose, sessionCode, sessionName, onInviteSent }: FriendInviteModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [friends, setFriends] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFriends, setSelectedFriends] = useState<Set<number>>(new Set());
  const [invitedFriends, setInvitedFriends] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (isOpen) {
      loadFriends();
    }
  }, [isOpen]);

  const loadFriends = async () => {
    setLoading(true);
    try {
      const response = await friendsAPI.getFriendsList();
      setFriends(response.data || []);
    } catch (error: unknown) {
      console.error('Error loading friends:', error)
      toast({
        title: "Error",
        description: "No se pudieron cargar los amigos",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
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

  const toggleFriendSelection = (friendId: number) => {
    const newSelected = new Set(selectedFriends);
    if (newSelected.has(friendId)) {
      newSelected.delete(friendId);
    } else {
      newSelected.add(friendId);
    }
    setSelectedFriends(newSelected);
  };

  const sendInvitations = async () => {
    if (selectedFriends.size === 0) {
      toast({
        title: "Advertencia",
        description: "Selecciona al menos un amigo para invitar",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      // Here we would typically send invitations via email, SMS, or in-app notifications
      // For now, we'll simulate this with a toast message and copy the session code to clipboard
      
      const friendNames = Array.from(selectedFriends)
        .map(id => friends.find(f => f.id === id))
        .filter(f => f)
        .map(f => getDisplayName(f!));

      // Copy session code to clipboard
      await navigator.clipboard.writeText(sessionCode);

      // Mark friends as invited
      setInvitedFriends(new Set([...invitedFriends, ...selectedFriends]));

      toast({
        title: "¡Invitaciones enviadas!",
        description: `Se enviaron invitaciones a ${friendNames.join(', ')}. El código de sesión se copió al portapapeles.`,
      });

      if (onInviteSent) {
        onInviteSent(Array.from(selectedFriends));
      }

      setSelectedFriends(new Set());
      
    } catch (error) {
      console.error('Error sending invitations:', error)
      toast({
        title: "Error",
        description: "No se pudieron enviar las invitaciones",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredFriends = friends.filter(friend => {
    if (!searchQuery) return true;
    const displayName = getDisplayName(friend).toLowerCase();
    const email = friend.email.toLowerCase();
    const studentId = friend.student_id?.toLowerCase() || '';
    const query = searchQuery.toLowerCase();
    
    return displayName.includes(query) || 
           email.includes(query) || 
           studentId.includes(query);
  });

  const handleClose = () => {
    setSelectedFriends(new Set());
    setSearchQuery('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Invitar Amigos a la Sesión
          </DialogTitle>
          <DialogDescription>
            Invita a tus amigos a unirse a la sesión de colaboración &quot;{sessionName}&quot;
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Session Info */}
          <Card className="bg-gradient-to-r from-gray-800/80 to-gray-700/80 border-gray-600/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-100">{sessionName}</h3>
                  <p className="text-sm text-gray-300">Código de sesión: <span className="font-mono font-bold text-gray-100">{sessionCode}</span></p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-gray-500 text-gray-100 hover:bg-gray-700/50 bg-gray-800/30"
                  onClick={() => {
                    navigator.clipboard.writeText(sessionCode);
                    toast({
                      title: "¡Copiado!",
                      description: "Código de sesión copiado al portapapeles",
                    });
                  }}
                >
                  Copiar código
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar amigos por nombre, email o código..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Selected Friends Summary */}
          {selectedFriends.size > 0 && (
            <Card className="bg-blue-900/20 border-blue-700/50">
              <CardContent className="p-3">
                <p className="text-sm text-blue-200">
                  <Users className="w-4 h-4 inline mr-1" />
                  {selectedFriends.size} amigo{selectedFriends.size !== 1 ? 's' : ''} seleccionado{selectedFriends.size !== 1 ? 's' : ''}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Friends List */}
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : filteredFriends.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  {friends.length === 0 ? 'No tienes amigos aún' : 'No se encontraron amigos'}
                </h3>
                <p>
                  {friends.length === 0 
                    ? 'Agrega amigos para poder invitarlos a sesiones' 
                    : 'Intenta con diferentes términos de búsqueda'}
                </p>
              </div>
            ) : (
              filteredFriends.map((friend) => {
                const isSelected = selectedFriends.has(friend.id);
                const isInvited = invitedFriends.has(friend.id);
                
                return (
                  <Card 
                    key={friend.id} 
                    className={`cursor-pointer transition-all ${
                      isSelected 
                        ? 'border-rose-600 bg-rose-900/20' 
                        : isInvited 
                          ? 'border-green-600 bg-green-900/20' 
                          : 'hover:shadow-md hover:border-gray-600'
                    }`}
                    onClick={() => !isInvited && toggleFriendSelection(friend.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <Avatar className="h-12 w-12">
                            <AvatarImage src={friend.profile_photo} />
                            <AvatarFallback>{getInitials(friend)}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {getDisplayName(friend)}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {friend.university?.short_name}
                            </p>
                            {friend.student_id && (
                              <p className="text-xs text-muted-foreground">
                                {friend.student_id}
                              </p>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center">
                          {isInvited ? (
                            <div className="flex items-center text-green-600">
                              <Check className="h-4 w-4 mr-1" />
                              <span className="text-sm">Invitado</span>
                            </div>
                          ) : isSelected ? (
                            <Button
                              size="sm"
                              className="bg-rose-600 hover:bg-rose-700"
                            >
                              <X className="h-4 w-4 mr-1" />
                              Quitar
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-rose-600 text-rose-100 hover:bg-rose-900/30 bg-rose-900/20"
                            >
                              <UserPlus className="h-4 w-4 mr-1" />
                              Seleccionar
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button variant="outline" onClick={handleClose}>
              <X className="w-4 h-4 mr-2" />
              Cancelar
            </Button>
            <Button
              onClick={sendInvitations}
              disabled={loading || selectedFriends.size === 0}
              className="bg-rose-600 hover:bg-rose-700"
            >
              <Send className="w-4 h-4 mr-2" />
              {loading ? 'Enviando...' : `Invitar ${selectedFriends.size > 0 ? `(${selectedFriends.size})` : ''}`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}