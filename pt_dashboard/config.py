from pathlib import Path
import os

ROOT = Path(__file__).resolve().parent.parent
DB_PATH = Path(os.getenv("PT_DB_PATH", ROOT / "data" / "pt_dashboard.db"))

PAIN_WARNING = 4
PAIN_STOP = 7

