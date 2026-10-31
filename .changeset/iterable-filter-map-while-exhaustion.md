---
"effect": patch
---

Keep `Iterable.filterMapWhile` iterators done after the first failure or source exhaustion, without pulling further input or calling the mapper again.
