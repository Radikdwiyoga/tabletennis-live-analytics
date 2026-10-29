import React, { useState, useEffect, useMemo } from 'react';
import {
  Point2D,
  CalibrationResult,
  calibrateTable,
  toImage,
  TABLE_WIDTH_CM,
  TABLE_HEIGHT_CM,
} from '@/lib/homography';
import {
  saveStoredCalibration,
  loadStoredCalibration,
  clearStoredCalibration,
} from '@/storage/calibrationStorage';
import { Check, RotateCcw, Crosshair, AlertCircle, Eye, EyeOff } from 'lucide-react';

interface CalibrationOverlayProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  isCalibrating: boolean;
  onCalibrationChange: (calib: CalibrationResult | null) => void;
  onCloseCalibration: () => void;
}

const STEP_LABELS = [
  { num: 1, title: 'Kiri-Dekat', desc: 'Sudut kiri meja yang paling dekat dengan kamera' },
  { num: 2, title: 'Kanan-Dekat', desc: 'Sudut kanan meja yang paling dekat dengan kamera' },
  { num: 3, title: 'Kanan-Jauh', desc: 'Sudut kanan meja yang paling jauh dari kamera' },
  { num: 4, title: 'Kiri-Jauh', desc: 'Sudut kiri meja yang paling jauh dari kamera' },
];

