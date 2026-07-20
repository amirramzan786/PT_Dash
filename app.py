from datetime import date
import altair as alt
import pandas as pd
import streamlit as st
from packaging.version import Version
from pt_dashboard.config import PAIN_STOP, PAIN_WARNING
from pt_dashboard.db import archive_exercise, create_programme_day, execute, init_db, reset_programme_day, restore_exercise, rows

st.set_page_config(page_title="FORGE", page_icon="⚒️", layout="wide", initial_sidebar_state="collapsed")
init_db()
DATAFRAME_WIDTH = {"width": "stretch"} if Version(st.__version__) >= Version("1.55") else {"use_container_width": True}

st.markdown("""
<style>
/* Comfortable touch targets and responsive navigation. */
button, [role="button"], input, textarea, [data-baseweb="select"] { min-height: 44px; }
[data-testid="stMetric"] {
  border: 1px solid #DCE6F5;
  border-radius: 14px;
  padding: 0.8rem 1rem;
  background: #FFFFFF;
}
@media (max-width: 768px) {
  /* Leave room for Streamlit's fixed mobile toolbar. */
  .block-container { padding: 3.5rem 0.75rem 2rem; }
  h1 { font-size: 1.75rem !important; }
  h2 { font-size: 1.4rem !important; }
  h3 { font-size: 1.15rem !important; }
  /* Streamlit columns become a readable single-column flow on phones. */
  [data-testid="stHorizontalBlock"] { flex-wrap: wrap; gap: 0.5rem; }
  [data-testid="stHorizontalBlock"] > [data-testid="stColumn"] {
    flex: 1 1 100% !important;
    width: 100% !important;
    min-width: 100% !important;
  }
  [data-testid="stMetric"] { padding: 0.6rem; }
  [data-testid="stDataFrame"] { overflow-x: auto; }
  .stButton > button, .stFormSubmitButton > button { width: 100%; }
}
</style>
""", unsafe_allow_html=True)

def dataframe(sql, params=()):
    return pd.DataFrame(rows(sql, params))

def pain_message(value):
    if value >= PAIN_STOP:
        st.error("High pain score: stop the exercise/session and seek appropriate clinical advice, especially for new weakness, numbness, bladder/bowel changes, or saddle numbness.")
    elif value >= PAIN_WARNING:
        st.warning("Symptoms are elevated. Reduce load/range or stop; only continue if symptoms settle and do not worsen later.")

def rerun_with_success(message):
    st.session_state["flash_success"] = message
    st.rerun()

PAGES = ["Overview", "Log workout", "Check-in", "Workouts", "Cardio", "Progress", "Library", "Coach", "Profile"]
PRIMARY_PAGES = ["Overview", "Log workout", "Check-in"]
SECONDARY_PAGES = [page for page in PAGES if page not in PRIMARY_PAGES]

def select_page(page_name):
    def render_page():
        st.session_state["page"] = page_name
    return render_page

page_objects = {
    page: st.Page(
        select_page(page),
        title=page,
        url_path=page.lower().replace(" ", "-"),
        default=page == "Overview",
    )
    for page in PAGES
}
navigation = st.navigation(
    {
        "": [page_objects[page] for page in PRIMARY_PAGES],
        "More": [page_objects[page] for page in SECONDARY_PAGES],
    },
    position="top",
)
navigation.run()
current_page = st.session_state.get("page", "Overview")

st.title("⚒️ FORGE")
st.caption("Train smart · build steadily · stay pain-aware")
if flash_message := st.session_state.pop("flash_success", None):
    st.success(flash_message)
profile = rows("SELECT * FROM profile WHERE id=1")[0]

