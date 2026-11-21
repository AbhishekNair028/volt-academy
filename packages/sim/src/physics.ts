/** Longitudinal EV physics. SI units; energy in Wh. Pure and deterministic. */
export interface VehicleParams {
  massKg: number; cd: number; frontalAreaM2: number; crr: number;
  wheelRadiusM: number; gearRatio: number; maxTorqueNm: number; maxPowerW: number;
  drivetrainEff: number; regenEff: number; maxRegenN: number; maxBrakeN: number;
  auxW: number; batteryKwh: number;
}
export const DEFAULT_VEHICLE: VehicleParams = {
  massKg: 1850, cd: 0.23, frontalAreaM2: 2.22, crr: 0.009,
  wheelRadiusM: 0.33, gearRatio: 9, maxTorqueNm: 420, maxPowerW: 220_000,
  drivetrainEff: 0.9, regenEff: 0.65, maxRegenN: 4500, maxBrakeN: 9000,
  auxW: 500, batteryKwh: 75,
};
export interface Env { gradeRad: number; ambientC: number; rain: boolean }
export interface Input { throttle: number; brake: number; onePedal: boolean }
export interface State { v: number; distanceM: number; energyWh: number; regenWh: number; socWh: number; accel: number; regenW: number; frictionN: number }

const G = 9.81, RHO = 1.225, COAST = 0.15;
const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));

export function initialState(p: VehicleParams, startSocPct: number): State {
  return { v: 0, distanceM: 0, energyWh: 0, regenWh: 0, socWh: p.batteryKwh * 1000 * (startSocPct / 100), accel: 0, regenW: 0, frictionN: 0 };
}

/** Usable capacity shrinks below 20 C (about 0.6% per degree, floor 70%). */
export function capacityFactor(ambientC: number): number {
  return ambientC >= 20 ? 1 : clamp(1 - 0.006 * (20 - ambientC), 0.7, 1);
}
/** Cabin heating draw below 10 C. */
export function heaterW(ambientC: number): number {
  return ambientC >= 10 ? 0 : Math.min(3000, (10 - ambientC) * 120);
}
/** Max motor force at the wheels: constant torque, then constant power. */
export function tractionLimitN(p: VehicleParams, v: number): number {
  return Math.min((p.maxTorqueNm * p.gearRatio) / p.wheelRadiusM, p.maxPowerW / Math.max(v, 1));
}
/** Regen fades out below ~5 m/s, in the cold, and when the battery is nearly full. */
export function regenCapN(p: VehicleParams, v: number, ambientC: number, socFrac: number): number {
  const speedFade = clamp(v / 5, 0, 1);
  const cold = ambientC >= 15 ? 1 : clamp(0.5 + 0.5 * (ambientC + 10) / 25, 0.5, 1);
  const full = socFrac < 0.9 ? 1 : clamp((1 - socFrac) / 0.1, 0, 1);
  return p.maxRegenN * speedFade * cold * full;
}

export function step(p: VehicleParams, s: State, inp: Input, env: Env, dt: number): State {
  const throttle = clamp(inp.throttle, 0, 1), brake = clamp(inp.brake, 0, 1);
  const socFrac = s.socWh / (p.batteryKwh * 1000 * capacityFactor(env.ambientC));
  const regenCap = regenCapN(p, s.v, env.ambientC, socFrac);

  let tractionN = 0, regenN = 0;
  if (inp.onePedal) {
    if (throttle >= COAST) tractionN = ((throttle - COAST) / (1 - COAST)) * tractionLimitN(p, s.v);
    else regenN = ((COAST - throttle) / COAST) * regenCap;
  } else {
    tractionN = throttle * tractionLimitN(p, s.v);
  }
  const brakeDemand = brake * p.maxBrakeN * (env.rain ? 0.85 : 1);
  const regenFromBrake = Math.min(regenCap, brakeDemand);
  const frictionN = Math.max(0, brakeDemand - regenFromBrake);
  regenN = Math.min(regenCap, regenN + regenFromBrake);

  const aero = 0.5 * RHO * p.cd * p.frontalAreaM2 * s.v * s.v;
  const roll = p.crr * (env.rain ? 1.15 : 1) * p.massKg * G * Math.cos(env.gradeRad) * (s.v > 0.05 ? 1 : 0);
  const grade = p.massKg * G * Math.sin(env.gradeRad);

  const force = tractionN - regenN - frictionN - aero - roll - grade;
  let a = force / p.massKg;
  let v = s.v + a * dt;
  if (v < 0) { v = 0; a = 0; }

  const vMid = (s.v + v) / 2;
  const motorW = tractionN * vMid / p.drivetrainEff;
  const regenW = regenN * vMid * p.regenEff;
  const auxW = p.auxW + heaterW(env.ambientC);
  const netW = motorW - regenW + auxW;
  const dWh = (netW * dt) / 3600;

  return {
    v, distanceM: s.distanceM + vMid * dt,
    energyWh: s.energyWh + dWh, regenWh: s.regenWh + (regenW * dt) / 3600,
    socWh: Math.max(0, s.socWh - dWh), accel: a, regenW, frictionN,
  };
}

export const socPct = (p: VehicleParams, s: State, ambientC: number) =>
  (s.socWh / (p.batteryKwh * 1000 * capacityFactor(ambientC))) * 100;
export const whPerKm = (s: State) => (s.distanceM > 1 ? s.energyWh / (s.distanceM / 1000) : 0);
