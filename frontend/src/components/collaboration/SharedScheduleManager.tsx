'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { CollaborationAPI } from '@/services/collaborationAPI';
import { useCollaborationStore } from '@/stores/collaborationStore';
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
    total_credits: number;
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
  const [sharedSchedules, setSharedSchedules] = useState<SharedSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [shareForm, setShareForm] = useState<ShareScheduleForm>({
    schedule_id: 0,
    permissions: 'view',
    expires_hours: 168, // 1 week default
    is_public: true
  });
  const [viewScheduleToken, setViewScheduleToken] = useState('');
  const [viewingSchedule, setViewingSchedule] = useState<any>(null);
  const [favoriteSchedules, setFavoriteSchedules] = useState<any[]>([]);
  const [selectedScheduleId, setSelectedScheduleId] = useState<string>('');

  useEffect(() => {
    loadSharedSchedules();
    loadFavoriteSchedules();
  }, []);

  // Auto-load schedule if code is provided
  useEffect(() => {
    if (autoLoadCode && autoLoadCode.length === 8) {
      setViewScheduleToken(autoLoadCode);
      viewSharedSchedule(autoLoadCode);
    }
  }, [autoLoadCode]);


  const loadFavoriteSchedules = () => {
    // Load favorite schedules from localStorage
    const stored = localStorage.getItem('favoriteSchedules');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setFavoriteSchedules(parsed);
      } catch (error) {
        console.error('Failed to parse favorite schedules:', error);
        setFavoriteSchedules([]);
      }
    }
  };

  const loadSharedSchedules = async () => {
    try {
      // Temporarily disabled due to auth issues
      // const schedules = await CollaborationAPI.getSharedSchedules();
      // setSharedSchedules(schedules);
      setSharedSchedules([]); // Temporary empty array
    } catch (error) {
      console.error('Failed to load shared schedules:', error);
      toast({
        title: "Error",
        description: "Failed to load shared schedules",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const shareSchedule = async () => {
    if (!selectedScheduleId) {
      toast({
        title: "Error",
        description: "Please select a schedule to share",
        variant: "destructive",
      });
      return;
    }

    const favoriteSchedule = favoriteSchedules.find(fav => fav.id === selectedScheduleId);
    if (!favoriteSchedule) {
      toast({
        title: "Error",
        description: "Selected schedule not found",
        variant: "destructive",
      });
      return;
    }

    try {
      console.log('=== FAVORITE SCHEDULE DATA ===');
      console.log('favoriteSchedule:', favoriteSchedule);
      console.log('favoriteSchedule.combination:', favoriteSchedule.combination);
      console.log('==============================');
      
      // First, we need to save the schedule to the database if it's not already there
      const scheduleData = {
        name: favoriteSchedule.name,
        combination: favoriteSchedule.combination,
        semester: 'ciclo-1', // This should come from context
        description: favoriteSchedule.notes || ''
      };
      
      console.log('=== SCHEDULE DATA TO SAVE ===');
      console.log('scheduleData:', scheduleData);
      console.log('============================');

      // Create the schedule in database first
      const savedSchedule = await CollaborationAPI.saveSchedule(scheduleData);
      console.log('=== SAVED SCHEDULE RESPONSE ===');
      console.log('Full response:', savedSchedule);
      console.log('Keys:', Object.keys(savedSchedule));
      console.log('savedSchedule.data:', savedSchedule.data);
      console.log('===============================');
      
      // Extract the schedule_id from the response structure  
      const scheduleId = savedSchedule.data.schedule_id;
      console.log('Using schedule_id:', scheduleId, 'type:', typeof scheduleId);
      
      const shareData = {
        schedule_id: scheduleId,
        permissions: shareForm.permissions,
        expires_hours: shareForm.expires_hours,
        shared_with: shareForm.is_public ? undefined : undefined
      };

      const sharedSchedule = await CollaborationAPI.shareSchedule(shareData);
      
      // Generate shareable link
      const shareableLink = `${window.location.origin}/dashboard?code=${sharedSchedule.share_token}`;
      
      // Copy to clipboard
      await navigator.clipboard.writeText(shareableLink);
      
      toast({
        title: "Schedule Shared!",
        description: `Code: ${sharedSchedule.share_token} - Link copied to clipboard. Anyone with this code can view your schedule.`,
        variant: "success",
      });

      // Refresh the list
      loadSharedSchedules();
      setSelectedScheduleId(''); // Reset selection

      return sharedSchedule;
    } catch (error: any) {
      console.error('Failed to share schedule:', error);
      toast({
        title: "Error",
        description: error.response?.data?.detail || error.message || "Failed to share schedule",
        variant: "destructive",
      });
    }
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
      setViewingSchedule(result);
      toast({
        title: "Schedule Loaded",
        description: `Viewing "${result.schedule.name}" shared by ${result.shared_by.name}`,
      });
    } catch (error: any) {
      console.error('Failed to load shared schedule:', error);
      toast({
        title: "Schedule Not Found",
        description: "Please check that the code is correct.",
        variant: "destructive",
      });
    }
  };

  const copyShareLink = async (shareToken: string) => {
    const shareableLink = `${window.location.origin}/dashboard?code=${shareToken}`;
    await navigator.clipboard.writeText(shareableLink);
    toast({
      title: "Link Copied",
      description: "Share link copied to clipboard",
    });
  };

  const revokeShare = async (shareId: number) => {
    try {
      await CollaborationAPI.revokeScheduleShare(shareId);
      toast({
        title: "Share Revoked",
        description: "The shared link is no longer accessible",
      });
      loadSharedSchedules();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to revoke share",
        variant: "destructive",
      });
    }
  };

  const formatTimeRemaining = (expiresAt: string) => {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diff = expiry.getTime() - now.getTime();

    if (diff <= 0) return 'Expired';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days > 0) return `${days}d ${hours}h remaining`;
    if (hours > 0) return `${hours}h remaining`;
    return 'Less than 1h remaining';
  };

  const getStatusBadge = (schedule: SharedSchedule) => {
    if (!schedule.is_active) {
      return <Badge variant="secondary">Inactive</Badge>;
    }
    
    if (schedule.expires_at && new Date(schedule.expires_at) < new Date()) {
      return <Badge variant="destructive">Expired</Badge>;
    }

    return <Badge className="bg-green-100 text-green-800">Active</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="text-muted-foreground">Loading shared schedules...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Share a Schedule */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Share a Schedule
          </CardTitle>
          <CardDescription>
            Share your favorite schedules with classmates via a secure link
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Schedule to Share</label>
              <select
                value={selectedScheduleId}
                onChange={(e) => setSelectedScheduleId(e.target.value)}
                className="w-full p-2 border rounded-md text-sm"
              >
                <option value="">Choose a favorite schedule...</option>
                {favoriteSchedules.map((schedule) => (
                  <option key={schedule.id} value={schedule.id}>
                    {schedule.name} ({schedule.combination?.total_credits || 0} credits)
                  </option>
                ))}
              </select>
              {favoriteSchedules.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No favorite schedules found. Go to Dashboard to create some first.
                </p>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Permissions</label>
                <select
                  value={shareForm.permissions}
                  onChange={(e) => setShareForm({...shareForm, permissions: e.target.value as any})}
                  className="w-full p-2 border rounded-md text-sm"
                >
                  <option value="view">View Only</option>
                  <option value="comment">View & Comment</option>
                  <option value="edit">Full Access</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Expires After</label>
                <select
                  value={shareForm.expires_hours || ''}
                  onChange={(e) => setShareForm({...shareForm, expires_hours: e.target.value ? parseInt(e.target.value) : undefined})}
                  className="w-full p-2 border rounded-md text-sm"
                >
                  <option value="">Never</option>
                  <option value="24">1 Day</option>
                  <option value="168">1 Week</option>
                  <option value="720">1 Month</option>
                  <option value="2160">3 Months</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Access Type</label>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={shareForm.is_public}
                    onCheckedChange={(checked) => setShareForm({...shareForm, is_public: checked})}
                  />
                  <span className="text-sm">{shareForm.is_public ? 'Public Link' : 'Private'}</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button 
              onClick={shareSchedule}
              disabled={!selectedScheduleId}
              className="bg-gradient-to-r from-blue-600 to-purple-600"
            >
              <Share2 className="h-4 w-4 mr-2" />
              Share Schedule
            </Button>
            <p className="text-sm text-muted-foreground">
              {selectedScheduleId ? 'Ready to share selected schedule' : 'Select a schedule to share'}
            </p>
          </div>
        </CardContent>
      </Card>

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
                        Shared by {viewingSchedule.shared_by.name} • {viewingSchedule.schedule.combination?.total_credits || 0} credits
                      </p>
                      <div className="flex gap-2 mt-2">
                        <Badge variant="secondary">{viewingSchedule.permissions}</Badge>
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
                  {viewingSchedule.schedule.combination?.courses ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div className="text-center p-3 bg-blue-50 rounded-lg">
                          <div className="text-2xl font-bold text-blue-600">
                            {viewingSchedule.schedule.combination.courses.length}
                          </div>
                          <div className="text-sm text-blue-600">Courses</div>
                        </div>
                        <div className="text-center p-3 bg-green-50 rounded-lg">
                          <div className="text-2xl font-bold text-green-600">
                            {viewingSchedule.schedule.combination.total_credits}
                          </div>
                          <div className="text-sm text-green-600">Credits</div>
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <h4 className="font-semibold text-lg">Courses</h4>
                        {viewingSchedule.schedule.combination.courses.map((course: { course_code: string | number | bigint | boolean | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | React.ReactPortal | Promise<string | number | bigint | boolean | React.ReactPortal | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | null | undefined> | null | undefined; course_name: string | number | bigint | boolean | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | React.ReactPortal | Promise<string | number | bigint | boolean | React.ReactPortal | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | null | undefined> | null | undefined; section_number: string | number | bigint | boolean | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | React.ReactPortal | Promise<string | number | bigint | boolean | React.ReactPortal | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | null | undefined> | null | undefined; credits: string | number | bigint | boolean | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | React.ReactPortal | Promise<string | number | bigint | boolean | React.ReactPortal | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | null | undefined> | null | undefined; professor: string | number | bigint | boolean | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | React.ReactPortal | Promise<string | number | bigint | boolean | React.ReactPortal | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | null | undefined> | null | undefined; sessions: any[]; }, index: React.Key | null | undefined) => (
                          <div key={index} className="border rounded-lg p-4 bg-gray-50">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <h5 className="font-semibold text-lg">{course.course_code}</h5>
                                <p className="text-gray-600">{course.course_name}</p>
                              </div>
                              <div className="text-right">
                                <Badge variant="outline">Section {course.section_number}</Badge>
                                <p className="text-sm text-gray-500 mt-1">{course.credits} credits</p>
                              </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                              <div>
                                <p className="text-sm font-medium text-gray-700">Professor</p>
                                <p className="text-sm text-gray-600">{course.professor}</p>
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-700">Schedule</p>
                                <div className="text-sm text-gray-600">
                                  {course.sessions?.map((session, idx) => {
                                    const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
                                    const dayName = dayNames[session.day_of_week] || 'N/A';
                                    return (
                                      <div key={idx} className="flex justify-between">
                                        <span>{dayName}:</span>
                                        <span>{session.start_time}-{session.end_time}</span>
                                        <span className="text-gray-400">({session.classroom})</span>
                                      </div>
                                    );
                                  }) || <span className="text-gray-400">No schedule available</span>}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No schedule data available</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </CardContent>
      </Card>

      {/* My Shared Schedules */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LinkIcon className="h-5 w-5" />
            My Shared Schedules ({sharedSchedules.length})
          </CardTitle>
          <CardDescription>
            Manage your shared schedule links and permissions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sharedSchedules.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Share2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <h4 className="font-semibold mb-2">No Shared Schedules</h4>
              <p className="text-sm">Share your first schedule to get started</p>
            </div>
          ) : (
            <div className="space-y-4">
              {sharedSchedules.map((schedule) => (
                <div key={schedule.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold">{schedule.schedule.name}</h4>
                        {getStatusBadge(schedule)}
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-muted-foreground mb-3">
                        <div className="flex items-center gap-1">
                          <Eye className="h-3 w-3" />
                          <span>{schedule.views_count || 0} views</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          <span>{schedule.permissions}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>{schedule.schedule.total_credits} credits</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>
                            {schedule.expires_at 
                              ? formatTimeRemaining(schedule.expires_at)
                              : 'No expiry'
                            }
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {schedule.share_token}
                        </code>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyShareLink(schedule.share_token)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyShareLink(schedule.share_token)}
                      >
                        <Copy className="h-4 w-4 mr-1" />
                        Copy Link
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => revokeShare(schedule.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export const SharedScheduleManager = SharedScheduleManagerComponent;