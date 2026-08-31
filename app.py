from datetime import date

import altair as alt
import pandas as pd
import streamlit as st

from pt_dashboard.db import execute, init_db, rows

st.set_page_config(page_title="Project Steel", page_icon="⚒️", layout="centered", initial_sidebar_state="collapsed")
init_db()

KG_PER_LB = 0.45359237

st.markdown(
    """
    <style>
    .block-container {max-width:760px; padding-top:.65rem; padding-bottom:4rem;}
    header[data-testid="stHeader"] {background:rgba(11,16,24,.88);}
    #MainMenu {visibility:hidden;}
    footer {visibility:hidden;}
    h1,h2,h3 {letter-spacing:-.02em;}
    .steel-hero {padding:.3rem 0 1rem;}
    .steel-eyebrow {color:#D6A84B;font-size:.75rem;font-weight:800;letter-spacing:.18em;text-transform:uppercase;}
    .steel-logo {font-size:2rem;font-weight:900;line-height:1.05;margin:.2rem 0;color:#F4F6F8;}
    .steel-sub {color:#98A2B3;font-size:.92rem;}
    .steel-card {border:1px solid #293241;background:linear-gradient(145deg,#151C27,#111722);border-radius:18px;padding:1rem;margin:.55rem 0;}
    .steel-card.gold {border-color:#6D562A;background:linear-gradient(145deg,#201A10,#15140F);}
    .steel-label {font-size:.72rem;color:#98A2B3;text-transform:uppercase;letter-spacing:.12em;font-weight:800;}
    .steel-value {font-size:1.55rem;font-weight:850;margin-top:.1rem;color:#F4F6F8;}
    .steel-meta {font-size:.86rem;color:#98A2B3;margin-top:.2rem;}
    .exercise-title {font-size:1.02rem;font-weight:800;color:#F4F6F8;}
    .exercise-meta {font-size:.82rem;color:#98A2B3;margin-bottom:.35rem;}
    [data-testid="stMetric"] {border:1px solid #293241;border-radius:16px;padding:.8rem;background:#151C27;}
    .stButton>button,.stFormSubmitButton>button {min-height:48px;border-radius:12px;font-weight:750;border:1px solid #364152;}
    .stButton>button[kind="primary"],.stFormSubmitButton>button[kind="primary"] {background:#D6A84B;color:#0B1018;border-color:#D6A84B;}
    [data-baseweb="input"] input,[data-baseweb="select"],textarea {font-size:16px !important;}
    div[data-testid="stHorizontalBlock"] {gap:.55rem;}
    .nav-note {color:#667085;font-size:.74rem;text-align:center;margin-top:-.25rem;}
    @media (max-width:640px){
      .block-container{padding:.5rem .7rem 4rem;}
      .steel-logo{font-size:1.75rem;}
      [data-testid="column"]{min-width:0 !important;}
      .stButton>button,.stFormSubmitButton>button{width:100%;}
    }
    </style>
    """,
    unsafe_allow_html=True,
)


def df(sql, params=()):
    return pd.DataFrame(rows(sql, params))


def lb_to_kg(value):
    return None if value is None else round(float(value) * KG_PER_LB, 1)


def kg_to_lb(value):
    return float(value) / KG_PER_LB


def set_page(name, workout=None):
    st.session_state["steel_page"] = name
    if workout is not None:
        st.session_state["selected_workout"] = workout
    st.rerun()


def flash(message):
    st.session_state["steel_flash"] = message
    st.rerun()


active_days = [r["day_name"] for r in rows("SELECT day_name,MIN(id) AS n FROM programme WHERE active=1 GROUP BY day_name ORDER BY n")]
page = st.session_state.get("steel_page", "Home")
if page not in {"Home", "Train", "Plan", "Weight"}:
    page = "Home"

st.markdown(
    """
    <div class="steel-hero">
      <div class="steel-eyebrow">Personal training system</div>
      <div class="steel-logo">PROJECT STEEL</div>
      <div class="steel-sub">Train hard. Log simply. Build steadily.</div>
    </div>
    """,
    unsafe_allow_html=True,
)

