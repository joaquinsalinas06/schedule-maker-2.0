"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { UserPlus, Search, Users, Bell, User as UserIcon, Check, X, Trash2, Loader2 } from "lucide-react"
import { friendsAPI } from "@/services/friendsAPI"
import { toast } from "@/hooks/use-toast"
import { FriendProfileModal } from "@/components/FriendProfileModal"
import { comparisonService } from "@/services/comparisonService"
import { useRouter } from "next/navigation"
import { User, FriendRequest } from "@/types/user"

export default function FriendsPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('friends')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<User[]>([])
  const [friends, setFriends] = useState<User[]>([])
  const [friendRequests, setFriendRequests] = useState<{
    received: FriendRequest[]
    sent: FriendRequest[]
  }>({ received: [], sent: [] })
  const [loading, setLoading] = useState(false)
  const [searchLoading, setSearchLoading] = useState(false)
  const [profileModalOpen, setProfileModalOpen] = useState(false)
  const [selectedFriendId, setSelectedFriendId] = useState<number | null>(null)

  useEffect(() => {
    loadFriends()
    loadFriendRequests()
  }, [])

  const loadFriends = async () => {
    try {
      setLoading(true)
      const response = await friendsAPI.getFriendsList()
      setFriends(response.data)
    } catch (error) {
      console.error('Error loading friends:', error)
      toast({
        title: "Error",
        description: "No se pudieron cargar los amigos",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const loadFriendRequests = async () => {
    try {
      const response = await friendsAPI.getFriendRequests()
      setFriendRequests(response.data)
    } catch (error) {
      console.error("Error loading friend requests:", error)
    }
  }

  const searchUsers = async (query: string) => {
    if (query.length < 2) {
      setSearchResults([])
      return
    }
    try {
      setSearchLoading(true)
      const response = await friendsAPI.searchUsers(query)
      setSearchResults(response.data)
    } catch (error) {
      console.error("Error searching users:", error)
    } finally {
      setSearchLoading(false)
    }
  }

  const sendFriendRequest = async (userId: number) => {
    try {
      await friendsAPI.sendFriendRequest(userId)
      toast({ title: "Solicitud enviada", description: "Tu solicitud de amistad ha sido enviada" })
      setSearchResults(prev => prev.map(user => user.id === userId ? { ...user, friendship_status: 'request_sent' } : user))
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail || "No se pudo enviar la solicitud",
        variant: "destructive"
      })
    }
  }

  const acceptFriendRequest = async (requestId: number) => {
    try {
      await friendsAPI.acceptFriendRequest(requestId)
      toast({ title: "Solicitud aceptada", description: "Ahora son amigos" })
      loadFriends()
      loadFriendRequests()
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail || "No se pudo aceptar la solicitud",
        variant: "destructive"
      })
    }
  }

  const rejectFriendRequest = async (requestId: number) => {
    try {
      await friendsAPI.rejectFriendRequest(requestId)
      toast({ title: "Solicitud rechazada" })
      loadFriendRequests()
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail || "No se pudo rechazar la solicitud",
        variant: "destructive"
      })
    }
  }

  const removeFriend = async (friendId: number) => {
    if (!confirm("Estas seguro de que quieres eliminar a este amigo?")) return
    try {
      await friendsAPI.removeFriend(friendId)
      toast({ title: "Amigo eliminado" })
      loadFriends()
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail || "No se pudo eliminar el amigo",
        variant: "destructive"
      })
    }
  }

  const getDisplayName = (user: User) => {
    if (user.nickname) return user.nickname
    if (user.first_name && user.last_name) return `${user.first_name} ${user.last_name}`
    if (user.first_name) return user.first_name
    return user.email.split('@')[0]
  }

  const getInitials = (user: User) => {
    const name = getDisplayName(user)
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  const handleViewSchedules = async (friendId: number, schedules: { id: number; name: string; description?: string; created_at: string; is_favorite: boolean }[]) => {
    try {
      const friend = friends.find(f => f.id === friendId)
      if (!friend) return
      
      const friendName = getDisplayName(friend)
      const detailedSchedules = await Promise.all(
        schedules.map(async (schedule) => {
          try {
            const response = await friendsAPI.getFriendScheduleDetail(friendId, schedule.id)
            return response.data
          } catch { return null }
        })
      )
      
      const validSchedules = detailedSchedules.filter((schedule: any) => schedule !== null)
      if (validSchedules.length === 0) {
        toast({ title: "Error", description: "No se pudieron cargar los horarios", variant: "destructive" })
        return
      }
      
      const comparison = comparisonService.createComparison(`Comparacion con ${friendName}`)
      const result = await comparisonService.addParticipantByFriend(comparison, friendId, friendName, validSchedules)
      
      if (result.success && result.participant) {
        comparison.participants.push(result.participant)
        sessionStorage.setItem('active_comparison', JSON.stringify(comparison))
        router.push('/dashboard/collaboration')
        toast({ title: "Comparacion creada", description: `Comparacion iniciada con ${friendName}` })
      }
    } catch (error) {
      console.error('Error creating comparison:', error)
      toast({ title: "Error", description: "Ocurrio un error al crear la comparacion", variant: "destructive" })
    }
  }

  const tabs = [
    { id: 'friends', label: 'Amigos', icon: Users, count: friends.length },
    { id: 'search', label: 'Buscar', icon: Search },
    { id: 'requests', label: 'Solicitudes', icon: Bell, count: friendRequests.received.length },
  ]

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <header className="px-6 py-4 border-b border-border bg-background/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Amigos</h1>
            <p className="text-sm text-muted-foreground">Conecta con tus companeros</p>
          </div>
        </div>

        {/* Tabs */}
        <nav className="flex gap-1 mt-4 -mb-4">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'text-foreground border-primary bg-background'
                    : 'text-muted-foreground border-transparent hover:text-foreground hover:bg-muted/50'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
                {tab.count !== undefined && (
                  <span className="text-xs px-1.5 py-0.5 rounded-full bg-secondary">
                    {tab.count}
                  </span>
                )}
              </button>
            )
          })}
        </nav>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl">
          {/* Friends Tab */}
          {activeTab === 'friends' && (
            <div className="space-y-3">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : friends.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
                    <Users className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-1">Sin amigos aun</h3>
                  <p className="text-sm text-muted-foreground">
                    Busca companeros en la pestana "Buscar"
                  </p>
                </div>
              ) : (
                friends.map((friend) => (
                  <div key={friend.id} className="flex items-center justify-between p-4 rounded-lg border border-border bg-card hover:border-primary/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={friend.profile_photo} />
                        <AvatarFallback className="text-sm">{getInitials(friend)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-foreground">{getDisplayName(friend)}</p>
                        <p className="text-xs text-muted-foreground">{friend.university?.short_name}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="icon" variant="ghost" onClick={() => { setSelectedFriendId(friend.id); setProfileModalOpen(true) }} className="h-8 w-8">
                        <UserIcon className="w-4 h-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => removeFriend(friend.id)} className="h-8 w-8 text-muted-foreground hover:text-destructive">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Search Tab */}
          {activeTab === 'search' && (
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre, email o codigo..."
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); searchUsers(e.target.value) }}
                  className="pl-10 h-10"
                />
              </div>

              {searchLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : searchQuery.length < 2 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
                    <Search className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Escribe al menos 2 caracteres para buscar
                  </p>
                </div>
              ) : searchResults.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <p className="text-sm text-muted-foreground">No se encontraron usuarios</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {searchResults.map((user) => (
                    <div key={user.id} className="flex items-center justify-between p-4 rounded-lg border border-border bg-card">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={user.profile_photo} />
                          <AvatarFallback className="text-sm">{getInitials(user)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-foreground">{getDisplayName(user)}</p>
                          <p className="text-xs text-muted-foreground">{user.university?.short_name}</p>
                        </div>
                      </div>
                      {user.friendship_status === 'friends' ? (
                        <span className="text-xs text-muted-foreground">Amigos</span>
                      ) : user.friendship_status === 'request_sent' ? (
                        <span className="text-xs text-muted-foreground">Enviado</span>
                      ) : user.friendship_status === 'request_received' ? (
                        <span className="text-xs text-muted-foreground">Pendiente</span>
                      ) : (
                        <Button size="sm" onClick={() => sendFriendRequest(user.id)} className="h-8 gap-1.5">
                          <UserPlus className="w-3.5 h-3.5" />
                          Agregar
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Requests Tab */}
          {activeTab === 'requests' && (
            <div className="space-y-6">
              {/* Received */}
              <div>
                <h3 className="text-sm font-medium text-foreground mb-3">
                  Recibidas ({friendRequests.received.length})
                </h3>
                {friendRequests.received.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">Sin solicitudes pendientes</p>
                ) : (
                  <div className="space-y-2">
                    {friendRequests.received.map((request) => (
                      <div key={request.id} className="flex items-center justify-between p-4 rounded-lg border border-border bg-card">
                        <div className="flex items-center gap-3">
                          <Avatar className="w-10 h-10">
                            <AvatarImage src={request.sender?.profile_photo} />
                            <AvatarFallback className="text-sm">
                              {request.sender ? getInitials(request.sender) : 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-foreground">
                              {request.sender ? getDisplayName(request.sender) : 'Usuario'}
                            </p>
                            <p className="text-xs text-muted-foreground">{request.sender?.university?.short_name}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button size="sm" onClick={() => acceptFriendRequest(request.id)} className="h-8 gap-1.5 bg-success hover:bg-success/90">
                            <Check className="w-3.5 h-3.5" />
                            Aceptar
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => rejectFriendRequest(request.id)} className="h-8">
                            <X className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Sent */}
              <div>
                <h3 className="text-sm font-medium text-foreground mb-3">
                  Enviadas ({friendRequests.sent.length})
                </h3>
                {friendRequests.sent.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">No has enviado solicitudes</p>
                ) : (
                  <div className="space-y-2">
                    {friendRequests.sent.map((request) => (
                      <div key={request.id} className="flex items-center justify-between p-4 rounded-lg border border-border bg-card">
                        <div className="flex items-center gap-3">
                          <Avatar className="w-10 h-10">
                            <AvatarImage src={request.receiver?.profile_photo} />
                            <AvatarFallback className="text-sm">
                              {request.receiver ? getInitials(request.receiver) : 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-foreground">
                              {request.receiver ? getDisplayName(request.receiver) : 'Usuario'}
                            </p>
                            <p className="text-xs text-muted-foreground">{request.receiver?.university?.short_name}</p>
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground">Pendiente</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <FriendProfileModal
        friendId={selectedFriendId}
        isOpen={profileModalOpen}
        onClose={() => { setProfileModalOpen(false); setSelectedFriendId(null) }}
        onViewSchedules={handleViewSchedules}
      />
    </div>
  )
}
