"use client"

import { useState, useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import { Calendar, Grid3X3, Users, Star, UserPlus, Database, Loader2 } from "lucide-react"
import { authService } from "@/services/auth"
import { SidebarSection } from "@/types"
import { useFirstTimeUser } from "@/hooks/useFirstTimeUser"
import { useUserSessionSecurity } from "@/hooks/useUserSessionSecurity"

import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar'
import { MobileHeader } from '@/components/dashboard/MobileHeader'
import { FirstTimeUserPopup } from '@/components/dashboard/FirstTimeUserPopup'
import { HelpButton } from '@/components/dashboard/HelpButton'

interface DashboardLayoutProps {
  children: React.ReactNode
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname()
  const router = useRouter()
  
  useUserSessionSecurity()
  
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [authLoading, setAuthLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<{ role?: string } | null>(null)
  const { isFirstTime, isLoading: firstTimeLoading, markAsVisited } = useFirstTimeUser()

  useEffect(() => {
    const user = authService.getCurrentUser()
    setCurrentUser(user)
  }, [])

  const sidebarSections: SidebarSection[] = [
    {
      id: "generate",
      title: "Generar Horarios",
      shortTitle: "Generar",
      icon: Calendar,
      color: "from-cyan-500 to-teal-600",
    },
    {
      id: "schedules",
      title: "Ver Horarios",
      shortTitle: "Horarios",
      icon: Grid3X3,
      color: "from-fuchsia-500 to-pink-600",
    },
    {
      id: "my-schedules",
      title: "Mis Horarios",
      shortTitle: "Favoritos",
      icon: Star,
      color: "from-amber-500 to-orange-600",
    },
    {
      id: "collaboration",
      title: "Colaboracion",
      shortTitle: "Colaborar",
      icon: Users,
      color: "from-green-500 to-emerald-600",
    },
    {
      id: "friends",
      title: "Mis Amigos",
      shortTitle: "Amigos",
      icon: UserPlus,
      color: "from-rose-500 to-pink-600",
    },
    ...(currentUser?.role === 'admin' ? [{
      id: "admin",
      title: "Importar Datos",
      shortTitle: "Admin",
      icon: Database,
      color: "from-red-500 to-orange-600",
    }] : []),
  ]

  const getActiveSection = () => {
    const path = pathname.split('/')[2]
    return path || "generate"
  }

  const activeSection = getActiveSection()

  const setActiveSection = (sectionId: string) => {
    router.push(`/dashboard/${sectionId}`)
  }

  useEffect(() => {
    const checkAuth = () => {
      if (typeof window !== 'undefined' && !authService.isAuthenticated()) {
        window.location.href = '/'
        return
      }
      setAuthLoading(false)
    }
    
    checkAuth()
  }, [])

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 1024
      setIsMobile(mobile)
      if (mobile) {
        setSidebarCollapsed(true)
        setMobileMenuOpen(false)
      }
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  if (authLoading || firstTimeLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Cargando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen bg-background overflow-hidden">
      <div className="flex h-screen">
        <DashboardSidebar 
          sidebarSections={sidebarSections}
          activeSection={activeSection}
          setActiveSection={setActiveSection}
          sidebarCollapsed={sidebarCollapsed}
          setSidebarCollapsed={setSidebarCollapsed}
          isMobile={isMobile}
          mobileMenuOpen={mobileMenuOpen}
          setMobileMenuOpen={setMobileMenuOpen}
        />

        {isMobile && (
          <MobileHeader 
            mobileMenuOpen={mobileMenuOpen}
            setMobileMenuOpen={setMobileMenuOpen}
          />
        )}

        <main className={`flex-1 flex flex-col h-screen overflow-hidden ${isMobile ? 'pt-14' : ''}`}>
          <div className="flex-1 overflow-y-auto">
            {children}
          </div>
        </main>

        <div className="fixed bottom-4 right-4 z-40">
          <HelpButton />
        </div>
      </div>

      {isFirstTime && (
        <FirstTimeUserPopup onClose={markAsVisited} />
      )}
    </div>
  )
}
