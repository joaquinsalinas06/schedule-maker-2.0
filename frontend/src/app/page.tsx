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
} from "lucide-react"
import { motion, MotionConfig } from "motion/react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Link from "next/link"
import { Navbar } from "@/components/layout/navbar"
import { Footer } from "@/components/layout/footer"
import { HeroScheduleAnimation } from "@/components/landing/HeroScheduleAnimation"
import { Reveal, RevealGroup, RevealItem } from "@/components/landing/Reveal"

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
      title: "Comparte con tus amigos",
      description: "Comparte tu horario con un enlace y coordina con tus compañeros.",
      stat: "Con un link",
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
    <MotionConfig reducedMotion="user">
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero Section */}
      <section className="pt-28 sm:pt-32 pb-16 sm:pb-20 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto text-center">
          <motion.div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.05 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Optimiza tu tiempo académico</span>
          </motion.div>

          <motion.h1
            className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-5 tracking-tight text-balance leading-[1.15]"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
          >
            Crea tu horario perfecto{" "}
            <span className="text-primary">en minutos</span>
          </motion.h1>

          <motion.p
            className="text-base sm:text-lg text-muted-foreground mb-8 max-w-xl mx-auto leading-relaxed text-pretty"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut", delay: 0.2 }}
          >
            Genera horarios universitarios optimizados automáticamente.
            Selecciona tus cursos, evita conflictos y compártelos con compañeros.
          </motion.p>

          <motion.div
            className="flex flex-col sm:flex-row gap-3 justify-center items-center"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut", delay: 0.3 }}
          >
            <Link href="/dashboard/generate">
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
                <Button
                  size="lg"
                  className="h-11 px-8 text-sm font-medium gap-2 rounded-lg"
                >
                  Comenzar gratis
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </motion.div>
            </Link>
            <Link href="#como-funciona">
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
                <Button
                  variant="ghost"
                  size="lg"
                  className="h-11 px-6 text-sm font-medium text-muted-foreground hover:text-foreground"
                >
                  Cómo funciona
                </Button>
              </motion.div>
            </Link>
          </motion.div>

          {/* Schedule Preview */}
          <HeroScheduleAnimation />
        </div>
      </section>

      {/* How it works Section */}
      <section
        id="como-funciona"
        className="py-20 px-4 sm:px-6 border-t border-border"
      >
        <div className="max-w-4xl mx-auto">
          <Reveal className="text-center mb-14">
            <p className="text-sm font-medium text-primary mb-3">
              Cómo funciona
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
              Tres pasos simples
            </h2>
          </Reveal>

          <RevealGroup className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-6">
            {steps.map((step, i) => (
              <RevealItem
                key={step.num}
                className="relative text-center md:text-left group"
              >
                <div className="text-4xl font-bold text-primary/15 mb-3 tabular-nums group-hover:text-primary/30 transition-colors duration-300">
                  {step.num}
                </div>
                <h3 className="text-base font-semibold text-foreground mb-2">
                  {step.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {step.description}
                </p>
                {i < steps.length - 1 && (
                  <ArrowRight className="hidden md:block absolute top-6 -right-3 w-4 h-4 text-border" />
                )}
              </RevealItem>
            ))}
          </RevealGroup>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 sm:px-6 bg-muted/30 border-t border-border">
        <div className="max-w-5xl mx-auto">
          <Reveal className="text-center mb-14">
            <p className="text-sm font-medium text-primary mb-3">
              Características
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-4">
              Todo lo que necesitas para planificar
            </h2>
            <p className="text-muted-foreground max-w-lg mx-auto text-sm">
              Herramientas inteligentes que simplifican la creación de horarios
              académicos.
            </p>
          </Reveal>

          <RevealGroup className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {features.map((feature) => (
              <RevealItem
                key={feature.title}
                className="group flex gap-4 p-5 rounded-xl border border-border bg-card hover:border-primary/30 hover:shadow-md transition-all duration-300 hover:-translate-y-1"
              >
                <motion.div
                  className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/15 transition-colors"
                  whileHover={{ scale: 1.1, y: -2 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                >
                  <feature.icon className="w-5 h-5 text-primary" />
                </motion.div>
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
              </RevealItem>
            ))}
          </RevealGroup>
        </div>
      </section>

      {/* Universities Section */}
      <section className="py-20 px-4 sm:px-6 border-t border-border">
        <div className="max-w-3xl mx-auto">
          <Reveal className="text-center mb-12">
            <p className="text-sm font-medium text-primary mb-3">
              Universidades
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-4">
              Soporte para tu universidad
            </h2>
            <p className="text-muted-foreground max-w-lg mx-auto text-sm">
              Estamos expandiendo nuestra cobertura constantemente.
            </p>
          </Reveal>

          <Reveal delay={0.15}>
          <Tabs
            value={activeUniversity}
            onValueChange={setActiveUniversity}
            className="w-full"
          >
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
                          <h3 className="text-lg font-semibold text-foreground mb-0.5">
                            {uni.fullName}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            Disponible ahora con todas las funcionalidades.
                          </p>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        {[
                          { value: "100%", label: "Cursos actualizados" },
                          { value: "2025-1", label: "Ciclo actual" },
                          { value: "Completo", label: "Info de profesores" },
                        ].map((stat) => (
                          <div
                            key={stat.label}
                            className="p-3 rounded-lg bg-muted/50 text-center sm:text-left"
                          >
                            <div className="text-lg sm:text-xl font-bold text-foreground tabular-nums">
                              {stat.value}
                            </div>
                            <div className="text-xs text-muted-foreground mt-0.5">
                              {stat.label}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center mx-auto mb-3">
                        <Clock className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <h3 className="text-lg font-semibold text-foreground mb-1.5">
                        Próximamente en {uni.name}
                      </h3>
                      <p className="text-sm text-muted-foreground mb-5">
                        Estamos trabajando para agregar soporte para{" "}
                        {uni.fullName}.
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="cursor-pointer"
                        onClick={() => {
                          window.location.href = `mailto:joaquin.salinas@utec.edu.pe?subject=Solicitud%20de%20universidad%20-%20${uni.name}`;
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
          </Reveal>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 border-t border-border bg-muted/30">
        <Reveal className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">
            Listo para optimizar tu horario?
          </h2>
          <p className="text-sm text-muted-foreground mb-8 max-w-md mx-auto">
            Únete a estudiantes que ya están ahorrando tiempo en la
            planificación de sus cursos.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/dashboard/generate">
              <motion.div
                className="inline-block"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button
                  size="lg"
                  className="h-11 px-8 text-sm font-medium gap-2 rounded-lg"
                >
                  <Calendar className="w-4 h-4" />
                  Comenzar gratis
                </Button>
              </motion.div>
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
        </Reveal>
      </section>

      <Footer />
    </div>
    </MotionConfig>
  );
}
