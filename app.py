from datetime import date
import pandas as pd
import streamlit as st
from pt_dashboard.config import PAIN_STOP, PAIN_WARNING
from pt_dashboard.db import execute, init_db, rows

st.set_page_config(page_title="Amir's PT Dashboard", page_icon="💪", layout="wide")
init_db()

def dataframe(sql, params=()):
    return pd.DataFrame(rows(sql, params))

def pain_message(value):
    if value >= PAIN_STOP:
        st.error("High pain score: stop the exercise/session and seek appropriate clinical advice, especially for new weakness, numbness, bladder/bowel changes, or saddle numbness.")
    elif value >= PAIN_WARNING:
        st.warning("Symptoms are elevated. Reduce load/range or stop; only continue if symptoms settle and do not worsen later.")

st.title("💪 Amir's PT Dashboard")
st.caption("Phase 1 · pain-aware muscle building · local-first")

profile = rows("SELECT * FROM profile WHERE id=1")[0]
latest = rows("SELECT * FROM checkins ORDER BY week_date DESC LIMIT 1")
c1,c2,c3,c4 = st.columns(4)
c1.metric("Current weight", f"{latest[0]['weight_lb']:.1f} lb" if latest and latest[0]["weight_lb"] else "—", f"Target {profile['target_weight_lb']:.0f} lb")
c2.metric("Weekly sessions", latest[0]["sessions_completed"] if latest else "—", f"Goal {profile['sessions_per_week']}")
c3.metric("Energy", f"{latest[0]['energy']}/10" if latest else "—")
c4.metric("Back pain", f"{latest[0]['back_pain']}/10" if latest else "—")

tabs = st.tabs(["Today", "Plan", "Log workout", "Check-in", "Progress", "Library", "Coach", "Profile"])

with tabs[0]:
    st.subheader("At a glance")
    st.info("Warm up for 5 minutes. Use controlled reps, keep 1–3 reps in reserve, and record symptoms honestly. Comfort during a movement does not guarantee it is appropriate for an undiagnosed condition.")
    plan = dataframe("""SELECT p.day_name,p.superset,e.name,p.sets,p.rep_target FROM programme p JOIN exercises e ON e.id=p.exercise_id WHERE p.active=1 ORDER BY CASE p.day_name WHEN 'Monday · Push + Quads' THEN 1 WHEN 'Wednesday · Pull' THEN 2 WHEN 'Friday · Hybrid' THEN 3 ELSE 4 END,p.sort_order""")
    st.dataframe(plan, hide_index=True, use_container_width=True)

with tabs[1]:
    day = st.selectbox("Training day", [r["day_name"] for r in rows("SELECT DISTINCT day_name FROM programme WHERE active=1 ORDER BY id")])
    plan = dataframe("""SELECT p.superset AS block,e.name AS exercise,p.sets,p.rep_target AS reps,e.guidance FROM programme p JOIN exercises e ON e.id=p.exercise_id WHERE p.day_name=? AND p.active=1 ORDER BY p.sort_order""", (day,))
    st.dataframe(plan, hide_index=True, use_container_width=True)
    st.caption("B1/B2, C1/C2, etc. are supersets. Rest after completing both exercises. Finish with an optional 5–10 minute comfortable walk.")
    with st.expander("Add an exercise to this day"):
        selectable = rows("SELECT id,name FROM exercises WHERE active=1 ORDER BY name")
        select_ids = {r["name"]: r["id"] for r in selectable}
        with st.form("plan_add"):
            selected_exercise = st.selectbox("Exercise", list(select_ids), key="plan_exercise")
            x,y,z = st.columns(3)
            plan_sets = x.number_input("Sets", 1, 10, 3)
            plan_reps = y.text_input("Rep target", "10–12")
            plan_block = z.text_input("Block / superset", "E")
            add_to_plan = st.form_submit_button("Add to programme")
        if add_to_plan:
            next_order = rows("SELECT COALESCE(MAX(sort_order),0)+1 AS n FROM programme WHERE day_name=?", (day,))[0]["n"]
            execute("INSERT INTO programme(day_name,sort_order,exercise_id,sets,rep_target,superset) VALUES (?,?,?,?,?,?)", (day,next_order,select_ids[selected_exercise],plan_sets,plan_reps,plan_block))
            st.success("Added to the programme. Refresh to see it in the table.")

