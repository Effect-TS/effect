---
"effect": patch
---

Fix `Headers.fromInput` keeping only the last value of a header name repeated in iterable input, such as `Set-Cookie` from fetch responses.
