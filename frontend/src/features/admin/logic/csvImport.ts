// Pure CSV parsing logic for the admin course importer.
// Ported from backend/scripts/csv_import.py + csv_update.py (identical parse_csv_file
// logic in both) — same header names, same hierarchical section grouping quirks for
// specific course families ("Finanzas", "Ecuaciones", "TEORÍA VIRTUAL", decimal labs).
// No supabase import here: the route handler and any future preview UI share this.
import type { CourseImportRow, SectionImportRow, SessionImportRow } from "../types"

const SPANISH_DAYS: Record<string, string> = {
  Lun: "Monday",
  Mar: "Tuesday",
  Mie: "Wednesday",
  Mié: "Wednesday",
  Jue: "Thursday",
  Vie: "Friday",
  Sab: "Saturday",
  Dom: "Sunday",
}

// --- CSV text -> rows -------------------------------------------------------
// Minimal RFC4180 parser (quoted fields, escaped "" quotes, CRLF/LF). No
// dependency added: the format here is simple exported spreadsheet CSV.
function parseCsvRows(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ""
  let inQuotes = false

  const pushField = () => {
    row.push(field)
    field = ""
  }
  const pushRow = () => {
    pushField()
    rows.push(row)
    row = []
  }

  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        field += c
      }
    } else {
      if (c === '"') {
        inQuotes = true
      } else if (c === ",") {
        pushField()
      } else if (c === "\r") {
        // skip, \n handles the row break
      } else if (c === "\n") {
        pushRow()
      } else {
        field += c
      }
    }
  }
  // trailing field/row (file may or may not end with a newline)
  if (field.length > 0 || row.length > 0) pushRow()

  return rows.filter((r) => r.some((cell) => cell.trim() !== ""))
}

function parseTime(raw: string | undefined): string | null {
  if (!raw) return null
  const s = raw.trim()
  if (!s) return null
  if (s.includes(":")) {
    const [h, m] = s.split(":")
    const hh = parseInt(h, 10)
    const mm = parseInt(m, 10)
    if (Number.isNaN(hh) || Number.isNaN(mm)) return null
    return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`
  }
  if (s.length === 4 && /^\d{4}$/.test(s)) {
    const hh = parseInt(s.slice(0, 2), 10)
    const mm = parseInt(s.slice(2), 10)
    return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`
  }
  return null
}

