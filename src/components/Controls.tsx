interface Props {
  playing: boolean;
  bpm: number;
  mode: 'learn' | 'flow';
  onPlayToggle: () => void;
  onBpm: (bpm: number) => void;
  onMode: (m: 'learn' | 'flow') => void;
  onPrev: () => void;
  onNext: () => void;
  onHaptics: () => void;
}

export function Controls({ playing, bpm, mode, onPlayToggle, onBpm, onMode, onPrev, onNext, onHaptics }: Props) {
  return (
    <div className="px-4 pb-3">
      <div className="flex items-center justify-center gap-2">
        <button onClick={onPrev} className="rounded-full bg-slate-800 text-white px-4 py-2 border border-slate-700">◀</button>
        <button onClick={onPlayToggle} className={`rounded-full px-6 py-2 font-semibold border ${playing ? 'bg-amber-400 text-black border-amber-200' : 'bg-slate-800 text-white border-slate-700'}`}>{playing ? 'Pause' : 'Play'}</button>
        <button onClick={onNext} className="rounded-full bg-slate-800 text-white px-4 py-2 border border-slate-700">▶</button>
      </div>

      <div className="mt-4">
        <label className="text-xs text-slate-400">Tempo: {bpm} BPM</label>
        <input
          className="w-full"
          type="range"
          min={40}
          max={120}
          step={1}
          value={bpm}
          onChange={(e) => onBpm(parseInt(e.target.value))}
        />
      </div>

      <div className="mt-3 flex items-center justify-between">
        <div className="flex gap-2 text-xs">
          <button
            className={`px-3 py-1 rounded-full border ${mode === 'learn' ? 'bg-sky-600 border-sky-500' : 'bg-slate-800 border-slate-700'}`}
            onClick={() => onMode('learn')}
          >Learn</button>
          <button
            className={`px-3 py-1 rounded-full border ${mode === 'flow' ? 'bg-sky-600 border-sky-500' : 'bg-slate-800 border-slate-700'}`}
            onClick={() => onMode('flow')}
          >Flow</button>
        </div>

        <button onClick={onHaptics} className="text-xs text-slate-300 underline">Pulse</button>
      </div>
    </div>
  );
}
