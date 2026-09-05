---
"@effect/platform": patch
---

Stop `HttpIncomingMessage` inspection from consuming the body. Logging or `toJSON`-ing an `HttpClientResponse` (or server request) with a streamed body previously read the body eagerly, which locked the underlying one-shot `ReadableStream` and made subsequent `response.stream` reads fail with `ReadableStream is locked`.
