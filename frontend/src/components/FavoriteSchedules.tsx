"use client"

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { 
  Heart, 
  Trash2, 
  Edit2, 
  Calendar, 
  BookOpen, 
  Eye,
  Download,
  Share2
} from "lucide-react"

// Define the interfaces here since we might not have them in types yet
interface CourseSection {
  course_id: number
  course_code: string
  course_name: string
  section_id: number
  section_number: string
  credits: number
  professor: string
  sessions: any[]
}

interface ScheduleCombination {
  combination_id: string
  total_credits: number
  course_count: number
  courses: CourseSection[]
}

interface FavoriteSchedule {
  id: string
  name: string
  combination: ScheduleCombination
  created_at: string
  notes?: string
}

interface FavoriteSchedulesProps {
  favorites: FavoriteSchedule[]
  onRemove: (id: string) => void
  onView: (schedule: ScheduleCombination) => void
  onEdit: (id: string, name: string, notes?: string) => void
}

export function FavoriteSchedules({
  favorites,
  onRemove,
  onView,
  onEdit
}: FavoriteSchedulesProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editNotes, setEditNotes] = useState('')

  const startEdit = (favorite: FavoriteSchedule) => {
    setEditingId(favorite.id)
    setEditName(favorite.name)
    setEditNotes(favorite.notes || '')
  }

  const saveEdit = () => {
    if (editingId) {
      onEdit(editingId, editName, editNotes)
      setEditingId(null)
      setEditName('')
      setEditNotes('')
    }
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditName('')
    setEditNotes('')
  }

  const downloadSchedule = (favorite: FavoriteSchedule) => {
    // This would create a downloadable version of the schedule
    const data = JSON.stringify(favorite, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${favorite.name.replace(/\s+/g, '_')}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  const shareSchedule = async (favorite: FavoriteSchedule) => {
    try {
      // Create a share record on the backend
      const response = await fetch('http://localhost:8001/collaboration/shares', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          schedule_data: favorite.combination,
          title: favorite.name,
          description: favorite.notes || `Horario compartido: ${favorite.name}`,
          is_public: true
        })
      });

      if (response.ok) {
        const shareData = await response.json();
        const shareCode = shareData.share_code;
        const shareUrl = `${window.location.origin}/compare?code=${shareCode}`;
        
        // Copy to clipboard
        await navigator.clipboard.writeText(shareUrl);
        
        alert(`¡Horario compartido! 
        
Código de comparación: ${shareCode}
Link copiado al portapapeles: ${shareUrl}

Comparte este código o link con otros estudiantes para comparar horarios.`);
      } else {
        throw new Error('Failed to create share');
      }
    } catch (error) {
      console.error('Error sharing schedule:', error);
      
      // Fallback: create a simple share code from the favorite ID
      const shareCode = `FAV_${favorite.id.slice(-8).toUpperCase()}`;
      const shareUrl = `${window.location.origin}/compare?code=${shareCode}`;
      
      try {
        await navigator.clipboard.writeText(shareUrl);
        alert(`Código de comparación: ${shareCode}
Link copiado al portapapeles: ${shareUrl}

Comparte este código con otros estudiantes para comparar horarios.`);
      } catch (clipError) {
        alert(`Código de comparación: ${shareCode}
Link: ${shareUrl}

Copia este código o link para compartir con otros estudiantes.`);
      }
    }
  }

  if (favorites.length === 0) {
    return (
      <Card className="bg-card/80 backdrop-blur-sm border-border shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Heart className="w-5 h-5 text-pink-500" />
            Mis Horarios Favoritos
          </CardTitle>
          <CardDescription>
            Guarda tus horarios favoritos para acceder rápidamente
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <Heart className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p>No tienes horarios favoritos guardados.</p>
            <p className="text-sm mt-2">
              Ve a &quot;Generar Horarios&quot; y marca algunos como favoritos para verlos aquí.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card className="bg-card/80 backdrop-blur-sm border-border shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Heart className="w-5 h-5 text-pink-500" />
            Mis Horarios Favoritos
          </CardTitle>
          <CardDescription>
            {favorites.length} horario{favorites.length !== 1 ? 's' : ''} guardado{favorites.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {favorites.map((favorite) => (
          <Card key={favorite.id} className="bg-card/80 backdrop-blur-sm border-border shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="pb-3">
              {editingId === favorite.id ? (
                <div className="space-y-3">
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Nombre del horario"
                    className="font-semibold"
                  />
                  <Input
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    placeholder="Notas (opcional)"
                    className="text-sm"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={saveEdit}>
                      Guardar
                    </Button>
                    <Button size="sm" variant="outline" onClick={cancelEdit}>
                      Cancelar
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg text-foreground line-clamp-2">
                      {favorite.name}
                    </CardTitle>
                    <div className="flex gap-1 ml-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => startEdit(favorite)}
                        className="h-8 w-8 p-0"
                      >
                        <Edit2 className="w-3 h-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onRemove(favorite.id)}
                        className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                  
                  {favorite.notes && (
                    <CardDescription className="text-sm line-clamp-2">
                      {favorite.notes}
                    </CardDescription>
                  )}
                </>
              )}
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Schedule Stats */}
              <div className="flex gap-4 text-sm">
                <div className="flex items-center gap-1">
                  <BookOpen className="w-4 h-4 text-indigo-500" />
                  <span>{favorite.combination.courses.length} cursos</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4 text-purple-500" />
                  <span>{favorite.combination.total_credits} créditos</span>
                </div>
              </div>

              {/* Course List */}
              <div className="space-y-2">
                <div className="text-sm font-medium text-foreground">Cursos:</div>
                <div className="space-y-1">
                  {favorite.combination.courses.slice(0, 3).map((course, index) => (
                    <div key={index} className="text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">{course.course_code}:</span> {course.course_name}
                    </div>
                  ))}
                  {favorite.combination.courses.length > 3 && (
                    <div className="text-xs text-muted-foreground">
                      +{favorite.combination.courses.length - 3} cursos más
                    </div>
                  )}
                </div>
              </div>

              {/* Created Date */}
              <div className="text-xs text-muted-foreground">
                Guardado: {new Date(favorite.created_at).toLocaleDateString()}
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <Button 
                  size="sm" 
                  onClick={() => onView(favorite.combination)}
                  className="flex-1 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white"
                >
                  <Eye className="w-3 h-3 mr-1" />
                  Ver
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => shareSchedule(favorite)}
                  className="border-border text-foreground hover:bg-muted"
                  title="Compartir horario para comparación"
                >
                  <Share2 className="w-3 h-3" />
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => downloadSchedule(favorite)}
                  className="border-border text-foreground hover:bg-muted"
                >
                  <Download className="w-3 h-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
