"use client"

import type { Metadata } from "next"
import { useState, useEffect } from "react"
import {
  Calendar,
  Users,
  ArrowRight,
  CheckCircle,
  Target,
  Clock,
  Smartphone,
  Play,
  PlusCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Link from "next/link"
import { Navbar } from "@/components/layout/navbar"
import { useToast } from "@/hooks/use-toast"
import { Footer } from "@/components/layout/footer"

export default function LandingPage() {
  const { toast } = useToast();
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    setIsVisible(true)
  }, [])

  const benefits = [
    {
      icon: Clock,
      title: "Ahorra Tiempo",
      description: "De horas a minutos en planificación",
    },
    {
      icon: Target,
      title: "Cero Conflictos",
      description: "Validación automática de horarios",
    },
    {
      icon: Users,
      title: "Trabajo en Equipo",
      description: "Coordina con compañeros fácilmente",
    },
    {
      icon: Smartphone,
      title: "Multiplataforma",
      description: "Funciona en cualquier dispositivo",
    },
  ]

  const universities = [
    {
      id: "utec",
      name: "UTEC",
      fullName: "Universidad de Ingeniería y Tecnología",
      logo: "🎓",
      color: "bg-cyan-600",
      hoverColor: "hover:bg-cyan-700",
    },
    {
      id: "upc",
      name: "UPC",
      fullName: "Universidad Peruana de Ciencias Aplicadas",
      logo: "🏛️",
      color: "bg-purple-600",
      hoverColor: "hover:bg-purple-700",
    },
    {
      id: "pucp",
      name: "PUCP",
      fullName: "Pontificia Universidad Católica del Perú",
      logo: "⛪",
      color: "bg-green-600",
      hoverColor: "hover:bg-green-700",
    },
    {
      id: "uni",
      name: "UNI",
      fullName: "Universidad Nacional de Ingeniería",
      logo: "🔧",
      color: "bg-orange-600",
      hoverColor: "hover:bg-orange-700",
    },
  ]

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 overflow-x-hidden">
      <Navbar />

      {/* Hero Section */}
      <section className="relative pt-24 pb-8 px-6 overflow-hidden">
        {/* Animated Background Gradient */}
        <div className="absolute inset-0 z-0 bg-gradient-to-br from-gray-900 via-gray-950 to-gray-900 animate-gradient-move"></div>

        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <div
            className={`transition-all duration-700 ${
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}
          >
            <Badge className="mb-6 bg-cyan-900/30 text-cyan-300 border-cyan-700/50 px-3 py-1 text-sm font-medium animate-in fade-in slide-in-from-top-4 duration-500">
              Optimiza tu tiempo académico
            </Badge>
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-8 leading-tight tracking-tight animate-in fade-in slide-in-from-top-8 duration-700 delay-100">
              Crea tu horario perfecto
              <br />
              <span className="text-cyan-400">en minutos</span>
            </h1>
            <p className="text-lg md:text-xl text-gray-300 mb-8 max-w-2xl mx-auto leading-relaxed animate-in fade-in slide-in-from-top-8 duration-700 delay-200">
              La herramienta más usada por estudiantes para generar horarios optimizados, evitar conflictos y colaborar
              con compañeros.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-in fade-in slide-in-from-top-8 duration-700 delay-300">
              <Link href="/auth">
                <Button
                  size="lg"
                  className="bg-cyan-600 hover:bg-cyan-700 text-white px-8 py-3 text-base font-semibold shadow-lg hover:shadow-xl transition-all duration-200 animate-bounce-subtle"
                >
                  Comenzar gratis
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
              <Button
                variant="outline"
                size="lg"
                className="border-gray-700 text-gray-300 hover:bg-gray-800 px-8 py-3 text-base font-medium bg-transparent transition-colors"
              >
                <Play className="w-4 h-4 mr-2" />
                Ver demo
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-6 bg-gray-950">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16 animate-in fade-in slide-in-from-top-8 duration-700">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Todo lo que necesitas</h2>
            <p className="text-lg text-gray-300 max-w-2xl mx-auto">
              Herramientas diseñadas específicamente para estudiantes universitarios
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {benefits.map((benefit, index) => (
              <Card
                key={index}
                className="group border border-gray-800 bg-gray-900 hover:border-gray-700 hover:shadow-lg transition-all duration-200 hover:scale-[1.02] animate-in fade-in slide-in-from-bottom-4 duration-500"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <CardHeader className="pb-4">
                  <div className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center mb-3 group-hover:rotate-6 transition-transform duration-300">
                    <benefit.icon className="w-5 h-5 text-gray-300 group-hover:text-cyan-400 transition-colors" />
                  </div>
                  <CardTitle className="text-white text-lg font-semibold">{benefit.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-400 text-sm">{benefit.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* University Specific Features (Tabbed) */}
      <section className="py-20 px-6 bg-gray-900">
        <div className="max-w-6xl mx-auto text-center">
          <div className="mb-8 animate-in fade-in slide-in-from-top-8 duration-700">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Explora por
              <span className="text-cyan-400"> Universidad</span>
            </h2>
            <p className="text-lg text-gray-300 max-w-2xl mx-auto mb-8">
              Ofrecemos una experiencia personalizada para cada institución.
            </p>
          </div>

          <Tabs defaultValue="utec" className="w-full max-w-4xl mx-auto">
            <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 h-auto bg-gray-800 p-1 rounded-lg mb-8">
              {universities.map((uni) => (
                <TabsTrigger
                  key={uni.id}
                  value={uni.id}
                  className="relative flex flex-col items-center justify-center py-3 px-2 text-gray-300 data-[state=active]:text-white data-[state=active]:bg-gray-700 data-[state=active]:shadow-md rounded-md transition-all duration-200 group"
                >
                  <span className="text-2xl mb-1">{uni.logo}</span>
                  <span className="text-sm font-medium">{uni.name}</span>
                  <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-0 h-1 bg-cyan-500 rounded-full transition-all duration-300 group-data-[state=active]:w-full"></span>
                </TabsTrigger>
              ))}
            </TabsList>

            {universities.map((uni) => (
              <TabsContent key={uni.id} value={uni.id} className="mt-0 animate-in fade-in duration-500">
                {uni.id === "utec" ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
                    <div className="group bg-gray-950 p-6 rounded-lg border border-gray-800 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
                      <CheckCircle className="w-6 h-6 text-green-500 mb-3 group-hover:scale-110 transition-transform duration-300" />
                      <h3 className="font-semibold text-white mb-2">Base de datos completa</h3>
                      <p className="text-gray-400 text-sm">Todos los cursos y secciones de UTEC actualizados</p>
                    </div>
                    <div className="group bg-gray-950 p-6 rounded-lg border border-gray-800 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
                      <CheckCircle className="w-6 h-6 text-green-500 mb-3 group-hover:scale-110 transition-transform duration-300" />
                      <h3 className="font-semibold text-white mb-2">Profesores incluidos</h3>
                      <p className="text-gray-400 text-sm">Información de profesores para cada sección</p>
                    </div>
                    <div className="group bg-gray-950 p-6 rounded-lg border border-gray-800 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-400">
                      <CheckCircle className="w-6 h-6 text-green-500 mb-3 group-hover:scale-110 transition-transform duration-300" />
                      <h3 className="font-semibold text-white mb-2">Siempre actualizado</h3>
                      <p className="text-gray-400 text-sm">Datos sincronizados cada semestre</p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Clock className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
                    <h3 className="text-xl font-semibold text-foreground mb-2">¡Próximamente en {uni.name}!</h3>
                    <p className="text-muted-foreground">
                      Estamos trabajando para llevar Schedule Maker a tu universidad.
                    </p>
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>

          <div className="text-center mt-16 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-500">
            <h2 className="text-2xl font-bold text-white mb-4">¿Tu universidad no está en la lista?</h2>
            <p className="text-lg text-gray-300 mb-6">
              Ayúdanos a expandirnos. Sugiere tu universidad y te notificaremos cuando esté disponible.
            </p>
            <Button
              size="lg"
              className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-3 text-base font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
              onClick={() => toast({
                title: '¡Gracias por tu sugerencia!',
                description: 'Nos pondremos en contacto pronto.',
                variant: 'success'
              })}
            >
              <PlusCircle className="w-4 h-4 mr-2" />
              Sugerir mi universidad
            </Button>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 bg-gray-900">
        <div className="max-w-4xl mx-auto text-center animate-in fade-in slide-in-from-top-8 duration-700">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Listo para crear tu horario perfecto</h2>
          <p className="text-lg text-gray-300 mb-8 max-w-2xl mx-auto">
            Únete a miles de estudiantes que ya han revolucionado su forma de planificar horarios
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
            <Link href="/auth">
              <Button
                size="lg"
                className="bg-cyan-600 hover:bg-cyan-700 text-white px-8 py-3 text-base font-semibold shadow-lg hover:shadow-xl transition-all duration-200 animate-bounce-subtle"
              >
                <Calendar className="w-4 h-4 mr-2" />
                Comenzar gratis
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <div className="flex items-center gap-2 text-gray-400 text-sm">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span>Gratis para estudiantes</span>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}