if current_page == "Overview":
    latest = rows("SELECT * FROM checkins ORDER BY week_date DESC LIMIT 1")
    c1,c2,c3,c4 = st.columns(4)
    c1.metric("Current weight", f"{latest[0]['weight_lb']:.1f} lb" if latest and latest[0]["weight_lb"] else "—", f"Target {profile['target_weight_lb']:.0f} lb")
    c2.metric("Weekly sessions", latest[0]["sessions_completed"] if latest else "—", f"Goal {profile['sessions_per_week']}")
    c3.metric("Energy", f"{latest[0]['energy']}/10" if latest else "—")
    c4.metric("Back pain", f"{latest[0]['back_pain']}/10" if latest else "—")

    st.subheader("Overview")
    st.caption("Your progress, training consistency and latest activity in one place.")

    period = st.selectbox("Weight chart period", ["Last 4 weeks", "Last 8 weeks", "Last 12 weeks", "All time"], index=2)
    period_days = {"Last 4 weeks": 28, "Last 8 weeks": 56, "Last 12 weeks": 84, "All time": None}[period]
    weight_data = dataframe("SELECT week_date,weight_lb FROM checkins WHERE weight_lb IS NOT NULL ORDER BY week_date")
    if not weight_data.empty:
        weight_data["week_date"] = pd.to_datetime(weight_data["week_date"])
        if period_days:
            cutoff = pd.Timestamp.today().normalize() - pd.Timedelta(days=period_days)
            weight_data = weight_data[weight_data["week_date"] >= cutoff]

    history = dataframe("""SELECT s.session_date,COUNT(DISTINCT s.id) AS workouts,COUNT(l.id) AS sets,COALESCE(SUM(l.reps*l.weight_kg),0) AS volume_kg FROM sessions s LEFT JOIN set_logs l ON l.session_id=s.id GROUP BY s.session_date ORDER BY s.session_date""")
    if not history.empty:
        history["session_date"] = pd.to_datetime(history["session_date"])
        history = history[history["session_date"] >= pd.Timestamp.today().normalize() - pd.Timedelta(days=56)]
    cardio_summary = rows("SELECT COUNT(*) AS sessions,COALESCE(SUM(duration_min),0) AS minutes FROM cardio_logs WHERE cardio_date>=date('now','-28 day')")[0]

    chart_left,chart_right = st.columns([3,2])
    with chart_left:
        with st.container(border=True):
            st.markdown("#### Weight trend")
            if weight_data.empty:
                st.info("Add weekly check-ins to build your weight chart.")
            else:
                weight_chart = alt.Chart(weight_data).mark_line(point=True, strokeWidth=3, color="#2F80ED").encode(
                    x=alt.X("week_date:T", title=None, axis=alt.Axis(format="%d %b", labelAngle=0)),
                    y=alt.Y("weight_lb:Q", title="Weight (lb)", scale=alt.Scale(zero=False)),
                    tooltip=[alt.Tooltip("week_date:T", title="Date", format="%d %b %Y"),alt.Tooltip("weight_lb:Q", title="Weight", format=".1f")],
                ).properties(height=250)
                target_rule = alt.Chart(pd.DataFrame({"target":[profile["target_weight_lb"]]})).mark_rule(color="#65B891", strokeDash=[6,4]).encode(y="target:Q")
                st.altair_chart(weight_chart + target_rule, **DATAFRAME_WIDTH)
    with chart_right:
        with st.container(border=True):
            st.markdown("#### Workout tracking")
            st.caption("Sets completed over the last 8 weeks")
            if history.empty:
                st.info("Log a workout to start tracking consistency.")
            else:
                workout_chart = alt.Chart(history).mark_bar(color="#2F80ED", cornerRadiusTopLeft=5, cornerRadiusTopRight=5).encode(
                    x=alt.X("session_date:T", title=None, axis=alt.Axis(format="%d %b", labelAngle=-35)),
                    y=alt.Y("sets:Q", title="Sets"),
                    tooltip=[alt.Tooltip("session_date:T", title="Date", format="%d %b %Y"),"workouts:Q","sets:Q",alt.Tooltip("volume_kg:Q", title="Volume (kg)", format=",.0f")],
                ).properties(height=250)
                st.altair_chart(workout_chart, **DATAFRAME_WIDTH)
            st.caption(f"Cardio · last 4 weeks: {cardio_summary['sessions']} session(s), {cardio_summary['minutes']} minutes")

    activity_left,programme_right = st.columns([3,2])
    with activity_left:
        with st.container(border=True):
            st.markdown("#### Recent workout history")
            recent = dataframe("""SELECT s.session_date AS date,s.day_name AS workout,COUNT(l.id) AS sets,s.duration_min AS minutes,s.pain_after AS pain_after FROM sessions s LEFT JOIN set_logs l ON l.session_id=s.id GROUP BY s.id ORDER BY s.session_date DESC,s.id DESC LIMIT 8""")
            if recent.empty:
                st.info("Your most recent workouts will appear here.")
            else:
                st.dataframe(recent, hide_index=True, **DATAFRAME_WIDTH)
    with programme_right:
        with st.container(border=True):
            st.markdown("#### Current programme")
            programme_summary = dataframe("""SELECT p.day_name AS workout,COUNT(*) AS exercises,SUM(p.sets) AS working_sets FROM programme p WHERE p.active=1 GROUP BY p.day_name ORDER BY MIN(p.id)""")
            st.dataframe(programme_summary, hide_index=True, **DATAFRAME_WIDTH)

    st.info("Use controlled reps, keep 1–3 reps in reserve, and record symptoms honestly. Stop or regress movements that increase back or neck symptoms.")

