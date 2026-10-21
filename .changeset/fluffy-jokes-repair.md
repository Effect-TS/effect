---
"@effect/platform": patch
---

Preserve annotations on `Union` and multi-value `Literal` schemas in `HttpApi`, and stop a `Union` response status set on one endpoint from leaking into other endpoints that reuse the same schema.
