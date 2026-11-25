# SkillSphere

**Connect. Collaborate. Solve.** — turn human knowledge into collective solutions.

SkillSphere is an AI-assisted collaborative problem-solving network. A member publishes a
real problem, the app analyses it, finds related problems and relevant people **with
reasons**, opens a workspace to organise the work, and records the outcome with confirmed
contributions.

The whole product is built around one path:

**Publish a problem → understand it → discover knowledge → find relevant people → collaborate → document the outcome.**

---

## Quick start (zero credentials)

```bash
cd skillsphere
npm install
npm run dev          # http://localhost:3000
```

With no environment variables the app runs on the **local demo backend**: a real SQLite
database (`node:sqlite`, file at `.data/skillsphere.db`) with the same tables as the Supabase
schema, seeded with a coherent demo dataset. It is not a mock: auth, writes, constraints and
queries are real SQL. Every seeded record is flagged `is_demo` and labelled **Demo data** in
the UI.

Demo account (all six seeded accounts use the same password):

| Email | Password |
| --- | --- |
| `ahmed@demo.skillsphere.app` | `SkillSphere123!` |

Other seeded accounts: `omar@`, `mona@`, `sarah@`, `layla@`, `nadir@` `demo.skillsphere.app`.

Demo scenario: **“Improve robot navigation in changing lighting conditions”** — published by
Ahmed, with AI analysis, three related problems, matched contributors (Omar, Nadir, Sarah),
a workspace with tasks and references, discussion, and a separate solved problem
(“Validate a pricing experiment without enough traffic”) that shows a reported outcome and
confirmed contributions.

To reset the demo data, delete `.data/skillsphere.db` and restart.

---

## Stack

- **Next.js 16** (App Router, Server Components, Server Actions) · **React 19** · **TypeScript**
- **Tailwind CSS v4** with a token-based design system (`src/app/globals.css`)
- **Facebook-inspired interface**: fixed white top bar with a centred icon nav and a working search, a three-column layout (shortcuts rail, 614px feed, activity rail) that collapses to a single scrolling column on phones, white cards with soft 8px corners and 1px dividers, Facebook blue `#1877F2` on `#f0f2f5`, and system UI type
- **Collapsible menu**: the panel button beside the logo hides or restores the left rail, and the feed re-centres; the choice is remembered in `localStorage`
- **Rich home feed**: problem stories strip, composer, status filter chips, posts, trending skills, suggested people, latest outcomes with contributors, and per-skill recommendations — every block links to real data
- **shadcn/ui-style components** built on Radix primitives (`src/components/ui`)
- **lucide-react** icons · **Framer Motion** for restrained entrance animation
- **React Hook Form + Zod** for every form and every server action's input
- **Supabase** — Postgres, Auth, Row Level Security (production backend)
- **Google Gemini** — server-side only, via `/api/ai/*`
- Deployable to **Vercel**

---

## How it works

### 1. Problem intelligence (`src/lib/ai`, `src/app/api/ai/*`)

`POST /api/ai/analyze` sends the title/description to Gemini and asks for strict JSON:
main problem, objective, required skills, keywords, category, missing information and
investigation directions. The response is validated with Zod before it is returned; a
malformed response is rejected rather than displayed. `POST /api/ai/refine` suggests a
clearer rewrite.

- The API key is read only on the server (`GEMINI_API_KEY`). It is never sent to the browser.
- 20 AI requests per user per hour (in-memory; per server instance).
- Errors are mapped to plain sentences: missing key (503), rate limit (429), upstream failure.
- The analysis is a **suggestion**: the author can apply the suggested category/skills,
  dismiss it, or accept/edit/reject the refined description before publishing. Nothing is
  published automatically and no findings are invented.
- Without a key the panel says exactly what is missing instead of pretending.

### 2. Related problems (`src/lib/similarity.ts`)

Transparent keyword-level similarity: shared tags (3 pts each), shared required skills (2),
same category (2), and title/description token overlap (Jaccard × 6). Each result lists why
it matched. The UI states that this is not embedding-based semantic search.

### 3. Explainable contributor matching (`src/lib/matching.ts`)

