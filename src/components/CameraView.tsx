import React from 'react';
import { Camera, SwitchCamera, AlertTriangle, RefreshCw, Video } from 'lucide-react';
import { useCamera, UseCameraResult } from './useCamera';

interface CameraViewProps {
  camera?: UseCameraResult;
  isRecording?: boolean;
  recordingDurationFormatted?: string;
  overlayChildren?: React.ReactNode;
}

export const CameraView: React.FC<CameraViewProps> = ({
  camera: externalCamera,
  isRecording = false,
  recordingDurationFormatted,
  overlayChildren,
}) => {
  const internalCamera = useCamera();
  const camera = externalCamera || internalCamera;

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
  } = camera;

  return (
    <div
      className={`relative w-full h-full min-h-[440px] max-h-[80vh] bg-slate-950 rounded-2xl overflow-hidden shadow-2xl border transition-all duration-300 flex items-center justify-center ${
        isRecording ? 'border-rose-500/80 ring-2 ring-rose-500/20' : 'border-slate-800'
      }`}
    >
      {/* Video & Pixel-Perfect Overlay Stage */}
      <div
        className="relative flex items-center justify-center overflow-hidden"
        style={{
          aspectRatio:
            settings && settings.width > 0 && settings.height > 0
              ? `${settings.width} / ${settings.height}`
              : '16 / 9',
          maxWidth: '100%',
          maxHeight: '100%',
          width: '100%',
        }}
      >
        {/* 1. Video Element (playsInline is vital for iOS Safari) */}
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className="w-full h-full object-fill bg-black block"
        />

        {/* 3. Slot for Overlay (Canvas / HUD in F3-F5) */}
        {overlayChildren && (
          <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">
            {overlayChildren}
          </div>
        )}
      </div>

      {/* 2. Top-Bar Camera HUD */}
      <div className="absolute top-2 sm:top-3 inset-x-2 sm:inset-x-3 flex items-center justify-between pointer-events-none z-20">
        <div className="flex items-center gap-1.5 sm:gap-2 pointer-events-auto">
          {/* Live Status Badge */}
          <div className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full bg-slate-900/80 backdrop-blur-md border border-slate-700/60 text-[10px] sm:text-xs font-medium text-slate-200">
            <span
              className={`w-1.5 sm:w-2 h-1.5 sm:h-2 rounded-full ${
                isRecording
                  ? 'bg-rose-500 animate-ping'
                  : !error && !isLoading
                  ? 'bg-emerald-500 animate-pulse'
                  : 'bg-amber-500'
              }`}
            />
            <span>
              {isLoading
                ? 'Menghubungkan...'
                : error
                ? 'Kamera Mati'
                : isRecording
                ? `REC ${recordingDurationFormatted || ''}`
                : 'LIVE'}
            </span>
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
        <div className="flex items-center gap-1.5 sm:gap-2 pointer-events-auto">
          {/* Device dropdown if multiple devices, otherwise quick switch button */}
          {availableDevices.length > 2 ? (
            <select
              aria-label="Pilih Perangkat Kamera"
              value={selectedDeviceId || ''}
              disabled={isRecording}
              onChange={(e) => selectDevice(e.target.value)}
              className="px-2 py-0.5 sm:px-2.5 sm:py-1 max-w-[120px] sm:max-w-none rounded-lg bg-slate-900/80 backdrop-blur-md border border-slate-700/60 text-[10px] sm:text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-orange-500 disabled:opacity-40 truncate"
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
              disabled={isRecording}
              title={`Ganti ke kamera ${facingMode === 'environment' ? 'depan' : 'belakang'}`}
              className="flex items-center gap-1 sm:gap-1.5 p-1.5 sm:px-3 sm:py-1.5 rounded-full bg-slate-900/80 hover:bg-slate-800 backdrop-blur-md border border-slate-700/60 text-[10px] sm:text-xs font-medium text-slate-200 transition-colors shadow-sm disabled:opacity-40"
            >
              <SwitchCamera className="w-3.5 h-3.5 text-orange-400" />
              <span className="hidden md:inline">
                {facingMode === 'environment' ? 'Kamera Belakang' : 'Kamera Depan'}
              </span>
            </button>
          )}
        </div>
      </div>

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
