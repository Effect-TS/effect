---
"effect": patch
---

Fix `Schedule.fibonacci` skipping the repeated initial delay. For a base of 100 millis the delays are now 100, 100, 200, 300, 500 ms instead of 100, 200, 300, 500, 800 ms, so every retry delay after the first is shorter than before.
