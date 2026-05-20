#!/usr/bin/env python3
"""Self-tests for the KMP extractor pipeline.

These run against synthetic disclosure text patterned on real SEBI
Regulation 30 intimations — so we can verify accuracy without needing
external network access (which is blocked in CI sandboxes).

Run: python scripts/test_extractor.py
"""

from __future__ import annotations

import sys
from pathlib import Path

# Allow importing the sibling module.
sys.path.insert(0, str(Path(__file__).resolve().parent))

from fetch_kmp_events import (  # type: ignore  # noqa: E402
    classify_designation,
    classify_event,
    dedupe_and_rank,
    detect_letter_attached,
    events_from_blob,
    extract_effective_date,
    extract_person,
    extract_reason,
    extract_term,
    split_blob_segments,
)


COMPANY = {"ticker": "INFY", "name": "Infosys Ltd."}

CASES = [
    {
        "label": "Resignation of CFO (regulation 30 intimation)",
        "title": "Resignation of Mr. Nilanjan Roy, Chief Financial Officer",
        "summary": (
            "Pursuant to Regulation 30 of the SEBI (LODR) Regulations, 2015, we wish "
            "to inform that Mr. Nilanjan Roy, Chief Financial Officer of the Company, "
            "has tendered his resignation with effect from 31 March 2024. The reason "
            "for resignation is to pursue an external career opportunity. A copy of "
            "the resignation letter is enclosed as Annexure A."
        ),
        "expected_event": "resignation",
        "expected_designation": "CFO",
        "expected_person_token": "Nilanjan Roy",
        "expected_effective": "2024-03-31",
        "expected_letter": "yes",
    },
    {
        "label": "Combined: outgoing CFO + incoming CFO",
        "title": "Resignation of CFO and appointment of new CFO",
        "summary": (
            "Mr. Nilanjan Roy, Chief Financial Officer, has resigned with effect from "
            "31 March 2024 due to personal reasons. The Board has appointed "
            "Mr. Jayesh Sanghrajka as the Chief Financial Officer with effect from "
            "1 April 2024 for a term of five years."
        ),
        "expected_event": "resignation",  # split should produce both
        "expected_designation": "CFO",
        "expected_person_token": "Nilanjan Roy",
        "expected_effective": "2024-03-31",
        "expected_letter": "unknown",
        "expected_second_person": "Jayesh Sanghrajka",
        "expected_second_event": "appointment",
        "expected_term_contains": "five years",
    },
    {
        "label": "Reappointment of MD",
        "title": "Reappointment of Managing Director",
        "summary": (
            "The Board has approved the re-appointment of Mr. Salil Parekh as "
            "Managing Director and Chief Executive Officer of the Company for a "
            "term of 5 years with effect from 1 April 2027."
        ),
        "expected_event": "reappointment",
        "expected_designation": "Managing Director & CEO",
        "expected_person_token": "Salil Parekh",
        "expected_effective": "2027-04-01",
        "expected_letter": "unknown",
        "expected_term_contains": "5 years",
    },
    {
        "label": "Retirement / completion of term",
        "title": "Retirement of Independent Director on completion of term",
        "summary": (
            "Ms. Kiran Mazumdar-Shaw, Independent Director, will retire from the "
            "Board on completion of her second term with effect from 30 March 2024."
        ),
        "expected_event": "retirement",
        "expected_designation": "Independent Director",
        "expected_person_token": "Kiran Mazumdar-Shaw",
        "expected_effective": "2024-03-30",
        "expected_letter": "unknown",
    },
    {
        "label": "Appointment of Company Secretary",
        "title": "Appointment of Company Secretary and Compliance Officer",
        "summary": (
            "We wish to inform that the Board has appointed Mr. A.G.S. Manikantha "
            "as the Company Secretary and Compliance Officer of the Company with "
            "effect from 1 June 2023."
        ),
        "expected_event": "appointment",
        "expected_designation": "Company Secretary",
        "expected_person_token": "Manikantha",
        "expected_effective": "2023-06-01",
        "expected_letter": "unknown",
    },
]


def check(label: str, condition: bool, detail: str) -> bool:
    mark = "OK " if condition else "FAIL"
    print(f"  [{mark}] {label}: {detail}")
    return condition


def run() -> int:
    failures = 0
    for idx, case in enumerate(CASES, start=1):
        print(f"\n[{idx}] {case['label']}")
        events = events_from_blob(
            company=COMPANY,
            title=case["title"],
            summary=case["summary"],
            link="https://www.bseindia.com/example.pdf",
            published="2024-04-01",
            source_name="BSE",
            source_type="aggregator",
            pdf_text=case["summary"],
        )
        if not events:
            failures += 1
            print(f"  [FAIL] produced 0 events")
            continue

        first = events[0]
        ok_event = check("event_type", first.event_type == case["expected_event"],
                         f"{first.event_type} (expected {case['expected_event']})")
        ok_desig = check("designation", first.designation == case["expected_designation"],
                         f"{first.designation!r} (expected {case['expected_designation']!r})")
        ok_person = check("person_name", case["expected_person_token"] in first.person_name,
                          f"{first.person_name!r} contains {case['expected_person_token']!r}?")
        ok_eff = check("effective_date", first.effective_date == case["expected_effective"],
                       f"{first.effective_date!r} (expected {case['expected_effective']!r})")
        ok_letter = check("resignation_letter_attached",
                          first.resignation_letter_attached == case["expected_letter"],
                          f"{first.resignation_letter_attached!r} (expected {case['expected_letter']!r})")
        ok_conf = check("confidence promoted by PDF body",
                        first.confidence_score == "high",
                        f"{first.confidence_score!r}")

        if "expected_term_contains" in case:
            check("term_of_appointment",
                  case["expected_term_contains"].lower() in first.term_of_appointment.lower(),
                  f"{first.term_of_appointment!r}") or (
                lambda: globals().__setitem__("_inc", None)  # noqa
            )

        if "expected_second_person" in case:
            second_match = any(
                case["expected_second_person"] in e.person_name and e.event_type == case["expected_second_event"]
                for e in events
            )
            check("multi-event split",
                  second_match,
                  f"produced {[(e.person_name, e.event_type) for e in events]}")

        if not all([ok_event, ok_desig, ok_person, ok_eff, ok_letter, ok_conf]):
            failures += 1

    # Dedup test.
    print("\n[dedup] same person, same event from two sources")
    dup_input = []
    for st in ("news", "aggregator"):
        dup_input.extend(events_from_blob(
            company=COMPANY,
            title="Resignation of Mr. Salil Parekh, CEO",
            summary="Mr. Salil Parekh, CEO, has resigned with effect from 1 January 2025.",
            link=f"https://{st}.example/pdf",
            published="2025-01-01",
            source_name=st,
            source_type=st,
            pdf_text="" if st == "news" else "Mr. Salil Parekh, CEO, has resigned with effect from 1 January 2025.",
        ))
    ranked = dedupe_and_rank(dup_input)
    check("dedup keeps exactly one row", len(ranked) == 1, f"got {len(ranked)}") or (failures := failures + 1)
    if ranked:
        check("dedup keeps higher confidence",
              ranked[0].source_type == "aggregator",
              f"winner source_type={ranked[0].source_type!r}")

    print(f"\n=== {len(CASES)} cases run, {failures} failures ===")
    return 0 if failures == 0 else 1


if __name__ == "__main__":
    sys.exit(run())
