---
"effect": patch
---

Stop `Stream.aggregateWithin`, `Stream.groupedWithin` and `Stream.aggregate` from stepping their schedule while upstream is idle. The schedule is now stepped at most once per aggregation, when the aggregation receives its first element, and time between aggregations is hidden from it. When a finite schedule ends, the current aggregation and any sink leftovers are emitted before the stream ends.
