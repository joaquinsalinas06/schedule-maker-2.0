"use client"

import { useState } from "react"
import { Calendar, ArrowRight, Users, BookOpen, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function LandingPage() {
  const [selectedUniversity, setSelectedUniversity] = useState<string | null>(null)

  const universities = [
    {
      id: "utec",
      name: "UTEC",
      fullName: "Universidad de Ingeniería y Tecnología",
      description: "Construye tu horario académico de manera inteligente",
      gradient: "from-purple-600 to-indigo-700"
    },
    {
      id: "other",
      name: "Otras Universidades",
      fullName: "Más universidades próximamente",
      description: "Pronto disponible para más instituciones",
      gradient: "from-gray-600 to-gray-700",
      disabled: true
    }
  ]

  const features = [
    {
      icon: Calendar,
      title: "Generación Automática",
      description: "Genera múltiples combinaciones de horarios automáticamente"
    },
    {
      icon: Users,
      title: "Colaboración",
      description: "Comparte y compara horarios con tus compañeros"
    },
    {
      icon: BookOpen,
      title: "Gestión Completa",
      description: "Administra cursos, secciones y preferencias fácilmente"
    },
    {
      icon: Zap,
      title: "Optimización",
      description: "Encuentra la mejor combinación según tus necesidades"
    }
  ]

  const handleUniversitySelect = (universityId: string) => {
    if (universityId === "other") return
    setSelectedUniversity(universityId)
  }

  const handleContinue = () => {
    if (selectedUniversity === "utec") {
      localStorage.setItem('selectedUniversity', 'UTEC')
      window.location.href = '/auth'
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 dark:from-slate-950 dark:via-purple-950 dark:to-slate-950">
      <div className="container mx-auto px-8 py-12">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="w-20 h-20 bg-gradient-to-br from-purple-600 to-indigo-700 rounded-2xl flex items-center justify-center shadow-xl mx-auto mb-6 transform hover:scale-105 transition-transform duration-200">
            <Calendar className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-5xl font-bold text-white mb-4">
            Schedule Maker
          </h1>
          <p className="text-xl text-purple-200 max-w-2xl mx-auto">
            La herramienta inteligente para crear y gestionar tus horarios académicos de forma eficiente
          </p>
        </div>

        {/* Features Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {features.map((feature, index) => {
            const Icon = feature.icon
            return (
              <Card 
                key={index} 
                className="bg-card/80 backdrop-blur-sm border-border shadow-xl hover:shadow-2xl transition-all duration-300 animate-in slide-in-from-bottom"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <CardHeader className="text-center">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <CardTitle className="text-lg text-foreground">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-center text-muted-foreground">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* University Selection */}
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-white mb-4">
              Selecciona tu Universidad
            </h2>
            <p className="text-purple-200">
              Elige tu institución para comenzar a crear tus horarios
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            {universities.map((university, index) => (
              <Card 
                key={university.id}
                className={`cursor-pointer transition-all duration-300 transform hover:scale-105 animate-in slide-in-from-bottom ${
                  selectedUniversity === university.id 
                    ? 'ring-2 ring-purple-500 bg-purple-100/10 border-purple-500' 
                    : 'bg-card/80 backdrop-blur-sm border-border hover:shadow-xl'
                } ${university.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                style={{ animationDelay: `${index * 150}ms` }}
                onClick={() => !university.disabled && handleUniversitySelect(university.id)}
              >
                <CardHeader className="text-center">
                  <div className={`w-16 h-16 bg-gradient-to-br ${university.gradient} rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg`}>
                    <span className="text-2xl font-bold text-white">
                      {university.name === "UTEC" ? "U" : "?"}
                    </span>
                  </div>
                  <CardTitle className="text-2xl text-foreground">{university.name}</CardTitle>
                  <CardDescription className="text-muted-foreground">
                    {university.fullName}
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-center">
                  <p className="text-muted-foreground mb-4">
                    {university.description}
                  </p>
                  {selectedUniversity === university.id && (
                    <div className="flex items-center justify-center text-purple-600 font-medium animate-in fade-in duration-300">
                      <span className="mr-2">✓</span>
                      Seleccionado
                    </div>
                  )}
                  {university.disabled && (
                    <div className="text-gray-500 text-sm">
                      Próximamente disponible
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Continue Button */}
          {selectedUniversity && (
            <div className="text-center animate-in slide-in-from-bottom duration-500">
              <Button 
                onClick={handleContinue}
                size="lg"
                className="bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white border-0 px-8 py-3 text-lg font-semibold transition-all duration-300 hover:scale-105 hover:shadow-xl"
              >
                Continuar con {universities.find(u => u.id === selectedUniversity)?.name}
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-16 text-purple-300/70">
          <p className="text-sm">
            © 2024 Schedule Maker. Desarrollado para optimizar tu experiencia académica.
          </p>
        </div>
      </div>
    </div>
  )
}