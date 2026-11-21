import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { api, DEMO_PASSWORD } from "../api";
import { useSession } from "../store";
export default function Auth() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [f, setF] = useState({ name: "", email: "", password: "" });
  const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  const set = useSession((s) => s.set); const nav = useNavigate();
  const go = async (fn: () => Promise<unknown>) => {
    setBusy(true); setErr("");
    try { set((await fn()) as never); nav("/dashboard"); }
    catch (e) { setErr(e instanceof Error && e.name !== "ZodError" ? e.message : "Check your details. Passwords need at least 10 characters."); }
    finally { setBusy(false); }
  };
  const submit = (e: FormEvent) => { e.preventDefault(); void go(() => mode === "login" ? api.login(f.email, f.password) : api.register(f)); };
  return (<main className="wrap" style={{ maxWidth: 440 }}>
    <h2>{mode === "login" ? "Log in" : "Create your account"}</h2>
    <form className="panel" onSubmit={submit} noValidate>
      {mode === "register" && <><label htmlFor="n">Name</label><input id="n" autoComplete="name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></>}
      <label htmlFor="e">Email</label><input id="e" type="email" autoComplete="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
      <label htmlFor="p">Password</label><input id="p" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />
      {err && <p className="err" role="alert">{err}</p>}
      <button className="btn" disabled={busy}>{busy ? "Please wait" : mode === "login" ? "Log in" : "Register"}</button>{" "}
      <button type="button" className="btn ghost" onClick={() => setMode(mode === "login" ? "register" : "login")}>{mode === "login" ? "Need an account?" : "Have an account?"}</button>
    </form>
    <div className="panel" style={{ marginTop: 16 }}>
      <p className="mut">Demo accounts (password <code>{DEMO_PASSWORD}</code>). Data stays in this browser.</p>
      <div className="row">{["learner", "instructor", "admin"].map((r) => <button key={r} className="btn ghost" onClick={() => go(() => api.login(`${r}@demo.test`, DEMO_PASSWORD))}>{r}</button>)}</div>
    </div>
  </main>);
}
