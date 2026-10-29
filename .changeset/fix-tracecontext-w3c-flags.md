---
"effect": patch
---

Reject `traceparent` headers with malformed trace flags in `HttpTraceContext`. Flags that are not two lowercase hexadecimal digits now return `Option.none()` instead of continuing the trace.