nav1, nav2, nav3, nav4 = st.columns(4)
if nav1.button("⌂ Home", use_container_width=True): set_page("Home")
if nav2.button("▶ Train", use_container_width=True): set_page("Train")
if nav3.button("▤ Plan", use_container_width=True): set_page("Plan")
if nav4.button("⚖ Weight", use_container_width=True): set_page("Weight")
st.markdown("<div class='nav-note'>Tap a section to move around Steel</div>", unsafe_allow_html=True)

if msg := st.session_state.pop("steel_flash", None):
    st.success(msg)

if page == "Home":
    latest_weight = rows("SELECT weight_lb FROM checkins WHERE weight_lb IS NOT NULL ORDER BY week_date DESC LIMIT 1")
    total_sessions = rows("SELECT COUNT(*) AS n FROM sessions")[0]["n"]
    cardio_minutes = rows("SELECT COALESCE(SUM(duration_min),0) AS n FROM cardio_logs WHERE activity='Incline treadmill walk'")[0]["n"]

    c1, c2 = st.columns(2)
    with c1:
        st.markdown(f"<div class='steel-card'><div class='steel-label'>Current weight</div><div class='steel-value'>{f'{lb_to_kg(latest_weight[0]["weight_lb"]):.1f} kg' if latest_weight else '—'}</div><div class='steel-meta'>Latest check-in</div></div>", unsafe_allow_html=True)
    with c2:
        st.markdown(f"<div class='steel-card'><div class='steel-label'>Sessions logged</div><div class='steel-value'>{total_sessions}</div><div class='steel-meta'>{cardio_minutes} min incline cardio</div></div>", unsafe_allow_html=True)

    st.markdown("### Choose today’s workout")
    if not active_days:
        st.warning("No active workouts are available.")
    else:
        for idx, day_name in enumerate(active_days[:3], start=1):
            count = rows("SELECT COUNT(*) AS n FROM programme WHERE day_name=? AND active=1", (day_name,))[0]["n"]
            st.markdown(f"<div class='steel-card gold'><div class='steel-label'>Workout {idx}</div><div class='steel-value' style='font-size:1.25rem'>{day_name}</div><div class='steel-meta'>{count} lifts · ~45 min · + 5–10 min incline walk</div></div>", unsafe_allow_html=True)
            if st.button(f"Start {day_name}", key=f"start_{idx}", type="primary", use_container_width=True):
                set_page("Train", day_name)

    last_session = rows("SELECT session_date,day_name,duration_min FROM sessions ORDER BY session_date DESC,id DESC LIMIT 1")
    if last_session:
        s = last_session[0]
        st.markdown("### Last session")
        st.caption(f"{s['day_name']} · {s['session_date']} · {s['duration_min'] or '—'} min")

