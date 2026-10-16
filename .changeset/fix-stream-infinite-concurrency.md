---
"effect": patch
---

Fix unordered `Stream.mapEffect`, `Stream.flattenEffect`, and `Stream.bindEffect` dropping in-flight results when concurrency is `Infinity` or an oversized positive number. These concurrency values now use the same safe bound as `"unbounded"`, so successful completion waits for pending effects.
