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
    #MainMenu, footer {visibility:hidden;}
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
    .exercise-title {font-size:1.08rem;font-weight:800;color:#F4F6F8;}
    .exercise-meta {font-size:.82rem;color:#98A2B3;margin-top:.2rem;}
    .progress-track {height:8px;border-radius:999px;background:#202938;overflow:hidden;margin:.3rem 0 .9rem;}
    .progress-fill {height:100%;background:#D6A84B;border-radius:999px;}
    .step-chip {display:inline-block;border:1px solid #6D562A;background:#201A10;color:#E6C878;border-radius:999px;padding:.32rem .65rem;font-size:.78rem;font-weight:800;margin-bottom:.45rem;}
    .summary-row {display:flex;justify-content:space-between;gap:1rem;padding:.55rem 0;border-bottom:1px solid #293241;color:#D9DEE7;}
    .stButton>button,.stFormSubmitButton>button {min-height:46px;border-radius:12px;font-weight:750;border:1px solid #364152;}
    .stButton>button[kind="primary"],.stFormSubmitButton>button[kind="primary"] {background:#D6A84B;color:#0B1018;border-color:#D6A84B;}
    [data-baseweb="input"] input,[data-baseweb="select"],textarea {font-size:16px !important;}
    div[data-testid="stHorizontalBlock"] {gap:.45rem;}
    .nav-note {color:#667085;font-size:.74rem;text-align:center;margin-top:-.25rem;}
    @media (max-width:640px){
      .block-container{padding:.5rem .7rem 4rem;}
      .steel-logo{font-size:1.75rem;}
      [data-testid="column"]{min-width:0 !important;}
      .stButton>button,.stFormSubmitButton>button{font-size:.84rem;}
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


def clear_draft():
    for key in list(st.session_state.keys()):
        if key.startswith("draft_") or key in {"workout_step", "selected_workout"}:
            del st.session_state[key]


def start_draft(day_name):
    clear_draft()
    st.session_state["draft_day"] = day_name
    st.session_state["selected_workout"] = day_name
    st.session_state["workout_step"] = 0
    st.session_state["draft_removed_exercises"] = []
    st.session_state["draft_removed_sets"] = {}


def exercise_previous_sets(day_name, exercise_id):
    latest = rows(
        "SELECT id FROM sessions WHERE day_name=? ORDER BY session_date DESC,id DESC LIMIT 1",
        (day_name,),
    )
    if not latest:
        return []
    return rows(
        "SELECT set_no,reps,weight_kg FROM set_logs WHERE session_id=? AND exercise_id=? ORDER BY set_no",
        (latest[0]["id"], exercise_id),
    )


def draft_removed_exercises():
    return set(st.session_state.get("draft_removed_exercises", []))


def set_removed(programme_id):
    removed = st.session_state.setdefault("draft_removed_sets", {})
    return set(removed.get(str(programme_id), []))


def remove_set(programme_id, set_no):
    removed = st.session_state.setdefault("draft_removed_sets", {})
    key = str(programme_id)
    values = set(removed.get(key, []))
    values.add(int(set_no))
    removed[key] = sorted(values)
    st.session_state["draft_removed_sets"] = removed


def restore_set(programme_id, set_no):
    removed = st.session_state.setdefault("draft_removed_sets", {})
    key = str(programme_id)
    values = set(removed.get(key, []))
    values.discard(int(set_no))
    removed[key] = sorted(values)
    st.session_state["draft_removed_sets"] = removed


def complete_set(programme_id, set_no):
    st.session_state[f"draft_d_{programme_id}_{set_no}"] = True


def uncomplete_set(programme_id, set_no):
    st.session_state[f"draft_d_{programme_id}_{set_no}"] = False


active_days = [
    r["day_name"]
    for r in rows("SELECT day_name,MIN(id) AS n FROM programme WHERE active=1 GROUP BY day_name ORDER BY n")
]

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
if nav1.button("⌂ Home", use_container_width=True):
    set_page("Home")
if nav2.button("▶ Train", use_container_width=True):
    set_page("Train")
if nav3.button("▤ Plan", use_container_width=True):
    set_page("Plan")
if nav4.button("⚖ Weight", use_container_width=True):
    set_page("Weight")
st.markdown("<div class='nav-note'>Tap a section to move around Steel</div>", unsafe_allow_html=True)

if msg := st.session_state.pop("steel_flash", None):
    st.success(msg)

if page == "Home":
    latest_weight = rows("SELECT weight_lb FROM checkins WHERE weight_lb IS NOT NULL ORDER BY week_date DESC LIMIT 1")
    total_sessions = rows("SELECT COUNT(*) AS n FROM sessions")[0]["n"]
    cardio_minutes = rows("SELECT COALESCE(SUM(duration_min),0) AS n FROM cardio_logs WHERE activity='Incline treadmill walk'")[0]["n"]
    current_weight_text = "—"
    if latest_weight:
        current_weight_text = f"{lb_to_kg(latest_weight[0]['weight_lb']):.1f} kg"

    c1, c2 = st.columns(2)
    with c1:
        st.markdown(
            f"<div class='steel-card'><div class='steel-label'>Current weight</div><div class='steel-value'>{current_weight_text}</div><div class='steel-meta'>Latest check-in</div></div>",
            unsafe_allow_html=True,
        )
    with c2:
        st.markdown(
            f"<div class='steel-card'><div class='steel-label'>Sessions logged</div><div class='steel-value'>{total_sessions}</div><div class='steel-meta'>{cardio_minutes} min incline cardio</div></div>",
            unsafe_allow_html=True,
        )

    st.markdown("### Choose today’s workout")
    if not active_days:
        st.warning("No active workouts are available.")
    else:
        for idx, day_name in enumerate(active_days[:3], start=1):
            count = rows("SELECT COUNT(*) AS n FROM programme WHERE day_name=? AND active=1", (day_name,))[0]["n"]
            st.markdown(
                f"<div class='steel-card gold'><div class='steel-label'>Workout {idx}</div><div class='steel-value' style='font-size:1.25rem'>{day_name}</div><div class='steel-meta'>{count} lifts · ~45 min · + 5–10 min incline walk</div></div>",
                unsafe_allow_html=True,
            )
            if st.button(f"Start {day_name}", key=f"start_{idx}", type="primary", use_container_width=True):
                start_draft(day_name)
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

        if st.session_state.get("draft_day") != selected_day:
            start_draft(selected_day)
        st.session_state["selected_workout"] = selected_day

        base_plan = rows(
            """SELECT p.id AS programme_id,p.exercise_id,p.sort_order,p.sets,p.rep_target,e.name,e.equipment
               FROM programme p JOIN exercises e ON e.id=p.exercise_id
               WHERE p.day_name=? AND p.active=1 ORDER BY p.sort_order""",
            (selected_day,),
        )
        removed_exercises = draft_removed_exercises()
        plan = [p for p in base_plan if p["programme_id"] not in removed_exercises]

        if not plan:
            st.warning("You removed every exercise from this session. Restore one below or go to the finisher.")
            removed_lookup = {p["programme_id"]: p for p in base_plan}
            for pid in sorted(removed_exercises):
                p = removed_lookup.get(pid)
                if p and st.button(f"Restore {p['name']}", key=f"restore_ex_{pid}"):
                    vals = set(st.session_state.get("draft_removed_exercises", []))
                    vals.discard(pid)
                    st.session_state["draft_removed_exercises"] = sorted(vals)
                    st.rerun()
            if st.button("Go to finisher →", type="primary"):
                st.session_state["workout_step"] = 0
                st.session_state["force_finisher"] = True
                st.rerun()
        else:
            total_steps = len(plan) + 1
            force_finisher = st.session_state.pop("force_finisher", False)
            step = len(plan) if force_finisher else int(st.session_state.get("workout_step", 0))
            step = max(0, min(step, total_steps - 1))
            st.session_state["workout_step"] = step
            progress = ((step + 1) / total_steps) * 100

            st.markdown(
                f"<div class='steel-card gold'><div class='steel-label'>Current session</div><div class='steel-value' style='font-size:1.3rem'>{selected_day}</div><div class='steel-meta'>{len(plan)} active exercises · progress saves as you move</div></div>",
                unsafe_allow_html=True,
            )
            st.markdown(
                f"<div class='progress-track'><div class='progress-fill' style='width:{progress:.0f}%'></div></div>",
                unsafe_allow_html=True,
            )

            if step < len(plan):
                ex = plan[step]
                previous_sets = exercise_previous_sets(selected_day, ex["exercise_id"])
                previous_by_no = {int(r["set_no"]): r for r in previous_sets}
                removed_sets = set_removed(ex["programme_id"])

                st.markdown(f"<span class='step-chip'>Exercise {step + 1} of {len(plan)}</span>", unsafe_allow_html=True)
                st.markdown(
                    f"<div class='steel-card'><div class='exercise-title' style='font-size:1.35rem'>{ex['name']}</div><div class='exercise-meta'>{ex['equipment']} · target {ex['sets']} sets × {ex['rep_target']}</div></div>",
                    unsafe_allow_html=True,
                )

                if previous_sets:
                    last_text = " · ".join(f"S{r['set_no']} {r['weight_kg']:.1f}kg×{r['reps']}" for r in previous_sets)
                    st.caption(f"Last time: {last_text}")
                else:
                    st.caption("First logged session for this exercise — set a comfortable baseline.")

                complete_count = 0
                active_set_count = 0
                for set_no in range(1, int(ex["sets"]) + 1):
                    removed = set_no in removed_sets
                    prev = previous_by_no.get(set_no)
                    st.markdown(f"**Set {set_no}**")

                    weight_key = f"draft_w_{ex['programme_id']}_{set_no}"
                    reps_key = f"draft_r_{ex['programme_id']}_{set_no}"
                    done_key = f"draft_d_{ex['programme_id']}_{set_no}"

                    if weight_key not in st.session_state:
                        st.session_state[weight_key] = float(prev["weight_kg"]) if prev and prev["weight_kg"] is not None else 0.0
                    if reps_key not in st.session_state:
                        st.session_state[reps_key] = int(prev["reps"]) if prev and prev["reps"] else 10
                    if done_key not in st.session_state:
                        st.session_state[done_key] = False

                    if removed:
                        left, right = st.columns([1.2, 2.8])
                        with left:
                            if st.button("Restore", key=f"restore_set_{ex['programme_id']}_{set_no}"):
                                restore_set(ex["programme_id"], set_no)
                                st.rerun()
                        with right:
                            st.caption("Removed from this session")
                        continue

                    active_set_count += 1
                    c1, c2 = st.columns(2)
                    c1.number_input("Weight (kg)", min_value=0.0, max_value=500.0, step=2.5, key=weight_key)
                    c2.number_input("Reps", min_value=1, max_value=50, step=1, key=reps_key)
                    if st.session_state.get(done_key):
                        complete_count += 1

                    action1, action2, spacer = st.columns([1.15, 1.0, 2.85])
                    complete_label = "✓ Complete" if st.session_state.get(done_key) else "Complete"
                    with action1:
                        if st.button(
                            complete_label,
                            key=f"toggle_complete_{ex['programme_id']}_{set_no}",
                            type="primary" if not st.session_state.get(done_key) else "secondary",
                        ):
                            if st.session_state.get(done_key):
                                uncomplete_set(ex["programme_id"], set_no)
                            else:
                                complete_set(ex["programme_id"], set_no)
                            st.rerun()
                    with action2:
                        if st.button("Remove", key=f"remove_set_{ex['programme_id']}_{set_no}"):
                            remove_set(ex["programme_id"], set_no)
                            uncomplete_set(ex["programme_id"], set_no)
                            st.rerun()

                st.caption(f"{complete_count}/{active_set_count} active sets completed")

                with st.expander("Exercise options"):
                    st.caption("Remove only affects this workout session. Your saved plan stays unchanged.")
                    if st.button("Remove exercise from this session", key=f"remove_ex_{ex['programme_id']}"):
                        vals = set(st.session_state.get("draft_removed_exercises", []))
                        vals.add(ex["programme_id"])
                        st.session_state["draft_removed_exercises"] = sorted(vals)
                        st.session_state["workout_step"] = min(step, max(len(plan) - 2, 0))
                        st.rerun()

                left, right = st.columns(2)
                if left.button("← Previous", disabled=step == 0, use_container_width=True):
                    st.session_state["workout_step"] = step - 1
                    st.rerun()

                next_label = "Next exercise →" if step < len(plan) - 1 else "Go to finisher →"
                if right.button(next_label, type="primary", use_container_width=True):
                    st.session_state["workout_step"] = step + 1
                    st.rerun()

                with st.expander("Jump to another exercise"):
                    jump_labels = [f"{i + 1}. {p['name']}" for i, p in enumerate(plan)] + ["Finisher + save"]
                    jump = st.selectbox("Step", jump_labels, index=step, label_visibility="collapsed")
                    if st.button("Go", key="jump_go"):
                        st.session_state["workout_step"] = jump_labels.index(jump)
                        st.rerun()

            else:
                st.markdown("<span class='step-chip'>Final step</span>", unsafe_allow_html=True)
                st.markdown("### Incline finisher")
                st.caption("Medium-intensity treadmill walk after lifting.")

                defaults = {
                    "draft_cardio_done": True,
                    "draft_cardio_minutes": 7,
                    "draft_cardio_incline": 6.0,
                    "draft_cardio_rpe": 6.0,
                }
                for key, value in defaults.items():
                    if key not in st.session_state:
                        st.session_state[key] = value

                st.checkbox("Completed incline cardio", key="draft_cardio_done")
                ca, cb, cc = st.columns(3)
                ca.number_input("Minutes", min_value=5, max_value=10, step=1, key="draft_cardio_minutes")
                cb.number_input("Incline %", min_value=1.0, max_value=15.0, step=.5, key="draft_cardio_incline")
                cc.number_input("Effort /10", min_value=1.0, max_value=10.0, step=.5, key="draft_cardio_rpe")

                st.markdown("### Session summary")
                total_done_sets = 0
                summary_lines = []
                removed_exercises = draft_removed_exercises()
                for p in base_plan:
                    if p["programme_id"] in removed_exercises:
                        summary_lines.append((p["name"], "Removed", []))
                        continue
                    removed_sets = set_removed(p["programme_id"])
                    details = []
                    done_sets = 0
                    active_sets = 0
                    for set_no in range(1, int(p["sets"]) + 1):
                        if set_no in removed_sets:
                            continue
                        active_sets += 1
                        if st.session_state.get(f"draft_d_{p['programme_id']}_{set_no}", False):
                            done_sets += 1
                            total_done_sets += 1
                            weight = float(st.session_state.get(f"draft_w_{p['programme_id']}_{set_no}", 0.0))
                            reps = int(st.session_state.get(f"draft_r_{p['programme_id']}_{set_no}", 10))
                            details.append(f"{weight:g}kg×{reps}")
                    summary_lines.append((p["name"], f"{done_sets}/{active_sets}", details))

                for name, status, details in summary_lines:
                    detail_text = " · ".join(details) if details else ("Removed from session" if status == "Removed" else "No completed sets")
                    st.markdown(
                        f"<div class='summary-row'><span><strong>{name}</strong><br><small>{detail_text}</small></span><span>{status}</span></div>",
                        unsafe_allow_html=True,
                    )

                st.markdown("### Finish session")
                if "draft_date" not in st.session_state:
                    st.session_state["draft_date"] = date.today()
                if "draft_duration" not in st.session_state:
                    st.session_state["draft_duration"] = 45
                if "draft_notes" not in st.session_state:
                    st.session_state["draft_notes"] = ""

                date_col, duration_col = st.columns(2)
                session_date = date_col.date_input("Date", key="draft_date")
                duration = duration_col.number_input("Lifting min", min_value=20, max_value=90, step=5, key="draft_duration")
                notes = st.text_area("Notes", placeholder="Optional: energy, anything to remember next time", key="draft_notes")

                back_col, save_col = st.columns([1, 1.4])
                if back_col.button("← Back", use_container_width=True):
                    st.session_state["workout_step"] = max(len(plan) - 1, 0)
                    st.rerun()

                if save_col.button("SAVE SESSION", type="primary", use_container_width=True):
                    if total_done_sets == 0:
                        st.warning("Complete at least one set before saving the session.")
                    else:
                        session_id = execute(
                            "INSERT INTO sessions(session_date,day_name,duration_min,notes) VALUES (?,?,?,?)",
                            (session_date.isoformat(), selected_day, int(duration), notes.strip()),
                        )
                        for p in base_plan:
                            if p["programme_id"] in removed_exercises:
                                continue
                            removed_sets = set_removed(p["programme_id"])
                            for set_no in range(1, int(p["sets"]) + 1):
                                if set_no in removed_sets:
                                    continue
                                if st.session_state.get(f"draft_d_{p['programme_id']}_{set_no}", False):
                                    execute(
                                        "INSERT INTO set_logs(session_id,exercise_id,set_no,reps,weight_kg) VALUES (?,?,?,?,?)",
                                        (
                                            session_id,
                                            p["exercise_id"],
                                            set_no,
                                            int(st.session_state.get(f"draft_r_{p['programme_id']}_{set_no}", 10)),
                                            float(st.session_state.get(f"draft_w_{p['programme_id']}_{set_no}", 0.0)),
                                        ),
                                    )
                        if st.session_state.get("draft_cardio_done", True):
                            execute(
                                "INSERT INTO cardio_logs(session_id,cardio_date,activity,duration_min,incline_percent,intensity,rpe,notes) VALUES (?,?,?,?,?,?,?,?)",
                                (
                                    session_id,
                                    session_date.isoformat(),
                                    "Incline treadmill walk",
                                    int(st.session_state["draft_cardio_minutes"]),
                                    float(st.session_state["draft_cardio_incline"]),
                                    "Medium",
                                    float(st.session_state["draft_cardio_rpe"]),
                                    "Project Steel finisher",
                                ),
                            )
                        cardio_text = ""
                        if st.session_state.get("draft_cardio_done", True):
                            cardio_text = f" + {int(st.session_state['draft_cardio_minutes'])} min incline"
                        clear_draft()
                        st.session_state["steel_page"] = "Home"
                        flash(f"Session saved: {total_done_sets} working sets{cardio_text}.")

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
            st.markdown(
                f"<div class='steel-card'><div class='exercise-title'>{int(r.sort_order)}. {r.exercise}</div><div class='exercise-meta'>{r.equipment} · {int(r.sets)} sets × {r.reps}</div></div>",
                unsafe_allow_html=True,
            )

        st.markdown(
            "<div class='steel-card gold'><div class='steel-label'>Finisher</div><div class='steel-value' style='font-size:1.1rem'>Incline treadmill walk</div><div class='steel-meta'>5–10 min · medium intensity · default 6% incline</div></div>",
            unsafe_allow_html=True,
        )

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
                execute(
                    "INSERT INTO programme(day_name,sort_order,exercise_id,sets,rep_target,superset) VALUES (?,?,?,?,?,?)",
                    (selected_day, next_order, labels[chosen], sets, reps, "X"),
                )
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
    latest_text = f"{latest_kg:.1f} kg" if latest_kg is not None else "—"

    st.markdown(
        f"<div class='steel-card gold'><div class='steel-label'>Current weight</div><div class='steel-value'>{latest_text}</div><div class='steel-meta'>Track the trend, not a single day</div></div>",
        unsafe_allow_html=True,
    )

    with st.form("weight_form"):
        check_date = st.date_input("Check-in date", value=date.today())
        weight_kg = st.number_input("Weight (kg)", min_value=30.0, max_value=300.0, value=float(latest_kg or 90.0), step=.1)
        save = st.form_submit_button("SAVE WEIGHT", type="primary", use_container_width=True)
    if save:
        execute(
            """INSERT INTO checkins(week_date,weight_lb) VALUES (?,?)
               ON CONFLICT(week_date) DO UPDATE SET weight_lb=excluded.weight_lb""",
            (check_date.isoformat(), kg_to_lb(weight_kg)),
        )
        flash(f"Saved {weight_kg:.1f} kg.")

    if not history.empty:
        chart_data = history.copy()
        chart_data["date"] = pd.to_datetime(chart_data["week_date"])
        chart_data["weight_kg"] = chart_data["weight_lb"] * KG_PER_LB
        chart = (
            alt.Chart(chart_data)
            .mark_line(point=True, color="#D6A84B", strokeWidth=3)
            .encode(
                x=alt.X("date:T", title=None),
                y=alt.Y("weight_kg:Q", title="kg", scale=alt.Scale(zero=False)),
                tooltip=[
                    alt.Tooltip("date:T", title="Date", format="%d %b %Y"),
                    alt.Tooltip("weight_kg:Q", title="kg", format=".1f"),
                ],
            )
            .properties(height=260)
        )
        st.altair_chart(chart, use_container_width=True)