if current_page == "Workouts":
    st.subheader("Workout manager")
    st.caption("View your plan, make quick exercise changes, or restore a workout without affecting training history.")
    workout_mode = st.radio("Workout tools", ["Manage workouts", "Create workout", "Restore removed"], horizontal=True, label_visibility="collapsed")

    if workout_mode == "Create workout":
        st.markdown("#### Create a workout")
        build_exercises = rows("SELECT id,name FROM exercises WHERE active=1 ORDER BY name")
        build_ids = {r["name"]: r["id"] for r in build_exercises}
        with st.form("create_workout"):
            workout_name = st.text_input("Workout name", placeholder="e.g. Saturday · Arms + Core")
            workout_exercises = st.multiselect("Exercises", list(build_ids))
            b1,b2 = st.columns(2)
            workout_sets = b1.number_input("Default sets", 1, 10, 3)
            workout_reps = b2.text_input("Default rep target", "10–12")
            create_workout = st.form_submit_button("Create workout", type="primary")
        if create_workout:
            clean_name = workout_name.strip()
            if not clean_name:
                st.warning("Give the workout a name.")
            elif not workout_exercises:
                st.warning("Select at least one exercise.")
            else:
                try:
                    create_programme_day(clean_name, [build_ids[name] for name in workout_exercises], workout_sets, workout_reps)
                    rerun_with_success(f"Created {clean_name} with {len(workout_exercises)} exercises. A reset baseline was saved too.")
                except ValueError:
                    st.warning("A workout with that name already exists. Restore it or choose a different name.")

    elif workout_mode == "Restore removed":
        st.markdown("#### Restore a removed workout")
        removed_days = rows("""SELECT b.day_name,MIN(b.id) AS first_id FROM programme_baseline b
                               LEFT JOIN programme p ON p.day_name=b.day_name AND p.active=1
                               GROUP BY b.day_name HAVING COUNT(p.id)=0 ORDER BY first_id""")
        if not removed_days:
            st.info("No workouts are currently removed.")
        else:
            removed_day = st.selectbox("Removed workout", [r["day_name"] for r in removed_days])
            st.caption("Restores the workout from its saved baseline. Past logged sessions are never changed.")
            if st.button("Restore workout", type="primary"):
                restored = reset_programme_day(removed_day)
                if restored:
                    rerun_with_success(f"Restored {removed_day} from its {restored}-exercise baseline. Exercises removed from the library stay removed.")
                else:
                    st.error("No saved reset baseline was found for this workout.")

    else:
        active_days = rows("SELECT day_name,MIN(id) AS first_id FROM programme WHERE active=1 GROUP BY day_name ORDER BY first_id")
        if not active_days:
            st.warning("You have no active workouts. Open ‘Restore removed’ to bring one back, or create a new one.")
        else:
            day = st.selectbox("Workout", [r["day_name"] for r in active_days])
            plan = dataframe("""SELECT p.superset AS block,e.name AS exercise,p.sets,p.rep_target AS reps,e.video_url AS video,e.guidance FROM programme p JOIN exercises e ON e.id=p.exercise_id WHERE p.day_name=? AND p.active=1 ORDER BY p.sort_order""", (day,))
            st.dataframe(plan, hide_index=True, column_config={"video": st.column_config.LinkColumn("Technique video", display_text="Watch")}, **DATAFRAME_WIDTH)
            st.caption("Matching block labels such as B1/B2 are supersets. Rest after completing both exercises.")

            add_column,remove_column = st.columns(2)
            with add_column:
                with st.expander("➕ Add exercise"):
                    selectable = rows("SELECT id,name FROM exercises WHERE active=1 ORDER BY name")
                    select_ids = {r["name"]: r["id"] for r in selectable}
                    with st.form("plan_add"):
                        selected_exercise = st.selectbox("Exercise", list(select_ids), key="plan_exercise")
                        plan_sets = st.number_input("Sets", 1, 10, 3)
                        plan_reps = st.text_input("Rep target", "10–12")
                        plan_block = st.text_input("Block / superset", "E", help="Use matching labels such as B1 and B2 for a superset.")
                        add_to_plan = st.form_submit_button("Add exercise", type="primary")
                    if add_to_plan:
                        next_order = rows("SELECT COALESCE(MAX(sort_order),0)+1 AS n FROM programme WHERE day_name=?", (day,))[0]["n"]
                        execute("INSERT INTO programme(day_name,sort_order,exercise_id,sets,rep_target,superset) VALUES (?,?,?,?,?,?)", (day,next_order,select_ids[selected_exercise],plan_sets,plan_reps,plan_block))
                        rerun_with_success(f"Added {selected_exercise} to {day}.")
            with remove_column:
                with st.expander("➖ Remove exercise"):
                    programme_entries = rows("""SELECT p.id,p.superset,e.name FROM programme p JOIN exercises e ON e.id=p.exercise_id WHERE p.day_name=? AND p.active=1 ORDER BY p.sort_order""", (day,))
                    entry_labels = {f"{r['superset']} · {r['name']}": r["id"] for r in programme_entries}
                    if not entry_labels:
                        st.info("This workout has no active exercises.")
                    else:
                        with st.form("plan_remove"):
                            remove_entry = st.selectbox("Exercise", list(entry_labels))
                            st.caption("This is reversible with Reset workout. Past logs stay intact.")
                            remove_from_plan = st.form_submit_button("Remove exercise")
                        if remove_from_plan:
                            execute("UPDATE programme SET active=0 WHERE id=?", (entry_labels[remove_entry],))
                            rerun_with_success(f"Removed {remove_entry} from {day}.")

            st.markdown("#### Workout actions")
            reset_column,archive_column = st.columns(2)
            with reset_column:
                with st.popover("↻ Reset workout", width="stretch"):
                    st.write("Restore this workout to its saved baseline. Later additions leave the plan, globally removed exercises stay removed, and logged sessions are untouched.")
                    confirm_reset = st.checkbox("I understand the current plan will be replaced.", key=f"confirm_reset_{day}")
                    if st.button("Reset now", type="primary"):
                        if not confirm_reset:
                            st.warning("Tick the confirmation box first.")
                        else:
                            restored = reset_programme_day(day)
                            rerun_with_success(f"Reset {day} from its {restored}-exercise baseline. Exercises removed from the library stayed removed.")
            with archive_column:
                with st.popover("Archive workout", width="stretch"):
                    st.write("Hide this workout from your active programme. It can be restored later and logged history remains intact.")
                    confirm_workout_remove = st.checkbox("Archive this workout", key=f"confirm_workout_remove_{day}")
                    if st.button("Archive workout now"):
                        if not confirm_workout_remove:
                            st.warning("Tick the confirmation box first.")
                        else:
                            execute("UPDATE programme SET active=0 WHERE day_name=?", (day,))
                            rerun_with_success(f"Archived {day}.")

