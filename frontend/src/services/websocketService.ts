import { useCollaborationStore } from '../stores/collaborationStore';

interface WebSocketMessage {
  type: string;
  data?: any;
  user_id?: number;
  timestamp?: string;
}

class WebSocketService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private sessionCode: string | null = null;
  private token: string | null = null;

  connect(sessionCode: string, token: string): void {
    // Prevent multiple connections to the same session
    if (this.ws && this.ws.readyState === WebSocket.OPEN && this.sessionCode === sessionCode) {
      console.log('🔌 WebSocket already connected to session:', sessionCode);
      return;
    }
    
    // Close existing connection if different session
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      console.log('🔌 Closing existing WebSocket connection');
      this.ws.close();
    }
    
    this.sessionCode = sessionCode;
    this.token = token;
    
    const baseUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8001';
    // Remove trailing slash from baseUrl to avoid double slashes
    const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    const wsUrl = `${cleanBaseUrl}/ws/collaborate/${sessionCode}?token=${encodeURIComponent(token)}`;
    
    console.log('🔌 Connecting WebSocket to session:', sessionCode);
    
    try {
      this.ws = new WebSocket(wsUrl);
      this.setupEventListeners();
    } catch (error) {
      // WebSocket connection error
      this.handleConnectionError();
    }
  }

  connectToComparison(sessionCode: string, token: string): void {
    this.sessionCode = sessionCode;
    this.token = token;
    
    const baseUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8001';
    // Remove trailing slash from baseUrl to avoid double slashes
    const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    const wsUrl = `${cleanBaseUrl}/ws/compare/${sessionCode}?token=${encodeURIComponent(token)}`;
    
    // WebSocket comparison connecting
    
    try {
      this.ws = new WebSocket(wsUrl);
      this.setupEventListeners();
    } catch (error) {
      // WebSocket comparison connection error
      this.handleConnectionError();
    }
  }

  private setupEventListeners(): void {
    if (!this.ws) return;

    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
      useCollaborationStore.getState().setIsConnected(true);
      
      // Send a message to announce joining
      this.sendMessage({
        type: 'user_join',
        timestamp: new Date().toISOString()
      });
    };

    this.ws.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        this.handleMessage(message);
      } catch (error) {
        // Silently handle parsing errors
      }
    };

    this.ws.onclose = (event) => {
      useCollaborationStore.getState().setIsConnected(false);
      
      // WebSocket closed
      
      if (event.code !== 1000) { // Not a normal closure
        if (event.code === 1008) {
          // WebSocket closed due to policy violation (likely authentication error)
        }
        this.handleConnectionError();
      }
    };

    this.ws.onerror = (error) => {
      // WebSocket error
      this.handleConnectionError();
    };
  }

  private handleConnectionError(): void {
    useCollaborationStore.getState().setIsConnected(false);
    
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
      
      setTimeout(() => {
        if (this.sessionCode && this.token) {
          this.connect(this.sessionCode, this.token);
        }
      }, delay);
    }
  }

  private handleMessage(message: WebSocketMessage): void {
    const store = useCollaborationStore.getState();

    switch (message.type) {
      case 'session_state':
        // Initial session state
        if (message.data) {
          store.setCurrentSession(message.data);
          store.updateOnlineUsers(message.data.participants || []);
        }
        break;

      case 'user_joined':
        if (message.user_id && message.data) {
          store.addOnlineUser({
            id: message.user_id,
            name: message.data.name || 'Unknown User',
            email: message.data.email || '',
            role: message.data.role || 'participant',
            joined_at: message.timestamp || new Date().toISOString()
          });
        }
        break;

      case 'user_left':
        if (message.user_id) {
          store.removeOnlineUser(message.user_id);
          store.removeTypingUser(message.user_id);
          store.removeCursorPosition(message.user_id);
        }
        break;

      case 'schedule_update':
        if (message.data) {
          store.updateScheduleData(message.data);
        }
        break;

      case 'course_added':
        // Handle course addition
        break;

      case 'course_removed':
        // Handle course removal
        break;

      case 'course_selections_update':
        // Handle course selections update from other participants
        if (message.data?.course_selections) {
          store.updateCourseSelections(message.data.course_selections);
        }
        break;

      case 'course_selection_add':
        // Handle course selection addition from other participants
        if (message.data?.course_selection) {
          store.addCourseSelection(message.data.course_selection);
        }
        break;

      case 'course_selection_remove':
        // Handle course selection removal from other participants
        if (typeof message.data?.index === 'number') {
          store.removeCourseSelection(message.data.index);
        }
        break;

      case 'cursor_update':
        if (message.user_id && message.data) {
          store.updateCursorPosition(message.user_id, message.data.position);
        }
        break;

      case 'typing_status':
        if (message.user_id) {
          if (message.data?.is_typing) {
            store.addTypingUser(message.user_id);
          } else {
            store.removeTypingUser(message.user_id);
          }
        }
        break;

      case 'comparison_state':
        if (message.data) {
          store.setCurrentSession(message.data);
        }
        break;

      case 'comparison_update':
        if (message.data) {
          // Handle comparison updates
        }
        break;

      case 'schedule_generation_complete':
        if (message.data?.personalized_schedules) {
          // Handle schedule generation completion
          console.log('Received personalized schedules:', message.data.personalized_schedules);
          // Could trigger a notification or update UI state
        }
        break;

      default:
        // Unknown message type
    }
  }

  sendMessage(message: WebSocketMessage): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  sendScheduleUpdate(scheduleData: any): void {
    this.sendMessage({
      type: 'schedule_update',
      data: scheduleData,
      timestamp: new Date().toISOString()
    });
  }

  sendCourseAddition(courseData: any): void {
    this.sendMessage({
      type: 'add_course',
      data: { course: courseData },
      timestamp: new Date().toISOString()
    });
  }

  sendCourseRemoval(courseId: number): void {
    this.sendMessage({
      type: 'remove_course',
      data: { course_id: courseId },
      timestamp: new Date().toISOString()
    });
  }

  sendCourseSelectionUpdate(courseSelections: any[]): void {
    this.sendMessage({
      type: 'course_selections_update',
      data: { course_selections: courseSelections },
      timestamp: new Date().toISOString()
    });
  }

  sendCourseSelectionAdd(courseSelection: any): void {
    this.sendMessage({
      type: 'course_selection_add',
      data: { course_selection: courseSelection },
      timestamp: new Date().toISOString()
    });
  }

  sendCourseSelectionRemove(courseSelectionIndex: number): void {
    this.sendMessage({
      type: 'course_selection_remove',
      data: { index: courseSelectionIndex },
      timestamp: new Date().toISOString()
    });
  }

  sendCursorPosition(position: any): void {
    this.sendMessage({
      type: 'cursor_position',
      data: { position },
      timestamp: new Date().toISOString()
    });
  }

  sendTypingStatus(isTyping: boolean): void {
    this.sendMessage({
      type: 'typing_indicator',
      data: { is_typing: isTyping },
      timestamp: new Date().toISOString()
    });
  }

  sendComparisonUpdate(comparisonData: any): void {
    this.sendMessage({
      type: 'comparison_update',
      data: comparisonData,
      timestamp: new Date().toISOString()
    });
  }

  sendScheduleGeneration(personalizedSchedules: any[]): void {
    this.sendMessage({
      type: 'schedule_generation_complete',
      data: { personalized_schedules: personalizedSchedules },
      timestamp: new Date().toISOString()
    });
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close(1000, 'User disconnected');
      this.ws = null;
    }
    useCollaborationStore.getState().setIsConnected(false);
    // Don't clear the session - keep it so user can rejoin later
    // useCollaborationStore.getState().clearSession();
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
  
  isConnectedToSession(sessionCode: string): boolean {
    return this.isConnected() && this.sessionCode === sessionCode;
  }
}

// Export singleton instance
export const websocketService = new WebSocketService();
