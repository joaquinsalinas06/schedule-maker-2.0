import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { parseCsvText } from "@/features/admin/logic/csvImport"
import { buildAnalysis, type ExistingCatalogData } from "@/features/admin/logic/analyzeDiff"
import type { CourseImportRow, ImportMode, ImportStats } from "@/features/admin/types"
import type { TablesUpdate } from "@/types/database"

export const runtime = "nodejs"

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

// Normalize a session's identity for update-mode matching: type/day/time only
// (location etc. are the fields allowed to change without creating a dupe).
function sessionSignature(type: string, day: string, start: string, end: string): string {
  const norm = (s: string) =>
    s
      .toLowerCase()
      .replace(/í/g, "i")
      .replace(/á/g, "a")
      .replace(/é/g, "e")
      .replace(/ó/g, "o")
      .replace(/ú/g, "u")
  return norm(`${type}|${day}|${start.slice(0, 5)}|${end.slice(0, 5)}`)
}

async function requireAdmin() {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) return { ok: false as const, status: 401, message: "No autenticado" }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", data.user.id).single()
  if (!profile || profile.role !== "admin") return { ok: false as const, status: 403, message: "Acceso denegado" }

  return { ok: true as const, userId: data.user.id }
}

async function parseRequest(request: Request) {
  const formData = await request.formData()
  const file = formData.get("file")
  const action = String(formData.get("action") ?? "")
  const mode = String(formData.get("mode") ?? "") as ImportMode
  const universityId = parseInt(String(formData.get("university_id") ?? "1"), 10) || 1

  if (!(file instanceof File)) throw new Error("Archivo no encontrado")
  if (!["analyze", "execute"].includes(action)) throw new Error(`Acción inválida: ${action}`)
  if (!["reset", "update"].includes(mode)) throw new Error(`Modo inválido: ${mode}`)

  const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase()
  if (ext !== ".csv") throw new Error(`Tipo de archivo '${ext}' no permitido. Solo se admite .csv`)
  if (file.size === 0) throw new Error("El archivo está vacío")
  if (file.size > MAX_FILE_SIZE) throw new Error(`Archivo muy grande (${(file.size / 1024 / 1024).toFixed(1)}MB). Máximo: 10MB`)

  const text = await file.text()
  return { action, mode, universityId, coursesData: parseCsvText(text) }
}

async function fetchExistingCatalog(universityId: number): Promise<ExistingCatalogData> {
  const admin = createAdminClient()
  const { data: courses } = await admin
    .from("courses")
    .select("id, code, name, department")
    .eq("university_id", universityId)
    .eq("is_active", true)
  const courseIds = (courses ?? []).map((c) => c.id)

  if (courseIds.length === 0) return { courses: courses ?? [], sections: [], sessions: [] }

  const { data: sections } = await admin
    .from("sections")
    .select("id, course_id, section_number, professor, capacity")
    .in("course_id", courseIds)
    .eq("is_active", true)
  const sectionIds = (sections ?? []).map((s) => s.id)

  const { data: sessions } = sectionIds.length
    ? await admin.from("sessions").select("id, section_id, day, start_time").in("section_id", sectionIds).eq("is_active", true)
    : { data: [] }

  return { courses: courses ?? [], sections: sections ?? [], sessions: sessions ?? [] }
}

