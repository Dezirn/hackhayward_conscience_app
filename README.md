# Conscience — Social Energy Calculator

**Conscience** is an AI-powered social battery calculator built for **HackHayward 2026**. It helps users—especially introverts and neurodivergent individuals—quantify, visualize, and manage their social energy to prevent burnout.

**HackHayward 2026 Team: A-Set**

- Ada
- Sadhvik
- Eljohn
- Tochi

---

## Local setup (Devpost / judges)

**Prerequisites:** Node.js 18+, npm, and Python 3.10+.

### 1. Environment variables

Create **`backend/.env`** (do not commit this file):

```env
DATABASE_URL=your_postgres_connection_string
SUPABASE_JWT_SECRET=your_jwt_secret
SUPABASE_URL=your_supabase_url
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
PERPLEXITY_API_KEY=your_perplexity_api_key
PERPLEXITY_BASE_URL=https://api.perplexity.ai
PERPLEXITY_MODEL=sonar-small-chat
PERPLEXITY_TIMEOUT_SECONDS=30
```

Create **`frontend/.env`**:

```env
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000
```

Use **placeholders** in documentation; put **real values** only in local `.env` files. If a key was ever committed or shared publicly, **rotate** it in the Supabase / Perplexity dashboards.

### 2. Start the backend

In a terminal from the repo root:

```bash
cd backend
python3 -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Database schema (first-time / after pulling migrations)
alembic upgrade head

# API server
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

- **API:** http://127.0.0.1:8000  
- **Interactive docs (OpenAPI):** http://127.0.0.1:8000/docs  
- **Health:** http://127.0.0.1:8000/health  

### 3. Start the frontend

In a **second** terminal:

```bash
cd frontend
npm install
npm run dev
```

The app runs at **http://localhost:3000**.

---

## Architecture & tech stack

Decoupled stack: a **Next.js** frontend (`/frontend`) and a **FastAPI** backend (`/backend`). The UI talks to the API; the API integrates **Perplexity** (scoring / reasoning) and **Supabase** (Postgres: profiles, battery state, history).

**Request flow (local dev):**

1. The **browser** loads the Next.js app on port **3000**.
2. The UI calls the **FastAPI** service on **8000** (JSON over HTTP; not “inside” Next.js).
3. **FastAPI** uses **Perplexity** and reads/writes **Supabase** as needed.

```text
┌─────────────────┐     JSON (HTTP)    ┌─────────────────┐
│  Next.js (UI)   │ ─────────────────► │  FastAPI        │
│  localhost:3000 │ ◄───────────────── │  0.0.0.0:8000   │
└─────────────────┘     JSON response  └────────┬────────┘
                                                │
                        ┌───────────────────────┼───────────────────────┐
                        ▼                       ▼                       ▼
                 Perplexity API            Supabase (Postgres)
                 (HTTP from backend)       (HTTP from backend)
```

| Area | Tech | Purpose |
|------|------|---------|
| Frontend | Next.js, Tailwind, react-three-fiber, drei | UI, 3D battery visualization, API calls |
| Backend | FastAPI, Uvicorn | CORS, AI + DB orchestration |
| Data | Supabase (Postgres) | Profiles, social battery state, calculation logs |

---

## API contract (frontend ↔ backend)

The frontend uses `NEXT_PUBLIC_API_BASE_URL` and calls paths on the FastAPI app. **Authoritative route list:** open **http://127.0.0.1:8000/docs** while the backend is running.

**Example** JSON shapes (illustrative; exact paths and fields are defined in OpenAPI):

```http
POST http://127.0.0.1:8000/calculate-energy
Content-Type: application/json
```

```json
{
  "task": "Team dinner after work",
  "personality_type": "Introvert",
  "triggers": "Loud noises",
  "current_battery": 80
}
```

**Example response shape** you can target:

```json
{
  "drain_amount": 15,
  "advice": "Take a 10-minute break before going in."
}
```

The live app also exposes resources such as `/tasks`, `/battery`, `/recharge`, `/profile`, and `/council`—see `/docs` for request/response models.

---

## Database (Supabase)

- **Profiles:** personality types and baseline traits  
- **State:** social battery percentage  
- **Logs:** history of energy-related events  

Ask your team for schema details or dashboard access if needed.

---

## Where to work

| Role | Start here |
|------|------------|
| Frontend | `frontend/app/` (routes under `(shell)`), `frontend/lib/api.ts` |
| Backend | `backend/app/main.py`, `backend/app/api/routes/`, `backend/app/core/config.py`, `backend/alembic/` |
| Styles / Tailwind | `frontend/app/globals.css`, Tailwind in components |

The stock `frontend/README.md` is the default Next.js blurb; **this file** is the project source of truth.

---

## Contributing

1. Pull the latest `main` (or your team branch) before starting.  
2. Keep secrets in **`backend/.env`** and **`frontend/.env`** only—never commit real keys.  
3. Run **both** frontend and backend when testing the full flow.  
4. Prefer small, focused commits and PRs.

---

## Push the final submission

After local testing, stop servers (**Ctrl+C** in each terminal), then:

```bash
git add README.md
git commit -m "docs: finalize README for Devpost"
git push origin main
```

Adjust the commit message if you are bundling other files: `git add -A` or `git add` specific paths as appropriate.
