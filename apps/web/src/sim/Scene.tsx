import { useFrame, useThree } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { DEFAULT_VEHICLE as P, initialState, socPct, step } from "@volt/sim";
import type { ScenarioConfig, TelemetrySample } from "@volt/shared";

export interface Keys { up: boolean; down: boolean; onePedal: boolean; assist: boolean; cam: number }
export interface Hud { kph: number; limit: number; soc: number; rangeKm: number; regenKw: number; throttle: number; remainingKm: number; gapM: number | null; onePedal: boolean; assist: boolean; collisions: number }
type World = ScenarioConfig["world"];
export const LIMIT: Record<World, number> = { city: 50, highway: 110, countryside: 80 };

const elev = (w: World, d: number) => (w === "countryside" ? 18 * Math.sin(d / 220) + 8 * Math.sin(d / 90) : w === "highway" ? 3 * Math.sin(d / 600) : 0);
const lat = (w: World, d: number) => (w === "countryside" ? 25 * Math.sin(d / 180) : 0);
const dl = (f: (d: number) => number, d: number) => (f(d + 0.5) - f(d - 0.5));
const slope = (w: World, d: number) => dl((x) => elev(w, x), d);
const yawAt = (w: World, d: number) => -Math.atan(dl((x) => lat(w, x), d));
const rand = (seed: number) => () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

