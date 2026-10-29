import Dexie, { Table } from 'dexie';

export interface SessionRecord {
  id: string;
  createdAt: number;
  durationMs: number;
  mimeType: string;
  fps: number;
  width: number;
  height: number;
  totalChunks: number;
  sizeBytes: number;
  calibration?: {
    points: { x: number; y: number }[];
    homographyMatrix?: number[][];
  };
  statsSummary?: {
    totalShots: number;
    longestRally: number;
    totalBounces: number;
    maxSpeedKmh?: number | null;
  };
  notes?: string;
}

export interface VideoChunkRecord {
  id?: number;
  sessionId: string;
  chunkIndex: number;
  blob: Blob;
}

export interface SessionStatRecord {
  id?: number;
  sessionId: string;
  timestampMs: number;
  stats: Record<string, unknown>;
}

export class TableTennisDB extends Dexie {
  sessions!: Table<SessionRecord, string>;
  videoChunks!: Table<VideoChunkRecord, number>;
  sessionStats!: Table<SessionStatRecord, number>;

  constructor() {
    super('TableTennisLiveAnalyticsDB');

    this.version(1).stores({
      sessions: 'id, createdAt, durationMs',
      videoChunks: '++id, sessionId, [sessionId+chunkIndex]',
      sessionStats: '++id, sessionId, [sessionId+timestampMs]',
    });
  }
}

export const db = new TableTennisDB();

/**
 * Reassembles all video chunks of a session into a single playable Blob.
 */
export async function getSessionVideoBlob(sessionId: string): Promise<Blob | null> {
  const session = await db.sessions.get(sessionId);
  if (!session) return null;

  const chunks = await db.videoChunks
    .where('sessionId')
    .equals(sessionId)
    .sortBy('chunkIndex');

  if (chunks.length === 0) return null;

  const blobParts = chunks.map((c) => c.blob);
  return new Blob(blobParts, { type: session.mimeType });
}

/**
 * Deletes a session and its associated chunks and stats.
 */
export async function deleteSession(sessionId: string): Promise<void> {
  await db.transaction('rw', db.sessions, db.videoChunks, db.sessionStats, async () => {
    await db.sessions.delete(sessionId);
    await db.videoChunks.where('sessionId').equals(sessionId).delete();
    await db.sessionStats.where('sessionId').equals(sessionId).delete();
  });
}

