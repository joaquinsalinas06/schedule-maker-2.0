"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Upload, FileSpreadsheet, AlertTriangle, CheckCircle2, Loader2, RefreshCw, Database, X, Clock, ArrowLeft, ChevronDown, ChevronRight, MapPin, User, Users } from "lucide-react"
import { authService } from "@/services/auth"
import { adminAPI, ImportAnalysis, ImportStats, AuditLogEntry, CoursePreview } from "@/services/adminAPI"

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
  const [history, setHistory] = useState<AuditLogEntry[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [expandedCourses, setExpandedCourses] = useState<Set<string>>(new Set())

  // Check admin access on mount
  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const user = authService.getCurrentUser()
        if (!user || user.role !== 'admin') {
          router.push('/dashboard/generate')
          return
        }
        await adminAPI.checkAdminStatus()
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
    const allowedExtensions = ['.csv', '.xlsx', '.xls']
    const ext = '.' + (file.name.split('.').pop()?.toLowerCase() || '')
    if (!allowedExtensions.includes(ext)) {
      setError('Solo se permiten archivos CSV y Excel (.csv, .xlsx, .xls)')
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
      const result = await adminAPI.analyzeImport(selectedFile, importMode)
      setAnalysis(result.analysis)
      setPageState('preview')
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { detail?: string } } }
      setError(axiosError.response?.data?.detail || 'Error al analizar el archivo')
      setPageState('error')
    }
  }

  const handleExecute = async () => {
    if (!selectedFile) return
    if (importMode === 'reset' && confirmText !== 'CONFIRMAR') return
    setPageState('importing')
    setError('')
    try {
      const result = await adminAPI.executeImport(selectedFile, importMode)
      setImportResult({ message: result.message, stats: result.stats })
      setPageState('results')
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { detail?: string } } }
      setError(axiosError.response?.data?.detail || 'Error en la importacion')
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

  const loadHistory = async () => {
    try {
      const logs = await adminAPI.getImportHistory(10)
      setHistory(logs)
      setShowHistory(true)
    } catch {
      // silent fail
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!isAdmin) return null

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Database className="w-7 h-7 text-cyan-400" />
            Panel de Importacion
          </h1>
          <p className="text-slate-400 mt-1">Sube un archivo CSV o Excel para importar cursos</p>
        </div>
        <button
          onClick={loadHistory}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800/50 border border-slate-700 text-slate-300 hover:bg-slate-700/50 transition-colors text-sm"
        >
          <Clock className="w-4 h-4" />
          Historial
        </button>
      </div>

      {/* History Modal */}
      {showHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowHistory(false)}>
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Historial de Importaciones</h2>
              <button onClick={() => setShowHistory(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            {history.length === 0 ? (
              <p className="text-slate-400 text-center py-8">No hay importaciones registradas</p>
            ) : (
              <div className="space-y-3">
                {history.map(log => (
                  <div key={log.id} className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-sm font-medium px-2 py-0.5 rounded ${
                        log.status === 'success' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                      }`}>
                        {log.status === 'success' ? 'Exitoso' : 'Fallido'}
                      </span>
                      <span className="text-xs text-slate-500">
                        {log.executed_at ? new Date(log.executed_at).toLocaleString('es-PE') : '-'}
                      </span>
                    </div>
                    <p className="text-sm text-slate-300">
                      {log.action === 'csv_import_reset' ? 'Reset (Nuevo Ciclo)' : 'Update (Actualizacion)'}
                      {log.file_name && <span className="text-slate-500 ml-2">- {log.file_name}</span>}
                    </p>
                    {log.details && log.status === 'success' && (
                      <div className="mt-2 text-xs text-slate-400 grid grid-cols-2 gap-1">
                        {Object.entries(log.details)
                          .filter(([key]) => key !== 'mode' && key !== 'errors')
                          .map(([key, value]) => (
                            <span key={key}>{key.replace(/_/g, ' ')}: <span className="text-slate-300">{String(value)}</span></span>
                          ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Upload State */}
      {pageState === 'upload' && (
        <div className="space-y-6">
          {/* Mode Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => setImportMode('update')}
              className={`p-5 rounded-xl border-2 text-left transition-all ${
                importMode === 'update'
                  ? 'border-cyan-500 bg-cyan-500/10'
                  : 'border-slate-700 bg-slate-800/30 hover:border-slate-600'
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                <RefreshCw className={`w-5 h-5 ${importMode === 'update' ? 'text-cyan-400' : 'text-slate-400'}`} />
                <h3 className={`font-semibold ${importMode === 'update' ? 'text-cyan-300' : 'text-slate-300'}`}>
                  Actualizar Datos
                </h3>
              </div>
              <p className="text-sm text-slate-400">
                Actualiza horarios, vacantes, profesores y agrega nuevos cursos sin borrar los existentes. Ideal para cambios durante la matricula.
              </p>
            </button>

            <button
              onClick={() => setImportMode('reset')}
              className={`p-5 rounded-xl border-2 text-left transition-all ${
                importMode === 'reset'
                  ? 'border-orange-500 bg-orange-500/10'
                  : 'border-slate-700 bg-slate-800/30 hover:border-slate-600'
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                <AlertTriangle className={`w-5 h-5 ${importMode === 'reset' ? 'text-orange-400' : 'text-slate-400'}`} />
                <h3 className={`font-semibold ${importMode === 'reset' ? 'text-orange-300' : 'text-slate-300'}`}>
                  Nuevo Ciclo
                </h3>
              </div>
              <p className="text-sm text-slate-400">
                Desactiva todos los cursos anteriores e importa datos frescos. Usar al iniciar un nuevo ciclo academico (ej: 2025-1 a 2025-2).
              </p>
            </button>
          </div>

          {/* Drop Zone */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            className={`relative border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all ${
              dragOver
                ? 'border-cyan-400 bg-cyan-500/10'
                : selectedFile
                  ? 'border-green-500/50 bg-green-500/5'
                  : 'border-slate-600 bg-slate-800/20 hover:border-slate-500 hover:bg-slate-800/30'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileInput}
              className="hidden"
            />
            {selectedFile ? (
              <div className="space-y-2">
                <FileSpreadsheet className="w-12 h-12 text-green-400 mx-auto" />
                <p className="text-green-300 font-medium">{selectedFile.name}</p>
                <p className="text-sm text-slate-400">
                  {(selectedFile.size / 1024).toFixed(1)} KB - Click para cambiar archivo
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <Upload className="w-12 h-12 text-slate-500 mx-auto" />
                <p className="text-slate-300">Arrastra un archivo aqui o haz click para seleccionar</p>
                <p className="text-sm text-slate-500">CSV, XLSX o XLS (max 10MB)</p>
              </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}

          {/* Analyze Button */}
          <button
            onClick={handleAnalyze}
            disabled={!selectedFile}
            className={`w-full py-3 rounded-xl font-semibold transition-all ${
              selectedFile
                ? 'bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white shadow-lg shadow-cyan-500/25'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
            }`}
          >
            Analizar Archivo
          </button>
        </div>
      )}

      {/* Analyzing State */}
      {pageState === 'analyzing' && (
        <div className="flex flex-col items-center justify-center py-16 space-y-4">
          <Loader2 className="w-12 h-12 text-cyan-400 animate-spin" />
          <p className="text-slate-300 font-medium">Analizando archivo...</p>
          <p className="text-sm text-slate-500">Esto puede tomar unos segundos</p>
        </div>
      )}

      {/* Preview State */}
      {pageState === 'preview' && analysis && (
        <div className="space-y-6">
          <button onClick={handleReset} className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Volver
          </button>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-cyan-400">{analysis.unique_courses}</p>
              <p className="text-xs text-slate-400 mt-1">Cursos</p>
            </div>
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-teal-400">{analysis.total_sections}</p>
              <p className="text-xs text-slate-400 mt-1">Secciones</p>
            </div>
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-purple-400">{analysis.total_sessions}</p>
              <p className="text-xs text-slate-400 mt-1">Sesiones</p>
            </div>
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-amber-400">{Object.keys(analysis.departments).length}</p>
              <p className="text-xs text-slate-400 mt-1">Departamentos</p>
            </div>
          </div>

          {/* Mode-specific info */}
          {analysis.mode === 'update' && (
            <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-xl p-4 space-y-2">
              <h3 className="font-semibold text-cyan-300">Modo Actualizar</h3>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-slate-400">Cursos existentes: </span>
                  <span className="text-white font-medium">{analysis.existing_courses_count}</span>
                </div>
                <div>
                  <span className="text-slate-400">Nuevos a agregar: </span>
                  <span className="text-green-400 font-medium">{analysis.courses_to_add}</span>
                </div>
                <div>
                  <span className="text-slate-400">A actualizar: </span>
                  <span className="text-cyan-400 font-medium">{analysis.courses_to_update}</span>
                </div>
              </div>
              {(analysis.courses_not_in_file ?? 0) > 0 && (
                <p className="text-xs text-amber-400">
                  {analysis.courses_not_in_file} curso(s) existente(s) no estan en el archivo (no seran eliminados)
                </p>
              )}
            </div>
          )}

          {analysis.mode === 'reset' && (
            <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4 space-y-2">
              <h3 className="font-semibold text-orange-300 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Modo Nuevo Ciclo (Reset)
              </h3>
              <p className="text-sm text-slate-300">
                Se desactivaran <span className="text-orange-400 font-bold">{analysis.existing_courses_to_deactivate}</span> curso(s) existente(s) y se importaran {analysis.unique_courses} cursos nuevos.
              </p>
            </div>
          )}

          {/* Departments */}
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
            <h3 className="font-semibold text-slate-200 mb-3">Departamentos</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(analysis.departments)
                .sort(([, a], [, b]) => b - a)
                .map(([dept, count]) => (
                  <span key={dept} className="px-3 py-1 rounded-full bg-slate-700/50 text-sm text-slate-300">
                    {dept} <span className="text-slate-500">({count})</span>
                  </span>
                ))}
            </div>
          </div>

          {/* Courses Preview - Expandable */}
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-slate-200">
                Vista previa de cursos ({analysis.courses_preview.length}{analysis.courses_preview.length === 50 ? '+' : ''})
              </h3>
              <div className="flex gap-2">
                <button onClick={expandAll} className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors">
                  Expandir todos
                </button>
                <span className="text-slate-600">|</span>
                <button onClick={collapseAll} className="text-xs text-slate-400 hover:text-slate-300 transition-colors">
                  Colapsar
                </button>
              </div>
            </div>
            <div className="max-h-[500px] overflow-y-auto space-y-1">
              {analysis.courses_preview.map((course) => (
                <div key={course.code} className="border border-slate-700/30 rounded-lg overflow-hidden">
                  {/* Course Header - Clickable */}
                  <button
                    onClick={() => toggleCourse(course.code)}
                    className="w-full flex items-center justify-between py-2.5 px-3 hover:bg-slate-700/30 transition-colors text-sm text-left"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {expandedCourses.has(course.code)
                        ? <ChevronDown className="w-4 h-4 text-slate-500 flex-shrink-0" />
                        : <ChevronRight className="w-4 h-4 text-slate-500 flex-shrink-0" />
                      }
                      <span className="text-cyan-400 font-mono text-xs flex-shrink-0">{course.code}</span>
                      <span className="text-slate-300 truncate">{course.name}</span>
                    </div>
                    <span className="text-slate-500 text-xs flex-shrink-0 ml-2">
                      {course.sections_count} sec / {course.sessions_count} ses
                    </span>
                  </button>

                  {/* Expanded: Sections & Sessions */}
                  {expandedCourses.has(course.code) && course.sections && (
                    <div className="border-t border-slate-700/30 bg-slate-900/30 px-3 py-2 space-y-3">
                      {course.sections.map((section, sIdx) => (
                        <div key={sIdx} className="space-y-1.5">
                          {/* Section Header */}
                          <div className="flex items-center gap-2 text-xs">
                            <span className="bg-teal-500/20 text-teal-400 px-2 py-0.5 rounded font-medium">
                              Seccion {section.number}
                            </span>
                            <span className="text-slate-400 flex items-center gap-1">
                              <User className="w-3 h-3" />
                              {section.professor}
                            </span>
                            <span className="text-slate-500 flex items-center gap-1 ml-auto">
                              <Users className="w-3 h-3" />
                              {section.enrolled}/{section.capacity}
                            </span>
                          </div>
                          {/* Sessions Table */}
                          <div className="ml-2 space-y-0.5">
                            {section.sessions.map((sess, sessIdx) => (
                              <div key={sessIdx} className="flex items-center gap-2 text-xs py-0.5 px-2 rounded bg-slate-800/40">
                                <span className="text-purple-400 font-medium w-28 truncate flex-shrink-0" title={sess.type}>
                                  {sess.type}
                                </span>
                                <span className="text-amber-400 w-8 flex-shrink-0">
                                  {dayTranslations[sess.day] || sess.day}
                                </span>
                                <span className="text-white font-mono">
                                  {sess.start_time} - {sess.end_time}
                                </span>
                                {sess.location && (
                                  <span className="text-slate-500 flex items-center gap-1 truncate" title={sess.location}>
                                    <MapPin className="w-3 h-3 flex-shrink-0" />
                                    {sess.location}
                                  </span>
                                )}
                                <span className={`ml-auto text-xs px-1.5 py-0.5 rounded ${
                                  sess.modality === 'Presencial'
                                    ? 'bg-green-500/15 text-green-400'
                                    : 'bg-blue-500/15 text-blue-400'
                                }`}>
                                  {sess.modality === 'Presencial' ? 'Pres' : 'Virt'}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Reset Confirmation */}
          {importMode === 'reset' && (
            <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4 space-y-3">
              <p className="text-sm text-red-300">
                Escribe <span className="font-bold font-mono bg-red-500/20 px-2 py-0.5 rounded">CONFIRMAR</span> para proceder con el reset:
              </p>
              <input
                type="text"
                value={confirmText}
                onChange={e => setConfirmText(e.target.value)}
                placeholder="Escribe CONFIRMAR"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-red-500/50"
              />
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-4">
            <button
              onClick={handleReset}
              className="flex-1 py-3 rounded-xl font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={importMode === 'reset' ? () => { if (confirmText === 'CONFIRMAR') handleExecute() } : handleExecute}
              disabled={importMode === 'reset' && confirmText !== 'CONFIRMAR'}
              className={`flex-1 py-3 rounded-xl font-semibold transition-all ${
                importMode === 'reset'
                  ? confirmText === 'CONFIRMAR'
                    ? 'bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white shadow-lg shadow-orange-500/25'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white shadow-lg shadow-cyan-500/25'
              }`}
            >
              {importMode === 'reset' ? 'Ejecutar Reset' : 'Ejecutar Actualizacion'}
            </button>
          </div>
        </div>
      )}

      {/* Importing State */}
      {pageState === 'importing' && (
        <div className="flex flex-col items-center justify-center py-16 space-y-4">
          <Loader2 className="w-12 h-12 text-cyan-400 animate-spin" />
          <p className="text-slate-300 font-medium">
            {importMode === 'reset' ? 'Ejecutando reset e importacion...' : 'Actualizando datos...'}
          </p>
          <p className="text-sm text-slate-500">No cierres esta pagina</p>
        </div>
      )}

      {/* Results State */}
      {pageState === 'results' && importResult && (
        <div className="space-y-6">
          <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-6 text-center space-y-3">
            <CheckCircle2 className="w-16 h-16 text-green-400 mx-auto" />
            <h2 className="text-xl font-bold text-green-300">Importacion Exitosa</h2>
            <p className="text-slate-400">{importResult.message}</p>
          </div>

          {/* Stats */}
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
            <h3 className="font-semibold text-slate-200 mb-4">Resumen</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {Object.entries(importResult.stats)
                .filter(([key]) => key !== 'mode' && key !== 'errors')
                .map(([key, value]) => (
                  <div key={key} className="bg-slate-900/50 rounded-lg p-3">
                    <p className="text-xs text-slate-500 capitalize">{key.replace(/_/g, ' ')}</p>
                    <p className="text-lg font-bold text-white mt-0.5">{String(value)}</p>
                  </div>
                ))}
            </div>
          </div>

          {importResult.stats.errors && Array.isArray(importResult.stats.errors) && importResult.stats.errors.length > 0 && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
              <h3 className="font-semibold text-red-300 mb-2">Errores</h3>
              {importResult.stats.errors.map((err: string, idx: number) => (
                <p key={idx} className="text-sm text-red-400">{err}</p>
              ))}
            </div>
          )}

          <button
            onClick={handleReset}
            className="w-full py-3 rounded-xl font-semibold bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white shadow-lg shadow-cyan-500/25 transition-all"
          >
            Nueva Importacion
          </button>
        </div>
      )}

      {/* Error State */}
      {pageState === 'error' && (
        <div className="space-y-6">
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 text-center space-y-3">
            <AlertTriangle className="w-16 h-16 text-red-400 mx-auto" />
            <h2 className="text-xl font-bold text-red-300">Error</h2>
            <p className="text-slate-400">{error}</p>
          </div>
          <button
            onClick={handleReset}
            className="w-full py-3 rounded-xl font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors"
          >
            Intentar de nuevo
          </button>
        </div>
      )}
    </div>
  )
}