with tabs[2]:
    st.subheader("Log a session")
    exercises = rows("SELECT id,name FROM exercises WHERE active=1 ORDER BY name")
    names = {r["name"]: r["id"] for r in exercises}
    with st.form("session"):
        col1,col2,col3 = st.columns(3)
        session_date = col1.date_input("Date", date.today())
        day_name = col2.selectbox("Session", [r["day_name"] for r in rows("SELECT DISTINCT day_name FROM programme WHERE active=1 ORDER BY id")])
        duration = col3.number_input("Minutes", 1, 180, 45)
        pain_before = col1.slider("Pain before", 0, 10, 0)
        pain_after = col2.slider("Pain after", 0, 10, 0)
        notes = st.text_area("Session notes")
        st.markdown("Add one set at a time (submit again for further sets).")
        exercise = st.selectbox("Exercise", list(names))
        a,b,c,d,e = st.columns(5)
        set_no = a.number_input("Set", 1, 20, 1)
        reps_done = b.number_input("Reps", 0, 100, 10)
        weight = c.number_input("Weight kg", 0.0, 1000.0, 0.0, step=0.5)
        rpe = d.number_input("RPE", 1.0, 10.0, 7.0, step=0.5)
        set_pain = e.slider("Set pain", 0, 10, 0)
        submitted = st.form_submit_button("Save session + set", type="primary")
    if submitted:
        sid = execute("INSERT INTO sessions(session_date,day_name,duration_min,pain_before,pain_after,notes) VALUES (?,?,?,?,?,?)", (session_date.isoformat(),day_name,duration,pain_before,pain_after,notes))
        execute("INSERT INTO set_logs(session_id,exercise_id,set_no,reps,weight_kg,rpe,pain) VALUES (?,?,?,?,?,?,?)", (sid,names[exercise],set_no,reps_done,weight,rpe,set_pain))
        st.success("Saved. You can add another set below to this session.")
        st.session_state["last_session_id"] = sid
        pain_message(max(pain_after,set_pain))
    if "last_session_id" in st.session_state:
        with st.form("more_set"):
            ex2 = st.selectbox("Exercise", list(names), key="more_ex")
            a,b,c,d,e = st.columns(5)
            sn = a.number_input("Set",1,20,2,key="more_set_no")
            rp = b.number_input("Reps",0,100,10,key="more_reps")
            wt = c.number_input("Weight kg",0.0,1000.0,0.0,0.5,key="more_weight")
            rr = d.number_input("RPE",1.0,10.0,7.0,0.5,key="more_rpe")
            pn = e.slider("Set pain",0,10,0,key="more_pain")
            more = st.form_submit_button("Add set")
        if more:
            execute("INSERT INTO set_logs(session_id,exercise_id,set_no,reps,weight_kg,rpe,pain) VALUES (?,?,?,?,?,?,?)", (st.session_state["last_session_id"],names[ex2],sn,rp,wt,rr,pn))
            st.success("Set added.")
            pain_message(pn)

with tabs[3]:
    st.subheader("Weekly check-in")
    with st.form("checkin"):
        a,b,c = st.columns(3)
        week = a.date_input("Week ending", date.today(), key="week")
        weight = b.number_input("Weight (lb)", 0.0, 1000.0, 233.0, 0.1)
        sleep = c.number_input("Average sleep (hours)", 0.0, 24.0, 7.0, 0.1)
        energy = a.slider("Energy", 1, 10, 7)
        steps = b.number_input("Average daily steps", 0, 100000, 6000, 100)
        nutrition = c.slider("Nutrition adherence (%)", 0, 100, 80)
        back = a.slider("Back pain", 0, 10, 0)
        neck = b.slider("Neck pain", 0, 10, 0)
        sessions = c.number_input("Sessions completed", 0, 14, 3)
        wins = st.text_area("Wins")
        problems = st.text_area("Problems / symptom changes")
        check = st.form_submit_button("Save check-in", type="primary")
    if check:
        execute("""INSERT INTO checkins(week_date,weight_lb,sleep_hours,energy,steps,nutrition_adherence,back_pain,neck_pain,sessions_completed,wins,problems) VALUES (?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(week_date) DO UPDATE SET weight_lb=excluded.weight_lb,sleep_hours=excluded.sleep_hours,energy=excluded.energy,steps=excluded.steps,nutrition_adherence=excluded.nutrition_adherence,back_pain=excluded.back_pain,neck_pain=excluded.neck_pain,sessions_completed=excluded.sessions_completed,wins=excluded.wins,problems=excluded.problems""", (week.isoformat(),weight,sleep,energy,steps,nutrition,back,neck,sessions,wins,problems))
        st.success("Check-in saved.")
        pain_message(max(back,neck))

