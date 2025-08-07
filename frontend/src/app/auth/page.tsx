"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import EmailVerification from "@/components/EmailVerification"
import { useEmailVerification } from "@/hooks/useEmailVerification"
import {
  Calendar,
  Mail,
  Lock,
  User as UserIcon,
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
  const [registrationStep, setRegistrationStep] = useState<'form' | 'verify' | 'complete'>('form')
  const { checkStatus } = useEmailVerification()
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    firstName: "",
    lastName: "",
    studentId: "",
    rememberMe: false,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleInputChange = (field: string, value: string | boolean) => {
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
      // First Name validation
      if (!formData.firstName) {
        newErrors.firstName = "El nombre es requerido"
      } else if (formData.firstName.trim().length < 2) {
        newErrors.firstName = "El nombre debe tener al menos 2 caracteres"
      } else if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(formData.firstName)) {
        newErrors.firstName = "El nombre solo puede contener letras y espacios"
      }

      // Last Name validation
      if (!formData.lastName) {
        newErrors.lastName = "El apellido es requerido"
      } else if (formData.lastName.trim().length < 2) {
        newErrors.lastName = "El apellido debe tener al menos 2 caracteres"
      } else if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(formData.lastName)) {
        newErrors.lastName = "El apellido solo puede contener letras y espacios"
      }

      // UTEC Student ID validation
      if (!formData.studentId) {
        newErrors.studentId = "El código de estudiante es requerido"
      } else if (!/^\d{9}$/.test(formData.studentId)) {
        newErrors.studentId = "El código debe tener exactamente 9 dígitos"
      } else {
        // Validate UTEC code format: YYYYCXXXX
        const year = parseInt(formData.studentId.substring(0, 4))
        const cycle = parseInt(formData.studentId.substring(4, 5))
        const currentYear = new Date().getFullYear()
        
        if (year < 2016 || year > currentYear + 1) {
          newErrors.studentId = `El año debe estar entre 2016 y ${currentYear + 1}`
        } else if (cycle !== 1 && cycle !== 2) {
          newErrors.studentId = "El ciclo debe ser 1 (primer semestre) o 2 (segundo semestre)"
        }
      }

      // Password confirmation validation
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
          password: formData.password,
          rememberMe: formData.rememberMe
        })
        window.location.href = "/dashboard"
      } else {
        // For registration, first check if email verification is required
        if (registrationStep === 'form') {
          // Check if email is already verified
          const status = await checkStatus(formData.email)
          if (status?.is_verified) {
            setRegistrationStep('complete')
            // Proceed with registration
            await authService.register({
              first_name: formData.firstName,
              last_name: formData.lastName,
              email: formData.email,
              password: formData.password,
              student_id: formData.studentId,
              university_id: 1 // UTEC ID
            })
            // Registration successful - ensure first-time user popup shows
            localStorage.removeItem('schedule-maker-first-time-user')
            window.location.href = "/dashboard"
          } else {
            // Email not verified, show verification step
            setRegistrationStep('verify')
          }
        }
      }
    } catch (error) {
      console.error('Authentication error:', error)
      setErrors({ general: "Error en la autenticación. Intenta nuevamente." })
      if (activeTab === "register") {
        setRegistrationStep('form')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleEmailVerificationComplete = async () => {
    setRegistrationStep('complete')
    setIsLoading(true)
    
    try {
      // Email is verified, now complete the registration
      await authService.register({
        first_name: formData.firstName,
        last_name: formData.lastName,
        email: formData.email,
        password: formData.password,
        student_id: formData.studentId,
        university_id: 1 // UTEC ID
      })
      // Registration successful - ensure first-time user popup shows
      localStorage.removeItem('schedule-maker-first-time-user')
      window.location.href = "/dashboard"
    } catch (error) {
      console.error('Registration error:', error)
      setErrors({ general: "Error al crear la cuenta. Intenta nuevamente." })
      setRegistrationStep('form')
    } finally {
      setIsLoading(false)
    }
  }

  const goBackToForm = () => {
    setRegistrationStep('form')
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

                {/* Show general errors */}
                {errors.general && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                    <div className="flex items-center gap-2 text-red-700">
                      <AlertCircle className="w-4 h-4" />
                      <span className="text-sm">{errors.general}</span>
                    </div>
                  </div>
                )}

                {/* Registration Email Verification Step */}
                {activeTab === "register" && registrationStep === 'verify' && (
                  <div className="space-y-4">
                    <div className="text-center mb-4">
                      <h3 className="text-lg font-semibold text-foreground mb-2">
                        Verificar Email
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Antes de crear tu cuenta, necesitamos verificar tu email
                      </p>
                    </div>
                    
                    <EmailVerification
                      email={formData.email}
                      onVerificationComplete={handleEmailVerificationComplete}
                      isEmbedded={true}
                    />
                    
                    <Button
                      type="button"
                      variant="outline"
                      onClick={goBackToForm}
                      className="w-full"
                      disabled={isLoading}
                    >
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Cambiar Email
                    </Button>
                  </div>
                )}

                {/* Registration Complete Step */}
                {activeTab === "register" && registrationStep === 'complete' && (
                  <div className="space-y-4">
                    <div className="text-center">
                      <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        {isLoading ? (
                          <Loader2 className="w-6 h-6 text-green-600 animate-spin" />
                        ) : (
                          <CheckCircle className="w-6 h-6 text-green-600" />
                        )}
                      </div>
                      <h3 className="text-lg font-semibold text-foreground mb-2">
                        {isLoading ? "Creando tu cuenta..." : "¡Email verificado!"}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {isLoading 
                          ? "Configurando tu perfil y redirigiendo al dashboard..." 
                          : "Tu cuenta ha sido creada exitosamente."
                        }
                      </p>
                    </div>
                  </div>
                )}

                {/* Login and Registration Forms */}
                {(activeTab === "login" || (activeTab === "register" && registrationStep === 'form')) && (
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
                        <input 
                          type="checkbox" 
                          className="rounded" 
                          checked={formData.rememberMe}
                          onChange={(e) => handleInputChange("rememberMe", e.target.checked)}
                        />
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
                          <UserIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                          <Input
                            id="firstName"
                            type="text"
                            placeholder="Juan"
                            value={formData.firstName}
                            onChange={(e) => {
                              // Clean and format name input
                              const value = e.target.value
                                .replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, '') // Only letters and spaces
                                .replace(/\s+/g, ' ') // Single spaces only
                                .substring(0, 50); // Max length
                              handleInputChange("firstName", value);
                            }}
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
                          onChange={(e) => {
                            // Clean and format name input
                            const value = e.target.value
                              .replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, '') // Only letters and spaces
                              .replace(/\s+/g, ' ') // Single spaces only
                              .substring(0, 50); // Max length
                            handleInputChange("lastName", value);
                          }}
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
                      <Label htmlFor="studentId">Código de Estudiante UTEC</Label>
                      <Input
                        id="studentId"
                        type="text"
                        placeholder="202210604"
                        value={formData.studentId}
                        onChange={(e) => {
                          // Only allow numbers and limit to 9 digits
                          const value = e.target.value.replace(/\D/g, '').slice(0, 9);
                          handleInputChange("studentId", value);
                        }}
                        maxLength={9}
                        className={errors.studentId ? "border-red-500" : ""}
                      />
                      <p className="text-xs text-muted-foreground">
                        Formato: AAAACXXXX (Año + Ciclo + 4 dígitos). Ej: 202210604
                      </p>
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
                          {activeTab === "login" ? "Iniciando sesión..." : "Verificando email..."}
                        </>
                      ) : (
                        <>{activeTab === "login" ? "Iniciar Sesión" : "Continuar"}</>
                      )}
                    </Button>
                  </form>
                )}

                {/* Bottom text for tab switching */}
                {(activeTab === "login" || (activeTab === "register" && registrationStep === 'form')) && (
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
                )}
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}