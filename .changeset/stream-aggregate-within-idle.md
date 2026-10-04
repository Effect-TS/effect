---
"effect": patch
---

Pause schedules while `Stream.aggregateWithin`, `Stream.groupedWithin` and `Stream.aggregate` are idle. When a schedule ends, emit the current aggregation and drain sink leftovers without further upstream pulls.
