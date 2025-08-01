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
import { Session } from "@/types"
import html2canvas from 'html2canvas'

// Define the interfaces here since we might not have them in types yet
interface CourseSection {
  course_id: number
  course_code: string
  course_name: string
  section_id: number
  section_number: string
  credits: number
  professor: string
  sessions: Session[]
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
  onShare?: (schedule: FavoriteSchedule) => void
}

export function FavoriteSchedules({
  favorites,
  onRemove,
  onView,
  onEdit,
  onShare
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

  const downloadSchedule = async (favorite: FavoriteSchedule) => {
    // Create a downloadable image of the schedule
    const scheduleData = createScheduleHTML(favorite);
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = scheduleData;
    tempDiv.style.position = 'absolute';
    tempDiv.style.left = '-9999px';
    tempDiv.style.top = '-9999px';
    tempDiv.style.background = 'transparent';
    tempDiv.style.padding = '0';
    tempDiv.style.width = '900px';
    document.body.appendChild(tempDiv);

    try {
      // Use html2canvas to generate image
      const canvas = await html2canvas(tempDiv);

      // Convert canvas to blob and download
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `${favorite.name.replace(/\s+/g, '_')}.png`;
          link.click();
          URL.revokeObjectURL(url);
        }
      }, 'image/png');
    } catch (error) {
      console.error('Failed to generate image, falling back to text:', error);
      // Fallback to text-based download
      createScheduleTextDownload(favorite);
    } finally {
      document.body.removeChild(tempDiv);
    }
  }

  const createScheduleHTML = (favorite: FavoriteSchedule) => {
    return `
      <div style="
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
        padding: 30px; 
        width: 900px; 
        min-height: 600px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        border-radius: 12px;
      ">
        <div style="
          background: white; 
          padding: 30px; 
          border-radius: 8px; 
          box-shadow: 0 4px 15px rgba(0,0,0,0.1);
        ">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="
              color: #2d3748; 
              margin: 0 0 10px 0; 
              font-size: 28px; 
              font-weight: 600;
              text-shadow: 0 2px 4px rgba(0,0,0,0.1);
            ">${favorite.name}</h1>
            <div style="
              display: inline-flex; 
              gap: 30px; 
              background: #f7fafc; 
              padding: 15px 25px; 
              border-radius: 25px;
              border: 2px solid #e2e8f0;
            ">
              <div style="text-align: center;">
                <div style="font-size: 24px; font-weight: bold; color: #667eea;">${favorite.combination.total_credits}</div>
                <div style="font-size: 12px; color: #718096; text-transform: uppercase; letter-spacing: 1px;">Credits</div>
              </div>
              <div style="text-align: center;">
                <div style="font-size: 24px; font-weight: bold; color: #764ba2;">${favorite.combination.courses.length}</div>
                <div style="font-size: 12px; color: #718096; text-transform: uppercase; letter-spacing: 1px;">Courses</div>
              </div>
            </div>
          </div>
          
          <table style="
            width: 100%; 
            border-collapse: collapse; 
            margin-top: 25px;
            background: white;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 10px rgba(0,0,0,0.08);
          ">
            <thead>
              <tr style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
                <th style="padding: 15px 12px; text-align: left; color: white; font-weight: 600; font-size: 14px;">Course</th>
                <th style="padding: 15px 12px; text-align: left; color: white; font-weight: 600; font-size: 14px;">Section</th>
                <th style="padding: 15px 12px; text-align: left; color: white; font-weight: 600; font-size: 14px;">Professor</th>
                <th style="padding: 15px 12px; text-align: left; color: white; font-weight: 600; font-size: 14px;">Credits</th>
                <th style="padding: 15px 12px; text-align: left; color: white; font-weight: 600; font-size: 14px;">Schedule</th>
              </tr>
            </thead>
            <tbody>
              ${favorite.combination.courses.map((course, index) => `
                <tr style="background: ${index % 2 === 0 ? '#ffffff' : '#f8fafc'}; border-bottom: 1px solid #e2e8f0;">
                  <td style="padding: 15px 12px; vertical-align: top;">
                    <div style="font-weight: 600; color: #2d3748; font-size: 14px; margin-bottom: 4px;">${course.course_code}</div>
                    <div style="color: #718096; font-size: 12px; line-height: 1.4;">${course.course_name}</div>
                  </td>
                  <td style="padding: 15px 12px; vertical-align: top;">
                    <div style="
                      background: #e6fffa; 
                      color: #234e52; 
                      padding: 4px 8px; 
                      border-radius: 12px; 
                      font-size: 12px; 
                      font-weight: 600;
                      display: inline-block;
                    ">${course.section_number}</div>
                  </td>
                  <td style="padding: 15px 12px; color: #4a5568; font-size: 13px; vertical-align: top;">${course.professor}</td>
                  <td style="padding: 15px 12px; vertical-align: top;">
                    <div style="
                      background: #fed7d7; 
                      color: #742a2a; 
                      padding: 4px 8px; 
                      border-radius: 12px; 
                      font-size: 12px; 
                      font-weight: 600;
                      display: inline-block;
                    ">${course.credits}</div>
                  </td>
                  <td style="padding: 15px 12px; font-size: 12px; line-height: 1.6; vertical-align: top;">
                    ${course.sessions?.map(session => {
                      const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
                      const dayName = dayNames[session.day_of_week] || 'N/A';
                      return `
                        <div style="
                          margin-bottom: 6px; 
                          padding: 6px 10px; 
                          background: #edf2f7; 
                          border-radius: 6px;
                          color: #4a5568;
                        ">
                          <strong style="color: #2d3748;">${dayName}:</strong> ${session.start_time}-${session.end_time}<br>
                          <span style="color: #718096; font-size: 11px;">📍 ${session.classroom}</span>
                        </div>
                      `;
                    }).join('') || '<span style="color: #a0aec0;">N/A</span>'}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div style="
            margin-top: 30px; 
            text-align: center; 
            padding: 15px;
            background: #f7fafc;
            border-radius: 8px;
            border-left: 4px solid #667eea;
          ">
            <div style="color: #4a5568; font-size: 13px; margin-bottom: 5px;">
              📅 Generated on ${new Date().toLocaleDateString('es-ES', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </div>
            <div style="color: #718096; font-size: 11px;">
              Schedule Maker 2.0 - UTEC
            </div>
          </div>
        </div>
      </div>
    `;
  }

  const createScheduleTextDownload = (favorite: FavoriteSchedule) => {
    // Fallback: create a simple text-based download since we don't have html2canvas
    const scheduleText = `
${favorite.name}
${'='.repeat(favorite.name.length)}

Total Credits: ${favorite.combination.total_credits}
Number of Courses: ${favorite.combination.courses.length}
Created: ${new Date(favorite.created_at).toLocaleDateString()}

COURSES:
${favorite.combination.courses.map((course, index) => `
${index + 1}. ${course.course_code}: ${course.course_name}
   Section: ${course.section_number}
   Professor: ${course.professor}
   Credits: ${course.credits}
   Schedule: ${course.sessions?.map(session => {
     const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
     const dayName = dayNames[session.day_of_week] || 'N/A';
     return `${dayName} ${session.start_time}-${session.end_time} (${session.classroom})`;
   }).join(', ') || 'N/A'}
`).join('')}

Generated on ${new Date().toLocaleDateString()}
    `.trim();

    const blob = new Blob([scheduleText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${favorite.name.replace(/\s+/g, '_')}.txt`;
    link.click();
    URL.revokeObjectURL(url);
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
                {onShare && (
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => onShare(favorite)}
                    className="border-border text-foreground hover:bg-muted"
                    title="Compartir horario para comparación"
                  >
                    <Share2 className="w-3 h-3" />
                  </Button>
                )}
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