| Signal | Weight |
| --- | --- |
| Required-skill coverage (expertise 1.0, “can help” 0.8, interest 0.55, learning 0.25) | 55 |
| Stated interests matching tags/skills/field | 15 |
| Contribution history on similar problems (same category or shared tag) | 20 |
| Profile relevance (profession/bio in the problem's field) | 10 |

Recommendations show the evidence that produced them (“Has 4 of the 4 required skills: …”,
“Has contributed to 2 similar problems, e.g. …”). Connection counts and popularity are not
part of the score, and no accuracy claims are made.

### 4. Collaboration workspace (problem detail → Workspace)

Owner and confirmed contributors get tasks (assignee, status, progress), shared resources
(validated http/https links), and a contributor roster the owner manages. Everyone else sees
a locked panel plus the public contributor list. The discussion remains public.

### 5. Outcomes and contributions

The owner records an outcome (`solved`, `partially_solved`, `unable_to_verify`) with what
happened, what was attempted, what worked and evidence, then confirms which contributors
participated. The problem status follows the outcome. Confirmed contributions appear on the
contributors' profiles, always labelled as reported by the owner — not independently
verified by SkillSphere.

---

## Backends

`src/lib/data` defines one repository contract with two implementations:

| | Supabase (production) | Local demo |
| --- | --- | --- |
| Selected when | `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set | nothing configured |
| Data | Postgres + RLS | SQLite (`node:sqlite`) |
| Auth | Supabase Auth (email/password) | signed httpOnly session cookie, scrypt password hashes |
| Score | RLS enforced on every query | app-level ownership checks |

The UI and server actions never branch on the backend — they call `repo`.

### Setting up Supabase

1. Create a project at <https://supabase.com>.
2. Open **SQL Editor** and run `supabase/migrations/0001_init.sql` (schema, indexes, triggers,
   RLS policies, storage bucket).
3. Optionally run `supabase/seed.sql` for the same demo dataset. It inserts six demo auth
   users (password `SkillSphere123!`) — demo only, never do this in production.
4. In **Project Settings → API**, copy the project URL and the **anon** key into `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

5. Authentication → Providers → Email is enabled by default. If “Confirm email” is on, a new
   user must confirm before signing in (the app shows that message); for a demo, turning it
   off makes onboarding immediate.
6. Authentication → URL configuration: set the site URL and add
   `http://localhost:3000/**` and your Vercel domain as redirect URLs.

The service-role key is **not used anywhere** — every query runs as the signed-in user.

### Setting up Gemini

1. Create a key in Google AI Studio.
2. Add it to `.env.local` (server-side only, never `NEXT_PUBLIC_`):

```bash
GEMINI_API_KEY=...
GEMINI_MODEL=gemini-2.5-flash   # optional
```

`OPENAI_API_KEY` (+ optional `OPENAI_BASE_URL`, `OPENAI_MODEL`) is supported as a fallback
provider when `GEMINI_API_KEY` is empty; it uses an OpenAI-compatible chat endpoint.

---

## What is implemented

**Entry & accounts**
- Welcome page with Sign up / Sign in / Continue as guest, product explanation, live stats,
  demo-scenario spotlight, original logo + wordmark.
- Real email/password authentication, validation, inline errors, sign out.
- Guest mode: can read problems, discussions, profiles, news; every restricted action shows a
  “nothing was saved” sign-up prompt instead of faking success.
- Profile onboarding (name, optional photo, profession, location, bio, expertise, interests,
  learning goals, where they can help) and later editing.

**Problems**
- Create with title, description, category, help type, tags, required skills, attachment link.
- AI analysis + refinement with accept/edit/reject, card preview, local draft autosave.
- Edit/delete own problems, status control, owner-only enforcement.
- Explore with keyword search, category, status and skill filters that compose; feed on home.
- Detail page: full text, AI analysis, related problems with reasons, matched people with
  evidence, discussion, workspace, outcome, owner actions.
- Comments: create, edit, delete own, mark helpful (persisted per user).
- Friends: discover/search members, public profiles, send, accept, decline, cancel and remove
  connections, privacy setting that limits profiles to connections.
- News: new problems, reported outcomes and announcements, each labelled as platform activity;
  external news is explicitly marked **not available** rather than fabricated.
- Profile: skills by kind, published problems, confirmed contribution history, connection
  count, editing.
- Settings: account info, profile visibility, email/notification preferences (persisted),
  sign out.

**Data & security**
- `supabase/migrations/0001_init.sql`: 12 tables, FKs, checks, indexes (including GIN on
  `tags`/`required_skills`), `updated_at` triggers, auto-profile trigger, storage bucket.
- RLS: public read of public data; owners edit their own problems; authors edit their own
  comments; workspace tables readable only by owner + contributors; contributions writable
  only by the problem owner; connections visible only to participants.
- Server actions validate every input with Zod and re-check ownership service-side.
- AI keys server-only; evidence links restricted to http/https; no raw HTML rendering.

---

## Verification performed

Tested against the running app on the local demo backend:

- `npx tsc --noEmit` — clean; `npm run build` — production build succeeds (all 17 routes).
- Guest: every public route returns 200; restricted actions show the sign-up prompt; locked
  workspace panel for non-members.
- Sign in with the demo account → `/home`; greeting, real stats, feed, explained matches and
  per-skill recommendations render.
- Posted a comment, reloaded, confirmed it persisted (also verified in SQLite).
- Created a task through the workspace, reloaded, confirmed it persisted.
- Created a problem through the form (validation, skill chips, honest “AI not configured”
  notice), landed on its detail page, then recorded an outcome — the solution row was written
  and the problem status changed to solved — then deleted the problem as owner.
- Cleaned up all test records afterwards; the demo dataset is back to its seeded state.
- Facebook-style shell: checked at 1440, 1350 and 390 px that the fixed header, three columns, single-column mobile feed, filter row and cards have no horizontal overflow and that both rails hide below their breakpoints.

**Not tested, and why**

- **Supabase path.** The Supabase project available to this environment is paused, so the
  database refused connections. The schema, RLS, auth and query code are written but could
  not be executed here. Run the migration and the app becomes Supabase-backed immediately.
- **A live Gemini/AI request.** No `GEMINI_API_KEY` was available, so only the
  “not configured” path, input validation and error mapping were verified. Add a key and the
  analyse/refine buttons exercise the real provider.
- No automated test suite (out of scope for this build); verification was manual and by SQL
  inspection.

---

## Known limitations

- **Attachments are links**, not uploads. The migration creates a public `attachments` bucket
  and policies; the UI accepts a URL. Wiring file upload to Storage is the next step.
- **Session refresh.** With Supabase, server components read the cookie session; there is no
  `middleware`/`proxy` token-refresh pass yet, so a session can need a fresh sign-in after the
  access token expires. Add a `@supabase/ssr` middleware refresh before production.
- **Notifications** are stored preferences only. There is no email/push delivery and no in-app
  notification centre, and the UI says so.
- **AI rate limiting** is in-memory per server instance, so serverless scaling makes it
  approximate. Move it to a table or KV for strict limits.
- **Matching and similarity are deterministic heuristics**, not trained models and not
  embedding-based. No accuracy percentages are displayed.
- No realtime collaboration, private messaging, admin tools or external news feed (all listed
  as out of scope, not stubbed).
- Demo avatars are initials gradients; uploaded photos are resized to 256 px in the browser and
  stored on the profile.

---

## Deploying to Vercel

1. Push the project to a Git repository.
2. In Vercel, **Add New → Project**, import it and set the root directory to `skillsphere` if
   the repository has this folder nested.
3. Add environment variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
   `GEMINI_API_KEY`.
4. Deploy (framework preset Next.js, build `npm run build`). No other configuration is needed.
5. Add the deployed domain to Supabase Auth → URL configuration.

---

## Project map

```
skillsphere/
├─ src/app/
│  ├─ page.tsx                    welcome (themed landing, live stats, demo spotlight)
│  ├─ (auth)/sign-in|sign-up      auth routes
│  ├─ onboarding/                 post-signup profile setup
│  ├─ (app)/                      shell + home, problems, friends, news, profile, settings
│  ├─ api/ai/analyze|refine       server-only Gemini endpoints
│  └─ actions/                    server actions (auth, profile, problems, social, workspace)
├─ src/components/                UI, logo, cards, forms, workspace, comments, solution
│  └─ ui/                         shadcn-style primitives
├─ src/lib/
│  ├─ ai/                         provider calls, prompts, Zod validation, rate limit
│  ├─ data/                       repository contract + supabase/ + demo/ implementations
│  ├─ supabase/server.ts          cookie-bound SSR client
│  ├─ matching.ts, similarity.ts  explainable scoring
│  ├─ validation.ts, constants.ts, types.ts, utils.ts
│  └─ auth.ts                     viewer helper
└─ supabase/
   ├─ migrations/0001_init.sql    schema, triggers, RLS, storage
   └─ seed.sql                    demo dataset
```

> This project lives in `skillsphere/`. The workspace root contains an unrelated chat template
> that was left untouched.
