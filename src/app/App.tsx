import { useState } from 'react';
import { CameraView } from '@/components/CameraView';
import { useCamera } from '@/components/useCamera';
import { useRecorder } from '@/components/useRecorder';
import { RecordControl } from '@/components/RecordControl';
import { SessionHistoryModal } from '@/components/SessionHistoryModal';
import { formatDuration } from '@/lib/recorder';
import { ShieldCheck, Video } from 'lucide-react';

export function App() {
  const camera = useCamera();
  const recorder = useRecorder();
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);
  const [savedNotification, setSavedNotification] = useState<string | null>(null);

  const handleStartRecord = async () => {
    if (!camera.stream) {
      alert('Kamera belum siap.');
      return;
    }
    try {
      await recorder.startRecording(camera.stream, camera.settings);
    } catch (err) {
      console.error('Gagal memulai perekaman:', err);
      alert('Gagal memulai perekaman video.');
    }
  };

  const handleStopRecord = async () => {
    try {
      const sessionId = await recorder.stopRecording();
      if (sessionId) {
        setSavedNotification('Sesi berhasil direkam dan disimpan ke IndexedDB!');
        setTimeout(() => setSavedNotification(null), 4000);
      }
    } catch (err) {
      console.error('Gagal menghentikan perekaman:', err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Navigation / Header */}
      <header className="border-b border-slate-800/80 bg-slate-950/70 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-orange-600 to-amber-500 flex items-center justify-center font-black text-white text-base shadow-md shadow-orange-500/20">
              TT
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight text-slate-100 leading-none">
                TableTennis Live
              </h1>
              <span className="text-[10px] text-orange-400 font-medium tracking-wider uppercase">
                Analytics MVP
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            {savedNotification && (
              <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-medium transition-all">
                <span>✓ {savedNotification}</span>
              </span>
            )}
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-800/60 border border-slate-700/50 text-slate-300">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Privasi di Perangkat</span>
            </span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 flex flex-col gap-4">
        {/* Camera Container with recording indicator */}
        <div className="flex-1 flex flex-col items-center justify-center">
          <CameraView
            camera={camera}
            isRecording={recorder.isRecording}
            recordingDurationFormatted={formatDuration(recorder.recordingDurationMs)}
          />
        </div>

        {/* Floating / Bottom Action Control Bar for F2 */}
        <div className="w-full flex justify-center py-1">
          <RecordControl
            isRecording={recorder.isRecording}
            recordingDurationMs={recorder.recordingDurationMs}
            storageEstimate={recorder.storageEstimate}
            onStartRecord={handleStartRecord}
            onStopRecord={handleStopRecord}
            onOpenHistory={() => setIsHistoryOpen(true)}
            disabled={!camera.stream || !!camera.error || camera.isLoading}
          />
        </div>

        {/* Status Info Box */}
        <div className="w-full bg-slate-900/60 border border-slate-800 rounded-xl p-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-orange-500/10 text-orange-400">
              <Video className="w-4 h-4" />
            </div>
            <div>
              <p className="font-medium text-slate-200">
                Fase 1: Kamera Live (F1) & Perekaman Sesi (F2)
              </p>
              <p className="text-slate-400">
                Perekaman otomatis memecah video ke IndexedDB tiap 1 detik (hemat RAM) dan menjaga layar tetap menyala (Screen Wake Lock).
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Session History & Playback Modal */}
      <SessionHistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
      />
    </div>
  );
}

export default App;