if current_page == "Log workout":
    st.subheader("Log a session")
    with st.expander("Exercise library tools · add, remove or restore"):
        st.caption("Add your own exercise here and it becomes immediately available in the workout logger.")
        add_exercise_column,remove_exercise_column = st.columns(2)
        with add_exercise_column:
            st.markdown("##### Add your own exercise")
            with st.form("quick_add_exercise"):
                quick_name = st.text_input("Exercise name")
                quick_group = st.text_input("Muscle group")
                quick_equipment = st.text_input("Equipment")
                quick_video = st.text_input("Technique video (optional)", placeholder="https://www.youtube.com/watch?v=...")
                quick_guidance = st.text_area("Technique or safety notes")
                quick_add = st.form_submit_button("Add to exercise list", type="primary")
            if quick_add:
                if not quick_name.strip():
                    st.warning("Give the exercise a name.")
                else:
                    try:
                        execute(
                            "INSERT INTO exercises(name,muscle_group,equipment,guidance,video_url) VALUES (?,?,?,?,?)",
                            (quick_name.strip(),quick_group.strip(),quick_equipment.strip(),quick_guidance.strip(),quick_video.strip()),
                        )
                        rerun_with_success(f"Added {quick_name.strip()} to the workout logger.")
                    except Exception:
                        st.warning("An exercise with that name already exists.")
        with remove_exercise_column:
            st.markdown("##### Remove an exercise")
            removable_exercises = rows("SELECT id,name FROM exercises WHERE active=1 ORDER BY name")
            removable_ids = {r["name"]: r["id"] for r in removable_exercises}
            if removable_ids:
                with st.form("quick_archive_exercise"):
                    remove_exercise_name = st.selectbox("Exercise to remove", list(removable_ids))
                    st.caption("It will disappear from the logger and active plans. Past workout records stay intact.")
                    confirm_exercise_remove = st.checkbox("Remove this exercise")
                    remove_exercise = st.form_submit_button("Remove exercise")
                if remove_exercise:
                    if not confirm_exercise_remove:
                        st.warning("Tick the confirmation box first.")
                    else:
                        affected_plans = archive_exercise(removable_ids[remove_exercise_name])
                        rerun_with_success(f"Removed {remove_exercise_name} and archived it from {affected_plans} active plan(s).")
            else:
                st.caption("No active exercises to remove.")

        archived_exercises = rows("SELECT id,name FROM exercises WHERE active=0 ORDER BY name")
        if archived_exercises:
            st.divider()
            archived_ids = {r["name"]: r["id"] for r in archived_exercises}
            restore_name = st.selectbox("Restore a removed exercise", list(archived_ids))
            if st.button("Restore exercise"):
                restore_exercise(archived_ids[restore_name])
                rerun_with_success(f"Restored {restore_name} to the exercise logger. Reset a workout if you also want it back in that plan.")

    exercises = rows("SELECT id,name FROM exercises WHERE active=1 ORDER BY name")
    names = {r["name"]: r["id"] for r in exercises}
    session_days = [r["day_name"] for r in rows("SELECT DISTINCT day_name FROM programme WHERE active=1 ORDER BY id")]
    if not names:
        st.warning("No active exercises are available. Restore one in Exercise library tools before logging.")
        st.stop()
    if not session_days:
        st.warning("No active workouts are available. Restore or create one in Workouts before logging.")
        st.stop()
    with st.form("session"):
        col1,col2,col3 = st.columns(3)
        session_date = col1.date_input("Date", date.today())
        day_name = col2.selectbox("Session", session_days)
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

    st.divider()
    st.subheader("Workout history & corrections")
    recent_sessions = rows("""SELECT s.id,s.session_date,s.day_name,COUNT(l.id) AS set_count FROM sessions s LEFT JOIN set_logs l ON l.session_id=s.id GROUP BY s.id ORDER BY s.session_date DESC,s.id DESC LIMIT 30""")
    if not recent_sessions:
        st.info("No logged workouts yet.")
    else:
        session_labels = {f"{r['session_date']} · {r['day_name']} · {r['set_count']} set(s) · #{r['id']}": r["id"] for r in recent_sessions}
        history_session = st.selectbox("Workout to review", list(session_labels), key="history_session")
        history_session_id = session_labels[history_session]
        logged_sets = rows("""SELECT l.id,e.name,l.set_no,l.reps,l.weight_kg,l.rpe,l.pain FROM set_logs l JOIN exercises e ON e.id=l.exercise_id WHERE l.session_id=? ORDER BY l.id""", (history_session_id,))
        if logged_sets:
            st.dataframe(pd.DataFrame(logged_sets).rename(columns={"name":"exercise","set_no":"set","weight_kg":"weight (kg)"}), hide_index=True, **DATAFRAME_WIDTH)
            set_labels = {f"#{r['id']} · {r['name']} · set {r['set_no']} · {r['reps']} reps @ {r['weight_kg']:g} kg": r["id"] for r in logged_sets}
            with st.expander("Delete an accidental set"):
                with st.form("delete_set"):
                    set_to_delete = st.selectbox("Set", list(set_labels))
                    confirm_set_delete = st.checkbox("Permanently delete this set")
                    delete_set = st.form_submit_button("Delete selected set")
                if delete_set:
                    if not confirm_set_delete:
                        st.warning("Tick the confirmation box before deleting the set.")
                    else:
                        execute("DELETE FROM set_logs WHERE id=? AND session_id=?", (set_labels[set_to_delete],history_session_id))
                        rerun_with_success("Set deleted.")
        else:
            st.caption("This workout contains no sets.")
        with st.expander("Delete this logged workout"):
            with st.form("delete_session"):
                st.warning("This permanently deletes the workout and every set recorded inside it.")
                confirm_session_delete = st.checkbox("Permanently delete this workout and its sets")
                delete_session = st.form_submit_button("Delete whole logged workout")
            if delete_session:
                if not confirm_session_delete:
                    st.warning("Tick the confirmation box before deleting the workout.")
                else:
                    execute("DELETE FROM sessions WHERE id=?", (history_session_id,))
                    if st.session_state.get("last_session_id") == history_session_id:
                        del st.session_state["last_session_id"]
                    rerun_with_success("Workout and its sets deleted.")

