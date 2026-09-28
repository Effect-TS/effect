---
"effect": patch
---

Fix `RcRef.make` to treat `idleTimeToLive: 0` like `Duration.zero` and `"0 millis"` instead of an omitted option.
