---
"effect": minor
---

Add the module function `Semaphore.withPermitsTraced(limit, permits, spanName, options?)` to trace time spent waiting for permits without tracing the guarded effect.
