"use client"

import { useState, useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import { Calendar, Grid3X3, Users, Star, User } from "lucide-react"
import { authService } from "@/services/auth"
import { SidebarSection } from "@/types"

// Dashboard Components
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar'
import { MobileHeader } from '@/components/dashboard/MobileHeader'

interface DashboardLayoutProps {
  children: React.ReactNode
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname()
  const router = useRouter()
  
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [authLoading, setAuthLoading] = useState(true)
  const [pageLoading, setPageLoading] = useState(false)

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
      title: "Colaboración",
      shortTitle: "Colaborar",
      icon: Users,
      color: "from-green-500 to-emerald-600",
    },
    {
      id: "profile",
      title: "Mi Perfil",
      shortTitle: "Perfil",
      icon: User,
      color: "from-purple-500 to-violet-600",
    },
  ]

  // Get current active section from pathname
  const getActiveSection = () => {
    const path = pathname.split('/')[2] // Get the section after /dashboard/
    return path || "generate" // Default to generate if no specific path
  }

  const activeSection = getActiveSection()

  // Handle navigation between sections with loading state
  const setActiveSection = (sectionId: string) => {
    setPageLoading(true)
    router.push(`/dashboard/${sectionId}`)
  }

  // Clear loading state when route changes
  useEffect(() => {
    setPageLoading(false)
  }, [pathname])

  // Simple auth check - only redirect if no token exists
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

  // Mobile detection and responsive handling
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 1024 // lg breakpoint
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

  // Show simple loading if checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <div className="text-white">
            <h2 className="text-xl font-semibold mb-2">Cargando...</h2>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 dark:from-slate-950 dark:via-purple-950 dark:to-slate-950 overflow-hidden">
      <div className="flex h-screen relative">
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

        {/* Mobile Header */}
        {isMobile && (
          <MobileHeader 
            mobileMenuOpen={mobileMenuOpen}
            setMobileMenuOpen={setMobileMenuOpen}
          />
        )}

        {/* Main Content */}
        <div className={`flex-1 flex flex-col h-screen ${isMobile ? 'pt-16' : ''}`}>
          <div className="flex-1 overflow-y-auto">
            {pageLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                  <div className="text-white">
                    <h2 className="text-xl font-semibold mb-2">Cargando...</h2>
                    <p className="text-muted-foreground">Preparando contenido</p>
                  </div>
                </div>
              </div>
            ) : (
              children
            )}
          </div>
        </div>
      </div>

    </div>
  )
}