---
"effect": patch
---

Fix `HttpTraceContext` sampling decisions for B3 and W3C headers. The B3 debug sampling state (`b3: {trace}-{span}-d`), the debug flag (`x-b3-flags: 1`) and the legacy `x-b3-sampled: true` are now read as sampled, so the server span and its children are no longer dropped. An all-zero `traceparent` trace-id or parent-id is now rejected.
