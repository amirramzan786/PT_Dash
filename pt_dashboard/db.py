import sqlite3
from contextlib import contextmanager
from datetime import date
from .config import DB_PATH
from .seed import EXERCISES, PLAN, PROFILE

SCHEMA = """
CREATE TABLE IF NOT EXISTS profile (id INTEGER PRIMARY KEY CHECK(id=1), name TEXT, age INTEGER, height_cm REAL, start_weight_lb REAL, target_weight_lb REAL, experience TEXT, sessions_per_week INTEGER, session_minutes INTEGER, goals TEXT, constraints_text TEXT);
CREATE TABLE IF NOT EXISTS exercises (id INTEGER PRIMARY KEY, name TEXT UNIQUE NOT NULL, muscle_group TEXT, equipment TEXT, guidance TEXT, active INTEGER NOT NULL DEFAULT 1);
CREATE TABLE IF NOT EXISTS programme (id INTEGER PRIMARY KEY, day_name TEXT, sort_order INTEGER, exercise_id INTEGER REFERENCES exercises(id), sets INTEGER, rep_target TEXT, superset TEXT, active INTEGER NOT NULL DEFAULT 1);
CREATE TABLE IF NOT EXISTS sessions (id INTEGER PRIMARY KEY, session_date TEXT NOT NULL, day_name TEXT NOT NULL, duration_min INTEGER, pain_before INTEGER, pain_after INTEGER, notes TEXT);
CREATE TABLE IF NOT EXISTS set_logs (id INTEGER PRIMARY KEY, session_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE, exercise_id INTEGER NOT NULL REFERENCES exercises(id), set_no INTEGER, reps INTEGER, weight_kg REAL, rpe REAL, pain INTEGER);
CREATE TABLE IF NOT EXISTS checkins (id INTEGER PRIMARY KEY, week_date TEXT UNIQUE NOT NULL, weight_lb REAL, sleep_hours REAL, energy INTEGER, steps INTEGER, nutrition_adherence INTEGER, back_pain INTEGER, neck_pain INTEGER, sessions_completed INTEGER, wins TEXT, problems TEXT);
CREATE TABLE IF NOT EXISTS coach_notes (id INTEGER PRIMARY KEY, note_date TEXT NOT NULL, title TEXT NOT NULL, note TEXT NOT NULL, adjustments TEXT, status TEXT NOT NULL DEFAULT 'Proposed');
"""

@contextmanager
def connect(path=None):
    db_path = path or DB_PATH
    db_path.parent.mkdir(parents=True, exist_ok=True)
    con = sqlite3.connect(db_path)
    con.row_factory = sqlite3.Row
    con.execute("PRAGMA foreign_keys=ON")
    try:
        yield con
        con.commit()
    finally:
        con.close()

def init_db(path=None):
    with connect(path) as con:
        con.executescript(SCHEMA)
        exercise_columns = {r[1] for r in con.execute("PRAGMA table_info(exercises)")}
        if "video_url" not in exercise_columns:
            con.execute("ALTER TABLE exercises ADD COLUMN video_url TEXT")
        con.execute("""INSERT OR IGNORE INTO profile VALUES (1,?,?,?,?,?,?,?,?,?,?)""", (
            PROFILE["name"], PROFILE["age"], PROFILE["height_cm"], PROFILE["start_weight_lb"], PROFILE["target_weight_lb"], PROFILE["experience"], PROFILE["sessions_per_week"], PROFILE["session_minutes"], PROFILE["goals"], PROFILE["constraints"]
        ))
        con.executemany("INSERT OR IGNORE INTO exercises(name,muscle_group,equipment,guidance) VALUES (?,?,?,?)", EXERCISES)
        core_names = {"Sit-up","Bird Dog","Side Plank","Dead Bug","Glute Bridge","Reverse Crunch","Pallof Press"}
        for exercise in con.execute("SELECT id,name FROM exercises WHERE video_url IS NULL OR video_url='' ").fetchall():
            source = "E3 Rehab" if exercise["name"] in core_names else "Nuffield Health"
            query = f"{source} {exercise['name']} exercise technique".replace(" ", "+")
            con.execute("UPDATE exercises SET video_url=? WHERE id=?", (f"https://www.youtube.com/results?search_query={query}",exercise["id"]))
        if con.execute("SELECT COUNT(*) FROM programme").fetchone()[0] == 0:
            ids = {r["name"]: r["id"] for r in con.execute("SELECT id,name FROM exercises")}
            con.executemany("INSERT INTO programme(day_name,sort_order,exercise_id,sets,rep_target,superset) VALUES (?,?,?,?,?,?)", [(d,o,ids[e],s,r,g) for d,o,e,s,r,g in PLAN])

def rows(sql, params=(), path=None):
    with connect(path) as con:
        return [dict(r) for r in con.execute(sql, params).fetchall()]

def execute(sql, params=(), path=None):
    with connect(path) as con:
        cur = con.execute(sql, params)
        return cur.lastrowid

def today():
    return date.today().isoformat()
