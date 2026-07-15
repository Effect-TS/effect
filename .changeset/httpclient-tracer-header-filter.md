---
"effect": patch
---

Add `withTracerRequestHeadersFilter`, `withTracerResponseHeadersFilter`, and `withTracerHeadersFilter` combinators to `HttpClient` for controlling which headers are captured as OTEL span attributes.
