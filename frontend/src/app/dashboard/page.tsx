"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function DashboardPage() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to the generate page by default
    router.replace('/dashboard/generate')
  }, [router])

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8">
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <div className="text-white">
            <h2 className="text-xl font-semibold mb-2">Cargando Dashboard...</h2>
            <p className="text-muted-foreground">Redirigiendo a generar horarios</p>
          </div>
        </div>
      </div>
    </div>
  )
}