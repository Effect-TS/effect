---
"effect": patch
---

Stop `Stream.aggregateWithin`, `Stream.groupedWithin` and `Stream.aggregate` from stepping their schedule while upstream is idle. The schedule is now stepped once per aggregation, when the aggregation receives its first element, and idle time is hidden from it. When a finite schedule ends, the current aggregation is emitted before the stream ends.
