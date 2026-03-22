# Social Energy Calculator 

Decoupled stack: a **Next.js** frontend (`/frontend`) and a **FastAPI** backend (`/backend`). The UI posts activity details to the API; the API will integrate **Perplexity** (scoring) and **Supabase** (profiles, battery state, history).

## Architecture

Request flow (local dev):

1. **Browser** loads the Next.js app on port **3000**.
2. The user submits the form; the **browser** sends `POST /calculate-energy` to **FastAPI** on **8000** (same machine, different port—not “inside” Next.js).
3. **FastAPI** calls **Perplexity** for scoring text and reads/writes **Supabase** for profiles, battery state, and logs.

```text
┌─────────────────┐     POST JSON      ┌─────────────────┐
│  Next.js (UI)   │ ─────────────────► │  FastAPI        │
│  localhost:3000 │ ◄───────────────── │  127.0.0.1:8000 │
└─────────────────┘     JSON response  └────────┬────────┘
                                                │
                        ┌───────────────────────┼───────────────────────┐
                        ▼                       ▼                       ▼
                 Perplexity API            Supabase (Postgres)
                 (HTTP from backend)       (HTTP from backend)
```

| Area | Tech | Purpose |
|------|------|---------|
| Frontend | Next.js, Tailwind, react-three-fiber, drei | UI, 3D battery, calls API |
| Backend | FastAPI, Uvicorn | CORS, AI + DB orchestration |
| Data | Supabase | Profiles, social battery state, calculation logs |

## Prerequisites

- **Node.js** 18+ and **npm** (for the frontend)
- **Python** 3.10+ and **pip** (for the backend)
- Optional: **Supabase** project URL + key when working on DB features (ask the team for project access)

## First-time setup

### Backend

From the repo root:

```bash
cd backend
python3 -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

Create **`backend/.env`** on your machine and paste **real** values there. **Do not put real keys in this README** or commit `.env`—the repo is for structure; secrets stay local (or in your team’s password manager / Discord pin, not in git).

Use **placeholders** in docs; use **real values** only in `backend/.env`:

```env
DATABASE_URL=postgresql://...   # Supabase → Settings → Database (URI)
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000   # optional
DEMO_USER_ID=00000000-0000-4000-8000-000000000001   # optional; predefined user for Phase 1
# Optional later: Perplexity keys, etc.
```

Phase 1 uses a **demo user** id from settings (`get_demo_user_id()` in `app/deps/demo_user.py`) instead of JWT auth.

FastAPI and **Alembic** read `DATABASE_URL` from `backend/.env`. After changing models, run migrations from `backend/`:

```bash
alembic revision --autogenerate -m "describe change"   # after you add SQLAlchemy models
alembic upgrade head
```

If you ever pasted a live key into a tracked file, **rotate it** in the Supabase dashboard and update your local `.env` only.

### Frontend

```bash
cd frontend
npm install
```

No `.env` is required for local dev unless you add one (the app currently calls `http://127.0.0.1:8000` from the browser).

## Running the app (full stack)

Use **two terminals** from the repo root.

**Terminal 1 — FastAPI**

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate   # first time only
pip install -r requirements.txt
cp .env.example .env   # once; set DATABASE_URL from Supabase
alembic upgrade head   # apply migrations (baseline is already in repo; safe to re-run)
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Optional: `python check_supabase.py` (same folder) only tests Postgres without starting the API.

**Terminal 2 — UI**

```bash
cd frontend
npm run dev
```

- **Frontend:** http://localhost:3000  
- **API docs:** http://127.0.0.1:8000/docs  
- **Health:** `GET http://127.0.0.1:8000/health` (checks Supabase Postgres with `SELECT 1`)

If the UI shows network errors when you click **Calculate Drain**, the backend is not running or `POST /calculate-energy` is not implemented yet.

## Where to work

| Role | Start here |
|------|----------------|
| Frontend | `frontend/app/page.tsx` (3D scene, form, `fetch` to the API) |
| Backend | `backend/app/main.py`, `backend/app/core/config.py`, `backend/app/db/`, `backend/app/deps/demo_user.py`, `backend/alembic/` |
| Styles / Tailwind | `frontend/app/globals.css`, Tailwind classes in components |

The default `frontend/README.md` is the stock Next.js blurb; treat **this** file as the project source of truth.

## API contract (frontend ↔ backend)

The UI sends:

```http
POST http://127.0.0.1:8000/calculate-energy
Content-Type: application/json
```

Example body (fields may grow; backend should validate with Pydantic):

```json
{
  "task": "Team dinner after work",
  "personality_type": "Introvert",
  "triggers": "Loud noises",
  "current_battery": 80
}
```

The frontend displays text from the JSON response if present (`message`, `response`, `text`, `result`, `score`, or `output`), otherwise it shows pretty-printed JSON.

Example response shape you can target:

```json
{
  "drain_amount": 15,
  "advice": "Take a 10-minute break before going in."
}
```

**Implemented today:** `GET /` health check and Supabase client initialization in `main.py`.  
**To wire the UI:** add `POST /calculate-energy` in `main.py` (and return JSON the UI can show).

## Database (Supabase)

- **Profiles:** personality types and baseline traits  
- **State:** social battery percentage  
- **Logs:** history of energy calculations  

Ask in the group Discord if you need schema details or access.

## Contributing

1. Pull latest `main` (or your team branch) before starting.  
2. Keep backend secrets in `backend/.env` only.  
3. Run **both** frontend and backend when testing the full flow.  
4. Small, focused commits and PRs are easier to review during the hackathon.

Questions: use the team Discord.
