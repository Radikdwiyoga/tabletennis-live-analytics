import React, { useState, useEffect, useCallback } from 'react';
import { db, SessionRecord, getSessionVideoBlob, deleteSession } from '@/storage/db';
import { formatDuration, formatBytes } from '@/lib/recorder';
import { Play, Trash2, X, Film, HardDrive, Calendar } from 'lucide-react';

interface SessionHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SessionHistoryModal: React.FC<SessionHistoryModalProps> = ({ isOpen, onClose }) => {
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activePlaybackUrl, setActivePlaybackUrl] = useState<string | null>(null);
  const [playingSession, setPlayingSession] = useState<SessionRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const loadSessions = useCallback(async () => {
    setIsLoading(true);
    try {
      const records = await db.sessions.orderBy('createdAt').reverse().toArray();
      setSessions(records);
    } catch (err) {
      console.error('Failed to load sessions:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadSessions();
    } else {
      if (activePlaybackUrl) {
        URL.revokeObjectURL(activePlaybackUrl);
        setActivePlaybackUrl(null);
        setPlayingSession(null);
      }
    }
  }, [isOpen, loadSessions, activePlaybackUrl]);

  const handlePlaySession = async (session: SessionRecord) => {
    if (activePlaybackUrl) {
      URL.revokeObjectURL(activePlaybackUrl);
      setActivePlaybackUrl(null);
    }
    try {
      const blob = await getSessionVideoBlob(session.id);
      if (blob) {
        const url = URL.createObjectURL(blob);
        setActivePlaybackUrl(url);
        setPlayingSession(session);
      } else {
        alert('Data video untuk sesi ini tidak ditemukan.');
      }
    } catch (err) {
      console.error('Gagal memuat video sesi:', err);
      alert('Gagal memuat video sesi.');
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus rekaman sesi ini dari perangkat?')) return;
    setIsDeleting(sessionId);
    try {
      if (playingSession?.id === sessionId && activePlaybackUrl) {
        URL.revokeObjectURL(activePlaybackUrl);
        setActivePlaybackUrl(null);
        setPlayingSession(null);
      }
      await deleteSession(sessionId);
      await loadSessions();
    } catch (err) {
      console.error('Gagal menghapus sesi:', err);
    } finally {
      setIsDeleting(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-orange-500/10 text-orange-400">
              <Film className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">Riwayat Rekaman Sesi</h2>
              <p className="text-xs text-slate-400">
                Tersimpan di IndexedDB perangkat Anda ({sessions.length} sesi)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Playback Container if a session is currently being played */}
        {activePlaybackUrl && playingSession && (
          <div className="p-4 bg-slate-950 border-b border-slate-800 flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs text-slate-300">
              <span className="font-medium text-orange-400 flex items-center gap-1.5">
                <Play className="w-3.5 h-3.5 fill-current" />
                Putar Ulang: {new Date(playingSession.createdAt).toLocaleTimeString()}
              </span>
              <button
                onClick={() => {
                  URL.revokeObjectURL(activePlaybackUrl);
                  setActivePlaybackUrl(null);
                  setPlayingSession(null);
                }}
                className="text-slate-400 hover:text-slate-200 text-xs underline"
              >
                Tutup Pemutar
              </button>
            </div>
            <video
              src={activePlaybackUrl}
              controls
              playsInline
              autoPlay
              className="w-full max-h-64 rounded-xl bg-black object-contain shadow-lg"
            />
          </div>
        )}

        {/* Sessions List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {isLoading ? (
            <div className="py-12 text-center text-slate-400 text-sm">
              Memuat daftar sesi...
            </div>
          ) : sessions.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm flex flex-col items-center gap-2">
              <HardDrive className="w-8 h-8 text-slate-600" />
              <span>Belum ada rekaman sesi yang tersimpan.</span>
              <span className="text-xs text-slate-500">
                Tekan tombol Record saat main untuk merekam sesi pertama Anda.
              </span>
            </div>
          ) : (
            sessions.map((session) => (
              <div
                key={session.id}
                className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700/80 transition flex items-center justify-between gap-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold text-slate-200">
                      {formatDuration(session.durationMs)}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
                      {session.width}x{session.height} @ {session.fps}fps
                    </span>
                    {session.statsSummary && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/30 font-medium">
                        {session.statsSummary.totalShots} pukulan • Best {session.statsSummary.longestRally}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-500" />
                      {new Date(session.createdAt).toLocaleDateString()} {new Date(session.createdAt).toLocaleTimeString()}
                    </span>
                    <span>•</span>
                    <span>{formatBytes(session.sizeBytes)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handlePlaySession(session)}
                    className="p-2 rounded-xl bg-orange-600/20 text-orange-400 hover:bg-orange-600 hover:text-white transition"
                    title="Putar Video"
                  >
                    <Play className="w-4 h-4 fill-current" />
                  </button>
                  <button
                    onClick={() => handleDeleteSession(session.id)}
                    disabled={isDeleting === session.id}
                    className="p-2 rounded-xl bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-white transition disabled:opacity-50"
                    title="Hapus Sesi"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

