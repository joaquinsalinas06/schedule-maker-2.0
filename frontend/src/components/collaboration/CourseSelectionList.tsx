'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  User,
  X,
  ChevronDown,
  ChevronRight
} from 'lucide-react';

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

interface CourseSelectionListProps {
  courseSelections: CollaborativeCourseSelection[];
  expandedCourses: Set<string>;
  setExpandedCourses: (expanded: Set<string>) => void;
  currentUserId: number;
  getUserColor: (userId: number) => string;
  updateSelectionType: (index: number, newType: 'shared' | 'individual', sharedWith: number[]) => void;
  removeCourseSelection: (selectionId: number) => void;
  getSharedCourses: () => CollaborativeCourseSelection[];
  getIndividualCourses: () => CollaborativeCourseSelection[];
}

export function CourseSelectionList({
  courseSelections,
  expandedCourses,
  setExpandedCourses,
  currentUserId,
  getUserColor,
  updateSelectionType,
  removeCourseSelection,
  getSharedCourses,
  getIndividualCourses
}: CourseSelectionListProps) {
  const toggleExpanded = (courseCode: string) => {
    const newExpanded = new Set(expandedCourses);
    if (newExpanded.has(courseCode)) {
      newExpanded.delete(courseCode);
    } else {
      newExpanded.add(courseCode);
    }
    setExpandedCourses(newExpanded);
  };

  const renderCourseSelection = (selection: CollaborativeCourseSelection, index: number) => {
    const courseKey = `${selection.course_code}-${selection.section_code}`;
    const isExpanded = expandedCourses.has(courseKey);
    const isOwner = selection.added_by === currentUserId;

    return (
      <div 
        key={courseKey}
        className="border border-border rounded-lg p-4 bg-card/50 hover:bg-card/70 transition-colors"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => toggleExpanded(courseKey)}
              className="p-0 h-6 w-6"
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>

            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-foreground">
                  {selection.course_code} - Sec. {selection.section_code}
                </span>
                <Badge 
                  variant={selection.selection_type === 'shared' ? 'default' : 'secondary'}
                  className={selection.selection_type === 'shared' ? 'bg-blue-500' : 'bg-green-500'}
                >
                  {selection.selection_type === 'shared' ? (
                    <>
                      <Users className="w-3 h-3 mr-1" />
                      Compartido
                    </>
                  ) : (
                    <>
                      <User className="w-3 h-3 mr-1" />
                      Individual
                    </>
                  )}
                </Badge>
                {!isOwner && (
                  <Badge 
                    variant="outline" 
                    className={`text-xs ${getUserColor(selection.added_by)}`}
                  >
                    Agregado por otro usuario
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">{selection.course_name}</p>
              {selection.professor && (
                <p className="text-xs text-muted-foreground">Profesor: {selection.professor}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isOwner && (
              <>
                <Button
                  size="sm"
                  variant={selection.selection_type === 'shared' ? 'outline' : 'default'}
                  onClick={() => updateSelectionType(
                    index,
                    selection.selection_type === 'shared' ? 'individual' : 'shared',
                    selection.selection_type === 'shared' ? [] : []
                  )}
                  className="text-xs"
                >
                  {selection.selection_type === 'shared' ? 'Hacer Individual' : 'Hacer Compartido'}
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => removeCourseSelection(selection.id!)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </>
            )}
          </div>
        </div>

        {isExpanded && selection.schedule_data && (
          <div className="mt-3 pt-3 border-t border-border">
            <div className="text-sm">
              <h4 className="font-medium mb-2">Horarios:</h4>
              <div className="space-y-1">
                {selection.schedule_data.sessions?.map((session: any, sessionIndex: number) => (
                  <div key={sessionIndex} className="text-xs text-muted-foreground">
                    <strong>{session.day_of_week}:</strong> {session.start_time} - {session.end_time}
                    {session.classroom && <span> en {session.classroom}</span>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Cursos Seleccionados ({courseSelections.length})
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {courseSelections.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <Users className="mx-auto h-12 w-12 text-muted-foreground/30 mb-4" />
            <p className="text-lg font-medium">No hay cursos seleccionados</p>
            <p className="text-sm">Usa la búsqueda de arriba para agregar cursos a tu horario colaborativo</p>
          </div>
        ) : (
          <div className="space-y-3">
            {courseSelections.map(renderCourseSelection)}
          </div>
        )}

        {/* Summary Stats */}
        {courseSelections.length > 0 && (
          <div className="border-t border-border pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-lg font-bold text-blue-600">
                  {getSharedCourses().length}
                </div>
                <div className="text-sm text-muted-foreground">Compartidos</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-green-600">
                  {getIndividualCourses().length}
                </div>
                <div className="text-sm text-muted-foreground">Individuales</div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}