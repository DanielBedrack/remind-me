export function fireConfetti(): void {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('canvas-confetti');
    const fn: (opts: object) => void = mod.default ?? mod;
    fn({
      particleCount: 120,
      spread: 80,
      startVelocity: 45,
      origin: { x: 0.5, y: 0.6 },
      colors: ['#4CD964', '#34C759', '#5AC8FA', '#AF52DE', '#FF9500', '#FF2D55', '#FFD60A'],
      scalar: 1.1,
      gravity: 1.2,
    });
  } catch {}
}