if current_page == "Check-in":
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

if current_page == "Cardio":
    st.subheader("Cardio")
    st.caption("Optional tracking for walks, incline treadmill sessions and other low-impact cardio.")
    with st.expander("Log cardio", expanded=True):
        recent_linkable_sessions = rows("SELECT id,session_date,day_name FROM sessions ORDER BY session_date DESC,id DESC LIMIT 20")
        session_options = {"No linked strength workout": None}
        session_options.update({f"{r['session_date']} · {r['day_name']} · #{r['id']}": r["id"] for r in recent_linkable_sessions})
        with st.form("cardio_log"):
            cardio_a,cardio_b,cardio_c = st.columns(3)
            cardio_date = cardio_a.date_input("Date", date.today(), key="cardio_date")
            activity = cardio_b.selectbox("Activity", ["Walking", "Incline treadmill walk", "Bike", "Cross trainer", "Swimming", "Other"])
            duration_min = cardio_c.number_input("Duration (minutes)", 1, 600, 15)
            distance_km = cardio_a.number_input("Distance km (optional)", 0.0, 500.0, 0.0, 0.1)
            incline_percent = cardio_b.number_input("Incline % (optional)", 0.0, 30.0, 0.0, 0.5)
            intensity = cardio_c.selectbox("Intensity", ["Easy", "Moderate", "Hard"])
            avg_heart_rate = cardio_a.number_input("Average heart rate (optional)", 0, 240, 0)
            calories = cardio_b.number_input("Calories (optional)", 0, 5000, 0)
            cardio_rpe = cardio_c.number_input("RPE", 1.0, 10.0, 5.0, 0.5)
            cardio_pain = st.slider("Pain during / after", 0, 10, 0)
            linked_session_label = st.selectbox("Link to a strength workout (optional)", list(session_options))
            cardio_notes = st.text_area("Notes (optional)")
            save_cardio = st.form_submit_button("Save cardio", type="primary")
        if save_cardio:
            execute(
                """INSERT INTO cardio_logs(session_id,cardio_date,activity,duration_min,distance_km,incline_percent,intensity,avg_heart_rate,calories,rpe,pain,notes)
                   VALUES (?,?,?,?,?,?,?,?,?,?,?,?)""",
                (
                    session_options[linked_session_label],cardio_date.isoformat(),activity,duration_min,
                    distance_km or None,incline_percent or None,intensity,avg_heart_rate or None,
                    calories or None,cardio_rpe,cardio_pain,cardio_notes.strip(),
                ),
            )
            st.success("Cardio saved.")
            pain_message(cardio_pain)

    cardio_history = dataframe("""SELECT id,cardio_date AS date,activity,duration_min AS minutes,distance_km AS distance_km,incline_percent AS incline_pct,intensity,rpe,pain,calories FROM cardio_logs ORDER BY cardio_date DESC,id DESC""")
    if cardio_history.empty:
        st.info("No cardio logged yet — this section is completely optional.")
    else:
        cardio_history["date"] = pd.to_datetime(cardio_history["date"])
        cutoff_28 = pd.Timestamp.today().normalize() - pd.Timedelta(days=28)
        recent_cardio = cardio_history[cardio_history["date"] >= cutoff_28]
        cardio_metric_a,cardio_metric_b,cardio_metric_c = st.columns(3)
        cardio_metric_a.metric("Cardio sessions · 4 weeks", len(recent_cardio))
        cardio_metric_b.metric("Minutes · 4 weeks", int(recent_cardio["minutes"].sum()))
        cardio_metric_c.metric("Distance · 4 weeks", f"{recent_cardio['distance_km'].fillna(0).sum():.1f} km")

        weekly_cardio = cardio_history.copy()
        weekly_cardio["week"] = weekly_cardio["date"].dt.to_period("W").apply(lambda period: period.start_time)
        weekly_cardio = weekly_cardio.groupby("week", as_index=False).agg(minutes=("minutes","sum"),sessions=("id","count"))
        cardio_chart = alt.Chart(weekly_cardio).mark_bar(color="#2F80ED", cornerRadiusTopLeft=5, cornerRadiusTopRight=5).encode(
            x=alt.X("week:T", title=None, axis=alt.Axis(format="%d %b", labelAngle=-35)),
            y=alt.Y("minutes:Q", title="Cardio minutes"),
            tooltip=[alt.Tooltip("week:T", title="Week", format="%d %b %Y"),"sessions:Q","minutes:Q"],
        ).properties(height=240)
        st.altair_chart(cardio_chart, **DATAFRAME_WIDTH)
        st.dataframe(cardio_history, hide_index=True, **DATAFRAME_WIDTH)

        with st.expander("Delete an accidental cardio entry"):
            cardio_rows = rows("SELECT id,cardio_date,activity,duration_min FROM cardio_logs ORDER BY cardio_date DESC,id DESC")
            cardio_labels = {f"{r['cardio_date']} · {r['activity']} · {r['duration_min']} min · #{r['id']}": r["id"] for r in cardio_rows}
            with st.form("delete_cardio"):
                cardio_to_delete = st.selectbox("Cardio entry", list(cardio_labels))
                confirm_cardio_delete = st.checkbox("Permanently delete this cardio entry")
                delete_cardio = st.form_submit_button("Delete cardio entry")
            if delete_cardio:
                if not confirm_cardio_delete:
                    st.warning("Tick the confirmation box first.")
                else:
                    execute("DELETE FROM cardio_logs WHERE id=?", (cardio_labels[cardio_to_delete],))
                    rerun_with_success("Cardio entry deleted.")

