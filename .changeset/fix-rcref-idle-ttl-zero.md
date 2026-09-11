---
"effect": patch
---

Keep `RcRef.make({ idleTimeToLive: 0 })`. A numeric zero is a valid duration, so it no longer gets dropped as if the option was omitted.
