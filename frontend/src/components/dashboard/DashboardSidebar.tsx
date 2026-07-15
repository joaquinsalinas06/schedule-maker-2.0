"use client"

import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Calendar, LogOut, PanelLeftClose, PanelLeft, User, ChevronRight, GitBranch } from "lucide-react"
import { useAuth } from "@/features/auth"
import { useProfile } from "@/features/profile"
import { SidebarSection } from "@/types"

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
  const { signOut } = useAuth()
  const { profile, email } = useProfile()

  const getDisplayName = () => {
    if (!profile) return 'Usuario'
    if (profile.nickname) return profile.nickname.trim()
    if (profile.first_name && profile.last_name) {
      return `${profile.first_name.trim()} ${profile.last_name.trim()}`
    }
    if (profile.first_name) return profile.first_name.trim()
    return email?.split('@')[0] || 'Usuario'
  }

  const getInitials = () => {
    const name = getDisplayName()
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  const handleNavClick = (sectionId: string) => {
    setActiveSection(sectionId)
    if (isMobile) {
      setMobileMenuOpen(false)
    }
  }

  return (
    <>
      {/* Mobile overlay */}
      {isMobile && mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          ${
            isMobile
              ? `fixed left-0 top-0 h-screen z-50 transform transition-transform duration-200 ease-out ${
                  mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
                } w-64`
              : `${sidebarCollapsed ? "w-16" : "w-64"} h-screen transition-all duration-200 ease-out`
          } 
          bg-sidebar border-r border-sidebar-border flex flex-col
        `}
      >
        {/* Header */}
        <div className="h-14 flex items-center justify-between px-3 border-b border-sidebar-border">
          {(!sidebarCollapsed || isMobile) && (
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 bg-foreground rounded-md flex items-center justify-center">
                <Calendar className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-semibold text-sidebar-foreground text-sm">
                Schedule Maker
              </span>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              if (isMobile) {
                setMobileMenuOpen(false);
              } else {
                setSidebarCollapsed(!sidebarCollapsed);
              }
            }}
            className="h-8 w-8 text-sidebar-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent"
          >
            {sidebarCollapsed && !isMobile ? (
              <PanelLeft className="w-4 h-4" />
            ) : (
              <PanelLeftClose className="w-4 h-4" />
            )}
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-3 px-2 overflow-y-auto">
          <div className="space-y-1">
            {sidebarSections.map((section) => {
              const Icon = section.icon;
              const isActive = activeSection === section.id;

              return (
                <button
                  key={section.id}
                  onClick={() => handleNavClick(section.id)}
                  title={
                    sidebarCollapsed && !isMobile ? section.title : undefined
                  }
                  className={`
                    w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer
                    ${
                      isActive
                        ? "bg-sidebar-primary text-sidebar-primary-foreground"
                        : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                    }
                    ${sidebarCollapsed && !isMobile ? "justify-center px-0" : ""}
                  `}
                >
                  <Icon
                    className="w-4 h-4 flex-shrink-0"
                  />
                  {(!sidebarCollapsed || isMobile) && (
                    <>
                      <span className="flex-1 text-left truncate">
                        {section.shortTitle}
                      </span>
                      {isActive && (
                        <ChevronRight className="w-3 h-3 opacity-50" />
                      )}
                    </>
                  )}
                </button>
              );
            })}
          </div>
        </nav>

        {/* User Section */}
        <div className="border-t border-sidebar-border p-2 space-y-1">
          {/* User Info */}
          {(!sidebarCollapsed || isMobile) && profile && (
            <div className="flex items-center gap-2.5 px-3 py-2 mb-1">
              <Avatar className="w-7 h-7">
                <AvatarImage src={profile.profile_photo ?? undefined} />
                <AvatarFallback className="text-xs font-medium bg-sidebar-accent text-sidebar-foreground">
                  {getInitials()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-sidebar-foreground truncate">
                  {getDisplayName()}
                </p>
                <p className="text-xs text-sidebar-foreground/50 truncate">
                  {profile.university?.short_name || email}
                </p>
              </div>
            </div>
          )}

          <button
            onClick={() => handleNavClick("curriculum")}
            className={`
              w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer
              ${
                activeSection === "curriculum"
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
              }
              ${sidebarCollapsed && !isMobile ? "justify-center px-0" : ""}
            `}
            title={sidebarCollapsed && !isMobile ? "Mi Malla" : undefined}
          >
            <GitBranch className="w-4 h-4" />
            {(!sidebarCollapsed || isMobile) && (
              <>
                <span className="flex-1 text-left truncate">Mi Malla</span>
                {activeSection === "curriculum" && (
                  <ChevronRight className="w-3 h-3 opacity-50" />
                )}
              </>
            )}
          </button>

          <button
            onClick={() => handleNavClick("profile")}
            className={`
              w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors cursor-pointer
              text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent
              ${sidebarCollapsed && !isMobile ? "justify-center px-0" : ""}
            `}
            title={sidebarCollapsed && !isMobile ? "Perfil" : undefined}
          >
            <User className="w-4 h-4" />
            {(!sidebarCollapsed || isMobile) && <span>Perfil</span>}
          </button>

          <button
            onClick={async () => {
              await signOut()
              // Land on the public home so the sign-out is visible.
              window.location.assign("/")
            }}
            className={`
              w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors cursor-pointer
              text-sidebar-foreground/70 hover:text-destructive hover:bg-destructive/10
              ${sidebarCollapsed && !isMobile ? "justify-center px-0" : ""}
            `}
            title={sidebarCollapsed && !isMobile ? "Cerrar Sesion" : undefined}
          >
            <LogOut className="w-4 h-4" />
            {(!sidebarCollapsed || isMobile) && <span>Cerrar Sesion</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
