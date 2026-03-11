"use client"

import { useState } from "react"
import { HelpCircle, MessageSquare, Mail, ExternalLink } from "lucide-react"

// No props needed for HelpButton

export function HelpButton() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const handleEmailContact = () => {
    window.location.href = 'mailto:joaquinsalinassalas@gmail.com?subject=Schedule Maker - Consulta&body=Hola,%0D%0A%0D%0AQuería consultar sobre:%0D%0A%0D%0A(Describe tu consulta aquí)%0D%0A%0D%0AGracias!'
    setIsMenuOpen(false)
  }

  const handleSupportForm = () => {
    window.open('https://forms.gle/42QDLV5ehW8dS4ph8', '_blank')
    setIsMenuOpen(false)
  }

  return (
    <div className="relative">
      {/* Help Button */}
      <button
        onClick={() => setIsMenuOpen(!isMenuOpen)}
        className="p-3 bg-foreground text-background rounded-full shadow-lg hover:shadow-xl transition-all duration-200"
        title="Ayuda y Soporte"
      >
        <HelpCircle className="w-6 h-6" />
      </button>

      {/* Dropdown Menu */}
      {isMenuOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsMenuOpen(false)}
          />

          {/* Menu */}
          <div className="absolute bottom-full right-0 mb-2 w-64 bg-popover border border-border rounded-xl shadow-2xl z-50 overflow-hidden animate-fade-in">
            {/* Header */}
            <div className="p-4 border-b border-border">
              <h3 className="font-semibold text-foreground mb-1">
                ¿Necesitas Ayuda?
              </h3>
              <p className="text-xs text-muted-foreground">
                Contacta conmigo si tienes problemas o sugerencias
              </p>
            </div>

            {/* Options */}
            <div className="p-2 space-y-1">
              <button
                onClick={handleSupportForm}
                className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition-colors duration-200 text-left group"
              >
                <div className="p-2 rounded-lg bg-primary/10 border border-primary/20 group-hover:bg-primary/20 transition-colors duration-200">
                  <MessageSquare className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Google Form
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Reporta bugs o solicita ayuda
                  </p>
                </div>
              </button>

              <button
                onClick={handleEmailContact}
                className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition-colors duration-200 text-left group"
              >
                <div className="p-2 rounded-lg bg-primary/10 border border-primary/20 group-hover:bg-primary/20 transition-colors duration-200">
                  <Mail className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">
                    Email Directo
                  </p>
                  <p className="text-xs text-muted-foreground break-all">
                    joaquinsalinassalas@gmail.com
                  </p>
                </div>
                <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors duration-200" />
              </button>
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-border bg-muted/50">
              <p className="text-xs text-muted-foreground text-center">
                Proyecto desarrollado por una persona 👨‍💻
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}