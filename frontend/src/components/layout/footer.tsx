import Link from "next/link"
import { Calendar } from "lucide-react"

export function Footer() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Calendar className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-semibold text-foreground">Schedule Maker</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              La herramienta inteligente para crear horarios universitarios optimizados.
            </p>
          </div>

          {/* Product */}
          <div>
            <h4 className="text-sm font-medium text-foreground mb-4">Producto</h4>
            <ul className="space-y-3">
              <li>
                <Link 
                  href="/how-it-works" 
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Como funciona
                </Link>
              </li>
              <li>
                <Link 
                  href="/universities" 
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Universidades
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="text-sm font-medium text-foreground mb-4">Soporte</h4>
            <ul className="space-y-3">
              <li>
                <Link 
                  href="mailto:joaquin.salinas@utec.edu.pe" 
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Contacto
                </Link>
              </li>
              <li>
                <Link 
                  href="mailto:joaquin.salinas@utec.edu.pe?subject=Reportar%20problema" 
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Reportar problema
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-sm font-medium text-foreground mb-4">Legal</h4>
            <ul className="space-y-3">
              <li>
                <Link 
                  href="#" 
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Privacidad
                </Link>
              </li>
              <li>
                <Link 
                  href="#" 
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Terminos
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-12 pt-8 border-t border-border">
          <p className="text-sm text-muted-foreground text-center">
            {new Date().getFullYear()} Schedule Maker. Creado por Joaquin Salinas.
          </p>
        </div>
      </div>
    </footer>
  )
}
