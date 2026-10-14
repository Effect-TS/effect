---
"effect": patch
---

Fix `TestClock.adjust` and `TestClock.setTime` skipping sleeps that a woken fiber registers after more than one scheduler hop, such as after `Effect.yieldNow` or forking and joining a child.
