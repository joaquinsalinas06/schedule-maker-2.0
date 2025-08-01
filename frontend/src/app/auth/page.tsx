"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import {
  Calendar,
  Mail,
  Lock,
  User,
  ArrowLeft,
  Eye,
  EyeOff,
  Shield,
  Zap,
  CheckCircle,
  AlertCircle,
  Loader2,
} from "lucide-react"
import Link from "next/link"
import { authService } from "@/services/auth"

export default function AuthPage() {
  const [activeTab, setActiveTab] = useState("login")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    firstName: "",
    lastName: "",
    studentId: "",
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }))
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.email) {
      newErrors.email = "El correo electrónico es requerido"
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Ingresa un correo electrónico válido"
    }

    if (!formData.password) {
      newErrors.password = "La contraseña es requerida"
    } else if (formData.password.length < 6) {
      newErrors.password = "La contraseña debe tener al menos 6 caracteres"
    }

    if (activeTab === "register") {
      if (!formData.firstName) {
        newErrors.firstName = "El nombre es requerido"
      }
      if (!formData.lastName) {
        newErrors.lastName = "El apellido es requerido"
      }
      if (!formData.studentId) {
        newErrors.studentId = "El código de estudiante es requerido"
      }
      if (!formData.confirmPassword) {
        newErrors.confirmPassword = "Confirma tu contraseña"
      } else if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = "Las contraseñas no coinciden"
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return

    setIsLoading(true)
    try {
      if (activeTab === "login") {
        await authService.login({
          email: formData.email,
          password: formData.password
        })
      } else {
        await authService.register({
          first_name: formData.firstName,
          last_name: formData.lastName,
          email: formData.email,
          password: formData.password,
          student_id: formData.studentId,
          university_id: 1 // UTEC ID
        })
      }
      window.location.href = "/dashboard"
    } catch (error) {
      // Auth error
      setErrors({ general: "Error en la autenticación. Intenta nuevamente." })
    } finally {
      setIsLoading(false)
    }
  }

  const benefits = [
    {
      icon: Zap,
      title: "Acceso Instantáneo",
      description: "Comienza a crear horarios inmediatamente",
    },
    {
      icon: Shield,
      title: "Datos Seguros",
      description: "Tu información está protegida con encriptación",
    },
    {
      icon: CheckCircle,
      title: "Sincronización",
      description: "Accede desde cualquier dispositivo",
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
        {/* Left Side - Branding & Info */}
        <div className="space-y-8">
          <div>
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-white hover:text-cyan-300 transition-colors mb-8"
            >
              <ArrowLeft className="w-4 h-4" />
              Volver al inicio
            </Link>

            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-cyan-600 to-teal-700 rounded-xl flex items-center justify-center shadow-lg">
                <Calendar className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Schedule Maker</h1>
                <Badge className="bg-cyan-500/20 text-cyan-300 border-cyan-500/30 mt-1">Portal Académico</Badge>
              </div>
            </div>

            <h2 className="text-4xl font-bold text-white mb-4">
              Bienvenido a tu
              <span className="bg-gradient-to-r from-cyan-400 to-teal-400 bg-clip-text text-transparent">
                {" "}
                Futuro Académico
              </span>
            </h2>
            <p className="text-xl text-gray-300 mb-8">
              Únete a miles de estudiantes que ya optimizan su tiempo con nuestra plataforma inteligente.
            </p>
          </div>

          <div className="space-y-6">
            {benefits.map((benefit, index) => (
              <div
                key={index}
                className="flex items-start gap-4 animate-in slide-in-from-left duration-500"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-teal-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  <benefit.icon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-white font-semibold mb-1">{benefit.title}</h3>
                  <p className="text-gray-400 text-sm">{benefit.description}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-gradient-to-r from-cyan-500/20 to-teal-500/20 rounded-2xl p-6 border border-cyan-500/30 backdrop-blur-sm">
            <div className="flex items-center gap-3 mb-3">
              <CheckCircle className="w-5 h-5 text-green-400" />
              <span className="text-white font-semibold">Cuenta Verificada</span>
            </div>
            <p className="text-gray-300 text-sm">
              Tu cuenta será verificada automáticamente con tu correo institucional para garantizar la seguridad.
            </p>
          </div>
        </div>

        {/* Right Side - Auth Form */}
        <div className="w-full max-w-md mx-auto">
          <Card className="bg-card/95 backdrop-blur-sm border-border shadow-2xl">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl text-foreground">
                {activeTab === "login" ? "Iniciar Sesión" : "Crear Cuenta"}
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                {activeTab === "login" ? "Ingresa a tu cuenta de Schedule Maker" : "Crea tu cuenta para comenzar"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="login">Iniciar Sesión</TabsTrigger>
                  <TabsTrigger value="register">Registrarse</TabsTrigger>
                </TabsList>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <TabsContent value="login" className="space-y-4 mt-0">
                    <div className="space-y-2">
                      <Label htmlFor="email">Correo Electrónico</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                        <Input
                          id="email"
                          type="email"
                          placeholder="tu.correo@universidad.edu.pe"
                          value={formData.email}
                          onChange={(e) => handleInputChange("email", e.target.value)}
                          className={`pl-10 ${errors.email ? "border-red-500" : ""}`}
                        />
                      </div>
                      {errors.email && (
                        <div className="flex items-center gap-1 text-red-500 text-sm">
                          <AlertCircle className="w-3 h-3" />
                          {errors.email}
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="password">Contraseña</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          placeholder="Tu contraseña"
                          value={formData.password}
                          onChange={(e) => handleInputChange("password", e.target.value)}
                          className={`pl-10 pr-10 ${errors.password ? "border-red-500" : ""}`}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? (
                            <EyeOff className="w-4 h-4 text-muted-foreground" />
                          ) : (
                            <Eye className="w-4 h-4 text-muted-foreground" />
                          )}
                        </Button>
                      </div>
                      {errors.password && (
                        <div className="flex items-center gap-1 text-red-500 text-sm">
                          <AlertCircle className="w-3 h-3" />
                          {errors.password}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" className="rounded" />
                        <span className="text-muted-foreground">Recordarme</span>
                      </label>
                      <a href="#" className="text-cyan-400 hover:text-cyan-300 transition-colors">
                        ¿Olvidaste tu contraseña?
                      </a>
                    </div>
                  </TabsContent>

                  <TabsContent value="register" className="space-y-4 mt-0">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="firstName">Nombre</Label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                          <Input
                            id="firstName"
                            type="text"
                            placeholder="Juan"
                            value={formData.firstName}
                            onChange={(e) => handleInputChange("firstName", e.target.value)}
                            className={`pl-10 ${errors.firstName ? "border-red-500" : ""}`}
                          />
                        </div>
                        {errors.firstName && (
                          <div className="flex items-center gap-1 text-red-500 text-sm">
                            <AlertCircle className="w-3 h-3" />
                            {errors.firstName}
                          </div>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="lastName">Apellido</Label>
                        <Input
                          id="lastName"
                          type="text"
                          placeholder="Pérez"
                          value={formData.lastName}
                          onChange={(e) => handleInputChange("lastName", e.target.value)}
                          className={errors.lastName ? "border-red-500" : ""}
                        />
                        {errors.lastName && (
                          <div className="flex items-center gap-1 text-red-500 text-sm">
                            <AlertCircle className="w-3 h-3" />
                            {errors.lastName}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="studentId">Código de Estudiante</Label>
                      <Input
                        id="studentId"
                        type="text"
                        placeholder="202012345"
                        value={formData.studentId}
                        onChange={(e) => handleInputChange("studentId", e.target.value)}
                        className={errors.studentId ? "border-red-500" : ""}
                      />
                      {errors.studentId && (
                        <div className="flex items-center gap-1 text-red-500 text-sm">
                          <AlertCircle className="w-3 h-3" />
                          {errors.studentId}
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Correo Electrónico</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                        <Input
                          id="email"
                          type="email"
                          placeholder="tu.correo@universidad.edu.pe"
                          value={formData.email}
                          onChange={(e) => handleInputChange("email", e.target.value)}
                          className={`pl-10 ${errors.email ? "border-red-500" : ""}`}
                        />
                      </div>
                      {errors.email && (
                        <div className="flex items-center gap-1 text-red-500 text-sm">
                          <AlertCircle className="w-3 h-3" />
                          {errors.email}
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="password">Contraseña</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          placeholder="Mínimo 6 caracteres"
                          value={formData.password}
                          onChange={(e) => handleInputChange("password", e.target.value)}
                          className={`pl-10 pr-10 ${errors.password ? "border-red-500" : ""}`}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? (
                            <EyeOff className="w-4 h-4 text-muted-foreground" />
                          ) : (
                            <Eye className="w-4 h-4 text-muted-foreground" />
                          )}
                        </Button>
                      </div>
                      {errors.password && (
                        <div className="flex items-center gap-1 text-red-500 text-sm">
                          <AlertCircle className="w-3 h-3" />
                          {errors.password}
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Confirmar Contraseña</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                        <Input
                          id="confirmPassword"
                          type={showConfirmPassword ? "text" : "password"}
                          placeholder="Repite tu contraseña"
                          value={formData.confirmPassword}
                          onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
                          className={`pl-10 pr-10 ${errors.confirmPassword ? "border-red-500" : ""}`}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        >
                          {showConfirmPassword ? (
                            <EyeOff className="w-4 h-4 text-muted-foreground" />
                          ) : (
                            <Eye className="w-4 h-4 text-muted-foreground" />
                          )}
                        </Button>
                      </div>
                      {errors.confirmPassword && (
                        <div className="flex items-center gap-1 text-red-500 text-sm">
                          <AlertCircle className="w-3 h-3" />
                          {errors.confirmPassword}
                        </div>
                      )}
                    </div>

                    <div className="flex items-start gap-2 text-sm">
                      <input type="checkbox" className="rounded mt-0.5" required />
                      <span className="text-muted-foreground">
                        Acepto los{" "}
                        <a href="#" className="text-cyan-400 hover:text-cyan-300 transition-colors">
                          términos y condiciones
                        </a>{" "}
                        y la{" "}
                        <a href="#" className="text-cyan-400 hover:text-cyan-300 transition-colors">
                          política de privacidad
                        </a>
                      </span>
                    </div>
                  </TabsContent>

                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-cyan-500 to-teal-600 hover:from-cyan-600 hover:to-teal-700 text-white font-semibold py-3 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {activeTab === "login" ? "Iniciando sesión..." : "Creando cuenta..."}
                      </>
                    ) : (
                      <>{activeTab === "login" ? "Iniciar Sesión" : "Crear Cuenta"}</>
                    )}
                  </Button>
                </form>

                <div className="mt-6 text-center text-sm text-muted-foreground">
                  <p>
                    {activeTab === "login" ? "¿No tienes cuenta?" : "¿Ya tienes cuenta?"}{" "}
                    <button
                      type="button"
                      onClick={() => setActiveTab(activeTab === "login" ? "register" : "login")}
                      className="text-cyan-400 hover:text-cyan-300 transition-colors font-semibold"
                    >
                      {activeTab === "login" ? "Regístrate aquí" : "Inicia sesión"}
                    </button>
                  </p>
                </div>
              </Tabs>
            </CardContent>
          </Card>

          <div className="mt-6 text-center">
            <p className="text-gray-400 text-sm">
              ¿Necesitas ayuda?{" "}
              <a href="#" className="text-cyan-400 hover:text-cyan-300 transition-colors">
                Contacta soporte
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}