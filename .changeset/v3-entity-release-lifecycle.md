---
"@effect/cluster": patch
---

Do not register an entity whose construction finishes after its shard was released, and close the scope of failed or interrupted entity lookups
