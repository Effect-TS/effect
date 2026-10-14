---
"effect": patch
---

Fix `TestClock.adjust` and `TestClock.setTime` skipping sleeps that a woken fiber registers after more than one scheduler hop, such as after `Effect.yieldNow` or forking and joining a child. The fix applies to clocks provided by `TestClock.layer`, which `@effect/vitest`'s `it.effect` uses. If a woken fiber keeps running past `warningDelay`, the clock logs a warning and moves on.

A `TestClock` created while another `TestClock` is the current clock now uses the outer clock's live clock for `withLive` and its warning timers.
