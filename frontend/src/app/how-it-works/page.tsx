"use client"

import { Navbar } from "@/components/layout/navbar"
import { Footer } from "@/components/layout/footer"

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 overflow-x-hidden">
      <Navbar />

      <main className="pt-24 pb-16 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16 animate-in fade-in slide-in-from-top-8 duration-700">
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">Cómo funciona</h1>
            <p className="text-lg text-gray-300 max-w-2xl mx-auto">Tres pasos simples para tener tu horario ideal</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="group text-center animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
              <div className="w-16 h-16 bg-cyan-100 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                <span className="text-2xl font-bold text-cyan-600">1</span>
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Selecciona tus cursos</h3>
              <p className="text-gray-300">Busca y elige los cursos que necesitas para tu ciclo académico</p>
            </div>
            <div className="group text-center animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                <span className="text-2xl font-bold text-green-600">2</span>
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Genera combinaciones</h3>
              <p className="text-gray-300">Nuestro algoritmo crea todas las combinaciones posibles sin conflictos</p>
            </div>
            <div className="group text-center animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                <span className="text-2xl font-bold text-purple-600">3</span>
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Elige y guarda</h3>
              <p className="text-gray-300">Selecciona tu horario favorito y guárdalo para el proceso de matrícula</p>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}