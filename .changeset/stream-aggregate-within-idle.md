---
"effect": patch
---

Stop `Stream.aggregateWithin`, `Stream.groupedWithin` and `Stream.aggregate` from stepping their schedule while upstream is idle. Each window now starts when its first element arrives.
