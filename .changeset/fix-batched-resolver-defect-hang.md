---
"effect": patch
---

Fix batched request resolver defects causing consumer fibers to hang forever.

When a `RequestResolver.makeBatched` resolver died with a defect, the request `Deferred`s were never completed because the cleanup logic in `invokeWithInterrupt` used `flatMap` (which only runs on success). Changed to `ensuring` so uncompleted request entries are always resolved regardless of exit type.
