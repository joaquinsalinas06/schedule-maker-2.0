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
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm transition-all duration-300 ${
        isVisible ? "opacity-100" : "opacity-0"
      }`}
    >
      <div
        className={`relative bg-card border border-border rounded-xl shadow-2xl max-w-md w-full transform transition-all duration-300 ${
          isVisible ? "scale-100 translate-y-0" : "scale-95 translate-y-4"
        }`}
      >
        {/* Header */}
        <div className="p-6 border-b border-border">
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 p-1 rounded-lg hover:bg-accent transition-colors duration-200"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>

          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-warning/10 border border-warning/20">
              <AlertTriangle className="w-6 h-6 text-warning" />
            </div>
            <h2 className="text-xl font-bold text-foreground">¡Bienvenido!</h2>
          </div>

          <p className="text-muted-foreground text-sm">
            Información importante sobre Schedule Maker
          </p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="space-y-3">
            <p className="text-foreground leading-relaxed">
              Este es un proyecto desarrollado por{" "}
              <span className="font-semibold text-primary">
                una sola persona
              </span>
              , por lo que no todos los cursos pueden estar completamente
              correctos o actualizados.
            </p>

            <p className="text-muted-foreground text-sm leading-relaxed">
              Si encuentras algún error o necesitas ayuda, puedes contactarme de
              las siguientes formas:
            </p>
          </div>

          {/* Contact Options */}
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 border border-border">
              <Mail className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground">
                  Email Directo
                </p>
                <p className="text-xs text-muted-foreground break-all">
                  joaquinsalinassalas@gmail.com
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 border border-border">
              <Bug className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground">
                  Reportar Bug
                </p>
                <a
                  href="https://forms.gle/42QDLV5ehW8dS4ph8"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:text-primary/80 underline"
                >
                  https://forms.gle/42QDLV5ehW8dS4ph8
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-border space-y-3">
          <button
            onClick={() =>
              window.open("https://forms.gle/42QDLV5ehW8dS4ph8", "_blank")
            }
            className="w-full px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-lg transition-colors"
          >
            Abrir Formulario de Soporte
          </button>

          <button
            onClick={handleClose}
            className="w-full px-4 py-2 bg-secondary hover:bg-accent text-foreground font-medium rounded-lg transition-colors"
          >
            Entendido, continuar
          </button>
        </div>
      </div>
    </div>
  );
}