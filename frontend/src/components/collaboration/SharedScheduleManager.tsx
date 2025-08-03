import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { CollaborationAPI } from '@/services/collaborationAPI';
import { useCollaborationStore } from '@/stores/collaborationStore';
import { ScheduleVisualization } from '@/components/ScheduleVisualization';
import { 
  Share2,
  Copy,
  Eye,
  ExternalLink,
  Calendar,
  Clock,
  User,
  Link as LinkIcon,
  Trash2,
  Edit,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SharedSchedule {
  id: number;
  schedule_id: number;
  share_token: string;
  permissions: string;
  expires_at?: string;
  is_active: boolean;
  created_at: string;
  schedule: {
    name: string;
    combination: any;
    total_courses: number;
  };
  views_count?: number;
}

interface ShareScheduleForm {
  schedule_id: number;
  permissions: 'view' | 'comment' | 'edit';
  expires_hours?: number;
  is_public: boolean;
}

interface SharedScheduleManagerProps {
  autoLoadCode?: string | null;
}

const SharedScheduleManagerComponent = ({ autoLoadCode }: SharedScheduleManagerProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [viewScheduleToken, setViewScheduleToken] = useState('');
  const [viewingSchedule, setViewingSchedule] = useState<any>(null);

  useEffect(() => {
    setLoading(false); // No need to load shared schedules list anymore
  }, []);

  // Auto-load schedule if code is provided
  useEffect(() => {
    if (autoLoadCode && autoLoadCode.length === 8) {
      setViewScheduleToken(autoLoadCode);
      viewSharedSchedule(autoLoadCode);
    }
  }, [autoLoadCode]);
  // Transform shared schedule data to ScheduleVisualization format
  const transformSharedScheduleData = (sharedSchedule: any) => {
    if (!sharedSchedule?.schedule?.combination?.courses) {
      return null;
    }

    const courses = sharedSchedule.schedule.combination.courses.map((course: any, index: number) => ({
      course_id: index + 1, // Use index as ID since we don't have actual course_id
      course_code: course.course_code,
      course_name: course.course_name,
      section_id: index + 1, // Use index as section ID
      section_number: course.section_number,
      professor: course.professor,
      sessions: course.sessions?.map((session: any, sessionIndex: number) => ({
        session_id: sessionIndex + 1,
        session_type: "TEORÍA", // Default session type
        day: session.day_of_week, // This should now be a number
        start_time: session.start_time,
        end_time: session.end_time,
        location: session.classroom || "TBA",
        modality: "Presencial"
      })) || []
    }));

    return {
      combinations: [{
        combination_id: "shared",
        course_count: courses.length,
        courses: courses
      }],
      total_combinations: 1,
      selected_courses_count: courses.length
    };
  };

  const viewSharedSchedule = async (token: string) => {
    if (!token.trim()) {
      toast({
        title: "Error",
        description: "Please enter a valid schedule code",
        variant: "destructive",
      });
      return;
    }

    try {
      const result = await CollaborationAPI.getSharedSchedule(token);
      console.log(result);
      setViewingSchedule(result);
      toast({
        title: "Schedule Loaded",
        description: `Viewing "${result.schedule.name}" shared by ${result.shared_by.name}`,
      });
    } catch (error: any) {
      // Failed to load shared schedule
      toast({
        title: "Schedule Not Found",
        description: "Please check that the code is correct.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    setLoading(false); // No need to load shared schedules list anymore
  }, []);

  // Auto-load schedule if code is provided
  useEffect(() => {
    if (autoLoadCode && autoLoadCode.length === 8) {
      setViewScheduleToken(autoLoadCode);
      viewSharedSchedule(autoLoadCode);
    }
  }, [autoLoadCode]);


  return (
    <div className="space-y-6">
      {/* View Shared Schedule */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            View Shared Schedule
          </CardTitle>
          <CardDescription>
            Enter a schedule code to view someone else's shared schedule
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="Enter 8-character code (e.g., A3B7K9M2)"
              value={viewScheduleToken}
              onChange={(e) => setViewScheduleToken(e.target.value.toUpperCase())}
              className="flex-1"
              maxLength={8}
            />
            <Button 
              onClick={() => viewSharedSchedule(viewScheduleToken)}
              disabled={!viewScheduleToken.trim() || viewScheduleToken.length !== 8}
            >
              <Eye className="h-4 w-4 mr-2" />
              View Schedule
            </Button>
          </div>

          {viewingSchedule && (
            <div className="mt-4">
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-xl">{viewingSchedule.schedule.name}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        Shared by {viewingSchedule.shared_by.name} • {viewingSchedule.schedule.combination?.courses?.length || 0} courses
                      </p>
                      <div className="flex gap-2 mt-2">
                        <Badge variant="secondary">View Only</Badge>
                        <Badge variant="outline">Code: {viewScheduleToken}</Badge>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setViewingSchedule(null)}
                    >
                      Close
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {(() => {
                    const transformedData = transformSharedScheduleData(viewingSchedule);
                    return transformedData ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                          <div className="text-center p-3 bg-blue-50 rounded-lg">
                            <div className="text-2xl font-bold text-blue-600">
                              {transformedData.selected_courses_count}
                            </div>
                            <div className="text-sm text-blue-600">Courses</div>
                          </div>
                          <div className="text-center p-3 bg-green-50 rounded-lg">
                            <div className="text-2xl font-bold text-green-600">
                              View Only
                            </div>
                            <div className="text-sm text-green-600">Permission</div>
                          </div>
                          <div className="text-center p-3 bg-purple-50 rounded-lg">
                            <div className="text-2xl font-bold text-purple-600">
                              {viewScheduleToken}
                            </div>
                            <div className="text-sm text-purple-600">Share Code</div>
                          </div>
                        </div>
                        
                        {/* Schedule Canvas Visualization */}
                        <div className="border rounded-lg p-4 bg-gray-50">
                          <h4 className="font-semibold text-lg mb-4">Schedule Visualization</h4>
                          <ScheduleVisualization 
                            scheduleData={transformedData}
                            showBackButton={false}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No schedule data available</p>
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export const SharedScheduleManager = SharedScheduleManagerComponent;