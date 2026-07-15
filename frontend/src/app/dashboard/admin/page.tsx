"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Upload, FileSpreadsheet, AlertTriangle, CheckCircle2, RefreshCw, Database, ArrowLeft, ChevronDown, ChevronRight, MapPin, User, Users } from "lucide-react"
import { analyzeImport, executeImport, checkIsAdmin, ImportAnalysis, ImportStats } from "@/features/admin"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { ImportCardSkeleton } from "@/components/ui/loading-skeletons"

type ImportMode = 'reset' | 'update'
type PageState = 'upload' | 'analyzing' | 'preview' | 'confirming' | 'importing' | 'results' | 'error'

export default function AdminImportPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [pageState, setPageState] = useState<PageState>('upload')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [importMode, setImportMode] = useState<ImportMode>('update')
  const [analysis, setAnalysis] = useState<ImportAnalysis | null>(null)
  const [importResult, setImportResult] = useState<{ message: string; stats: ImportStats } | null>(null)
  const [error, setError] = useState<string>('')
  const [isAdmin, setIsAdmin] = useState<boolean>(false)
  const [loading, setLoading] = useState<boolean>(true)
  const [dragOver, setDragOver] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [expandedCourses, setExpandedCourses] = useState<Set<string>>(new Set())

  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const admin = await checkIsAdmin()
        if (!admin) {
          router.push('/dashboard/generate')
          return
        }
        setIsAdmin(true)
      } catch {
        router.push('/dashboard/generate')
      } finally {
        setLoading(false)
      }
    }
    checkAdmin()
  }, [router])

  const validateAndSetFile = useCallback((file: File) => {
    const allowedExtensions = ['.csv']
    const ext = '.' + (file.name.split('.').pop()?.toLowerCase() || '')
    if (!allowedExtensions.includes(ext)) {
      setError('Solo se permiten archivos CSV (.csv)')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('El archivo debe ser menor a 10MB')
      return
    }
    setSelectedFile(file)
    setError('')
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) validateAndSetFile(file)
  }, [validateAndSetFile])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
  }, [])

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) validateAndSetFile(file)
  }, [validateAndSetFile])

  const handleAnalyze = async () => {
    if (!selectedFile) return
    setPageState('analyzing')
    setError('')
    try {
      const result = await analyzeImport(selectedFile, importMode)
      setAnalysis(result.analysis)
      setPageState('preview')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al analizar el archivo')
      setPageState('error')
    }
  }

  const handleExecute = async () => {
    if (!selectedFile) return
    if (importMode === 'reset' && confirmText !== 'CONFIRMAR') return
    setPageState('importing')
    setError('')
    try {
      const result = await executeImport(selectedFile, importMode)
      setImportResult({ message: result.message, stats: result.stats })
      setPageState('results')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error en la importacion')
      setPageState('error')
    }
  }

  const handleReset = () => {
    setPageState('upload')
    setSelectedFile(null)
    setAnalysis(null)
    setImportResult(null)
    setError('')
    setConfirmText('')
    setExpandedCourses(new Set())
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const toggleCourse = (code: string) => {
    setExpandedCourses(prev => {
      const next = new Set(prev)
      if (next.has(code)) next.delete(code)
      else next.add(code)
      return next
    })
  }

  const expandAll = () => {
    if (!analysis) return
    setExpandedCourses(new Set(analysis.courses_preview.map(c => c.code)))
  }

  const collapseAll = () => {
    setExpandedCourses(new Set())
  }

  const dayTranslations: Record<string, string> = {
    'Monday': 'Lun', 'Tuesday': 'Mar', 'Wednesday': 'Mie',
    'Thursday': 'Jue', 'Friday': 'Vie', 'Saturday': 'Sab', 'Sunday': 'Dom'
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <ImportCardSkeleton />
      </div>
    )
  }

  if (!isAdmin) return null

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-[1400px] mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-3">
              <Database className="w-6 h-6" />
              Panel de Importacion
            </h1>
            <p className="text-muted-foreground mt-1">
              Sube un archivo CSV para importar cursos
            </p>
          </div>
        </div>

        {/* Upload State */}
        {pageState === "upload" && (
          <div className="space-y-6">
            {/* Mode Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={() => setImportMode("update")}
                className={`p-5 rounded-lg border-2 text-left transition-all ${
                  importMode === "update"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-muted-foreground/30"
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <RefreshCw
                    className={`w-5 h-5 ${importMode === "update" ? "text-primary" : "text-muted-foreground"}`}
                  />
                  <h3
                    className={`font-medium ${importMode === "update" ? "text-primary" : "text-foreground"}`}
                  >
                    Actualizar Datos
                  </h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Actualiza horarios, vacantes, profesores y agrega nuevos
                  cursos sin borrar los existentes.
                </p>
              </button>

              <button
                onClick={() => setImportMode("reset")}
                className={`p-5 rounded-lg border-2 text-left transition-all ${
                  importMode === "reset"
                    ? "border-destructive bg-destructive/5"
                    : "border-border hover:border-muted-foreground/30"
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <AlertTriangle
                    className={`w-5 h-5 ${importMode === "reset" ? "text-destructive" : "text-muted-foreground"}`}
                  />
                  <h3
                    className={`font-medium ${importMode === "reset" ? "text-destructive" : "text-foreground"}`}
                  >
                    Nuevo Ciclo
                  </h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Desactiva todos los cursos anteriores e importa datos frescos.
                  Usar al iniciar un nuevo ciclo.
                </p>
              </button>
            </div>

            {/* Drop Zone */}
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={`relative border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-all ${
                dragOver
                  ? "border-primary bg-primary/5"
                  : selectedFile
                    ? "border-primary/50 bg-primary/5"
                    : "border-border hover:border-muted-foreground/50 hover:bg-muted/30"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileInput}
                className="hidden"
              />
              {selectedFile ? (
                <div className="space-y-2">
                  <FileSpreadsheet className="w-12 h-12 text-primary mx-auto" />
                  <p className="font-medium">{selectedFile.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(selectedFile.size / 1024).toFixed(1)} KB - Click para
                    cambiar
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <Upload className="w-12 h-12 text-muted-foreground/50 mx-auto" />
                  <p className="text-muted-foreground">
                    Arrastra un archivo aqui o haz click para seleccionar
                  </p>
                  <p className="text-sm text-muted-foreground/60">
                    CSV (max 10MB)
                  </p>
                </div>
              )}
            </div>

            {/* Error */}
            {error && (
              <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0" />
                <p className="text-destructive text-sm">{error}</p>
              </div>
            )}

            {/* Analyze Button */}
            <Button
              onClick={handleAnalyze}
              disabled={!selectedFile}
              className="w-full"
              size="lg"
            >
              Analizar Archivo
            </Button>
          </div>
        )}

        {/* Analyzing State */}
        {pageState === "analyzing" && (
          <div className="space-y-6">
            <ImportCardSkeleton />
            <div className="text-center">
              <p className="font-medium">Analizando archivo...</p>
              <p className="text-sm text-muted-foreground">
                Esto puede tomar unos segundos
              </p>
            </div>
          </div>
        )}

        {/* Preview State */}
        {pageState === "preview" && analysis && (
          <div className="space-y-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="text-muted-foreground"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver
            </Button>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="border-border/50">
                <CardContent className="pt-4 text-center">
                  <p className="text-2xl font-bold">
                    {analysis.unique_courses}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Cursos</p>
                </CardContent>
              </Card>
              <Card className="border-border/50">
                <CardContent className="pt-4 text-center">
                  <p className="text-2xl font-bold">
                    {analysis.total_sections}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Secciones
                  </p>
                </CardContent>
              </Card>
              <Card className="border-border/50">
                <CardContent className="pt-4 text-center">
                  <p className="text-2xl font-bold">
                    {analysis.total_sessions}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Sesiones</p>
                </CardContent>
              </Card>
              <Card className="border-border/50">
                <CardContent className="pt-4 text-center">
                  <p className="text-2xl font-bold">
                    {Object.keys(analysis.departments).length}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Departamentos
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Mode info */}
            {analysis.mode === "update" && (
              <Card className="border-primary/30 bg-primary/5">
                <CardContent className="pt-4 space-y-2">
                  <h3 className="font-medium text-primary">Modo Actualizar</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">
                        Existentes:{" "}
                      </span>
                      <span className="font-medium">
                        {analysis.existing_courses_count}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Nuevos: </span>
                      <span className="font-medium text-primary">
                        {analysis.courses_to_add}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">
                        Con cambios:{" "}
                      </span>
                      <span className="font-medium text-amber-600">
                        {analysis.courses_to_update}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">
                        Sin cambios:{" "}
                      </span>
                      <span className="font-medium">
                        {analysis.unchanged_courses_count}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {analysis.mode === "reset" && (
              <Card className="border-destructive/30 bg-destructive/5">
                <CardContent className="pt-4 space-y-2">
                  <h3 className="font-medium text-destructive flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Modo Nuevo Ciclo (Reset)
                  </h3>
                  <p className="text-sm">
                    Se desactivaran{" "}
                    <span className="font-bold text-destructive">
                      {analysis.existing_courses_to_deactivate}
                    </span>{" "}
                    curso(s) existente(s).
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Departments */}
            <Card className="border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-medium">
                  Departamentos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(analysis.departments)
                    .sort(([, a], [, b]) => b - a)
                    .map(([dept, count]) => (
                      <Badge
                        key={dept}
                        variant="secondary"
                        className="font-normal"
                      >
                        {dept}{" "}
                        <span className="text-muted-foreground ml-1">
                          ({count})
                        </span>
                      </Badge>
                    ))}
                </div>
              </CardContent>
            </Card>

            {/* Courses Preview */}
            <Card className="border-border/50">
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <CardTitle className="text-base font-medium">
                  Vista previa ({analysis.courses_preview.length}
                  {analysis.courses_preview.length === 50 ? "+" : ""})
                </CardTitle>
                <div className="flex gap-3 text-xs">
                  <button
                    onClick={expandAll}
                    className="text-primary hover:underline"
                  >
                    Expandir
                  </button>
                  <button
                    onClick={collapseAll}
                    className="text-muted-foreground hover:underline"
                  >
                    Colapsar
                  </button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="max-h-[650px] overflow-y-auto divide-y divide-border">
                  {analysis.courses_preview.map((course) => (
                    <div key={course.code}>
                      <button
                        onClick={() => toggleCourse(course.code)}
                        className="w-full flex items-center justify-between py-3 px-4 hover:bg-muted/30 transition-colors text-sm text-left"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {expandedCourses.has(course.code) ? (
                            <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                          )}
                          <span className="font-mono text-xs text-muted-foreground">
                            {course.code}
                          </span>
                          <span className="font-medium truncate">
                            {course.name}
                          </span>
                          {course.is_new && (
                            <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px] h-4 leading-none">
                              NUEVO
                            </Badge>
                          )}
                          {course.diffs && course.diffs.length > 0 && (
                            <div className="flex gap-1 overflow-hidden ml-1">
                              {course.diffs.slice(0, 3).map((d, i) => (
                                <Badge
                                  key={i}
                                  variant="outline"
                                  className="text-[10px] h-4 font-normal whitespace-nowrap bg-amber-500/5 border-amber-500/20 text-amber-700"
                                >
                                  {d}
                                </Badge>
                              ))}
                              {course.diffs.length > 3 && (
                                <span className="text-[10px] text-muted-foreground">
                                  +{course.diffs.length - 3}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        <Badge
                          variant="outline"
                          className="text-xs font-normal ml-2 flex-shrink-0"
                        >
                          {course.sections_count} sec
                        </Badge>
                      </button>

                      {expandedCourses.has(course.code) && course.sections && (
                        <div className="bg-muted/20 px-4 pb-4 pt-2">
                          <div className="space-y-2">
                            {course.sections.map((section, idx) => (
                              <div
                                key={idx}
                                className="bg-background rounded-lg p-3 border border-border/50 text-sm"
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <span className="font-medium">
                                    Seccion {section.number}
                                  </span>
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <Users className="w-3 h-3" />
                                    {section.capacity}
                                  </div>
                                </div>
                                {section.professor && (
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                                    <User className="w-3 h-3" />
                                    {section.professor}
                                  </div>
                                )}
                                {section.sessions &&
                                  section.sessions.length > 0 && (
                                    <div className="space-y-1">
                                      {section.sessions.map((s, i) => (
                                        <div
                                          key={i}
                                          className="flex items-center gap-2 text-xs"
                                        >
                                          <span className="font-medium w-8">
                                            {dayTranslations[s.day] || s.day}
                                          </span>
                                          <span className="text-muted-foreground">
                                            {s.start_time}-{s.end_time}
                                          </span>
                                          {s.location && (
                                            <span className="text-muted-foreground flex items-center gap-1">
                                              <MapPin className="w-3 h-3" />
                                              {s.location}
                                            </span>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Confirmation for Reset */}
            {importMode === "reset" && (
              <Card className="border-destructive/30">
                <CardContent className="pt-4 space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Para confirmar la operacion de reset, escribe{" "}
                    <span className="font-mono font-bold">CONFIRMAR</span>
                  </p>
                  <Input
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    placeholder="Escribe CONFIRMAR"
                    className="max-w-xs"
                  />
                </CardContent>
              </Card>
            )}

            {/* Execute Button */}
            <Button
              onClick={handleExecute}
              disabled={importMode === "reset" && confirmText !== "CONFIRMAR"}
              className="w-full"
              size="lg"
              variant={importMode === "reset" ? "destructive" : "default"}
            >
              {importMode === "reset"
                ? "Ejecutar Reset"
                : "Ejecutar Importacion"}
            </Button>
          </div>
        )}

        {/* Importing State */}
        {pageState === "importing" && (
          <div className="space-y-6">
            <ImportCardSkeleton />
            <div className="text-center">
              <p className="font-medium">Importando datos...</p>
              <p className="text-sm text-muted-foreground">
                No cierres esta ventana
              </p>
            </div>
          </div>
        )}

        {/* Results State */}
        {pageState === "results" && importResult && (
          <div className="space-y-6">
            <div className="text-center py-8">
              <CheckCircle2 className="w-16 h-16 text-primary mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">
                Importacion Exitosa
              </h2>
              <p className="text-muted-foreground">{importResult.message}</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="border-border/50">
                <CardContent className="pt-4 text-center">
                  <p className="text-2xl font-bold">
                    {String(importResult.stats.courses_created)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Cursos creados
                  </p>
                </CardContent>
              </Card>
              <Card className="border-border/50">
                <CardContent className="pt-4 text-center">
                  <p className="text-2xl font-bold">
                    {String(importResult.stats.courses_updated)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Cursos actualizados
                  </p>
                </CardContent>
              </Card>
              <Card className="border-border/50">
                <CardContent className="pt-4 text-center">
                  <p className="text-2xl font-bold">
                    {String(importResult.stats.sections_created)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Secciones creadas
                  </p>
                </CardContent>
              </Card>
              <Card className="border-border/50">
                <CardContent className="pt-4 text-center">
                  <p className="text-2xl font-bold">
                    {String(importResult.stats.sessions_created)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Sesiones creadas
                  </p>
                </CardContent>
              </Card>
            </div>

            {importResult.stats.errors &&
              (importResult.stats.errors as any[]).length > 0 && (
                <Card className="border-destructive/30 bg-destructive/5">
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2 text-destructive">
                      <AlertTriangle className="w-4 h-4" />
                      <CardTitle className="text-sm font-medium">
                        Errores durante la importacion
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ul className="text-xs space-y-1 text-destructive/80 font-mono">
                      {(importResult.stats.errors as any[])
                        .slice(0, 10)
                        .map((err, i) => (
                          <li key={i}>• {String(err)}</li>
                        ))}
                      {(importResult.stats.errors as any[]).length > 10 && (
                        <li className="list-none pt-1">
                          ... y{" "}
                          {(importResult.stats.errors as any[]).length - 10}{" "}
                          errores mas
                        </li>
                      )}
                    </ul>
                  </CardContent>
                </Card>
              )}

            <Button onClick={handleReset} className="w-full" size="lg">
              Nueva Importacion
            </Button>
          </div>
        )}

        {/* Error State */}
        {pageState === "error" && (
          <div className="space-y-6">
            <div className="text-center py-8">
              <AlertTriangle className="w-16 h-16 text-destructive mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">
                Error en la Importacion
              </h2>
              <p className="text-muted-foreground">{error}</p>
            </div>
            <Button
              onClick={handleReset}
              variant="outline"
              className="w-full"
              size="lg"
            >
              Intentar de Nuevo
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