with tabs[4]:
    st.subheader("Progress")
    checks = dataframe("SELECT * FROM checkins ORDER BY week_date")
    if checks.empty:
        st.info("Add a weekly check-in to start the charts.")
    else:
        checks["week_date"] = pd.to_datetime(checks["week_date"])
        left,right = st.columns(2)
        left.line_chart(checks.set_index("week_date")[["weight_lb"]])
        right.line_chart(checks.set_index("week_date")[["back_pain","neck_pain","energy"]])
        st.bar_chart(checks.set_index("week_date")[["steps"]])
    strength = dataframe("""SELECT s.session_date,e.name,MAX(l.weight_kg) AS best_weight_kg,MAX(l.reps) AS best_reps FROM set_logs l JOIN sessions s ON s.id=l.session_id JOIN exercises e ON e.id=l.exercise_id GROUP BY s.session_date,e.name ORDER BY s.session_date""")
    if not strength.empty:
        choice = st.selectbox("Strength history", sorted(strength["name"].unique()))
        st.line_chart(strength[strength["name"]==choice].set_index("session_date")[["best_weight_kg"]])

with tabs[5]:
    st.subheader("Workout library")
    search = st.text_input("Search exercises")
    library = dataframe("SELECT name,muscle_group,equipment,guidance FROM exercises WHERE active=1 AND name LIKE ? ORDER BY muscle_group,name", (f"%{search}%",))
    st.dataframe(library, hide_index=True, use_container_width=True)
    with st.expander("Add an exercise"):
        with st.form("exercise"):
            n = st.text_input("Name")
            mg = st.text_input("Muscle group")
            eq = st.text_input("Equipment")
            gd = st.text_area("Technique / safety guidance")
            add = st.form_submit_button("Add")
        if add and n:
            try:
                execute("INSERT INTO exercises(name,muscle_group,equipment,guidance) VALUES (?,?,?,?)", (n,mg,eq,gd))
                st.success("Exercise added. Refresh to select it in logging.")
            except Exception:
                st.error("That exercise already exists.")

with tabs[6]:
    st.subheader("Coach notes & programme adjustments")
    notes_df = dataframe("SELECT note_date,title,note,adjustments,status FROM coach_notes ORDER BY note_date DESC,id DESC")
    if not notes_df.empty: st.dataframe(notes_df, hide_index=True, use_container_width=True)
    with st.form("coach"):
        nd = st.date_input("Date", date.today(), key="note_date")
        title = st.text_input("Review title", "Weekly review")
        note = st.text_area("Coach observations")
        adjustments = st.text_area("Proposed programme adjustments")
        status = st.selectbox("Status", ["Proposed","Approved","Applied"])
        save_note = st.form_submit_button("Save note")
    if save_note and note:
        execute("INSERT INTO coach_notes(note_date,title,note,adjustments,status) VALUES (?,?,?,?,?)", (nd.isoformat(),title,note,adjustments,status))
        st.success("Coach note saved.")

with tabs[7]:
    st.subheader("Profile & goals")
    with st.form("profile"):
        name = st.text_input("Name", profile["name"])
        age = st.number_input("Age", 16, 100, profile["age"])
        height = st.number_input("Height (cm)", 100.0, 250.0, profile["height_cm"])
        target = st.number_input("Target weight (lb)", 50.0, 1000.0, profile["target_weight_lb"])
        goals = st.text_area("Goals", profile["goals"])
        constraints = st.text_area("Constraints / clinician guidance", profile["constraints_text"])
        save_profile = st.form_submit_button("Save profile")
    if save_profile:
        execute("UPDATE profile SET name=?,age=?,height_cm=?,target_weight_lb=?,goals=?,constraints_text=? WHERE id=1", (name,age,height,target,goals,constraints))
        st.success("Profile saved.")

st.divider()
st.caption("This dashboard is a logging and planning aid, not medical diagnosis or treatment. With possible spinal stenosis/disc issues, knee swelling and a neck sprain, obtain clinician/physio clearance and urgent help for red-flag neurological symptoms.")
