import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";
import type { TelemetrySample } from "@volt/shared";
import { api, type Attempt } from "../api";
export default function Results() {
  const { id } = useParams(); const [a, setA] = useState<Attempt | null | undefined>(undefined);
  useEffect(() => { void api.getAttempt(id ?? "").then((x) => setA(x ?? null)); }, [id]);
  if (a === undefined) return <main className="wrap"><div className="skel" /></main>;
  if (a === null) return <main className="wrap"><p>We couldn't find that run. <Link to="/lessons">Back to lessons</Link></p></main>;
  const last = JSON.parse(localStorage.getItem("volt.lastrun") ?? "null") as { id: string; samples: TelemetrySample[] } | null;
  const data = last?.id === a.id ? last.samples.filter((_, i) => i % 5 === 0).map((s) => ({ t: Math.round(s.t), kph: Math.round(s.speed * 3.6), wh: Math.round(s.energyWh) })) : [];
  const s = a.summary;
  const rows: [string, number][] = [["Efficiency", s.efficiency], ["Smoothness", s.smoothness], ["Safety", s.safety]];
  return (<main className="wrap"><h2>Run complete</h2>
    <div className="grid">
      <div className="panel"><div className="stat serif">{s.overall}/100</div><span className="mut">overall</span><p aria-label={`${a.stars} of 3 stars`} style={{ fontSize: "1.6rem" }}>{"★".repeat(a.stars)}{"☆".repeat(3 - a.stars)}</p></div>
      <div className="panel">{rows.map(([n, v]) => <div key={n}><span className="mut">{n} {Math.round(v)}</span><div className="bar" style={{ width: "100%" }}><i style={{ width: `${v}%` }} /></div></div>)}</div>
      <div className="panel"><p>{s.whPerKm.toFixed(0)} Wh/km over {s.distanceKm.toFixed(2)} km</p><p>Regen share {s.regenShare.toFixed(0)}%</p><p>Collisions {s.collisions}</p></div>
    </div>
    <div className="panel" style={{ marginTop: 16 }}><h3 style={{ marginTop: 0 }}>Coach</h3><ul>{a.tips.map((t) => <li key={t}>{t}</li>)}</ul></div>
    {data.length > 0 && <div className="panel" style={{ marginTop: 16 }}><h3 style={{ marginTop: 0 }}>Speed (km/h) and energy (Wh)</h3>
      <div style={{ height: 240 }}><ResponsiveContainer><LineChart data={data}><CartesianGrid stroke="#ffffff18" /><XAxis dataKey="t" stroke="#8fa38f" /><YAxis yAxisId="l" stroke="#8fa38f" /><YAxis yAxisId="r" orientation="right" stroke="#8fa38f" /><Tooltip contentStyle={{ background: "#0b120b", border: "1px solid #ffffff22" }} /><Line yAxisId="l" dataKey="kph" stroke="#3dff8b" dot={false} /><Line yAxisId="r" dataKey="wh" stroke="#ffd166" dot={false} /></LineChart></ResponsiveContainer></div></div>}
    <div className="row" style={{ marginTop: 16 }}><Link className="btn" to={`/sim/${a.lessonSlug}`}>Try again</Link><Link className="btn ghost" to="/lessons">All lessons</Link></div>
  </main>);
}
