---
"effect": patch
---

Fix `Content-Type` handling for file responses: `HttpServerResponse.file` and `fileWeb` now honour the `contentType` option, a `content-type` header set with `setHeader(s)` on a streamed response is no longer replaced with the body's default when the response is sent, `HttpStaticServer` serves files with the type from its MIME table, and the default `HttpPlatform.layer` derives the type from the file extension.
