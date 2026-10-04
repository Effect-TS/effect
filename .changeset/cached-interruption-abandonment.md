---
"effect": patch
---

Treat interruption as abandonment in `Effect.cached`, `Effect.cachedWithTTL`, `Effect.cachedInvalidateWithTTL`, `Cache`, `ScopedCache`, `RcRef`, `RcMap` and the cluster `ResourceMap`. Concurrent callers share one computation that is interrupted only after every caller has been interrupted, interrupted results are never cached, and a call made while an abandoned computation is still finalizing starts a fresh one.
