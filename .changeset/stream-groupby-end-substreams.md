---
"effect": patch
---

Fix `Stream.groupBy` and `Stream.groupByKey` group streams never ending once the upstream ends, which hung sequential, bounded-concurrency, and `Stream.take` consumers.
