"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
  LogIn,
} from "lucide-react"
import { ProfileSkeleton } from "@/components/ui/loading-skeletons"
import { useAuth } from "@/features/auth"
import { useProfile, ProfileEditModal } from "@/features/profile"

type EditField = 'personal' | 'photo' | 'description' | null

export default function ProfilePage() {
  const router = useRouter()
  const { isAnonymous, loading: authLoading } = useAuth()
  const { profile, loading, email, updateProfile, uploadAvatar } = useProfile()
  const [editingField, setEditingField] = useState<EditField>(null)

  const getDisplayName = () => {
    if (!profile) return 'Usuario'
    if (profile.nickname) return profile.nickname
    if (profile.first_name && profile.last_name) return `${profile.first_name} ${profile.last_name}`
    if (profile.first_name) return profile.first_name
    return email?.split('@')[0] || 'Usuario'
  }

  const getInitials = () => {
    const name = getDisplayName()
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  if (loading || authLoading) {
    return <ProfileSkeleton />
  }

  // Anonymous users have no profiles row (nothing was ever registered), so
  // getProfile() fails and profile stays null — show an upgrade prompt
  // instead of the generic "couldn't load" error below.
  if (isAnonymous) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center text-muted-foreground max-w-sm">
          <UserIcon className="h-12 w-12 mx-auto mb-4 opacity-40" />
          <h3 className="text-lg font-medium text-foreground mb-1">Inicia sesion para ver tu perfil</h3>
          <p className="text-sm mb-4">
            Crea una cuenta o inicia sesion para guardar tu informacion personal
          </p>
          <Button onClick={() => router.push('/auth')} className="gap-2">
            <LogIn className="w-4 h-4" />
            Iniciar sesion
          </Button>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center text-muted-foreground max-w-sm">
          <UserIcon className="h-12 w-12 mx-auto mb-4 opacity-40" />
          <h3 className="text-lg font-medium mb-2">No se pudo cargar el perfil</h3>
          <p className="text-sm">Intentalo de nuevo mas tarde</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Mi Perfil</h1>
          <p className="text-muted-foreground mt-1">
            Gestiona tu informacion personal
          </p>
        </div>

        {/* Profile Overview */}
        <Card className="border-border/50">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="relative group">
                <Avatar className="w-24 h-24 border-2 border-border">
                  <AvatarImage src={profile.profile_photo || undefined} />
                  <AvatarFallback className="text-xl font-medium bg-muted">
                    {getInitials()}
                  </AvatarFallback>
                </Avatar>
                <Button
                  size="icon"
                  variant="secondary"
                  className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full shadow-sm"
                  onClick={() => setEditingField('photo')}
                >
                  <Camera className="w-3.5 h-3.5" />
                </Button>
              </div>

              <div className="flex-1 text-center sm:text-left space-y-3">
                <div>
                  <h2 className="text-xl font-semibold">{getDisplayName()}</h2>
                  <p className="text-muted-foreground">{email}</p>
                </div>

                <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                  {profile.university && (
                    <Badge variant="secondary" className="text-xs font-normal">
                      <Building2 className="w-3 h-3 mr-1.5" />
                      {profile.university.short_name || profile.university.name}
                    </Badge>
                  )}
                  {profile.student_id && (
                    <Badge variant="outline" className="text-xs font-normal">
                      <IdCard className="w-3 h-3 mr-1.5" />
                      {profile.student_id}
                    </Badge>
                  )}
                  <Badge variant="outline" className="text-xs font-normal">
                    <Calendar className="w-3 h-3 mr-1.5" />
                    {new Date(profile.created_at).toLocaleDateString('es-PE', { year: 'numeric', month: 'short' })}
                  </Badge>
                </div>

                {profile.description && (
                  <p className="text-sm text-muted-foreground italic border-l-2 border-border pl-3 mt-4">
                    {profile.description}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Personal Information */}
          <Card className="border-border/50">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base font-medium">Informacion Personal</CardTitle>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground"
                onClick={() => setEditingField('personal')}
              >
                <Edit className="w-4 h-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wide">Nombre</label>
                  <p className="mt-1 font-medium">{profile.first_name || '-'}</p>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wide">Apellido</label>
                  <p className="mt-1 font-medium">{profile.last_name || '-'}</p>
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wide">Usuario</label>
                <p className="mt-1 font-medium">{profile.nickname || '-'}</p>
              </div>
            </CardContent>
          </Card>

          {/* Academic Information */}
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium">Informacion Academica</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wide">Universidad</label>
                <p className="mt-1 font-medium">{profile.university?.name || '-'}</p>
              </div>
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wide">Codigo</label>
                <p className="mt-1 font-medium">{profile.student_id || '-'}</p>
              </div>
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wide">Email</label>
                <p className="mt-1 font-medium flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                  {email}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Description */}
        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Descripcion
            </CardTitle>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground"
              onClick={() => setEditingField('description')}
            >
              <Edit className="w-4 h-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="min-h-[100px] p-4 bg-muted/30 rounded-lg border border-border/50">
              {profile.description ? (
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{profile.description}</p>
              ) : (
                <p className="text-sm text-muted-foreground/60 italic">
                  Agrega una descripcion sobre ti, tus intereses academicos o cualquier informacion que quieras compartir.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Edit Modal */}
      {editingField && (
        <ProfileEditModal
          profile={profile}
          editField={editingField}
          isOpen={!!editingField}
          onClose={() => setEditingField(null)}
          onUpdate={updateProfile}
          onUploadAvatar={uploadAvatar}
        />
      )}
    </div>
  )
}
