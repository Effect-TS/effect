---
"effect": minor
---

Detect unsupported streaming request bodies in `FetchHttpClient` and fail with an `EncodeError` instead of silently sending `[object ReadableStream]`. Set `FetchHttpClient.StreamBodyFallback` to `"buffer"` to buffer the body in memory on those runtimes instead.
