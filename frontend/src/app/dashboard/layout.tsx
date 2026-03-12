"use client"

import { useState, useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import { Calendar, Grid3X3, Users, Star, UserPlus, Database } from "lucide-react"
import { authService } from "@/services/auth"
import { authSessionManager } from "@/lib/authSessionManager"
import { SidebarSection } from "@/types"
import { useFirstTimeUser } from "@/hooks/useFirstTimeUser"
import { useUserSessionSecurity } from "@/hooks/useUserSessionSecurity"

import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar'
import { MobileHeader } from '@/components/dashboard/MobileHeader'
import { FirstTimeUserPopup } from '@/components/dashboard/FirstTimeUserPopup'
import { HelpButton } from '@/components/dashboard/HelpButton'
import { DashboardSkeleton } from '@/components/ui/loading-skeletons'

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

  // Auth check + auto-refresh using the session manager
  useEffect(() => {
    if (typeof window === 'undefined') return

    // Validate session properly (JWT expiry check)
    if (!authSessionManager.isAuthenticated()) {
      // Try to get a valid token (may trigger refresh)
      authSessionManager.getValidToken().then((token) => {
        if (!token) {
          window.location.href = '/auth'
          return
        }
        setAuthLoading(false)
      })
    } else {
      setAuthLoading(false)
    }

    // Start proactive auto-refresh
    authSessionManager.startAutoRefresh()

    // Listen for auth state changes (e.g., logout from another tab)
    const { unsubscribe } = authSessionManager.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        window.location.href = '/auth'
      }
    })

    return () => {
      authSessionManager.stopAutoRefresh()
      unsubscribe()
    }
  }, [])

  const sidebarSections: SidebarSection[] = [
    {
      id: "generate",
      title: "Generar Horarios",
      shortTitle: "Generar",
      icon: Calendar,
    },
    {
      id: "schedules",
      title: "Ver Horarios",
      shortTitle: "Horarios",
      icon: Grid3X3,
    },
    {
      id: "my-schedules",
      title: "Mis Horarios",
      shortTitle: "Favoritos",
      icon: Star,
    },
    {
      id: "collaboration",
      title: "Colaboracion",
      shortTitle: "Colaborar",
      icon: Users,
    },
    {
      id: "friends",
      title: "Mis Amigos",
      shortTitle: "Amigos",
      icon: UserPlus,
    },
    ...(currentUser?.role === "admin"
      ? [
          {
            id: "admin",
            title: "Importar Datos",
            shortTitle: "Admin",
            icon: Database,
          },
        ]
      : []),
  ];

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
    return <DashboardSkeleton />
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
