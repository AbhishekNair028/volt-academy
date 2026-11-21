import type { TelemetrySample } from "@volt/shared";

export interface RunSummary {
  distanceKm: number; energyWh: number; whPerKm: number;
  efficiency: number; smoothness: number; safety: number; regenShare: number;
  speedingSeconds: number; tailgatingSeconds: number; collisions: number; overall: number;
}
const clamp = (x: number, a = 0, b = 100) => Math.min(b, Math.max(a, x));

export function jerkOf(speeds: number[], dt = 0.1): number[] {
  const out: number[] = [];
  for (let i = 0; i < speeds.length; i++) {
    if (i < 2) { out.push(0); continue; }
    const a1 = (speeds[i]! - speeds[i - 1]!) / dt, a0 = (speeds[i - 1]! - speeds[i - 2]!) / dt;
    out.push((a1 - a0) / dt);
  }
  return out;
}

/** Efficiency: 100 at or below 70% of benchmark, 0 at 150% of benchmark. */
export function efficiencyScore(whPerKm: number, benchmark: number): number {
  const r = whPerKm / benchmark;
  return clamp(((1.5 - r) / (1.5 - 0.7)) * 100);
}
/** Smoothness from RMS jerk (m/s^3): 0.5 is excellent, 3 is rough. */
export function smoothnessScore(samples: TelemetrySample[]): number {
  if (!samples.length) return 0;
  const rms = Math.sqrt(samples.reduce((s, x) => s + x.jerk * x.jerk, 0) / samples.length);
  return clamp(((3 - rms) / 2.5) * 100);
}

export function scoreRun(samples: TelemetrySample[], opts: { benchmarkWhPerKm: number; collisions: number; dt?: number }): RunSummary {
  const dt = opts.dt ?? 0.1;
  if (samples.length < 2) {
    return { distanceKm: 0, energyWh: 0, whPerKm: 0, efficiency: 0, smoothness: 0, safety: 0, regenShare: 0, speedingSeconds: 0, tailgatingSeconds: 0, collisions: opts.collisions, overall: 0 };
  }
  const last = samples[samples.length - 1]!, first = samples[0]!;
  const energyWh = last.energyWh - first.energyWh;
  const distanceKm = samples.reduce((d, s) => d + s.speed * dt, 0) / 1000;
  const whPerKm = distanceKm > 0 ? energyWh / distanceKm : 0;
  const speeding = samples.filter((s) => s.speed * 3.6 > s.limitKph + 5).length * dt;
  const tail = samples.filter((s) => s.gapM !== null && s.gapM < s.speed * 1.5 && s.speed > 3).length * dt;
  const regenWh = samples.reduce((e, s) => e + (s.regenW * dt) / 3600, 0);
  const grossWh = Math.max(1, energyWh + regenWh);
  const regenShare = clamp((regenWh / grossWh) * 100);
  const total = samples.length * dt;
  const safety = clamp(100 - (speeding / total) * 150 - (tail / total) * 150 - opts.collisions * 25);
  const efficiency = efficiencyScore(whPerKm, opts.benchmarkWhPerKm);
  const smoothness = smoothnessScore(samples);
  const overall = Math.round(efficiency * 0.4 + smoothness * 0.3 + safety * 0.3);
  return { distanceKm, energyWh, whPerKm, efficiency, smoothness, safety, regenShare, speedingSeconds: speeding, tailgatingSeconds: tail, collisions: opts.collisions, overall };
}

export function stars(overall: number, t: { one: number; two: number; three: number }): 0 | 1 | 2 | 3 {
  return overall >= t.three ? 3 : overall >= t.two ? 2 : overall >= t.one ? 1 : 0;
}
