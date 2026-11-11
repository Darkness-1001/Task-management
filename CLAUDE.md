# CLAUDE.md

TaskFlow: a personal task manager built with Node.js, Express 5, EJS and PostgreSQL, deployed on Render. The UI, flash messages, logs and docs are in **Vietnamese**, so keep new user-facing text in Vietnamese.

## Commands

```powershell
npm install          # install deps (Render uses `npm ci`, so keep package-lock.json committed)
npm run db:init      # apply src/db/schema.sql (idempotent)
npm run dev          # node --watch src/app.js, http://localhost:3000
npm start            # production start
npm test             # tests/smoke.js: end-to-end against a RUNNING app
```

- `npm test` needs the app already running, plus `DATABASE_URL` (the test uses it to clean up its data). Set `TEST_BASE_URL` to test a deployed URL.
- There is no linter or build step. Run `node --check <file>` for a quick syntax check.

## Environment (.env, never committed)

| Var | Notes |
|-----|-------|
| `DATABASE_URL` | Required; the app throws at startup if it's missing |
| `SESSION_SECRET` | Required; the app throws at startup if it's missing |
| `NODE_ENV` | `production` turns on PG SSL and secure cookies |
| `DATABASE_SSL` | `true`/`false` overrides the SSL default (set `true` when connecting locally to Render's External URL) |
| `PORT` | Defaults to 3000; Render sets it automatically |

Keep `.env.example` in sync when you add a variable.

## Architecture

- `src/app.js`: Express setup, `/health` (registered before sessions), sessions stored in PG via `connect-pg-simple` (table `session` is auto-created), 404/500 handlers. `trust proxy` is set for Render.
- `src/db/index.js`: shared `pg` Pool. `src/db/schema.sql`: tables `users` and `tasks`. `src/db/init.js`: runs the schema.
- `src/routes/auth.js`: `/register`, `/login`, `/logout` (bcryptjs).
- `src/routes/tasks.js`: mounted at `/tasks`, all routes behind `requireAuth`. It covers CRUD, `PATCH /:id/status`, plus search and filters on the list.
- `src/middleware/`: `auth.js` (`requireAuth`, `requireGuest`) and `locals.js` (`currentUser`, one-shot `flash` from `req.session.flash`).
- `views/`: EJS templates with partials. The board/issue style is Jira-like (board view, list view `?view=list`, issue detail with side panel). View helpers come from `locals.js`: `STATUS_LABELS`, `PRIORITY_LABELS`, `formatDate`, `taskKey` (gives `TF-<id>`), `initials`.
- `public/css/style.css`: all colors are CSS variables on `:root[data-theme="light"|"dark"]`. When you add a color, define it in **both** themes and never hardcode it in a rule.
- `public/js/app.js`: theme toggle (saved in localStorage as `taskflow-theme`; an inline script in `header.ejs` applies it before paint), board drag & drop, user menu, mobile sidebar, auto-submitting `select[data-autosubmit]`.
- `PATCH /tasks/:id/status` returns JSON when the request sends `Accept: application/json` (used by drag & drop). Otherwise it redirects to `redirectTo`, which must start with `/tasks`.
- PUT and DELETE from HTML forms use `method-override` via `?_method=`.

## Rules

- **Ownership:** every task query must filter on `user_id = <session user id>`, so users only ever see their own tasks.
- Always use parameterized queries (`$1`, `$2`, ...) and never build SQL by string concatenation.
- Schema changes go in `schema.sql` and must be idempotent (`IF NOT EXISTS`), because `db:init` runs on every Render start.
- Allowed values: `status` is one of `TODO`, `IN_PROGRESS`, `COMPLETED`. `priority` is one of `LOW`, `MEDIUM`, `HIGH`. If you change these, update the CHECK constraints too.
- Never commit `.env`, passwords or database URLs.

## Deployment (Render)

- `render.yaml` is the Blueprint: web service `taskflow-node-postgres` and database `taskflow-postgres`, both in region singapore on the free plan. Start command: `npm run db:init && npm start`. Health check: `/health`.
- The step-by-step guide (in Vietnamese) is `docs/DEPLOY_RENDER.md`. When you change env vars, commands or `render.yaml`, update both that guide and `README.md`.
