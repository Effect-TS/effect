---
"effect": patch
---

Fix `TestClock.adjust` and `TestClock.setTime` skipping sleeps that a woken fiber registers after more than one scheduler hop when running under `TestClock.layer`, as in `@effect/vitest`'s `it.effect`. This includes sleeps registered after `Effect.yieldNow` or forking and joining a child. The layer installs a tracking scheduler so the clock waits for work caused by each wakeup to settle before checking the next sleep, and logs a warning if a woken fiber keeps running past `warningDelay`. A clock created with `TestClock.make` and provided by hand retains the existing one-scheduler-turn wait.

A `TestClock` created while another `TestClock` is the current clock now uses the outer clock's live clock for `withLive` and its warning timers, instead of the outer `TestClock`.
