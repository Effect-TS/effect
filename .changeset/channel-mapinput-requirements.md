---
"effect": patch
---

Fix the data-last `Channel.mapInput` signature dropping the services required by the mapping function; the resulting channel now requires them, matching the data-first overload.
