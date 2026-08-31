from datetime import date

import altair as alt
import pandas as pd
import streamlit as st

from pt_dashboard.db import execute, init_db, rows

st.set_page_config(page_title="Project Steel", page_icon="🏋️", layout="wide", initial_sidebar_state="collapsed")
init_db()

st.markdown(
    """
    <style>
      .block-container {max-width: 1050px; padding-top: 1rem; padding-bottom: 3rem;}
      [data-testid="stMetric"] {border:1px solid #dfe5ee; border-radius:16px; padding:.85rem 1rem; background:#fff;}
      .steel-card {border:1px solid #dfe5ee; border-radius:18px; padding:1rem 1.05rem; margin-bottom:.75rem; background:#fff;}
      .steel-kicker {font-size:.78rem; text-transform:uppercase; letter-spacing:.14em; color:#667085; font-weight:700;}
      .steel-title {font-size:1.25rem; font-weight:800; margin:.1rem 0;}
      .steel-muted {color:#667085; font-size:.92rem;}
      .stButton>button, .stFormSubmitButton>button {min-height:44px; border-radius:12px;}
      input, textarea, [data-baseweb="select"] {min-height:44px;}
      @media (max-width: 768px) {
        .block-container {padding: .75rem .7rem 2rem;}
        h1 {font-size:1.8rem !important;}
        [data-testid="stHorizontalBlock"] {flex-wrap:wrap; gap:.5rem;}
        [data-testid="stHorizontalBlock"] > [data-testid="stColumn"] {flex:1 1 100% !important; width:100% !important; min-width:100% !important;}
        .stButton>button, .stFormSubmitButton>button {width:100%;}
      }
    </style>
    """,
    unsafe_allow_html=True,
)

KG_PER_LB = 0.45359237


def lb_to_kg(value):
    return None if value is None else round(float(value) * KG_PER_LB, 1)


def kg_to_lb(value):
    return float(value) / KG_PER_LB


def df(sql, params=()):
    return pd.DataFrame(rows(sql, params))


def flash(message):
    st.session_state["steel_flash"] = message
    st.rerun()


PAGES = ["Dashboard", "Workout", "Plan", "Weight"]
page = st.segmented_control(
    "Navigation",
    PAGES,
    default=st.session_state.get("steel_page", "Dashboard"),
    label_visibility="collapsed",
)
if page is None:
    page = "Dashboard"
st.session_state["steel_page"] = page

st.title("PROJECT STEEL")
st.caption("3 workouts · 6 exercises · ~45 minutes · machine focused")
if msg := st.session_state.pop("steel_flash", None):
    st.success(msg)

active_days = [
    r["day_name"]
    for r in rows(
        "SELECT day_name, MIN(id) first_id FROM programme WHERE active=1 GROUP BY day_name ORDER BY first_id"
    )
]

if page == "Dashboard":
    latest_weight = rows(
        "SELECT week_date, weight_lb FROM checkins WHERE weight_lb IS NOT NULL ORDER BY week_date DESC LIMIT 1"
    )
    total_sessions = rows("SELECT COUNT(*) AS n FROM sessions")[0]["n"]
    last_session = rows(
        "SELECT session_date, day_name, duration_min FROM sessions ORDER BY session_date DESC, id DESC LIMIT 1"
    )

    c1, c2, c3 = st.columns(3)
    c1.metric(
        "Current weight",
        f"{lb_to_kg(latest_weight[0]['weight_lb']):.1f} kg" if latest_weight else "—",
    )
    c2.metric("Workouts logged", total_sessions)
    c3.metric("Session target", "45 min")

    if active_days:
        st.subheader("Your plan")
        cols = st.columns(3)
        for idx, day_name in enumerate(active_days[:3]):
            count = rows(
                "SELECT COUNT(*) AS n FROM programme WHERE day_name=? AND active=1",
                (day_name,),
            )[0]["n"]
            with cols[idx]:
                st.markdown(
                    f"<div class='steel-card'><div class='steel-kicker'>Workout {idx+1}</div><div class='steel-title'>{day_name}</div><div class='steel-muted'>{count} exercises · ~45 min</div></div>",
                    unsafe_allow_html=True,
                )

    st.subheader("Latest activity")
    if last_session:
        s = last_session[0]
        st.info(
            f"Last workout: **{s['day_name']}** on {s['session_date']} · {s['duration_min'] or '—'} min"
        )
    else:
        st.info("No workouts logged yet. Open **Workout** when you’re ready to train.")

    weight_data = df(
        "SELECT week_date, weight_lb FROM checkins WHERE weight_lb IS NOT NULL ORDER BY week_date"
    )
    if not weight_data.empty:
        weight_data["date"] = pd.to_datetime(weight_data["week_date"])
        weight_data["weight_kg"] = weight_data["weight_lb"] * KG_PER_LB
        chart = (
            alt.Chart(weight_data)
            .mark_line(point=True)
            .encode(
                x=alt.X("date:T", title=None),
                y=alt.Y("weight_kg:Q", title="Weight (kg)", scale=alt.Scale(zero=False)),
                tooltip=[
                    alt.Tooltip("date:T", title="Date", format="%d %b %Y"),
                    alt.Tooltip("weight_kg:Q", title="kg", format=".1f"),
                ],
            )
            .properties(height=240)
        )
        st.altair_chart(chart, use_container_width=True)

