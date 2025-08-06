'use client';

import React, { useState, useEffect } from 'react';
import { useCollaborationStore } from '@/stores/collaborationStore';
import { SelectedSection, Course, SectionPopupState, Filter } from '@/types';
import { useAutocomplete } from '@/hooks/useAutocomplete';
import { websocketService } from '@/services/websocketService';

// Sub-components
import { CourseSearchSection } from './CourseSearchSection';
import { CourseSelectionList } from './CourseSelectionList';
import { ScheduleGenerationSection } from './ScheduleGenerationSection';

import { SectionSelectionPopup } from '@/components/dashboard/SectionSelectionPopup';

import { 
  Users, 
  BookOpen, 
  Target, 
  Share2, 
  User, 
  ChevronDown, 
  ChevronRight, 
  Calendar, 
  Clock, 
  Zap, 
  Eye, 
  EyeOff, 
  X 
} from 'lucide-react';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

import { useToast } from '@/hooks/use-toast';

// Additional component imports
import { CourseSearchCard } from '@/components/dashboard/CourseSearchCard';
import { CourseResultsGrid } from '@/components/dashboard/CourseResultsGrid';
import { ScheduleVisualization } from '@/components/ScheduleVisualization';



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
    removeCourseSelection,
    generatedSchedule,
    setGeneratedSchedule
  } = useCollaborationStore();
  const [activeSearchType, setActiveSearchType] = useState<'shared' | 'individual'>('shared');
  const [activeTab, setActiveTab] = useState<'shared' | 'individual'>('shared');
  const [loading, setLoading] = useState(false);
  const [conflicts, setConflicts] = useState<any[]>([]);
  const [expandedCourses, setExpandedCourses] = useState<Set<string>>(new Set());

  // Course search state (matching generate page)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<Course[]>([])
  const [resultsPerPage] = useState(10)
  const [sectionPopup, setSectionPopup] = useState<SectionPopupState | null>(null)
  const [filters, setFilters] = useState<Filter>({
    university: "UTEC",
    department: "",
    schedule: "",
    modality: "",
  })

  // Get current user from localStorage or session participants
  const getCurrentUserId = () => {
    try {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        return user.id;
      }
    } catch (error) {
      console.warn('Failed to parse user from localStorage');
    }
    // Fallback to session participants (assuming current user is in the session)
    return currentSession?.participants[0]?.id || 1;
  };
  
  const currentUserId = getCurrentUserId();

  // Autocomplete hook for real-time search (matching generate page)
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

  useEffect(() => {
    if (currentSession) {
      loadCourseSelections();
      
      // Ensure WebSocket connection is established (but avoid duplicate connections)
      if (!websocketService.isConnected()) {
        const token = localStorage.getItem('token');
        if (token) {
          console.log('🔌 Re-establishing WebSocket connection for session:', currentSession.session_code);
          websocketService.connect(currentSession.session_code, token);
        }
      }
    }
  }, [currentSession]);

  // Separate useEffect for cleanup only on component unmount
  useEffect(() => {
    return () => {
      if (websocketService.isConnected()) {
        console.log('🔌 Cleaning up WebSocket connection on component unmount');
        websocketService.disconnect();
      }
    };
  }, []); // Empty dependency array = only on mount/unmount

  // Load course selections when session changes or component mounts
  const loadCourseSelections = async () => {
    if (!currentSession) return;
    
    console.log('🔄 Loading course selections...');
    console.log('- Session ID:', currentSession.id);
    console.log('- Current courseSelections in store:', courseSelections.length);
    
    try {
      // Load course selections from API for this session
      const { CollaborationAPI } = await import('@/services/collaborationAPI');
      const selections = await CollaborationAPI.getCourseSelections(currentSession.id);
      
      // Fix missing added_by field - map user_id to added_by for compatibility
      const fixedSelections = selections.map((selection: any) => ({
        ...selection,
        added_by: selection.user_id || selection.added_by // Use user_id from DB or existing added_by
      }));
      
      console.log('✅ Loaded from API:', fixedSelections.length, 'selections');
      console.log('- Shared from API:', fixedSelections.filter(s => s.selection_type === 'shared').length);
      console.log('- Individual from API:', fixedSelections.filter(s => s.selection_type === 'individual').length);
      console.log('- Fixed added_by values:', fixedSelections.map(s => s.added_by));
      setCourseSelections(fixedSelections);
    } catch (error) {
      console.error('❌ Failed to load course selections from API:', error);
      console.log('- Keeping existing store selections:', courseSelections.length);
      // Keep existing selections in store if API fails
    }
  };

  // Sync autocomplete with search results when autocomplete changes (matching generate page)
  useEffect(() => {
    if (autocompleteSuggestions.length > 0 && autocompleteQuery.length >= 3) {
      setSearchResults(autocompleteSuggestions)
    } else if (autocompleteQuery.length === 0) {
      setSearchResults([])
    }
  }, [autocompleteSuggestions, autocompleteQuery])

  // Sync search query with autocomplete query (matching generate page)
  useEffect(() => {
    setAutocompleteQuery(searchQuery)
  }, [searchQuery, setAutocompleteQuery])

  // Update search query when autocomplete query changes
  useEffect(() => {
    setSearchQuery(autocompleteQuery)
  }, [autocompleteQuery])

  // Add section function matching generate page
  const addSection = async (course: Course, sectionId: number) => {
    const section = course.sections.find(s => s.id === sectionId)
    if (!section) return

    // Check if this section is already selected
    const isAlreadySelected = courseSelections.some(cs => 
      cs.course_code === course.code && 
      cs.schedule_data?.sectionId === section.id
    );
    
    if (isAlreadySelected) {
      console.log('Section already selected, skipping...');
      return;
    }

    const newSelection: SelectedSection = {
      sectionId: section.id,
      courseCode: course.code,
      courseName: course.name,
      sectionCode: section.section_number,
      professor: section.professor,
      sessions: section.sessions,
    }
    
    // Convert to collaboration format
    const finalSelectionType = activeSearchType;
    const sharedWith = finalSelectionType === 'shared' 
      ? currentSession?.participants
          .filter(p => p.id && p.id !== currentUserId) // Filter out null/undefined IDs
          .map(p => p.id)
          .filter(id => typeof id === 'number') || [] // Extra safety: ensure they're numbers
      : [];
    
    await addCourseSelectionLocal(newSelection, finalSelectionType, sharedWith);
  }


  const addCourseSelectionLocal = async (section: SelectedSection, selectionType: 'shared' | 'individual', sharedWith: number[] = []) => {
    const newSelection: CollaborativeCourseSelection = {
      course_code: section.courseCode,
      course_name: section.courseName,
      section_code: section.sectionCode,
      professor: section.professor,
      schedule_data: section,
      selection_type: selectionType,
      shared_with_users: selectionType === 'shared' ? sharedWith : [],
      priority: 1,
      added_by: currentUserId,
      is_active: true
    };

    // Save to database via API first to get the ID
    if (currentSession?.id) {
      console.log('💾 Attempting to save course selection to database...', {
        sessionId: currentSession.id,
        courseCode: section.courseCode,
        selectionType: selectionType,
        participants: currentSession?.participants,
        sharedWith: selectionType === 'shared' ? sharedWith : 'N/A'
      });
      
      try {
        const { CollaborationAPI } = await import('@/services/collaborationAPI');
        // Convert section to plain object to ensure it's serializable
        const scheduleData = {
          sectionId: section.sectionId,
          courseCode: section.courseCode,
          courseName: section.courseName,
          sectionCode: section.sectionCode,
          professor: section.professor,
          sessions: section.sessions || []
        };
        
        const apiData = {
          course_code: section.courseCode,
          course_name: section.courseName,
          section_code: section.sectionCode,
          professor: section.professor || 'Unknown',
          schedule_data: scheduleData,
          selection_type: selectionType,
          shared_with_users: selectionType === 'shared' ? (sharedWith || []) : [],
          priority: 1
        };
        
        console.log('📤 Sending to API:', apiData);
        const savedSelection = await CollaborationAPI.saveCourseSelection(currentSession.id, apiData);
        
        // Add the saved selection (with database ID) to store
        const selectionWithId: CollaborativeCourseSelection = {
          ...newSelection,
          id: savedSelection.id || undefined
        };
        addCourseSelection(selectionWithId);
        
        console.log('✅ Course selection saved to database successfully:', savedSelection);
      } catch (error: any) {
        console.error('❌ Failed to save course selection to database:', error);
        console.error('Full error response:', error.response);
        console.error('Error details:', error.response?.data || error.message);
        if (error.response?.data?.detail) {
          console.error('Validation errors:', error.response.data.detail);
        }
        // Fallback: Add to store without ID
        addCourseSelection(newSelection);
      }
    } else {
      console.warn('⚠️ No session ID available, adding to local store only');
      addCourseSelection(newSelection);
    }
    
    // Send WebSocket update
    if (websocketService.isConnected()) {
      websocketService.sendCourseSelectionAdd(newSelection);
    }
  };

  const removeCourseSelectionLocal = async (index: number) => {
    const selectionToRemove = courseSelections[index];
    
    // Remove from store first (for immediate UI update)
    removeCourseSelection(index);
    
    // Remove from database via API if it has an ID (was saved)
    if (currentSession?.id && selectionToRemove?.id) {
      try {
        const { CollaborationAPI } = await import('@/services/collaborationAPI');
        await CollaborationAPI.removeCourseSelection(currentSession.id, selectionToRemove.id);
        console.log('Course selection removed from database');
      } catch (error) {
        console.error('Failed to remove course selection from database:', error);
        // Could show a toast notification here
      }
    }
    
    // Send WebSocket update
    if (websocketService.isConnected()) {
      websocketService.sendCourseSelectionRemove(index);
    }
  };

  const updateSelectionType = async (index: number, newType: 'shared' | 'individual', sharedWith: number[] = []) => {
    const selection = courseSelections[index];
    const updatedSelection = { 
      ...selection, 
      selection_type: newType,
      shared_with_users: newType === 'shared' ? sharedWith : []
    };
    
    const updatedSelections = courseSelections.map((sel, i) => 
      i === index ? updatedSelection : sel
    );
    
    // Update store first (for immediate UI update)
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
        // Could show a toast notification here
      }
    }
    
    // Send WebSocket update
    if (websocketService.isConnected()) {
      websocketService.sendCourseSelectionUpdate(updatedSelections);
    }
  };

  const getSharedCourses = () => {
    return courseSelections.filter(selection => selection.selection_type === 'shared');
  };

  const getIndividualCourses = () => {
    return courseSelections.filter(selection => selection.selection_type === 'individual');
  };

  // Group courses by course code for collapsible display
  const groupCoursesByCode = (courses: CollaborativeCourseSelection[]) => {
    const grouped: { [courseCode: string]: CollaborativeCourseSelection[] } = {};
    courses.forEach(course => {
      if (!grouped[course.course_code]) {
        grouped[course.course_code] = [];
      }
      grouped[course.course_code].push(course);
    });
    return grouped;
  };

  const toggleCourseExpansion = (courseCode: string) => {
    const newExpanded = new Set(expandedCourses);
    if (newExpanded.has(courseCode)) {
      newExpanded.delete(courseCode);
    } else {
      newExpanded.add(courseCode);
    }
    setExpandedCourses(newExpanded);
  };

  // Get all users who added sections for a course
  const getUsersForCourse = (courses: CollaborativeCourseSelection[]) => {
    const userIds = new Set<number>();
    courses.forEach(course => {
      userIds.add(course.added_by);
      course.shared_with_users.forEach(userId => userIds.add(userId));
    });
    return Array.from(userIds).map(userId => 
      currentSession?.participants.find(p => p.id === userId)
    ).filter(Boolean);
  };

  const generateSchedules = async () => {
    if (courseSelections.length === 0) {
      return; // Just do nothing if no sections
    }

    setLoading(true);
    try {
      console.log('Generating personal schedule...');
      
      // Get shared and individual sections for current user
      const sharedSections = getSharedCourses();
      const allIndividualSections = getIndividualCourses();
      const individualSections = allIndividualSections.filter(
        selection => selection.added_by === currentUserId
      );
      
      console.log('🔍 Debug schedule generation:');
      console.log('- All courseSelections:', courseSelections.length);
      console.log('- Shared sections:', sharedSections.length);
      console.log('- All individual sections:', allIndividualSections.length);
      console.log('- User individual sections (filtered by added_by):', individualSections.length);
      console.log('- Current user ID:', currentUserId);
      console.log('- Individual selections added_by values:', allIndividualSections.map(s => s.added_by));
      
      // Combine shared + individual sections for current user
      const userSections = [...sharedSections, ...individualSections];
      
      // Generate schedule for current user only
      const currentUserSchedule = {
        participantId: currentUserId,
        participantName: currentSession?.participants.find(p => p.id === currentUserId)?.name || 'You',
        sections: userSections,
        totalSections: userSections.length,
        sharedCount: sharedSections.length,
        individualCount: individualSections.length
      };
      
      // Make real API call for schedule generation
      if (currentSession?.id) {
        try {
          // Convert collaborative course selections to section IDs like regular schedule generation
          const sectionIds = userSections.map(selection => selection.schedule_data?.sectionId).filter(id => id);
          
          console.log('📋 Generating schedule with section IDs:', sectionIds);
          
          // Use the regular API service for schedule generation
          const { apiService } = await import('@/services/api');
          const generatedSchedule = await apiService.generateSchedules({
            selected_sections: sectionIds
          });
          
          console.log('Schedule generated successfully via API:', generatedSchedule);
          
          // Clear any existing conflicts
          setConflicts([]);
          
          // Use the API response directly (it's already in the right format for ScheduleVisualization)
          console.log('🎯 Setting generated schedule from API:', generatedSchedule.data);
          setGeneratedSchedule(generatedSchedule.data);
          
          // Schedule generated successfully - no alert needed, visual feedback is enough
          
          // Send schedule update via WebSocket for real-time sync
          if (websocketService.isConnected()) {
            websocketService.sendScheduleGeneration([currentUserSchedule]);
          }
          
        } catch (apiError) {
          console.error('Failed to generate schedule via API:', apiError);
          
          // Transform and store the schedule data for visualization even in fallback
          const transformedSchedule = transformScheduleData(userSections);
          console.log('🎯 Setting generated schedule (fallback):', transformedSchedule);
          setGeneratedSchedule(transformedSchedule);
          
          // Fallback: Use transformed data (no alert needed)
        }
      } else {
        // No session ID available - just return without doing anything
        console.warn('Cannot generate schedule: No active session found');
      }
      
    } catch (error) {
      console.error('Failed to generate schedule:', error);
      // No alert needed - user will see loading state disappear
    } finally {
      setLoading(false);
    }
  };

  const getUserColor = (userId: number) => {
    const colors = [
      'bg-purple-100 text-purple-800',
      'bg-blue-100 text-blue-800', 
      'bg-green-100 text-green-800',
      'bg-orange-100 text-orange-800',
      'bg-pink-100 text-pink-800',
      'bg-indigo-100 text-indigo-800'
    ];
    return colors[userId % colors.length];
  };

  // Transform collaborative course selections to ScheduleVisualization format
  const transformScheduleData = (userSections: CollaborativeCourseSelection[]) => {
    console.log('🔄 Transforming schedule data for visualization:', userSections);
    
    const courses = userSections.map((selection, index) => {
      console.log('🔄 Processing selection:', selection);
      
      return {
        course_id: index + 1,
        course_code: selection.course_code,
        course_name: selection.course_name,
        section_id: index + 1,
        section_number: selection.section_code,
        professor: selection.professor || 'TBA',
        sessions: selection.schedule_data?.sessions?.map((session: any, sessionIndex: number) => {
          console.log('🔄 Processing session:', session);
          
          return {
            session_id: sessionIndex + 1,
            session_type: "TEORÍA",
            day: session.day_of_week || session.day,
            start_time: session.start_time,
            end_time: session.end_time,
            location: session.classroom || session.location || "TBA",
            modality: session.modality || "Presencial"
          };
        }) || []
      };
    });

    const transformedData = {
      combinations: [{
        combination_id: "collaborative",
        course_count: courses.length,
        courses: courses
      }],
      total_combinations: 1,
      selected_courses_count: courses.length
    };
    
    console.log('✅ Transformed schedule data:', transformedData);
    return transformedData;
  };

  if (!currentSession) {
    return (
      <div className="text-center py-12">
        <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-lg font-semibold mb-2">No Active Session</h3>
        <p className="text-muted-foreground">Join or create a collaborative session to start building schedules together.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Session Header - Keep as is */}
      <Card className="bg-card border-border">
        <CardHeader>
          <div className="flex justify-between items-start mb-4">
            <div>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <Users className="h-5 w-5 text-primary" />
                {currentSession.name}
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {currentSession.participants.length} collaborators • {onlineUsers.length} online
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                Live Session
              </Badge>
            </div>
          </div>
          
          {/* Participants List */}
          <div>
            <h4 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
              <Users className="h-4 w-4" />
              Participants ({currentSession.participants.length})
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2">
              {currentSession.participants.map((participant, participantIndex) => (
                <div key={`participant-${participant.id || participantIndex}-${participant.name || participantIndex}`} className="flex items-center gap-2 text-sm p-2 rounded-md bg-muted/30">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${getUserColor(participant.id)}`}>
                    {participant.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="truncate font-medium text-xs">{participant.name}</div>
                    {participant.id === currentUserId && (
                      <div className="text-xs text-muted-foreground">You</div>
                    )}
                  </div>
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    onlineUsers.some(u => u.id === participant.id) ? 'bg-green-500' : 'bg-gray-300'
                  }`} />
                </div>
              ))}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Two-Column Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Left Column - Schedule Visualization (Large) */}
        <div className="xl:col-span-8">
          <Card className="bg-card/80 backdrop-blur-sm border-border shadow-lg">
            <CardHeader>
              <div className="flex justify-end items-center">{/* Removed duplicate title - ScheduleVisualization has its own */}
                <Button 
                  className="bg-gradient-to-r from-cyan-500 to-teal-600 hover:from-cyan-600 hover:to-teal-700"
                  disabled={courseSelections.length === 0 || loading}
                  onClick={generateSchedules}
                >
                  {loading ? (
                    <>
                      <Clock className="h-4 w-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Zap className="h-4 w-4 mr-2" />
                      Generate Schedule
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {(() => {
                console.log('🖥️  Render check - generatedSchedule exists:', !!generatedSchedule);
                console.log('🖥️  generatedSchedule data:', generatedSchedule);
                return generatedSchedule;
              })() ? (
                <ScheduleVisualization 
                  scheduleName="Collaborative Schedule"
                  scheduleData={generatedSchedule}
                  showBackButton={false}
                />
              ) : (
                <div className="text-center py-24 text-muted-foreground">
                  <Calendar className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-semibold mb-2">Schedule Visualization</h3>
                  <p className="text-sm">Add sections and generate your schedule to see it here</p>
                  <p className="text-xs mt-2">
                    Current sections: {getSharedCourses().length} shared • {getIndividualCourses().length} individual
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Course Search & Section Management */}
        <div className="xl:col-span-4 space-y-4">
          {/* Course Search Section */}
          <Card className="bg-card/80 backdrop-blur-sm border-border shadow-lg">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <BookOpen className="h-4 w-4" />
                Course Search
              </CardTitle>
              <Button
                size="sm"
                variant="default"
                onClick={() => {
                  const newType = activeSearchType === 'shared' ? 'individual' : 'shared';
                  setActiveSearchType(newType);
                  setActiveTab(newType); // Sync both buttons
                }}
                className={`flex items-center gap-1 text-xs mt-2 transition-colors ${
                  activeSearchType === 'shared' 
                    ? 'bg-blue-500 hover:bg-blue-600' 
                    : 'bg-green-500 hover:bg-green-600'
                }`}
              >
                {activeSearchType === 'shared' ? (
                  <>
                    <Share2 className="h-3 w-3" />
                    Shared
                  </>
                ) : (
                  <>
                    <User className="h-3 w-3" />
                    Individual
                  </>
                )}
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              <CourseSearchCard
                filters={filters}
                setFilters={setFilters}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                isLoading={autocompleteLoading}
              />
              
              {/* Course Results - Compact */}
              <div className="max-h-64 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-cyan-500 scrollbar-track-transparent">
                {searchResults.length > 0 ? (
                  <CourseResultsGrid
                    searchResults={searchResults}
                    displayPage={1}
                    resultsPerPage={resultsPerPage}
                    setSectionPopup={setSectionPopup}
                    autocompleteLoading={autocompleteLoading}
                    isLoading={autocompleteLoading}
                    autocompleteError={autocompleteError}
                    searchQuery={searchQuery}
                  />
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <p className="text-sm">Search for courses above</p>
                    <p className="text-xs mt-1">Adding as: <span className="font-medium">{activeSearchType}</span></p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Section Management Tabs */}
          <Card className="bg-card/80 backdrop-blur-sm border-border shadow-lg">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Section Management</CardTitle>
                <div className="text-xs text-muted-foreground">
                  {getSharedCourses().length + getIndividualCourses().length} total
                </div>
              </div>
              {/* Single Toggle Button */}
              <Button
                size="sm"
                variant="default"
                onClick={() => {
                  const newType = activeTab === 'shared' ? 'individual' : 'shared';
                  setActiveTab(newType);
                  setActiveSearchType(newType); // Sync both buttons
                }}
                className={`flex items-center gap-2 text-xs h-8 px-3 mt-2 transition-colors ${
                  activeTab === 'shared' 
                    ? 'bg-blue-500 hover:bg-blue-600' 
                    : 'bg-green-500 hover:bg-green-600'
                }`}
              >
                {activeTab === 'shared' ? (
                  <>
                    <Share2 className="h-3 w-3" />
                    Shared ({getSharedCourses().length})
                  </>
                ) : (
                  <>
                    <User className="h-3 w-3" />
                    Individual ({getIndividualCourses().length})
                  </>
                )}
              </Button>
            </CardHeader>
            <CardContent>
              <div className="max-h-96 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-cyan-500 scrollbar-track-transparent">
                {activeTab === 'shared' ? (
                  getSharedCourses().length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Target className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No shared sections yet</p>
                      <p className="text-xs">Search and add sections to share with your team</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {Object.entries(groupCoursesByCode(getSharedCourses())).map(([courseCode, courseSections]) => {
                        const isExpanded = expandedCourses.has(`shared-${courseCode}`);
                        const usersForCourse = getUsersForCourse(courseSections);
                        const courseName = courseSections[0]?.course_name || '';
                        
                        return (
                          <div key={`shared-${courseCode}`} className="border rounded-lg bg-muted/30 border-border">
                            <div 
                              className="flex items-center justify-between p-2 cursor-pointer hover:bg-muted/50 transition-colors"
                              onClick={() => toggleCourseExpansion(`shared-${courseCode}`)}
                            >
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                {isExpanded ? (
                                  <ChevronDown className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                ) : (
                                  <ChevronRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                )}
                                <div className="min-w-0 flex-1">
                                  <div className="font-medium text-xs text-foreground truncate">{courseCode}</div>
                                  <div className="text-xs text-muted-foreground truncate">{courseName}</div>
                                </div>
                                <Badge variant="secondary" className="text-xs">
                                  {courseSections.length}
                                </Badge>
                              </div>
                            </div>
                            
                            {isExpanded && (
                              <div className="border-t border-border bg-background/50">
                                {courseSections.map((course, index) => (
                                  <div key={`section-${index}`} className="p-2 border-b border-border last:border-b-0 flex items-center justify-between">
                                    <div className="flex-1 min-w-0">
                                      <div className="text-xs font-medium">Section {course.section_code}</div>
                                      <div className="text-xs text-muted-foreground truncate">Prof. {course.professor}</div>
                                    </div>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        removeCourseSelectionLocal(courseSelections.indexOf(course));
                                      }}
                                      className="h-6 w-6 p-0 text-red-500 hover:text-red-600"
                                    >
                                      <X className="h-3 w-3" />
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )
                ) : (
                  getIndividualCourses().length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No individual sections yet</p>
                      <p className="text-xs">Search and add sections for your personal schedule</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {Object.entries(groupCoursesByCode(getIndividualCourses())).map(([courseCode, courseSections]) => {
                        const isExpanded = expandedCourses.has(`individual-${courseCode}`);
                        const courseName = courseSections[0]?.course_name || '';
                        
                        return (
                          <div key={`individual-${courseCode}`} className="border rounded-lg bg-muted/30 border-border">
                            <div 
                              className="flex items-center justify-between p-2 cursor-pointer hover:bg-muted/50 transition-colors"
                              onClick={() => toggleCourseExpansion(`individual-${courseCode}`)}
                            >
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                {isExpanded ? (
                                  <ChevronDown className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                ) : (
                                  <ChevronRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                )}
                                <div className="min-w-0 flex-1">
                                  <div className="font-medium text-xs text-foreground truncate">{courseCode}</div>
                                  <div className="text-xs text-muted-foreground truncate">{courseName}</div>
                                </div>
                                <Badge variant="secondary" className="text-xs">
                                  {courseSections.length}
                                </Badge>
                              </div>
                            </div>
                            
                            {isExpanded && (
                              <div className="border-t border-border bg-background/50">
                                {courseSections.map((course, index) => (
                                  <div key={`individual-section-${index}`} className="p-2 border-b border-border last:border-b-0 flex items-center justify-between">
                                    <div className="flex-1 min-w-0">
                                      <div className="text-xs font-medium">Section {course.section_code}</div>
                                      <div className="text-xs text-muted-foreground truncate">Prof. {course.professor}</div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          const allParticipants = currentSession.participants
                                            .filter(p => p.id !== currentUserId)
                                            .map(p => p.id);
                                          updateSelectionType(courseSelections.indexOf(course), 'shared', allParticipants);
                                        }}
                                        className="h-5 w-5 p-0 text-green-600 hover:text-green-700"
                                        title="Make shared"
                                      >
                                        <Share2 className="h-2 w-2" />
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          removeCourseSelectionLocal(courseSelections.indexOf(course));
                                        }}
                                        className="h-5 w-5 p-0 text-red-500 hover:text-red-600"
                                      >
                                        <X className="h-2 w-2" />
                                      </Button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Section Selection Popup */}
      <SectionSelectionPopup
        sectionPopup={sectionPopup}
        setSectionPopup={setSectionPopup}
        selectedSections={courseSelections
          .filter(cs => sectionPopup?.course && cs.course_code === sectionPopup.course.code)
          .map((cs) => ({
            sectionId: cs.schedule_data?.sectionId || 0,
            courseCode: cs.course_code,
            courseName: cs.course_name,
            sectionCode: cs.section_code,
            professor: cs.professor || '',
            sessions: cs.schedule_data?.sessions || []
          }))}
        addSection={addSection}
        removeSection={(index: number) => {
          // The index corresponds to the selectedSections array we passed to the popup
          const selectedSectionsForThisCourse = courseSelections.filter(cs => 
            sectionPopup?.course && cs.course_code === sectionPopup.course.code
          );
          
          if (index >= 0 && index < selectedSectionsForThisCourse.length) {
            const sectionToRemove = selectedSectionsForThisCourse[index];
            const indexInFullArray = courseSelections.indexOf(sectionToRemove);
            if (indexInFullArray !== -1) {
              removeCourseSelectionLocal(indexInFullArray);
            }
          }
        }}
      />
    </div>
  );
}