if current_page == "Progress":
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

if current_page == "Library":
    st.subheader("Workout library")
    st.caption("Your exercise list, safety notes and technique links.")
    search = st.text_input("Search exercises")
    library = dataframe("SELECT name,muscle_group,equipment,video_url AS video,guidance FROM exercises WHERE active=1 AND name LIKE ? ORDER BY muscle_group,name", (f"%{search}%",))
    st.dataframe(library, hide_index=True, column_config={"video": st.column_config.LinkColumn("Technique video", display_text="Watch")}, **DATAFRAME_WIDTH)
    with st.expander("Add an exercise"):
        with st.form("exercise"):
            n = st.text_input("Name")
            mg = st.text_input("Muscle group")
            eq = st.text_input("Equipment")
            video = st.text_input("YouTube technique video (optional)", placeholder="https://www.youtube.com/watch?v=...")
            gd = st.text_area("Technique / safety guidance")
            add = st.form_submit_button("Add")
        if add and n:
            try:
                execute("INSERT INTO exercises(name,muscle_group,equipment,guidance,video_url) VALUES (?,?,?,?,?)", (n,mg,eq,gd,video))
                rerun_with_success("Exercise added.")
            except Exception:
                st.error("That exercise already exists.")
    with st.expander("Remove or restore an exercise"):
        library_active = rows("SELECT id,name FROM exercises WHERE active=1 ORDER BY name")
        library_archived = rows("SELECT id,name FROM exercises WHERE active=0 ORDER BY name")
        library_remove_column,library_restore_column = st.columns(2)
        with library_remove_column:
            st.markdown("##### Remove")
            if library_active:
                library_active_ids = {r["name"]: r["id"] for r in library_active}
                with st.form("library_remove"):
                    library_remove_name = st.selectbox("Active exercise", list(library_active_ids))
                    library_remove_confirm = st.checkbox("Remove from logger and active plans")
                    library_remove = st.form_submit_button("Remove exercise")
                if library_remove:
                    if not library_remove_confirm:
                        st.warning("Tick the confirmation box first.")
                    else:
                        archive_exercise(library_active_ids[library_remove_name])
                        rerun_with_success(f"Removed {library_remove_name}. Past logs were kept.")
            else:
                st.caption("No active exercises.")
        with library_restore_column:
            st.markdown("##### Restore")
            if library_archived:
                library_archived_ids = {r["name"]: r["id"] for r in library_archived}
                library_restore_name = st.selectbox("Removed exercise", list(library_archived_ids))
                if st.button("Restore to logger", key="library_restore"):
                    restore_exercise(library_archived_ids[library_restore_name])
                    rerun_with_success(f"Restored {library_restore_name}.")
            else:
                st.caption("No removed exercises.")

if current_page == "Coach":
    st.subheader("Coach notes & programme adjustments")
    notes_df = dataframe("SELECT note_date,title,note,adjustments,status FROM coach_notes ORDER BY note_date DESC,id DESC")
    if not notes_df.empty: st.dataframe(notes_df, hide_index=True, **DATAFRAME_WIDTH)
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

if current_page == "Profile":
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
