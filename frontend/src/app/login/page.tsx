"use client"

import { useEffect } from "react"
import { DashboardSkeleton } from "@/components/ui/loading-skeletons"

export default function LoginPage() {
  useEffect(() => {
    // Redirect to new auth page
    if (typeof window !== 'undefined') {
      window.location.href = '/auth'
    }
  }, [])

  return <DashboardSkeleton />
}
