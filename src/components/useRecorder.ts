import { useState, useRef, useEffect, useCallback } from 'react';
import { db, SessionRecord } from '@/storage/db';
import { getOptimalMimeType, generateSessionId } from '@/lib/recorder';
import { CameraSettingsInfo } from '@/lib/camera';

export interface UseRecorderResult {
  isRecording: boolean;
  recordingDurationMs: number;
  currentSessionId: string | null;
  storageEstimate: { quota: number; usage: number; percentage: number } | null;
  startRecording: (stream: MediaStream, settings?: CameraSettingsInfo | null) => Promise<void>;
  stopRecording: () => Promise<string | null>;
}

export function useRecorder(): UseRecorderResult {
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingDurationMs, setRecordingDurationMs] = useState<number>(0);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [storageEstimate, setStorageEstimate] = useState<{
    quota: number;
    usage: number;
    percentage: number;
  } | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const startTimeRef = useRef<number>(0);
  const durationTimerRef = useRef<number | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const chunkIndexRef = useRef<number>(0);
  const totalBytesRef = useRef<number>(0);
  const activeSessionIdRef = useRef<string | null>(null);
  const sessionSettingsRef = useRef<CameraSettingsInfo | null>(null);

  // Check storage estimate periodically
  const checkStorage = useCallback(async () => {
    if (navigator.storage && navigator.storage.estimate) {
      try {
        const estimate = await navigator.storage.estimate();
        const quota = estimate.quota || 0;
        const usage = estimate.usage || 0;
        const percentage = quota > 0 ? (usage / quota) * 100 : 0;
        setStorageEstimate({ quota, usage, percentage });
      } catch (err) {
        console.warn('Could not estimate storage:', err);
      }
    }
  }, []);

  useEffect(() => {
    checkStorage();
  }, [checkStorage]);

  // Request screen wake lock
  const requestWakeLock = useCallback(async () => {
    if ('wakeLock' in navigator) {
      try {
        wakeLockRef.current = await navigator.wakeLock.request('screen');
      } catch (err) {
        console.warn('Wake Lock request failed:', err);
      }
    }
  }, []);

  // Release screen wake lock
  const releaseWakeLock = useCallback(() => {
    if (wakeLockRef.current) {
      wakeLockRef.current.release().catch(console.warn);
      wakeLockRef.current = null;
    }
  }, []);

  const stopRecording = useCallback(async (): Promise<string | null> => {
    return new Promise((resolve) => {
      const recorder = mediaRecorderRef.current;
      const sessionId = activeSessionIdRef.current;

      if (!recorder || recorder.state === 'inactive' || !sessionId) {
        setIsRecording(false);
        releaseWakeLock();
        if (durationTimerRef.current) clearInterval(durationTimerRef.current);
        resolve(null);
        return;
      }

      recorder.onstop = async () => {
        const duration = Date.now() - startTimeRef.current;
        const settings = sessionSettingsRef.current;

        // Finalize session record in IndexedDB
        const sessionRecord: SessionRecord = {
          id: sessionId,
          createdAt: startTimeRef.current,
          durationMs: duration,
          mimeType: recorder.mimeType || 'video/webm',
          fps: settings?.frameRate || 30,
          width: settings?.width || 1280,
          height: settings?.height || 720,
          totalChunks: chunkIndexRef.current,
          sizeBytes: totalBytesRef.current,
        };

        try {
          await db.sessions.put(sessionRecord);
        } catch (dbErr) {
          console.error('Failed to save session record:', dbErr);
        }

        setIsRecording(false);
        setCurrentSessionId(null);
        activeSessionIdRef.current = null;
        releaseWakeLock();
        await checkStorage();

        if (durationTimerRef.current) {
          clearInterval(durationTimerRef.current);
          durationTimerRef.current = null;
        }

        resolve(sessionId);
      };

      // Request any final data
      try {
        recorder.stop();
      } catch (e) {
        console.warn('Error stopping MediaRecorder:', e);
        resolve(sessionId);
      }
    });
  }, [releaseWakeLock, checkStorage]);

  const startRecording = useCallback(
    async (stream: MediaStream, settings?: CameraSettingsInfo | null) => {
      if (!stream || stream.getVideoTracks().length === 0) {
        throw new Error('Tidak ada stream video aktif untuk direkam.');
      }

      const mimeType = getOptimalMimeType();
      const options: MediaRecorderOptions = mimeType ? { mimeType } : {};

      const recorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = recorder;

      const newSessionId = generateSessionId();
      activeSessionIdRef.current = newSessionId;
      sessionSettingsRef.current = settings ?? null;
      chunkIndexRef.current = 0;
      totalBytesRef.current = 0;
      startTimeRef.current = Date.now();

      setCurrentSessionId(newSessionId);
      setIsRecording(true);
      setRecordingDurationMs(0);

      // Handle stream chunks as they arrive (every 1000ms)
      recorder.ondataavailable = async (e: BlobEvent) => {
        if (e.data && e.data.size > 0 && activeSessionIdRef.current) {
          const currentChunkIdx = chunkIndexRef.current++;
          totalBytesRef.current += e.data.size;

          try {
            await db.videoChunks.add({
              sessionId: activeSessionIdRef.current,
              chunkIndex: currentChunkIdx,
              blob: e.data,
            });
          } catch (storageErr) {
            console.error('Gagal menyimpan chunk ke IndexedDB:', storageErr);
          }
        }
      };

      // Start recording with 1 second timeslice
      recorder.start(1000);
      await requestWakeLock();

      // Update duration counter
      if (durationTimerRef.current) clearInterval(durationTimerRef.current);
      durationTimerRef.current = window.setInterval(() => {
        setRecordingDurationMs(Date.now() - startTimeRef.current);
      }, 250);
    },
    [requestWakeLock]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (durationTimerRef.current) clearInterval(durationTimerRef.current);
      releaseWakeLock();
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try {
          mediaRecorderRef.current.stop();
        } catch {
          // ignore
        }
      }
    };
  }, [releaseWakeLock]);

  return {
    isRecording,
    recordingDurationMs,
    currentSessionId,
    storageEstimate,
    startRecording,
    stopRecording,
  };
}
