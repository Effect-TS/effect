---
"effect": patch
---

`HttpClientResponse.headers` now converts the source headers once instead of on every read, and `Headers.isRedactedName` lower-cases a list of patterns once instead of for every header it checks.
