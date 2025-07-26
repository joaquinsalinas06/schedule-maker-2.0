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
import { CollaborationAPI, CreateSessionRequest } from '@/services/collaborationAPI';
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
        description: "Session name is required",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const session = await CollaborationAPI.createSession(formData);
      addSession(session);
      
      toast({
        title: "Success",
        description: `Session "${session.name}" created with code: ${session.session_code}`,
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
        description: error.response?.data?.detail || "Failed to create session",
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
          Create Session
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create Collaborative Session</DialogTitle>
          <DialogDescription>
            Create a new session to work on schedules together with classmates from your university.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Session Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Fall 2024 Schedule Planning"
                required
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({ ...formData, description: e.target.value })}
                placeholder="What is this session for?"
                rows={3}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="max_participants">Max Participants</Label>
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
                        {num} people
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="duration">Duration (Hours)</Label>
                <Select
                  value={formData.duration_hours?.toString()}
                  onValueChange={(value: string) => setFormData({ ...formData, duration_hours: parseInt(value) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="6">6 hours</SelectItem>
                    <SelectItem value="12">12 hours</SelectItem>
                    <SelectItem value="24">24 hours</SelectItem>
                    <SelectItem value="48">48 hours</SelectItem>
                    <SelectItem value="72">72 hours</SelectItem>
                    <SelectItem value="168">1 week</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Session'}
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
        description: "Session code is required",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const session = await CollaborationAPI.joinSession({ session_code: sessionCode.trim().toUpperCase() });
      addSession(session);
      
      toast({
        title: "Success",
        description: `Joined session "${session.name}"`,
      });
      
      setOpen(false);
      setSessionCode('');
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.detail || "Failed to join session",
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
          Join Session
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Join Collaborative Session</DialogTitle>
          <DialogDescription>
            Enter the session code to join an existing collaborative session.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="sessionCode">Session Code</Label>
              <Input
                id="sessionCode"
                value={sessionCode}
                onChange={(e) => setSessionCode(e.target.value.toUpperCase())}
                placeholder="e.g., ABC12345"
                required
                className="font-mono text-center text-lg tracking-wider"
                maxLength={8}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Joining...' : 'Join Session'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
