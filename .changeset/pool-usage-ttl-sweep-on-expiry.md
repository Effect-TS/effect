---
"effect": patch
---

Fix `Pool.makeWithTTL` with `timeToLiveStrategy: "usage"` releasing an idle item up to twice `timeToLive` after its last use. The sweep now wakes when the next idle item expires.
