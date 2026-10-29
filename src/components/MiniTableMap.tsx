import React from 'react';
import { PlayerFrame } from '@/lib/playerTracker';
import { BouncePoint } from '@/lib/rally';
import { TABLE_WIDTH_CM, TABLE_HEIGHT_CM } from '@/lib/homography';

interface MiniTableMapProps {
  p1: PlayerFrame | null;
  p2: PlayerFrame | null;
  bounces?: BouncePoint[];
}

export const MiniTableMap: React.FC<MiniTableMapProps> = ({ p1, p2, bounces = [] }) => {
  // Miniature dimensions: 144px width, aspect ratio 274 : 152.5 => height ~80px
  const mapWidth = 144;
  const mapHeight = Math.round(mapWidth * (TABLE_HEIGHT_CM / TABLE_WIDTH_CM));

  const scaleX = mapWidth / TABLE_WIDTH_CM;
  const scaleY = mapHeight / TABLE_HEIGHT_CM;

  // Convert table cm to mini map px
  const toMini = (tablePos?: { x: number; y: number }) => {
    if (!tablePos) return null;
    const x = Math.max(-15, Math.min(TABLE_WIDTH_CM + 15, tablePos.x)) * scaleX;
    const y = Math.max(-15, Math.min(TABLE_HEIGHT_CM + 15, tablePos.y)) * scaleY;
    return { x, y };
  };

  const p1Mini = toMini(p1?.tablePos);
  const p2Mini = toMini(p2?.tablePos);

  // Take the most recent 20 bounces to keep map clean and responsive
  const recentBounces = bounces.slice(-20);

  return (
    <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700/70 rounded-xl p-2.5 shadow-xl flex flex-col gap-1.5 pointer-events-auto">
      <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400">
        <span>Peta Meja & Pantulan</span>
        <span className="text-[9px] text-slate-500 font-normal">est.</span>
      </div>

      <div
        className="relative bg-blue-950/90 rounded-lg border-2 border-slate-300/80 overflow-visible shadow-inner"
        style={{ width: `${mapWidth}px`, height: `${mapHeight}px` }}
      >
        {/* Net Line in Center (x = 137cm) */}
        <div
          className="absolute top-0 bottom-0 w-[2px] bg-white/90 shadow-sm"
          style={{ left: `${mapWidth / 2}px` }}
        />

        {/* Center Service Line (horizontal) */}
        <div
          className="absolute left-0 right-0 h-[1px] bg-white/40 border-t border-dashed border-white/50"
          style={{ top: `${mapHeight / 2}px` }}
        />

        {/* Zone Labels */}
        <span className="absolute left-2 top-1 text-[9px] font-black text-lime-400/50 select-none">
          P1
        </span>
        <span className="absolute right-2 top-1 text-[9px] font-black text-purple-400/50 select-none">
          P2
        </span>

        {/* Ball Bounces (Heatmap points) */}
        {recentBounces.map((b) => {
          const bx = b.tableX * scaleX;
          const by = b.tableY * scaleY;
          const isP1Hitter = b.hitter === 'P1';

          return (
            <div
              key={b.id}
              className={`absolute w-2 h-2 rounded-full -translate-x-1/2 -translate-y-1/2 shadow-sm ${
                isP1Hitter ? 'bg-orange-400 shadow-orange-400/80' : 'bg-purple-400 shadow-purple-400/80'
              }`}
              style={{ left: `${bx}px`, top: `${by}px` }}
              title={`Pantulan ${b.hitter} (${b.tableX}, ${b.tableY} cm)`}
            />
          );
        })}

        {/* P1 Position Marker */}
        {p1Mini && (
          <div
            className="absolute -translate-x-1/2 -translate-y-1/2 transition-all duration-150 z-10"
            style={{ left: `${p1Mini.x}px`, top: `${p1Mini.y}px` }}
          >
            <div className="w-3.5 h-3.5 rounded-full bg-lime-500 border border-white shadow-md shadow-lime-500/50 flex items-center justify-center">
              <span className="text-[7px] font-black text-slate-950">1</span>
            </div>
          </div>
        )}

        {/* P2 Position Marker */}
        {p2Mini && (
          <div
            className="absolute -translate-x-1/2 -translate-y-1/2 transition-all duration-150 z-10"
            style={{ left: `${p2Mini.x}px`, top: `${p2Mini.y}px` }}
          >
            <div className="w-3.5 h-3.5 rounded-full bg-purple-500 border border-white shadow-md shadow-purple-500/50 flex items-center justify-center">
              <span className="text-[7px] font-black text-white">2</span>
            </div>
          </div>
        )}
      </div>

      {/* Footer Summary */}
      <div className="flex items-center justify-between text-[9px] text-slate-400 px-0.5">
        <span>Pantulan: {bounces.length}</span>
        <span className="text-orange-400 font-mono">274×152 cm</span>
      </div>
    </div>
  );
};
