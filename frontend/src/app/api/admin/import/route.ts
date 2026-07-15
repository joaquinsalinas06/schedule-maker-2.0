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

  // Diff everything in memory first, then hit the DB with bulk operations:
  // one insert + one deactivate per table; per-row updates only for rows that
  // actually changed (typically a small minority of the file).

  // ── Courses ────────────────────────────────────────────────────────────────
  const newCourses = coursesData.filter((c) => !existingByCode.has(c.code))
  const courseIdByCode = new Map((existingCourses ?? []).map((c) => [c.code, c.id]))
  for (const batch of chunk(newCourses, 500)) {
    const { data, error } = await admin
      .from("courses")
      .insert(batch.map((c) => ({ code: c.code, name: c.name, department: c.department, university_id: universityId, is_active: true })))
      .select("id, code")
    if (error) {
      stats.errors.push(`Error creando cursos: ${error.message}`)
      continue
    }
    for (const c of data ?? []) courseIdByCode.set(c.code, c.id)
    stats.courses_created! += data?.length ?? 0
  }

  for (const course of coursesData) {
    const existing = existingByCode.get(course.code)
    if (existing && (existing.name !== course.name || existing.department !== course.department)) {
      const { error } = await admin.from("courses").update({ name: course.name, department: course.department }).eq("id", existing.id)
      if (error) stats.errors.push(`Error actualizando curso ${course.code}: ${error.message}`)
      else stats.courses_updated!++
    }
  }

  // ── Sections ───────────────────────────────────────────────────────────────
  const sectionByKey = new Map<string, NonNullable<typeof allSections>[number]>()
  for (const s of allSections ?? []) sectionByKey.set(`${s.course_id}|${s.section_number}`, s)

  const sectionKey = (courseCode: string, sectionNumber: string) => `${courseIdByCode.get(courseCode)}|${sectionNumber}`

  const csvSectionKeys = new Set(coursesData.flatMap((c) => c.sections.map((s) => sectionKey(c.code, s.section_number))))
  const sectionsToDeactivate = (allSections ?? []).filter((s) => s.is_active && !csvSectionKeys.has(`${s.course_id}|${s.section_number}`)).map((s) => s.id)
  for (const batch of chunk(sectionsToDeactivate, 500)) {
    const { error } = await admin.from("sections").update({ is_active: false }).in("id", batch)
    if (error) stats.errors.push(`Error desactivando secciones: ${error.message}`)
    else stats.sections_deactivated! += batch.length
  }

  const flatSections = coursesData.flatMap((c) => c.sections.map((s) => ({ courseCode: c.code, s })))
  const newSections = flatSections.filter(({ courseCode, s }) => !sectionByKey.has(sectionKey(courseCode, s.section_number)))
  const sectionIdByKey = new Map<string, number>()
  for (const [key, s] of sectionByKey) sectionIdByKey.set(key, s.id)
  for (const batch of chunk(newSections, 500)) {
    const { data, error } = await admin
      .from("sections")
      .insert(batch.map(({ courseCode, s }) => ({
        course_id: courseIdByCode.get(courseCode)!,
        section_number: s.section_number,
        capacity: s.capacity,
        enrolled: s.enrolled,
        professor: s.professor,
        professor_email: s.professor_email,
        is_active: true,
      })))
      .select("id, course_id, section_number")
    if (error) {
      stats.errors.push(`Error creando secciones: ${error.message}`)
      continue
    }
    for (const s of data ?? []) sectionIdByKey.set(`${s.course_id}|${s.section_number}`, s.id)
    stats.sections_created! += data?.length ?? 0
  }

  for (const { courseCode, s } of flatSections) {
    const existing = sectionByKey.get(sectionKey(courseCode, s.section_number))
    if (!existing) continue
    const updates: TablesUpdate<"sections"> = {}
    if (existing.capacity !== s.capacity) updates.capacity = s.capacity
    if (existing.enrolled !== s.enrolled) updates.enrolled = s.enrolled
    if (existing.professor !== s.professor) updates.professor = s.professor
    if (existing.professor_email !== s.professor_email) updates.professor_email = s.professor_email
    if (!existing.is_active) updates.is_active = true
    if (Object.keys(updates).length > 0) {
      const { error } = await admin.from("sections").update(updates).eq("id", existing.id)
      if (error) stats.errors.push(`Error actualizando sección ${courseCode}/${s.section_number}: ${error.message}`)
      else stats.sections_updated!++
    }
  }

  // ── Sessions ───────────────────────────────────────────────────────────────
  const sessionsToDeactivate: number[] = []
  const sessionsToCreate: Record<string, unknown>[] = []

  for (const { courseCode, s } of flatSections) {
    const sectionId = sectionIdByKey.get(sectionKey(courseCode, s.section_number))
    if (!sectionId) continue
    const existingSessions = sessionsBySection.get(sectionId) ?? []
    const csvSigs = new Set(s.sessions.map((x) => sessionSignature(x.session_type, x.day, x.start_time, x.end_time)))

    for (const es of existingSessions) {
      if (es.is_active && !csvSigs.has(sessionSignature(es.session_type, es.day, es.start_time, es.end_time))) {
        sessionsToDeactivate.push(es.id)
      }
    }

    for (const sess of s.sessions) {
      const sig = sessionSignature(sess.session_type, sess.day, sess.start_time, sess.end_time)
      const match = existingSessions.find((es) => sessionSignature(es.session_type, es.day, es.start_time, es.end_time) === sig)
      if (match) {
        const updates: TablesUpdate<"sessions"> = {}
        if (match.location !== sess.location) updates.location = sess.location
        if (match.building !== sess.building) updates.building = sess.building
        if (match.room !== sess.room) updates.room = sess.room
        if (match.modality !== sess.modality) updates.modality = sess.modality
        if (match.frequency !== sess.frequency) updates.frequency = sess.frequency
        if (!match.is_active) updates.is_active = true
        if (Object.keys(updates).length > 0) {
          const { error } = await admin.from("sessions").update(updates).eq("id", match.id)
          if (error) stats.errors.push(`Error actualizando sesión ${courseCode}: ${error.message}`)
          else stats.sessions_updated!++
        }
      } else {
        sessionsToCreate.push({
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
        })
      }
    }
  }

  for (const batch of chunk(sessionsToDeactivate, 500)) {
    const { error } = await admin.from("sessions").update({ is_active: false }).in("id", batch)
    if (error) stats.errors.push(`Error desactivando sesiones: ${error.message}`)
    else stats.sessions_deactivated! += batch.length
  }
  for (const batch of chunk(sessionsToCreate, 500)) {
    const { error } = await admin.from("sessions").insert(batch as never)
    if (error) stats.errors.push(`Error creando sesiones: ${error.message}`)
    else stats.sessions_created! += batch.length
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
