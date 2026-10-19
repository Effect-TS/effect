---
"effect": patch
---

Fix `RequestResolver.withSpan` dropping every span option except `attributes` and `links` when the options are returned by a function.
