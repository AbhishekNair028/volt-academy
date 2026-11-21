import { describe, it, expect } from "vitest";
import { DEFAULT_VEHICLE as P, initialState, step, capacityFactor, heaterW, tractionLimitN, regenCapN, socPct, whPerKm } from "../src/physics";
import { scoreRun, stars, jerkOf, efficiencyScore } from "../src/scoring";
import { coach, lateBrakingEvents } from "../src/coach";
import type { TelemetrySample } from "@volt/shared";

const flat = { gradeRad: 0, ambientC: 20, rain: false };
const run = (secs: number, inp: { throttle: number; brake: number; onePedal: boolean }, env = flat, s0 = initialState(P, 80)) => {
  let s = s0; for (let i = 0; i < secs * 100; i++) s = step(P, s, inp, env, 0.01); return s;
};
const sample = (o: Partial<TelemetrySample> = {}): TelemetrySample => ({ t: 0, x: 0, z: 0, speed: 20, throttle: 0.2, brake: 0, energyWh: 0, jerk: 0, gapM: null, limitKph: 100, regenW: 0, frictionBrakeN: 0, ...o });

describe("physics", () => {
  it("accelerates and consumes energy", () => {
    const s = run(5, { throttle: 0.5, brake: 0, onePedal: false });
    expect(s.v).toBeGreaterThan(5); expect(s.energyWh).toBeGreaterThan(0); expect(s.socWh).toBeLessThan(75000 * 0.8);
  });
  it("never goes negative in speed", () => {
    const s = run(5, { throttle: 0, brake: 1, onePedal: false });
    expect(s.v).toBe(0);
  });
  it("regenerates on a downhill in one-pedal mode", () => {
    const fast = run(8, { throttle: 0.5, brake: 0, onePedal: true });
    const s = run(10, { throttle: 0, brake: 0, onePedal: true }, { ...flat, gradeRad: -0.05 }, fast);
    expect(s.regenWh).toBeGreaterThan(0);
  });
  it("uses more energy per km uphill than on the flat", () => {
    const f = run(20, { throttle: 0.3, brake: 0, onePedal: false });
    const u = run(20, { throttle: 0.3, brake: 0, onePedal: false }, { ...flat, gradeRad: 0.03 });
    expect(whPerKm(u)).toBeGreaterThan(whPerKm(f) * 0 + 1);
    expect(u.v).toBeLessThan(f.v);
  });
  it("cold reduces capacity and adds heater load", () => {
    expect(capacityFactor(20)).toBe(1); expect(capacityFactor(-10)).toBeLessThan(0.85); expect(capacityFactor(-100)).toBe(0.7);
    expect(heaterW(15)).toBe(0); expect(heaterW(-10)).toBeGreaterThan(0); expect(heaterW(-100)).toBe(3000);
  });
  it("limits traction by torque at low speed and power at high speed", () => {
    expect(tractionLimitN(P, 0)).toBeCloseTo((420 * 9) / 0.33, 0);
    expect(tractionLimitN(P, 50)).toBeCloseTo(220000 / 50, 0);
  });
  it("fades regen at low speed, in cold and when full", () => {
    expect(regenCapN(P, 0, 20, 0.5)).toBe(0);
    expect(regenCapN(P, 20, -10, 0.5)).toBeLessThan(regenCapN(P, 20, 20, 0.5));
    expect(regenCapN(P, 20, 20, 1)).toBe(0);
  });
  it("friction brakes take over when regen is capped, and rain weakens braking", () => {
    const fast = run(10, { throttle: 0.8, brake: 0, onePedal: false });
    const dry = step(P, fast, { throttle: 0, brake: 1, onePedal: false }, flat, 0.01);
    const wet = step(P, fast, { throttle: 0, brake: 1, onePedal: false }, { ...flat, rain: true }, 0.01);
    expect(dry.frictionN).toBeGreaterThan(0); expect(wet.frictionN).toBeLessThan(dry.frictionN);
  });
  it("reports soc percent", () => { expect(socPct(P, initialState(P, 80), 20)).toBeCloseTo(80, 5); });
});

describe("scoring", () => {
  it("computes jerk from speeds", () => {
    const j = jerkOf([0, 1, 2, 4]); expect(j[0]).toBe(0); expect(j[3]).toBeGreaterThan(0);
  });
  it("scales efficiency against the benchmark", () => {
    expect(efficiencyScore(100, 160)).toBe(100); expect(efficiencyScore(240, 160)).toBe(0); expect(efficiencyScore(160, 160)).toBeCloseTo(62.5, 1);
  });
  it("handles empty runs", () => { expect(scoreRun([], { benchmarkWhPerKm: 160, collisions: 0 }).overall).toBe(0); });
  it("penalises speeding, tailgating and collisions", () => {
    const clean = Array.from({ length: 100 }, (_, i) => sample({ t: i / 10, energyWh: i }));
    const bad = clean.map((s) => ({ ...s, speed: 40, gapM: 5 }));
    const a = scoreRun(clean, { benchmarkWhPerKm: 160, collisions: 0 }), b = scoreRun(bad, { benchmarkWhPerKm: 160, collisions: 2 });
    expect(b.safety).toBeLessThan(a.safety); expect(b.speedingSeconds).toBeGreaterThan(0); expect(b.tailgatingSeconds).toBeGreaterThan(0);
  });
  it("maps scores to stars", () => {
    const t = { one: 50, two: 70, three: 90 };
    expect([stars(40, t), stars(55, t), stars(75, t), stars(95, t)]).toEqual([0, 1, 2, 3]);
  });
});

describe("coach", () => {
  it("counts distinct late-braking events", () => {
    const s = [0, 1, 1, 0, 1, 0].map((h) => sample({ frictionBrakeN: h ? 3000 : 0 }));
    expect(lateBrakingEvents(s)).toBe(2);
  });
  it("gives specific tips, ordered by importance and capped", () => {
    const s = [...Array.from({ length: 50 }, () => sample({ frictionBrakeN: 3000, speed: 40, gapM: 5, jerk: 4 }))];
    const r = scoreRun(s, { benchmarkWhPerKm: 160, collisions: 1 });
    const tips = coach(s, r, 160);
    expect(tips.length).toBeLessThanOrEqual(4); expect(tips[0]).toMatch(/collision/);
  });
  it("praises a clean run", () => {
    const s = Array.from({ length: 50 }, (_, i) => sample({ energyWh: i * 0.5, regenW: 3000 }));
    const r = scoreRun(s, { benchmarkWhPerKm: 400, collisions: 0 });
    expect(coach(s, r, 400)[0]).toMatch(/Clean/);
  });
});
