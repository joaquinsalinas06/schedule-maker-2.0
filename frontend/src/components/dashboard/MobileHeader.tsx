"use client"

import { Button } from "@/components/ui/button"
import { Calendar, Menu } from "lucide-react"

interface MobileHeaderProps {
  mobileMenuOpen: boolean
  setMobileMenuOpen: (open: boolean) => void
}

export function MobileHeader({ setMobileMenuOpen }: MobileHeaderProps) {
  return (
    <header className="fixed top-0 left-0 right-0 z-30 h-14 bg-background/80 backdrop-blur-md border-b border-border px-4 lg:hidden">
      <div className="h-full flex items-center justify-between">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMobileMenuOpen(true)}
          className="h-8 w-8"
        >
          <Menu className="w-5 h-5" />
        </Button>
        
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-primary rounded-md flex items-center justify-center">
            <Calendar className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-semibold text-foreground text-sm">Schedule Maker</span>
        </div>
        
        {/* Empty div for spacing */}
        <div className="w-8" />
      </div>
    </header>
  )
}
