'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { CollaborationAPI } from '@/services/collaborationAPI';
import { 
  BarChart3,
  Users,
  Plus,
  X,
  Eye,
  Download,
  Share2,
  User,
  Clock,
  Calendar,
  Palette
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface ComparisonSchedule {
  id: string;
  name: string;
  userName: string;
  combination: any;
  color: string;
  sections: any[];
  totalCourses: number;
  addedAt: string;
}

interface TimeSlot {
  day: string;
  startTime: string;
  endTime: string;
  schedules: {
    scheduleId: string;
    courseName: string;
    courseCode: string;
    professor: string;
    color: string;
  }[];
}

interface ConflictInfo {
  type: 'overlap' | 'free' | 'partial';
  scheduleCount: number;
  duration: number;
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const TIME_SLOTS = Array.from({ length: 15 }, (_, i) => {
  const hour = 7 + i;
  return `${hour.toString().padStart(2, '0')}:00`;
});

const USER_COLORS = [
  { bg: 'bg-blue-100', border: 'border-blue-300', text: 'text-blue-800', name: 'Blue' },
  { bg: 'bg-green-100', border: 'border-green-300', text: 'text-green-800', name: 'Green' },
  { bg: 'bg-purple-100', border: 'border-purple-300', text: 'text-purple-800', name: 'Purple' },
  { bg: 'bg-orange-100', border: 'border-orange-300', text: 'text-orange-800', name: 'Orange' },
  { bg: 'bg-pink-100', border: 'border-pink-300', text: 'text-pink-800', name: 'Pink' },
  { bg: 'bg-indigo-100', border: 'border-indigo-300', text: 'text-indigo-800', name: 'Indigo' },
];

export function IntegratedScheduleComparison() {
  const [schedules, setSchedules] = useState<ComparisonSchedule[]>([]);
  const [newScheduleCode, setNewScheduleCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'timeline'>('grid');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<TimeSlot | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const addScheduleByCode = async (code: string) => {
    if (!code.trim()) {
      toast({
        title: "Error",
        description: "Please enter a valid schedule code",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const result = await CollaborationAPI.getSharedSchedule(code);
      
      const newSchedule: ComparisonSchedule = {
        id: code,
        name: result.schedule.name,
        userName: result.shared_by.name,
        combination: result.schedule.combination,
        color: USER_COLORS[schedules.length % USER_COLORS.length].name,
        sections: result.schedule.combination.sections || [],
        totalCourses: result.schedule.combination?.courses?.length || 0,
        addedAt: new Date().toISOString()
      };

      setSchedules(prev => [...prev, newSchedule]);
      setNewScheduleCode('');
      
      toast({
        title: "Schedule Added",
        description: `Added "${newSchedule.name}" by ${newSchedule.userName}`,
      });
    } catch (error: any) {
      toast({
        title: "Schedule Not Found",
        description: "Please check that the code is correct.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const removeSchedule = (scheduleId: string) => {
    setSchedules(prev => prev.filter(s => s.id !== scheduleId));
    toast({
      title: "Schedule Removed",
      description: "Schedule removed from comparison",
    });
  };

  const addMySchedule = (favoriteSchedule: any) => {
    const newSchedule: ComparisonSchedule = {
      id: `my_${Date.now()}`,
      name: favoriteSchedule.name,
      userName: "You",
      combination: favoriteSchedule.combination,
      color: USER_COLORS[schedules.length % USER_COLORS.length].name,
      sections: favoriteSchedule.combination.sections || [],
      totalCourses: favoriteSchedule.combination?.courses?.length || 0,
      addedAt: new Date().toISOString()
    };

    setSchedules(prev => [...prev, newSchedule]);
    toast({
      title: "Schedule Added",
      description: "Your schedule added to comparison",
    });
  };

  const getColorForSchedule = (scheduleId: string) => {
    const schedule = schedules.find(s => s.id === scheduleId);
    if (!schedule) return USER_COLORS[0];
    
    const colorIndex = schedules.indexOf(schedule) % USER_COLORS.length;
    return USER_COLORS[colorIndex];
  };

  const generateTimeSlots = (): TimeSlot[] => {
    const timeSlots: TimeSlot[] = [];
    
    DAYS.forEach(day => {
      TIME_SLOTS.forEach(timeSlot => {
        const [hour] = timeSlot.split(':');
        const startTime = `${hour}:00`;
        const endTime = `${parseInt(hour) + 1}:00`;
        
        const schedulesInSlot = schedules.flatMap(schedule => 
          schedule.sections
            .filter(section => section.sessions?.some((session: any) => {
              const sessionDay = typeof session.day === 'string' ? session.day : 
                ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][session.day];
              
              if (sessionDay !== day) return false;
              
              const sessionStart = parseInt(session.start_time.split(':')[0]);
              const sessionEnd = parseInt(session.end_time.split(':')[0]);
              const slotStart = parseInt(hour);
              
              return slotStart >= sessionStart && slotStart < sessionEnd;
            }))
            .map(section => ({
              scheduleId: schedule.id,
              courseName: section.course_name,
              courseCode: section.course_code,
              professor: section.professor,
              color: getColorForSchedule(schedule.id).name
            }))
        );

        if (schedulesInSlot.length > 0) {
          timeSlots.push({
            day,
            startTime,
            endTime,
            schedules: schedulesInSlot
          });
        }
      });
    });

    return timeSlots;
  };

  const getConflictInfo = (day: string, hour: string): ConflictInfo => {
    const timeSlots = generateTimeSlots();
    const slot = timeSlots.find(ts => ts.day === day && ts.startTime === `${hour}:00`);
    
    if (!slot) {
      return { type: 'free', scheduleCount: 0, duration: 1 };
    }

    const uniqueSchedules = new Set(slot.schedules.map(s => s.scheduleId));
    
    if (uniqueSchedules.size === 1) {
      return { type: 'free', scheduleCount: 1, duration: 1 };
    } else if (uniqueSchedules.size === schedules.length) {
      return { type: 'overlap', scheduleCount: schedules.length, duration: 1 };
    } else {
      return { type: 'partial', scheduleCount: uniqueSchedules.size, duration: 1 };
    }
  };

  const getConflictStyle = (conflictInfo: ConflictInfo) => {
    switch (conflictInfo.type) {
      case 'free':
        return conflictInfo.scheduleCount === 0 
          ? 'bg-gray-50 border-gray-200' 
          : 'bg-blue-50 border-blue-200';
      case 'partial':
        return 'bg-yellow-100 border-yellow-300';
      case 'overlap':
        return 'bg-red-100 border-red-300';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const exportComparison = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = 1200;
    canvas.height = 800;

    // Draw comparison grid
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw title
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 24px Arial';
    ctx.fillText('Schedule Comparison', 20, 40);

    // Draw legend
    schedules.forEach((schedule, index) => {
      const color = getColorForSchedule(schedule.id);
      const y = 70 + (index * 30);
      
      ctx.fillStyle = color.bg;
      ctx.fillRect(20, y - 15, 20, 20);
      
      ctx.fillStyle = '#000000';
      ctx.font = '14px Arial';
      ctx.fillText(`${schedule.name} (${schedule.userName})`, 50, y);
    });

    // Create download link
    const link = document.createElement('a');
    link.download = 'schedule-comparison.png';
    link.href = canvas.toDataURL();
    link.click();
  };

  const timeSlots = generateTimeSlots();
  const conflictSummary = {
    totalConflicts: timeSlots.filter(ts => ts.schedules.length > 1).length,
    freeForAll: timeSlots.filter(ts => ts.schedules.length === 0).length,
    partialOverlap: timeSlots.filter(ts => ts.schedules.length > 1 && ts.schedules.length < schedules.length).length,
    fullOverlap: timeSlots.filter(ts => ts.schedules.length === schedules.length && schedules.length > 1).length
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Schedule Comparison ({schedules.length})
              </CardTitle>
              <CardDescription>
                Compare multiple schedules to find optimal meeting times and conflicts
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewMode(viewMode === 'grid' ? 'timeline' : 'grid')}
              >
                <Eye className="h-4 w-4 mr-2" />
                {viewMode === 'grid' ? 'Timeline View' : 'Grid View'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={exportComparison}
                disabled={schedules.length === 0}
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Add Schedule */}
          <div className="flex gap-2 mb-4">
            <Input
              placeholder="Enter schedule code to compare"
              value={newScheduleCode}
              onChange={(e) => setNewScheduleCode(e.target.value)}
              className="flex-1"
              onKeyDown={(e) => e.key === 'Enter' && addScheduleByCode(newScheduleCode)}
            />
            <Button
              onClick={() => addScheduleByCode(newScheduleCode)}
              disabled={loading || !newScheduleCode.trim()}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Schedule
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                // This would integrate with the favorites system
                toast({
                  title: "Feature Coming Soon",
                  description: "Select from your favorite schedules",
                });
              }}
            >
              <User className="h-4 w-4 mr-2" />
              Add Mine
            </Button>
          </div>

          {/* Conflict Summary */}
          {schedules.length > 1 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{conflictSummary.totalConflicts}</div>
                <div className="text-xs text-muted-foreground">Total Conflicts</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{conflictSummary.freeForAll}</div>
                <div className="text-xs text-muted-foreground">Free for All</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">{conflictSummary.partialOverlap}</div>
                <div className="text-xs text-muted-foreground">Partial Overlap</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{conflictSummary.fullOverlap}</div>
                <div className="text-xs text-muted-foreground">Full Overlap</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Schedule List */}
      {schedules.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Compared Schedules
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {schedules.map((schedule, index) => {
                const color = getColorForSchedule(schedule.id);
                return (
                  <div key={schedule.id} className={`p-4 border rounded-lg ${color.bg} ${color.border}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-4 h-4 rounded-full ${color.bg.replace('bg-', 'bg-').replace('-100', '-500')}`} />
                        <div>
                          <div className="font-semibold">{schedule.name}</div>
                          <div className="text-sm text-muted-foreground">
                            By {schedule.userName} • {schedule.totalCourses} courses • {schedule.sections.length} sections
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Added {new Date(schedule.addedAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={color.text}>{color.name}</Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeSchedule(schedule.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Comparison Grid */}
      {schedules.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              {viewMode === 'grid' ? 'Schedule Grid' : 'Timeline View'}
            </CardTitle>
            <CardDescription>
              {schedules.length > 1 
                ? "Red indicates conflicts, Yellow shows partial overlap, Blue shows single schedule times"
                : "Your schedule overview"
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <div className="min-w-[800px]">
                {/* Header */}
                <div className="grid grid-cols-8 gap-1 mb-2">
                  <div className="p-2 font-semibold text-center">Time</div>
                  {DAYS.slice(0, 6).map(day => (
                    <div key={day} className="p-2 font-semibold text-center">{day.slice(0, 3)}</div>
                  ))}
                </div>

                {/* Time slots */}
                {TIME_SLOTS.slice(0, 12).map(timeSlot => {
                  const hour = timeSlot.split(':')[0];
                  return (
                    <div key={timeSlot} className="grid grid-cols-8 gap-1 mb-1">
                      <div className="p-2 text-sm text-center font-medium bg-muted rounded">
                        {timeSlot}
                      </div>
                      {DAYS.slice(0, 6).map(day => {
                        const conflictInfo = getConflictInfo(day, hour);
                        const conflictStyle = getConflictStyle(conflictInfo);
                        const timeSlot = generateTimeSlots().find(ts => 
                          ts.day === day && ts.startTime === `${hour}:00`
                        );

                        return (
                          <div
                            key={`${day}-${hour}`}
                            className={`p-1 min-h-[60px] border rounded cursor-pointer transition-all hover:shadow-md ${conflictStyle}`}
                            onClick={() => setSelectedTimeSlot(timeSlot || null)}
                          >
                            {timeSlot && (
                              <div className="space-y-1">
                                {timeSlot.schedules.slice(0, 2).map((schedule, index) => {
                                  const color = getColorForSchedule(schedule.scheduleId);
                                  return (
                                    <div
                                      key={index}
                                      className={`text-xs p-1 rounded border ${color.bg} ${color.border}`}
                                    >
                                      <div className="font-medium truncate">{schedule.courseCode}</div>
                                      <div className="truncate text-muted-foreground">{schedule.professor}</div>
                                    </div>
                                  );
                                })}
                                {timeSlot.schedules.length > 2 && (
                                  <div className="text-xs text-center text-muted-foreground">
                                    +{timeSlot.schedules.length - 2} more
                                  </div>
                                )}
                              </div>
                            )}
                            {conflictInfo.scheduleCount > 1 && (
                              <div className="text-xs text-center mt-1">
                                <Badge variant="secondary" className="text-xs">
                                  {conflictInfo.scheduleCount} conflicts
                                </Badge>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {schedules.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BarChart3 className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Schedules to Compare</h3>
            <p className="text-muted-foreground text-center mb-4">
              Add schedule codes or select from your favorites to start comparing
            </p>
            <div className="flex gap-2">
              <Button variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Add Schedule Code
              </Button>
              <Button variant="outline">
                <User className="h-4 w-4 mr-2" />
                Select My Schedule
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Time Slot Detail Modal */}
      {selectedTimeSlot && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-md w-full">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>{selectedTimeSlot.day} {selectedTimeSlot.startTime}</CardTitle>
                  <CardDescription>
                    {selectedTimeSlot.schedules.length} schedule{selectedTimeSlot.schedules.length !== 1 ? 's' : ''} at this time
                  </CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedTimeSlot(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {selectedTimeSlot.schedules.map((schedule, index) => {
                  const color = getColorForSchedule(schedule.scheduleId);
                  return (
                    <div key={index} className={`p-3 border rounded ${color.bg} ${color.border}`}>
                      <div className="font-semibold">{schedule.courseCode}</div>
                      <div className="text-sm">{schedule.courseName}</div>
                      <div className="text-sm text-muted-foreground">Prof. {schedule.professor}</div>
                      <Badge className={`mt-2 ${color.text}`}>{color.name}</Badge>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Hidden canvas for export */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}