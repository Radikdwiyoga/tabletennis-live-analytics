import React from 'react';
import { Camera, SwitchCamera, AlertTriangle, RefreshCw, Video } from 'lucide-react';
import { useCamera } from './useCamera';

interface CameraViewProps {
  onStreamReady?: (stream: MediaStream) => void;
  overlayChildren?: React.ReactNode;
}

export const CameraView: React.FC<CameraViewProps> = ({ overlayChildren }) => {
  const {
    videoRef,
    settings,
    isLoading,
    error,
    facingMode,
    availableDevices,
    selectedDeviceId,
    switchFacingMode,
    selectDevice,
    retry,
  } = useCamera();

  return (
    <div className="relative w-full h-full min-h-[480px] max-h-[85vh] bg-slate-950 rounded-2xl overflow-hidden shadow-2xl border border-slate-800 flex items-center justify-center">
      {/* 1. Video Element (playsInline is vital for iOS Safari) */}
      <video
        ref={videoRef}
        playsInline
        muted
        autoPlay
        className="w-full h-full object-contain bg-black"
      />

      {/* 2. Top-Bar Camera HUD */}
      <div className="absolute top-3 inset-x-3 flex items-center justify-between pointer-events-none z-20">
        <div className="flex items-center gap-2 pointer-events-auto">
          {/* Live Status Badge */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900/80 backdrop-blur-md border border-slate-700/60 text-xs font-medium text-slate-200">
            <span
              className={`w-2 h-2 rounded-full ${
                !error && !isLoading ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
              }`}
            />
            <span>{isLoading ? 'Menghubungkan...' : error ? 'Kamera Mati' : 'LIVE'}</span>
          </div>

          {/* Actual Resolution & FPS Info */}
          {settings && settings.width > 0 && !error && (
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900/80 backdrop-blur-md border border-slate-700/60 text-xs font-mono text-slate-300">
              <Video className="w-3.5 h-3.5 text-blue-400" />
              <span>
                {settings.width}x{settings.height}
                {settings.frameRate ? ` @ ${settings.frameRate}fps` : ''}
              </span>
            </div>
          )}
        </div>

        {/* Camera Controls */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {/* Device dropdown if multiple devices, otherwise quick switch button */}
          {availableDevices.length > 2 ? (
            <select
              aria-label="Pilih Perangkat Kamera"
              value={selectedDeviceId || ''}
              onChange={(e) => selectDevice(e.target.value)}
              className="px-2.5 py-1 rounded-lg bg-slate-900/80 backdrop-blur-md border border-slate-700/60 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-orange-500"
            >
              {availableDevices.map((d, idx) => (
                <option key={d.deviceId || idx} value={d.deviceId} className="bg-slate-900 text-slate-200">
                  {d.label || `Kamera ${idx + 1}`}
                </option>
              ))}
            </select>
          ) : (
            <button
              onClick={switchFacingMode}
              title={`Ganti ke kamera ${facingMode === 'environment' ? 'depan' : 'belakang'}`}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/80 hover:bg-slate-800 backdrop-blur-md border border-slate-700/60 text-xs font-medium text-slate-200 transition-colors shadow-sm"
            >
              <SwitchCamera className="w-3.5 h-3.5 text-orange-400" />
              <span className="hidden xs:inline">
                {facingMode === 'environment' ? 'Kamera Belakang' : 'Kamera Depan'}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* 3. Slot for Overlay (Canvas / HUD in F3-F5) */}
      {overlayChildren && (
        <div className="absolute inset-0 pointer-events-none z-10">
          {overlayChildren}
        </div>
      )}

      {/* 4. Loading State */}
      {isLoading && !error && (
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center gap-3 z-30">
          <div className="w-10 h-10 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium text-slate-300">Membuka kamera...</p>
        </div>
      )}

      {/* 5. Error State */}
      {error && (
        <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-30">
          <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mb-4 text-rose-400 shadow-inner">
            {error.isPermissionDenied ? (
              <Camera className="w-7 h-7" />
            ) : (
              <AlertTriangle className="w-7 h-7" />
            )}
          </div>
          <h3 className="text-lg font-semibold text-slate-100 mb-1">{error.title}</h3>
          <p className="text-sm text-slate-400 max-w-md mb-6 leading-relaxed">
            {error.message}
          </p>

          <button
            onClick={retry}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 active:scale-95 text-white text-sm font-medium transition shadow-lg shadow-orange-600/20"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Coba Lagi</span>
          </button>
        </div>
      )}
    </div>
  );
};
