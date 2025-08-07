'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Users,
  Plus,
  Copy,
  Eye,
  EyeOff,
  Palette,
  Trash2,
  BarChart3
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ScheduleComparisonVisualization } from '@/components/ScheduleComparisonVisualization';
import { comparisonService } from '@/services/comparisonService';
import { ScheduleComparison, ComparisonParticipant } from '@/types/comparison';
import { useCollaborationStore } from '@/stores/collaborationStore';


export function IntegratedScheduleComparison() {
  const { toast } = useToast();
  const { activeComparison, setActiveComparison } = useCollaborationStore();
  const [shareCode, setShareCode] = useState('');
  const [participantName, setParticipantName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Initialize comparison on component mount
  useEffect(() => {
    const newComparison = comparisonService.createComparison(`Comparación ${new Date().toLocaleDateString()}`);
    
    // Check for auto-loaded comparison schedule (use sessionStorage to persist across re-mounts)
    const hasLoadedKey = 'comparison_schedule_loaded';
    const hasAlreadyLoaded = sessionStorage.getItem(hasLoadedKey);
    const comparisonSchedule = sessionStorage.getItem('comparison_schedule');
    
    
    if (!hasAlreadyLoaded && comparisonSchedule) {
      try {
        const scheduleData = JSON.parse(comparisonSchedule);
        
        // Create a participant from the friend's schedule
        const participant: ComparisonParticipant = {
          id: `friend_${scheduleData.id}`,
          name: scheduleData.owner,
          color: '#8B5CF6', // Purple color for friend
          isVisible: true,
          schedules: [{
            combination_id: 1,
            sections: [], // Will be populated from courses
            conflicts: [],
            courses: scheduleData.courses || [],
            course_count: scheduleData.courses?.length || 0
          }]
        };
        
        
        // Add the participant to the comparison
        const updatedComparison = {
          ...newComparison,
          participants: [participant]
        };
        
        setActiveComparison(updatedComparison);
        
        // Mark as loaded to prevent re-loading
        sessionStorage.setItem(hasLoadedKey, 'true');
        sessionStorage.removeItem('comparison_schedule');
        
        toast({
          title: '¡Horario cargado!',
          description: `Se ha cargado el horario de ${scheduleData.owner} para comparar`,
        });
      } catch (error) {
        // Error loading comparison schedule
        toast({
          title: 'Error',
          description: 'No se pudo cargar el horario para comparar',
          variant: 'destructive'
        });
      }
    } else {
      setActiveComparison(newComparison);
    }

    // Cleanup function to reset the loaded flag when component unmounts
    return () => {
      // Only clear if we're navigating away from comparison mode
      const urlParams = new URLSearchParams(window.location.search);
      if (!urlParams.get('compcode')) {
        sessionStorage.removeItem('comparison_schedule_loaded');
      }
    };
  }, [toast]);

  const addParticipantByCode = async () => {
    const codeToUse = shareCode.trim();
    const nameToUse = participantName.trim();
    
    if (!codeToUse) {
      setError('Por favor ingresa un código válido');
      return;
    }

    if (!activeComparison) return;

    setLoading(true);
    setError('');

    try {
      const result = await comparisonService.addParticipantByCode(
        activeComparison,
        codeToUse,
        nameToUse || undefined
      );

      if (result.success && result.participant) {
        const updatedComparison = {
          ...activeComparison,
          participants: [...activeComparison.participants, result.participant]
        };

        // Set default selected combination for the new participant
        const updatedWithSelection = comparisonService.setParticipantCombination(
          updatedComparison,
          result.participant.id,
          result.participant.schedules[0]?.combination_id.toString() || ''
        );

        setActiveComparison(updatedWithSelection);
        setShareCode('');
        setParticipantName('');
        
        toast({
          title: 'Participante agregado',
          description: `${result.participant.name} se ha agregado a la comparación`,
        });
      } else {
        setError(result.error || 'Error al agregar participante');
      }
    } catch (err) {
      setError('Error de conexión. Verifica tu conexión a internet.');
    } finally {
      setLoading(false);
    }
  };

  const handleParticipantToggle = (participantId: string) => {
    if (!activeComparison) return;
    
    const updatedComparison = comparisonService.toggleParticipantVisibility(
      activeComparison,
      participantId
    );
    
    setActiveComparison(updatedComparison);
  };

  const handleCombinationChange = (participantId: string, combinationId: string) => {
    if (!activeComparison) return;
    
    const updatedComparison = comparisonService.setParticipantCombination(
      activeComparison,
      participantId,
      combinationId
    );
    
    setActiveComparison(updatedComparison);
  };

  const removeParticipant = (participantId: string) => {
    if (!activeComparison) return;
    
    const updatedComparison = {
      ...activeComparison,
      participants: activeComparison.participants.filter(p => p.id !== participantId),
      selectedCombinations: activeComparison.selectedCombinations.filter(sc => sc.participantId !== participantId),
      updatedAt: new Date().toISOString()
    };
    
    // Recalculate conflicts after removing participant
    const finalComparison = comparisonService.detectConflicts(updatedComparison);
    setActiveComparison(finalComparison);
  };

  const copyCurrentUrl = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast({
        title: 'Link copiado',
        description: 'Link de comparación copiado al portapapeles',
      });
    } catch {
      toast({
        title: 'Error',
        description: 'No se pudo copiar el link al portapapeles',
        variant: 'destructive'
      });
    }
  };

  if (!activeComparison) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-2 border-purple-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p>Cargando comparación...</p>
        </div>
      </div>
    );
  }


  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Comparación de Horarios ({activeComparison.participants.length})
              </CardTitle>
              <CardDescription>
                Compara múltiples horarios con detección automática de conflictos
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {activeComparison.participants.length > 0 && (
                <Button variant="outline" size="sm" onClick={copyCurrentUrl}>
                  <Copy className="h-4 w-4 mr-2" />
                  Compartir
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Add Participant Controls */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Input
                placeholder="Código del horario compartido"
                value={shareCode}
                onChange={(e) => setShareCode(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addParticipantByCode()}
              />
              <Input
                placeholder="Nombre del participante (opcional)"
                value={participantName}
                onChange={(e) => setParticipantName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addParticipantByCode()}
              />
              <Button onClick={addParticipantByCode} disabled={loading}>
                <Plus className="h-4 w-4 mr-2" />
                {loading ? 'Agregando...' : 'Agregar'}
              </Button>
            </div>
            {error && (
              <p className="text-red-500 text-sm">{error}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Participants Management */}
      {activeComparison.participants.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Participantes ({activeComparison.participants.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeComparison.participants.map((participant) => (
                <div key={participant.id} className="flex items-center justify-between p-3 border border-border rounded-lg bg-muted/30">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-4 h-4 rounded"
                      style={{ backgroundColor: participant.color }}
                    />
                    <div>
                      <div className="font-medium text-sm text-foreground">{participant.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {participant.schedules.length} horario{participant.schedules.length !== 1 ? 's' : ''}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleParticipantToggle(participant.id)}
                      className="p-1"
                    >
                      {participant.isVisible ? (
                        <Eye className="w-4 h-4" />
                      ) : (
                        <EyeOff className="w-4 h-4 opacity-50" />
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeParticipant(participant.id)}
                      className="p-1 text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Comparison Visualization */}
      {activeComparison.participants.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <Users className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-semibold mb-2">No hay participantes en la comparación</h3>
              <p>Agrega códigos de horarios compartidos para comenzar la comparación</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <ScheduleComparisonVisualization
          comparison={activeComparison}
          onParticipantToggle={handleParticipantToggle}
          onCombinationChange={handleCombinationChange}
        />
      )}
    </div>
  );
}