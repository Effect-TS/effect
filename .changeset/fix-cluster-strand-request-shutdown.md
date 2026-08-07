---
"effect": patch
---

Fix `@effect/cluster` shutdown hang by failing a non-discard `Sharding.sendOutgoing` request (with `EntityNotAssignedToRunner`) when it is abandoned during teardown, instead of resolving as sent.
