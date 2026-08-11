import React, { createContext, useContext, useEffect, useState, useRef } from 'react';

export interface AlertNotification {
  id: number;
  disease_name: string;
  district: string;
  block?: string;
  level: 'Red' | 'Orange' | 'Yellow';
  message: string;
  created_at: string;
}

export interface LiveCase {
  id: number;
  patient_id: string;
  disease_name: string;
  severity: string;
  age: number;
  gender: string;
  village: string;
  block: string;
  district: string;
  latitude: number;
  longitude: number;
  status: string;
  report_date: string;
}

interface WebSocketContextType {
  isConnected: boolean;
  alerts: AlertNotification[];
  liveCases: LiveCase[];
  clearAlerts: () => void;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

export const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [alerts, setAlerts] = useState<AlertNotification[]>([]);
  const [liveCases, setLiveCases] = useState<LiveCase[]>([]);
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    let reconnectTimeout: any;

    const connect = () => {
      const socket = new WebSocket('ws://localhost:8000/ws');
      socketRef.current = socket;

      socket.onopen = () => {
        console.log('Surveillance WebSocket Connected');
        setIsConnected(true);
      };

      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          
          if (payload.type === 'NEW_CASE') {
            setLiveCases((prev) => [payload.data, ...prev.slice(0, 49)]); // keep last 50
          } else if (payload.type === 'NEW_ALERT') {
            setAlerts((prev) => [payload.data, ...prev]);
          }
        } catch (err) {
          // Regular text message (e.g. pong)
        }
      };

      socket.onclose = () => {
        console.log('Surveillance WebSocket Disconnected');
        setIsConnected(false);
        // Attempt reconnection after 5 seconds
        reconnectTimeout = setTimeout(connect, 5000);
      };

      socket.onerror = (err) => {
        console.error('Surveillance WebSocket Error:', err);
        socket.close();
      };
    };

    connect();

    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
      clearTimeout(reconnectTimeout);
    };
  }, []);

  const clearAlerts = () => {
    setAlerts([]);
  };

  return (
    <WebSocketContext.Provider value={{ isConnected, alerts, liveCases, clearAlerts }}>
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};
