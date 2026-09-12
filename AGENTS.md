# Project Steel — Codex working agreement

## Start every task here

- Before commencing work, state the recommended effort level: **Light** for a focused lookup or small edit, **Standard** for normal implementation or investigation, and **Deep** for broad architecture, multi-system changes, or high-risk verification. Give a one-sentence reason.
- Treat this repository as the canonical Project Steel codebase.
- Read `PROJECT_REGISTER.md`, `ROADMAP.md`, and the relevant Plane work item before changing product behaviour.
- Inspect the current Git branch, working tree, and recent history before editing. Do not overwrite unrelated or uncommitted work.
- Use the globally configured Plane MCP for workspace `project-steel`, project `Project Steel` (`STEEL`). Plane is the operating board; this repository is the implementation and durable decision record.

## Product direction

- Steel is a broader fitness platform. The existing consumer app remains the client layer for Train, Fuel, Recover, and Progress.
- Steel Coach is the first paid platform product, initially for independent personal trainers and small coaching businesses.
- Validate the coach-client relationship with one or two real coaches before building growth, marketplace, gym, white-label, or enterprise layers.
- Preserve client ownership of data, explicit consent, coach-visibility controls, non-diagnostic health boundaries, and truthful product claims.

## Repository map

- `webapp/` — primary React/Vite Steel application and Supabase integration.
- `marketing-site/` — public marketing and beta-signup experience.
- `webapp/supabase/` — database migrations and Edge Functions.
- `pt_dashboard/`, `app.py`, and Python tests — legacy/local Streamlit foundation; do not assume it is the production UI.
- `PROJECT_REGISTER.md` — delivered/active/planned product record.
- `ROADMAP.md` — sequenced delivery plan and release gates.

## Git and delivery rules

- `origin` is `https://github.com/amirramzan786/PT_Dash.git`; `main` is the integration baseline.
- Do not assume a remote `codex/*` branch is merged. Compare it with `origin/main` before reusing or deleting it.
- Use a task-specific branch or Codex worktree for implementation unless the user explicitly asks to work directly on `main`.
- Never commit secrets, local databases, `.env*`, Supabase temporary state, Wrangler caches, or generated build output.
- Do not deploy, merge, publish, change production data, or apply remote migrations without explicit authorization.

## Verification

- For `webapp/` changes, run the smallest relevant test first, then `npm test`, `npm run lint`, and `npm run build` when proportionate to the change.
- For Python changes, run the relevant tests and then `pytest` when proportionate.
- For database changes, review migration safety and RLS implications; distinguish local validation from an applied remote migration.
- Report what was tested, what was not tested, and any remaining deployment or user-verification step.

## Close every task cleanly

- Update the Plane work item with final scope, state, decisions, verification results, and the next action.
- Update `PROJECT_REGISTER.md` or `ROADMAP.md` when a durable product decision or delivery status changed.
- Leave the working tree and branch state explicit for the next task.
