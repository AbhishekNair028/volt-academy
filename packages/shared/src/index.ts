import { z } from "zod";

export const Role = z.enum(["LEARNER", "INSTRUCTOR", "ADMIN"]);
export type Role = z.infer<typeof Role>;

export const RegisterInput = z.object({
  email: z.string().email(),
  password: z.string().min(10).max(128),
  name: z.string().min(1).max(80),
  role: z.enum(["LEARNER", "INSTRUCTOR"]).default("LEARNER"),
});
export const LoginInput = z.object({ email: z.string().email(), password: z.string().min(1) });

export const VehicleInput = z.object({
  model: z.string().min(1).max(60),
  batteryKwh: z.number().min(10).max(200),
  whPerKm: z.number().min(80).max(400),
});

export const Weather = z.enum(["clear", "rain", "cold"]);
export const World = z.enum(["city", "highway", "countryside"]);
export const ScenarioConfig = z.object({
  world: World,
  weather: Weather,
  timeOfDay: z.enum(["day", "night"]),
  trafficDensity: z.number().min(0).max(1),
  startSocPct: z.number().min(1).max(100),
  ambientC: z.number().min(-20).max(40),
  distanceKm: z.number().positive(),
});
export type ScenarioConfig = z.infer<typeof ScenarioConfig>;

export const PassThresholds = z.object({
  one: z.number().min(0).max(100),
  two: z.number().min(0).max(100),
  three: z.number().min(0).max(100),
});
export const LessonInput = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  title: z.string().min(3),
  objectives: z.array(z.string()).min(1),
  scenario: ScenarioConfig,
  thresholds: PassThresholds,
});

/** One 10 Hz telemetry sample. Stored as parallel arrays server-side. */
export const TelemetrySample = z.object({
  t: z.number(), x: z.number(), z: z.number(),
  speed: z.number(), throttle: z.number(), brake: z.number(),
  energyWh: z.number(), jerk: z.number(),
  gapM: z.number().nullable(), limitKph: z.number(),
  regenW: z.number(), frictionBrakeN: z.number(),
});
export type TelemetrySample = z.infer<typeof TelemetrySample>;

export const Page = z.object({ page: z.coerce.number().int().min(1).default(1), pageSize: z.coerce.number().int().min(1).max(100).default(20) });

/** Every API error uses this shape. */
export const ApiError = z.object({
  error: z.object({ code: z.string(), message: z.string(), details: z.unknown().optional(), requestId: z.string().optional() }),
});
export type ApiError = z.infer<typeof ApiError>;
