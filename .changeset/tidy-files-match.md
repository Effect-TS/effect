---
"effect": patch
---

Fix `HttpStaticServer` ignoring `If-Match` and `If-Unmodified-Since`. Failed preconditions now return 412 before cache validation and range handling.
