import React from 'react';
import { Circle, Square, History, AlertTriangle, Crosshair } from 'lucide-react';
import { formatDuration } from '@/lib/recorder';

interface RecordControlProps {
  isRecording: boolean;
  recordingDurationMs: number;
  storageEstimate: { quota: number; usage: number; percentage: number } | null;
  isCalibrating: boolean;
  isCalibrated: boolean;
  onStartRecord: () => void;
  onStopRecord: () => void;
  onOpenHistory: () => void;
  onToggleCalibration: () => void;
  disabled?: boolean;
}

export const RecordControl: React.FC<RecordControlProps> = ({
  isRecording,
  recordingDurationMs,
  storageEstimate,
  isCalibrating,
  isCalibrated,
  onStartRecord,
  onStopRecord,
  onOpenHistory,
  onToggleCalibration,
  disabled = false,
}) => {
  const isStorageLow = storageEstimate && storageEstimate.percentage > 85;

  return (
    <div className="flex flex-col items-center gap-2">
      {/* Storage warning banner if storage is above 85% */}
      {isStorageLow && (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs animate-pulse">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>Ruang penyimpanan perangkat hampir penuh ({storageEstimate.percentage.toFixed(0)}%). Pertimbangkan menghapus sesi lama.</span>
        </div>
      )}

      {/* Main Controls Bar */}
      <div className="flex items-center gap-2 sm:gap-3 bg-slate-900/90 backdrop-blur-md px-4 sm:px-5 py-2.5 rounded-full border border-slate-800 shadow-xl">
        {/* Calibration Mode Toggle */}
        <button
          onClick={onToggleCalibration}
          title={isCalibrated ? 'Kalibrasi Ulang Meja' : 'Kalibrasi 4 Sudut Meja'}
          disabled={isRecording}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition text-xs font-medium disabled:opacity-40 ${
            isCalibrating
              ? 'bg-orange-500 text-white'
              : isCalibrated
              ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/40'
              : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
          }`}
        >
          <Crosshair className="w-4 h-4 text-current" />
          <span className="hidden sm:inline">
            {isCalibrating ? 'Batal' : isCalibrated ? 'Terkalibrasi' : 'Kalibrasi'}
          </span>
        </button>

        {/* Record / Stop Button */}
        {isRecording ? (
          <button
            onClick={onStopRecord}
            className="flex items-center gap-2.5 px-5 py-2 rounded-full bg-rose-600 hover:bg-rose-500 active:scale-95 text-white font-medium text-xs sm:text-sm transition shadow-lg shadow-rose-600/30"
          >
            <Square className="w-4 h-4 fill-current" />
            <span>Berhenti ({formatDuration(recordingDurationMs)})</span>
          </button>
        ) : (
          <button
            onClick={onStartRecord}
            disabled={disabled}
            className="flex items-center gap-2.5 px-5 sm:px-6 py-2 rounded-full bg-orange-600 hover:bg-orange-500 active:scale-95 disabled:opacity-50 text-white font-medium text-xs sm:text-sm transition shadow-lg shadow-orange-600/30"
          >
            <Circle className="w-4 h-4 fill-current text-white animate-pulse" />
            <span>Mulai Rekam</span>
          </button>
        )}

        {/* History Modal Trigger */}
        <button
          onClick={onOpenHistory}
          title="Riwayat Sesi"
          disabled={isRecording}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-slate-300 hover:text-white hover:bg-slate-800/80 transition text-xs font-medium disabled:opacity-40"
        >
          <History className="w-4 h-4 text-orange-400" />
          <span className="hidden sm:inline">Riwayat</span>
        </button>

        {/* Live Duration pill when recording */}
        {isRecording && (
          <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-rose-400 animate-pulse pl-1">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            <span>REC</span>
          </div>
        )}
      </div>
    </div>
  );
};

