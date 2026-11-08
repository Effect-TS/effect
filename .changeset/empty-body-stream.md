---
"effect": patch
"@effect/platform-bun": patch
"@effect/platform-deno": patch
---

`HttpServerRequest.stream` now yields an empty stream for requests with a null body instead of failing with "can not create stream from empty body".
