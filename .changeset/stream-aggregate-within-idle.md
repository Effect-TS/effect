---
"effect": patch
---

Stop idle schedule stepping in `Stream.aggregateWithin`, `Stream.groupedWithin` and `Stream.aggregate`. Schedules step at most once per aggregation and exclude time between aggregations. On schedule exhaustion, emit the current aggregation and drain sink leftovers without pulling more upstream.
