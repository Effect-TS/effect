---
"effect": patch
---

Add guards for `HttpBodyError`, `CookiesError`, `MultipartError` and `NdjsonError`, so these errors can be narrowed from unknown values.
