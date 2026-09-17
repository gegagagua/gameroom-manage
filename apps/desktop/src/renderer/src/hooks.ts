import { useEffect, useState } from 'react';
import type { AppState } from '../../common/ipc';

export function useAppState(): AppState | null {
  const [state, setState] = useState<AppState | null>(null);
  useEffect(() => {
    let alive = true;
    void window.grm.getState().then((s) => alive && setState(s));
    const off = window.grm.onState(setState);
    return () => {
      alive = false;
      off();
    };
  }, []);
  return state;
}

export function useNow(intervalMs = 250): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

let audio: AudioContext | null = null;

/** Short square-wave beeps (no audio assets needed). */
export function beep(times = 2, frequency = 880) {
  try {
    audio ??= new AudioContext();
    const ctx = audio;
    for (let i = 0; i < times; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const start = ctx.currentTime + i * 0.35;
      osc.type = 'square';
      osc.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.2, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.25);
      osc.connect(gain).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.3);
    }
  } catch {
    /* audio unavailable */
  }
}
