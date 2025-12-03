import { useEffect, useMemo, useRef, useState } from 'react';

export function useTilt(enabled: boolean) {
  const [granted, setGranted] = useState(false);
  const tiltRef = useRef(0);
  const [tilt, setTilt] = useState(0);

  const supported = typeof window !== 'undefined' && ('DeviceOrientationEvent' in window);

  async function requestPermission() {
    try {
      // @ts-ignore iOS specific
      if (typeof DeviceOrientationEvent !== 'undefined' && DeviceOrientationEvent.requestPermission) {
        // @ts-ignore
        const res = await DeviceOrientationEvent.requestPermission();
        setGranted(res === 'granted');
        return res === 'granted';
      }
      setGranted(true);
      return true;
    } catch {
      setGranted(false);
      return false;
    }
  }

  useEffect(() => {
    if (!enabled || !supported) return;
    function onTilt(e: DeviceOrientationEvent) {
      const gamma = e.gamma ?? 0; // left-right tilt
      const norm = Math.max(-45, Math.min(45, gamma)) / 45; // -1..1
      tiltRef.current = norm;
      setTilt(norm);
    }
    window.addEventListener('deviceorientation', onTilt);
    return () => window.removeEventListener('deviceorientation', onTilt);
  }, [enabled, supported]);

  return { supported, granted, tilt, requestPermission };
}
