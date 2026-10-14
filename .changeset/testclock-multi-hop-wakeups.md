---
"effect": patch
---

Fix `TestClock.adjust` and `TestClock.setTime` skipping sleeps that a woken fiber registers after more than one scheduler hop, such as after `Effect.yieldNow` or forking and joining a child. The clock now waits for work caused by each wakeup to settle before checking the next sleep, and logs a warning if a woken fiber keeps running past `warningDelay`.

A `TestClock` created while another `TestClock` is the current clock now uses the outer clock's live clock for `withLive` and its warning timers, instead of the outer `TestClock`.
