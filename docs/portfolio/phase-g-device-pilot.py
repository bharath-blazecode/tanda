"""Prepare and analyse offline trial sheets. No network, hardware or third-party libraries."""
import argparse
import csv
import math
from collections import Counter
from pathlib import Path
from statistics import mean, median

PHONES = ("ios-safari", "android-chrome")
KEYS = ["trial", "person", "phone", "condition", "repeat"]
MOTION = ["status", "uninterrupted", "source", "protocol", "position", "recovered",
          "placement_changed", "hz", "duration_s", "rms", "lateral_rms", "baseline_pct_ok", "notes"]
PULSE = ["status", "torch", "still", "display_bpm", "reference_valid", "mean_valid_rr_ms", "notes"]
OUTCOMES = {
    "motion": {"usable", "rejected", "unavailable", "interrupted", "skipped"},
    "pulse": {"measured", "approximate", "unreadable", "unavailable", "interrupted", "skipped"},
}


def schedule(test):
    people = range(1, 6) if test == "motion" else range(1, 4)
    conditions = ("day1", "day2") if test == "motion" else ("indoor", "dim")
    for condition in conditions:
        for person in people:
            for phone in (PHONES if person % 2 else reversed(PHONES)):
                for repeat in range(1, 4):
                    code = f"{test[0].upper()}{person}-{condition}-{phone}-{repeat}"
                    yield dict(zip(KEYS, (code, f"P{person}", phone, condition, str(repeat))))


def create(folder):
    # Refuse an existing folder. A rerun must never overwrite participant records.
    folder.mkdir(mode=0o700, parents=True, exist_ok=False)
    for test, extra in (("motion", MOTION), ("pulse", PULSE)):
        with (folder / f"{test}.csv").open("x", newline="") as stream:
            writer = csv.DictWriter(stream, fieldnames=KEYS + extra)
            writer.writeheader()
            writer.writerows(schedule(test))
    with (folder / "devices.csv").open("x", newline="") as stream:
        writer = csv.writer(stream)
        writer.writerow(["phone", "model", "os_version", "browser_version", "build_sha", "reference_model",
                         "sync_method", "floor_footwear", "position", "bright_dim_setup",
                         "non_negligible_baseline_rule"])
        writer.writerows([[phone] + [""] * 10 for phone in PHONES])
    with (folder / "controls.csv").open("x", newline="") as stream:
        writer = csv.writer(stream)
        writer.writerow(["phone", "control", "repeat", "observed_status", "physical_observation"])
        for phone in PHONES:
            for control in ("stand-flat", "stand-reorient", "stand-lock", "pulse-uncovered",
                            "pulse-movement", "pulse-interrupt-retry"):
                for repeat in range(1, 4):
                    writer.writerow([phone, control, repeat, "", ""])
    print("Prepared 60 motion slots, 36 pulse slots and 36 controls. No observations recorded.")


def number(row, field, *, zero=False):
    value = float(row[field])
    if not math.isfinite(value) or value < 0 or (not zero and value == 0):
        raise ValueError(f"{row['trial']}: invalid {field}")
    return value


def load(folder, test):
    with (folder / f"{test}.csv").open(newline="") as stream:
        rows = list(csv.DictReader(stream))
    expected = {r["trial"]: r for r in schedule(test)}
    if len(rows) != len(expected) or {r["trial"] for r in rows} != expected.keys():
        raise ValueError(f"{test}: missing, extra or duplicate primary slots; log retries separately")
    for r in rows:
        if any(r[k] != expected[r["trial"]][k] for k in KEYS):
            raise ValueError(f"{r['trial']}: scheduled conditions were changed")
        if r["status"] and r["status"] not in OUTCOMES[test]:
            raise ValueError(f"{r['trial']}: unknown status")
        if not r["status"]:
            if any(r[k] for k in (MOTION if test == "motion" else PULSE) if k != "notes"):
                raise ValueError(f"{r['trial']}: supply the observed status")
            continue
        field = "uninterrupted" if test == "motion" else "reference_valid"
        if r[field] not in {"yes", "no", "unknown"}:
            raise ValueError(f"{r['trial']}: record {field} as yes, no or unknown")
        if test == "motion" and r["status"] == "usable":
            if r["uninterrupted"] != "yes":
                raise ValueError(f"{r['trial']}: investigate accepted interrupted/unknown capture")
            if r["source"] not in {"gyroscope", "acceleration"}:
                raise ValueError(f"{r['trial']}: unknown source for usable capture")
            for flag in ("recovered", "placement_changed", "baseline_pct_ok"):
                if r[flag] not in {"yes", "no", "unknown"}:
                    raise ValueError(f"{r['trial']}: record {flag} as yes, no or unknown")
            for key in ("rms", "lateral_rms"):
                number(r, key, zero=True)
            for key in ("duration_s", "hz"):
                number(r, key)
        if test == "pulse":
            if r["still"] not in {"yes", "no", "unknown"}:
                raise ValueError(f"{r['trial']}: record still as yes, no or unknown")
            if r["status"] in {"measured", "approximate"}:
                number(r, "display_bpm")
            if r["reference_valid"] == "yes":
                number(r, "mean_valid_rr_ms")
            elif r["mean_valid_rr_ms"]:
                raise ValueError(f"{r['trial']}: remove unpaired RR summary or mark aligned reference valid")
    return rows