elif page == "Train":
    st.markdown("## Train")
    if not active_days:
        st.warning("No active workouts are available.")
    else:
        default_day = st.session_state.get("selected_workout", active_days[0])
        if default_day not in active_days:
            default_day = active_days[0]
        selected_day = st.selectbox("Workout", active_days, index=active_days.index(default_day))
        st.session_state["selected_workout"] = selected_day

        plan = rows(
            """SELECT p.id AS programme_id,p.exercise_id,p.sort_order,p.sets,p.rep_target,e.name,e.equipment
               FROM programme p JOIN exercises e ON e.id=p.exercise_id
               WHERE p.day_name=? AND p.active=1 ORDER BY p.sort_order""",
            (selected_day,),
        )

        st.markdown(f"<div class='steel-card gold'><div class='steel-label'>Current session</div><div class='steel-value' style='font-size:1.3rem'>{selected_day}</div><div class='steel-meta'>{len(plan)} exercises · target 45 min lifting</div></div>", unsafe_allow_html=True)

        previous_rows = rows(
            """SELECT e.id AS exercise_id,MAX(l.weight_kg) AS weight_kg,MAX(l.reps) AS reps
               FROM sessions s JOIN set_logs l ON l.session_id=s.id JOIN exercises e ON e.id=l.exercise_id
               WHERE s.id=(SELECT id FROM sessions WHERE day_name=? ORDER BY session_date DESC,id DESC LIMIT 1)
               GROUP BY e.id""",
            (selected_day,),
        )
        previous = {r["exercise_id"]: r for r in previous_rows}

        with st.form("steel_workout_form", clear_on_submit=False):
            session_date = st.date_input("Session date", value=date.today())
            duration = st.number_input("Lifting time (min)", min_value=20, max_value=90, value=45, step=5)
            logged = []
            for ex in plan:
                prev = previous.get(ex["exercise_id"])
                prev_text = f"Last: {prev['weight_kg']:.1f} kg × {prev['reps']}" if prev and prev["weight_kg"] is not None else "No previous log"
                st.markdown(f"<div class='steel-card'><div class='exercise-title'>{ex['sort_order']}. {ex['name']}</div><div class='exercise-meta'>{ex['sets']} sets × {ex['rep_target']} · {ex['equipment']} · {prev_text}</div></div>", unsafe_allow_html=True)
                a, b, c = st.columns([1, 1, .8])
                weight = a.number_input("kg", min_value=0.0, max_value=500.0, step=2.5, value=float(prev["weight_kg"]) if prev and prev["weight_kg"] is not None else 0.0, key=f"kg_{ex['programme_id']}")
                reps = b.number_input("reps", min_value=1, max_value=50, value=int(prev["reps"]) if prev and prev["reps"] else 10, step=1, key=f"rep_{ex['programme_id']}")
                done = c.checkbox("Done", key=f"done_{ex['programme_id']}")
                logged.append((ex, weight, reps, done))

            st.markdown("### Incline finisher")
            st.caption("Medium-intensity treadmill walk after the lifting session.")
            cardio_done = st.checkbox("Log incline cardio", value=True)
            ca, cb, cc = st.columns(3)
            cardio_minutes = ca.number_input("Minutes", min_value=5, max_value=10, value=7, step=1)
            cardio_incline = cb.number_input("Incline %", min_value=1.0, max_value=15.0, value=6.0, step=.5)
            cardio_rpe = cc.number_input("Effort /10", min_value=1.0, max_value=10.0, value=6.0, step=.5)
            notes = st.text_area("Session notes", placeholder="Optional")
            submitted = st.form_submit_button("SAVE SESSION", type="primary", use_container_width=True)

        if submitted:
            session_id = execute("INSERT INTO sessions(session_date,day_name,duration_min,notes) VALUES (?,?,?,?)", (session_date.isoformat(), selected_day, int(duration), notes.strip()))
            set_count = 0
            exercise_count = 0
            for ex, weight, reps, done in logged:
                if done:
                    exercise_count += 1
                    for set_no in range(1, int(ex["sets"]) + 1):
                        execute("INSERT INTO set_logs(session_id,exercise_id,set_no,reps,weight_kg) VALUES (?,?,?,?,?)", (session_id, ex["exercise_id"], set_no, int(reps), float(weight)))
                        set_count += 1
            if cardio_done:
                execute("INSERT INTO cardio_logs(session_id,cardio_date,activity,duration_min,incline_percent,intensity,rpe,notes) VALUES (?,?,?,?,?,?,?,?)", (session_id, session_date.isoformat(), "Incline treadmill walk", int(cardio_minutes), float(cardio_incline), "Medium", float(cardio_rpe), "Project Steel finisher"))
            cardio_text = f" + {int(cardio_minutes)} min incline" if cardio_done else ""
            flash(f"Saved {selected_day}: {exercise_count}/{len(plan)} exercises, {set_count} sets{cardio_text}.")

