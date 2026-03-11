"""
Schedule Generator Service
Optimized algorithm with scoring, ranking, and required/optional course support.
"""

import itertools
import uuid
from typing import List, Dict, Optional, Set, Tuple
from datetime import time
from collections import defaultdict

from sqlalchemy.orm import Session

from app.models import Course, Section, Session as SessionModel, Schedule
from app.schemas import ScheduleResponse
from app.repositories.course_repository import CourseRepository
from app.repositories.section_repository import SectionRepository
from app.repositories.session_repository import SessionRepository


# ─── Constants ───────────────────────────────────────────────────────────────
DAY_ORDER = {
    # Spanish
    "lunes": 0, "martes": 1, "miércoles": 2, "miercoles": 2,
    "jueves": 3, "viernes": 4, "sábado": 5, "sabado": 5, "domingo": 6,
    # English
    "monday": 0, "tuesday": 1, "wednesday": 2,
    "thursday": 3, "friday": 4, "saturday": 5, "sunday": 6,
}

def _parse_day_to_idx(day_val) -> int:
    """Robustly parse a day string or integer to 0-6 index."""
    if day_val is None:
        return -1
        
    # If it's already an integer (e.g. 0-6 or 1-7)
    if isinstance(day_val, int):
        # Assume 1-7 or 0-6. If 1-7, shift down.
        if 1 <= day_val <= 7:
            return day_val - 1
        if 0 <= day_val <= 6:
            return day_val
        return -1

    day_str = str(day_val).strip().lower()
    if not day_str:
        return -1

    # Check if it's a numeric string
    if day_str.isdigit():
        val = int(day_str)
        if 1 <= val <= 7:
            return val - 1
        if 0 <= val <= 6:
            return val
        return -1

    # Exact match
    if day_str in DAY_ORDER:
        return DAY_ORDER[day_str]

    # Partial match (e.g. "lun" -> "lunes")
    for key, idx in DAY_ORDER.items():
        if key.startswith(day_str[:3]):  # match first 3 chars
            return idx

    return -1

SCORE_WEIGHTS = {
    "earliest": 0.30,
    "gaps": 0.30,
    "spread": 0.25,
    "compactness": 0.15,
}

MAX_MINUTES = 24 * 60  # normalizer


# ─── Time Slot Bitmap ────────────────────────────────────────────────────────
class TimeSlotBitmap:
    """
    Bitmap-based time-slot tracker for O(1) collision detection.
    Each day has slots in 5-minute granularity (288 slots per day).
    """

    SLOT_SIZE = 5  # minutes

    def __init__(self):
        # 7 days × 288 slots = 2016 bits, stored as a set for clarity
        self._occupied: Set[Tuple[int, int]] = set()

    def copy(self) -> "TimeSlotBitmap":
        new = TimeSlotBitmap()
        new._occupied = set(self._occupied)
        return new

    def add_session(self, day_idx: int, start_minutes: int, end_minutes: int) -> bool:
        """
        Try to add a session. Returns False if there's a collision.
        Does NOT modify state on collision.
        """
        if day_idx < 0 or day_idx > 6:
            return True  # unknown day → no collision

        slots_needed = set()
        t = start_minutes
        while t < end_minutes:
            slot = t // self.SLOT_SIZE
            key = (day_idx, slot)
            if key in self._occupied:
                return False  # collision
            slots_needed.add(key)
            t += self.SLOT_SIZE

        self._occupied.update(slots_needed)
        return True

    def can_add_session(self, day_idx: int, start_minutes: int, end_minutes: int) -> bool:
        """Check without mutating."""
        if day_idx < 0 or day_idx > 6:
            return True

        t = start_minutes
        while t < end_minutes:
            slot = t // self.SLOT_SIZE
            if (day_idx, slot) in self._occupied:
                return False
            t += self.SLOT_SIZE
        return True