def describe_motion(rows):
    done = [r for r in rows if r["status"]]
    good = [r for r in done if r["status"] == "usable"]
    uninterrupted = sum(r["uninterrupted"] == "yes" for r in done)
    print(f"  usable {len(good)}/{len(done)} attempted; {len(good)}/{uninterrupted} uninterrupted")
    for person, day in sorted({(r["person"], r["condition"]) for r in rows}):
        group = [r for r in done if r["person"] == person and r["condition"] == day]
        print(f"    {person}/{day}: usable {sum(r['status'] == 'usable' for r in group)}/{len(group)} attempted")
    unknown = any(r["uninterrupted"] == "unknown" for r in done)
    if len(done) != len(rows) or not uninterrupted or unknown:
        print("  Availability gate incomplete; retain all missing conditions.")
    elif len(good) / uninterrupted < .9:
        print("  Investigate uninterrupted availability below 90%.")
    else:
        print("  At least 90% of uninterrupted primary trials usable. Check controls and retests separately.")
    strata = sorted({(r["person"], r["condition"], r["source"], r["recovered"]) for r in good})
    for key in strata:
        values = [number(r, "rms", zero=True) for r in good
                  if (r["person"], r["condition"], r["source"], r["recovered"]) == key]
        print(f"    {'/'.join(key)}: RMS n={len(values)}, median {median(values):.4g}, "
              f"min {min(values):.4g}, max {max(values):.4g}")

    # Compare like with like. Keep recovery and unverified mounting distinct even when the
    # product would allow a comparison with a lower recording-conditions tier.
    compared = above = absolute_only = 0
    for trial in good:
        first_day = "day1" if trial["repeat"] == "1" else trial["condition"]
        first = next((r for r in good if r["person"] == trial["person"] and r["condition"] == first_day
                      and r["repeat"] == "1"), None)
        if first is None or first is trial:
            continue
        if any(first[k] != trial[k] for k in ("source", "protocol", "position", "recovered")):
            continue
        if first["position"] in {"", "unknown"} or first["recovered"] == "unknown":
            continue
        if any(r["protocol"] != "2" or r["placement_changed"] != "no" or number(r, "duration_s") != 10
               for r in (first, trial)):
            continue
        rates = [number(r, "hz") for r in (first, trial)]
        if max(rates) / min(rates) > 1.25:
            continue
        base = number(first, "rms", zero=True)
        change = abs(number(trial, "rms", zero=True) - base)
        message = f"    {first['trial']} vs {trial['trial']} absolute RMS difference {change:.4g}"
        if first["baseline_pct_ok"] == "yes" and base > 0:
            pct = 100 * change / base
            compared += 1
            above += int(pct > 30)
            message += f" ({pct:.1f}%)"
        else:
            absolute_only += 1
        print(message)
    print(f"  Comparable unchanged retests above 30%: {above}/{compared} percentage-eligible pairs; "
          f"{absolute_only} additional absolute-only pairs.")


def describe_pulse(rows):
    done = [r for r in rows if r["status"]]
    valid = [r for r in done if r["reference_valid"] == "yes"]
    eligible = [r for r in valid if r["still"] == "yes"]
    errors = [number(r, "display_bpm") - 60000 / number(r, "mean_valid_rr_ms")
              for r in eligible if r["status"] == "measured"]
    print(f"  valid aligned references {len(valid)}/{len(done)} attempted; "
          f"measured among still reference-valid attempts {len(errors)}/{len(eligible)}")
    for condition in ("indoor", "dim"):
        group = [r for r in rows if r["condition"] == condition]
        print(f"    {condition}: outcomes {dict(Counter(r['status'] or 'not run' for r in group))}; "
              f"reference status {dict(Counter(r['reference_valid'] for r in group if r['status']))}")
    if errors:
        abs_errors = [abs(e) for e in errors]
        within = sum(e <= 10 for e in abs_errors)
        print(f"  bias {mean(errors):.2f}, median absolute error {median(abs_errors):.2f}, "
              f"largest absolute error {max(abs_errors):.2f} bpm; within 10 bpm {within}/{len(errors)}")
    if len(done) != len(rows) or not eligible or any("unknown" in (r["reference_valid"], r["still"]) for r in done):
        print("  Paired primary gate incomplete; no accuracy conclusion.")
    elif not errors:
        print("  Measured availability 0%; paired accuracy cannot be calculated.")
    elif len(errors) / len(eligible) < .8 or median(abs_errors) > 5 or within / len(errors) < .9:
        print("  Paired primary threshold missed; investigate before release.")
    else:
        print("  Paired primary thresholds met on this reference-valid subset. Review exclusions and controls.")


def report(folder):
    for test in OUTCOMES:
        rows = load(folder, test)
        for phone in PHONES:
            subset = [r for r in rows if r["phone"] == phone]
            print(test, phone, dict(Counter(r["status"] or "not run" for r in subset)))
            if test == "pulse":
                describe_pulse(subset)
            else:
                describe_motion(subset)
    print("Controls, retry pairs, cross-day differences, sample coverage and invariants require reviewer sign-off.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("operation", choices=["create", "report"])
    parser.add_argument("folder", type=Path)
    args = parser.parse_args()
    try:
        (create if args.operation == "create" else report)(args.folder)
    except (OSError, ValueError, KeyError) as error:
        parser.exit(1, f"Could not process pilot: {error}\n")
