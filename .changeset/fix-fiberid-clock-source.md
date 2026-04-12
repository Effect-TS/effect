---
"effect": patch
---

Replace hardcoded `Date.now()` in `FiberId.unsafeMake()` with a configurable clock source. The `startTimeMillis` field feeds into `Hash.symbol()` and `Equal.symbol()`, making fiber identity non-deterministic across runs. The new `setClockSource()`/`resetClockSource()` API allows deterministic testing without monkey-patching `Date.now` globally.
