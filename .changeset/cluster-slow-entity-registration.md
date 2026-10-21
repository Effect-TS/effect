---
"@effect/cluster": patch
---

Hold persisted messages while entity layers are still building, starting the entity registration timeout at the first entity registration instead of when the storage loop starts.
