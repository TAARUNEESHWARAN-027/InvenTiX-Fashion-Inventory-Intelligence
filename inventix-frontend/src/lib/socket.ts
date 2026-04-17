import { useEffect } from 'react';
import { io } from 'socket.io-client';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const socket = io(API_URL, {
  autoConnect: true,
});

export function useSocket(event: string, callback: (...args: any[]) => void) {
  useEffect(() => {
    socket.on(event, callback);
    return () => {
      socket.off(event, callback);
    };
  }, [event, callback]);
  
  return socket;
}