elif page == "Workout":
    st.subheader("Log workout")
    if not active_days:
        st.warning("No active workouts. Add one in Plan.")
    else:
        selected_day = st.selectbox("Workout", active_days)
        plan = rows(
            """SELECT p.id AS programme_id, p.exercise_id, p.sort_order, p.sets, p.rep_target, e.name, e.equipment
               FROM programme p JOIN exercises e ON e.id=p.exercise_id
               WHERE p.day_name=? AND p.active=1 ORDER BY p.sort_order""",
            (selected_day,),
        )
        st.caption(f"{len(plan)} exercises · aim for roughly 45 minutes")

        with st.form("workout_log"):
            session_date = st.date_input("Date", value=date.today())
            duration = st.number_input(
                "Duration (minutes)", min_value=10, max_value=120, value=45, step=5
            )
            logged_sets = []
            for ex in plan:
                st.markdown(
                    f"**{ex['sort_order']}. {ex['name']}**  ·  {ex['sets']} × {ex['rep_target']}  ·  {ex['equipment']}"
                )
                cols = st.columns([1, 1, 1])
                weight = cols[0].number_input(
                    "Weight kg",
                    min_value=0.0,
                    max_value=500.0,
                    step=2.5,
                    key=f"w_{ex['programme_id']}",
                )
                reps = cols[1].number_input(
                    "Reps",
                    min_value=0,
                    max_value=50,
                    value=10,
                    step=1,
                    key=f"r_{ex['programme_id']}",
                )
                completed = cols[2].checkbox(
                    "Done", value=False, key=f"d_{ex['programme_id']}"
                )
                logged_sets.append((ex, weight, reps, completed))
                st.divider()
            notes = st.text_area(
                "Notes", placeholder="Optional: how did the session feel?"
            )
            submitted = st.form_submit_button("Save workout", type="primary")
        if submitted:
            session_id = execute(
                "INSERT INTO sessions(session_date,day_name,duration_min,notes) VALUES (?,?,?,?)",
                (session_date.isoformat(), selected_day, int(duration), notes.strip()),
            )
            set_count = 0
            for ex, weight, reps, completed in logged_sets:
                if completed:
                    for set_no in range(1, int(ex["sets"]) + 1):
                        execute(
                            "INSERT INTO set_logs(session_id,exercise_id,set_no,reps,weight_kg) VALUES (?,?,?,?,?)",
                            (
                                session_id,
                                ex["exercise_id"],
                                set_no,
                                int(reps),
                                float(weight),
                            ),
                        )
                        set_count += 1
            flash(f"Saved {selected_day}: {set_count} working sets logged.")

        st.markdown("### Last time")
        previous = df(
            """SELECT s.session_date, e.name AS exercise, MAX(l.weight_kg) AS weight_kg, MAX(l.reps) AS reps
               FROM sessions s JOIN set_logs l ON l.session_id=s.id JOIN exercises e ON e.id=l.exercise_id
               WHERE s.day_name=? GROUP BY s.id,e.id ORDER BY s.session_date DESC,s.id DESC""",
            (selected_day,),
        )
        if previous.empty:
            st.caption("No previous session logged for this workout yet.")
        else:
            latest_date = previous.iloc[0]["session_date"]
            st.dataframe(
                previous[previous["session_date"] == latest_date][
                    ["exercise", "weight_kg", "reps"]
                ],
                hide_index=True,
                use_container_width=True,
            )

