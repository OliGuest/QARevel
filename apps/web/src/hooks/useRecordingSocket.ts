'use client';

import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface RecordingStats {
  totalEvents: number;
  networkRequests: number;
  clicks: number;
  screenshots: number;
  pagesVisited: number;
}

interface UseRecordingSocketResult {
  stats: RecordingStats;
  isStopped: boolean;
  isConnected: boolean;
}

export function useRecordingSocket(recordingId: string | null): UseRecordingSocketResult {
  const [stats, setStats] = useState<RecordingStats>({
    totalEvents: 0,
    networkRequests: 0,
    clicks: 0,
    screenshots: 0,
    pagesVisited: 0,
  });
  const [isStopped, setIsStopped] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!recordingId) return;

    const token = localStorage.getItem('qarevel_access_token');
    if (!token) return;

    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${window.location.host}`;
    const socket = io(`${wsUrl}/ws`, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      socket.emit('subscribe', { channel: `test-run:${recordingId}` });
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.io.on('reconnect', () => {
      socket.emit('subscribe', { channel: `test-run:${recordingId}` });
    });

    socket.on('recording:stats', (data: RecordingStats) => {
      setStats(data);
    });

    socket.on('recording:stopped', () => {
      setIsStopped(true);
    });

    return () => {
      socket.emit('unsubscribe', { channel: `test-run:${recordingId}` });
      socket.disconnect();
      socketRef.current = null;
    };
  }, [recordingId]);

  return { stats, isStopped, isConnected };
}
