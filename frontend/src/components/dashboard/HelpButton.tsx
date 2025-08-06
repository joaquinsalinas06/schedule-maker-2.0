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
        className="p-3 bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 active:scale-95 group"
        title="Ayuda y Soporte"
      >
        <HelpCircle className="w-6 h-6 group-hover:rotate-12 transition-transform duration-200" />
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
          <div className="absolute bottom-full right-0 mb-2 w-64 bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200">
            {/* Header */}
            <div className="p-4 border-b border-slate-700">
              <h3 className="font-semibold text-white mb-1">¿Necesitas Ayuda?</h3>
              <p className="text-xs text-slate-400">
                Contacta conmigo si tienes problemas o sugerencias
              </p>
            </div>

            {/* Options */}
            <div className="p-2 space-y-1">
              <button
                onClick={handleSupportForm}
                className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-slate-700/50 transition-colors duration-200 text-left group"
              >
                <div className="p-2 rounded-lg bg-green-500/10 border border-green-500/20 group-hover:bg-green-500/20 transition-colors duration-200">
                  <MessageSquare className="w-4 h-4 text-green-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">Google Form</p>
                  <p className="text-xs text-slate-400">Reporta bugs o solicita ayuda</p>
                </div>
              </button>

              <button
                onClick={handleEmailContact}
                className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-slate-700/50 transition-colors duration-200 text-left group"
              >
                <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20 group-hover:bg-cyan-500/20 transition-colors duration-200">
                  <Mail className="w-4 h-4 text-cyan-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-white">Email Directo</p>
                  <p className="text-xs text-slate-400 break-all">joaquinsalinassalas@gmail.com</p>
                </div>
                <ExternalLink className="w-4 h-4 text-slate-500 group-hover:text-slate-400 transition-colors duration-200" />
              </button>
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-slate-700 bg-slate-900/50">
              <p className="text-xs text-slate-500 text-center">
                Proyecto desarrollado por una persona 👨‍💻
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  )
}