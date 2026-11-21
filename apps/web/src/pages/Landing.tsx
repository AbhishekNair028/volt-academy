import { Link } from "react-router-dom";
export default function Landing() {
  return (<main className="wrap">
    <section className="hero">
      <p className="mut">EV driver training</p>
      <h1>Drive electric.<br />Go further.</h1>
      <p className="mut" style={{ maxWidth: 560, margin: "0 auto 28px" }}>Practise one-pedal driving, regenerative braking and winter range in a 3D simulator. Get scored and coached after every run.</p>
      <div className="row" style={{ justifyContent: "center" }}><Link className="btn" to="/auth">Start free</Link><Link className="btn ghost" to="/auth">Use a demo account</Link></div>
    </section>
    <div className="grid">
      {[["Practise safely", "Five lessons across city, highway and hilly roads, in clear, rain or cold."], ["Get specific coaching", "Tips like \"you braked hard 6 times; lift off earlier to recover energy\"."], ["Track real progress", "Efficiency trends, streaks, badges and energy saved."]].map(([t, d]) => <div className="panel" key={t}><h2 style={{ fontSize: "1.4rem" }}>{t}</h2><p className="mut">{d}</p></div>)}
    </div>
  </main>);
}