# ─── Course Option ───────────────────────────────────────────────────────────
class CourseOption:
    """Represents a course section with its sessions, pre-computed for speed."""

    __slots__ = (
        "section_id", "course_id", "course_code", "course_name",
        "section_number", "professor", "sessions", "group",
        "_time_slots",
    )

    def __init__(self, section: Section, sessions: List[SessionModel], course: Course):
        self.section_id = section.id
        self.course_id = course.id
        self.course_code = course.code
        self.course_name = course.name
        self.section_number = section.section_number
        self.professor = section.professor
        self.sessions = sessions
        self.group = course.code

        # Pre-compute time slots: list of (day_idx, start_min, end_min)
        self._time_slots: List[Tuple[int, int, int]] = []
        for s in sessions:
            day_val = getattr(s, 'day', None) or getattr(s, 'day_of_week', None)
            day_idx = _parse_day_to_idx(day_val)
            start = getattr(s.start_time, 'hour', 0) * 60 + getattr(s.start_time, 'minute', 0)
            end = getattr(s.end_time, 'hour', 0) * 60 + getattr(s.end_time, 'minute', 0)
            self._time_slots.append((day_idx, start, end))

    def fits_bitmap(self, bitmap: TimeSlotBitmap) -> bool:
        """Check if this option can fit into the bitmap without collision."""
        for day_idx, start, end in self._time_slots:
            if not bitmap.can_add_session(day_idx, start, end):
                return False
        return True

    def add_to_bitmap(self, bitmap: TimeSlotBitmap) -> bool:
        """Add this option's sessions to bitmap. Returns False on collision."""
        for day_idx, start, end in self._time_slots:
            if not bitmap.add_session(day_idx, start, end):
                return False
        return True


# ─── Scoring ─────────────────────────────────────────────────────────────────
def score_combination(options: List[CourseOption]) -> Dict[str, float]:
    """
    Score a valid combination on 4 axes (0.0–1.0 each, higher = better).
    Returns individual scores + weighted composite.
    """
    if not options:
        return {"earliest": 0, "gaps": 0, "spread": 0, "compactness": 0, "composite": 0}

    # Collect all sessions across all options
    day_sessions: Dict[int, List[Tuple[int, int]]] = defaultdict(list)
    all_starts = []

    for opt in options:
        for day_idx, start, end in opt._time_slots:
            if day_idx >= 0:
                day_sessions[day_idx].append((start, end))
                all_starts.append(start)

    if not all_starts:
        return {"earliest": 0, "gaps": 0, "spread": 0, "compactness": 0, "composite": 0}

    # 1. Earliest score: lower average start = better
    avg_start = sum(all_starts) / len(all_starts)
    earliest = 1.0 - (avg_start / MAX_MINUTES)

    # 2. Gap score: fewer minutes of gaps between consecutive classes = better
    total_gap_minutes = 0
    for day_idx, intervals in day_sessions.items():
        sorted_intervals = sorted(intervals, key=lambda x: x[0])
        for i in range(1, len(sorted_intervals)):
            gap = sorted_intervals[i][0] - sorted_intervals[i - 1][1]
            if gap > 0:
                total_gap_minutes += gap

    # Normalize: 0 gaps = 1.0, 300+ minutes of gaps = 0.0
    gaps = max(0.0, 1.0 - (total_gap_minutes / 300.0))

    # 3. Spread score: how evenly distributed across days
    active_days = len(day_sessions)
    total_sessions = sum(len(v) for v in day_sessions.values())

    if active_days > 0 and total_sessions > 0:
        sessions_per_day = [len(day_sessions.get(d, [])) for d in range(7)]
        active_counts = [c for c in sessions_per_day if c > 0]
        if len(active_counts) > 1:
            avg_per_day = total_sessions / active_days
            variance = sum((c - avg_per_day) ** 2 for c in active_counts) / len(active_counts)
            spread = max(0.0, 1.0 - (variance / 4.0))  # variance of 4+ = 0
        else:
            spread = 0.0  # all on one day = bad spread
    else:
        spread = 0.0

    # 4. Compactness: fewer active days = better (less commute)
    compactness = max(0.0, 1.0 - ((active_days - 1) / 5.0))  # 1 day = 1.0, 6 days = 0.0

    composite = (
        SCORE_WEIGHTS["earliest"] * earliest
        + SCORE_WEIGHTS["gaps"] * gaps
        + SCORE_WEIGHTS["spread"] * spread
        + SCORE_WEIGHTS["compactness"] * compactness
    )

    return {
        "earliest": round(earliest, 3),
        "gaps": round(gaps, 3),
        "spread": round(spread, 3),
        "compactness": round(compactness, 3),
        "composite": round(composite, 3),
    }