elif page == "Plan":
    st.markdown("## Your plan")
    st.caption("Six lifts per workout. Changes here affect future sessions only.")
    if not active_days:
        st.warning("No active workouts are available.")
    else:
        selected_day = st.selectbox("Workout", active_days)
        plan = df(
            """SELECT p.id,p.sort_order,e.name AS exercise,e.equipment,p.sets,p.rep_target AS reps
               FROM programme p JOIN exercises e ON e.id=p.exercise_id
               WHERE p.day_name=? AND p.active=1 ORDER BY p.sort_order""",
            (selected_day,),
        )
        for _, r in plan.iterrows():
            st.markdown(f"<div class='steel-card'><div class='exercise-title'>{int(r.sort_order)}. {r.exercise}</div><div class='exercise-meta'>{r.equipment} · {int(r.sets)} sets × {r.reps}</div></div>", unsafe_allow_html=True)

        st.markdown("<div class='steel-card gold'><div class='steel-label'>Finisher</div><div class='steel-value' style='font-size:1.1rem'>Incline treadmill walk</div><div class='steel-meta'>5–10 min · medium intensity · default 6% incline</div></div>", unsafe_allow_html=True)

        with st.expander("Add an exercise"):
            exercise_rows = rows("SELECT id,name,equipment FROM exercises WHERE active=1 ORDER BY name")
            labels = {f"{r['name']} · {r['equipment']}": r["id"] for r in exercise_rows}
            with st.form("add_exercise_form"):
                chosen = st.selectbox("Exercise", list(labels))
                sets = st.number_input("Sets", 1, 6, 3)
                reps = st.text_input("Rep target", "10–12")
                add = st.form_submit_button("Add exercise")
            if add:
                next_order = rows("SELECT COALESCE(MAX(sort_order),0)+1 AS n FROM programme WHERE day_name=?", (selected_day,))[0]["n"]
                execute("INSERT INTO programme(day_name,sort_order,exercise_id,sets,rep_target,superset) VALUES (?,?,?,?,?,?)", (selected_day, next_order, labels[chosen], sets, reps, "X"))
                flash(f"Added {chosen.split(' · ')[0]} to {selected_day}.")

        if not plan.empty:
            with st.expander("Remove an exercise"):
                options = {f"{int(r.sort_order)}. {r.exercise}": int(r.id) for _, r in plan.iterrows()}
                remove_label = st.selectbox("Remove", list(options))
                if st.button("Remove from plan", use_container_width=True):
                    execute("UPDATE programme SET active=0 WHERE id=?", (options[remove_label],))
                    flash(f"Removed {remove_label}.")

elif page == "Weight":
    st.markdown("## Weight check-ins")
    history = df("SELECT week_date,weight_lb FROM checkins WHERE weight_lb IS NOT NULL ORDER BY week_date DESC")
    latest_kg = lb_to_kg(history.iloc[0]["weight_lb"]) if not history.empty else None

    st.markdown(f"<div class='steel-card gold'><div class='steel-label'>Current weight</div><div class='steel-value'>{f'{latest_kg:.1f} kg' if latest_kg is not None else '—'}</div><div class='steel-meta'>Track the trend, not a single day</div></div>", unsafe_allow_html=True)

    with st.form("weight_form"):
        check_date = st.date_input("Check-in date", value=date.today())
        weight_kg = st.number_input("Weight (kg)", min_value=30.0, max_value=300.0, value=float(latest_kg or 90.0), step=.1)
        save = st.form_submit_button("SAVE WEIGHT", type="primary", use_container_width=True)
    if save:
        execute("""INSERT INTO checkins(week_date,weight_lb) VALUES (?,?)
                   ON CONFLICT(week_date) DO UPDATE SET weight_lb=excluded.weight_lb""", (check_date.isoformat(), kg_to_lb(weight_kg)))
        flash(f"Saved {weight_kg:.1f} kg.")

    if not history.empty:
        chart_data = history.copy()
        chart_data["date"] = pd.to_datetime(chart_data["week_date"])
        chart_data["weight_kg"] = chart_data["weight_lb"] * KG_PER_LB
        chart = alt.Chart(chart_data).mark_line(point=True, color="#D6A84B", strokeWidth=3).encode(
            x=alt.X("date:T", title=None),
            y=alt.Y("weight_kg:Q", title="kg", scale=alt.Scale(zero=False)),
            tooltip=[alt.Tooltip("date:T", title="Date", format="%d %b %Y"), alt.Tooltip("weight_kg:Q", title="kg", format=".1f")],
        ).properties(height=260)
        st.altair_chart(chart, use_container_width=True)
        display = chart_data[["week_date", "weight_kg"]].rename(columns={"week_date": "Date", "weight_kg": "Weight (kg)"})
        display["Weight (kg)"] = display["Weight (kg)"].round(1)
        st.dataframe(display, hide_index=True, use_container_width=True)
