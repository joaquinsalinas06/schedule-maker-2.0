'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { AutocompleteInput } from '@/components/ui/autocomplete-input';
import { useAutocomplete } from '@/hooks/useAutocomplete';
import { useCollaborationStore } from '@/stores/collaborationStore';
import { websocketService } from '@/services/websocketService';
import { apiService } from '@/services/api';
import { ScheduleVisualization } from '@/components/ScheduleVisualization';
import { Course, SelectedSection } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { 
  Users, 
  UserCircle, 
  MessageSquare, 
  Plus,
  Save,
  Eye,
  EyeOff,
  Search,
  Calendar,
  X,
  BookOpen,
  ChevronDown
} from 'lucide-react';


export function CollaborativeScheduleBuilder() {
  const { toast } = useToast();
  const {
    currentSession,
    isConnected,
    onlineUsers,
    typingUsers
  } = useCollaborationStore();

  const [selectedSections, setSelectedSections] = useState<SelectedSection[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sectionPopup, setSectionPopup] = useState<{courseId: number, course: any} | null>(null);
  const [generatedSchedules, setGeneratedSchedules] = useState<any>(null);
  const [showParticipants, setShowParticipants] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [collapsedCourses, setCollapsedCourses] = useState<Set<string>>(new Set());
  const [scheduleFilters, setScheduleFilters] = useState({
    department: "",
    semester: "ciclo-1",
  });

  // Use autocomplete hook for real-time search
  const {
    suggestions: autocompleteSuggestions,
    loading: autocompleteLoading,
    error: autocompleteError,
    query: autocompleteQuery,
    setQuery: setAutocompleteQuery
  } = useAutocomplete(undefined, {
    university: "UTEC",
    debounceMs: 300,
    minLength: 3,
    limit: 10
  });

  // Debounced typing indicator
  const handleTyping = useCallback(() => {
    if (!isTyping) {
      setIsTyping(true);
      websocketService.sendTypingStatus(true);
    }

    // Clear typing after 2 seconds of inactivity
    setTimeout(() => {
      setIsTyping(false);
      websocketService.sendTypingStatus(false);
    }, 2000);
  }, [isTyping]);

  // Load initial schedule data from session
  useEffect(() => {
    if (currentSession?.current_schedule_data) {
      setSelectedSections(currentSession.current_schedule_data.selectedSections || []);
      setGeneratedSchedules(currentSession.current_schedule_data.generatedSchedules || null);
    }
  }, [currentSession]);


  // Sync autocomplete with search results
  useEffect(() => {
    if (autocompleteSuggestions.length > 0 && autocompleteQuery.length >= 3) {
      setSearchResults(autocompleteSuggestions);
    } else if (autocompleteQuery.length === 0) {
      setSearchResults([]);
    }
  }, [autocompleteSuggestions, autocompleteQuery]);

  // Sync search query with autocomplete query
  useEffect(() => {
    setAutocompleteQuery(searchQuery);
  }, [searchQuery, setAutocompleteQuery]);

  // Helper function to group sections by course
  const groupSectionsByCourse = () => {
    const grouped = selectedSections.reduce((acc, section, index) => {
      const courseCode = section.courseCode
      if (!acc[courseCode]) {
        acc[courseCode] = {
          courseName: section.courseName,
          courseCode: section.courseCode,
          sections: []
        }
      }
      acc[courseCode].sections.push({ ...section, index })
      return acc
    }, {} as Record<string, { courseName: string, courseCode: string, sections: Array<any & { index: number }> }>)
    
    return Object.values(grouped)
  }

  // Toggle collapse for a course
  const toggleCourseCollapse = (courseCode: string) => {
    const newCollapsed = new Set(collapsedCourses)
    if (newCollapsed.has(courseCode)) {
      newCollapsed.delete(courseCode)
    } else {
      newCollapsed.add(courseCode)
    }
    setCollapsedCourses(newCollapsed)
  }

  const addSection = (course: Course, sectionId: number) => {
    const section = course.sections.find(s => s.id === sectionId);
    if (!section) return;

    const newSelection: SelectedSection = {
      sectionId: section.id,
      courseCode: course.code,
      courseName: course.name,
      sectionCode: section.section_number,
      professor: section.professor,
      sessions: section.sessions,
    };
    
    const newSections = [...selectedSections, newSelection];
    setSelectedSections(newSections);
    
    // Broadcast changes to other participants
    websocketService.sendScheduleUpdate({ 
      selectedSections: newSections,
      generatedSchedules 
    });
    websocketService.sendCourseAddition({ course, section });
    handleTyping();
  };

  const removeSection = (index: number) => {
    const newSections = selectedSections.filter((_, i) => i !== index);
    setSelectedSections(newSections);
    
    // Broadcast changes to other participants
    websocketService.sendScheduleUpdate({ 
      selectedSections: newSections,
      generatedSchedules 
    });
    websocketService.sendCourseRemoval(selectedSections[index].sectionId);
    handleTyping();
  };

  const saveSchedule = () => {
    // TODO: Implement save functionality
  };

  const handleGenerateSchedules = async () => {
    if (selectedSections.length === 0) {
      toast({
        title: 'Selección requerida',
        description: 'Por favor selecciona al menos un curso para generar horarios',
        variant: 'destructive'
      });
      return;
    }

    setIsLoading(true);
    try {
      const request = {
        selected_sections: selectedSections.map(s => s.sectionId),
        semester: 'ciclo-1'
      };
      
      const response = await apiService.generateSchedules(request);
      
      setGeneratedSchedules(response.data);
      
      // Broadcast the generated schedules to all participants
      websocketService.sendMessage({
        type: 'schedules_generated',
        data: {
          schedules: response.data,
          generated_by: 'current_user'
        }
      });

      // Update session data
      websocketService.sendScheduleUpdate({ 
        selectedSections,
        generatedSchedules: response.data 
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Error al generar horarios. Por favor intenta de nuevo.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const uniqueCourses = new Set(selectedSections.map(section => section.courseCode));
  const totalCourses = uniqueCourses.size;

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    
    setIsLoading(true);
    try {
      const params = {
        q: searchQuery.trim(),
        university: "UTEC",
        department: scheduleFilters.department || undefined,
        semester: scheduleFilters.semester || undefined,
        size: 20
      };
      
      const response = await apiService.searchCourses(params);
      setSearchResults(response || []);
    } catch (error) {
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!currentSession) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="text-muted-foreground">No active session. Please join a session first.</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 dark:from-slate-950 dark:via-purple-950 dark:to-slate-950 p-4 sm:p-6 lg:p-8">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8 h-full">
        {/* Main Schedule Area */}
        <div className="lg:col-span-3 space-y-4 sm:space-y-6">
          {/* Session Header */}
          <Card className="bg-card/80 backdrop-blur-sm border-border shadow-xl">
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-foreground">{currentSession.name}</CardTitle>
                  <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                      {isConnected ? 'Connected' : 'Disconnected'}
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      {onlineUsers.length} online
                    </div>
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      {typingUsers.length} typing
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setShowParticipants(!showParticipants)}>
                    {showParticipants ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button 
                    variant="default" 
                    size="sm" 
                    onClick={handleGenerateSchedules}
                    disabled={isLoading || selectedSections.length === 0}
                    className="bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white border-0"
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    {isLoading ? 'Generando...' : 'Generar Horarios'}
                  </Button>
                  <Button size="sm" onClick={saveSchedule}>
                    <Save className="h-4 w-4 mr-2" />
                    Save
                  </Button>
                </div>
              </div>
            </CardHeader>
          </Card>


          {/* Schedule Visualization */}
          {generatedSchedules && (
            <ScheduleVisualization 
              scheduleData={generatedSchedules} 
              onAddToFavorites={() => {}}
              favoritedCombinations={new Set()}
              showBackButton={false}
            />
          )}
        </div>

        {/* Side Panel */}
        <div className="space-y-4 sm:space-y-6">
          {/* Online Participants */}
          {showParticipants && (
            <Card className="bg-card/80 backdrop-blur-sm border-border shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg text-foreground">Participants ({onlineUsers.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {onlineUsers.length === 0 ? (
                    <div className="text-center py-4 text-muted-foreground text-sm">
                      No participants online
                    </div>
                  ) : (
                    onlineUsers.map((user) => (
                      <div key={user.id} className="flex items-center gap-2">
                        <UserCircle className="h-4 w-4" />
                        <span className="text-sm">{user.name}</span>
                        {typingUsers.includes(user.id) && (
                          <Badge variant="secondary" className="text-xs">typing...</Badge>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Compact Search */}
          <Card className="bg-card/80 backdrop-blur-sm border-border shadow-lg">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-2 mb-2">
                <Search className="w-4 h-4 text-purple-500" />
                <span className="text-sm font-medium text-foreground">Buscar Cursos</span>
              </div>
              
              <Input
                placeholder="Nombre del curso..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="text-sm"
              />
              
              <div className="grid grid-cols-1 gap-2">
                <select
                  value={scheduleFilters.department}
                  onChange={(e) => setScheduleFilters({...scheduleFilters, department: e.target.value})}
                  className="px-2 py-1 border rounded text-xs"
                >
                  <option value="">Todas las Carreras</option>
                  <option value="CS">Ciencias de la Computación</option>
                  <option value="DS">Data Science</option>
                  <option value="BIO">Bioingeniería</option>
                  <option value="IND">Industrial</option>
                  <option value="ME">Mecánica</option>
                  <option value="CI">Civil</option>
                  <option value="EL">Electrónica</option>
                  <option value="EN">Energía</option>
                  <option value="AM">Matemática</option>
                  <option value="MT">Mecatrónica</option>
                  <option value="HH">Humanidades</option>
                </select>
                
                <select
                  value={scheduleFilters.semester}
                  onChange={(e) => setScheduleFilters({...scheduleFilters, semester: e.target.value})}
                  className="px-2 py-1 border rounded text-xs"
                >
                  <option value="ciclo-1">Ciclo 1</option>
                  <option value="ciclo-2">Ciclo 2</option>
                  <option value="ciclo-3">Ciclo 3</option>
                  <option value="ciclo-4">Ciclo 4</option>
                  <option value="ciclo-5">Ciclo 5</option>
                  <option value="ciclo-6">Ciclo 6</option>
                  <option value="ciclo-7">Ciclo 7</option>
                  <option value="ciclo-8">Ciclo 8</option>
                  <option value="electivo">Electivos</option>
                </select>
              </div>
              
              <Button 
                onClick={handleSearch} 
                disabled={isLoading}
                size="sm"
                className="w-full bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white text-xs transition-all duration-200 hover:scale-[1.02] hover:shadow-lg"
              >
                {isLoading ? (
                  <span className="flex items-center gap-1 justify-center">
                    <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" />
                    Buscando...
                  </span>
                ) : (
                  "Buscar"
                )}
              </Button>
              
              <div className="text-xs text-muted-foreground text-center">
                En: <span className="font-medium text-purple-600">UTEC</span>
              </div>
            </CardContent>
          </Card>

          {/* Search Results */}
          {(autocompleteLoading || isLoading) && (
            <Card className="bg-card/80 backdrop-blur-sm border-border shadow-lg">
              <CardContent className="p-4">
                <div className="flex items-center justify-center py-4">
                  <div className="animate-spin h-6 w-6 border-2 border-purple-500 border-t-transparent rounded-full"></div>
                  <span className="ml-2 text-muted-foreground text-sm">Buscando cursos...</span>
                </div>
              </CardContent>
            </Card>
          )}
          
          {autocompleteError && (
            <Card className="bg-card/80 backdrop-blur-sm border-border shadow-lg">
              <CardContent className="p-4">
                <div className="p-3 text-red-600 text-sm bg-red-50 rounded-md">
                  Error: {autocompleteError}
                </div>
              </CardContent>
            </Card>
          )}
          
          {searchResults && searchResults.length > 0 && !(autocompleteLoading || isLoading) && (
            <Card className="bg-card/80 backdrop-blur-sm border-border shadow-lg">
              <CardContent className="p-3">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs text-muted-foreground">
                    {searchResults.length} encontrados
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setSearchResults([])}
                    className="h-6 px-2 text-xs"
                  >
                    Limpiar
                  </Button>
                </div>
                
                <div className="max-h-48 overflow-y-auto space-y-2">
                  {searchResults.slice(0, 5).map((course, index) => (
                      <div 
                        key={course.id} 
                        className="p-2 border border-border rounded bg-muted/30 hover:bg-muted/50 transition-all duration-200 animate-in slide-in-from-right"
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-medium text-foreground truncate">
                              {course.name}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {course.code}
                            </div>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => setSectionPopup({courseId: course.id, course})}
                            className="h-6 px-2 text-xs bg-purple-500 hover:bg-purple-600 text-white transition-all duration-200 hover:scale-110 hover:shadow-md"
                          >
                            <span className="transform transition-transform duration-200 group-hover:rotate-90">+</span>
                          </Button>
                        </div>
                      </div>
                    ))}
                    {searchResults.length > 5 && (
                      <div className="text-xs text-center text-muted-foreground py-1">
                        +{searchResults.length - 5} más cursos
                      </div>
                    )}
                  </div>
              </CardContent>
            </Card>
          )}

          {/* Selected Sections */}
          <Card className="bg-card/80 backdrop-blur-sm border-border shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <BookOpen className="w-5 h-5" />
                Secciones Seleccionadas ({selectedSections.length})
              </CardTitle>
              <CardDescription>Total: {totalCourses} cursos</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {selectedSections.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground text-sm animate-in fade-in duration-300">
                    No hay secciones seleccionadas
                  </div>
                ) : (
                  <>
                    {groupSectionsByCourse().map((courseGroup, groupIndex) => (
                      <div 
                        key={courseGroup.courseCode} 
                        className="border border-border rounded-lg bg-muted/30 animate-in slide-in-from-left duration-300"
                        style={{ animationDelay: `${groupIndex * 50}ms` }}
                      >
                        {/* Course Header */}
                        <div className="flex items-center justify-between p-3 transition-all duration-200 hover:bg-muted/40">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm text-foreground">
                              {courseGroup.courseCode}
                            </div>
                            <div className="text-xs text-muted-foreground truncate">
                              {courseGroup.courseName}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {courseGroup.sections.length} sección{courseGroup.sections.length > 1 ? 'es' : ''}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {courseGroup.sections.length > 1 && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => toggleCourseCollapse(courseGroup.courseCode)}
                                className="p-1 hover:bg-muted transition-all duration-200 hover:scale-105"
                              >
                                <ChevronDown 
                                  className={`w-4 h-4 transition-all duration-300 ease-out ${
                                    collapsedCourses.has(courseGroup.courseCode) 
                                      ? 'rotate-180 text-muted-foreground' 
                                      : 'rotate-0 text-foreground'
                                  }`} 
                                />
                              </Button>
                            )}
                          </div>
                        </div>
                        
                        {/* Sections List with Animation */}
                        <div className={`overflow-hidden transition-all duration-300 ease-out ${
                          courseGroup.sections.length === 1 || !collapsedCourses.has(courseGroup.courseCode)
                            ? 'max-h-96 opacity-100'
                            : 'max-h-0 opacity-0'
                        }`}>
                          <div className="border-t border-border bg-muted/20">
                            {courseGroup.sections.map((section, sectionIndex) => (
                              <div 
                                key={section.index} 
                                className="flex items-center justify-between p-2 border-b border-border/50 last:border-b-0 transition-all duration-200 hover:bg-muted/40 animate-in fade-in slide-in-from-left"
                                style={{ animationDelay: `${sectionIndex * 25}ms` }}
                              >
                                <div className="flex-1 min-w-0">
                                  <div className="text-xs font-medium text-foreground">
                                    Sección {section.sectionCode}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    Prof. {section.professor}
                                  </div>
                                </div>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => removeSection(section.index)}
                                  className="text-red-400 hover:text-red-300 hover:bg-red-500/10 p-1 transition-all duration-200 hover:scale-105"
                                >
                                  <X className="w-3 h-3" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Section Selection Popup */}
      {sectionPopup && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="bg-card border-border shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <CardHeader className="border-b border-border">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-foreground">{sectionPopup.course.name}</CardTitle>
                  <CardDescription className="text-muted-foreground">
                    {sectionPopup.course.code}
                  </CardDescription>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSectionPopup(null)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[60vh] overflow-y-auto">
                <div className="p-6 space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="font-medium text-foreground">Selecciona las secciones que te interesan:</h4>
                    <div className="text-sm text-muted-foreground">
                      {selectedSections.filter(s => s.courseCode === sectionPopup.course.code).length} de {sectionPopup.course.sections?.length || 0} seleccionadas
                    </div>
                  </div>
                  {sectionPopup.course.sections?.map((section: any) => {
                    const isSelected = selectedSections.some(s => s.sectionId === section.id);
                    const selectedIndex = selectedSections.findIndex(s => s.sectionId === section.id);
                    
                    return (
                      <div key={section.id} className={`flex items-center justify-between p-4 border rounded-lg transition-all duration-200 ${
                        isSelected 
                          ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20' 
                          : 'border-border bg-muted/30 hover:bg-muted/50'
                      }`}>
                        <div className="flex-1">
                          <div className="font-medium text-foreground">Sección {section.section_number}</div>
                          <div className="text-sm text-muted-foreground">
                            Prof. {section.professor} • {section.enrolled}/{section.capacity} estudiantes
                          </div>
                          <div className="text-xs text-muted-foreground mt-2">
                            {section.sessions?.map((session: any, idx: number) => (
                              <div key={idx} className="inline-block mr-3 mb-1">
                                <span className={`px-2 py-1 rounded text-xs ${
                                  isSelected 
                                    ? 'bg-purple-200 dark:bg-purple-800 text-purple-800 dark:text-purple-200'
                                    : 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200'
                                }`}>
                                  {(() => {
                                    const dayMap: Record<string, string> = {
                                      'Monday': 'Lun', 'Tuesday': 'Mar', 'Wednesday': 'Mié', 
                                      'Thursday': 'Jue', 'Friday': 'Vie', 'Saturday': 'Sáb', 'Sunday': 'Dom'
                                    };
                                    return dayMap[session.day] || session.day;
                                  })()} {session.start_time?.slice(0,5)}-{session.end_time?.slice(0,5)}
                                </span>
                              </div>
                            )) || <span className="text-muted-foreground">Sin horarios definidos</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {isSelected && (
                            <span className="text-xs text-purple-600 dark:text-purple-400 font-medium">
                              ✓ Seleccionada
                            </span>
                          )}
                          <Button
                            size="sm"
                            variant={isSelected ? "destructive" : "default"}
                            className={isSelected ? 
                              "bg-red-500 hover:bg-red-600 text-white border-0" :
                              "bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white border-0"
                            }
                            onClick={() => {
                              if (isSelected) {
                                removeSection(selectedIndex);
                              } else {
                                addSection(sectionPopup.course, section.id);
                              }
                            }}
                          >
                            {isSelected ? (
                              <>
                                <X className="w-4 h-4 mr-1" />
                                Quitar
                              </>
                            ) : (
                              <>
                                <Plus className="w-4 h-4 mr-1" />
                                Agregar
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
            <div className="p-6 border-t border-border bg-muted/20">
              <div className="flex justify-between items-center">
                <div className="text-sm text-muted-foreground">
                  {selectedSections.filter(s => s.courseCode === sectionPopup.course.code).length} secciones seleccionadas de este curso
                </div>
                <Button
                  onClick={() => setSectionPopup(null)}
                  className="bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white border-0"
                >
                  Listo
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
