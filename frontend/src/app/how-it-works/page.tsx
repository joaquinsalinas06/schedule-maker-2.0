"use client"

import { useState } from "react"
import { Navbar } from "@/components/layout/navbar"
import { Footer } from "@/components/layout/footer"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  Search, 
  Calendar, 
  Users, 
  Share2, 
  Download, 
  Clock, 
  Settings,
  Eye,
  Code,
  Link as LinkIcon,
  UserPlus,
  MessageSquare,
  ChevronRight,
  BookOpen,
  Target,
  Zap
} from "lucide-react"
import Link from "next/link"

export default function HowItWorksPage() {
  const [activeSection, setActiveSection] = useState("")

  const sections = [
    { id: "getting-started", title: "Comenzando", icon: BookOpen },
    { id: "course-search", title: "Búsqueda de Cursos", icon: Search },
    { id: "schedule-generation", title: "Generación de Horarios", icon: Target },
    { id: "schedule-management", title: "Gestión de Horarios", icon: Calendar },
    { id: "sharing-features", title: "Compartir y Colaborar", icon: Share2 },
    { id: "collaboration", title: "Sesiones Colaborativas", icon: Users },
    { id: "comparison", title: "Comparación de Horarios", icon: Zap },
    { id: "friends-profile", title: "Amigos y Perfil", icon: UserPlus },
  ]

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 overflow-x-hidden">
      <Navbar />

      <main className="pt-24 pb-16 px-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center mb-16 animate-in fade-in slide-in-from-top-8 duration-700">
            <Badge className="mb-6 bg-cyan-900/30 text-cyan-300 border-cyan-700/50 px-3 py-1 text-sm font-medium">
              Documentación completa
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Guía completa de Schedule Maker
            </h1>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
              Aprende a usar todas las funcionalidades de Schedule Maker paso a paso. 
              Desde la búsqueda de cursos hasta las sesiones colaborativas avanzadas.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Navigation Sidebar */}
            <div className="lg:col-span-1">
              <Card className="sticky top-6 border-gray-800 bg-gray-900">
                <CardHeader>
                  <CardTitle className="text-white text-lg">Contenidos</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {sections.map((section) => (
                    <a
                      key={section.id}
                      href={`#${section.id}`}
                      onClick={() => setActiveSection(section.id)}
                      className={`flex items-center gap-3 p-3 rounded-lg transition-all duration-200 group ${
                        activeSection === section.id
                          ? "bg-cyan-900/30 text-cyan-300 border border-cyan-700/50"
                          : "hover:bg-gray-800 text-gray-300 hover:text-white"
                      }`}
                    >
                      <section.icon className="w-4 h-4" />
                      <span className="text-sm font-medium">{section.title}</span>
                      <ChevronRight className="w-3 h-3 ml-auto opacity-50 group-hover:opacity-100" />
                    </a>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* Main Content */}
            <div className="lg:col-span-3 space-y-12">
              
              {/* Getting Started Section */}
              <section id="getting-started" className="scroll-mt-6">
                <Card className="border-gray-800 bg-gray-900">
                  <CardHeader>
                    <div className="flex items-center gap-3 mb-2">
                      <BookOpen className="w-6 h-6 text-cyan-400" />
                      <CardTitle className="text-2xl text-white">Comenzando</CardTitle>
                    </div>
                    <p className="text-gray-300">Todo lo que necesitas saber para empezar</p>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="prose prose-gray prose-invert max-w-none">
                      <h3 className="text-lg font-semibold text-white mb-3">¿Qué es Schedule Maker?</h3>
                      <p className="text-gray-300 leading-relaxed">
                        Schedule Maker es una herramienta inteligente que te permite generar horarios universitarios 
                        optimizados automáticamente. En lugar de perder horas organizando manualmente tus clases, 
                        simplemente selecciona los cursos que necesitas y la aplicación generará todas las 
                        combinaciones posibles sin conflictos de horario.
                      </p>
                      
                      <h3 className="text-lg font-semibold text-white mb-3 mt-6">Para universidades UTEC</h3>
                      <div className="bg-cyan-900/20 border border-cyan-700/30 rounded-lg p-4">
                        <p className="text-cyan-300 text-sm">
                          <strong>¡Ventaja especial!</strong> Si eres estudiante de UTEC, los horarios ya están 
                          precargados en el sistema. Solo necesitas escribir 3 letras del código del curso 
                          (por ejemplo: "MAT" para Matemáticas) y aparecerán todas las opciones disponibles.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </section>

              {/* Course Search Section */}
              <section id="course-search" className="scroll-mt-6">
                <Card className="border-gray-800 bg-gray-900">
                  <CardHeader>
                    <div className="flex items-center gap-3 mb-2">
                      <Search className="w-6 h-6 text-green-400" />
                      <CardTitle className="text-2xl text-white">Búsqueda de Cursos</CardTitle>
                    </div>
                    <p className="text-gray-300">Cómo encontrar y seleccionar tus cursos</p>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-4">
                      <div className="border-l-4 border-green-500 pl-4">
                        <h4 className="font-semibold text-white mb-2">1. Búsqueda inteligente</h4>
                        <p className="text-gray-300 text-sm">
                          Escribe las primeras 3 letras del código del curso o parte del nombre. 
                          El sistema te mostrará sugerencias en tiempo real.
                        </p>
                      </div>
                      
                      <div className="border-l-4 border-green-500 pl-4">
                        <h4 className="font-semibold text-white mb-2">2. Selección de secciones</h4>
                        <p className="text-gray-300 text-sm">
                          Una vez que encuentres tu curso, verás todas las secciones disponibles con 
                          información detallada: profesor, horarios, modalidad y disponibilidad.
                        </p>
                      </div>
                      
                    </div>
                  </CardContent>
                </Card>
              </section>

              {/* Schedule Generation Section */}
              <section id="schedule-generation" className="scroll-mt-6">
                <Card className="border-gray-800 bg-gray-900">
                  <CardHeader>
                    <div className="flex items-center gap-3 mb-2">
                      <Target className="w-6 h-6 text-purple-400" />
                      <CardTitle className="text-2xl text-white">Generación de Horarios</CardTitle>
                    </div>
                    <p className="text-gray-300">El poder del botón "Generar"</p>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="bg-purple-900/20 border border-purple-700/30 rounded-lg p-4">
                      <h4 className="font-semibold text-purple-300 mb-2">🎯 ¿Cómo funciona el algoritmo?</h4>
                      <p className="text-gray-300 text-sm">
                        Una vez que selecciones todas las secciones de tus cursos, el botón "Generar Horarios" 
                        se activará. Al hacer clic, nuestro algoritmo inteligente:
                      </p>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-3">
                        <div className="flex items-start gap-3">
                          <div className="w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center text-xs font-bold text-white mt-0.5">1</div>
                          <div>
                            <h5 className="font-medium text-white">Analiza conflictos</h5>
                            <p className="text-gray-400 text-xs">Verifica que no haya solapamiento de horarios</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center text-xs font-bold text-white mt-0.5">2</div>
                          <div>
                            <h5 className="font-medium text-white">Genera combinaciones</h5>
                            <p className="text-gray-400 text-xs">Crea todas las combinaciones posibles válidas</p>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div className="flex items-start gap-3">
                          <div className="w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center text-xs font-bold text-white mt-0.5">3</div>
                          <div>
                            <h5 className="font-medium text-white">Optimiza horarios</h5>
                            <p className="text-gray-400 text-xs">Prioriza espacios libres y mejor distribución</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </section>

              {/* Schedule Management Section */}
              <section id="schedule-management" className="scroll-mt-6">
                <Card className="border-gray-800 bg-gray-900">
                  <CardHeader>
                    <div className="flex items-center gap-3 mb-2">
                      <Calendar className="w-6 h-6 text-blue-400" />
                      <CardTitle className="text-2xl text-white">Gestión de Horarios</CardTitle>
                    </div>
                    <p className="text-gray-300">Personaliza y ajusta tus horarios generados</p>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-4">
                      <div className="border-l-4 border-blue-500 pl-4">
                        <h4 className="font-semibold text-white mb-2">🕐 Filtros de tiempo</h4>
                        <p className="text-gray-300 text-sm mb-2">
                          Puedes configurar tu rango de horario preferido, por ejemplo de 6:00 AM a 11:00 PM:
                        </p>
                        <ul className="text-gray-400 text-xs space-y-1">
                          <li>• Establece hora más temprana que aceptas</li>
                          <li>• Define hora más tardía que prefieres</li>
                          <li>• El algoritmo respetará estos límites al generar horarios</li>
                        </ul>
                      </div>
                      
                      <div className="border-l-4 border-blue-500 pl-4">
                        <h4 className="font-semibold text-white mb-2">✏️ Edición post-generación</h4>
                        <p className="text-gray-300 text-sm mb-2">
                          Después de generar horarios, aún puedes:
                        </p>
                        <ul className="text-gray-400 text-xs space-y-1">
                          <li>• Agregar más cursos y regenerar</li>
                          <li>• Eliminar secciones que ya no necesites</li>
                          <li>• Cambiar secciones por otras del mismo curso</li>
                          <li>• Actualizar los horarios con los nuevos cambios</li>
                        </ul>
                      </div>
                      
                      <div className="border-l-4 border-blue-500 pl-4">
                        <h4 className="font-semibold text-white mb-2">👁️ Vista interactiva (Solo Web)</h4>
                        <p className="text-gray-300 text-sm">
                          En la vista de horario puedes hacer clic en cualquier clase para ver información 
                          detallada como profesor, aula, modalidad y código de la sección.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </section>

              {/* Sharing Features Section */}
              <section id="sharing-features" className="scroll-mt-6">
                <Card className="border-gray-800 bg-gray-900">
                  <CardHeader>
                    <div className="flex items-center gap-3 mb-2">
                      <Share2 className="w-6 h-6 text-orange-400" />
                      <CardTitle className="text-2xl text-white">Compartir y Colaborar</CardTitle>
                    </div>
                    <p className="text-gray-300">Múltiples formas de compartir tus horarios</p>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-orange-900/20 border border-orange-700/30 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Download className="w-4 h-4 text-orange-400" />
                          <h4 className="font-semibold text-white text-sm">Descargar</h4>
                        </div>
                        <p className="text-gray-300 text-xs">
                          Exporta tu horario como imagen PNG o PDF para imprimirlo o guardarlo localmente.
                        </p>
                      </div>
                      
                      <div className="bg-orange-900/20 border border-orange-700/30 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Code className="w-4 h-4 text-orange-400" />
                          <h4 className="font-semibold text-white text-sm">Código compartido</h4>
                        </div>
                        <p className="text-gray-300 text-xs">
                          Genera un código único de 8 caracteres que otros pueden usar para importar tu horario.
                        </p>
                      </div>
                      
                      <div className="bg-orange-900/20 border border-orange-700/30 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <LinkIcon className="w-4 h-4 text-orange-400" />
                          <h4 className="font-semibold text-white text-sm">Enlace directo</h4>
                        </div>
                        <p className="text-gray-300 text-xs">
                          Comparte un enlace directo que lleva a una vista pública de tu horario.
                        </p>
                      </div>
                    </div>
                    
                    <div className="bg-gray-800/50 rounded-lg p-4">
                      <h4 className="font-semibold text-white mb-2">💡 Casos de uso comunes:</h4>
                      <ul className="text-gray-300 text-sm space-y-1">
                        <li>• Coordinar horarios con compañeros de grupo</li>
                        <li>• Mostrar tu horario a padres o tutores</li>
                        <li>• Comparar opciones con amigos antes de matricularse</li>
                        <li>• Tener respaldo digital de tu horario final</li>
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              </section>

              {/* Quick Navigation */}
              <div className="text-center">
                <p className="text-gray-400 mb-4">¿Quieres empezar ahora?</p>
                <Link href="/auth">
                  <Button className="bg-cyan-600 hover:bg-cyan-700">
                    Comenzar a crear horarios
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </div>

              {/* Collaboration Section */}
              <section id="collaboration" className="scroll-mt-6">
                <Card className="border-gray-800 bg-gray-900">
                  <CardHeader>
                    <div className="flex items-center gap-3 mb-2">
                      <Users className="w-6 h-6 text-pink-400" />
                      <CardTitle className="text-2xl text-white">Sesiones Colaborativas</CardTitle>
                    </div>
                    <p className="text-gray-300">Trabaja en equipo para encontrar horarios compatibles</p>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="bg-pink-900/20 border border-pink-700/30 rounded-lg p-4">
                      <h4 className="font-semibold text-pink-300 mb-2">🎯 Dos tipos de sesiones</h4>
                      <p className="text-gray-300 text-sm">
                        Schedule Maker ofrece dos formas de trabajar: individual y colaborativa. 
                        Las sesiones colaborativas son perfectas para grupos que necesitan coordinar horarios.
                      </p>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="border-l-4 border-pink-500 pl-4">
                        <h4 className="font-semibold text-white mb-2">📋 Cursos individuales vs compartidos</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                          <div className="bg-gray-800/50 rounded p-3">
                            <h5 className="text-green-400 font-medium text-sm mb-1">Individuales</h5>
                            <p className="text-gray-300 text-xs">
                              Cursos que solo tú necesitas. Otros participantes no los verán.
                            </p>
                          </div>
                          <div className="bg-gray-800/50 rounded p-3">
                            <h5 className="text-blue-400 font-medium text-sm mb-1">Compartidos</h5>
                            <p className="text-gray-300 text-xs">
                              Cursos que todo el grupo debe tomar. Todos verán las mismas opciones.
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="border-l-4 border-pink-500 pl-4">
                        <h4 className="font-semibold text-white mb-2">🚪 Formas de unirse a una sesión</h4>
                        <div className="space-y-2">
                          <div className="flex items-start gap-2">
                            <UserPlus className="w-4 h-4 text-pink-400 mt-0.5" />
                            <div>
                              <h5 className="text-white text-sm font-medium">Invitación de amigo</h5>
                              <p className="text-gray-400 text-xs">Recibe invitación directa de un amigo en tu lista</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-2">
                            <Code className="w-4 h-4 text-pink-400 mt-0.5" />
                            <div>
                              <h5 className="text-white text-sm font-medium">Código de sesión</h5>
                              <p className="text-gray-400 text-xs">Ingresa un código de 8 caracteres compartido por el creador</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-2">
                            <LinkIcon className="w-4 h-4 text-pink-400 mt-0.5" />
                            <div>
                              <h5 className="text-white text-sm font-medium">Enlace directo</h5>
                              <p className="text-gray-400 text-xs">Haz clic en un enlace compartido para unirte automáticamente</p>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="border-l-4 border-pink-500 pl-4">
                        <h4 className="font-semibold text-white mb-2">⚙️ Construcción colaborativa</h4>
                        <p className="text-gray-300 text-sm mb-2">
                          Cuando varios usuarios trabajan en la misma sesión:
                        </p>
                        <ul className="text-gray-400 text-xs space-y-1">
                          <li>• Cada usuario agrega sus cursos individuales</li>
                          <li>• El creador define cursos compartidos para todo el grupo</li>
                          <li>• Al generar, se buscan horarios que funcionen para todos</li>
                          <li>• Se pueden comparar diferentes combinaciones en tiempo real</li>
                          <li>• Comentarios y chat para coordinar decisiones</li>
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </section>

              {/* Comparison Section */}
              <section id="comparison" className="scroll-mt-6">
                <Card className="border-gray-800 bg-gray-900">
                  <CardHeader>
                    <div className="flex items-center gap-3 mb-2">
                      <Zap className="w-6 h-6 text-yellow-400" />
                      <CardTitle className="text-2xl text-white">Comparación de Horarios</CardTitle>
                    </div>
                    <p className="text-gray-300">Compara múltiples horarios lado a lado</p>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="bg-yellow-900/20 border border-yellow-700/30 rounded-lg p-4">
                      <h4 className="font-semibold text-yellow-300 mb-2">⚡ Comparación inteligente</h4>
                      <p className="text-gray-300 text-sm">
                        La herramienta de comparación te permite ver hasta 4 horarios diferentes 
                        al mismo tiempo, identificando automáticamente conflictos y espacios libres comunes.
                      </p>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="border-l-4 border-yellow-500 pl-4">
                        <h4 className="font-semibold text-white mb-2">🔄 Cómo iniciar una comparación</h4>
                        <div className="space-y-2">
                          <div className="flex items-start gap-2">
                            <div className="w-5 h-5 bg-yellow-600 rounded-full flex items-center justify-center text-xs font-bold text-white mt-0.5">1</div>
                            <p className="text-gray-300 text-sm">Desde la vista de un horario, haz clic en "Comparar"</p>
                          </div>
                          <div className="flex items-start gap-2">
                            <div className="w-5 h-5 bg-yellow-600 rounded-full flex items-center justify-center text-xs font-bold text-white mt-0.5">2</div>
                            <p className="text-gray-300 text-sm">Agrega otros horarios usando códigos compartidos</p>
                          </div>
                          <div className="flex items-start gap-2">
                            <div className="w-5 h-5 bg-yellow-600 rounded-full flex items-center justify-center text-xs font-bold text-white mt-0.5">3</div>
                            <p className="text-gray-300 text-sm">O invita amigos a agregar sus horarios directamente</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="border-l-4 border-yellow-500 pl-4">
                        <h4 className="font-semibold text-white mb-2">👥 Comparación de grupo</h4>
                        <p className="text-gray-300 text-sm mb-2">
                          Perfecto para grupos de estudio que quieren encontrar horarios compatibles:
                        </p>
                        <ul className="text-gray-400 text-xs space-y-1">
                          <li>• Cada color representa el horario de una persona diferente</li>
                          <li>• Los conflictos se marcan automáticamente en rojo</li>
                          <li>• Los espacios libres comunes se destacan en verde</li>
                          <li>• Puedes ocultar/mostrar horarios individuales</li>
                          <li>• Exporta la comparación como imagen para el grupo</li>
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </section>

              {/* Friends & Profile Section */}
              <section id="friends-profile" className="scroll-mt-6">
                <Card className="border-gray-800 bg-gray-900">
                  <CardHeader>
                    <div className="flex items-center gap-3 mb-2">
                      <UserPlus className="w-6 h-6 text-cyan-400" />
                      <CardTitle className="text-2xl text-white">Amigos y Perfil</CardTitle>
                    </div>
                    <p className="text-gray-300">Conecta con compañeros y personaliza tu experiencia</p>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Friends Section */}
                      <div className="space-y-4">
                        <h4 className="font-semibold text-cyan-300 text-lg">👥 Sistema de Amigos</h4>
                        <div className="space-y-3">
                          <div className="bg-cyan-900/20 border border-cyan-700/30 rounded-lg p-3">
                            <h5 className="font-medium text-white text-sm mb-1">Agregar amigos</h5>
                            <p className="text-gray-300 text-xs">
                              Busca por nombre de usuario, correo o código de estudiante. 
                              Envía solicitudes que deben ser aceptadas.
                            </p>
                          </div>
                          <div className="bg-cyan-900/20 border border-cyan-700/30 rounded-lg p-3">
                            <h5 className="font-medium text-white text-sm mb-1">Funciones futuras</h5>
                            <p className="text-gray-300 text-xs">
                              El sistema de amigos habilitará funciones como notificaciones 
                              de horarios similares, grupos de estudio automáticos y más.
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      {/* Profile Section */}
                      <div className="space-y-4">
                        <h4 className="font-semibold text-cyan-300 text-lg">👤 Tu Perfil</h4>
                        <div className="space-y-3">
                          <div className="bg-cyan-900/20 border border-cyan-700/30 rounded-lg p-3">
                            <h5 className="font-medium text-white text-sm mb-1">Personalización</h5>
                            <div className="text-gray-300 text-xs space-y-1">
                              <p>• Nickname/apodo personalizado</p>
                              <p>• Descripción o bio personal</p>
                              <p>• Foto de perfil</p>
                              <p>• Universidad y carrera</p>
                            </div>
                          </div>
                          <div className="bg-cyan-900/20 border border-cyan-700/30 rounded-lg p-3">
                            <h5 className="font-medium text-white text-sm mb-1">Privacidad</h5>
                            <p className="text-gray-300 text-xs">
                              Controla qué información es visible para otros usuarios 
                              y quién puede enviarte solicitudes de amistad.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-gray-800/50 rounded-lg p-4">
                      <h4 className="font-semibold text-white mb-2">🌟 ¿Por qué usar amigos y perfil?</h4>
                      <p className="text-gray-300 text-sm">
                        Tener un perfil completo y una red de amigos en Schedule Maker te permitirá 
                        acceder a funciones colaborativas avanzadas, recibir recomendaciones personalizadas 
                        y formar parte de una comunidad de estudiantes que optimizan su tiempo académico.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </section>

              {/* Final CTA */}
              <section className="text-center bg-gradient-to-r from-cyan-900/20 to-purple-900/20 border border-cyan-700/30 rounded-xl p-8">
                <h2 className="text-2xl font-bold text-white mb-4">¿Listo para revolucionar tu planificación académica?</h2>
                <p className="text-gray-300 mb-6 max-w-2xl mx-auto">
                  Ahora que conoces todas las funciones, es hora de ponerlas en práctica. 
                  Crea tu cuenta gratuita y genera tu primer horario optimizado en minutos.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                  <Link href="/auth">
                    <Button size="lg" className="bg-cyan-600 hover:bg-cyan-700 text-white px-8 py-3">
                      Crear cuenta gratuita
                      <ChevronRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                  <Link href="/universities">
                    <Button variant="outline" size="lg" className="border-gray-700 text-gray-300 hover:bg-gray-800">
                      Ver universidades disponibles
                    </Button>
                  </Link>
                </div>
              </section>
              
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}