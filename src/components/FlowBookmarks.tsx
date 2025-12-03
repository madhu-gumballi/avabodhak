import { useMemo } from 'react';

interface Props {
  total: number;
  onJump: (lineIndex: number) => void;
  segmentSize?: number;
}

export function FlowBookmarks({ total, onJump, segmentSize = 50 }: Props) {
  const segments = useMemo(() => {
    const size = Math.max(10, segmentSize);
    const result: Array<{ start: number; end: number } > = [];
    let start = 0;
    while (start < total) {
      const end = Math.min(total - 1, start + size - 1);
      result.push({ start, end });
      start = end + 1;
    }
    return result;
  }, [total, segmentSize]);

  if (total <= 0) return null;

  return (
    <div className="overflow-x-auto">
      <div className="flex items-center gap-2 py-1">
        {segments.map((seg, i) => (
          <button
            key={i}
            className="px-2 py-1 rounded-full border text-xs bg-slate-800 border-slate-700 hover:bg-slate-700"
            onClick={() => onJump(seg.start)}
            title={`Jump to lines ${seg.start + 1}–${seg.end + 1}`}
          >
            {seg.start + 1}–{seg.end + 1}
          </button>
        ))}
      </div>
    </div>
  );
}
