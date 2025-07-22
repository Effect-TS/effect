---
"@effect/platform": minor
---

Changes Terminal.readInput to return a ReadonlyMailbox of events

This allows for more efficient handling of input events, as well as ensuring
events are not lost.
