interface Props {
  enabled: boolean;
  supported: boolean;
  status: 'idle' | 'granted' | 'denied';
  tilt: number;
  onEnable: () => void;
  onDisable: () => void;
  onRequest: () => Promise<boolean>;
}

export function TiltConsent({ enabled, supported, status, tilt, onEnable, onDisable, onRequest }: Props) {
  return (
    <div className="flex items-center justify-between text-xs">
      <div className="text-slate-400">Tilt control: {supported ? (status === 'granted' ? `${tilt.toFixed(2)}` : status === 'denied' ? 'denied' : 'off') : 'not available'}</div>
      {enabled ? (
        <div className="flex items-center gap-3">
          {status !== 'granted' && (
            <button className="underline" onClick={() => onRequest()}>Grant</button>
          )}
          <button className="underline" onClick={onDisable}>Disable</button>
        </div>
      ) : (
        <button className="underline" onClick={onEnable} disabled={!supported}>Enable</button>
      )}
    </div>
  );
}
