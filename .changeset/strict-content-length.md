---
"effect": patch
---

Parse `Content-Length` metadata strictly across HTTP request conversions, ignoring malformed or unsafe values instead of coercing numeric prefixes.
