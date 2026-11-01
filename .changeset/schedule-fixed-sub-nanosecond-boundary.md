---
"effect": patch
---

Fix `Schedule.fixed`, `Schedule.windowed` and `Schedule.cron` returning a zero delay when the clock is a fraction of a nanosecond before the next run.
