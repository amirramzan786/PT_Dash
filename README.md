# Amir's PT Dashboard

A local-first Streamlit MVP for a pain-aware three-day gym programme. It includes the seeded workout plan and supersets, exercise library, set logging, weekly check-ins, progress charts, coach reviews and programme adjustments. Data persists in SQLite.

## Run locally

Python 3.11+ is recommended.

```bash
python -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
streamlit run app.py
```

The database is created at `data/pt_dashboard.db`. Back up that file to preserve the log. To use another location, set `PT_DB_PATH` before starting the app.

Run the test suite with:

```bash
python -m pip install -r requirements-dev.txt
pytest
```

## MVP decisions

- SQLite keeps setup simple and needs no paid service.
- The exercise library is seeded in `pt_dashboard/seed.py` and can be extended in the UI.
- Programme and history are separate: changing future programming does not rewrite past logs.
- Proposed coach changes have a status (`Proposed`, `Approved`, `Applied`) so an AI suggestion is not silently treated as an approved programme change.
- Pain alerts are intentionally conservative. The app does not diagnose or replace a clinician.

## 24/7 deployment

[Streamlit Community Cloud does not guarantee persistence of local files](https://docs.streamlit.io/develop/concepts/connections/connecting-to-data), so it is suitable for a demo but its SQLite file must not be the only store for valuable logs. For a reliable deployment, use one of these paths:

1. **Quick demo:** push to a private GitHub repository and deploy `app.py` on Streamlit Community Cloud. Treat the database as disposable.
2. **Recommended personal deployment:** deploy on Render, Railway or Fly.io with a persistent volume mounted for `data/`, or migrate the same tables to managed Postgres.
3. Add authentication before exposing health and progress data publicly. Streamlit's native OIDC or a host-level access gate is preferable to a password embedded in code.

Never commit `.streamlit/secrets.toml` or a populated database.

## Exercise API assessment

The MVP deliberately does not require an exercise API:

- **[wger](https://wger.readthedocs.io/en/stable/)** is the best first integration candidate: open-source, self-hostable, and its REST API exposes public exercise endpoints without authentication. Exercise data is CC-BY-SA, so imported records need attribution/source metadata and share-alike compliance.
- **ExerciseDB-style marketplace APIs** can offer a large catalogue and media, but quotas, changing terms and paid tiers make them a poor foundation for the MVP.
- **[API Ninjas Exercises](https://api-ninjas.com/api/exercises)** is straightforward for search and has a free personal/testing tier, but full-list/pagination, commercial use, and storage rights depend on paid plans. It should remain optional enrichment, not a dependency.

A later importer should copy selected exercises into the local `exercises` table, retain source/licence metadata, and never make an external request during ordinary session logging.

## Safe ChatGPT-assisted updates

ChatGPT should not receive unrestricted database or server access. Safer patterns are:

- Paste or export a weekly summary, ask for review, then copy the response into **Coach notes** as `Proposed`.
- Have an assistant produce a narrowly-scoped JSON/CSV change file that the app validates and previews before you approve it.
- If an API is later added, expose allow-listed operations such as `create_coach_note` and `propose_programme_change`; do not expose arbitrary SQL or filesystem access.
- Keep an audit trail, backups, user confirmation, validation limits, and separate `Proposed` from `Applied` states.

The logical next upgrade is a review screen that exports de-identified check-in/training summaries and imports validated proposals.
