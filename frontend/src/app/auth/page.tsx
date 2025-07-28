"use client"

import { useState } from "react"
import { Calendar, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { authService } from "@/services/auth"

export default function AuthPage() {
  const [activeTab, setActiveTab] = useState("login")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  // Login form state
  const [loginForm, setLoginForm] = useState({
    email: "joaquinsainassalas@gmail.com",
    password: "12345678"
  })

  // Register form state
  const [registerForm, setRegisterForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    password: "",
    confirmPassword: "",
    student_id: "",
    university_id: 1 // UTEC ID
  })

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      await authService.login(loginForm)
      window.location.href = "/"
    } catch (err: unknown) {
      const errorMessage = (err as any)?.response?.data?.detail || 
                          (err as any)?.message || 
                          "Error al iniciar sesión"
      setError(typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage))
    } finally {
      setIsLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    // Validate passwords match
    if (registerForm.password !== registerForm.confirmPassword) {
      setError("Las contraseñas no coinciden")
      setIsLoading(false)
      return
    }

    // Validate password length
    if (registerForm.password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres")
      setIsLoading(false)
      return
    }

    try {
      await authService.register({
        first_name: registerForm.first_name,
        last_name: registerForm.last_name,
        email: registerForm.email,
        password: registerForm.password,
        student_id: registerForm.student_id,
        university_id: registerForm.university_id
      })
      window.location.href = "/"
    } catch (err: unknown) {
      const errorMessage = (err as any)?.response?.data?.detail || 
                          (err as any)?.message || 
                          "Error al crear cuenta"
      setError(typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage))
    } finally {
      setIsLoading(false)
    }
  }

  const goBackToLanding = () => {
    window.location.href = "/landing"
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 dark:from-slate-950 dark:via-purple-950 dark:to-slate-950 flex items-center justify-center p-8">
      <div className="w-full max-w-md">
        {/* Back to Landing Button */}
        <Button
          variant="ghost"
          onClick={goBackToLanding}
          className="mb-6 text-purple-200 hover:text-white hover:bg-purple-500/20"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver a selección de universidad
        </Button>

        <Card className="w-full bg-card/80 backdrop-blur-sm border-border shadow-xl">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-indigo-700 rounded-xl flex items-center justify-center shadow-lg mx-auto mb-4 transform hover:scale-105 transition-transform duration-200">
              <Calendar className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-2xl text-foreground">Schedule Maker</CardTitle>
            <CardDescription>Accede o crea tu cuenta para UTEC</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="login" className="transition-all duration-200">
                  Iniciar Sesión
                </TabsTrigger>
                <TabsTrigger value="register" className="transition-all duration-200">
                  Registrarse
                </TabsTrigger>
              </TabsList>

              <TabsContent value="login" className="space-y-4 animate-in slide-in-from-left duration-300">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <label htmlFor="login-email" className="text-sm font-medium text-foreground">
                      Email
                    </label>
                    <Input
                      id="login-email"
                      type="email"
                      value={loginForm.email}
                      onChange={(e) => setLoginForm({...loginForm, email: e.target.value})}
                      required
                      className="bg-background border-border text-foreground"
                      placeholder="tu.email@utec.edu.pe"
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="login-password" className="text-sm font-medium text-foreground">
                      Contraseña
                    </label>
                    <Input
                      id="login-password"
                      type="password"
                      value={loginForm.password}
                      onChange={(e) => setLoginForm({...loginForm, password: e.target.value})}
                      required
                      className="bg-background border-border text-foreground"
                      placeholder="••••••••"
                    />
                  </div>
                  {error && activeTab === "login" && (
                    <div className="text-red-400 text-sm bg-red-500/10 p-3 rounded-md border border-red-500/20 animate-in fade-in duration-300">
                      {error}
                    </div>
                  )}
                  <Button 
                    type="submit" 
                    className="w-full bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white border-0 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg" 
                    disabled={isLoading}
                  >
                    {isLoading && activeTab === "login" ? (
                      <span className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Iniciando sesión...
                      </span>
                    ) : (
                      "Iniciar Sesión"
                    )}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="register" className="space-y-4 animate-in slide-in-from-right duration-300">
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label htmlFor="register-first-name" className="text-sm font-medium text-foreground">
                        Nombre
                      </label>
                      <Input
                        id="register-first-name"
                        type="text"
                        value={registerForm.first_name}
                        onChange={(e) => setRegisterForm({...registerForm, first_name: e.target.value})}
                        required
                        className="bg-background border-border text-foreground"
                        placeholder="Juan"
                      />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="register-last-name" className="text-sm font-medium text-foreground">
                        Apellido
                      </label>
                      <Input
                        id="register-last-name"
                        type="text"
                        value={registerForm.last_name}
                        onChange={(e) => setRegisterForm({...registerForm, last_name: e.target.value})}
                        required
                        className="bg-background border-border text-foreground"
                        placeholder="Pérez"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="register-student-id" className="text-sm font-medium text-foreground">
                      Código de Estudiante
                    </label>
                    <Input
                      id="register-student-id"
                      type="text"
                      value={registerForm.student_id}
                      onChange={(e) => setRegisterForm({...registerForm, student_id: e.target.value})}
                      required
                      className="bg-background border-border text-foreground"
                      placeholder="201910123"
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="register-email" className="text-sm font-medium text-foreground">
                      Email
                    </label>
                    <Input
                      id="register-email"
                      type="email"
                      value={registerForm.email}
                      onChange={(e) => setRegisterForm({...registerForm, email: e.target.value})}
                      required
                      className="bg-background border-border text-foreground"
                      placeholder="tu.email@utec.edu.pe"
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="register-password" className="text-sm font-medium text-foreground">
                      Contraseña
                    </label>
                    <Input
                      id="register-password"
                      type="password"
                      value={registerForm.password}
                      onChange={(e) => setRegisterForm({...registerForm, password: e.target.value})}
                      required
                      minLength={8}
                      className="bg-background border-border text-foreground"
                      placeholder="••••••••"
                    />
                    <p className="text-xs text-muted-foreground">
                      Mínimo 8 caracteres
                    </p>
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="register-confirm-password" className="text-sm font-medium text-foreground">
                      Confirmar Contraseña
                    </label>
                    <Input
                      id="register-confirm-password"
                      type="password"
                      value={registerForm.confirmPassword}
                      onChange={(e) => setRegisterForm({...registerForm, confirmPassword: e.target.value})}
                      required
                      className="bg-background border-border text-foreground"
                      placeholder="••••••••"
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="register-university" className="text-sm font-medium text-foreground">
                      Universidad
                    </label>
                    <Input
                      id="register-university"
                      type="text"
                      value="UTEC"
                      disabled
                      className="bg-muted border-border text-foreground"
                    />
                  </div>
                  {error && activeTab === "register" && (
                    <div className="text-red-400 text-sm bg-red-500/10 p-3 rounded-md border border-red-500/20 animate-in fade-in duration-300">
                      {error}
                    </div>
                  )}
                  <Button 
                    type="submit" 
                    className="w-full bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white border-0 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg" 
                    disabled={isLoading}
                  >
                    {isLoading && activeTab === "register" ? (
                      <span className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Creando cuenta...
                      </span>
                    ) : (
                      "Crear Cuenta"
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-6 text-purple-300/70">
          <p className="text-sm">
            ¿Problemas con tu cuenta? Contacta al soporte técnico
          </p>
        </div>
      </div>
    </div>
  )
}