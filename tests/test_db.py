from pathlib import Path
from pt_dashboard.db import init_db, rows, execute

def test_seed_and_logging(tmp_path: Path):
    db = tmp_path / "test.db"
    init_db(db)
    assert rows("SELECT name FROM profile", path=db)[0]["name"] == "Amir"
    assert len(rows("SELECT * FROM programme", path=db)) >= 20
    sid = execute("INSERT INTO sessions(session_date,day_name) VALUES (?,?)", ("2026-01-01","Test"), path=db)
    ex = rows("SELECT id FROM exercises LIMIT 1", path=db)[0]["id"]
    execute("INSERT INTO set_logs(session_id,exercise_id,set_no,reps,weight_kg,rpe,pain) VALUES (?,?,?,?,?,?,?)", (sid,ex,1,10,50,7,0), path=db)
    assert rows("SELECT COUNT(*) n FROM set_logs", path=db)[0]["n"] == 1
    execute("DELETE FROM sessions WHERE id=?", (sid,), path=db)
    assert rows("SELECT COUNT(*) n FROM set_logs", path=db)[0]["n"] == 0

def test_programme_entry_can_be_removed_without_deleting_exercise(tmp_path: Path):
    db = tmp_path / "test.db"
    init_db(db)
    entry = rows("SELECT id,exercise_id FROM programme WHERE active=1 LIMIT 1", path=db)[0]
    execute("UPDATE programme SET active=0 WHERE id=?", (entry["id"],), path=db)
    assert rows("SELECT active FROM programme WHERE id=?", (entry["id"],), path=db)[0]["active"] == 0
    assert rows("SELECT COUNT(*) n FROM exercises WHERE id=?", (entry["exercise_id"],), path=db)[0]["n"] == 1
