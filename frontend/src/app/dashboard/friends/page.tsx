"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { UserPlus, Search, Users, Bell, User, MessageSquare, Check, X, Trash2 } from "lucide-react"
import { friendsAPI } from "@/services/friendsAPI"
import { toast } from "@/hooks/use-toast"
import { FriendProfileModal } from "@/components/FriendProfileModal"
import { comparisonService } from "@/services/comparisonService"
import { useRouter } from "next/navigation"

interface User {
  id: number
  first_name: string
  last_name: string
  nickname?: string
  email: string
  student_id?: string
  profile_photo?: string
  university?: {
    id: number
    name: string
    short_name: string
  }
  friendship_status?: string
  last_login?: string
  stats?: {
    friend_count: number
    schedules_count: number
  }
}

interface FriendRequest {
  id: number
  sender?: User
  receiver?: User
  message?: string
  created_at: string
}

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

  // Load initial data
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
      toast({
        title: "¡Solicitud enviada!",
        description: "Tu solicitud de amistad ha sido enviada"
      })
      
      // Update search results
      setSearchResults(prev => 
        prev.map(user => 
          user.id === userId 
            ? { ...user, friendship_status: 'request_sent' }
            : user
        )
      )
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.detail || "No se pudo enviar la solicitud",
        variant: "destructive"
      })
    }
  }

  const acceptFriendRequest = async (requestId: number) => {
    try {
      await friendsAPI.acceptFriendRequest(requestId)
      toast({
        title: "¡Solicitud aceptada!",
        description: "Ahora son amigos"
      })
      loadFriends()
      loadFriendRequests()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.detail || "No se pudo aceptar la solicitud",
        variant: "destructive"
      })
    }
  }

  const rejectFriendRequest = async (requestId: number) => {
    try {
      await friendsAPI.rejectFriendRequest(requestId)
      toast({
        title: "Solicitud rechazada",
        description: "La solicitud ha sido rechazada"
      })
      loadFriendRequests()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.detail || "No se pudo rechazar la solicitud",
        variant: "destructive"
      })
    }
  }

  const removeFriend = async (friendId: number) => {
    if (!confirm("¿Estás seguro de que quieres eliminar a este amigo?")) {
      return
    }

    try {
      await friendsAPI.removeFriend(friendId)
      toast({
        title: "Amigo eliminado",
        description: "El amigo ha sido eliminado de tu lista"
      })
      loadFriends()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.detail || "No se pudo eliminar el amigo",
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

  const getFriendshipStatusButton = (user: User) => {
    switch (user.friendship_status) {
      case 'friends':
        return (
          <Button size="sm" variant="outline" disabled>
            <Users className="h-4 w-4 mr-2" />
            Amigos
          </Button>
        )
      case 'request_sent':
        return (
          <Button size="sm" variant="outline" disabled>
            <Bell className="h-4 w-4 mr-2" />
            Enviado
          </Button>
        )
      case 'request_received':
        return (
          <Button size="sm" variant="outline" disabled>
            <Bell className="h-4 w-4 mr-2" />
            Pendiente
          </Button>
        )
      default:
        return (
          <Button 
            size="sm" 
            onClick={() => sendFriendRequest(user.id)}
            className="bg-rose-600 hover:bg-rose-700"
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Agregar
          </Button>
        )
    }
  }

  const openProfileModal = (friendId: number) => {
    setSelectedFriendId(friendId)
    setProfileModalOpen(true)
  }

  const closeProfileModal = () => {
    setProfileModalOpen(false)
    setSelectedFriendId(null)
  }

  const handleViewSchedules = async (friendId: number, schedules: any[]) => {
    try {
      // Get friend info
      const friend = friends.find(f => f.id === friendId)
      if (!friend) {
        toast({
          title: "Error",
          description: "No se encontró información del amigo",
          variant: "destructive"
        })
        return
      }

      const friendName = getDisplayName(friend)

      // Fetch detailed schedule data for each schedule
      const detailedSchedules = await Promise.all(
        schedules.map(async (schedule) => {
          try {
            const response = await friendsAPI.getFriendScheduleDetail(friendId, schedule.id)
            return response.data
          } catch (error) {
            console.error('Error fetching schedule detail:', error)
            return null
          }
        })
      )

      const validSchedules = detailedSchedules.filter(schedule => schedule !== null)

      if (validSchedules.length === 0) {
        toast({
          title: "Error",
          description: "No se pudieron cargar los detalles de los horarios",
          variant: "destructive"
        })
        return
      }

      // Create new comparison
      const comparison = comparisonService.createComparison(`Comparación con ${friendName}`)
      
      // Add friend as participant
      const result = await comparisonService.addParticipantByFriend(
        comparison,
        friendId,
        friendName,
        validSchedules
      )

      if (result.success && result.participant) {
        // Add participant to comparison
        comparison.participants.push(result.participant)
        
        // Store comparison in sessionStorage for the collaboration page
        sessionStorage.setItem('active_comparison', JSON.stringify(comparison))
        
        // Navigate to collaboration page
        router.push('/dashboard/collaboration')
        
        toast({
          title: "¡Comparación creada!",
          description: `Comparación iniciada con ${friendName}`
        })
      } else {
        toast({
          title: "Error",
          description: result.error || "No se pudo crear la comparación",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Error creating comparison:', error)
      toast({
        title: "Error",
        description: "Ocurrió un error al crear la comparación",
        variant: "destructive"
      })
    }
  }

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Centro de Amigos</h1>
          <p className="text-muted-foreground mt-2">
            Busca y conecta con tus compañeros de universidad
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 bg-muted/50">
            <TabsTrigger value="friends" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Mis Amigos ({friends.length})
            </TabsTrigger>
            <TabsTrigger value="search" className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              Buscar
            </TabsTrigger>
            <TabsTrigger value="requests" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Solicitudes ({friendRequests.received.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="friends" className="mt-6">
            <Card className="bg-card/70">
              <CardHeader>
                <CardTitle>Mis Amigos</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="w-8 h-8 border-4 border-rose-500 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                ) : friends.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <UserPlus className="h-12 w-12 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No tienes amigos aún</h3>
                    <p>Usa la pestaña "Buscar" para encontrar compañeros</p>
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {friends.map((friend) => (
                      <Card key={friend.id} className="hover:shadow-md transition-shadow bg-card/50">
                        <CardContent className="p-4">
                          <div className="flex items-center space-x-4">
                            <Avatar className="h-12 w-12">
                              <AvatarImage src={friend.profile_photo} />
                              <AvatarFallback>{getInitials(friend)}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">
                                {getDisplayName(friend)}
                              </p>
                              <p className="text-xs text-muted-foreground truncate">
                                {friend.university?.short_name}
                              </p>
                              {friend.student_id && (
                                <p className="text-xs text-muted-foreground">
                                  {friend.student_id}
                                </p>
                              )}
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openProfileModal(friend.id)}
                              >
                                <User className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => removeFriend(friend.id)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="search" className="mt-6">
            <Card className="bg-card/70">
              <CardHeader>
                <CardTitle>Buscar Estudiantes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por nombre, email o código de estudiante..."
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value)
                        searchUsers(e.target.value)
                      }}
                      className="pl-10"
                    />
                  </div>

                  {searchLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="w-8 h-8 border-4 border-rose-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  ) : searchQuery.length < 2 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <Search className="h-12 w-12 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">Buscar Estudiantes</h3>
                      <p>Escribe al menos 2 caracteres para buscar</p>
                    </div>
                  ) : searchResults.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <h3 className="text-lg font-semibold mb-2">No se encontraron usuarios</h3>
                      <p>Intenta con diferentes términos de búsqueda</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {searchResults.map((user) => (
                        <Card key={user.id} className="hover:shadow-md transition-shadow bg-card/50">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-4">
                                <Avatar className="h-10 w-10">
                                  <AvatarImage src={user.profile_photo} />
                                  <AvatarFallback>{getInitials(user)}</AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="text-sm font-medium">
                                    {getDisplayName(user)}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {user.university?.short_name} • {user.student_id}
                                  </p>
                                </div>
                              </div>
                              {getFriendshipStatusButton(user)}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="requests" className="mt-6">
            <div className="space-y-6">
              {/* Received Requests */}
              <Card className="bg-card/70">
                <CardHeader>
                  <CardTitle>Solicitudes Recibidas ({friendRequests.received.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  {friendRequests.received.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Bell className="h-8 w-8 mx-auto mb-2" />
                      <p>No tienes solicitudes pendientes</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {friendRequests.received.map((request) => (
                        <Card key={request.id} className="hover:shadow-md transition-shadow bg-card/50">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-4">
                                <Avatar className="h-10 w-10">
                                  <AvatarImage src={request.sender?.profile_photo} />
                                  <AvatarFallback>
                                    {request.sender ? getInitials(request.sender) : 'U'}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="text-sm font-medium">
                                    {request.sender ? getDisplayName(request.sender) : 'Usuario'}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {request.sender?.university?.short_name}
                                  </p>
                                  {request.message && (
                                    <p className="text-xs text-muted-foreground mt-1">
                                      "{request.message}"
                                    </p>
                                  )}
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => acceptFriendRequest(request.id)}
                                  className="bg-green-600 hover:bg-green-700"
                                >
                                  <Check className="h-4 w-4 mr-2" />
                                  Aceptar
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => rejectFriendRequest(request.id)}
                                >
                                  <X className="h-4 w-4 mr-2" />
                                  Rechazar
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Sent Requests */}
              <Card className="bg-card/70">
                <CardHeader>
                  <CardTitle>Solicitudes Enviadas ({friendRequests.sent.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  {friendRequests.sent.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <MessageSquare className="h-8 w-8 mx-auto mb-2" />
                      <p>No has enviado solicitudes</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {friendRequests.sent.map((request) => (
                        <Card key={request.id} className="hover:shadow-md transition-shadow bg-card/50">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-4">
                                <Avatar className="h-10 w-10">
                                  <AvatarImage src={request.receiver?.profile_photo} />
                                  <AvatarFallback>
                                    {request.receiver ? getInitials(request.receiver) : 'U'}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="text-sm font-medium">
                                    {request.receiver ? getDisplayName(request.receiver) : 'Usuario'}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {request.receiver?.university?.short_name}
                                  </p>
                                </div>
                              </div>
                              <div className="text-sm text-muted-foreground">
                                Pendiente
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Friend Profile Modal */}
      <FriendProfileModal
        friendId={selectedFriendId}
        isOpen={profileModalOpen}
        onClose={closeProfileModal}
        onViewSchedules={handleViewSchedules}
      />
    </div>
  )
}