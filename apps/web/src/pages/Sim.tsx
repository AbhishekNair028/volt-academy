import { useCallback, useEffect, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Link, useNavigate, useParams } from "react-router-dom";
import { coach, scoreRun, stars } from "@volt/sim";
import type { TelemetrySample } from "@volt/shared";
import { api, type Lesson } from "../api";
import { useSession } from "../store";
import Scene, { type Hud, type Keys } from "../sim/Scene";

export default function Sim() {
  const { slug = "" } = useParams(); const nav = useNavigate(); const user = useSession((s) => s.user)!;
  const [lesson, setLesson] = useState<Lesson | null | undefined>(undefined); const [hud, setHud] = useState<Hud | null>(null);
  const [lowQ, setLowQ] = useState(() => localStorage.getItem("volt.lowq") === "1");
  const keys = useRef<Keys>({ up: false, down: false, onePedal: true, assist: false, cam: 0 });
  useEffect(() => { void api.getLesson(slug).then((l) => setLesson(l ?? null)); }, [slug]);
  useEffect(() => {
    const set = (e: KeyboardEvent, v: boolean) => {
      const k = keys.current;
      if (["ArrowUp", "w", "W"].includes(e.key)) k.up = v; else if (["ArrowDown", "s", "S", " "].includes(e.key)) k.down = v;
      else if (v && (e.key === "o" || e.key === "O")) k.onePedal = !k.onePedal; else if (v && (e.key === "a" || e.key === "A")) k.assist = !k.assist;
      else if (v && (e.key === "c" || e.key === "C")) k.cam = (k.cam + 1) % 3; else return; e.preventDefault();
    };
    const d = (e: KeyboardEvent) => set(e, true), u = (e: KeyboardEvent) => set(e, false);
    window.addEventListener("keydown", d); window.addEventListener("keyup", u); return () => { window.removeEventListener("keydown", d); window.removeEventListener("keyup", u); };
  }, []);
  const finish = useCallback(async (samples: TelemetrySample[], collisions: number) => {
    if (!lesson) return;
    const summary = scoreRun(samples, { benchmarkWhPerKm: lesson.benchmarkWhPerKm, collisions });
    const a = await api.saveAttempt({ userId: user.id, lessonSlug: lesson.slug, summary, stars: stars(summary.overall, lesson.thresholds), tips: coach(samples, summary, lesson.benchmarkWhPerKm) });
    try { localStorage.setItem("volt.lastrun", JSON.stringify({ id: a.id, samples })); } catch { /* storage full: charts are optional */ }
    nav(`/results/${a.id}`);
  }, [lesson, user.id, nav]);

  if (lesson === undefined) return <main className="wrap"><div className="skel" /></main>;
  if (lesson === null) return <main className="wrap"><p>That lesson doesn't exist. <Link to="/lessons">Back to lessons</Link></p></main>;
  const hold = (f: "up" | "down") => ({ onPointerDown: () => { keys.current[f] = true; }, onPointerUp: () => { keys.current[f] = false; }, onPointerLeave: () => { keys.current[f] = false; } });
  return (<div className="sim">
    <Canvas dpr={lowQ ? 1 : [1, 1.5]} gl={{ antialias: !lowQ }} camera={{ fov: 62, near: 0.1, far: 600 }}>
      <Scene sc={lesson.scenario} keys={keys} onHud={setHud} onFinish={finish} />
    </Canvas>
    <div className="top"><Link className="tag" to="/lessons">Exit</Link><span className="tag">{lesson.title}</span>
      <span className="row"><button className="tag" onClick={() => { keys.current.onePedal = !keys.current.onePedal; }}>One-pedal (O)</button>
        <button className="tag" onClick={() => { keys.current.assist = !keys.current.assist; }}>Assist (A)</button>
        <button className="tag" onClick={() => { keys.current.cam = (keys.current.cam + 1) % 3; }}>Camera (C)</button>
        <button className="tag" onClick={() => { localStorage.setItem("volt.lowq", lowQ ? "0" : "1"); setLowQ(!lowQ); }}>{lowQ ? "Low quality" : "High quality"}</button></span></div>
    <div className="pedals"><button {...hold("up")} aria-label="Accelerate">Go</button><button {...hold("down")} aria-label="Brake">Brake</button></div>
    <div className="hud" role="status" aria-live="off">
      {hud ? <>
        <div><div className="big">{Math.round(hud.kph)}</div><span className="mut">km/h · limit {hud.limit}</span></div>
        <div><div>{hud.soc.toFixed(0)}% · {hud.rangeKm.toFixed(0)} km range</div><div className="bar"><i style={{ width: `${Math.max(0, Math.min(100, hud.soc))}%` }} /></div></div>
        <div><div>{hud.regenKw > 0.1 ? `Regen ${hud.regenKw.toFixed(1)} kW` : `Power ${Math.round(hud.throttle * 100)}%`}</div><div className="bar"><i style={{ width: `${Math.round(hud.throttle * 100)}%` }} /></div></div>
        <div className="mut">D · {hud.remainingKm.toFixed(2)} km left{hud.gapM !== null ? ` · gap ${hud.gapM.toFixed(0)} m` : ""}</div>
        <span className={`tag ${hud.onePedal ? "on" : ""}`}>One-pedal {hud.onePedal ? "on" : "off"}</span>
        <span className={`tag ${hud.assist ? "on" : ""}`}>{hud.assist ? "Assist: cruise on" : "Assist off"}</span>
      </> : <span className="mut">Hold W or ↑ to go, S or ↓ to brake. O one-pedal, A assist, C camera.</span>}
    </div>
  </div>);
}