function ribbon(len: number, w: World, half: number, yOff: number) {
  const n = Math.ceil(len / 4), pos: number[] = [], idx: number[] = [];
  for (let i = 0; i <= n; i++) {
    const d = i * 4, th = yawAt(w, d), px = lat(w, d), py = elev(w, d) + yOff, rx = Math.cos(th), rz = -Math.sin(th);
    pos.push(px - rx * half, py, -d - rz * half, px + rx * half, py, -d + rz * half);
    if (i < n) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g;
}

function Scenery({ w, len, seed }: { w: World; len: number; seed: number }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const items = useMemo(() => {
    const r = rand(seed), out: THREE.Matrix4[] = [], o = new THREE.Object3D(), step = w === "city" ? 14 : 16;
    for (let d = 20; d < len; d += step) for (const side of [-1, 1]) {
      const off = side * ((w === "city" ? 12 : 8) + r() * (w === "city" ? 4 : 18)), th = yawAt(w, d);
      const x = lat(w, d) + Math.cos(th) * off, z = -d - Math.sin(th) * off, h = w === "city" ? 8 + r() * 28 : 4 + r() * 4;
      o.position.set(x, elev(w, d) + h / 2, z); o.scale.set(w === "city" ? 8 : 3, h, w === "city" ? 8 : 3); o.rotation.set(0, th, 0); o.updateMatrix(); out.push(o.matrix.clone());
    }
    return out;
  }, [w, len, seed]);
  useLayoutEffect(() => { items.forEach((m, i) => ref.current?.setMatrixAt(i, m)); if (ref.current) ref.current.instanceMatrix.needsUpdate = true; }, [items]);
  return <instancedMesh ref={ref} args={[undefined, undefined, items.length]}>
    {w === "city" ? <boxGeometry args={[1, 1, 1]} /> : <coneGeometry args={[1, 1, 6]} />}
    <meshStandardMaterial color={w === "city" ? "#2a3340" : "#1f6b3a"} />
  </instancedMesh>;
}

function Car({ carRef, wheels, brakeMat }: { carRef: React.RefObject<THREE.Group>; wheels: React.MutableRefObject<THREE.Mesh[]>; brakeMat: React.RefObject<THREE.MeshStandardMaterial> }) {
  const wp: [number, number][] = [[-0.95, -1.4], [0.95, -1.4], [-0.95, 1.4], [0.95, 1.4]];
  return <group ref={carRef}>
    <mesh position={[0, 0.55, 0]}><boxGeometry args={[1.9, 0.5, 4.6]} /><meshStandardMaterial color="#d8dde2" metalness={0.6} roughness={0.3} /></mesh>
    <mesh position={[0, 0.98, 0.2]}><boxGeometry args={[1.6, 0.42, 2.4]} /><meshStandardMaterial color="#10161c" metalness={0.9} roughness={0.1} /></mesh>
    {wp.map(([x, z], i) => <mesh key={i} position={[x, 0.33, z]} rotation={[0, 0, Math.PI / 2]} ref={(m) => { if (m) wheels.current[i] = m; }}><cylinderGeometry args={[0.33, 0.33, 0.25, 16]} /><meshStandardMaterial color="#111" /></mesh>)}
    {[-0.65, 0.65].map((x) => <mesh key={x} position={[x, 0.6, -2.32]}><boxGeometry args={[0.4, 0.08, 0.05]} /><meshStandardMaterial color="#fff" emissive="#fff" emissiveIntensity={2} /></mesh>)}
    <mesh position={[0, 0.7, -2.32]}><boxGeometry args={[1.5, 0.03, 0.05]} /><meshStandardMaterial color="#fff" emissive="#cfe" emissiveIntensity={1.5} /></mesh>
    {[-0.7, 0.7].map((x) => <mesh key={x} position={[x, 0.65, 2.32]}><boxGeometry args={[0.45, 0.1, 0.05]} /><meshStandardMaterial ref={x < 0 ? brakeMat : undefined} color="#400" emissive="#f00" emissiveIntensity={0.3} /></mesh>)}
  </group>;
}

export default function Scene({ sc, keys, onHud, onFinish }: { sc: ScenarioConfig; keys: React.MutableRefObject<Keys>; onHud: (h: Hud) => void; onFinish: (s: TelemetrySample[], collisions: number) => void }) {
  const w = sc.world, limit = LIMIT[w], total = sc.distanceKm * 1000, len = total + 400, night = sc.timeOfDay === "night", rain = sc.weather === "rain";
  const { camera } = useThree();
  const carRef = useRef<THREE.Group>(null), leadRef = useRef<THREE.Mesh>(null), brakeMat = useRef<THREE.MeshStandardMaterial>(null), wheels = useRef<THREE.Mesh[]>([]);
  const road = useMemo(() => ribbon(len, w, 4.5, 0), [len, w]), line = useMemo(() => ribbon(len, w, 0.12, 0.03), [len, w]), ground = useMemo(() => ribbon(len, w, 90, -0.3), [len, w]);
  const g = useRef({ s: initialState(P, sc.startSocPct), thr: 0, brk: 0, t: 0, lastS: -1, lastAcc: 0, lead: 70, coll: 0, cool: 0, done: false, samples: [] as TelemetrySample[] });
  const fin = useRef(onFinish); fin.current = onFinish;

  useFrame((_, delta) => {
    const k = g.current, dt = Math.min(delta, 0.05), key = keys.current;
    let tThr = key.up ? 1 : 0, tBrk = key.down ? 1 : 0;
    const pad = navigator.getGamepads?.()[0];
    if (pad) { tThr = Math.max(tThr, pad.buttons[7]?.value ?? 0); tBrk = Math.max(tBrk, pad.buttons[6]?.value ?? 0); }
    const d = k.s.distanceM, leadV = sc.trafficDensity > 0 ? limit * 0.7 / 3.6 * (1 + 0.15 * Math.sin(k.t / 8)) : 0;
    const gap = sc.trafficDensity > 0 ? k.lead - d - 4.6 : null;
    if (key.assist) { // lane-keeping is implicit on a single lane; this is adaptive cruise
      const target = gap !== null && gap < 60 ? Math.min(limit / 3.6, leadV * (gap < 25 ? 0.9 : 1)) : limit / 3.6, e = target - k.s.v;
      tThr = Math.min(1, Math.max(0, e * 0.35)); tBrk = Math.min(1, Math.max(0, -e * 0.25));
    }
    k.thr += Math.max(-4 * dt, Math.min(3 * dt, tThr - k.thr)); k.brk += Math.max(-6 * dt, Math.min(6 * dt, tBrk - k.brk));
    const env = { gradeRad: Math.atan(slope(w, d)), ambientC: sc.ambientC, rain };
    for (let i = 0; i < 4; i++) k.s = step(P, k.s, { throttle: k.thr, brake: k.brk, onePedal: key.onePedal }, env, dt / 4);
    k.t += dt; k.lead += leadV * dt; k.cool -= dt;
    if (gap !== null && gap < 0.5 && k.cool <= 0) { k.coll++; k.cool = 3; k.s = { ...k.s, v: k.s.v * 0.4 }; }

    const dd = k.s.distanceM, th = yawAt(w, dd), pitch = Math.atan(slope(w, dd)), px = lat(w, dd), py = elev(w, dd), pz = -dd;
    const car = carRef.current; if (car) { car.position.set(px, py, pz); car.rotation.set(pitch, th, 0, "YXZ"); }
    wheels.current.forEach((m) => { m.rotation.x += (k.s.v * dt) / 0.33; });
    if (brakeMat.current) brakeMat.current.emissiveIntensity = 0.3 + k.brk * 3;
    if (leadRef.current) { const th2 = yawAt(w, k.lead); leadRef.current.position.set(lat(w, k.lead), elev(w, k.lead) + 0.8, -k.lead); leadRef.current.rotation.set(0, th2, 0); }
    const f = new THREE.Vector3(-Math.sin(th), 0, -Math.cos(th)), p = new THREE.Vector3(px, py, pz);
    camera.up.set(0, 1, 0);
    if (key.cam === 0) { camera.position.copy(p).addScaledVector(f, -9).add(new THREE.Vector3(0, 3.6, 0)); camera.lookAt(p.clone().addScaledVector(f, 8).add(new THREE.Vector3(0, 1, 0))); }
    else if (key.cam === 1) { camera.position.copy(p).add(new THREE.Vector3(0, 1.25, 0)).addScaledVector(f, 0.2); camera.lookAt(p.clone().addScaledVector(f, 30).add(new THREE.Vector3(0, 1.1, 0))); }
    else { camera.position.set(px, py + 70, pz); camera.up.set(0, 0, -1); camera.lookAt(p); }

    if (k.t - k.lastS >= 0.1 && !k.done) {
      const jerk = k.lastS < 0 ? 0 : (k.s.accel - k.lastAcc) / 0.1; k.lastS = k.t; k.lastAcc = k.s.accel;
      const gp = gap !== null && gap < 80 ? gap : null;
      k.samples.push({ t: k.t, x: px, z: pz, speed: k.s.v, throttle: k.thr, brake: k.brk, energyWh: k.s.energyWh, jerk, gapM: gp, limitKph: limit, regenW: k.s.regenW, frictionBrakeN: k.s.frictionN });
      const recent = k.s.distanceM > 100 ? k.s.energyWh / (k.s.distanceM / 1000) : 160, soc = socPct(P, k.s, sc.ambientC);
      onHud({ kph: k.s.v * 3.6, limit, soc, rangeKm: k.s.socWh / Math.max(60, recent), regenKw: k.s.regenW / 1000, throttle: k.thr, remainingKm: Math.max(0, (total - dd) / 1000), gapM: gp, onePedal: key.onePedal, assist: key.assist, collisions: k.coll });
      if (dd >= total || k.s.socWh <= 0) { k.done = true; fin.current(k.samples, k.coll); }
    }
  });

  return <>
    <color attach="background" args={[night ? "#02040a" : rain ? "#59636b" : "#9fc4e8"]} />
    <fog attach="fog" args={[night ? "#02040a" : rain ? "#59636b" : "#9fc4e8", 40, rain ? 130 : 280]} />
    <ambientLight intensity={night ? 0.25 : 0.8} /><directionalLight position={[40, 80, 20]} intensity={night ? 0.2 : 1.4} />
    <mesh geometry={ground}><meshStandardMaterial color={w === "city" ? "#2c2f33" : "#2f5a35"} side={THREE.DoubleSide} /></mesh>
    <mesh geometry={road}><meshStandardMaterial color="#202326" side={THREE.DoubleSide} /></mesh>
    <mesh geometry={line}><meshStandardMaterial color="#e8e8e8" side={THREE.DoubleSide} /></mesh>
    <Scenery w={w} len={len} seed={w.length * 97 + 7} />
    <Car carRef={carRef} wheels={wheels} brakeMat={brakeMat} />
    {sc.trafficDensity > 0 && <mesh ref={leadRef}><boxGeometry args={[1.9, 1.3, 4.4]} /><meshStandardMaterial color="#7a1f24" /></mesh>}
  </>;
}
