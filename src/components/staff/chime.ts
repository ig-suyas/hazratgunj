"use client";

// A soft two-note chime for new orders, made with Web Audio (no sound file).
let ctx: AudioContext | null = null;

/** Browsers only allow sound after a tap; call this from any tap to unlock it. */
export function unlockSound() {
  try {
    ctx ??= new AudioContext();
    if (ctx.state === "suspended") void ctx.resume();
  } catch {}
}

export function chime() {
  try {
    ctx ??= new AudioContext();
    if (ctx.state === "suspended") void ctx.resume();
    const t = ctx.currentTime;
    for (const [freq, at] of [
      [880, 0],
      [1318.5, 0.16],
    ] as const) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, t + at);
      gain.gain.linearRampToValueAtTime(0.18, t + at + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + at + 0.9);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t + at);
      osc.stop(t + at + 1);
    }
  } catch {}
}
