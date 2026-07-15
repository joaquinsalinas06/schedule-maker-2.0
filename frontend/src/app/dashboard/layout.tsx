"use client"

import { useState, useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import { Calendar, Grid3X3, Star, UserPlus, Database } from "lucide-react"
import { SidebarSection } from "@/types"
import { useFirstTimeUser } from "@/hooks/useFirstTimeUser"
import { useProfile } from "@/features/profile"

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

  const { profile } = useProfile()

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { isFirstTime, isLoading: firstTimeLoading, markAsVisited } = useFirstTimeUser()

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
      id: "friends",
      title: "Mis Amigos",
      shortTitle: "Amigos",
      icon: UserPlus,
    },
    ...(profile?.role === "admin"
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

  if (firstTimeLoading) {
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
