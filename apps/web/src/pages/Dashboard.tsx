import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api, type Attempt } from "../api";
import { useSession } from "../store";
const BASELINE = 200, PRICE = 0.15; // untrained Wh/km and cost per kWh (assumptions)
function streak(at: Attempt[]) {
  const days = new Set(at.map((a) => new Date(a.at).toDateString())); let n = 0; const d = new Date();
  if (!days.has(d.toDateString())) d.setDate(d.getDate() - 1);
  while (days.has(d.toDateString())) { n++; d.setDate(d.getDate() - 1); } return n;
}
export default function Dashboard() {
  const user = useSession((s) => s.user)!; const [at, setAt] = useState<Attempt[] | null>(null);
  useEffect(() => { void api.listAttempts(user.id).then(setAt); }, [user.id]);
  if (!at) return <main className="wrap"><div className="skel" /></main>;
  const saved = at.reduce((s, a) => s + Math.max(0, (BASELINE - a.summary.whPerKm) * a.summary.distanceKm) / 1000, 0);
  const badges = [["First run", at.length >= 1], ["Three stars", at.some((a) => a.stars === 3)], ["Regen master", at.some((a) => a.summary.regenShare >= 15)], ["Zero collisions", at.length > 0 && at.every((a) => a.summary.collisions === 0)], ["5-run streak", at.length >= 5]] as const;
  const data = at.map((a, i) => ({ run: i + 1, score: a.summary.overall, wh: Math.round(a.summary.whPerKm) }));
  return (<main className="wrap"><h2>Hello, {user.name.split(" ")[0]}</h2>
    <div className="grid">
      <div className="panel"><div className="stat serif">{at.length}</div><span className="mut">runs completed</span></div>
      <div className="panel"><div className="stat serif">{streak(at)}</div><span className="mut">day streak</span></div>
      <div className="panel"><div className="stat serif">{saved.toFixed(2)} kWh</div><span className="mut">saved vs {BASELINE} Wh/km baseline (about {(saved * PRICE).toFixed(2)} at {PRICE}/kWh)</span></div>
    </div>
    <div className="panel" style={{ marginTop: 16 }}><h3 style={{ marginTop: 0 }}>Score trend</h3>
      {data.length < 2 ? <p className="mut">Complete two runs to see your trend. <Link to="/lessons">Pick a lesson</Link></p> :
        <div style={{ height: 240 }}><ResponsiveContainer><LineChart data={data}><CartesianGrid stroke="#ffffff18" /><XAxis dataKey="run" stroke="#8fa38f" /><YAxis domain={[0, 100]} stroke="#8fa38f" /><Tooltip contentStyle={{ background: "#0b120b", border: "1px solid #ffffff22" }} /><Line dataKey="score" stroke="#3dff8b" dot={false} strokeWidth={2} /></LineChart></ResponsiveContainer></div>}
    </div>
    <div className="panel" style={{ marginTop: 16 }}><h3 style={{ marginTop: 0 }}>Badges</h3>
      <div className="row">{badges.map(([n, ok]) => <span key={n} className={`tag ${ok ? "on" : ""}`}>{ok ? "✓" : "○"} {n}</span>)}</div></div>
  </main>);
}
