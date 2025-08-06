"use client"

import { Navbar } from "@/components/layout/navbar"
import { Footer } from "@/components/layout/footer"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Users, Clock, ArrowRight, PlusCircle } from "lucide-react"
import Link from "next/link"

export default function UniversitiesPage() {
  const universities = [
    {
      name: "UTEC",
      fullName: "Universidad de Ingeniería y Tecnología",
      available: true,
      logo: "🎓",
      color: "bg-cyan-600",
      hoverColor: "hover:bg-cyan-700",
    },
    {
      name: "UPC",
      fullName: "Universidad Peruana de Ciencias Aplicadas",
      available: false,
      logo: "🏛️",
      color: "bg-purple-600",
      hoverColor: "hover:bg-purple-700",
    },
    {
      name: "PUCP",
      fullName: "Pontificia Universidad Católica del Perú",
      available: false,
      logo: "⛪",
      color: "bg-green-600",
      hoverColor: "hover:bg-green-700",
    },
    {
      name: "UNI",
      fullName: "Universidad Nacional de Ingeniería",
      available: false,
      logo: "🔧",
      color: "bg-orange-600",
      hoverColor: "hover:bg-orange-700",
    },
  ]

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 overflow-x-hidden">
      <Navbar />

      <main className="pt-24 pb-16 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16 animate-in fade-in slide-in-from-top-8 duration-700">
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Universidades
              <span className="text-cyan-400"> Disponibles</span>
            </h1>
            <p className="text-lg text-gray-300 max-w-3xl mx-auto">
              UTEC ya está disponible, pero nos encantaría tener tu universidad también
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {universities.map((university, index) => (
              <Card
                key={index}
                className={`relative overflow-hidden transition-all duration-300 ${
                  university.available
                    ? "bg-gray-900 border-gray-800 hover:scale-105 hover:shadow-lg cursor-pointer"
                    : "bg-gray-900/50 border-gray-800/50 opacity-70"
                } animate-in fade-in slide-in-from-bottom-4 duration-500`}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {university.available && (
                  <div className="absolute top-4 right-4">
                    <Badge className="bg-green-600 text-white animate-pulse-slow">Disponible</Badge>
                  </div>
                )}
                <CardHeader className="text-center">
                  <div className="text-4xl mb-4">{university.logo}</div>
                  <CardTitle className="text-white text-xl">{university.name}</CardTitle>
                  <CardDescription className="text-gray-300 text-sm">{university.fullName}</CardDescription>
                </CardHeader>
                <CardContent className="text-center">
                  {university.available ? (
                    <Link href="/auth">
                      <Button className={`w-full ${university.color} ${university.hoverColor} text-white`}>
                        Ingresar a {university.name}
                        <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                      </Button>
                    </Link>
                  ) : (
                    <Button disabled className={`w-full ${university.color} text-white opacity-50 cursor-not-allowed`}>
                      Próximamente
                      <Clock className="w-4 h-4 ml-2" />
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="text-center mt-16 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-500">
            <h2 className="text-2xl font-bold text-white mb-4">¿Tu universidad no está en la lista?</h2>
            <p className="text-lg text-gray-300 mb-6">
              Ayúdanos a expandirnos. Envíanos un email sugiriendo tu universidad.
            </p>
            <a href="mailto:joaquin.salinas@utec.edu.pe?subject=Sugerencia de Universidad&body=Hola, me gustaría sugerir que agreguen mi universidad al sistema de generación de horarios.%0A%0AUniversidad: [Nombre de tu universidad]%0ANombre: [Tu nombre]%0AComentarios adicionales: [Opcional]">
              <Button
                size="lg"
                className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-3 text-base font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
              >
                <PlusCircle className="w-4 h-4 mr-2" />
                Sugerir mi universidad
              </Button>
            </a>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}