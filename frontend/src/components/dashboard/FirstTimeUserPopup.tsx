"use client"

import { useEffect, useState } from "react"
import { X, AlertTriangle, Mail, Bug } from "lucide-react"

interface FirstTimeUserPopupProps {
  onClose: () => void
}

export function FirstTimeUserPopup({ onClose }: FirstTimeUserPopupProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    setIsVisible(true)
  }, [])

  const handleClose = () => {
    setIsVisible(false)
    setTimeout(onClose, 300) // Wait for animation to complete
  }

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm transition-all duration-300 ${
      isVisible ? 'opacity-100' : 'opacity-0'
    }`}>
      <div className={`relative bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 rounded-xl shadow-2xl max-w-md w-full transform transition-all duration-300 ${
        isVisible ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'
      }`}>
        {/* Header */}
        <div className="p-6 border-b border-slate-700">
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 p-1 rounded-lg hover:bg-slate-700 transition-colors duration-200"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
          
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <AlertTriangle className="w-6 h-6 text-amber-500" />
            </div>
            <h2 className="text-xl font-bold text-white">¡Bienvenido!</h2>
          </div>
          
          <p className="text-slate-400 text-sm">
            Información importante sobre Schedule Maker
          </p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="space-y-3">
            <p className="text-white leading-relaxed">
              Este es un proyecto desarrollado por <span className="font-semibold text-cyan-400">una sola persona</span>, 
              por lo que no todos los cursos pueden estar completamente correctos o actualizados.
            </p>
            
            <p className="text-slate-300 text-sm leading-relaxed">
              Si encuentras algún error o necesitas ayuda, puedes contactarme de las siguientes formas:
            </p>
          </div>

          {/* Contact Options */}
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-800/50 border border-slate-700">
              <Mail className="w-5 h-5 text-cyan-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-white">Email Directo</p>
                <p className="text-xs text-slate-400 break-all">joaquinsalinassalas@gmail.com</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-800/50 border border-slate-700">
              <Bug className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                <div>
                <p className="text-sm font-medium text-white">Reportar Bug</p>
                <a 
                  href="https://forms.gle/42QDLV5ehW8dS4ph8" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-xs text-green-400 hover:text-green-300 underline"
                >
                  https://forms.gle/42QDLV5ehW8dS4ph8
                </a>
                </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-700 space-y-3">
          <button
            onClick={() => window.open('https://forms.gle/42QDLV5ehW8dS4ph8', '_blank')}
            className="w-full px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-medium rounded-lg transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]"
          >
            Abrir Formulario de Soporte
          </button>
          
          <button
            onClick={handleClose}
            className="w-full px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-lg transition-all duration-200"
          >
            Entendido, continuar
          </button>
        </div>
      </div>
    </div>
  )
}