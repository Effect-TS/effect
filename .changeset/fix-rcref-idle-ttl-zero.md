---
"effect": patch
---

Fix `RcRef.make` to treat `idleTimeToLive: 0` like `Duration.zero` and `"0 millis"`. Release runs in a forked fiber and is not awaited by the scope releasing the last reference. Omitting `idleTimeToLive` still releases the resource within that scope and awaits completion.
