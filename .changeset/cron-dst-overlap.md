---
"effect": minor
---

Add an `onDstOverlap` option to `Cron` and `Schedule.cron` that chooses which occurrences of local times repeated when clocks fall back are included: `"earlier"` (default), `"later"` or `"both"`. It applies to every repeated local time, including ones not caused by daylight saving time.

`Cron.prev` now returns the latest matching instant before its input when starting inside a repeated hour. Near a spring-forward gap it no longer throws or returns an instant at or after its input.