elif page == "Plan":
    st.subheader("Workout plan")
    st.caption("Edit your three-day split without touching past workout history.")

    selected_day = st.selectbox(
        "Choose workout", active_days if active_days else ["Back + Biceps"]
    )
    plan = df(
        """SELECT p.id, p.sort_order, e.name AS exercise, e.equipment, p.sets, p.rep_target AS reps
           FROM programme p JOIN exercises e ON e.id=p.exercise_id
           WHERE p.day_name=? AND p.active=1 ORDER BY p.sort_order""",
        (selected_day,),
    )
    if not plan.empty:
        st.dataframe(
            plan[["sort_order", "exercise", "equipment", "sets", "reps"]],
            hide_index=True,
            use_container_width=True,
        )

    with st.expander("Swap / add exercise"):
        exercise_rows = rows(
            "SELECT id,name,equipment FROM exercises WHERE active=1 ORDER BY name"
        )
        labels = {f"{r['name']} · {r['equipment']}": r["id"] for r in exercise_rows}
        with st.form("add_exercise"):
            chosen = st.selectbox("Exercise", list(labels))
            sets = st.number_input("Sets", 1, 6, 3)
            reps = st.text_input("Rep target", "10–12")
            add = st.form_submit_button("Add to workout")
        if add:
            next_order = rows(
                "SELECT COALESCE(MAX(sort_order),0)+1 AS n FROM programme WHERE day_name=?",
                (selected_day,),
            )[0]["n"]
            execute(
                "INSERT INTO programme(day_name,sort_order,exercise_id,sets,rep_target,superset) VALUES (?,?,?,?,?,?)",
                (selected_day, next_order, labels[chosen], sets, reps, "X"),
            )
            flash(f"Added {chosen.split(' · ')[0]} to {selected_day}.")

    if not plan.empty:
        with st.expander("Remove exercise"):
            options = {
                f"{int(r.sort_order)}. {r.exercise}": int(r.id)
                for _, r in plan.iterrows()
            }
            remove_label = st.selectbox("Exercise to remove", list(options))
            if st.button("Remove from workout"):
                execute("UPDATE programme SET active=0 WHERE id=?", (options[remove_label],))
                flash(f"Removed {remove_label}.")

elif page == "Weight":
    st.subheader("Weight check-ins")
    history = df(
        "SELECT week_date, weight_lb FROM checkins WHERE weight_lb IS NOT NULL ORDER BY week_date DESC"
    )
    latest_kg = lb_to_kg(history.iloc[0]["weight_lb"]) if not history.empty else None
    st.metric(
        "Current weight", f"{latest_kg:.1f} kg" if latest_kg is not None else "—"
    )

    with st.form("weight_checkin"):
        check_date = st.date_input("Check-in date", value=date.today())
        weight_kg = st.number_input(
            "Weight (kg)",
            min_value=30.0,
            max_value=300.0,
            value=float(latest_kg or 90.0),
            step=0.1,
        )
        save_weight = st.form_submit_button("Save check-in", type="primary")
    if save_weight:
        execute(
            """INSERT INTO checkins(week_date,weight_lb) VALUES (?,?)
               ON CONFLICT(week_date) DO UPDATE SET weight_lb=excluded.weight_lb""",
            (check_date.isoformat(), kg_to_lb(weight_kg)),
        )
        flash(
            f"Saved {weight_kg:.1f} kg for {check_date.strftime('%d %b %Y')}."
        )

    if not history.empty:
        display = history.copy()
        display["Weight (kg)"] = (display["weight_lb"] * KG_PER_LB).round(1)
        display = display.rename(columns={"week_date": "Date"})[
            ["Date", "Weight (kg)"]
        ]
        st.dataframe(display, hide_index=True, use_container_width=True)