async function executeReset(coursesData: CourseImportRow[], universityId: number): Promise<ImportStats> {
  const admin = createAdminClient()
  const stats: ImportStats = {
    mode: "reset",
    errors: [],
    courses_created: 0,
    sections_created: 0,
    sessions_created: 0,
  }

  const { data: existingCourses } = await admin.from("courses").select("id").eq("university_id", universityId).eq("is_active", true)
  const courseIds = (existingCourses ?? []).map((c) => c.id)

  if (courseIds.length > 0) {
    const { data: existingSections } = await admin.from("sections").select("id").in("course_id", courseIds)
    const sectionIds = (existingSections ?? []).map((s) => s.id)
    if (sectionIds.length > 0) {
      await admin.from("sessions").update({ is_active: false }).in("section_id", sectionIds)
    }
    await admin.from("sections").update({ is_active: false }).in("course_id", courseIds)
    await admin.from("courses").update({ is_active: false }).eq("university_id", universityId)
  }

  // Bulk insert fresh data. Correlate by natural key (code / section_number)
  // rather than assuming RETURNING preserves insert order.
  const { data: insertedCourses, error: courseErr } = await admin
    .from("courses")
    .insert(coursesData.map((c) => ({ code: c.code, name: c.name, department: c.department, university_id: universityId, is_active: true })))
    .select("id, code")
  if (courseErr) {
    stats.errors.push(`Error creando cursos: ${courseErr.message}`)
    return stats
  }
  stats.courses_created = insertedCourses?.length ?? 0
  const courseIdByCode = new Map((insertedCourses ?? []).map((c) => [c.code, c.id]))

  const sectionRows = coursesData.flatMap((c) =>
    c.sections.map((s) => ({
      course_id: courseIdByCode.get(c.code)!,
      section_number: s.section_number,
      capacity: s.capacity,
      enrolled: s.enrolled,
      professor: s.professor,
      professor_email: s.professor_email,
      is_active: true,
    }))
  )

  const sectionIdByKey = new Map<string, number>()
  for (const batch of chunk(sectionRows, 500)) {
    const { data: insertedSections, error } = await admin.from("sections").insert(batch).select("id, course_id, section_number")
    if (error) {
      stats.errors.push(`Error creando secciones: ${error.message}`)
      continue
    }
    for (const s of insertedSections ?? []) sectionIdByKey.set(`${s.course_id}|${s.section_number}`, s.id)
  }
  stats.sections_created = sectionIdByKey.size

  const sessionRows = coursesData.flatMap((c) =>
    c.sections.flatMap((s) => {
      const sectionId = sectionIdByKey.get(`${courseIdByCode.get(c.code)}|${s.section_number}`)
      if (!sectionId) return []
      return s.sessions.map((sess) => ({
        section_id: sectionId,
        session_type: sess.session_type,
        day: sess.day,
        start_time: sess.start_time,
        end_time: sess.end_time,
        location: sess.location,
        building: sess.building,
        room: sess.room,
        modality: sess.modality,
        frequency: sess.frequency,
        is_active: true,
      }))
    })
  )

  let sessionsCreated = 0
  for (const batch of chunk(sessionRows, 500)) {
    const { error, count } = await admin.from("sessions").insert(batch, { count: "exact" })
    if (error) stats.errors.push(`Error creando sesiones: ${error.message}`)
    else sessionsCreated += count ?? batch.length
  }
  stats.sessions_created = sessionsCreated

  return stats
}

