"use client"

import { Navbar } from "@/components/layout/navbar"
import { Footer } from "@/components/layout/footer"
import { Button } from "@/components/ui/button"
import { Building2, Clock, ArrowRight, CheckCircle2, Mail } from "lucide-react"
import Link from "next/link"

export default function UniversitiesPage() {
  const universities = [
    {
      id: "utec",
      name: "UTEC",
      fullName: "Universidad de Ingenieria y Tecnologia",
      status: "available" as const,
      features: ["Base de datos completa", "Profesores incluidos", "Actualizado 2025-1"],
    },
    {
      id: "upc",
      name: "UPC",
      fullName: "Universidad Peruana de Ciencias Aplicadas",
      status: "coming-soon" as const,
    },
    {
      id: "pucp",
      name: "PUCP",
      fullName: "Pontificia Universidad Catolica del Peru",
      status: "coming-soon" as const,
    },
    {
      id: "uni",
      name: "UNI",
      fullName: "Universidad Nacional de Ingenieria",
      status: "coming-soon" as const,
    },
  ]

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="pt-20 pb-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          {/* Header */}
          <div className="text-center py-12">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary text-secondary-foreground text-sm font-medium mb-4">
              <Building2 className="w-4 h-4" />
              <span>Universidades</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Universidades disponibles
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Schedule Maker esta expandiendose constantemente. Mira donde ya estamos disponibles.
            </p>
          </div>

          {/* Universities Grid */}
          <div className="grid gap-4 mb-16">
            {universities.map((uni) => (
              <div
                key={uni.id}
                className={`p-6 rounded-xl border transition-colors ${
                  uni.status === "available"
                    ? "border-border bg-card hover:border-primary/30"
                    : "border-border/50 bg-muted/30"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-lg font-semibold text-foreground">{uni.name}</h3>
                      {uni.status === "available" ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-success/10 text-success text-xs font-medium">
                          <CheckCircle2 className="w-3 h-3" />
                          Disponible
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-xs font-medium">
                          <Clock className="w-3 h-3" />
                          Proximamente
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{uni.fullName}</p>
                    
                    {uni.features && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {uni.features.map((feature) => (
                          <span
                            key={feature}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-secondary text-secondary-foreground text-xs"
                          >
                            <CheckCircle2 className="w-3 h-3 text-success" />
                            {feature}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-shrink-0">
                    {uni.status === "available" ? (
                      <Link href="/auth">
                        <Button size="sm" className="gap-2">
                          Comenzar
                          <ArrowRight className="w-3 h-3" />
                        </Button>
                      </Link>
                    ) : (
                      <Button variant="outline" size="sm" disabled>
                        Proximamente
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Request University Section */}
          <div className="text-center p-8 rounded-xl border border-border bg-card">
            <h2 className="text-xl font-semibold text-foreground mb-2">
              Tu universidad no esta en la lista?
            </h2>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Ayudanos a expandirnos. Envianos un email sugiriendo tu universidad y trabajaremos para agregarla.
            </p>
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => {
                window.location.href = "mailto:joaquin.salinas@utec.edu.pe?subject=Sugerencia%20de%20Universidad&body=Hola,%20me%20gustaria%20sugerir%20que%20agreguen%20mi%20universidad.%0A%0AUniversidad:%20%0ANombre:%20%0AComentarios:%20"
              }}
            >
              <Mail className="w-4 h-4" />
              Sugerir mi universidad
            </Button>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
