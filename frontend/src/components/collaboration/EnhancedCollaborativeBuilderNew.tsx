'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useCollaborationStore } from '@/stores/collaborationStore';
import { SelectedSection, Course, SectionPopupState, Filter } from '@/types';
import { useAutocomplete } from '@/hooks/useAutocomplete';
import { websocketService } from '@/services/websocketService';

// Sub-components
import { CourseSearchSection } from './CourseSearchSection';
import { CourseSelectionList } from './CourseSelectionList';
import { ScheduleGenerationSection } from './ScheduleGenerationSection';

import { SectionSelectionPopup } from '@/components/dashboard/SectionSelectionPopup';
import { Users } from 'lucide-react';

interface CollaborativeCourseSelection {
  id?: number;
  course_code: string;
  course_name: string;
  section_code: string;
  professor?: string;
  schedule_data: any;
  selection_type: 'shared' | 'individual';
  shared_with_users: number[];
  priority: number;
  added_by: number;
  is_active: boolean;
}

export function EnhancedCollaborativeBuilder() {
  const { 
    currentSession, 
    onlineUsers,
    courseSelections,
    setCourseSelections,
    addCourseSelection,
    removeCourseSelection 
  } = useCollaborationStore();
  
  const [activeSearchType, setActiveSearchType] = useState<'shared' | 'individual'>('shared');
  const [loading, setLoading] = useState(false);
  const [conflicts, setConflicts] = useState<any[]>([]);
  const [expandedCourses, setExpandedCourses] = useState<Set<string>>(new Set());
  const [generatedSchedule, setGeneratedSchedule] = useState<any>(null);
  const [showScheduleVisualization, setShowScheduleVisualization] = useState(false);

  // Course search state
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<Course[]>([])
  const [sectionPopup, setSectionPopup] = useState<SectionPopupState | null>(null)
  const [filters, setFilters] = useState<Filter>({
    university: "UTEC",
    department: "",
    schedule: "",
    modality: "",
  })

  const currentUserId = getCurrentUserId();

  // Autocomplete hook for real-time search
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
  })

  function getCurrentUserId(): number {
    try {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        return user.id;
      }
    } catch (error) {
      console.error('Error parsing user from localStorage:', error);
    }
    return 1; // Default fallback
  }

  // Load course selections
  useEffect(() => {
    loadCourseSelections();
  }, [currentSession?.id]);

  const loadCourseSelections = async () => {
    if (!currentSession?.id) return;

    try {
      const { CollaborationAPI } = await import('@/services/collaborationAPI');
      const selections = await CollaborationAPI.getCourseSelections(currentSession.id);
      setCourseSelections(selections);
    } catch (error) {
      console.error('Error loading course selections:', error);
    }
  };

  // Add section function
  const addSection = async (course: Course, sectionId: number) => {
    const section = course.sections.find(s => s.id === sectionId);
    if (!section) return;

    const isAlreadySelected = courseSelections.some(cs => 
      cs.course_code === course.code && cs.section_code === section.section_number
    );

    if (isAlreadySelected) {
      alert('Esta sección ya está seleccionada');
      return;
    }

    const newSelection: SelectedSection = {
      sectionId: section.id,
      courseCode: course.code,
      courseName: course.name,
      sectionCode: section.section_number,
      professor: section.professor,
      sessions: section.sessions || []
    };

    const finalSelectionType = activeSearchType;
    const sharedWith = finalSelectionType === 'shared' 
      ? currentSession?.participants.map(p => p.id) || []
      : [];

    await addCourseSelectionLocal(newSelection, finalSelectionType, sharedWith);
    setSectionPopup(null);
  };

  const addCourseSelectionLocal = async (section: SelectedSection, selectionType: 'shared' | 'individual', sharedWith: number[] = []) => {
    const newSelection: CollaborativeCourseSelection = {
      course_code: section.courseCode,
      course_name: section.courseName,
      section_code: section.sectionCode,
      professor: section.professor,
      schedule_data: {
        sessions: section.sessions?.map(session => ({
          day_of_week: session.day_of_week,
          start_time: session.start_time,
          end_time: session.end_time,
          classroom: session.classroom,
          session_type: session.session_type,
          modality: 'Presencial'
        })) || []
      },
      selection_type: selectionType,
      shared_with_users: sharedWith,
      priority: 1,
      added_by: currentUserId,
      is_active: true
    };

    // Add to local state
    setCourseSelections([...courseSelections, newSelection]);

    // Save to database if we have a session
    if (currentSession?.id) {
      try {
        const { CollaborationAPI } = await import('@/services/collaborationAPI');
        
        const scheduleData = {
          sessions: section.sessions?.map(session => ({
            day_of_week: session.day_of_week,
            start_time: session.start_time,
            end_time: session.end_time,
            classroom: session.classroom,
            session_type: session.session_type,
            modality: 'Presencial'
          })) || []
        };

        const savedSelection = await CollaborationAPI.saveCourseSelection(currentSession.id, {
          course_code: section.courseCode,
          course_name: section.courseName,
          section_code: section.sectionCode,
          professor: section.professor,
          selection_type: selectionType,
          shared_with_users: sharedWith,
          priority: 1,
          schedule_data: scheduleData
        });

        // Update local selection with the ID from the server
        const updatedSelections = courseSelections.map(sel => 
          sel === newSelection ? { ...newSelection, id: savedSelection.id } : sel
        );
        setCourseSelections([...updatedSelections, { ...newSelection, id: savedSelection.id }]);

        // Send WebSocket update
        if (websocketService.isConnected()) {
          websocketService.sendCourseSelectionUpdate([...updatedSelections, { ...newSelection, id: savedSelection.id }]);
        }

      } catch (error) {
        console.error('Error saving course selection:', error);
      }
    }
  };

  const updateSelectionType = async (index: number, newType: 'shared' | 'individual', sharedWith: number[]) => {
    const selection = courseSelections[index];
    if (!selection) return;

    const updatedSelections = [...courseSelections];
    updatedSelections[index] = {
      ...selection,
      selection_type: newType,
      shared_with_users: newType === 'shared' ? sharedWith : []
    };

    setCourseSelections(updatedSelections);

    // Update in database via API if it has an ID (was saved)
    if (currentSession?.id && selection?.id) {
      try {
        const { CollaborationAPI } = await import('@/services/collaborationAPI');
        await CollaborationAPI.updateCourseSelection(currentSession.id, selection.id, {
          selection_type: newType,
          shared_with_users: newType === 'shared' ? sharedWith : [],
          priority: selection.priority || 1
        });
        console.log('Course selection type updated successfully in database');
      } catch (error) {
        console.error('Failed to update course selection in database:', error);
        // Revert local changes if API call failed
        setCourseSelections(courseSelections.map((sel, i) => 
          i === index ? selection : sel
        ));
      }
    }

    // Send WebSocket update
    if (websocketService.isConnected()) {
      websocketService.sendCourseSelectionUpdate(updatedSelections);
    }
  };

  const removeCourseSelectionLocal = async (selectionId: number) => {
    try {
      if (currentSession?.id) {
        const { CollaborationAPI } = await import('@/services/collaborationAPI');
        await CollaborationAPI.removeCourseSelection(currentSession.id, selectionId);
      }

      const updatedSelections = courseSelections.filter(sel => sel.id !== selectionId);
      setCourseSelections(updatedSelections);

      if (websocketService.isConnected()) {
        websocketService.sendCourseSelectionUpdate(updatedSelections);
      }
    } catch (error) {
      console.error('Error removing course selection:', error);
    }
  };

  const generateSchedules = async () => {
    if (!currentSession?.id) {
      alert('❌ No se puede generar horario: No hay sesión activa. Por favor, vuelve a unirte a la sesión colaborativa.');
      return;
    }

    if (courseSelections.length === 0) {
      alert('❌ Necesitas seleccionar al menos un curso para generar un horario.');
      return;
    }

    setLoading(true);
    setConflicts([]);

    try {
      // Generate schedule logic
      const sharedSelections = courseSelections.filter(s => s.selection_type === 'shared');
      const individualSelections = courseSelections.filter(s => s.selection_type === 'individual' && s.added_by === currentUserId);
      const userSections = sharedSelections.concat(individualSelections);

      // Transform data for API
      const currentUserSchedule = {
        user_id: currentUserId,
        shared_courses: sharedSelections.map(s => s.id).filter(id => id !== undefined),
        individual_courses: individualSelections.map(s => s.id).filter(id => id !== undefined),
        sharedCount: sharedSelections.length,
        individualCount: individualSelections.length,
        totalSections: userSections.length
      };

      try {
        const { CollaborationAPI } = await import('@/services/collaborationAPI');
        const generatedSchedule = await CollaborationAPI.generateSchedules({
          session_id: currentSession.id,
          course_selections: userSections,
          personalized_schedules: [currentUserSchedule]
        });
        
        console.log('Schedule generated successfully via API:', generatedSchedule);
        
        // Clear any existing conflicts
        setConflicts([]);
        
        // Transform and store the schedule data for visualization
        const transformedSchedule = transformScheduleData(userSections);
        setGeneratedSchedule(transformedSchedule);
        setShowScheduleVisualization(true);
        
        // Show success message
        alert(`✅ ¡Tu horario personal se generó exitosamente!\n\n• ${currentUserSchedule.sharedCount} secciones compartidas\n• ${currentUserSchedule.individualCount} secciones individuales\n• ${currentUserSchedule.totalSections} secciones totales\n\n¡Horario listo para visualizar!`);
        
      } catch (apiError) {
        console.error('Failed to generate schedule via API:', apiError);
        
        // Transform and store the schedule data for visualization even in fallback
        const transformedSchedule = transformScheduleData(userSections);
        setGeneratedSchedule(transformedSchedule);
        setShowScheduleVisualization(true);
        
        // Fallback: Show success with local data but warn about API issue
        alert(`⚠️ Horario generado localmente pero no se pudo guardar en el servidor.\n\n• ${currentUserSchedule.sharedCount} secciones compartidas\n• ${currentUserSchedule.individualCount} secciones individuales\n• ${currentUserSchedule.totalSections} secciones totales\n\nPor favor, verifica tu conexión e intenta nuevamente.`);
      }
    } catch (error) {
      console.error('Error generating schedule:', error);
      alert('❌ Error al generar el horario. Por favor, intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  const transformScheduleData = (userSections: CollaborativeCourseSelection[]) => {
    const courses = userSections.map((selection, index) => ({
      course_id: index + 1,
      course_code: selection.course_code,
      course_name: selection.course_name,
      section_id: index + 1,
      section_number: selection.section_code,
      professor: selection.professor || 'TBA',
      sessions: selection.schedule_data?.sessions?.map((session: any, sessionIndex: number) => ({
        session_id: sessionIndex + 1,
        session_type: "TEORÍA",
        day: session.day_of_week || session.day,
        start_time: session.start_time,
        end_time: session.end_time,
        location: session.classroom || session.location || "TBA",
        modality: session.modality || "Presencial"
      })) || []
    }));

    return {
      combinations: [{
        combination_id: "collaborative",
        course_count: courses.length,
        courses: courses
      }],
      total_combinations: 1,
      selected_courses_count: courses.length
    };
  };

  const getUserColor = (userId: number) => {
    const colors = [
      'bg-purple-500/20 text-purple-300 border border-purple-500/30',
      'bg-blue-500/20 text-blue-300 border border-blue-500/30', 
      'bg-green-500/20 text-green-300 border border-green-500/30',
      'bg-orange-500/20 text-orange-300 border border-orange-500/30',
      'bg-pink-500/20 text-pink-300 border border-pink-500/30',
      'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
    ];
    return colors[userId % colors.length];
  };

  const getSharedCourses = () => courseSelections.filter(cs => cs.selection_type === 'shared');
  const getIndividualCourses = () => courseSelections.filter(cs => cs.selection_type === 'individual');

  // Sync autocomplete with search results when autocomplete changes
  useEffect(() => {
    if (autocompleteSuggestions.length > 0 && autocompleteQuery.length >= 3) {
      setSearchResults(autocompleteSuggestions)
    } else if (autocompleteQuery.length === 0) {
      setSearchResults([])
    }
  }, [autocompleteSuggestions, autocompleteQuery])

  // Sync search query with autocomplete query
  useEffect(() => {
    setAutocompleteQuery(searchQuery)
  }, [searchQuery, setAutocompleteQuery])

  // Update search query when autocomplete query changes
  useEffect(() => {
    setSearchQuery(autocompleteQuery)
  }, [autocompleteQuery])

  if (!currentSession) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Cargando sesión colaborativa...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Session Header */}
      <Card className="bg-card border-border">
        <CardHeader>
          <div className="flex justify-between items-start mb-4">
            <div>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <Users className="h-5 w-5 text-primary" />
                {currentSession.name}
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {currentSession.participants.length} colaboradores • {onlineUsers.length} en línea
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                Código: {currentSession.session_code}
              </Badge>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Course Search Section */}
      <CourseSearchSection
        activeSearchType={activeSearchType}
        setActiveSearchType={setActiveSearchType}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        searchResults={searchResults}
        sectionPopup={sectionPopup}
        setSectionPopup={setSectionPopup}
        filters={filters}
        setFilters={setFilters}
        addSection={addSection}
        selectedSections={courseSelections}
      />

      {/* Course Selection List */}
      <CourseSelectionList
        courseSelections={courseSelections}
        expandedCourses={expandedCourses}
        setExpandedCourses={setExpandedCourses}
        currentUserId={currentUserId}
        getUserColor={getUserColor}
        updateSelectionType={updateSelectionType}
        removeCourseSelection={removeCourseSelectionLocal}
        getSharedCourses={getSharedCourses}
        getIndividualCourses={getIndividualCourses}
      />

      {/* Schedule Generation Section */}
      <ScheduleGenerationSection
        courseSelections={courseSelections}
        loading={loading}
        generateSchedules={generateSchedules}
        generatedSchedule={generatedSchedule}
        showScheduleVisualization={showScheduleVisualization}
        setShowScheduleVisualization={setShowScheduleVisualization}
        conflicts={conflicts}
        getSharedCourses={getSharedCourses}
        getIndividualCourses={getIndividualCourses}
      />

      {/* Section Selection Popup */}
      <SectionSelectionPopup
        sectionPopup={sectionPopup}
        setSectionPopup={setSectionPopup}
        selectedSections={courseSelections.map(cs => ({
          sectionId: cs.id || 0,
          courseCode: cs.course_code,
          courseName: cs.course_name,
          sectionCode: cs.section_code,
          professor: cs.professor || '',
          sessions: cs.schedule_data?.sessions || []
        }))}
        addSection={addSection}
        removeSection={(index: number) => {
          const selectedSectionsForThisCourse = courseSelections.filter(cs => 
            sectionPopup?.course && cs.course_code === sectionPopup.course.code
          );
          
          if (index >= 0 && index < selectedSectionsForThisCourse.length) {
            const sectionToRemove = selectedSectionsForThisCourse[index];
            if (sectionToRemove.id) {
              removeCourseSelectionLocal(sectionToRemove.id);
            }
          }
        }}
      />
    </div>
  );
}