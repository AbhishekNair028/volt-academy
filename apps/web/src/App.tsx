import { lazy, Suspense } from "react";
import { NavLink, Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { api } from "./api";
import { useSession } from "./store";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Lessons from "./pages/Lessons";
import Results from "./pages/Results";
const Sim = lazy(() => import("./pages/Sim"));

function Guard({ children }: { children: JSX.Element }) { return useSession((s) => s.user) ? children : <Navigate to="/auth" replace />; }

export default function App() {
  const { user, set } = useSession(); const nav = useNavigate();
  return (<>
    <nav className="nav" aria-label="Main">
      <NavLink to="/">Volt Academy</NavLink>
      {user && <><NavLink to="/dashboard">Dashboard</NavLink><NavLink to="/lessons">Lessons</NavLink>
        <button onClick={() => { api.logout(); set(null); nav("/"); }}>Log out</button></>}
      {!user && <NavLink to="/auth">Log in</NavLink>}
    </nav>
    <Suspense fallback={<div className="wrap"><div className="skel" /></div>}>
      <Routes>
        <Route path="/" element={<Landing />} /><Route path="/auth" element={<Auth />} />
        <Route path="/dashboard" element={<Guard><Dashboard /></Guard>} />
        <Route path="/lessons" element={<Guard><Lessons /></Guard>} />
        <Route path="/sim/:slug" element={<Guard><Sim /></Guard>} />
        <Route path="/results/:id" element={<Guard><Results /></Guard>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  </>);
}
