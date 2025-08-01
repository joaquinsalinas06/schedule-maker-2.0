'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useCollaborationStore } from '@/stores/collaborationStore';
import { SelectedSection } from '@/types';
import { 
  Users, 
  User,
  Share2,
  Eye,
  EyeOff,
  Calendar,
  BookOpen,
  Plus,
  X,
  ChevronDown,
  UserCheck
} from 'lucide-react';

interface EnhancedSection extends SelectedSection {
  isShared: boolean;
  sharedWith: number[]; // Array of user IDs this section is shared with
  addedBy: number; // User ID who added this section
}

interface CollaboratorCourse {
  userId: number;
  userName: string;
  sections: EnhancedSection[];
  isOnline: boolean;
}

export function EnhancedCollaborativeBuilder() {
  const { currentSession, onlineUsers } = useCollaborationStore();
  const [collaboratorCourses, setCollaboratorCourses] = useState<CollaboratorCourse[]>([]);
  const [selectedSections, setSelectedSections] = useState<EnhancedSection[]>([]);
  const [showSharedOnly, setShowSharedOnly] = useState(false);
  const [collapsedUsers, setCollapsedUsers] = useState<Set<number>>(new Set());

  // Mock current user ID (replace with actual auth)
  const currentUserId = 1;

  useEffect(() => {
    if (currentSession) {
      // Initialize collaborator courses from session participants
      const initialCollaborators = currentSession.participants.map(participant => ({
        userId: participant.id,
        userName: participant.name,
        sections: [],
        isOnline: onlineUsers.some(user => user.id === participant.id)
      }));
      setCollaboratorCourses(initialCollaborators);
    }
  }, [currentSession, onlineUsers]);

  const addSection = (section: SelectedSection, isShared: boolean = false, sharedWith: number[] = []) => {
    const enhancedSection: EnhancedSection = {
      ...section,
      isShared,
      sharedWith: isShared ? sharedWith : [],
      addedBy: currentUserId
    };

    setSelectedSections(prev => [...prev, enhancedSection]);
  };

  const toggleSectionSharing = (sectionIndex: number, userId?: number) => {
    setSelectedSections(prev => prev.map((section, index) => {
      if (index === sectionIndex) {
        if (userId) {
          // Toggle sharing with specific user
          const isCurrentlyShared = section.sharedWith.includes(userId);
          return {
            ...section,
            isShared: !isCurrentlyShared ? true : section.sharedWith.length > 1,
            sharedWith: isCurrentlyShared 
              ? section.sharedWith.filter(id => id !== userId)
              : [...section.sharedWith, userId]
          };
        } else {
          // Toggle sharing with all users
          const allUserIds = collaboratorCourses.map(c => c.userId).filter(id => id !== currentUserId);
          return {
            ...section,
            isShared: !section.isShared,
            sharedWith: !section.isShared ? allUserIds : []
          };
        }
      }
      return section;
    }));
  };

  const removeSection = (sectionIndex: number) => {
    setSelectedSections(prev => prev.filter((_, index) => index !== sectionIndex));
  };

  const getSharedSections = () => {
    return selectedSections.filter(section => section.isShared);
  };

  const getPersonalSections = () => {
    return selectedSections.filter(section => !section.isShared);
  };

  const toggleUserCollapse = (userId: number) => {
    setCollapsedUsers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  };

  const getSectionColor = (section: EnhancedSection) => {
    if (!section.isShared) return 'bg-blue-50 border-blue-200';
    return 'bg-green-50 border-green-200';
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
      {/* Session Header */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-600" />
                {currentSession.name}
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {currentSession.participants.length} collaborators • {onlineUsers.length} online
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Switch 
                checked={showSharedOnly}
                onCheckedChange={setShowSharedOnly}
                id="shared-only"
              />
              <label htmlFor="shared-only" className="text-sm font-medium">
                Show shared only
              </label>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Shared Courses */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-700">
              <Share2 className="h-5 w-5" />
              Shared Courses ({getSharedSections().length})
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              These courses are visible to all collaborators
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {getSharedSections().length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <Share2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No shared courses yet</p>
                  <p className="text-xs">Toggle sections to share with collaborators</p>
                </div>
              ) : (
                getSharedSections().map((section, index) => {
                  const actualIndex = selectedSections.indexOf(section);
                  return (
                    <div key={actualIndex} className={`p-3 rounded-lg border ${getSectionColor(section)}`}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="font-medium text-sm">{section.courseCode}</div>
                          <div className="text-xs text-muted-foreground">{section.courseName}</div>
                          <div className="text-xs text-muted-foreground">
                            Section {section.sectionCode} • Prof. {section.professor}
                          </div>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {section.sharedWith.map(userId => {
                              const user = collaboratorCourses.find(c => c.userId === userId);
                              return (
                                <Badge key={userId} className={`text-xs ${getUserColor(userId)}`}>
                                  {user?.userName || `User ${userId}`}
                                </Badge>
                              );
                            })}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => toggleSectionSharing(actualIndex)}
                            className="h-6 w-6 p-0"
                          >
                            <EyeOff className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removeSection(actualIndex)}
                            className="h-6 w-6 p-0 text-red-500 hover:text-red-600"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>

        {/* Center Column: Personal Courses */}
        {!showSharedOnly && (
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-700">
                <User className="h-5 w-5" />
                My Personal Courses ({getPersonalSections().length})
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                These courses are only visible to you
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {getPersonalSections().length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground">
                    <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No personal courses</p>
                    <p className="text-xs">Add courses from the search</p>
                  </div>
                ) : (
                  getPersonalSections().map((section, index) => {
                    const actualIndex = selectedSections.indexOf(section);
                    return (
                      <div key={actualIndex} className={`p-3 rounded-lg border ${getSectionColor(section)}`}>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="font-medium text-sm">{section.courseCode}</div>
                            <div className="text-xs text-muted-foreground">{section.courseName}</div>
                            <div className="text-xs text-muted-foreground">
                              Section {section.sectionCode} • Prof. {section.professor}
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => toggleSectionSharing(actualIndex)}
                              className="h-6 w-6 p-0"
                            >
                              <Eye className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => removeSection(actualIndex)}
                              className="h-6 w-6 p-0 text-red-500 hover:text-red-600"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Right Column: Collaborators */}
        <Card className={showSharedOnly ? "lg:col-span-2" : "lg:col-span-1"}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Collaborators ({collaboratorCourses.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {collaboratorCourses.map((collaborator) => (
                <div key={collaborator.userId} className="border rounded-lg">
                  <div 
                    className="p-3 flex items-center justify-between cursor-pointer hover:bg-muted/50"
                    onClick={() => toggleUserCollapse(collaborator.userId)}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${getUserColor(collaborator.userId)}`}>
                        {collaborator.userName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium text-sm">{collaborator.userName}</div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <div className={`w-2 h-2 rounded-full ${collaborator.isOnline ? 'bg-green-500' : 'bg-gray-300'}`} />
                          {collaborator.isOnline ? 'Online' : 'Offline'}
                          {collaborator.userId === currentUserId && (
                            <Badge variant="outline" className="text-xs">You</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {collaborator.sections.length} courses
                      </Badge>
                      <ChevronDown 
                        className={`h-4 w-4 transition-transform ${
                          collapsedUsers.has(collaborator.userId) ? 'rotate-180' : ''
                        }`}
                      />
                    </div>
                  </div>
                  
                  {!collapsedUsers.has(collaborator.userId) && (
                    <div className="px-3 pb-3 border-t bg-muted/20">
                      {collaborator.sections.length === 0 ? (
                        <div className="py-4 text-center text-xs text-muted-foreground">
                          No courses selected yet
                        </div>
                      ) : (
                        <div className="space-y-2 pt-3">
                          {collaborator.sections.map((section, index) => (
                            <div key={index} className="text-xs p-2 bg-background rounded border">
                              <div className="font-medium">{section.courseCode}</div>
                              <div className="text-muted-foreground">
                                Section {section.sectionCode} • {section.professor}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Schedule Generation */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Generate Collaborative Schedule</h3>
              <p className="text-sm text-muted-foreground">
                Create optimized schedules considering shared and personal courses
              </p>
            </div>
            <Button 
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              disabled={selectedSections.length === 0}
            >
              <Calendar className="h-4 w-4 mr-2" />
              Generate Schedule
            </Button>
          </div>
          
          <div className="grid grid-cols-3 gap-4 mt-4 text-sm">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{getSharedSections().length}</div>
              <div className="text-muted-foreground">Shared Courses</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{getPersonalSections().length}</div>
              <div className="text-muted-foreground">Personal Courses</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {selectedSections.reduce((sum, section) => sum + section.credits, 0)}
              </div>
              <div className="text-muted-foreground">Total Credits</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}