"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Calendar,
  Mail,
  Lock,
  User as UserIcon,
  ArrowLeft,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import Link from "next/link";
import { authService } from "@/services/auth";
import { ButtonLoader } from "@/components/ui/loading-skeletons";

export default function AuthPage() {
  const [activeTab, setActiveTab] = useState("login");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    firstName: "",
    lastName: "",
    studentId: "",
    rememberMe: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.email) {
      newErrors.email = "El correo electronico es requerido";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Ingresa un correo electronico valido";
    }

    if (!formData.password) {
      newErrors.password = "La contrasena es requerida";
    } else if (formData.password.length < 6) {
      newErrors.password = "La contrasena debe tener al menos 6 caracteres";
    }

    if (activeTab === "register") {
      if (!formData.firstName) {
        newErrors.firstName = "El nombre es requerido";
      } else if (formData.firstName.trim().length < 2) {
        newErrors.firstName = "El nombre debe tener al menos 2 caracteres";
      }

      if (!formData.lastName) {
        newErrors.lastName = "El apellido es requerido";
      } else if (formData.lastName.trim().length < 2) {
        newErrors.lastName = "El apellido debe tener al menos 2 caracteres";
      }

      if (!formData.studentId) {
        newErrors.studentId = "El codigo de estudiante es requerido";
      } else if (!/^\d{9}$/.test(formData.studentId)) {
        newErrors.studentId = "El codigo debe tener exactamente 9 digitos";
      } else {
        const year = parseInt(formData.studentId.substring(0, 4));
        const cycle = parseInt(formData.studentId.substring(4, 5));
        const currentYear = new Date().getFullYear();

        if (year < 2016 || year > currentYear + 1) {
          newErrors.studentId = `El ano debe estar entre 2016 y ${currentYear + 1}`;
        } else if (cycle !== 1 && cycle !== 2) {
          newErrors.studentId = "El ciclo debe ser 1 o 2";
        }
      }

      if (!formData.confirmPassword) {
        newErrors.confirmPassword = "Confirma tu contrasena";
      } else if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = "Las contrasenas no coinciden";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      // Check for redirect parameter from middleware
      const params = new URLSearchParams(window.location.search);
      const redirectTo = params.get("redirect") || "/dashboard";

      if (activeTab === "login") {
        await authService.login({
          email: formData.email,
          password: formData.password,
          rememberMe: formData.rememberMe,
        });
        window.location.href = redirectTo;
      } else {
        await authService.register({
          first_name: formData.firstName,
          last_name: formData.lastName,
          email: formData.email,
          password: formData.password,
          student_id: formData.studentId,
          university_id: 1,
        });
        localStorage.removeItem("schedule-maker-first-time-user");
        window.location.href = redirectTo;
      }
    } catch (error) {
      console.error("Authentication error:", error);
      setErrors({ general: "Error en la autenticacion. Intenta nuevamente." });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left Side - Branding (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 bg-muted/30 border-r border-border flex-col justify-between p-12">
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-12"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver al inicio
          </Link>

          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <Calendar className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-semibold text-foreground">
              Schedule Maker
            </span>
          </div>

          <h1 className="text-3xl font-bold text-foreground mb-4 text-balance">
            Crea tu horario universitario perfecto
          </h1>
          <p className="text-muted-foreground leading-relaxed max-w-md">
            Unete a miles de estudiantes que ya optimizan su tiempo con nuestra
            plataforma inteligente.
          </p>
        </div>

        <div className="space-y-4">
          {[
            { icon: CheckCircle2, text: "Generacion automatica de horarios" },
            { icon: CheckCircle2, text: "Cero conflictos garantizados" },
            { icon: CheckCircle2, text: "Colaboracion en tiempo real" },
          ].map((item, index) => (
            <div
              key={index}
              className="flex items-center gap-3 text-sm text-muted-foreground"
            >
              <item.icon className="w-4 h-4 text-success" />
              <span>{item.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right Side - Auth Form */}
      <div className="flex-1 flex items-center justify-center p-6 animate-in fade-in zoom-in-95 duration-500">
        <div className="w-full max-w-sm">
          {/* Mobile back link */}
          <Link
            href="/"
            className="lg:hidden inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver
          </Link>

          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2.5 mb-8">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Calendar className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-semibold text-foreground">
              Schedule Maker
            </span>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-2">
              {activeTab === "login" ? "Bienvenido de nuevo" : "Crear cuenta"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {activeTab === "login"
                ? "Ingresa tus credenciales para continuar"
                : "Completa el formulario para crear tu cuenta"}
            </p>
          </div>

          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            <TabsList className="w-full grid grid-cols-2 mb-6">
              <TabsTrigger value="login">Ingresar</TabsTrigger>
              <TabsTrigger value="register">Registrarse</TabsTrigger>
            </TabsList>

            {/* General errors */}
            {errors.general && (
              <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                <div className="flex items-center gap-2 text-destructive text-sm">
                  <AlertCircle className="w-4 h-4" />
                  <span>{errors.general}</span>
                </div>
              </div>
            )}

            {/* Login and Registration Forms */}
            {(activeTab === "login" || activeTab === "register") && (
              <form onSubmit={handleSubmit} className="space-y-4">
                <TabsContent value="login" className="space-y-4 mt-0">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium">
                      Correo Electronico
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="tu.correo@utec.edu.pe"
                        value={formData.email}
                        onChange={(e) =>
                          handleInputChange("email", e.target.value)
                        }
                        className={`pl-10 h-10 ${errors.email ? "border-destructive" : ""}`}
                      />
                    </div>
                    {errors.email && (
                      <p className="text-xs text-destructive flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {errors.email}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-sm font-medium">
                      Contrasena
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Tu contrasena"
                        value={formData.password}
                        onChange={(e) =>
                          handleInputChange("password", e.target.value)
                        }
                        className={`pl-10 pr-10 h-10 ${errors.password ? "border-destructive" : ""}`}
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                    {errors.password && (
                      <p className="text-xs text-destructive flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {errors.password}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        className="rounded border-border"
                        checked={formData.rememberMe}
                        onChange={(e) =>
                          handleInputChange("rememberMe", e.target.checked)
                        }
                      />
                      <span className="text-muted-foreground">Recordarme</span>
                    </label>
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-10"
                    disabled={isLoading}
                  >
                    {isLoading ? <ButtonLoader /> : "Ingresar"}
                  </Button>
                </TabsContent>

                <TabsContent value="register" className="space-y-4 mt-0">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label
                        htmlFor="firstName"
                        className="text-sm font-medium"
                      >
                        Nombre
                      </Label>
                      <div className="relative">
                        <UserIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                        <Input
                          id="firstName"
                          type="text"
                          placeholder="Juan"
                          value={formData.firstName}
                          onChange={(e) => {
                            const value = e.target.value
                              .replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, "")
                              .replace(/\s+/g, " ")
                              .substring(0, 50);
                            handleInputChange("firstName", value);
                          }}
                          className={`pl-10 h-10 ${errors.firstName ? "border-destructive" : ""}`}
                        />
                      </div>
                      {errors.firstName && (
                        <p className="text-xs text-destructive">
                          {errors.firstName}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="lastName" className="text-sm font-medium">
                        Apellido
                      </Label>
                      <Input
                        id="lastName"
                        type="text"
                        placeholder="Perez"
                        value={formData.lastName}
                        onChange={(e) => {
                          const value = e.target.value
                            .replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, "")
                            .replace(/\s+/g, " ")
                            .substring(0, 50);
                          handleInputChange("lastName", value);
                        }}
                        className={`h-10 ${errors.lastName ? "border-destructive" : ""}`}
                      />
                      {errors.lastName && (
                        <p className="text-xs text-destructive">
                          {errors.lastName}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="studentId" className="text-sm font-medium">
                      Codigo de Estudiante
                    </Label>
                    <Input
                      id="studentId"
                      type="text"
                      placeholder="202310XXX"
                      maxLength={9}
                      value={formData.studentId}
                      onChange={(e) => {
                        const value = e.target.value
                          .replace(/\D/g, "")
                          .substring(0, 9);
                        handleInputChange("studentId", value);
                      }}
                      className={`h-10 ${errors.studentId ? "border-destructive" : ""}`}
                    />
                    {errors.studentId && (
                      <p className="text-xs text-destructive">
                        {errors.studentId}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="registerEmail"
                      className="text-sm font-medium"
                    >
                      Correo Electronico
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                      <Input
                        id="registerEmail"
                        type="email"
                        placeholder="tu.correo@utec.edu.pe"
                        value={formData.email}
                        onChange={(e) =>
                          handleInputChange("email", e.target.value)
                        }
                        className={`pl-10 h-10 ${errors.email ? "border-destructive" : ""}`}
                      />
                    </div>
                    {errors.email && (
                      <p className="text-xs text-destructive">{errors.email}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="registerPassword"
                      className="text-sm font-medium"
                    >
                      Contrasena
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                      <Input
                        id="registerPassword"
                        type={showPassword ? "text" : "password"}
                        placeholder="Minimo 6 caracteres"
                        value={formData.password}
                        onChange={(e) =>
                          handleInputChange("password", e.target.value)
                        }
                        className={`pl-10 pr-10 h-10 ${errors.password ? "border-destructive" : ""}`}
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                    {errors.password && (
                      <p className="text-xs text-destructive">
                        {errors.password}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="confirmPassword"
                      className="text-sm font-medium"
                    >
                      Confirmar Contrasena
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="Repite tu contrasena"
                        value={formData.confirmPassword}
                        onChange={(e) =>
                          handleInputChange("confirmPassword", e.target.value)
                        }
                        className={`pl-10 pr-10 h-10 ${errors.confirmPassword ? "border-destructive" : ""}`}
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        onClick={() =>
                          setShowConfirmPassword(!showConfirmPassword)
                        }
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                    {errors.confirmPassword && (
                      <p className="text-xs text-destructive">
                        {errors.confirmPassword}
                      </p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-10"
                    disabled={isLoading}
                  >
                    {isLoading ? <ButtonLoader /> : "Crear cuenta"}
                  </Button>
                </TabsContent>
              </form>
            )}
          </Tabs>
        </div>
      </div>
    </div>
  );
}