export const CalibrationOverlay: React.FC<CalibrationOverlayProps> = ({
  videoRef,
  isCalibrating,
  onCalibrationChange,
  onCloseCalibration,
}) => {
  const [tappedPoints, setTappedPoints] = useState<Point2D[]>([]);
  const [activeCalibration, setActiveCalibration] = useState<CalibrationResult | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [showTableLines, setShowTableLines] = useState<boolean>(true);

  // Load existing calibration on mount
  useEffect(() => {
    const saved = loadStoredCalibration();
    if (saved) {
      setActiveCalibration(saved);
      onCalibrationChange(saved);
    }
  }, [onCalibrationChange]);

  // Reset tapped points when calibration mode opens
  useEffect(() => {
    if (isCalibrating) {
      setTappedPoints([]);
      setValidationError(null);
    }
  }, [isCalibrating]);

  // Handle tap / click on video area
  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isCalibrating || tappedPoints.length >= 4) return;

    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // Convert click coordinates to video pixel coordinates
    const scaleX = video.videoWidth / rect.width;
    const scaleY = video.videoHeight / rect.height;

    const newPt: Point2D = {
      x: clickX * scaleX,
      y: clickY * scaleY,
    };

    const nextPoints = [...tappedPoints, newPt];
    setTappedPoints(nextPoints);

    if (nextPoints.length === 4) {
      try {
        const calib = calibrateTable(nextPoints);
        setValidationError(null);
        // Temporary preview
        setActiveCalibration(calib);
      } catch (err) {
        setValidationError((err as Error).message || 'Titik sudut tidak valid.');
      }
    }
  };

  const handleSaveCalibration = () => {
    if (tappedPoints.length === 4 && !validationError) {
      const calib = saveStoredCalibration(tappedPoints);
      if (calib) {
        setActiveCalibration(calib);
        onCalibrationChange(calib);
        onCloseCalibration();
      }
    }
  };

  const handleResetPoints = () => {
    setTappedPoints([]);
    setValidationError(null);
    if (!activeCalibration) {
      setActiveCalibration(null);
    }
  };

  const handleClearActiveCalibration = () => {
    clearStoredCalibration();
    setActiveCalibration(null);
    onCalibrationChange(null);
    setTappedPoints([]);
  };

  // Compute table lines projection (boundary, net, service center line)
  const projectedLines = useMemo(() => {
    const calib = activeCalibration;
    if (!calib) return null;

    try {
      const invH = calib.invHomography;

      // Table corners (0,0), (274,0), (274,152.5), (0,152.5)
      const p0 = toImage(invH, { x: 0, y: 0 });
      const p1 = toImage(invH, { x: TABLE_WIDTH_CM, y: 0 });
      const p2 = toImage(invH, { x: TABLE_WIDTH_CM, y: TABLE_HEIGHT_CM });
      const p3 = toImage(invH, { x: 0, y: TABLE_HEIGHT_CM });

      // Net line (x = 137cm, y from 0 to 152.5)
      const netNear = toImage(invH, { x: TABLE_WIDTH_CM / 2, y: 0 });
      const netFar = toImage(invH, { x: TABLE_WIDTH_CM / 2, y: TABLE_HEIGHT_CM });

      // Service dividing line (along length, y = 76.25cm, from x 0 to 274)
      const serviceStart = toImage(invH, { x: 0, y: TABLE_HEIGHT_CM / 2 });
      const serviceEnd = toImage(invH, { x: TABLE_WIDTH_CM, y: TABLE_HEIGHT_CM / 2 });

      return {
        boundary: [p0, p1, p2, p3],
        net: [netNear, netFar],
        service: [serviceStart, serviceEnd],
      };
    } catch {
      return null;
    }
  }, [activeCalibration]);

  const video = videoRef.current;
  const vWidth = video?.videoWidth || 1280;
  const vHeight = video?.videoHeight || 720;

  return (
    <div
      onClick={handleOverlayClick}
      className={`absolute inset-0 w-full h-full select-none ${
        isCalibrating ? 'cursor-crosshair pointer-events-auto' : 'pointer-events-none'
      }`}
    >
      {/* SVG canvas mapped to video coordinate space */}
      <svg
        viewBox={`0 0 ${vWidth} ${vHeight}`}
        preserveAspectRatio="none"
        className="w-full h-full absolute inset-0"
      >
        {/* Render calibrated table projection */}
        {showTableLines && projectedLines && (
          <g className="transition-opacity duration-300">
            {/* Table surface area fill */}
            <polygon
              points={projectedLines.boundary.map((p) => `${p.x},${p.y}`).join(' ')}
              fill="rgba(34, 197, 94, 0.12)"
              stroke="#22c55e"
              strokeWidth="3.5"
              strokeLinejoin="round"
            />

            {/* Service Center Line */}
            <line
              x1={projectedLines.service[0]!.x}
              y1={projectedLines.service[0]!.y}
              x2={projectedLines.service[1]!.x}
              y2={projectedLines.service[1]!.y}
              stroke="rgba(255, 255, 255, 0.7)"
              strokeWidth="2"
              strokeDasharray="6,4"
            />

            {/* Net Line */}
            <line
              x1={projectedLines.net[0]!.x}
              y1={projectedLines.net[0]!.y}
              x2={projectedLines.net[1]!.x}
              y2={projectedLines.net[1]!.y}
              stroke="#f97316"
              strokeWidth="4"
            />
          </g>
        )}

        {/* Tapped point markers during calibration */}
        {isCalibrating &&
          tappedPoints.map((pt, idx) => (
            <g key={idx} transform={`translate(${pt.x}, ${pt.y})`}>
              <circle r="14" fill="#f97316" stroke="#ffffff" strokeWidth="2.5" />
              <text
                textAnchor="middle"
                dy="5"
                fill="#ffffff"
                fontSize="13"
                fontWeight="bold"
                fontFamily="sans-serif"
              >
                {idx + 1}
              </text>
            </g>
          ))}
      </svg>

      {/* Floating Instructions Banner when in Calibration Mode */}
      {isCalibrating && (
        <div className="absolute top-14 inset-x-4 flex flex-col items-center pointer-events-auto z-30">
          <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-2xl p-4 shadow-2xl max-w-md w-full flex flex-col gap-3">
            {/* Step header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Crosshair className="w-4 h-4 text-orange-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-orange-400">
                  Kalibrasi Meja ({tappedPoints.length}/4)
                </span>
              </div>
              <button
                onClick={onCloseCalibration}
                className="text-xs text-slate-400 hover:text-slate-200"
              >
                Batal
              </button>
            </div>

            {/* Current Step Instruction */}
            {tappedPoints.length < 4 ? (
              <div>
                <p className="text-sm font-semibold text-slate-100">
                  Tap {tappedPoints.length + 1}: {STEP_LABELS[tappedPoints.length]?.title}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {STEP_LABELS[tappedPoints.length]?.desc}
                </p>
              </div>
            ) : validationError ? (
              <div className="flex items-start gap-2 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Kalibrasi Gagal</p>
                  <p>{validationError}</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs text-emerald-400 font-medium">
                <Check className="w-4 h-4" />
                <span>Garis hijau dan net telah diproyeksikan. Periksa apakah sudah sesuai dengan meja fisik.</span>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={handleResetPoints}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Ulangi Tap</span>
              </button>

              {tappedPoints.length === 4 && !validationError && (
                <button
                  onClick={handleSaveCalibration}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white shadow-lg shadow-emerald-600/20 transition"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Simpan Kalibrasi</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Subtle indicator when calibrated and NOT currently in calibration mode */}
      {!isCalibrating && activeCalibration && (
        <div className="absolute bottom-3 left-3 pointer-events-auto z-20 flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900/80 backdrop-blur-md border border-emerald-500/40 text-[11px] text-emerald-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Meja Terkalibrasi (274x152.5 cm)</span>
          </div>

          <button
            onClick={handleClearActiveCalibration}
            title="Hapus Kalibrasi Meja"
            className="p-1.5 rounded-full bg-slate-900/80 hover:bg-rose-950/80 backdrop-blur-md border border-slate-700/60 text-slate-400 hover:text-rose-400 transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setShowTableLines((prev) => !prev)}
            title={showTableLines ? 'Sembunyikan Garis Meja' : 'Tampilkan Garis Meja'}
            className="p-1.5 rounded-full bg-slate-900/80 hover:bg-slate-800 backdrop-blur-md border border-slate-700/60 text-slate-300 transition"
          >
            {showTableLines ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          </button>
        </div>
      )}
    </div>
  );
};
