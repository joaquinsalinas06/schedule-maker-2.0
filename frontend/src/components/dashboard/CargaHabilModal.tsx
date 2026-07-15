import { useState, useRef, useEffect } from 'react';
import { parseCargaHabilFile, getBulkCourseDetails } from '@/features/catalog';
import { Course } from '@/types';
import { X, UploadCloud, FileText, AlertTriangle, Loader2, Check, ChevronRight, Search } from 'lucide-react';

interface CargaHabilModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: (courses: Course[]) => void;
}

type Step = 'upload' | 'review' | 'importing';

interface ParserResult {
  code: string;
  name: string;
  type: string;
}

export function CargaHabilModal({ isOpen, onClose, onImportComplete }: CargaHabilModalProps) {
  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Data state
  const [mandatoryCourses, setMandatoryCourses] = useState<ParserResult[]>([]);
  const [electiveCourses, setElectiveCourses] = useState<ParserResult[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Selection state (maps course code to boolean)
  const [selectedCodes, setSelectedCodes] = useState<Record<string, boolean>>({});
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setStep('upload');
      setFile(null);
      setMandatoryCourses([]);
      setElectiveCourses([]);
      setSelectedCodes({});
      setSearchQuery('');
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected && selected.type === 'application/pdf') {
      setFile(selected);
      setError(null);
    } else {
      setError('Por favor sube un archivo PDF válido.');
      setFile(null);
    }
  };

  const handleProcessFile = async () => {
    if (!file) return;
    
    setIsProcessing(true);
    setError(null);
    
    try {
      const result = await parseCargaHabilFile(file);
      setMandatoryCourses(result.mandatory);
      setElectiveCourses(result.electives);
      
      // Initialize selection state: mandatory ON, electives OFF
      const initialSelection: Record<string, boolean> = {};
      result.mandatory.forEach(c => initialSelection[c.code] = true);
      result.electives.forEach(c => initialSelection[c.code] = false);
      setSelectedCodes(initialSelection);
      
      setStep('review');
    } catch (err: any) {
      setError(err.message || 'Ocurrió un error al procesar el archivo');
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleSelection = (code: string) => {
    setSelectedCodes(prev => ({
      ...prev,
      [code]: !prev[code]
    }));
  };

  const handleImport = async () => {
    const codesToFetch = Object.entries(selectedCodes)
      .filter(([_, isSelected]) => isSelected)
      .map(([code, _]) => code);
      
    if (codesToFetch.length === 0) {
      setError('Debes seleccionar al menos un curso para importar.');
      return;
    }

    setStep('importing');
    setError(null);
    
    try {
      const courses = await getBulkCourseDetails(codesToFetch);
      onImportComplete(courses);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al obtener los detalles de los cursos');
      setStep('review'); // Go back to review on error
    }
  };
  
  const handleReset = () => {
    setFile(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const renderUploadStep = () => (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Sube tu PDF de "Carga Hábil" para que podamos extraer tus cursos disponibles automáticamente.
      </p>
      
      <div 
        className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center transition-colors
          ${file ? 'border-primary/50 bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-muted/50'}`}
      >
        <input
          type="file"
          accept=".pdf"
          className="hidden"
          ref={fileInputRef}
          onChange={handleFileChange}
        />
        
        {file ? (
          <>
            <div className="w-12 h-12 mb-3 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <FileText className="w-6 h-6" />
            </div>
            <p className="font-medium text-foreground">{file.name}</p>
            <p className="text-xs text-muted-foreground mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
            <button 
              onClick={() => handleReset()}
              className="mt-4 text-xs text-primary hover:underline"
            >
              Cambiar archivo
            </button>
          </>
        ) : (
          <>
            <div className="w-12 h-12 mb-3 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
              <UploadCloud className="w-6 h-6" />
            </div>
            <p className="font-medium text-foreground">Seleccionar PDF</p>
            <p className="text-xs text-muted-foreground mt-1 mb-4">Solo archivos .pdf</p>
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 bg-secondary text-secondary-foreground text-sm font-medium rounded-md hover:bg-secondary/80 transition-colors"
            >
              Explorar archivos
            </button>
          </>
        )}
      </div>

      <div className="flex justify-end pt-2">
        <button
          onClick={handleProcessFile}
          disabled={!file || isProcessing}
          className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isProcessing ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Analizando...</>
          ) : (
            <>Siguiente <ChevronRight className="w-4 h-4" /></>
          )}
        </button>
      </div>
    </div>
  );

  const renderReviewStep = () => {
    const selectedCount = Object.values(selectedCodes).filter(Boolean).length;
    
    const filteredElectives = electiveCourses.filter(course => {
      if (!searchQuery) return true;
      const lowerQuery = searchQuery.toLowerCase();
      return course.name.toLowerCase().includes(lowerQuery) || course.code.toLowerCase().includes(lowerQuery);
    });
    
    return (
      <div className="space-y-4 flex flex-col h-[60vh] md:h-auto max-h-[500px]">
        <div className="flex-shrink-0">
          <p className="text-sm text-muted-foreground">
            Hemos encontrado los siguientes cursos autorizados. Selecciona cuáles deseas importar a tu lista principal.
          </p>
        </div>

        <div className="flex-1 overflow-y-auto pr-2 space-y-6 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
          {/* Mandatory Courses */}
          {mandatoryCourses.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold text-sm flex items-center justify-between">
                <span>Cursos Obligatorios</span>
                <span className="bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full">{mandatoryCourses.length}</span>
              </h3>
              <div className="space-y-1.5 border border-border rounded-lg p-2 bg-muted/20">
                {mandatoryCourses.map((course) => (
                  <label key={course.code} className="flex items-start gap-3 p-2 rounded-md hover:bg-muted/50 cursor-pointer transition-colors group">
                    <input 
                      type="checkbox" 
                      className="sr-only" 
                      checked={!!selectedCodes[course.code]} 
                      onChange={() => toggleSelection(course.code)} 
                    />
                    <div className={`mt-0.5 flex-shrink-0 w-4 h-4 rounded border flex items-center justify-center transition-colors ${selectedCodes[course.code] ? 'bg-primary border-primary text-primary-foreground' : 'border-input bg-background group-hover:border-primary'}`}>
                      {selectedCodes[course.code] && <Check className="w-3 h-3" />}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium leading-none">{course.name}</span>
                      <span className="text-xs text-muted-foreground mt-1">{course.code}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Elective Courses */}
          {electiveCourses.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold text-sm flex items-center justify-between">
                <span>Cursos Electivos</span>
                <span className="bg-muted text-muted-foreground text-xs px-2 py-0.5 rounded-full">{electiveCourses.length}</span>
              </h3>
              
              <div className="mb-2 p-2.5 rounded-md bg-yellow-500/10 border border-yellow-500/20 text-yellow-600 text-xs text-center">
                Se recomienda seleccionar solo los electivos específicos que deseas cursar.
              </div>
              
              <div className="relative mb-2">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Buscar curso electivo o código..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-background border border-input rounded-md text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                />
              </div>
              
              {filteredElectives.length === 0 ? (
                <div className="py-4 text-center text-sm text-muted-foreground border border-dashed rounded-lg">
                  No se encontraron cursos que coincidan con "{searchQuery}"
                </div>
              ) : (
                <div className="space-y-1.5 border border-border rounded-lg p-2 bg-muted/20">
                  {filteredElectives.map((course) => (
                  <label key={course.code} className="flex items-start gap-3 p-2 rounded-md hover:bg-muted/50 cursor-pointer transition-colors group">
                    <input 
                      type="checkbox" 
                      className="sr-only" 
                      checked={!!selectedCodes[course.code]} 
                      onChange={() => toggleSelection(course.code)} 
                    />
                    <div className={`mt-0.5 flex-shrink-0 w-4 h-4 rounded border flex items-center justify-center transition-colors ${selectedCodes[course.code] ? 'bg-primary border-primary text-primary-foreground' : 'border-input bg-background group-hover:border-primary'}`}>
                      {selectedCodes[course.code] && <Check className="w-3 h-3" />}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium leading-none">{course.name}</span>
                      <span className="text-xs text-muted-foreground mt-1">{course.code}</span>
                    </div>
                  </label>
                ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-border flex-shrink-0">
          <button
            onClick={() => setStep('upload')}
            className="px-4 py-2 text-sm text-foreground bg-secondary hover:bg-secondary/80 rounded-md transition-colors"
          >
            Atrás
          </button>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">{selectedCount} seleccionados</span>
            <button
              onClick={handleImport}
              disabled={selectedCount === 0}
              className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              Importar {selectedCount > 0 ? selectedCount : ''}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderImportingStep = () => (
    <div className="flex flex-col items-center justify-center py-12 space-y-6">
      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
      <div className="text-center space-y-1">
        <h3 className="text-lg font-semibold">Importando cursos...</h3>
        <p className="text-sm text-muted-foreground">Obteniendo horarios y secciones desde la base de datos.</p>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <div className="bg-card w-full max-w-xl rounded-xl border border-border shadow-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold">Importar Carga Hábil</h2>
            {step === 'review' && (
              <span className="bg-muted text-muted-foreground text-xs px-2 py-0.5 rounded-full font-medium">Revisión</span>
            )}
          </div>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-muted text-muted-foreground transition-colors disabled:opacity-50">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {error && step !== 'upload' && (
            <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm flex gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {error && step === 'upload' && (
            <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm flex gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {step === 'upload' && renderUploadStep()}
          {step === 'review' && renderReviewStep()}
          {step === 'importing' && renderImportingStep()}
        </div>
      </div>
    </div>
  );
}
