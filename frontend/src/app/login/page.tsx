"use client"

import { useState } from "react"
import { Calendar } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { authService } from "@/services/auth"

export default function LoginPage() {
  const [email, setEmail] = useState("joaquinsainassalas@gmail.com")
  const [password, setPassword] = useState("12345678")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      await authService.login({ email, password })
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 dark:from-slate-950 dark:via-purple-950 dark:to-slate-950 flex items-center justify-center p-8">
      <Card className="w-full max-w-md bg-card/80 backdrop-blur-sm border-border shadow-lg">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-indigo-700 rounded-xl flex items-center justify-center shadow-lg mx-auto mb-4">
            <Calendar className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl text-foreground">Schedule Maker</CardTitle>
          <CardDescription>Inicia sesión para gestionar tus horarios</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-foreground">
                Email
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-background border-border text-foreground"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium text-foreground">
                Contraseña
              </label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-background border-border text-foreground"
              />
            </div>
            {error && (
              <div className="text-red-400 text-sm">{error}</div>
            )}
            <Button 
              type="submit" 
              className="w-full bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white border-0" 
              disabled={isLoading}
            >
              {isLoading ? "Iniciando sesión..." : "Iniciar Sesión"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}