"""Recompute the October descriptive hour comparison from the original exports.

Read-only, standard library only. Run: python docs/stats/analyze.py
Export hours are intentionally preserved rather than relabeled as local time.
"""

import csv
import json
import statistics
from collections import defaultdict
from datetime import datetime
from pathlib import Path


def summarize(path):
    with path.open(encoding="utf-8-sig", newline="") as source:
        rows = list(csv.DictReader(source))
    selected = []
    for row in rows:
        timestamp = datetime.strptime(row["Publish time"], "%m/%d/%Y %H:%M")
        if datetime(2026, 10, 1) <= timestamp < datetime(2026, 10, 22):
            selected.append((timestamp, row))
    groups = defaultdict(list)
    by_day = defaultdict(dict)
    for timestamp, row in selected:
        groups[timestamp.hour].append(row)
        by_day[timestamp.date()][timestamp.hour] = int(row["Views"])
    result = {"export_rows": len(rows), "selected_rows": len(selected), "hours": {}}
    for hour, records in sorted(groups.items()):
        views = [int(row["Views"]) for row in records]
        result["hours"][str(hour)] = {
            "n": len(views),
            "views_mean": statistics.mean(views),
            "views_median": statistics.median(views),
            "views_total": sum(views),
        }
        if "Reactions, Comments and Shares" in records[0]:
            result["hours"][str(hour)]["reactions_comments_shares"] = sum(
                int(row["Reactions, Comments and Shares"]) for row in records
            )
    pairs = [values for values in by_day.values() if 10 in values and 15 in values]
    result["paired_days"] = len(pairs)
    result["morning_wins"] = sum(values[10] > values[15] for values in pairs)
    result["afternoon_wins"] = sum(values[10] < values[15] for values in pairs)
    result["ties"] = sum(values[10] == values[15] for values in pairs)
    return result


if __name__ == "__main__":
    folder = Path(__file__).resolve().parent / "2026-10"
    print(
        json.dumps(
            {
                "Facebook": summarize(folder / "facebook-posts-lifetime.csv"),
                "Instagram": summarize(folder / "instagram-posts-lifetime.csv"),
            },
            indent=2,
        )
    )
