---
"effect": patch
---

`HttpTraceContext.fromHeaders` now rejects uppercase hex trace and span IDs in `traceparent`, `b3` and `X-B3-*` headers, matching the lowercase encodings required by W3C Trace Context and B3. Previously they were accepted and propagated unchanged, which conforming downstream receivers reject.
