"use client"

import React, { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { 
  Star, 
  Trash2, 
  Edit2, 
  Calendar, 
  Eye,
  Download,
  Share2,
  X,
  Check,
  MoreHorizontal,
} from "lucide-react"
import { FavoriteSchedule } from "@/types"
import html2canvas from 'html2canvas'

interface FavoriteSchedulesProps {
  favorites: FavoriteSchedule[]
  onRemove: (id: string) => void
  onView: (schedule: FavoriteSchedule) => void
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
  const [menuOpen, setMenuOpen] = useState<string | null>(null)

  const startEdit = (favorite: FavoriteSchedule) => {
    setEditingId(favorite.id)
    setEditName(favorite.name)
    setEditNotes(favorite.notes || '')
    setMenuOpen(null)
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
    setMenuOpen(null)
    const scheduleData = createScheduleHTML(favorite)
    const tempDiv = document.createElement('div')
    tempDiv.innerHTML = scheduleData
    tempDiv.style.position = 'absolute'
    tempDiv.style.left = '-9999px'
    tempDiv.style.top = '-9999px'
    tempDiv.style.background = 'transparent'
    tempDiv.style.padding = '0'
    tempDiv.style.width = '900px'
    document.body.appendChild(tempDiv)

    try {
      const canvas = await html2canvas(tempDiv)
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob)
          const link = document.createElement('a')
          link.href = url
          link.download = `${favorite.name.replace(/\s+/g, '_')}.png`
          link.click()
          URL.revokeObjectURL(url)
        }
      }, 'image/png')
    } catch {
      createScheduleTextDownload(favorite)
    } finally {
      document.body.removeChild(tempDiv)
    }
  }

  const createScheduleHTML = (favorite: FavoriteSchedule) => {
    return `
      <div style="font-family: system-ui, -apple-system, sans-serif; background: #ffffff; padding: 24px; width: 900px;">
        <div style="margin-bottom: 24px;">
          <h1 style="color: #0a0a0a; margin: 0 0 8px 0; font-size: 24px; font-weight: 600;">${favorite.name}</h1>
          <p style="color: #737373; font-size: 14px; margin: 0;">${favorite.combination.courses?.length || 0} cursos</p>
        </div>
        <table style="width: 100%; border-collapse: collapse; border: 1px solid #e5e5e5;">
          <thead>
            <tr style="background: #fafafa;">
              <th style="padding: 12px; text-align: left; border-bottom: 1px solid #e5e5e5; font-weight: 500; font-size: 13px; color: #737373;">Curso</th>
              <th style="padding: 12px; text-align: left; border-bottom: 1px solid #e5e5e5; font-weight: 500; font-size: 13px; color: #737373;">Seccion</th>
              <th style="padding: 12px; text-align: left; border-bottom: 1px solid #e5e5e5; font-weight: 500; font-size: 13px; color: #737373;">Profesor</th>
              <th style="padding: 12px; text-align: left; border-bottom: 1px solid #e5e5e5; font-weight: 500; font-size: 13px; color: #737373;">Horario</th>
            </tr>
          </thead>
          <tbody>
            ${(favorite.combination.courses || []).map((course) => `
              <tr style="border-bottom: 1px solid #e5e5e5;">
                <td style="padding: 12px;">
                  <div style="font-weight: 500; color: #0a0a0a; font-size: 14px;">${course.course_code}</div>
                  <div style="color: #737373; font-size: 13px;">${course.course_name}</div>
                </td>
                <td style="padding: 12px; color: #0a0a0a; font-size: 14px;">${course.section_number}</td>
                <td style="padding: 12px; color: #0a0a0a; font-size: 14px;">${course.professor}</td>
                <td style="padding: 12px; font-size: 13px;">
                  ${course.sessions?.map(session => {
                    const dayNames = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab']
                    const dayName = dayNames[session.day_of_week] || 'N/A'
                    return `<div style="color: #0a0a0a;">${dayName} ${session.start_time}-${session.end_time}</div>`
                  }).join('') || '<span style="color: #a3a3a3;">N/A</span>'}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #e5e5e5; color: #a3a3a3; font-size: 12px;">
          Schedule Maker - ${new Date().toLocaleDateString('es-ES')}
        </div>
      </div>
    `
  }

  const createScheduleTextDownload = (favorite: FavoriteSchedule) => {
    const scheduleText = `
${favorite.name}
${'='.repeat(favorite.name.length)}

Total Cursos: ${favorite.combination.courses?.length || 0}
Creado: ${new Date(favorite.created_at).toLocaleDateString()}

CURSOS:
${(favorite.combination.courses || []).map((course, index) => `
${index + 1}. ${course.course_code}: ${course.course_name}
   Seccion: ${course.section_number}
   Profesor: ${course.professor}
`).join('')}
    `.trim()

    const blob = new Blob([scheduleText], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${favorite.name.replace(/\s+/g, '_')}.txt`
    link.click()
    URL.revokeObjectURL(url)
  }

  if (favorites.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
          <Star className="w-5 h-5 text-muted-foreground" />
        </div>
        <h3 className="font-semibold text-foreground mb-1">Sin horarios guardados</h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          Genera horarios y guardalos como favoritos para acceder a ellos rapidamente.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {favorites.map((favorite) => (
        <div 
          key={favorite.id} 
          className="group rounded-lg border border-border bg-card p-4 hover:border-primary/30 transition-colors"
        >
          {editingId === favorite.id ? (
            <div className="space-y-3">
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Nombre del horario"
                className="h-9"
                autoFocus
              />
              <Input
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                placeholder="Notas (opcional)"
                className="h-9"
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={saveEdit} className="h-8 gap-1.5">
                  <Check className="w-3.5 h-3.5" />
                  Guardar
                </Button>
                <Button size="sm" variant="outline" onClick={cancelEdit} className="h-8 gap-1.5">
                  <X className="w-3.5 h-3.5" />
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-medium text-foreground truncate">{favorite.name}</h3>
                  <span className="text-xs text-muted-foreground">
                    {favorite.combination.courses?.length || 0} cursos
                  </span>
                </div>
                
                {favorite.notes && (
                  <p className="text-sm text-muted-foreground mb-2 line-clamp-1">{favorite.notes}</p>
                )}
                
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {(favorite.combination.courses || []).slice(0, 4).map((course, index) => (
                    <span 
                      key={index} 
                      className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-secondary text-secondary-foreground"
                    >
                      {course.course_code}
                    </span>
                  ))}
                  {(favorite.combination.courses?.length || 0) > 4 && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-secondary text-muted-foreground">
                      +{(favorite.combination.courses?.length || 0) - 4}
                    </span>
                  )}
                </div>
                
                <div className="flex items-center gap-2">
                  <Button size="sm" onClick={() => onView(favorite)} className="h-8 gap-1.5">
                    <Eye className="w-3.5 h-3.5" />
                    Ver horario
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => downloadSchedule(favorite)}
                    className="h-8 gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Descargar
                  </Button>
                  {onShare && (
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => onShare(favorite)}
                      className="h-8 gap-1.5"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      Compartir
                    </Button>
                  )}
                </div>
              </div>
              
              <div className="relative">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  onClick={() => setMenuOpen(menuOpen === favorite.id ? null : favorite.id)}
                >
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
                
                {menuOpen === favorite.id && (
                  <>
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setMenuOpen(null)}
                    />
                    <div className="absolute right-0 top-full mt-1 z-50 w-36 rounded-md border border-border bg-popover shadow-md py-1 animate-scale-in">
                      <button
                        className="w-full px-3 py-1.5 text-sm text-left hover:bg-accent flex items-center gap-2"
                        onClick={() => startEdit(favorite)}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        Editar
                      </button>
                      <button
                        className="w-full px-3 py-1.5 text-sm text-left hover:bg-destructive/10 text-destructive flex items-center gap-2"
                        onClick={() => {
                          setMenuOpen(null)
                          onRemove(favorite.id)
                        }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Eliminar
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
