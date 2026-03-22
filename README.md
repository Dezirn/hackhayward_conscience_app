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
| Frontend | Next.js, Tailwind, react-three-fiber, drei | UI, calls API |
| Backend | FastAPI, Uvicorn | CORS, AI + DB orchestration |
| Data | Supabase | Profiles, social battery state, calculation logs |

## Prerequisites

- **Node.js** 18+ and **npm** (for the frontend)
- **Python** 3.10+ and **pip** (for the backend)
- Optional: **Supabase** project URL + key when working on DB features (ask the team for project access)

## First-time setup

After cloning:
Make environment variables in frontend and backend folders with these fields
Backend Folder:
DATABASE_URL
SUPABASE_JWT_SECRET
SUPABASE_URL
CORS_ORIGINS
PERPLEXITY_API_KEY
PERPLEXITY_BASE_URL
PERPLEXITY_MODEL
PERPLEXITY_TIMEOUT_SECONDS

Frontend Folder:
NEXT_PUBLIC_API_BASE_URL

Make a virtual environment in Backend Folder and run:
pip install -r requirements.tx

Go to Front end folder and and run:
npm install

Now run this in Backend to start the server:
uvicorn app.main:app --host 0.0.0.0 --port 8000

Now run this in Frontend to start server:
npm run dev

Make sure that CORS variable matches the frontend server port.


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
