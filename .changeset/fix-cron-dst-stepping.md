---
"effect": minor
---

Add `Cron.nextCandidate` and `Cron.prevCandidate` for inspecting exact, gap, and fold candidates. `Cron.next` and `Cron.prev` now return only literal matching instants, while cron schedules retain catch-up and run-once behavior.