function parseSchedule(raw: string | undefined): { days: string[]; start: string | null; end: string | null } {
  if (!raw) return { days: [], start: null, end: null }
  const scheduleStr = raw.trim()
  const timeMatch = scheduleStr.match(/(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/)
  if (!timeMatch || timeMatch.index === undefined) return { days: [], start: null, end: null }

  const start = parseTime(timeMatch[1])
  const end = parseTime(timeMatch[2])
  if (!start || !end) return { days: [], start: null, end: null }

  const daysPart = scheduleStr.slice(0, timeMatch.index).trim()
  const days: string[] = []
  const dayTokens = daysPart.match(/[A-ZÁÉÍÓÚ][a-záéíóú]+/g) ?? []
  for (const token of dayTokens) {
    const abbr = token.replace(/\.$/, "")
    if (SPANISH_DAYS[abbr]) days.push(SPANISH_DAYS[abbr])
  }
  return { days, start, end }
}

function extractBuilding(location: string): string {
  if (!location) return ""
  const match = location.match(/^([^A-Z0-9]*[A-Z-]+)/)
  return match ? match[1].trim() : ""
}

function extractRoom(location: string): string {
  if (!location) return ""
  const match = location.match(/([A-Z]\d+)/)
  return match ? match[1] : ""
}

// --- Row shape used during hierarchical grouping ---------------------------
interface SessionMeta {
  session: SessionImportRow
  professor: string
  professorEmail: string
  capacity: number
  enrolled: number
  sessionGroup: string
  sectionNum: string
  courseName: string
}

function get(row: Record<string, string>, key: string, fallback = ""): string {
  const v = row[key]
  return v === undefined ? fallback : v.trim()
}

/** Parse raw CSV text into hierarchical course/section/session rows. */
export function parseCsvText(text: string): CourseImportRow[] {
  const rawRows = parseCsvRows(text)
  if (rawRows.length === 0) return []

  // Find the dynamic header row (some exports start with blank/title rows).
  let headerIdx = -1
  for (let i = 0; i < rawRows.length; i++) {
    if (rawRows[i].some((cell) => cell.trim() === "Código Curso" || cell.trim() === "Curso")) {
      headerIdx = i
      break
    }
  }
  const headers = headerIdx >= 0 ? rawRows[headerIdx].map((h) => h.trim()) : rawRows[0].map((h) => h.trim())
  const dataRows = rawRows.slice((headerIdx >= 0 ? headerIdx : 0) + 1)

  const courseSessions = new Map<string, SessionMeta[]>()
  const courseNames = new Map<string, string>()

  for (const cells of dataRows) {
    const row: Record<string, string> = {}
    headers.forEach((h, idx) => {
      row[h] = cells[idx] ?? ""
    })

    const courseCode = get(row, "Código Curso")
    const courseName = get(row, "Curso")
    if (!courseCode || !courseName) continue

    courseNames.set(courseCode, courseName)

    const sectionNum = get(row, "Sección")
    if (!sectionNum) continue

    const sessionGroup = get(row, "Sesión Grupo")
    if (!sessionGroup) continue

    const professor = get(row, "Docente", "TBD") || "TBD"
    const professorEmail = get(row, "Correo")

    let capacity = parseInt(get(row, "Vacantes", "30"), 10)
    let enrolled = parseInt(get(row, "Matriculados", "0"), 10)
    if (Number.isNaN(capacity)) capacity = 30
    if (Number.isNaN(enrolled)) enrolled = 0

    const { days, start, end } = parseSchedule(get(row, "Horario"))
    if (days.length === 0 || !start || !end) continue

    const modality = get(row, "Modalidad", "Presencial") || "Presencial"
    const frequency = get(row, "Frecuencia", "Semana General") || "Semana General"
    const location = get(row, "Ubicación")

    for (const day of days) {
      const sessionMeta: SessionMeta = {
        session: {
          session_type: sessionGroup,
          day,
          start_time: start,
          end_time: end,
          location,
          building: extractBuilding(location),
          room: extractRoom(location),
          modality,
          frequency,
        },
        professor,
        professorEmail,
        capacity,
        enrolled,
        sessionGroup,
        sectionNum,
        courseName,
      }
      const list = courseSessions.get(courseCode) ?? []
      list.push(sessionMeta)
      courseSessions.set(courseCode, list)
    }
  }

  const result: CourseImportRow[] = []
  for (const [courseCode, allSessions] of courseSessions) {
    const courseName = courseNames.get(courseCode) ?? "Unknown Course"
    const sections = createHierarchicalSections(allSessions)
    const deptMatch = courseCode.match(/^([A-Z]{2,4})/)
    const department = deptMatch ? deptMatch[1] : "UNKNOWN"
    result.push({ code: courseCode, name: courseName, department, sections })
  }
  return result
}

// --- Hierarchical section grouping ------------------------------------------
// Real institution CSVs have three shapes, detected by course name / session
// group naming convention rather than an explicit flag in the file:
//  - "prefix hierarchical": named courses ("Finanzas", "Ecuaciones") or any
//    "TEORÍA VIRTUAL N" group share one main theory session across sub-groups
//    like "TEORÍA 11", "TEORÍA 12" (main = floor(sub / 10)).
//  - "decimal pattern": "TEORÍA 1.01" style discussion sections that combine
//    with the matching "TEORÍA 1" lecture.
//  - "standard": one section number per row group, optionally split by lab
//    subgroup when several labs share one lecture.
function createHierarchicalSections(allSessions: SessionMeta[]): SectionImportRow[] {
  const hasDecimalPattern = allSessions.some((s) => /TEORÍA \d+\.\d+/.test(s.sessionGroup))
  const isHierarchical = allSessions.some(
    (s) => ["Finanzas", "Ecuaciones"].some((kw) => s.courseName.includes(kw)) || s.sessionGroup.includes("VIRTUAL")
  )

  if (isHierarchical) return createPrefixHierarchicalSections(allSessions)
  if (hasDecimalPattern) return createDecimalPatternSections(allSessions)
  return createStandardSections(allSessions)
}

function summarize(sessions: SessionMeta[]): { professor: string; professorEmail: string; capacity: number; enrolled: number } {
  const professors = new Set<string>()
  const emails = new Set<string>()
  let capacity = 0
  let enrolled = 0
  for (const s of sessions) {
    if (s.professor && s.professor !== "TBD") professors.add(s.professor)
    if (s.professorEmail) emails.add(s.professorEmail)
    if (s.capacity) capacity = Math.max(capacity, s.capacity)
    if (s.enrolled) enrolled = Math.max(enrolled, s.enrolled)
  }
  let professor = professors.size ? [...professors].sort().join(", ") : "TBD"
  if (professor.length > 250) professor = professor.slice(0, 247) + "..."
  let professorEmail = emails.size ? [...emails].sort().join(", ") : ""
  if (professorEmail.length > 250) professorEmail = professorEmail.slice(0, 247) + "..."
  return { professor, professorEmail, capacity: capacity || 30, enrolled }
}

function toSection(sectionNumber: string, sessions: SessionMeta[]): SectionImportRow {
  const { professor, professorEmail, capacity, enrolled } = summarize(sessions)
  return {
    section_number: sectionNumber,
    capacity,
    enrolled,
    professor,
    professor_email: professorEmail,
    sessions: sessions.map((s) => s.session),
  }
}

function createPrefixHierarchicalSections(allSessions: SessionMeta[]): SectionImportRow[] {
  const sessionsByType = new Map<string, SessionMeta[]>()
  for (const s of allSessions) {
    const list = sessionsByType.get(s.sessionGroup) ?? []
    list.push(s)
    sessionsByType.set(s.sessionGroup, list)
  }

  const mainTheory = new Map<number, SessionMeta[]>()
  const subTheory = new Map<number | string, SessionMeta[]>()

  for (const [sessionGroup, sessions] of sessionsByType) {
    const match = sessionGroup.match(/^(TEORÍA|TEORÍA VIRTUAL)\s+(\d+)$/)
    if (match) {
      const prefix = match[1]
      const num = parseInt(match[2], 10)
      if (num < 10 || prefix.includes("VIRTUAL")) {
        mainTheory.set(num, sessions)
      } else {
        subTheory.set(num, sessions)
      }
    } else {
      subTheory.set(sessionGroup, sessions)
    }
  }

  const sections: SectionImportRow[] = []
  let counter = 1

  if (subTheory.size === 0) {
    for (const sessions of mainTheory.values()) {
      sections.push(toSection(String(counter), sessions))
      counter++
    }
    return sections
  }

  for (const [subGroup, subSessions] of subTheory) {
    let mainNumber: number | null = null
    if (typeof subGroup === "number") {
      mainNumber = Math.floor(subGroup / 10)
    } else {
      const match = subGroup.match(/(\d+)$/)
      if (match) mainNumber = Math.floor(parseInt(match[1], 10) / 10)
    }

    let mainSessions: SessionMeta[] = []
    if (mainNumber && mainTheory.has(mainNumber)) {
      mainSessions = mainTheory.get(mainNumber)!
    } else if (mainTheory.has(1)) {
      mainSessions = mainTheory.get(1)!
    }

    sections.push(toSection(String(counter), [...mainSessions, ...subSessions]))
    counter++
  }

  return sections
}

function createDecimalPatternSections(allSessions: SessionMeta[]): SectionImportRow[] {
  const sessionsByType = new Map<string, SessionMeta[]>()
  for (const s of allSessions) {
    const list = sessionsByType.get(s.sessionGroup) ?? []
    list.push(s)
    sessionsByType.set(s.sessionGroup, list)
  }

  const mainTheory = new Map<string, SessionMeta[]>()
  const decimalTheory = new Map<string, SessionMeta[]>()

  for (const [sessionGroup, sessions] of sessionsByType) {
    if (/^TEORÍA \d+$/.test(sessionGroup)) mainTheory.set(sessionGroup, sessions)
    else if (/^TEORÍA \d+\.\d+$/.test(sessionGroup)) decimalTheory.set(sessionGroup, sessions)
  }

  const sections: SectionImportRow[] = []
  let counter = 1

  for (const [decimalGroup, decimalSessions] of decimalTheory) {
    const match = decimalGroup.match(/^TEORÍA (\d+)\.\d+$/)
    if (!match) continue
    const mainGroup = `TEORÍA ${match[1]}`
    const mainSessions = mainTheory.get(mainGroup) ?? []
    sections.push(toSection(String(counter), [...mainSessions, ...decimalSessions]))
    counter++
  }

  return sections
}

function createStandardSections(allSessions: SessionMeta[]): SectionImportRow[] {
  const sectionsByNumber = new Map<string, SessionMeta[]>()
  for (const s of allSessions) {
    const list = sectionsByNumber.get(s.sectionNum) ?? []
    list.push(s)
    sectionsByNumber.set(s.sectionNum, list)
  }

  const sections: SectionImportRow[] = []
  let counter = 1

  for (const [sectionNum, sessionList] of sectionsByNumber) {
    const sessionsByType = new Map<string, SessionMeta[]>()
    for (const s of sessionList) {
      const list = sessionsByType.get(s.sessionGroup) ?? []
      list.push(s)
      sessionsByType.set(s.sessionGroup, list)
    }

    const theorySessions: SessionMeta[] = []
    const labSessions = new Map<string, SessionMeta[]>()
    for (const [sessionGroup, sessions] of sessionsByType) {
      if (sessionGroup.includes("TEORÍA")) theorySessions.push(...sessions)
      else if (sessionGroup.includes("LABORATORIO")) {
        const list = labSessions.get(sessionGroup) ?? []
        list.push(...sessions)
        labSessions.set(sessionGroup, list)
      }
    }

    if (theorySessions.length > 0 && labSessions.size > 1) {
      for (const labSessionList of labSessions.values()) {
        sections.push(toSection(String(counter), [...theorySessions, ...labSessionList]))
        counter++
      }
    } else {
      sections.push(toSection(sectionNum, sessionList))
      counter++
    }
  }

  return sections
}
