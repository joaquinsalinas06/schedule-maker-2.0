"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Calendar, LogOut, Menu, ChevronRight, User } from "lucide-react"
import { authService } from "@/services/auth"
import { SidebarSection, User as UserType } from "@/types"

interface DashboardSidebarProps {
  sidebarSections: SidebarSection[]
  activeSection: string
  setActiveSection: (section: string) => void
  sidebarCollapsed: boolean
  setSidebarCollapsed: (collapsed: boolean) => void
  isMobile: boolean
  mobileMenuOpen: boolean
  setMobileMenuOpen: (open: boolean) => void
}

export function DashboardSidebar({
  sidebarSections,
  activeSection,
  setActiveSection,
  sidebarCollapsed,
  setSidebarCollapsed,
  isMobile,
  mobileMenuOpen,
  setMobileMenuOpen
}: DashboardSidebarProps) {
  const [loadingSection, setLoadingSection] = useState<string | null>(null)
  const [currentUser, setCurrentUser] = useState<UserType | null>(null)

  useEffect(() => {
    // Load user data from localStorage
    const storedUser = localStorage.getItem('user')
    if (storedUser) {
      setCurrentUser(JSON.parse(storedUser))
    }
  }, [])

  const getDisplayName = () => {
    if (!currentUser) return 'Usuario'
    if (currentUser.nickname) return currentUser.nickname.trim()
    if (currentUser.first_name && currentUser.last_name) {
      return `${currentUser.first_name.trim()} ${currentUser.last_name.trim()}`
    }
    if (currentUser.first_name) return currentUser.first_name.trim()
    return currentUser.email?.split('@')[0] || 'Usuario'
  }

  const getInitials = () => {
    const name = getDisplayName()
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  return (
    <>
      {/* Mobile overlay */}
      {isMobile && mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <div
        className={`${
          isMobile 
            ? `fixed left-0 top-0 h-screen z-50 transform transition-transform duration-300 ${
                mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
              } w-80`
            : `${sidebarCollapsed ? "w-20" : "w-80"} h-screen`
        } bg-card/95 backdrop-blur-sm border-r border-border ${
          !isMobile ? 'transition-all duration-500 ease-in-out' : ''
        } flex flex-col shadow-xl`}
      >
        {/* Header */}
        <div className="p-6 border-b border-border">
          <div className="flex items-center justify-between">
            {(!sidebarCollapsed || isMobile) && (
              <div className="flex items-center gap-3 animate-in slide-in-from-left duration-300">
                <div className="w-12 h-12 bg-gradient-to-br from-cyan-600 to-teal-700 rounded-xl flex items-center justify-center shadow-lg transform hover:scale-105 transition-transform duration-200">
                  <Calendar className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-foreground">Schedule Maker</h1>
                  <p className="text-sm text-muted-foreground">Smart Management</p>
                </div>
              </div>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (isMobile) {
                  setMobileMenuOpen(false)
                } else {
                  setSidebarCollapsed(!sidebarCollapsed)
                }
              }}
              className="p-3 hover:bg-accent rounded-xl transition-all duration-200 hover:scale-105"
            >
              <Menu className={`w-5 h-5 transition-transform duration-300 ${sidebarCollapsed ? "rotate-180" : ""}`} />
            </Button>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex-1 p-4 overflow-y-auto">
          <div className="space-y-3">
            {sidebarSections.map((section, index) => {
              const Icon = section.icon
              return (
                <button
                  key={section.id}
                  onClick={() => {
                    setLoadingSection(section.id)
                    setActiveSection(section.id)
                    if (isMobile) {
                      setMobileMenuOpen(false)
                    }
                    // Clear loading state after a short delay
                    setTimeout(() => setLoadingSection(null), 500)
                  }}
                  className={`w-full p-4 rounded-xl text-left transition-all duration-300 transform hover:scale-[1.02] group animate-in slide-in-from-left duration-300 ${
                    activeSection === section.id
                      ? `bg-gradient-to-r ${section.color} text-white shadow-lg shadow-cyan-500/25`
                      : "hover:bg-accent text-foreground hover:shadow-md"
                  }`}
                  style={{ animationDelay: `${index * 100}ms` }}
                  title={sidebarCollapsed ? section.title : undefined}
                >
                  <div className="flex items-center gap-4">
                    {loadingSection === section.id ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Icon
                        className={`${sidebarCollapsed ? "w-6 h-6" : "w-5 h-5"} transition-all duration-300 ${
                          activeSection === section.id ? "text-white" : "text-muted-foreground group-hover:text-cyan-600"
                        }`}
                      />
                    )}
                    {(!sidebarCollapsed || isMobile) && (
                      <div className="flex-1 animate-in slide-in-from-left duration-300">
                        <div className="font-semibold text-sm">
                          {loadingSection === section.id ? "Cargando..." : section.shortTitle}
                        </div>
                      </div>
                    )}
                    {(!sidebarCollapsed || isMobile) && loadingSection !== section.id && (
                      <ChevronRight
                        className={`w-4 h-4 transition-all duration-300 ${
                          activeSection === section.id
                            ? "text-white rotate-90"
                            : "text-muted-foreground group-hover:text-cyan-600 group-hover:translate-x-1"
                        }`}
                      />
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* User Profile */}
        <div className="p-4 border-t border-border space-y-2">
          {/* User Info */}
          {(!sidebarCollapsed || isMobile) && currentUser && (
            <div className="flex items-center gap-3 p-2 rounded-lg bg-muted/30 mb-3">
              <Avatar className="w-8 h-8">
                <AvatarImage src={currentUser.profile_photo} />
                <AvatarFallback className="text-xs font-semibold">
                  {getInitials()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {getDisplayName()}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {currentUser.university?.short_name || currentUser.university?.name}
                </p>
              </div>
            </div>
          )}
          
          <Button
            variant="ghost"
            onClick={() => setActiveSection('profile')}
            className="w-full justify-start gap-3 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all duration-200"
          >
            <User className="w-4 h-4" />
            {(!sidebarCollapsed || isMobile) && "Ver Perfil"}
          </Button>
          <Button
            variant="ghost"
            onClick={() => authService.logout()}
            className="w-full justify-start gap-3 text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-all duration-200"
          >
            <LogOut className="w-4 h-4" />
            {(!sidebarCollapsed || isMobile) && "Cerrar Sesión"}
          </Button>
        </div>
      </div>
    </>
  )
}