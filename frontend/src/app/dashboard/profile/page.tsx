"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { 
  User as UserIcon, 
  Mail, 
  Building2, 
  IdCard, 
  Calendar,
  Edit,
  Camera,
  FileText,
  UserCircle,
} from "lucide-react"
import { User as UserType } from "@/types"
import { ProfileAPI } from "@/services/profileAPI"
import { ProfileEditModal } from "@/components/ProfileEditModal"

type EditField = 'personal' | 'photo' | 'description' | null

export default function ProfilePage() {
  const [user, setUser] = useState<UserType | null>(null)
  const [loading, setLoading] = useState(true)
  const [editingField, setEditingField] = useState<EditField>(null)

  useEffect(() => {
    loadUserData()
  }, [])

  const loadUserData = async () => {
    try {
      const userData = await ProfileAPI.getCurrentUser()
      setUser(userData)
    } catch (error) {
      console.error('Error loading user data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getDisplayName = () => {
    if (!user) return 'Usuario'
    if (user.nickname) return user.nickname
    if (user.first_name && user.last_name) return `${user.first_name} ${user.last_name}`
    if (user.first_name) return user.first_name
    return user.email?.split('@')[0] || 'Usuario'
  }

  const getInitials = () => {
    const name = getDisplayName()
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  const handleEditComplete = (updatedUser: UserType) => {
    setUser(updatedUser)
    setEditingField(null)
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <div className="text-white">
            <h2 className="text-xl font-semibold mb-2">Cargando...</h2>
            <p className="text-muted-foreground">Obteniendo información del perfil</p>
          </div>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground">
              <UserIcon className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-semibold mb-2">No se pudo cargar el perfil</h3>
              <p>Inténtalo de nuevo más tarde</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
        {/* Header - Mobile optimized */}
        <div className="text-center space-y-1 sm:space-y-2">
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Mi Perfil</h1>
          <p className="text-muted-foreground text-sm sm:text-base px-4 sm:px-0">
            Gestiona tu información personal y configuración de cuenta
          </p>
        </div>

        {/* Profile Overview Card - Mobile optimized */}
        <Card className="bg-gradient-to-r from-purple-500/10 to-cyan-500/10 border-purple-500/20">
          <CardContent className="pt-4 sm:pt-6 px-4 sm:px-6">
            <div className="flex flex-col sm:flex-col md:flex-row items-center gap-4 sm:gap-6">
              <div className="relative group">
                <Avatar className="w-24 h-24 sm:w-32 sm:h-32 border-4 border-purple-500/30">
                  <AvatarImage src={user.profile_photo} />
                  <AvatarFallback className="text-lg sm:text-2xl font-bold">
                    {getInitials()}
                  </AvatarFallback>
                </Avatar>
                <Button
                  size="sm"
                  className="absolute -bottom-1 -right-1 sm:-bottom-2 sm:-right-2 rounded-full w-8 h-8 sm:w-10 sm:h-10 p-0 bg-purple-600 hover:bg-purple-700"
                  onClick={() => setEditingField('photo')}
                >
                  <Camera className="w-3 h-3 sm:w-4 sm:h-4" />
                </Button>
              </div>
              
              <div className="flex-1 text-center md:text-left space-y-2 sm:space-y-3 w-full">
                <div className="space-y-1">
                  <h2 className="text-xl sm:text-2xl font-bold text-white break-words">{getDisplayName()}</h2>
                  <p className="text-base sm:text-lg text-muted-foreground break-words">{user.email}</p>
                </div>
                
                <div className="flex flex-wrap gap-1.5 sm:gap-2 justify-center md:justify-start">
                  <Badge variant="secondary" className="bg-purple-500/20 text-purple-300 text-xs">
                    <Building2 className="w-3 h-3 mr-1" />
                    <span className="hidden sm:inline">{user.university?.name}</span>
                    <span className="sm:hidden">{user.university?.short_name}</span>
                  </Badge>
                  {user.student_id && (
                    <Badge variant="outline" className="border-cyan-500/30 text-cyan-300 text-xs">
                      <IdCard className="w-3 h-3 mr-1" />
                      {user.student_id}
                    </Badge>
                  )}
                  <Badge variant="outline" className="border-green-500/30 text-green-300 text-xs">
                    <Calendar className="w-3 h-3 mr-1" />
                    <span className="hidden sm:inline">Miembro desde</span>
                    <span>{new Date(user.created_at).toLocaleDateString()}</span>
                  </Badge>
                </div>

                {user.description && (
                  <div className="mt-3 sm:mt-4 p-3 sm:p-4 bg-muted/10 rounded-lg border border-muted/20">
                    <p className="text-muted-foreground italic text-sm sm:text-base text-left">{user.description}</p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Profile Sections - Mobile optimized */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Personal Information */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 sm:pb-3">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <UserCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="hidden sm:inline">Información Personal</span>
                <span className="sm:hidden">Personal</span>
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEditingField('personal')}
                className="text-muted-foreground hover:text-foreground p-1 sm:p-2"
              >
                <Edit className="w-3 h-3 sm:w-4 sm:h-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="text-xs sm:text-sm font-medium text-muted-foreground">Nombre</label>
                  <p className="text-sm sm:text-lg break-words">{user.first_name || 'No especificado'}</p>
                </div>
                <div>
                  <label className="text-xs sm:text-sm font-medium text-muted-foreground">Apellido</label>
                  <p className="text-sm sm:text-lg break-words">{user.last_name || 'No especificado'}</p>
                </div>
              </div>
              
              <div>
                <label className="text-xs sm:text-sm font-medium text-muted-foreground">Nombre de Usuario</label>
                <p className="text-sm sm:text-lg break-words">{user.nickname || 'No especificado'}</p>
              </div>
            </CardContent>
          </Card>

          {/* Academic Information */}
          <Card>
            <CardHeader className="pb-2 sm:pb-3">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Building2 className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="hidden sm:inline">Información Académica</span>
                <span className="sm:hidden">Académica</span>
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Información universitaria (solo lectura)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4">
              <div>
                <label className="text-xs sm:text-sm font-medium text-muted-foreground">Universidad</label>
                <p className="text-sm sm:text-lg break-words">{user.university?.name}</p>
                <p className="text-xs sm:text-sm text-muted-foreground">{user.university?.short_name}</p>
              </div>
              
              <div>
                <label className="text-xs sm:text-sm font-medium text-muted-foreground">Código Estudiantil</label>
                <p className="text-sm sm:text-lg">{user.student_id || 'No especificado'}</p>
              </div>

              <div>
                <label className="text-xs sm:text-sm font-medium text-muted-foreground">Correo Electrónico</label>
                <p className="text-sm sm:text-lg flex items-center gap-2 break-all">
                  <Mail className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                  <span className="min-w-0">{user.email}</span>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Description Section - Mobile optimized */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 sm:pb-3">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
              Descripción
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setEditingField('description')}
              className="text-muted-foreground hover:text-foreground p-1 sm:p-2"
            >
              <Edit className="w-3 h-3 sm:w-4 sm:h-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="min-h-[80px] sm:min-h-[100px] p-3 sm:p-4 bg-muted/10 rounded-lg border border-muted/20">
              {user.description ? (
                <p className="text-muted-foreground whitespace-pre-wrap text-sm sm:text-base break-words">{user.description}</p>
              ) : (
                <p className="text-muted-foreground italic text-sm sm:text-base">
                  Agrega una descripción sobre ti, tus intereses académicos o cualquier información que quieras compartir.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

      </div>

      {/* Edit Modal */}
      {editingField && (
        <ProfileEditModal
          user={user}
          editField={editingField}
          isOpen={!!editingField}
          onClose={() => setEditingField(null)}
          onSave={handleEditComplete}
        />
      )}
    </div>
  )
}