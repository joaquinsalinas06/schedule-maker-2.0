'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CollaborationAPI } from '@/services/collaborationAPI';
import { CreateSessionRequest } from '@/types/collaboration';
import { useCollaborationStore } from '@/stores/collaborationStore';
import { Plus, Users } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export function CreateSessionDialog() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<CreateSessionRequest>({
    name: '',
    description: '',
    max_participants: 10,
    duration_hours: 24,
  });

  const addSession = useCollaborationStore((state) => state.addSession);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast({
        title: "Error",
        description: "El nombre de la sesión es requerido",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const session = await CollaborationAPI.createSession(formData);
      addSession(session);
      
      toast({
        title: "¡Éxito!",
        description: `Sesión "${session.name}" creada con código: ${session.session_code}`,
      });
      
      setOpen(false);
      setFormData({
        name: '',
        description: '',
        max_participants: 10,
        duration_hours: 24,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.detail || "No se pudo crear la sesión",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Crear Sesión
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Crear Sesión Colaborativa</DialogTitle>
          <DialogDescription>
            Crea una nueva sesión para trabajar en horarios junto con compañeros de tu universidad.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Nombre de la Sesión</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="ej., Planificación Horarios Otoño 2024"
                required
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="description">Descripción (Opcional)</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({ ...formData, description: e.target.value })}
                placeholder="¿Para qué es esta sesión?"
                rows={3}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="max_participants">Máximo Participantes</Label>
                <Select
                  value={formData.max_participants?.toString()}
                  onValueChange={(value: string) => setFormData({ ...formData, max_participants: parseInt(value) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[5, 10, 15, 20, 25, 30].map((num) => (
                      <SelectItem key={num} value={num.toString()}>
                        {num} personas
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="duration">Duración (Horas)</Label>
                <Select
                  value={formData.duration_hours?.toString()}
                  onValueChange={(value: string) => setFormData({ ...formData, duration_hours: parseInt(value) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="6">6 horas</SelectItem>
                    <SelectItem value="12">12 horas</SelectItem>
                    <SelectItem value="24">24 horas</SelectItem>
                    <SelectItem value="48">48 horas</SelectItem>
                    <SelectItem value="72">72 horas</SelectItem>
                    <SelectItem value="168">1 semana</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creando...' : 'Crear Sesión'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function JoinSessionDialog() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sessionCode, setSessionCode] = useState('');

  const addSession = useCollaborationStore((state) => state.addSession);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!sessionCode.trim()) {
      toast({
        title: "Error",
        description: "El código de sesión es requerido",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const session = await CollaborationAPI.joinSession({ session_code: sessionCode.trim().toUpperCase() });
      addSession(session);
      
      toast({
        title: "¡Éxito!",
        description: `Te uniste a la sesión "${session.name}"`,
      });
      
      setOpen(false);
      setSessionCode('');
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.detail || "No se pudo unir a la sesión",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Users className="h-4 w-4 mr-2" />
          Unirse a Sesión
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Unirse a Sesión Colaborativa</DialogTitle>
          <DialogDescription>
            Ingresa el código de sesión para unirte a una sesión colaborativa existente.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="sessionCode">Código de Sesión</Label>
              <Input
                id="sessionCode"
                value={sessionCode}
                onChange={(e) => setSessionCode(e.target.value.toUpperCase())}
                placeholder="ej., ABC12345"
                required
                className="font-mono text-center text-lg tracking-wider"
                maxLength={8}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Uniéndose...' : 'Unirse a Sesión'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
