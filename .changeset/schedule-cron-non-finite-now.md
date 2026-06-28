---
"effect": patch
---

Fix `Schedule.cron` crashing with `IllegalArgumentException: Invalid date` when the clock is advanced past the end of time (for example `TestClock.adjust(Infinity)`). A non-finite `now` produced an invalid `Date`, which made the internal `Cron.match`/`Cron.next` calls throw and crash the fiber. The cron schedule now finishes cleanly in that case, matching how other time-based schedules such as `Schedule.fixed` and `Schedule.spaced` already behave.
