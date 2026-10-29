import { CameraView } from '@/components/CameraView';
import { Activity, ShieldCheck, HelpCircle } from 'lucide-react';

export function App() {
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
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-800/60 border border-slate-700/50 text-slate-300">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Lokal di HP</span>
            </span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 flex flex-col gap-4">
        {/* Camera Container */}
        <div className="flex-1 flex flex-col items-center justify-center">
          <CameraView />
        </div>

        {/* Tip / Status Box for F1 */}
        <div className="w-full bg-slate-900/60 border border-slate-800 rounded-xl p-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-orange-500/10 text-orange-400">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <p className="font-medium text-slate-200">
                Fitur F1: Akses Kamera Aktif
              </p>
              <p className="text-slate-400">
                Target 720p @ 60fps untuk gerakan bola cepat. Privasi penuh: video tidak pernah dikirim ke server.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto text-slate-500">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Pasang HP di tripod menghadap meja</span>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
