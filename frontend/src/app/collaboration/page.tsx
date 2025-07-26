'use client';

import React, { useState } from 'react';
import { SessionManager } from '@/components/collaboration/SessionManager';
import { CollaborativeScheduleBuilder } from '@/components/collaboration/CollaborativeScheduleBuilder';
import { useCollaborationStore } from '@/stores/collaborationStore';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Users, 
  Calendar, 
  Share, 
  BarChart3,
  ArrowLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function CollaborationPage() {
  const { currentSession } = useCollaborationStore();
  const [activeTab, setActiveTab] = useState('sessions');

  // If in a session, show the collaborative builder
  if (currentSession) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <Button
            variant="outline"
            onClick={() => useCollaborationStore.getState().clearSession()}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Sessions
          </Button>
        </div>
        <CollaborativeScheduleBuilder />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Collaboration Hub</h1>
        <p className="text-muted-foreground mt-2">
          Create, share, and compare schedules with your classmates
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="sessions" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Sessions
          </TabsTrigger>
          <TabsTrigger value="shared" className="flex items-center gap-2">
            <Share className="h-4 w-4" />
            Shared
          </TabsTrigger>
          <TabsTrigger value="compare" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Compare
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sessions" className="mt-6">
          <SessionManager />
        </TabsContent>

        <TabsContent value="shared" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Shared Schedules</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <Share className="h-12 w-12 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Share Your Schedules</h3>
                <p>Share your schedules with classmates for feedback and collaboration</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compare" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Schedule Comparison</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <BarChart3 className="h-12 w-12 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Compare Schedules</h3>
                <p>Compare multiple schedules side by side to find the best option</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Collaboration History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Past Sessions</h3>
                <p>View your collaboration history and past session results</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
