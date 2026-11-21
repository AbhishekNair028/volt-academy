# Volt Academy
Learn efficient electric driving in a 3D simulator. Scores and coaching after each run. Runs fully in the browser (demo mode), so it hosts free on GitHub Pages.

## Run locally
```bash
npm install
npm run dev        # http://localhost:5173
npm test           # sim physics, scoring and coach tests (70% coverage gate)
```
Demo accounts: `learner@demo.test`, `instructor@demo.test`, `admin@demo.test`, password `demo-pass-1234`.

## Deploy to GitHub Pages
1. Create a GitHub repo and push this folder to `main`.
2. In the repo go to Settings, Pages, and set Source to **GitHub Actions**.
3. The push runs `.github/workflows/deploy.yml`: tests, build, deploy. Your site appears at `https://<user>.github.io/<repo>/`.

Routing uses the URL hash, so no server rewrite rules are needed.

## Controls
W/↑ accelerate, S/↓/Space brake, O one-pedal, A assist (adaptive cruise), C camera. Gamepad triggers and on-screen pedals also work.

## Layout
apps/web (React, Vite, React Three Fiber) · packages/sim (physics, scoring, coach) · packages/shared (Zod schemas) · docs/ARCHITECTURE.md (ER diagram, API contract)

## Status
Done: auth, lessons, simulator, scoring, coaching, dashboard, badges, results charts, Pages deploy.
Next: trip planner, instructor and admin screens, certificate PDF, Express/Prisma backend, e2e tests.
