"use client"

import { createClient } from "@/lib/supabase/client"
import type { ImportAnalysis, ImportMode, ImportStats } from "./types"

async function postImport(action: "analyze" | "execute", file: File, mode: ImportMode, universityId: number) {
  const formData = new FormData()
  formData.append("file", file)
  formData.append("action", action)
  formData.append("mode", mode)
  formData.append("university_id", String(universityId))

  const res = await fetch("/api/admin/import", { method: "POST", body: formData })
  const body = await res.json()
  if (!res.ok) throw new Error(body.error ?? "Error en la importación")
  return body
}

export async function analyzeImport(file: File, mode: ImportMode, universityId = 1): Promise<{ success: boolean; analysis: ImportAnalysis }> {
  return postImport("analyze", file, mode, universityId)
}

export async function executeImport(file: File, mode: ImportMode, universityId = 1): Promise<{ success: boolean; message: string; stats: ImportStats }> {
  return postImport("execute", file, mode, universityId)
}

/** True if the signed-in user's profile has role 'admin'. */
export async function checkIsAdmin(): Promise<boolean> {
  const supabase = createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) return false

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", userData.user.id).single()
  return profile?.role === "admin"
}
