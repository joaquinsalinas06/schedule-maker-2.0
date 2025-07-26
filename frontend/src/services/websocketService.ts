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
    this.sessionCode = sessionCode;
    this.token = token;
    
    const baseUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000';
    const wsUrl = `${baseUrl}/ws/collaborate/${sessionCode}?token=${encodeURIComponent(token)}`;
    
    try {
      this.ws = new WebSocket(wsUrl);
      this.setupEventListeners();
    } catch (error) {
      console.error('WebSocket connection error:', error);
      this.handleConnectionError();
    }
  }

  connectToComparison(sessionCode: string, token: string): void {
    this.sessionCode = sessionCode;
    this.token = token;
    
    const baseUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000';
    const wsUrl = `${baseUrl}/ws/compare/${sessionCode}?token=${encodeURIComponent(token)}`;
    
    try {
      this.ws = new WebSocket(wsUrl);
      this.setupEventListeners();
    } catch (error) {
      console.error('WebSocket comparison connection error:', error);
      this.handleConnectionError();
    }
  }

  private setupEventListeners(): void {
    if (!this.ws) return;

    this.ws.onopen = () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;
      useCollaborationStore.getState().setIsConnected(true);
    };

    this.ws.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        this.handleMessage(message);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    this.ws.onclose = (event) => {
      console.log('WebSocket disconnected:', event.code, event.reason);
      useCollaborationStore.getState().setIsConnected(false);
      
      if (event.code !== 1000) { // Not a normal closure
        this.handleConnectionError();
      }
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      this.handleConnectionError();
    };
  }

  private handleConnectionError(): void {
    useCollaborationStore.getState().setIsConnected(false);
    
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
      
      console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);
      
      setTimeout(() => {
        if (this.sessionCode && this.token) {
          this.connect(this.sessionCode, this.token);
        }
      }, delay);
    } else {
      console.error('Max reconnection attempts reached');
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
        console.log('Course added:', message.data);
        break;

      case 'course_removed':
        // Handle course removal
        console.log('Course removed:', message.data);
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
          console.log('Comparison updated:', message.data);
        }
        break;

      default:
        console.log('Unknown message type:', message.type);
    }
  }

  sendMessage(message: WebSocketMessage): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket is not connected');
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

  disconnect(): void {
    if (this.ws) {
      this.ws.close(1000, 'User disconnected');
      this.ws = null;
    }
    useCollaborationStore.getState().setIsConnected(false);
    useCollaborationStore.getState().clearSession();
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}

// Export singleton instance
export const websocketService = new WebSocketService();
