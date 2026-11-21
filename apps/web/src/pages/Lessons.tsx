import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, type Lesson, type Attempt } from "../api";
import { useSession } from "../store";
export default function Lessons() {
  const user = useSession((s) => s.user)!; const [ls, setLs] = useState<Lesson[] | null>(null); const [at, setAt] = useState<Attempt[]>([]);
  useEffect(() => { void api.listLessons().then(setLs); void api.listAttempts(user.id).then(setAt); }, [user.id]);
  const best = (slug: string) => Math.max(0, ...at.filter((a) => a.lessonSlug === slug).map((a) => a.stars));
  return (<main className="wrap"><h2>Lessons</h2>
    {!ls ? <div className="skel" /> : <div className="grid">{ls.map((l) => (
      <article className="panel" key={l.slug}>
        <h3 style={{ margin: 0 }}>{l.title}</h3><p className="mut">{l.summary}</p>
        <p className="mut">{l.scenario.world} · {l.scenario.weather} · {l.scenario.distanceKm} km · start {l.scenario.startSocPct}%</p>
        <ul>{l.objectives.map((o) => <li key={o}>{o}</li>)}</ul>
        <p aria-label={`${best(l.slug)} of 3 stars`}>{"★".repeat(best(l.slug))}{"☆".repeat(3 - best(l.slug))}</p>
        <Link className="btn" to={`/sim/${l.slug}`}>Drive</Link>
      </article>))}</div>}
  </main>);
}
