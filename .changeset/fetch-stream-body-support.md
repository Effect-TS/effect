---
"effect": minor
---

Detect unsupported streaming request bodies in `FetchHttpClient` and fail with an `EncodeError` instead of silently sending `[object ReadableStream]`. Provide `FetchHttpClient.StreamBodyFallback` as `"buffer"` to opt into collecting the entire body in memory before sending on unsupported runtimes.
