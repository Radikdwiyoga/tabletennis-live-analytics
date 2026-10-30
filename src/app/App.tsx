import { useState } from 'react';
import { CameraView } from '@/components/CameraView';
import { useCamera } from '@/components/useCamera';
import { useRecorder } from '@/components/useRecorder';
import { usePoseTracker } from '@/components/usePoseTracker';
import { useBallTracker } from '@/components/useBallTracker';
import { RecordControl } from '@/components/RecordControl';
import { SessionHistoryModal } from '@/components/SessionHistoryModal';
import { CalibrationOverlay } from '@/components/CalibrationOverlay';
import { ReelOverlayHUD } from '@/components/ReelOverlayHUD';
import { LiveScoreboard } from '@/components/LiveScoreboard';
import { CalibrationResult } from '@/lib/homography';
import { createInitialScore, MatchScoreState } from '@/lib/score';
import { formatDuration } from '@/lib/recorder';
import { ShieldCheck, Activity, User, Users } from 'lucide-react';

export function App() {
  const camera = useCamera();
  const recorder = useRecorder();
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);
  const [isCalibrating, setIsCalibrating] = useState<boolean>(false);
  const [activeCalibration, setActiveCalibration] = useState<CalibrationResult | null>(null);
  const [savedNotification, setSavedNotification] = useState<string | null>(null);
  const [scoreState, setScoreState] = useState<MatchScoreState>(() => createInitialScore(11, 'A'));

  // Real-time pose tracking (F4) in Web Worker
  const pose = usePoseTracker(camera.videoRef, activeCalibration);

  // Real-time ball & rally tracking (F7, F8, F9) in Web Worker
  const ball = useBallTracker(camera.videoRef, activeCalibration);

  const handleStartRecord = async () => {
    if (!camera.stream) {
      alert('Kamera belum siap.');
      return;
    }
    try {
      ball.resetRallyStats();
      await recorder.startRecording(camera.stream, camera.settings, activeCalibration);
    } catch (err) {
      console.error('Gagal memulai perekaman:', err);
      alert('Gagal memulai perekaman video.');
    }
  };

  const handleStopRecord = async () => {
    try {
      const finalScoreStr = `${scoreState.teamAScore}-${scoreState.teamBScore} (Sets ${scoreState.teamASets}-${scoreState.teamBSets})`;
      const sessionId = await recorder.stopRecording({
        totalShots: ball.rallyStats.totalShots,
        longestRally: ball.rallyStats.longestRallyShots,
        totalBounces: ball.rallyStats.bounces.length,
        maxSpeedKmh: ball.rallyStats.lastSpeedKmh,
        finalScore: finalScoreStr,
      });
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
                Analytics Full MVP
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
              <span>Privasi Penuh di Perangkat</span>
            </span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-2 sm:p-4 flex flex-col gap-2.5 sm:gap-4">
        {/* Camera Container with recording indicator, calibration overlay, and Reel HUD */}
        <div className="w-full flex flex-col items-center justify-center">
          <CameraView
            camera={camera}
            isRecording={recorder.isRecording}
            recordingDurationFormatted={formatDuration(recorder.recordingDurationMs)}
            overlayChildren={
              <>
                <CalibrationOverlay
                  videoRef={camera.videoRef}
                  isCalibrating={isCalibrating}
                  onCalibrationChange={setActiveCalibration}
                  onCloseCalibration={() => setIsCalibrating(false)}
                />
                <ReelOverlayHUD
                  players={pose.players}
                  currentBall={ball.currentBall}
                  trajectory={ball.trajectory}
                  rallyStats={ball.rallyStats}
                  colorProfile={ball.colorProfile}
                  onColorProfileChange={ball.setColorProfile}
                  matchMode={pose.matchMode}
                  onMatchModeChange={pose.setMatchMode}
                  scoreState={scoreState}
                  onScoreChange={setScoreState}
                  metrics={pose.metrics}
                  videoRef={camera.videoRef}
                  sessionDurationFormatted={formatDuration(recorder.recordingDurationMs)}
                  isCalibrating={isCalibrating}
                />
              </>
            }
          />
        </div>

        {/* Mobile Interactive Live Scoreboard (Clean touch controls under video, 0% video obstruction) */}
        <div className="w-full sm:hidden flex justify-center py-0.5">
          <LiveScoreboard
            scoreState={scoreState}
            onScoreChange={setScoreState}
            matchMode={pose.matchMode}
          />
        </div>

        {/* Quick Mode & Ball Settings Bar (Memudahkan akses di smartphone tanpa menutupi video) */}
        <div className="w-full flex items-center justify-between sm:justify-center gap-1.5 sm:gap-2 px-1 text-xs">
          {/* Match Mode Switcher */}
          <div className="flex items-center bg-slate-900/80 backdrop-blur-sm border border-slate-800 rounded-lg p-0.5 text-[9px] sm:text-xs">
            <button
              onClick={() => pose.setMatchMode('singles')}
              className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 rounded font-medium transition ${
                pose.matchMode === 'singles'
                  ? 'bg-orange-600 text-white font-bold shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <User className="w-2.5 sm:w-3 h-2.5 sm:h-3" />
              <span>Tunggal (1v1)</span>
            </button>
            <button
              onClick={() => pose.setMatchMode('doubles')}
              className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 rounded font-medium transition ${
                pose.matchMode === 'doubles'
                  ? 'bg-orange-600 text-white font-bold shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Users className="w-2.5 sm:w-3 h-2.5 sm:h-3" />
              <span>Ganda (2v2)</span>
            </button>
          </div>

          {/* Ball Color Profile */}
          <div className="flex items-center gap-1 bg-slate-900/80 backdrop-blur-sm border border-slate-800 rounded-lg p-0.5 sm:p-1 text-[9px] sm:text-xs">
            <span className="text-slate-400 px-1 text-[8px] sm:text-[10px]">Bola:</span>
            <button
              onClick={() => ball.setColorProfile({ type: 'orange' })}
              className={`px-1.5 sm:px-2 py-0.5 rounded font-medium transition ${
                ball.colorProfile.type === 'orange'
                  ? 'bg-orange-500 text-white font-bold shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Oranye
            </button>
            <button
              onClick={() => ball.setColorProfile({ type: 'white' })}
              className={`px-1.5 sm:px-2 py-0.5 rounded font-medium transition ${
                ball.colorProfile.type === 'white'
                  ? 'bg-slate-200 text-slate-950 font-bold shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Putih
            </button>
          </div>
        </div>

        {/* Floating / Bottom Action Control Bar */}
        <div className="w-full flex justify-center py-0.5">
          <RecordControl
            isRecording={recorder.isRecording}
            recordingDurationMs={recorder.recordingDurationMs}
            storageEstimate={recorder.storageEstimate}
            isCalibrating={isCalibrating}
            isCalibrated={!!activeCalibration}
            onToggleCalibration={() => setIsCalibrating((prev) => !prev)}
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
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <p className="font-medium text-slate-200">
                Sistem Analisis Lengkap Aktif: Pose Pemain (P1/P2), Jejak Bola, Hitungan Pukulan, & Peta Meja
              </p>
              <p className="text-slate-400">
                Seluruh pemrosesan (Pose Landmarker & Ball Motion Tracking) berjalan secara asinkron di Web Worker tanpa membebani antarmuka pengguna.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Session History & Playback Modal (F6) */}
      <SessionHistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
      />
    </div>
  );
}

export default App;
