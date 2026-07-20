from pathlib import Path
from pt_dashboard.db import archive_exercise, create_programme_day, init_db, rows, execute, reset_programme_day, restore_exercise

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

def test_exercises_receive_reputable_video_search_links(tmp_path: Path):
    db = tmp_path / "test.db"
    init_db(db)
    linked = rows("SELECT COUNT(*) n FROM exercises WHERE video_url LIKE 'https://www.youtube.com/%'", path=db)[0]["n"]
    total = rows("SELECT COUNT(*) n FROM exercises", path=db)[0]["n"]
    assert linked == total

def test_seeded_workout_can_be_reset_after_removal(tmp_path: Path):
    db = tmp_path / "test.db"
    init_db(db)
    day = "Monday · Push + Quads"
    execute("UPDATE programme SET active=0 WHERE day_name=?", (day,), path=db)
    restored = reset_programme_day(day, path=db)
    assert restored == 6
    active = rows("SELECT COUNT(*) n FROM programme WHERE day_name=? AND active=1", (day,), path=db)[0]["n"]
    assert active == 6

def test_cardio_log_can_be_saved_and_deleted(tmp_path: Path):
    db = tmp_path / "test.db"
    init_db(db)
    cardio_id = execute(
        "INSERT INTO cardio_logs(cardio_date,activity,duration_min,distance_km,intensity) VALUES (?,?,?,?,?)",
        ("2026-01-02", "Incline treadmill walk", 15, 1.2, "Moderate"),
        path=db,
    )
    assert rows("SELECT duration_min FROM cardio_logs WHERE id=?", (cardio_id,), path=db)[0]["duration_min"] == 15
    execute("DELETE FROM cardio_logs WHERE id=?", (cardio_id,), path=db)
    assert rows("SELECT COUNT(*) n FROM cardio_logs", path=db)[0]["n"] == 0

def test_exercise_archive_preserves_history_and_can_be_restored(tmp_path: Path):
    db = tmp_path / "test.db"
    init_db(db)
    exercise = rows("SELECT id FROM exercises WHERE name='Leg Press'", path=db)[0]
    sid = execute("INSERT INTO sessions(session_date,day_name) VALUES (?,?)", ("2026-01-03", "Test"), path=db)
    execute("INSERT INTO set_logs(session_id,exercise_id,set_no,reps) VALUES (?,?,?,?)", (sid,exercise["id"],1,10), path=db)
    archive_exercise(exercise["id"], path=db)
    assert rows("SELECT active FROM exercises WHERE id=?", (exercise["id"],), path=db)[0]["active"] == 0
    assert rows("SELECT COUNT(*) n FROM set_logs WHERE exercise_id=?", (exercise["id"],), path=db)[0]["n"] == 1
    restore_exercise(exercise["id"], path=db)
    assert rows("SELECT active FROM exercises WHERE id=?", (exercise["id"],), path=db)[0]["active"] == 1

def test_custom_workout_resets_to_its_creation_baseline(tmp_path: Path):
    db = tmp_path / "test.db"
    init_db(db)
    exercise_ids = [r["id"] for r in rows("SELECT id FROM exercises ORDER BY id LIMIT 3", path=db)]
    create_programme_day("Custom test", exercise_ids[:2], 3, "10–12", path=db)
    execute("UPDATE programme SET active=0 WHERE day_name=? AND sort_order=1", ("Custom test",), path=db)
    execute(
        "INSERT INTO programme(day_name,sort_order,exercise_id,sets,rep_target,superset) VALUES (?,?,?,?,?,?)",
        ("Custom test",3,exercise_ids[2],2,"15","C"),
        path=db,
    )
    restored = reset_programme_day("Custom test", path=db)
    plan = rows("SELECT sort_order,exercise_id,sets,rep_target,active FROM programme WHERE day_name=? ORDER BY sort_order", ("Custom test",), path=db)
    assert restored == 2
    assert [r["exercise_id"] for r in plan] == exercise_ids[:2]
    assert all(r["active"] == 1 for r in plan)

def test_reset_does_not_restore_globally_archived_exercise(tmp_path: Path):
    db = tmp_path / "test.db"
    init_db(db)
    leg_press = rows("SELECT id FROM exercises WHERE name='Leg Press'", path=db)[0]["id"]
    archive_exercise(leg_press, path=db)
    reset_programme_day("Monday · Push + Quads", path=db)
    assert rows("SELECT active FROM exercises WHERE id=?", (leg_press,), path=db)[0]["active"] == 0
    plan_entry = rows("SELECT active FROM programme WHERE day_name=? AND exercise_id=?", ("Monday · Push + Quads",leg_press), path=db)[0]
    assert plan_entry["active"] == 0

def test_deleting_strength_session_keeps_linked_cardio(tmp_path: Path):
    db = tmp_path / "test.db"
    init_db(db)
    sid = execute("INSERT INTO sessions(session_date,day_name) VALUES (?,?)", ("2026-01-04","Test"), path=db)
    cardio_id = execute(
        "INSERT INTO cardio_logs(session_id,cardio_date,activity,duration_min) VALUES (?,?,?,?)",
        (sid,"2026-01-04","Walking",20),
        path=db,
    )
    execute("DELETE FROM sessions WHERE id=?", (sid,), path=db)
    cardio = rows("SELECT session_id,duration_min FROM cardio_logs WHERE id=?", (cardio_id,), path=db)[0]
    assert cardio["session_id"] is None
    assert cardio["duration_min"] == 20

def test_legacy_custom_baseline_uses_current_active_plan(tmp_path: Path):
    db = tmp_path / "test.db"
    init_db(db)
    exercise_ids = [r["id"] for r in rows("SELECT id FROM exercises ORDER BY id LIMIT 2", path=db)]
    execute(
        "INSERT INTO programme(day_name,sort_order,exercise_id,sets,rep_target,superset,active) VALUES (?,?,?,?,?,?,?)",
        ("Legacy custom",1,exercise_ids[0],3,"10","A",1),
        path=db,
    )
    execute(
        "INSERT INTO programme(day_name,sort_order,exercise_id,sets,rep_target,superset,active) VALUES (?,?,?,?,?,?,?)",
        ("Legacy custom",2,exercise_ids[1],3,"10","B",0),
        path=db,
    )
    init_db(db)
    baseline = rows("SELECT exercise_id FROM programme_baseline WHERE day_name=?", ("Legacy custom",), path=db)
    assert [r["exercise_id"] for r in baseline] == [exercise_ids[0]]

def test_baseline_only_workout_can_be_restored(tmp_path: Path):
    db = tmp_path / "test.db"
    init_db(db)
    exercise_ids = [r["id"] for r in rows("SELECT id FROM exercises ORDER BY id LIMIT 2", path=db)]
    create_programme_day("Baseline only", exercise_ids, 3, "12", path=db)
    execute("DELETE FROM programme WHERE day_name=?", ("Baseline only",), path=db)
    assert reset_programme_day("Baseline only", path=db) == 2
    assert rows("SELECT COUNT(*) n FROM programme WHERE day_name=? AND active=1", ("Baseline only",), path=db)[0]["n"] == 2
