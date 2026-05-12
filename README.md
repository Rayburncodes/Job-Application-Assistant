# Job Agent (Job Application Assistant)

**Repository:** [github.com/Rayburncodes/JobAgent](https://github.com/Rayburncodes/JobAgent.git)

Job Agent is a full-stack **Next.js 14** web application for people who want to move faster on real job applications without outsourcing their judgment. It combines a **structured professional profile**, **job tracking**, **resume-vs-role analysis**, and **LLM-assisted drafting** of application answers. Data lives in **PostgreSQL** via **Prisma**; AI calls go through **Cloudflare Workers AI** (not a generic “chat in the browser” product—each feature has a defined API contract and prompts).

---

## What this project does (end-to-end)

### 1. Account, session, and profile (the hub)

- Users **register** with username, password, name, and email, or **log in** with username or email plus password.
- Successful auth sets an **HTTP-only, signed JWT** session cookie (`job-assistant-token`, implemented with [`jose`](https://github.com/panva/jose)) so the browser never stores raw credentials.
- The **Dashboard** is the control center: authentication, **profile editing**, and the **“Jobs applied”** view.
- The profile stores everything downstream features need:
  - **Work history** and **skills** as structured JSON (validated on update).
  - Optional **LinkedIn** and **GitHub** URLs (parsed and normalized server-side).
  - **Resume text** and/or a **PDF resume** (PDFs are stored in the database, text is extracted server-side for analysis and “load saved resume” in the UI).

Passwords are hashed with **bcryptjs** before storage. Production deployments **must** set a strong `AUTH_SECRET` (see [Environment variables](#environment-variables)); development can fall back with a console warning.

### 2. Onboarding (search preferences)

The **Onboarding** section is a **five-step wizard** that walks through:

- Values (up to three): growth, balance, compensation, impact, autonomy, culture, learning, stability.
- Target **roles** (searchable lists by category).
- **Locations** (preset list plus custom locations).
- **Seniority** band (intern through director+).
- **Minimum salary** floor (USD, full-time), via slider.

This flow is **UX-focused** in the current codebase: it helps you think through constraints before you use the rest of the app. Persisted hiring data for AI features comes from the **profile**, **resume**, and **job descriptions** you supply elsewhere—not from a separate “onboarding” database record.

### 3. Open jobs vs jobs applied (pipeline)

Job Agent models each opportunity as an **`Application`** row with:

- Job title, company, full job description text (large limit for pasted postings).
- Optional **`applyUrl`**: validated `http`/`https` link to the employer’s application page.
- **`status`** (see [Application statuses](#application-statuses)) and **`appliedAt`** timestamp.

The UI splits this into two buckets:

| UI area        | API filter                         | Typical use |
|----------------|-------------------------------------|-------------|
| **Open jobs**  | `status === NOT_SUBMITTED`        | Roles you are considering; add posting + link, filter by keyword or `Location:` line in text. |
| **Jobs applied** | `status !== NOT_SUBMITTED`    | After you submit, log or update the row; track funnel to offer/reject. |

You can create rows from the “applied” form or promote an open job by editing status. Descriptions can include a machine-friendly **`Location:`** first line for location filtering on open jobs.

### 4. Resume Analyzer (ATS-style, profile-aware)

The **Resume Analyzer** accepts **pasted resume text** or **imported text**, plus a **pasted job description**. It can pull **saved resume text** from the profile (including text extracted from your uploaded PDF).

The client calls `POST /api/resume/analyze`. The server:

1. Verifies the **session** and that the `userId` in the body matches the session (no cross-user analysis).
2. Loads the user from Prisma and builds a context block: name, email, social links, `workHistory`, `skills`.
3. Calls **Cloudflare Workers AI** with a strict system prompt requiring **only JSON** with:
   - `matchScore` (0–100)
   - `strengths`, `gaps`, `suggestions` (string arrays)
4. Parses and validates that shape; returns structured JSON to the UI for score styling and lists.

**Intent:** same *kind* of feedback you get from keyword/ATS checkers—strengths, gaps, and concrete edits—while grounding the model in **your real profile JSON**, not a generic resume template.

The UI lets you thumbs-up/down individual **suggestions**; that sends **`POST /api/feedback`** for product-quality tracking (`featureUsed: resume_analyzer_suggestion`).

### 5. Answer Generator (tailored application Q&A)

The **Answer Generator** takes a **job description** and a **question** (preset prompts like “Why are you a good fit?” or a **custom** question). It calls `POST /api/generate/answer` with the same session / `userId` ownership checks as resume analysis.

The model is instructed to:

- Stay **truthful** (no invented employers, degrees, or wins).
- Align tone with the role and use **work history** and **skills** from the profile.
- Return **plain text only** (no markdown fences, no “Here is your answer” preamble).

The UI supports **copy to clipboard** and **feedback** on the full Q&A pair (`featureUsed: tailored_answer`).

### 6. Feedback API

`POST /api/feedback` stores rows in the **`Feedback`** table: `featureUsed`, integer `rating`, optional `comment`, and optional linkage to `userId` and/or `applicationId` (with ownership checks when both are present). This is separate from “chat history”; it is **structured product feedback** for tuning prompts and UX.

### 7. Health check

`GET /api/status` returns a simple JSON `{ status, timestamp }` for uptime or load-balancer probes.

---

## Tech stack

| Layer | Choice |
|--------|--------|
| Framework | **Next.js 14** (App Router), **React 18**, **TypeScript** |
| Styling | **Tailwind CSS** |
| Database | **PostgreSQL 16** (Docker Compose provided) |
| ORM | **Prisma 5** with migrations |
| Auth | **Cookie JWT** (`jose`), **bcryptjs** passwords |
| AI | **Cloudflare Workers AI** (`CF_ACCOUNT_ID`, `CF_AI_TOKEN`, optional `CF_AI_MODEL`) |
| PDF | Server-side text extraction for uploaded resumes |

---

## Repository layout (high level)

```
app/                 # App Router pages and API routes (route handlers)
components/          # Client UI: shell, panels, onboarding, resume, answers
contexts/            # React context (e.g. user profile after session load)
lib/                 # Auth, Prisma client, PDF extract, validation, logging
prisma/              # schema.prisma and SQL migrations
docker-compose.yml   # Local PostgreSQL service
```

API routes under `app/api/` include auth (`login`, `register`, `logout`, `me`), `users/me` (profile PATCH), `users/me/resume` (PDF upload/delete/fetch), `users/me/applications` (+ per-id updates), `resume/analyze`, `generate/answer`, `feedback`, and `status`.

---

## Data model (Prisma)

### `User`

- Identity: `username` (unique), `passwordHash`, `name`, `email` (unique).
- Profile: `linkedinUrl`, `githubUrl`, `resumeText`, `resumePdf` (binary), `workHistory` (JSON), `skills` (JSON).
- Relations: `applications[]`, `feedback[]`.

### `Application`

- Belongs to a user; stores title, company, long `jobDescription`, optional `applyUrl`, `status`, `appliedAt`.

### `Feedback`

- Optional links to `User` and/or `Application`; `featureUsed`, `rating`, optional `comment`.

### Application statuses

`NOT_SUBMITTED` · `SUBMITTED` · `RECEIVED_RESPONSE` · `INTERVIEW_REQUESTED` · `ONSITE_REQUESTED` · `REJECTED` · `OFFER`

Open jobs use **`NOT_SUBMITTED`**; everything else is treated as the applied pipeline in list APIs.

---

## Environment variables

Copy `.env.example` to `.env` and set:

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string for Prisma |
| `CF_ACCOUNT_ID` | Cloudflare account ID for Workers AI |
| `CF_AI_TOKEN` | Cloudflare API token with Workers AI access |
| `CF_AI_MODEL` | Optional; defaults to `@cf/meta/llama-3.1-8b-instruct` |
| `AUTH_SECRET` | **≥16 characters** in production; signs session JWTs |

Without Cloudflare variables, **resume analysis** and **answer generation** return a clear server error (AI not configured). The rest of the app (auth, CRUD, PDF upload) still depends on the database.

---

## Getting started

### Prerequisites

- **Node.js** (LTS recommended) and npm  
- **Docker** (optional but recommended for local Postgres)

### Install and database

```bash
npm install
cp .env.example .env
# Edit .env: DATABASE_URL, AUTH_SECRET, and Cloudflare AI vars if you use those features
```

Start PostgreSQL (from a checkout that includes `docker-compose.yml` at this app root):

```bash
docker compose up -d
```

Run migrations (development):

```bash
npm run db:migrate
```

### Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) (or the port shown in the terminal).

### Other scripts

| Script | Meaning |
|--------|---------|
| `npm run build` | `prisma generate` + production Next build |
| `npm run start` | Run production server after build |
| `npm run lint` | ESLint |
| `npm run db:studio` | Prisma Studio (inspect/edit data) |

### Monorepo-style parent folder (optional)

If your checkout wraps this app in a `job-assistant/` directory with a **parent** `package.json`, the parent may expose shortcuts such as `npm run dev` with `--prefix job-assistant` and `npm run docker:up` pointing at this `docker-compose.yml`. In that case, prefer the parent README or scripts for exact commands.

---

## Security and privacy notes

- **Sessions** are httpOnly cookies; use **HTTPS** in production (`secure` cookie flag follows `NODE_ENV`).
- **Resume PDFs** are stored in the database; treat database backups as sensitive.
- **AI requests** send job text and profile-derived context to **Cloudflare**; review Cloudflare’s terms and your org’s data policy before pasting confidential postings.
- APIs enforce **session user id** match on mutating and AI routes so one user cannot drive another’s `userId`.

---

## Limitations and honest scope

- The app does **not** scrape job boards or auto-apply; you paste descriptions and links yourself.
- **Onboarding** preferences are not persisted as a separate server-side profile object; hiring-related AI context is driven by **user profile JSON**, **resume**, and **your inputs** per request.
- LLM output can be wrong or generic; the product is positioned as **drafting assistance**, not a guarantee of interviews or offers.

---

## Contributing and git attribution

This repository is maintained by **[Rayburncodes](https://github.com/Rayburncodes)**. There is **no** “Contributors” section here listing automated tooling as a project author.

If you use **Cursor** (or similar) and want **only your GitHub account** to appear on the repository’s contributor insights for commits you make:

1. In **Cursor Settings → Agent**, disable options that add **Co-authored-by** / **Made with Cursor** style attribution to commits, so those commits remain solely yours. See [Cursor’s Git integration docs](https://cursor.com/docs/integrations/git) for current options.
2. Commit from a shell or Git UI with **`user.name` and `user.email`** set to **your** identity (`git config user.name` / `user.email`), not a bot account.

The README cannot retroactively change GitHub’s contributor graph; fixing historical commits requires rewriting Git history (only do that with care on shared repos).
