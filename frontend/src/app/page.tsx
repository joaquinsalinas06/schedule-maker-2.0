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
  LayoutGrid,
  Download,
  Star,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Link from "next/link"
import { Navbar } from "@/components/layout/navbar"
import { Footer } from "@/components/layout/footer"

/** Mini schedule grid preview for the hero section */
function SchedulePreview() {
  const days = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"]
  const hours = ["08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00"]

  const blocks = [
    { day: 0, hour: 0, span: 2, label: "Cálculo II", color: "bg-primary/15 border-primary/30 text-primary" },
    { day: 1, hour: 1, span: 2, label: "Física I", color: "bg-muted border-border text-foreground/70" },
    { day: 2, hour: 0, span: 2, label: "Cálculo II", color: "bg-primary/15 border-primary/30 text-primary" },
    { day: 3, hour: 2, span: 2, label: "Programación", color: "bg-foreground/5 border-foreground/10 text-foreground/60" },
    { day: 4, hour: 1, span: 2, label: "Física I", color: "bg-muted border-border text-foreground/70" },
    { day: 0, hour: 3, span: 2, label: "Química", color: "bg-foreground/5 border-foreground/10 text-foreground/60" },
    { day: 2, hour: 4, span: 2, label: "Lab. Física", color: "bg-primary/10 border-primary/20 text-primary/80" },
    { day: 4, hour: 4, span: 1, label: "Tutoría", color: "bg-muted/80 border-border text-foreground/50" },
  ]

  return (
    <div className="relative mx-auto max-w-2xl mt-16">
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-muted/30">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-destructive/40" />
            <div className="w-3 h-3 rounded-full bg-warning/40" />
            <div className="w-3 h-3 rounded-full bg-success/40" />
          </div>
          <span className="text-xs text-muted-foreground font-medium">Combinación 1 de 24</span>
          <div className="flex items-center gap-1.5">
            <Download className="w-3.5 h-3.5 text-muted-foreground" />
            <Star className="w-3.5 h-3.5 text-muted-foreground" />
          </div>
        </div>

        {/* Grid */}
        <div className="p-3">
          {/* Day headers */}
          <div className="grid grid-cols-[48px_repeat(6,1fr)] gap-0.5 mb-1">
            <div />
            {days.map((day) => (
              <div key={day} className="text-center text-[11px] font-medium text-muted-foreground py-1">
                {day}
              </div>
            ))}
          </div>

          {/* Time grid */}
          <div className="relative grid grid-cols-[48px_repeat(6,1fr)] gap-0.5">
            {hours.map((hour, hi) => (
              <div key={hour} className="contents">
                <div className="text-[10px] text-muted-foreground/60 text-right pr-2 py-2 leading-none">
                  {hour}
                </div>
                {days.map((_, di) => {
                  const block = blocks.find(b => b.day === di && b.hour === hi)
                  if (block) {
                    return (
                      <div
                        key={`${di}-${hi}`}
                        className={`rounded-md border text-[10px] font-medium px-1.5 py-1 ${block.color}`}
                        style={{ gridRow: `span ${block.span}` }}
                      >
                        {block.label}
                      </div>
                    )
                  }
                  // Skip cells covered by spanning blocks
                  const isOccupied = blocks.some(b => b.day === di && hi > b.hour && hi < b.hour + b.span)
                  if (isOccupied) return null
                  return (
                    <div key={`${di}-${hi}`} className="rounded-sm bg-muted/20 min-h-[28px]" />
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Decorative glow */}
      <div className="absolute -inset-4 bg-primary/5 rounded-2xl -z-10 blur-2xl" />
    </div>
  )
}

export default function LandingPage() {
  const [activeUniversity, setActiveUniversity] = useState("utec")

  const features = [
    {
      icon: Zap,
      title: "Generación instantánea",
      description: "Crea múltiples combinaciones de horarios en segundos, no en horas.",
      stat: "< 1s",
    },
    {
      icon: CheckCircle2,
      title: "Sin conflictos",
      description: "El algoritmo detecta y elimina automáticamente los cruces de horarios.",
      stat: "0 cruces",
    },
    {
      icon: Users,
      title: "Colaboración en tiempo real",
      description: "Trabaja con compañeros para encontrar horarios compatibles.",
      stat: "En equipo",
    },
    {
      icon: Clock,
      title: "Siempre actualizado",
      description: "Base de datos sincronizada con la información oficial de tu universidad.",
      stat: "2025-1",
    },
  ]

  const steps = [
    { num: "01", title: "Selecciona tus cursos", description: "Busca y agrega las secciones que te interesan" },
    { num: "02", title: "Genera combinaciones", description: "El algoritmo crea todas las opciones sin conflictos" },
    { num: "03", title: "Elige tu favorito", description: "Compara, guarda y descarga tu horario ideal" },
  ]

  const universities = [
    {
      id: "utec",
      name: "UTEC",
      fullName: "Universidad de Ingeniería y Tecnología",
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
      fullName: "Pontificia Universidad Católica del Perú",
      status: "coming-soon",
    },
    {
      id: "uni",
      name: "UNI",
      fullName: "Universidad Nacional de Ingeniería",
      status: "coming-soon",
    },
  ]

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero Section */}
      <section className="pt-28 sm:pt-32 pb-16 sm:pb-20 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6 animate-fade-in">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Optimiza tu tiempo académico</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-5 tracking-tight text-balance leading-[1.15]">
            Crea tu horario perfecto{" "}
            <span className="text-primary">en minutos</span>
          </h1>

          <p className="text-base sm:text-lg text-muted-foreground mb-8 max-w-xl mx-auto leading-relaxed text-pretty">
            Genera horarios universitarios optimizados automáticamente.
            Selecciona tus cursos, evita conflictos y colabora con compañeros.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
            <Link href="/auth">
              <Button size="lg" className="h-11 px-8 text-sm font-medium gap-2 rounded-lg">
                Comenzar gratis
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link href="#como-funciona">
              <Button variant="ghost" size="lg" className="h-11 px-6 text-sm font-medium text-muted-foreground hover:text-foreground">
                Cómo funciona
              </Button>
            </Link>
          </div>

          {/* Schedule Preview */}
          <SchedulePreview />
        </div>
      </section>

      {/* How it works Section */}
      <section id="como-funciona" className="py-20 px-4 sm:px-6 border-t border-border">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-sm font-medium text-primary mb-3">Cómo funciona</p>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
              Tres pasos simples
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-6">
            {steps.map((step, i) => (
              <div key={step.num} className="relative text-center md:text-left">
                <div className="text-4xl font-bold text-primary/15 mb-3 tabular-nums">{step.num}</div>
                <h3 className="text-base font-semibold text-foreground mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
                {i < steps.length - 1 && (
                  <ArrowRight className="hidden md:block absolute top-6 -right-3 w-4 h-4 text-border" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 sm:px-6 bg-muted/30 border-t border-border">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-sm font-medium text-primary mb-3">Características</p>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-4">
              Todo lo que necesitas para planificar
            </h2>
            <p className="text-muted-foreground max-w-lg mx-auto text-sm">
              Herramientas inteligentes que simplifican la creación de horarios académicos.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="group flex gap-4 p-5 rounded-xl border border-border bg-card hover:border-primary/20 transition-colors duration-200"
              >
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/15 transition-colors">
                  <feature.icon className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2 mb-1">
                    <h3 className="text-sm font-semibold text-foreground">
                      {feature.title}
                    </h3>
                    <span className="text-xs font-medium text-primary/70 tabular-nums flex-shrink-0">
                      {feature.stat}
                    </span>
                  </div>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Universities Section */}
      <section className="py-20 px-4 sm:px-6 border-t border-border">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-sm font-medium text-primary mb-3">Universidades</p>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-4">
              Soporte para tu universidad
            </h2>
            <p className="text-muted-foreground max-w-lg mx-auto text-sm">
              Estamos expandiendo nuestra cobertura constantemente.
            </p>
          </div>

          <Tabs value={activeUniversity} onValueChange={setActiveUniversity} className="w-full">
            <TabsList className="w-full grid grid-cols-4 h-auto p-1 bg-muted rounded-lg mb-6">
              {universities.map((uni) => (
                <TabsTrigger
                  key={uni.id}
                  value={uni.id}
                  className="py-2 px-3 text-sm font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md transition-all cursor-pointer"
                >
                  {uni.name}
                </TabsTrigger>
              ))}
            </TabsList>

            {universities.map((uni) => (
              <TabsContent key={uni.id} value={uni.id} className="mt-0">
                <div className="rounded-xl border border-border bg-card p-6 sm:p-8">
                  {uni.status === "available" ? (
                    <div className="space-y-5">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center flex-shrink-0">
                          <CheckCircle2 className="w-5 h-5 text-success" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-foreground mb-0.5">{uni.fullName}</h3>
                          <p className="text-sm text-muted-foreground">Disponible ahora con todas las funcionalidades.</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        {[
                          { value: "100%", label: "Cursos actualizados" },
                          { value: "2025-1", label: "Ciclo actual" },
                          { value: "Completo", label: "Info de profesores" },
                        ].map((stat) => (
                          <div key={stat.label} className="p-3 rounded-lg bg-muted/50 text-center sm:text-left">
                            <div className="text-lg sm:text-xl font-bold text-foreground tabular-nums">{stat.value}</div>
                            <div className="text-xs text-muted-foreground mt-0.5">{stat.label}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center mx-auto mb-3">
                        <Clock className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <h3 className="text-lg font-semibold text-foreground mb-1.5">Próximamente en {uni.name}</h3>
                      <p className="text-sm text-muted-foreground mb-5">
                        Estamos trabajando para agregar soporte para {uni.fullName}.
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="cursor-pointer"
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
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">
            Listo para optimizar tu horario?
          </h2>
          <p className="text-sm text-muted-foreground mb-8 max-w-md mx-auto">
            Únete a estudiantes que ya están ahorrando tiempo en la planificación de sus cursos.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/auth">
              <Button size="lg" className="h-11 px-8 text-sm font-medium gap-2 rounded-lg">
                <Calendar className="w-4 h-4" />
                Comenzar gratis
              </Button>
            </Link>
          </div>
          <div className="mt-8 flex items-center justify-center gap-5 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-success" />
              <span>Gratis para estudiantes</span>
            </div>
            <div className="w-px h-3 bg-border" />
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-success" />
              <span>Sin tarjeta de crédito</span>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
