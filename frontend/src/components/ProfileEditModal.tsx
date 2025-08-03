'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  Camera,
  Save,
  X,
  User,
  FileText,
  Building2,
  Upload
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { User as UserType, UserProfileUpdate } from '@/types';
import { ProfileAPI } from '@/services/profileAPI';
import { authService } from '@/services/auth';

type EditField = 'personal' | 'photo' | 'description';

interface ProfileEditModalProps {
  user: UserType;
  editField: EditField;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedUser: UserType) => void;
}

export function ProfileEditModal({ user, editField, isOpen, onClose, onSave }: ProfileEditModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState<UserProfileUpdate>({});

  useEffect(() => {
    if (isOpen) {
      // Initialize form data based on edit field
      switch (editField) {
        case 'personal':
          setFormData({
            first_name: user.first_name || '',
            last_name: user.last_name || '',
            nickname: user.nickname || '',
          });
          break;
        case 'description':
          setFormData({
            description: user.description || '',
          });
          break;
        case 'photo':
          setFormData({});
          break;
      }
    }
  }, [isOpen, editField, user]);

  const handleInputChange = (field: keyof UserProfileUpdate, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Error',
        description: 'Por favor selecciona un archivo de imagen válido',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'Error',
        description: 'La imagen no puede superar los 5MB',
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);
    try {
      const photoUrl = await ProfileAPI.uploadProfilePhoto(file);
      
      // Update profile with new photo
      const updatedUser = await ProfileAPI.updateProfile({ profile_photo: photoUrl });
      authService.setUser(updatedUser);
      onSave(updatedUser);
      
      toast({
        title: 'Éxito',
        description: 'Foto de perfil actualizada correctamente',
      });
      onClose();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Error al subir la foto de perfil',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Filter out empty values
      const updateData: UserProfileUpdate = {};
      Object.entries(formData).forEach(([key, value]) => {
        if (value !== undefined && value.trim() !== '') {
          updateData[key as keyof UserProfileUpdate] = value;
        }
      });

      const updatedUser = await ProfileAPI.updateProfile(updateData);
      authService.setUser(updatedUser);
      onSave(updatedUser);
      
      toast({
        title: 'Perfil actualizado',
        description: 'Tu información se ha guardado correctamente',
      });
      onClose();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo actualizar el perfil',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getModalContent = () => {
    const getDisplayName = () => {
      if (user.nickname) return user.nickname;
      if (user.first_name && user.last_name) return `${user.first_name} ${user.last_name}`;
      if (user.first_name) return user.first_name;
      return user.email?.split('@')[0] || 'Usuario';
    };

    const getInitials = () => {
      const name = getDisplayName();
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    };

    switch (editField) {
      case 'personal':
        return {
          title: 'Editar Información Personal',
          description: 'Actualiza tu nombre y nombre de usuario',
          icon: <User className="w-5 h-5" />,
          content: (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first_name">Nombre</Label>
                  <Input
                    id="first_name"
                    value={formData.first_name || ''}
                    onChange={(e) => handleInputChange('first_name', e.target.value)}
                    placeholder="Tu nombre"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last_name">Apellido</Label>
                  <Input
                    id="last_name"
                    value={formData.last_name || ''}
                    onChange={(e) => handleInputChange('last_name', e.target.value)}
                    placeholder="Tu apellido"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="nickname">Nombre de Usuario (Opcional)</Label>
                <Input
                  id="nickname"
                  value={formData.nickname || ''}
                  onChange={(e) => handleInputChange('nickname', e.target.value)}
                  placeholder="Cómo te gustaría que te llamen"
                />
              </div>
            </div>
          )
        };

      case 'photo':
        return {
          title: 'Cambiar Foto de Perfil',
          description: 'Sube una nueva imagen para tu perfil',
          icon: <Camera className="w-5 h-5" />,
          content: (
            <div className="space-y-6">
              <div className="flex flex-col items-center space-y-4">
                <Avatar className="w-24 h-24">
                  <AvatarImage src={user.profile_photo} />
                  <AvatarFallback className="text-lg font-semibold">
                    {getInitials()}
                  </AvatarFallback>
                </Avatar>
                <div className="text-center">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                    id="photo-upload"
                    disabled={uploading}
                  />
                  <Label htmlFor="photo-upload" className="cursor-pointer">
                    <Button 
                      type="button" 
                      disabled={uploading}
                      asChild
                    >
                      <span>
                        <Upload className="w-4 h-4 mr-2" />
                        {uploading ? 'Subiendo...' : 'Seleccionar Imagen'}
                      </span>
                    </Button>
                  </Label>
                  <p className="text-xs text-muted-foreground mt-2">
                    Máximo 5MB • JPG, PNG, GIF
                  </p>
                </div>
              </div>
            </div>
          ),
          hideSubmit: true
        };

      case 'description':
        return {
          title: 'Editar Descripción',
          description: 'Cuéntanos algo sobre ti',
          icon: <FileText className="w-5 h-5" />,
          content: (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                  id="description"
                  value={formData.description || ''}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Cuéntanos sobre ti, tus intereses académicos, proyectos..."
                  rows={5}
                />
              </div>
            </div>
          )
        };

      default:
        return null;
    }
  };

  const modalContent = getModalContent();
  if (!modalContent) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {modalContent.icon}
            {modalContent.title}
          </DialogTitle>
          <DialogDescription>
            {modalContent.description}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {modalContent.content}

          {!modalContent.hideSubmit && (
            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                <X className="w-4 h-4 mr-2" />
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                <Save className="w-4 h-4 mr-2" />
                {loading ? 'Guardando...' : 'Guardar'}
              </Button>
            </div>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}