async function executeUpdate(coursesData: CourseImportRow[], universityId: number): Promise<ImportStats> {
  const admin = createAdminClient()
  const stats: ImportStats = {
    mode: "update",
    errors: [],
    courses_created: 0,
    courses_updated: 0,
    sections_created: 0,
    sections_updated: 0,
    sections_deactivated: 0,
    sessions_created: 0,
    sessions_updated: 0,
    sessions_deactivated: 0,
  }

  const { data: existingCourses } = await admin
    .from("courses")
    .select("id, code, name, department")
    .eq("university_id", universityId)
  const existingByCode = new Map((existingCourses ?? []).map((c) => [c.code, c]))
  const existingIds = (existingCourses ?? []).map((c) => c.id)

  const { data: allSections } = existingIds.length
    ? await admin
        .from("sections")
        .select("id, course_id, section_number, capacity, enrolled, professor, professor_email, is_active")
        .in("course_id", existingIds)
    : { data: [] }
  const sectionsByCourse = new Map<number, typeof allSections>()
  for (const s of allSections ?? []) {
    const list = sectionsByCourse.get(s.course_id) ?? []
    list.push(s)
    sectionsByCourse.set(s.course_id, list as typeof allSections)
  }

  const sectionIds = (allSections ?? []).map((s) => s.id)
  const { data: allSessions } = sectionIds.length
    ? await admin
        .from("sessions")
        .select("id, section_id, session_type, day, start_time, end_time, location, building, room, modality, frequency, is_active")
        .in("section_id", sectionIds)
    : { data: [] }
  const sessionsBySection = new Map<number, typeof allSessions>()
  for (const s of allSessions ?? []) {
    const list = sessionsBySection.get(s.section_id) ?? []
    list.push(s)
    sessionsBySection.set(s.section_id, list as typeof allSessions)
  }

  // ponytail: per-course sequential loop, mirrors the original Python script's
  // row-by-row processing. Fine for admin one-off imports; batch if a real
  // file ever times out.
  for (const course of coursesData) {
    try {
      let courseId: number
      const existingCourse = existingByCode.get(course.code)
      if (existingCourse) {
        courseId = existingCourse.id
        if (existingCourse.name !== course.name || existingCourse.department !== course.department) {
          await admin.from("courses").update({ name: course.name, department: course.department }).eq("id", courseId)
          stats.courses_updated!++
        }
      } else {
        const { data: created, error } = await admin
          .from("courses")
          .insert({ code: course.code, name: course.name, department: course.department, university_id: universityId, is_active: true })
          .select("id")
          .single()
        if (error || !created) throw new Error(error?.message ?? "insert failed")
        courseId = created.id
        stats.courses_created!++
      }

      const existingSections = sectionsByCourse.get(courseId) ?? []
      const csvSectionNumbers = new Set(course.sections.map((s) => s.section_number))
      for (const section of existingSections) {
        if (!csvSectionNumbers.has(section.section_number) && section.is_active) {
          await admin.from("sections").update({ is_active: false }).eq("id", section.id)
          stats.sections_deactivated!++
        }
      }

      for (const sectionData of course.sections) {
        const existingSection = existingSections.find((s) => s.section_number === sectionData.section_number)
        let sectionId: number

        if (existingSection) {
          sectionId = existingSection.id
          const updates: TablesUpdate<"sections"> = {}
          if (existingSection.capacity !== sectionData.capacity) updates.capacity = sectionData.capacity
          if (existingSection.enrolled !== sectionData.enrolled) updates.enrolled = sectionData.enrolled
          if (existingSection.professor !== sectionData.professor) updates.professor = sectionData.professor
          if (existingSection.professor_email !== sectionData.professor_email) updates.professor_email = sectionData.professor_email
          if (!existingSection.is_active) updates.is_active = true
          if (Object.keys(updates).length > 0) {
            await admin.from("sections").update(updates).eq("id", sectionId)
            stats.sections_updated!++
          }
        } else {
          const { data: created, error } = await admin
            .from("sections")
            .insert({
              course_id: courseId,
              section_number: sectionData.section_number,
              capacity: sectionData.capacity,
              enrolled: sectionData.enrolled,
              professor: sectionData.professor,
              professor_email: sectionData.professor_email,
              is_active: true,
            })
            .select("id")
            .single()
          if (error || !created) throw new Error(error?.message ?? "insert failed")
          sectionId = created.id
          stats.sections_created!++
        }

        const existingSessions = sessionsBySection.get(sectionId) ?? []
        const csvSignatures = new Set(
          sectionData.sessions.map((s) => sessionSignature(s.session_type, s.day, s.start_time, s.end_time))
        )

        for (const existingSession of existingSessions) {
          if (!existingSession.is_active) continue
          const sig = sessionSignature(existingSession.session_type, existingSession.day, existingSession.start_time, existingSession.end_time)
          if (!csvSignatures.has(sig)) {
            await admin.from("sessions").update({ is_active: false }).eq("id", existingSession.id)
            stats.sessions_deactivated!++
          }
        }

        for (const sessionData of sectionData.sessions) {
          const sig = sessionSignature(sessionData.session_type, sessionData.day, sessionData.start_time, sessionData.end_time)
          const match = existingSessions.find(
            (s) => sessionSignature(s.session_type, s.day, s.start_time, s.end_time) === sig
          )

          if (match) {
            const updates: TablesUpdate<"sessions"> = {}
            if (match.location !== sessionData.location) updates.location = sessionData.location
            if (match.building !== sessionData.building) updates.building = sessionData.building
            if (match.room !== sessionData.room) updates.room = sessionData.room
            if (match.modality !== sessionData.modality) updates.modality = sessionData.modality
            if (match.frequency !== sessionData.frequency) updates.frequency = sessionData.frequency
            if (!match.is_active) updates.is_active = true
            if (Object.keys(updates).length > 0) {
              await admin.from("sessions").update(updates).eq("id", match.id)
              stats.sessions_updated!++
            }
          } else {
            await admin.from("sessions").insert({
              section_id: sectionId,
              session_type: sessionData.session_type,
              day: sessionData.day,
              start_time: sessionData.start_time,
              end_time: sessionData.end_time,
              location: sessionData.location,
              building: sessionData.building,
              room: sessionData.room,
              modality: sessionData.modality,
              frequency: sessionData.frequency,
              is_active: true,
            })
            stats.sessions_created!++
          }
        }
      }
    } catch (e) {
      stats.errors.push(`Error actualizando curso ${course.code}: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  return stats
}

export async function POST(request: Request) {
  const admin = await requireAdmin()
  if (!admin.ok) return NextResponse.json({ error: admin.message }, { status: admin.status })

  let parsed: Awaited<ReturnType<typeof parseRequest>>
  try {
    parsed = await parseRequest(request)
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Solicitud inválida" }, { status: 400 })
  }

  const { action, mode, universityId, coursesData } = parsed

  try {
    if (action === "analyze") {
      const existing = mode === "update" || mode === "reset" ? await fetchExistingCatalog(universityId) : undefined
      const analysis = buildAnalysis(mode, coursesData, existing)
      return NextResponse.json({ success: true, analysis })
    }

    // execute
    const stats = mode === "reset" ? await executeReset(coursesData, universityId) : await executeUpdate(coursesData, universityId)
    return NextResponse.json({
      success: true,
      message: `Importación completada exitosamente en modo ${mode}`,
      stats,
    })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error en la importación" }, { status: 500 })
  }
}
