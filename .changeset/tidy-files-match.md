---
"effect": patch
---

Honor `If-Match` and `If-Unmodified-Since` in `HttpStaticServer`, returning 412 for failed preconditions before cache validation or range handling.
