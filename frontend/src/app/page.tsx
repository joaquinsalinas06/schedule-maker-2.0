"use client"

import { useState } from "react"
import {
  Calendar,
  Users,
  ArrowRight,
  CheckCircle2,
  Zap,
  Clock,
  Sparkles,
  Building2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Link from "next/link"
import { Navbar } from "@/components/layout/navbar"
import { Footer } from "@/components/layout/footer"

export default function LandingPage() {
  const [activeUniversity, setActiveUniversity] = useState("utec")

  const features = [
    {
      icon: Zap,
      title: "Generacion instantanea",
      description: "Crea multiples combinaciones de horarios en segundos, no en horas.",
    },
    {
      icon: CheckCircle2,
      title: "Sin conflictos",
      description: "El algoritmo detecta y elimina automaticamente los cruces de horarios.",
    },
    {
      icon: Users,
      title: "Colaboracion en tiempo real",
      description: "Trabaja con companeros para encontrar horarios compatibles.",
    },
    {
      icon: Clock,
      title: "Siempre actualizado",
      description: "Base de datos sincronizada con la informacion oficial de tu universidad.",
    },
  ]

  const universities = [
    {
      id: "utec",
      name: "UTEC",
      fullName: "Universidad de Ingenieria y Tecnologia",
      status: "available",
    },
    {
      id: "upc",
      name: "UPC",
      fullName: "Universidad Peruana de Ciencias Aplicadas",
      status: "coming-soon",
    },
    {
      id: "pucp",
      name: "PUCP",
      fullName: "Pontificia Universidad Catolica del Peru",
      status: "coming-soon",
    },
    {
      id: "uni",
      name: "UNI",
      fullName: "Universidad Nacional de Ingenieria",
      status: "coming-soon",
    },
  ]

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6 animate-fade-up">
            <Sparkles className="w-4 h-4" />
            <span>Optimiza tu tiempo academico</span>
          </div>
          
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground mb-6 tracking-tight animate-fade-up text-balance" style={{ animationDelay: '50ms' }}>
            Crea tu horario perfecto{" "}
            <span className="text-primary">en minutos</span>
          </h1>
          
          <p className="text-lg sm:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed animate-fade-up text-pretty" style={{ animationDelay: '100ms' }}>
            Genera horarios universitarios optimizados automaticamente. 
            Selecciona tus cursos, evita conflictos y colabora con companeros.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center animate-fade-up" style={{ animationDelay: '150ms' }}>
            <Link href="/auth">
              <Button size="lg" className="h-12 px-8 text-base gap-2">
                Comenzar gratis
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link href="/how-it-works">
              <Button variant="outline" size="lg" className="h-12 px-8 text-base">
                Como funciona
              </Button>
            </Link>
          </div>

          {/* Social proof */}
          <div className="mt-12 flex items-center justify-center gap-6 text-sm text-muted-foreground animate-fade-up" style={{ animationDelay: '200ms' }}>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-success" />
              <span>Gratis para estudiantes</span>
            </div>
            <div className="hidden sm:block w-px h-4 bg-border" />
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-success" />
              <span>Sin tarjeta de credito</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 sm:px-6 border-t border-border bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-4">
              Todo lo que necesitas para planificar
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Herramientas inteligentes que simplifican la creacion de horarios academicos.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {features.map((feature, index) => (
              <div
                key={feature.title}
                className="group p-6 rounded-xl border border-border bg-card hover:border-primary/20 hover:shadow-sm transition-all duration-200"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <feature.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Universities Section */}
      <section className="py-20 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary text-secondary-foreground text-sm font-medium mb-4">
              <Building2 className="w-4 h-4" />
              <span>Universidades</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-4">
              Soporte para tu universidad
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Estamos expandiendo nuestra cobertura constantemente.
            </p>
          </div>

          <Tabs value={activeUniversity} onValueChange={setActiveUniversity} className="w-full">
            <TabsList className="w-full grid grid-cols-4 h-auto p-1 bg-muted rounded-lg mb-8">
              {universities.map((uni) => (
                <TabsTrigger
                  key={uni.id}
                  value={uni.id}
                  className="py-2.5 px-3 text-sm font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md transition-all"
                >
                  {uni.name}
                </TabsTrigger>
              ))}
            </TabsList>

            {universities.map((uni) => (
              <TabsContent key={uni.id} value={uni.id} className="mt-0">
                <div className="rounded-xl border border-border bg-card p-8">
                  {uni.status === "available" ? (
                    <div className="space-y-6">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center flex-shrink-0">
                          <CheckCircle2 className="w-6 h-6 text-success" />
                        </div>
                        <div>
                          <h3 className="text-xl font-semibold text-foreground mb-1">{uni.fullName}</h3>
                          <p className="text-muted-foreground">Disponible ahora con todas las funcionalidades.</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="p-4 rounded-lg bg-muted/50">
                          <div className="text-2xl font-bold text-foreground mb-1">100%</div>
                          <div className="text-sm text-muted-foreground">Cursos actualizados</div>
                        </div>
                        <div className="p-4 rounded-lg bg-muted/50">
                          <div className="text-2xl font-bold text-foreground mb-1">2025-1</div>
                          <div className="text-sm text-muted-foreground">Ciclo actual</div>
                        </div>
                        <div className="p-4 rounded-lg bg-muted/50">
                          <div className="text-2xl font-bold text-foreground mb-1">Completo</div>
                          <div className="text-sm text-muted-foreground">Info de profesores</div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mx-auto mb-4">
                        <Clock className="w-6 h-6 text-muted-foreground" />
                      </div>
                      <h3 className="text-xl font-semibold text-foreground mb-2">Proximamente en {uni.name}</h3>
                      <p className="text-muted-foreground mb-6">
                        Estamos trabajando para agregar soporte para {uni.fullName}.
                      </p>
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          window.location.href = `mailto:joaquin.salinas@utec.edu.pe?subject=Solicitud%20de%20universidad%20-%20${uni.name}`
                        }}
                      >
                        Solicitar acceso
                      </Button>
                    </div>
                  )}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 border-t border-border bg-muted/30">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-4">
            Listo para optimizar tu horario?
          </h2>
          <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
            Unete a miles de estudiantes que ya estan ahorrando tiempo en la planificacion de sus cursos.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/auth">
              <Button size="lg" className="h-12 px-8 text-base gap-2">
                <Calendar className="w-4 h-4" />
                Comenzar gratis
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
