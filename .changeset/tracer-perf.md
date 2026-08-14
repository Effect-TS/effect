---
"effect": patch
---

Improve tracing performance in span creation and the HTTP tracer middleware.

- `NativeSpan` id generation now fills a batched random byte buffer (4 bytes
  per `Math.random()` call) and maps bytes through a byte-to-hex table instead
  of one `Math.random()` call per character (~4x faster).
- `makeSpanUnsafe` avoids `Object.entries` allocations when applying span
  annotations and attributes.
- The HTTP server tracer middleware computes `url.*` span attributes with
  string operations for origin-form request targets, avoiding a `URL` parse
  and re-serialization per request.
- Header span attributes in the server middleware and `HttpClient` are
  emitted with an in-place redaction check (`Headers.isRedactedName`) instead
  of copying the header record and allocating `Redacted` values.