# ─── Schedule Generator Service ─────────────────────────────────────────────
class ScheduleGeneratorService:
    """Service to generate all possible schedule combinations."""

    def __init__(self, db: Session):
        self.db = db
        self.course_repo = CourseRepository(db)
        self.section_repo = SectionRepository(db)
        self.session_repo = SessionRepository(db)

    # ── Public API ───────────────────────────────────────────────────────

    def generate_schedule_combinations_from_selected_sections(
        self,
        selected_section_ids: List[int],
        optional_section_ids: List[int] | None = None,
        max_optional_courses: int | None = None,
        sort_by: str = "score",
        max_results: int = 200,
    ) -> List[Dict]:
        """
        Generate combinations from user-selected sections.

        Args:
            selected_section_ids: Sections from REQUIRED courses (must all appear).
            optional_section_ids: Sections from OPTIONAL courses (pick N of M).
            max_optional_courses: How many optional courses to include (None = all).
            sort_by: "score" | "earliest" | "compact" | "spread" | "gaps"
            max_results: Cap on returned combinations.
        """
        required_options = self._load_course_options(selected_section_ids)
        optional_options = self._load_course_options(optional_section_ids or [])

        if not required_options and not optional_options:
            return []

        # Generate required base combinations
        required_combos = self._generate_valid_combinations(required_options)

        if not optional_options:
            # No optionals → score, sort, return
            scored = [
                self._combo_to_dict(opts, score_combination(opts))
                for opts in required_combos
            ]
            return self._sort_and_limit(scored, sort_by, max_results)

        # With optionals: for each required base, try adding optional combos
        optional_groups = self._group_by_course(optional_options)
        optional_course_codes = list(optional_groups.keys())

        # Determine how many optional courses to pick
        pick_count = max_optional_courses or len(optional_course_codes)
        pick_count = min(pick_count, len(optional_course_codes))

        all_results = []

        for base_opts in required_combos:
            base_bitmap = TimeSlotBitmap()
            bitmap_ok = True
            for opt in base_opts:
                if not opt.add_to_bitmap(base_bitmap):
                    bitmap_ok = False
                    break
            if not bitmap_ok:
                continue

            # Try each subset of optional courses
            for opt_course_subset in itertools.combinations(optional_course_codes, pick_count):
                opt_section_lists = [optional_groups[code] for code in opt_course_subset]

                for opt_section_combo in itertools.product(*opt_section_lists):
                    # Check if optional sections fit with the required base
                    test_bitmap = base_bitmap.copy()
                    valid = True

                    for opt_section in opt_section_combo:
                        if not opt_section.add_to_bitmap(test_bitmap):
                            valid = False
                            break

                    if valid:
                        full_opts = list(base_opts) + list(opt_section_combo)
                        scores = score_combination(full_opts)
                        all_results.append(self._combo_to_dict(full_opts, scores))

                        if len(all_results) >= max_results * 2:
                            # Early exit to avoid excessive computation
                            break

        return self._sort_and_limit(all_results, sort_by, max_results)

    # ── Internal Methods ─────────────────────────────────────────────────

    def _load_course_options(self, section_ids: List[int]) -> List[CourseOption]:
        """Load CourseOption objects from section IDs."""
        options = []
        for section_id in section_ids:
            section = self.section_repo.get(section_id)
            if not section:
                continue
            course = self.course_repo.get(section.course_id)
            if not course:
                continue
            sessions = self.session_repo.get_by_section(section_id)
            if sessions:
                options.append(CourseOption(section, sessions, course))
        return options

    def _group_by_course(self, options: List[CourseOption]) -> Dict[str, List[CourseOption]]:
        """Group options by course code."""
        groups: Dict[str, List[CourseOption]] = {}
        for opt in options:
            groups.setdefault(opt.course_code, []).append(opt)
        return groups

    def _generate_valid_combinations(
        self, options: List[CourseOption]
    ) -> List[List[CourseOption]]:
        """
        Generate all valid (no-collision) combinations using Cartesian product
        with incremental bitmap validation for early pruning.
        """
        groups = self._group_by_course(options)
        course_codes = list(groups.keys())

        if not course_codes:
            return []

        # Use recursive backtracking with bitmap pruning
        results: List[List[CourseOption]] = []
        self._backtrack(groups, course_codes, 0, [], TimeSlotBitmap(), results, max_results=500)
        return results

    def _backtrack(
        self,
        groups: Dict[str, List[CourseOption]],
        course_codes: List[str],
        depth: int,
        current: List[CourseOption],
        bitmap: TimeSlotBitmap,
        results: List[List[CourseOption]],
        max_results: int,
    ):
        """Recursive backtracking with bitmap-based pruning."""
        if len(results) >= max_results:
            return

        if depth == len(course_codes):
            results.append(list(current))
            return

        code = course_codes[depth]
        for option in groups[code]:
            # Try adding this option to the bitmap
            new_bitmap = bitmap.copy()
            if option.add_to_bitmap(new_bitmap):
                current.append(option)
                self._backtrack(
                    groups, course_codes, depth + 1,
                    current, new_bitmap, results, max_results,
                )
                current.pop()

    def _combo_to_dict(self, options: List[CourseOption], scores: Dict[str, float]) -> Dict:
        """Convert a list of CourseOptions + scores to the API response dict."""
        sorted_opts = sorted(options, key=lambda x: x.section_id)
        return {
            "combination_id": str(uuid.uuid4()),
            "id_string": "_".join(str(o.section_id) for o in sorted_opts),
            "course_count": len(sorted_opts),
            "scores": scores,
            "courses": [
                {
                    "course_id": opt.course_id,
                    "course_code": opt.course_code,
                    "course_name": opt.course_name,
                    "section_id": opt.section_id,
                    "section_number": opt.section_number,
                    "professor": opt.professor,
                    "sessions": [
                        {
                            "session_id": session.id,
                            "session_type": session.session_type,
                            "day": session.day,
                            "start_time": session.start_time.strftime("%H:%M"),
                            "end_time": session.end_time.strftime("%H:%M"),
                            "location": session.location,
                            "modality": session.modality,
                        }
                        for session in opt.sessions
                    ],
                }
                for opt in sorted_opts
            ],
        }

    def _sort_and_limit(
        self, combos: List[Dict], sort_by: str, max_results: int
    ) -> List[Dict]:
        """Sort combinations by the requested metric and truncate."""
        key_map = {
            "score": lambda c: c.get("scores", {}).get("composite", 0),
            "earliest": lambda c: c.get("scores", {}).get("earliest", 0),
            "gaps": lambda c: c.get("scores", {}).get("gaps", 0),
            "spread": lambda c: c.get("scores", {}).get("spread", 0),
            "compact": lambda c: c.get("scores", {}).get("compactness", 0),
        }
        sort_fn = key_map.get(sort_by, key_map["score"])
        combos.sort(key=sort_fn, reverse=True)
        return combos[:max_results]