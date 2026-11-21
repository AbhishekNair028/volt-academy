import type { TelemetrySample } from "@volt/shared";
import type { RunSummary } from "./scoring";

/** Counts distinct events where friction braking exceeded the threshold. */
export function lateBrakingEvents(samples: TelemetrySample[], thresholdN = 1500): number {
  let n = 0, active = false;
  for (const s of samples) {
    const hard = s.frictionBrakeN > thresholdN && s.speed > 5;
    if (hard && !active) n++;
    active = hard;
  }
  return n;
}

/** Rule-based coaching. Returns at most `max` tips, most important first. */
export function coach(samples: TelemetrySample[], r: RunSummary, benchmark: number, max = 4): string[] {
  const tips: { w: number; text: string }[] = [];
  const late = lateBrakingEvents(samples);
  if (late > 0) tips.push({ w: 90, text: `You used the friction brakes hard ${late} time${late === 1 ? "" : "s"}. Lift off earlier so the motor can recover that energy.` });
  if (r.collisions > 0) tips.push({ w: 100, text: `You had ${r.collisions} collision${r.collisions === 1 ? "" : "s"}. Slow down earlier and scan further ahead.` });
  if (r.tailgatingSeconds > 3) tips.push({ w: 80, text: `You followed too closely for ${Math.round(r.tailgatingSeconds)} seconds. Keep at least 1.5 seconds of gap.` });
  if (r.speedingSeconds > 3) tips.push({ w: 70, text: `You were over the limit for ${Math.round(r.speedingSeconds)} seconds. Aero drag grows with the square of speed, so this costs range.` });
  if (r.smoothness < 60) tips.push({ w: 60, text: "Your acceleration was jerky. Press and release the pedal gradually." });
  if (r.whPerKm > benchmark * 1.1) tips.push({ w: 50, text: `You used ${r.whPerKm.toFixed(0)} Wh/km against a benchmark of ${benchmark.toFixed(0)}. Ease off the throttle and anticipate stops.` });
  if (r.regenShare < 8 && r.distanceKm > 1) tips.push({ w: 40, text: "You recovered little energy. Try one-pedal mode and let the car slow itself." });
  if (!tips.length) tips.push({ w: 0, text: "Clean run. Try a harder scenario next." });
  return tips.sort((a, b) => b.w - a.w).slice(0, max).map((t) => t.text);
}
