/**
 * WebSocket service for real-time updates
 */

import { authStorage } from './authStorage';

const WS_BASE_URL = import.meta.env.VITE_WS_URL !== undefined
  ? import.meta.env.VITE_WS_URL
  : 'ws://localhost:8000';

class WebSocketService {
  constructor() {
    this.socket = null;
    this.reconnectAttempts = 0;
    this.reconnectDelay = 2000;
    this.maxReconnectDelay = 30000;
    // Keepalive below the host nginx proxy_read_timeout (60s)
    this.pingInterval = 25000;
    this.pingTimer = null;
    this.reconnectTimer = null;
    this.shouldReconnect = false;
    this.listeners = new Map();
    this.isConnected = false;
  }

  async connect() {
    this.shouldReconnect = true;
    if (
      this.socket?.readyState === WebSocket.OPEN ||
      this.socket?.readyState === WebSocket.CONNECTING
    ) {
      return;
    }

    const token = await authStorage.getToken();
    if (!token || !this.shouldReconnect) {
      return;
    }

    try {
      const socket = new WebSocket(`${WS_BASE_URL}/ws`);
      this.socket = socket;

      socket.onopen = () => {
        // The server only registers us for broadcasts after this message
        socket.send(JSON.stringify({ type: 'auth', token }));
      };

      socket.onclose = (event) => {
        if (this.socket !== socket) {
          return;
        }
        console.log('WebSocket disconnected');
        this.socket = null;
        this.isConnected = false;
        this.stopPing();
        this.notifyListeners('connected', false);
        // 1008: token rejected; the REST 401 handler takes care of re-login
        if (event.code !== 1008) {
          this.attemptReconnect();
        }
      };

      socket.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      socket.onmessage = (event) => {
        if (event.data === 'pong') {
          return;
        }
        try {
          const message = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };
    } catch (error) {
      console.error('Error connecting to WebSocket:', error);
      this.attemptReconnect();
    }
  }

  disconnect() {
    this.shouldReconnect = false;
    clearTimeout(this.reconnectTimer);
    this.stopPing();
    if (this.socket) {
      const socket = this.socket;
      this.socket = null;
      this.isConnected = false;
      socket.close();
    }
  }

  startPing() {
    this.stopPing();
    this.pingTimer = setInterval(() => {
      if (this.socket?.readyState === WebSocket.OPEN) {
        this.socket.send('ping');
      }
    }, this.pingInterval);
  }

  stopPing() {
    clearInterval(this.pingTimer);
    this.pingTimer = null;
  }

  attemptReconnect() {
    if (!this.shouldReconnect) {
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(
      this.reconnectDelay * this.reconnectAttempts,
      this.maxReconnectDelay
    );
    console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts})...`);

    clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, delay);
  }

  handleMessage(message) {
    const { type, objectType, data, objectId, userId } = message;

    switch (type) {
      case 'auth_ok':
        console.log('WebSocket connected');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.startPing();
        this.notifyListeners('connected', true);
        break;
      case 'object_created':
        this.notifyListeners('object_created', { objectType, data });
        break;
      case 'object_updated':
        this.notifyListeners('object_updated', { objectType, data });
        break;
      case 'object_deleted':
        this.notifyListeners('object_deleted', { objectType, objectId });
        break;
      case 'townsquare_updated':
        this.notifyListeners('townsquare_updated', data);
        break;
      case 'profile_updated':
        this.notifyListeners('profile_updated', { userId, data });
        break;
      default:
        console.warn('Unknown message type:', type);
    }
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);

    return () => this.off(event, callback);
  }

  off(event, callback) {
    if (!this.listeners.has(event)) {
      return;
    }
    const callbacks = this.listeners.get(event);
    const index = callbacks.indexOf(callback);
    if (index > -1) {
      callbacks.splice(index, 1);
    }
  }

  notifyListeners(event, data) {
    if (!this.listeners.has(event)) {
      return;
    }
    this.listeners.get(event).forEach((callback) => {
      try {
        callback(data);
      } catch (error) {
        console.error('Error in WebSocket listener:', error);
      }
    });
  }

  send(message) {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(message));
    }
  }

  getConnectionStatus() {
    return this.isConnected;
  }
}

export const wsService = new WebSocketService();

