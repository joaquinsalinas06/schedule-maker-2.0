'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useCollaborationStore } from '@/stores/collaborationStore';
import { websocketService } from '@/services/websocketService';
import { 
  Users, 
  UserCircle, 
  MessageSquare, 
  Plus, 
  Minus,
  Save,
  Eye,
  EyeOff,
  Search,
  Calendar
} from 'lucide-react';

interface Course {
  id: number;
  code: string;
  name: string;
  credits: number;
  sections: Section[];
}

interface Section {
  id: number;
  section_number: string;
  professor: string;
  sessions: SessionTime[];
}

interface SessionTime {
  id: number;
  day: string;
  start_time: string;
  end_time: string;
  location: string;
  session_type: string;
}

export function CollaborativeScheduleBuilder() {
  const {
    currentSession,
    isConnected,
    onlineUsers,
    typingUsers,
    cursorPositions
  } = useCollaborationStore();

  const [scheduleData, setScheduleData] = useState<any>({
    courses: [],
    conflicts: [],
    totalCredits: 0
  });
  
  const [availableCourses, setAvailableCourses] = useState<Course[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showParticipants, setShowParticipants] = useState(true);
  const [isTyping, setIsTyping] = useState(false);

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

  // Load initial schedule data
  useEffect(() => {
    if (currentSession?.current_schedule_data) {
      setScheduleData(currentSession.current_schedule_data);
    }
  }, [currentSession]);

  // Mock function to load available courses
  const loadAvailableCourses = async () => {
    // This would normally fetch from your API
    const mockCourses: Course[] = [
      {
        id: 1,
        code: 'CS101',
        name: 'Introduction to Computer Science',
        credits: 4,
        sections: [
          {
            id: 1,
            section_number: '001',
            professor: 'Dr. Smith',
            sessions: [
              {
                id: 1,
                day: 'Monday',
                start_time: '09:00',
                end_time: '10:30',
                location: 'Room 101',
                session_type: 'Lecture'
              },
              {
                id: 2,
                day: 'Wednesday',
                start_time: '09:00',
                end_time: '10:30',
                location: 'Room 101',
                session_type: 'Lecture'
              }
            ]
          }
        ]
      },
      {
        id: 2,
        code: 'MATH201',
        name: 'Calculus II',
        credits: 3,
        sections: [
          {
            id: 2,
            section_number: '001',
            professor: 'Dr. Johnson',
            sessions: [
              {
                id: 3,
                day: 'Tuesday',
                start_time: '11:00',
                end_time: '12:30',
                location: 'Room 202',
                session_type: 'Lecture'
              },
              {
                id: 4,
                day: 'Thursday',
                start_time: '11:00',
                end_time: '12:30',
                location: 'Room 202',
                session_type: 'Lecture'
              }
            ]
          }
        ]
      }
    ];
    setAvailableCourses(mockCourses);
  };

  useEffect(() => {
    loadAvailableCourses();
  }, []);

  const addCourseToSchedule = (course: Course, section: Section) => {
    const newScheduleData = {
      ...scheduleData,
      courses: [...scheduleData.courses, { course, section }],
      totalCredits: scheduleData.totalCredits + course.credits
    };
    
    setScheduleData(newScheduleData);
    websocketService.sendScheduleUpdate(newScheduleData);
    websocketService.sendCourseAddition({ course, section });
    handleTyping();
  };

  const removeCourseFromSchedule = (courseId: number) => {
    const courseToRemove = scheduleData.courses.find((c: any) => c.course.id === courseId);
    const newScheduleData = {
      ...scheduleData,
      courses: scheduleData.courses.filter((c: any) => c.course.id !== courseId),
      totalCredits: scheduleData.totalCredits - (courseToRemove?.course.credits || 0)
    };
    
    setScheduleData(newScheduleData);
    websocketService.sendScheduleUpdate(newScheduleData);
    websocketService.sendCourseRemoval(courseId);
    handleTyping();
  };

  const saveSchedule = () => {
    // This would save to your backend
    console.log('Saving schedule:', scheduleData);
  };

  const generateSchedules = async () => {
    if (scheduleData.courses.length === 0) {
      alert('Por favor selecciona al menos un curso para generar horarios');
      return;
    }

    try {
      // Extract selected sections from the current schedule
      const selected_sections = scheduleData.courses.flatMap((course: any) => 
        course.selectedSections.map((section: any) => section.id)
      );

      // Call the API to generate schedules
      const response = await fetch('http://localhost:8001/schedules/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          selected_sections: selected_sections
        })
      });

      if (response.ok) {
        const generatedSchedules = await response.json();
        
        // Broadcast the generated schedules to all participants
        websocketService.sendMessage({
          type: 'schedules_generated',
          data: {
            schedules: generatedSchedules,
            generated_by: 'current_user' // This would be the actual user name
          }
        });

        // Update local state with generated schedules
        setScheduleData((prev: any) => ({
          ...prev,
          generatedSchedules: generatedSchedules
        }));

        console.log('Generated schedules:', generatedSchedules);
      } else {
        throw new Error('Failed to generate schedules');
      }
    } catch (error) {
      console.error('Error generating schedules:', error);
      alert('Error al generar horarios. Por favor intenta de nuevo.');
    }
  };

  const filteredCourses = availableCourses.filter(course =>
    course.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    course.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!currentSession) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="text-muted-foreground">No active session. Please join a session first.</div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Main Schedule Area */}
      <div className="lg:col-span-3 space-y-6">
        {/* Session Header */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>{currentSession.name}</CardTitle>
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
                <Button variant="default" size="sm" onClick={generateSchedules}>
                  <Calendar className="h-4 w-4 mr-2" />
                  Generar Horarios
                </Button>
                <Button size="sm" onClick={saveSchedule}>
                  <Save className="h-4 w-4 mr-2" />
                  Save
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Current Schedule */}
        <Card>
          <CardHeader>
            <CardTitle>Current Schedule ({scheduleData.totalCredits} credits)</CardTitle>
          </CardHeader>
          <CardContent>
            {scheduleData.courses.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No courses added yet. Start by searching and adding courses from the right panel.
              </div>
            ) : (
              <div className="space-y-4">
                {scheduleData.courses.map((item: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <div className="font-semibold">
                        {item.course.code} - {item.course.name}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Section {item.section.section_number} • {item.section.professor} • {item.course.credits} credits
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {item.section.sessions.map((session: SessionTime, sessionIndex: number) => (
                          <span key={sessionIndex} className="mr-4">
                            {session.day} {session.start_time}-{session.end_time} ({session.location})
                          </span>
                        ))}
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeCourseFromSchedule(item.course.id)}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Schedule Grid/Calendar View */}
        <Card>
          <CardHeader>
            <CardTitle>Weekly Schedule</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-6 gap-2 text-sm">
              {/* Time slots and days would be rendered here */}
              <div className="text-center font-semibold">Time</div>
              {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map(day => (
                <div key={day} className="text-center font-semibold">{day}</div>
              ))}
              
              {/* This would be expanded to show actual time slots and courses */}
              <div className="text-center py-8 col-span-6 text-muted-foreground">
                Schedule visualization would appear here
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Side Panel */}
      <div className="space-y-6">
        {/* Online Participants */}
        {showParticipants && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Participants ({onlineUsers.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {onlineUsers.map((user) => (
                  <div key={user.id} className="flex items-center gap-2">
                    <UserCircle className="h-4 w-4" />
                    <span className="text-sm">{user.name}</span>
                    {typingUsers.includes(user.id) && (
                      <Badge variant="secondary" className="text-xs">typing...</Badge>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Course Search */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Add Courses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search courses..."
                  value={searchTerm}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    setSearchTerm(e.target.value);
                    handleTyping();
                  }}
                  className="pl-10"
                />
              </div>

              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredCourses.map((course) => (
                  <div key={course.id} className="border rounded-lg p-3">
                    <div className="font-semibold text-sm">
                      {course.code} - {course.name}
                    </div>
                    <div className="text-xs text-muted-foreground mb-2">
                      {course.credits} credits
                    </div>
                    
                    {course.sections.map((section) => (
                      <div key={section.id} className="flex items-center justify-between mt-2 p-2 bg-muted rounded">
                        <div className="text-xs">
                          <div>Section {section.section_number}</div>
                          <div className="text-muted-foreground">{section.professor}</div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => addCourseToSchedule(course, section)}
                          disabled={scheduleData.courses.some((c: any) => c.course.id === course.id)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
