"use client"

import { useEffect } from "react"
import { authService } from "@/services/auth"

export default function HomePage() {
  useEffect(() => {
    // Check if user is authenticated
    if (typeof window !== 'undefined') {
      if (authService.isAuthenticated()) {
        // User is authenticated, redirect to dashboard
        window.location.href = '/dashboard'
      } else {
        // User is not authenticated, redirect to landing
        window.location.href = '/landing'
      }
    }
  }, [])

  // Show loading while redirecting
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
      <div className="text-white text-center">
        <div className="animate-spin h-8 w-8 border-2 border-white border-t-transparent rounded-full mx-auto mb-4"></div>
        <p>Cargando...</p>
      </div>
    </div>
  )
}