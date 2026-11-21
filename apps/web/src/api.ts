import { RegisterInput, LoginInput, type ScenarioConfig } from "@volt/shared";
import type { RunSummary } from "@volt/sim";

export type Role = "LEARNER" | "INSTRUCTOR" | "ADMIN";
export interface User { id: string; email: string; name: string; role: Role }
export interface Lesson { slug: string; title: string; summary: string; objectives: string[]; scenario: ScenarioConfig; thresholds: { one: number; two: number; three: number }; benchmarkWhPerKm: number }
export interface Attempt { id: string; userId: string; lessonSlug: string; at: number; summary: RunSummary; stars: number; tips: string[] }

/** The app talks only to this interface. Demo mode stores everything in the browser. */
export interface VoltApi {
  session(): User | null;
  register(i: unknown): Promise<User>;
  login(email: string, password: string): Promise<User>;
  logout(): void;
  listLessons(): Promise<Lesson[]>;
  getLesson(slug: string): Promise<Lesson | undefined>;
  saveAttempt(a: Omit<Attempt, "id" | "at">): Promise<Attempt>;
  getAttempt(id: string): Promise<Attempt | undefined>;
  listAttempts(userId: string): Promise<Attempt[]>;
}

const sc = (o: Partial<ScenarioConfig>): ScenarioConfig => ({ world: "city", weather: "clear", timeOfDay: "day", trafficDensity: 0.5, startSocPct: 80, ambientC: 20, distanceKm: 2, ...o });
const LESSONS: Lesson[] = [
  { slug: "smooth-start", title: "Smooth acceleration", summary: "Pull away gently and hold a steady speed.", objectives: ["Stay under 50 km/h", "Keep jerk low", "Finish under 150 Wh/km"], scenario: sc({ distanceKm: 1.5 }), thresholds: { one: 40, two: 60, three: 80 }, benchmarkWhPerKm: 150 },
  { slug: "one-pedal", title: "One-pedal driving", summary: "Use the accelerator alone to speed up and slow down.", objectives: ["Avoid friction brakes", "Recover energy at every stop"], scenario: sc({ distanceKm: 2, trafficDensity: 0.7 }), thresholds: { one: 40, two: 60, three: 80 }, benchmarkWhPerKm: 140 },
  { slug: "regen-downhill", title: "Maximise regen downhill", summary: "Rolling hills. Let the hills pay you back.", objectives: ["Regen share above 15%", "No hard braking"], scenario: sc({ world: "countryside", distanceKm: 3, trafficDensity: 0.2 }), thresholds: { one: 40, two: 60, three: 80 }, benchmarkWhPerKm: 150 },
  { slug: "highway-efficiency", title: "Highway efficiency", summary: "Speed costs range. Find the balance.", objectives: ["Stay near the limit, not above", "Keep a 1.5 second gap"], scenario: sc({ world: "highway", distanceKm: 4, trafficDensity: 0.6 }), thresholds: { one: 40, two: 60, three: 80 }, benchmarkWhPerKm: 185 },
  { slug: "winter-drive", title: "Winter driving", summary: "Cold cuts range. Drive smoothly to save it.", objectives: ["Finish with the battery above 10%", "No collisions"], scenario: sc({ world: "countryside", weather: "cold", ambientC: -5, startSocPct: 40, distanceKm: 3, timeOfDay: "night" }), thresholds: { one: 35, two: 55, three: 75 }, benchmarkWhPerKm: 190 },
];

const K = { users: "volt.users", session: "volt.session", attempts: "volt.attempts" };
const read = <T,>(k: string, d: T): T => { try { return JSON.parse(localStorage.getItem(k) ?? "") as T; } catch { return d; } };
const write = (k: string, v: unknown) => localStorage.setItem(k, JSON.stringify(v));
const hash = async (s: string) => Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)))).map((b) => b.toString(16).padStart(2, "0")).join("");
type Stored = User & { pw: string };
const uid = () => crypto.randomUUID();
export const DEMO_PASSWORD = "demo-pass-1234";

async function seed() {
  if (read<Stored[]>(K.users, []).length) return;
  const mk = async (email: string, name: string, role: Role): Promise<Stored> => ({ id: uid(), email, name, role, pw: await hash(email + DEMO_PASSWORD) });
  write(K.users, [await mk("learner@demo.test", "Demo Learner", "LEARNER"), await mk("instructor@demo.test", "Demo Instructor", "INSTRUCTOR"), await mk("admin@demo.test", "Demo Admin", "ADMIN")]);
}
const pub = ({ pw: _pw, ...u }: Stored): User => u;

export const api: VoltApi = {
  session: () => read<User | null>(K.session, null),
  async register(i) {
    await seed();
    const p = RegisterInput.parse(i), users = read<Stored[]>(K.users, []);
    if (users.some((u) => u.email === p.email.toLowerCase())) throw new Error("That email is already registered.");
    const u: Stored = { id: uid(), email: p.email.toLowerCase(), name: p.name, role: p.role, pw: await hash(p.email.toLowerCase() + p.password) };
    write(K.users, [...users, u]); write(K.session, pub(u)); return pub(u);
  },
  async login(email, password) {
    await seed();
    const p = LoginInput.parse({ email, password }), e = p.email.toLowerCase();
    const u = read<Stored[]>(K.users, []).find((x) => x.email === e);
    if (!u || u.pw !== (await hash(e + p.password))) throw new Error("Wrong email or password.");
    write(K.session, pub(u)); return pub(u);
  },
  logout: () => localStorage.removeItem(K.session),
  listLessons: async () => LESSONS,
  getLesson: async (slug) => LESSONS.find((l) => l.slug === slug),
  async saveAttempt(a) { const at: Attempt = { ...a, id: uid(), at: Date.now() }; write(K.attempts, [...read<Attempt[]>(K.attempts, []), at]); return at; },
  getAttempt: async (id) => read<Attempt[]>(K.attempts, []).find((a) => a.id === id),
  listAttempts: async (userId) => read<Attempt[]>(K.attempts, []).filter((a) => a.userId === userId),
};
