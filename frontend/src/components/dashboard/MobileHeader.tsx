"use client"

import { Button } from "@/components/ui/button"
import { Calendar, LogOut, Menu } from "lucide-react"
import { authService } from "@/services/auth"

interface MobileHeaderProps {
  mobileMenuOpen: boolean
  setMobileMenuOpen: (open: boolean) => void
}

export function MobileHeader({setMobileMenuOpen }: MobileHeaderProps) {
  return (
    <div className="fixed top-0 left-0 right-0 z-30 bg-card/95 backdrop-blur-sm border-b border-border px-4 py-3 lg:hidden">
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setMobileMenuOpen(true)}
          className="p-2"
        >
          <Menu className="w-5 h-5" />
        </Button>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-cyan-600 to-teal-700 rounded-lg flex items-center justify-center">
            <Calendar className="w-5 h-5 text-white" />
          </div>
          <span className="font-semibold text-foreground">Schedule Maker</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => authService.logout()}
          className="p-2 text-muted-foreground hover:text-red-400"
        >
          <LogOut className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}