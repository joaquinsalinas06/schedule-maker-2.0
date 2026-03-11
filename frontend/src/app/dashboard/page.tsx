"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { DashboardSkeleton } from "@/components/ui/loading-skeletons"

export default function DashboardPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/dashboard/generate')
  }, [router])

  return <DashboardSkeleton />
}
