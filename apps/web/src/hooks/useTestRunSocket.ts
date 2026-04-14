'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

interface StepResultEvent {
  id: string;
  testRunId: string;
  testStepId: string | null;
  stepNumber: number;
  status: string;
  actualResult: string | null;
  errorMessage: string | null;
  screenshotKey: string | null;
  durationMs: number | null;
  executedAt: string;
}

interface StatusUpdateEvent {
  id: string;
  status: string;
  summary: Record<string, unknown> | null;
  completedAt: string | null;
  durationMs: number | null;
}

interface UseTestRunSocketResult {
  stepResults: StepResultEvent[];
  status: string | null;
  summary: Record<string, unknown> | null;
  isConnected: boolean;
}

export function useTestRunSocket(testRunId: string | null): UseTestRunSocketResult {
  const [stepResults, setStepResults] = useState<StepResultEvent[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [summary, setSummary] = useState<Record<string, unknown> | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  const addStepResult = useCallback((result: StepResultEvent) => {
    setStepResults((prev) => {
      // Deduplicate by stepNumber
      const existing = prev.findIndex((r) => r.stepNumber === result.stepNumber);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = result;
        return updated;
      }
      return [...prev, result].sort((a, b) => a.stepNumber - b.stepNumber);
    });
  }, []);

  useEffect(() => {
    if (!testRunId) return;

    const token = localStorage.getItem('qarevel_access_token');
    if (!token) return;

    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${window.location.host}`;
    const socket = io(`${wsUrl}/ws`, {
      auth: { token },
      transports: ['websocket'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      socket.emit('subscribe', { channel: `test-run:${testRunId}` });
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('step-result', (data: StepResultEvent) => {
      addStepResult(data);
    });

    socket.on('status-update', (data: StatusUpdateEvent) => {
      setStatus(data.status);
      if (data.summary) setSummary(data.summary);
    });

    return () => {
      socket.emit('unsubscribe', { channel: `test-run:${testRunId}` });
      socket.disconnect();
      socketRef.current = null;
    };
  }, [testRunId, addStepResult]);

  return { stepResults, status, summary, isConnected };
}
