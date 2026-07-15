"use client"

import { useState } from "react"
import { Navbar } from "@/components/layout/navbar"
import { Footer } from "@/components/layout/footer"
import { Button } from "@/components/ui/button"
import {
  Search,
  Calendar,
  Share2,
  Download, 
  BookOpen,
  Target,
  Zap,
  ArrowRight,
  CheckCircle2,
  Star,
  UserPlus,
} from "lucide-react"
import Link from "next/link"

export default function HowItWorksPage() {
  const [activeSection, setActiveSection] = useState("getting-started")

  const sections = [
    { id: "getting-started", title: "Comenzando", icon: BookOpen },
    { id: "course-search", title: "Busqueda de Cursos", icon: Search },
    { id: "schedule-generation", title: "Generacion de Horarios", icon: Target },
    { id: "schedule-management", title: "Gestion de Horarios", icon: Calendar },
    { id: "sharing", title: "Compartir", icon: Share2 },
    { id: "friends", title: "Amigos", icon: UserPlus },
  ]

  const content: Record<string, {
    title: string
    description: string
    steps: { title: string; description: string }[]
    tip?: { title: string; content: string }
  }> = {
    "getting-started": {
      title: "Comenzando",
      description: "Schedule Maker es una herramienta inteligente que te permite generar horarios universitarios optimizados automaticamente.",
      steps: [
        {
          title: "Crea tu cuenta",
          description: "Registrate con tu correo institucional para acceder a todas las funcionalidades."
        },
        {
          title: "Selecciona tu universidad",
          description: "Actualmente UTEC esta disponible con todos los cursos y secciones actualizados."
        },
        {
          title: "Comienza a planificar",
          description: "Busca tus cursos, selecciona secciones y genera horarios en minutos."
        }
      ],
      tip: {
        title: "Ventaja UTEC",
        content: "Si eres estudiante de UTEC, los horarios ya estan precargados. Solo escribe 3 letras del codigo del curso para ver las opciones."
      }
    },
    "course-search": {
      title: "Busqueda de Cursos",
      description: "Encuentra y selecciona los cursos que necesitas con nuestro sistema de busqueda inteligente.",
      steps: [
        {
          title: "Busqueda inteligente",
          description: "Escribe las primeras 3 letras del codigo del curso o parte del nombre. El sistema te mostrara sugerencias en tiempo real."
        },
        {
          title: "Ver secciones disponibles",
          description: "Al seleccionar un curso, veras todas las secciones con informacion detallada: profesor, horarios, modalidad."
        },
        {
          title: "Selecciona multiples secciones",
          description: "Puedes seleccionar varias secciones del mismo curso. El algoritmo encontrara las mejores combinaciones."
        }
      ]
    },
    "schedule-generation": {
      title: "Generacion de Horarios",
      description: "Nuestro algoritmo analiza todas las combinaciones posibles y te presenta solo las validas.",
      steps: [
        {
          title: "Analisis de conflictos",
          description: "El sistema verifica automaticamente que no haya solapamiento de horarios entre tus cursos."
        },
        {
          title: "Generacion de combinaciones",
          description: "Crea todas las combinaciones posibles que respetan tus restricciones de tiempo."
        },
        {
          title: "Navegacion entre opciones",
          description: "Usa las flechas para navegar entre los diferentes horarios generados y encontrar el que mas te convenga."
        }
      ],
      tip: {
        title: "Consejo",
        content: "Mientras mas secciones selecciones por curso, mas opciones de horario tendras disponibles."
      }
    },
    "schedule-management": {
      title: "Gestion de Horarios",
      description: "Guarda, organiza y accede a tus horarios favoritos facilmente.",
      steps: [
        {
          title: "Agregar a favoritos",
          description: "Guarda los horarios que te gustan para acceder a ellos rapidamente desde la seccion 'Mis Horarios'."
        },
        {
          title: "Nombrar tus horarios",
          description: "Asigna nombres personalizados a tus horarios para identificarlos facilmente."
        },
        {
          title: "Descargar como imagen",
          description: "Exporta tu horario como imagen PNG para guardarlo o compartirlo."
        }
      ]
    },
    "sharing": {
      title: "Compartir Horarios",
      description: "Multiples formas de compartir tus horarios con companeros y familiares.",
      steps: [
        {
          title: "Descargar imagen",
          description: "Exporta tu horario como imagen PNG de alta calidad para imprimirlo o enviarlo."
        },
        {
          title: "Codigo compartido",
          description: "Genera un codigo unico que otros pueden usar para importar tu horario exacto."
        },
        {
          title: "Enlace directo",
          description: "Comparte un enlace que lleva directamente a una vista de tu horario."
        }
      ]
    },
    "friends": {
      title: "Sistema de Amigos",
      description: "Conecta con otros estudiantes y comparte horarios facilmente.",
      steps: [
        {
          title: "Buscar amigos",
          description: "Encuentra a tus companeros por nombre o codigo de estudiante."
        },
        {
          title: "Enviar solicitudes",
          description: "Envia solicitudes de amistad y gestiona las que recibes."
        },
        {
          title: "Ver horarios de amigos",
          description: "Una vez conectados, puedes ver los horarios que tus amigos comparten contigo."
        }
      ]
    }
  }

  const currentContent = content[activeSection]

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="pt-20 pb-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          {/* Header */}
          <div className="text-center py-12 border-b border-border">
            <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Como funciona
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Guia completa para aprovechar todas las funcionalidades de
              Schedule Maker.
            </p>
          </div>

          <div className="flex flex-col lg:flex-row gap-8 py-12">
            {/* Navigation Sidebar */}
            <aside className="lg:w-64 flex-shrink-0">
              <nav className="lg:sticky lg:top-20 space-y-1">
                {sections.map((section) => {
                  const Icon = section.icon;
                  const isActive = activeSection === section.id;
                  return (
                    <button
                      key={section.id}
                      onClick={() => setActiveSection(section.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors text-left ${
                        isActive
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:text-foreground hover:bg-accent"
                      }`}
                    >
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      <span>{section.title}</span>
                    </button>
                  );
                })}
              </nav>

              {/* CTA in sidebar */}
              <div className="mt-8 p-4 rounded-xl border border-border bg-card">
                <p className="text-sm text-muted-foreground mb-3">
                  Listo para empezar?
                </p>
                <Link href="/auth">
                  <Button size="sm" className="w-full gap-2">
                    Crear cuenta
                    <ArrowRight className="w-3 h-3" />
                  </Button>
                </Link>
              </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 min-w-0">
              <article className="animate-fade-in">
                <header className="mb-8">
                  <h2 className="text-2xl font-bold text-foreground mb-3">
                    {currentContent.title}
                  </h2>
                  <p className="text-muted-foreground leading-relaxed">
                    {currentContent.description}
                  </p>
                </header>

                {/* Steps */}
                <div className="space-y-6 mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-150 fill-mode-both">
                  {currentContent.steps.map((step, index) => (
                    <div
                      key={index}
                      className="flex gap-4 p-4 rounded-xl border border-border bg-card hover:border-primary/30 hover:shadow-md transition-all duration-300 hover:-translate-y-1"
                    >
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-semibold text-primary">
                          {index + 1}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-foreground mb-1">
                          {step.title}
                        </h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {step.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Tip */}
                {currentContent.tip && (
                  <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300 fill-mode-both">
                    <div className="flex items-start gap-3">
                      <Zap className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-semibold text-foreground mb-1">
                          {currentContent.tip.title}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {currentContent.tip.content}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </article>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
