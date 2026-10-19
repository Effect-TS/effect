---
"effect": patch
---

Fix `RequestResolver.withSpan` ignoring span options such as `kind`, `parent` and `root` when they are returned by an options function. Only `attributes` and `links` were applied before.
