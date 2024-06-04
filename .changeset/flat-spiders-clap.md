---
"effect": minor
---

add `timeToLiveStrategy` to `Pool` options

The `timeToLiveStrategy` determines how items are invalidated. If set to
"creation", then items are invalidated based on their creation time. If set
to "usage", then items are invalidated based on pool usage.

By default, the `timeToLiveStrategy` is set to "usage".
