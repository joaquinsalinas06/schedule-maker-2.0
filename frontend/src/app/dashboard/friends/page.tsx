"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { UserPlus, Search, Users, Bell, User as UserIcon, MessageSquare, Check, X, Trash2 } from "lucide-react"
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
      toast({
        title: "¡Solicitud aceptada!",
        description: "Ahora son amigos"
      })
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
      toast({
        title: "Solicitud rechazada",
        description: "La solicitud ha sido rechazada"
      })
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

  const getFriendshipStatusButton = (user: User) => {
    switch (user.friendship_status) {
      case 'friends':
        return (
          <Button size="sm" variant="outline" disabled className="text-xs sm:text-sm px-2 sm:px-3">
            <Users className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
            <span className="hidden sm:inline">Amigos</span>
          </Button>
        )
      case 'request_sent':
        return (
          <Button size="sm" variant="outline" disabled className="text-xs sm:text-sm px-2 sm:px-3">
            <Bell className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
            <span className="hidden sm:inline">Enviado</span>
          </Button>
        )
      case 'request_received':
        return (
          <Button size="sm" variant="outline" disabled className="text-xs sm:text-sm px-2 sm:px-3">
            <Bell className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
            <span className="hidden sm:inline">Pendiente</span>
          </Button>
        )
      default:
        return (
          <Button 
            size="sm" 
            onClick={() => sendFriendRequest(user.id)}
            className="bg-blue-600 hover:bg-blue-700 text-xs sm:text-sm px-2 sm:px-3"
          >
            <UserPlus className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
            <span className="hidden sm:inline">Agregar</span>
            <span className="sm:hidden">+</span>
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

  const handleViewSchedules = async (friendId: number, schedules: { id: number; name: string; description?: string; created_at: string; is_favorite: boolean }[]) => {
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
      <div className="space-y-4 sm:space-y-6">
        <div className="text-center sm:text-left">
          <h1 className="text-2xl sm:text-3xl font-bold">Centro de Amigos</h1>
          <p className="text-muted-foreground mt-1 sm:mt-2 text-sm sm:text-base">
            Busca y conecta con tus compañeros de universidad
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 bg-muted/50 h-12 sm:h-10">
            <TabsTrigger value="friends" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
              <Users className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Mis Amigos</span>
              <span className="sm:hidden">Amigos</span>
              <span>({friends.length})</span>
            </TabsTrigger>
            <TabsTrigger value="search" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
              <Search className="h-3 w-3 sm:h-4 sm:w-4" />
              <span>Buscar</span>
            </TabsTrigger>
            <TabsTrigger value="requests" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
              <Bell className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Solicitudes</span>
              <span className="sm:hidden">Req.</span>
              <span>({friendRequests.received.length})</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="friends" className="mt-4 sm:mt-6">
            <Card className="bg-card/70">
              <CardHeader className="pb-3 sm:pb-6">
                <CardTitle className="text-base sm:text-lg">Mis Amigos</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-6 sm:py-8">
                    <div className="w-6 h-6 sm:w-8 sm:h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                ) : friends.length === 0 ? (
                  <div className="text-center py-8 sm:py-12 text-muted-foreground">
                    <UserPlus className="h-8 w-8 sm:h-12 sm:w-12 mx-auto mb-3 sm:mb-4" />
                    <h3 className="text-base sm:text-lg font-semibold mb-2">No tienes amigos aún</h3>
                    <p className="text-sm sm:text-base">Usa la pestaña "Buscar" para encontrar compañeros</p>
                  </div>
                ) : (
                  <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {friends.map((friend) => (
                      <Card key={friend.id} className="hover:shadow-md transition-shadow bg-card/50">
                        <CardContent className="p-3 sm:p-4">
                          <div className="flex items-center space-x-3 sm:space-x-4">
                            <Avatar className="h-10 w-10 sm:h-12 sm:w-12 flex-shrink-0">
                              <AvatarImage src={friend.profile_photo} />
                              <AvatarFallback className="text-xs sm:text-sm">{getInitials(friend)}</AvatarFallback>
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
                            <div className="flex gap-1 sm:gap-2 flex-shrink-0">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openProfileModal(friend.id)}
                                className="p-2 sm:px-3"
                              >
                                <UserIcon className="h-3 w-3 sm:h-4 sm:w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => removeFriend(friend.id)}
                                className="text-red-400 hover:text-red-300 border-red-500/50 hover:bg-red-500/20 p-2 sm:px-3"
                              >
                                <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
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

          <TabsContent value="search" className="mt-4 sm:mt-6">
            <Card className="bg-card/70">
              <CardHeader className="pb-3 sm:pb-6">
                <CardTitle className="text-base sm:text-lg">Buscar Estudiantes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 sm:space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por nombre, email o código..."
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value)
                        searchUsers(e.target.value)
                      }}
                      className="pl-10 py-3 sm:py-2 text-base sm:text-sm"
                    />
                  </div>

                  {searchLoading ? (
                    <div className="flex items-center justify-center py-6 sm:py-8">
                      <div className="w-6 h-6 sm:w-8 sm:h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  ) : searchQuery.length < 2 ? (
                    <div className="text-center py-8 sm:py-12 text-muted-foreground">
                      <Search className="h-8 w-8 sm:h-12 sm:w-12 mx-auto mb-3 sm:mb-4" />
                      <h3 className="text-base sm:text-lg font-semibold mb-2">Buscar Estudiantes</h3>
                      <p className="text-sm sm:text-base">Escribe al menos 2 caracteres para buscar</p>
                    </div>
                  ) : searchResults.length === 0 ? (
                    <div className="text-center py-8 sm:py-12 text-muted-foreground">
                      <h3 className="text-base sm:text-lg font-semibold mb-2">No se encontraron usuarios</h3>
                      <p className="text-sm sm:text-base">Intenta con diferentes términos de búsqueda</p>
                    </div>
                  ) : (
                    <div className="space-y-2 sm:space-y-3">
                      {searchResults.map((user) => (
                        <Card key={user.id} className="hover:shadow-md transition-shadow bg-card/50">
                          <CardContent className="p-3 sm:p-4">
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center space-x-3 sm:space-x-4 flex-1 min-w-0">
                                <Avatar className="h-10 w-10 flex-shrink-0">
                                  <AvatarImage src={user.profile_photo} />
                                  <AvatarFallback className="text-xs">{getInitials(user)}</AvatarFallback>
                                </Avatar>
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-medium truncate">
                                    {getDisplayName(user)}
                                  </p>
                                  <p className="text-xs text-muted-foreground truncate">
                                    {user.university?.short_name} {user.student_id && `• ${user.student_id}`}
                                  </p>
                                </div>
                              </div>
                              <div className="flex-shrink-0">
                                {getFriendshipStatusButton(user)}
                              </div>
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

          <TabsContent value="requests" className="mt-4 sm:mt-6">
            <div className="space-y-4 sm:space-y-6">
              {/* Received Requests */}
              <Card className="bg-card/70">
                <CardHeader className="pb-3 sm:pb-6">
                  <CardTitle className="text-base sm:text-lg">Solicitudes Recibidas ({friendRequests.received.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  {friendRequests.received.length === 0 ? (
                    <div className="text-center py-6 sm:py-8 text-muted-foreground">
                      <Bell className="h-6 w-6 sm:h-8 sm:w-8 mx-auto mb-2" />
                      <p className="text-sm sm:text-base">No tienes solicitudes pendientes</p>
                    </div>
                  ) : (
                    <div className="space-y-2 sm:space-y-3">
                      {friendRequests.received.map((request) => (
                        <Card key={request.id} className="hover:shadow-md transition-shadow bg-card/50">
                          <CardContent className="p-3 sm:p-4">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                              <div className="flex items-center space-x-3 sm:space-x-4 flex-1 min-w-0">
                                <Avatar className="h-10 w-10 flex-shrink-0">
                                  <AvatarImage src={request.sender?.profile_photo} />
                                  <AvatarFallback className="text-xs">
                                    {request.sender ? getInitials(request.sender) : 'U'}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-medium truncate">
                                    {request.sender ? getDisplayName(request.sender) : 'Usuario'}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {request.sender?.university?.short_name}
                                  </p>
                                  {request.message && (
                                    <p className="text-xs text-muted-foreground mt-1 truncate">
                                      "{request.message}"
                                    </p>
                                  )}
                                </div>
                              </div>
                              <div className="flex gap-2 sm:flex-shrink-0">
                                <Button
                                  size="sm"
                                  onClick={() => acceptFriendRequest(request.id)}
                                  className="bg-green-600 hover:bg-green-700 flex-1 sm:flex-initial text-xs sm:text-sm px-3 py-2"
                                >
                                  <Check className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
                                  <span className="hidden sm:inline">Aceptar</span>
                                  <span className="sm:hidden">✓</span>
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => rejectFriendRequest(request.id)}
                                  className="flex-1 sm:flex-initial text-xs sm:text-sm px-3 py-2"
                                >
                                  <X className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
                                  <span className="hidden sm:inline">Rechazar</span>
                                  <span className="sm:hidden">✗</span>
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