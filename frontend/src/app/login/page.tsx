"use client"

import { useEffect } from "react"

export default function LoginPage() {
  useEffect(() => {
    // Redirect to new auth page
    if (typeof window !== 'undefined') {
      window.location.href = '/auth'
    }
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
      <div className="text-white text-center">
        <div className="animate-spin h-8 w-8 border-2 border-white border-t-transparent rounded-full mx-auto mb-4"></div>
        <p>Redirigiendo...</p>
      </div>
    </div>
  )
}