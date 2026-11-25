---
"@effect/platform-bun": patch
---

Infer the `Content-Type` of `HttpServerResponse.fileWeb` responses from the file name when `File.type` is empty, as the Node and Deno platforms do.
