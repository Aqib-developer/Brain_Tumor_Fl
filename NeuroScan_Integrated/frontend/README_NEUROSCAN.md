# NeuroScan — Stitch design integration (first working frontend milestone)

## What is implemented
- The original React/Vite project, extended with Stitch-inspired navy/royal-blue/cyan styling.
- Landing, Login, Registration, Dashboard, MRI Analysis, Results, History, Research, About, Settings.
- Real registration/login/logout and protected session route using the existing Express/PostgreSQL API.
- MRI upload preview and fully connected **explicitly simulated** result flow for design review.
- Demo history (sessionStorage; per user; metadata only), filters and deletion.
- Research dashboard showing only verified **validation** IID 94.45% and Non-IID 83.91%; no fake test metrics.
- Responsive layout and mobile navigation; Netlify SPA `_redirects`.

## Frontend-only Netlify review (no backend)
To let reviewers open the UI without your local PostgreSQL server, set `VITE_DEMO_MODE=true` in Netlify build environment or `frontend/.env`. Then the landing page shows **Open UI Preview**, and the protected screens use a clearly labeled synthetic `Demo Reviewer`. **This intentionally bypasses authentication for a UI-only review** and must be `false` for real use. Login and Register pages continue to require the real backend. MRI results remain explicitly simulated.

## Critical limitations
- Uploaded MRI images are **not interpreted** by a trained model yet; the fixed scores shown are labeled DEMO, not model outputs.
- FastAPI and PostgreSQL prediction-history tables are NOT implemented in this milestone.
- The PostgreSQL users table and session storage must already exist/configured. Authentication requires the backend running.
- The two-column login theme matches the Stitch design, but is a maintainable React implementation, not an automatically converted byte-for-byte copy of Stitch's standalone HTML.
- Never commit the original backend `.env` containing credentials. Use `.env.example` and replace credentials locally.

## Local setup
1. In `backend`, create a `.env` from `.env.example` using your own database credentials and session secret.
2. Verify PostgreSQL and the existing `users` table. Run `npm install`, then `npm start` (or the start command from backend/package.json).
3. In a second terminal, enter `frontend`, run `npm install`, then `npm run dev`.
4. Open `http://localhost:5173` and test Landing → Register → Login → Dashboard → MRI Analysis → Demo Result → Save → History → Logout.

Vite proxies `/api` to `http://localhost:5000` in local development. `VITE_API_URL` can be set to an absolute HTTPS API prefix when deployed.

## Next milestones
1. Load the trained `.pth` DenseNet121 checkpoint behind an isolated FastAPI inference service.
2. Add authenticated Express prediction endpoints, file validation, and PostgreSQL prediction records.
3. Replace the demo analysis with real inference; keep research screens historical and accurate.
4. Set secure production cookies, CORS and HTTPS hosting; deploy frontend through Netlify.
