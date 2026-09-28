---
"effect": patch
"@effect/platform-node": patch
"@effect/platform-deno": patch
---

Fix file response content types: honor the `contentType` option and preserve explicit headers, including MIME types set by `HttpStaticServer`. The default `HttpPlatform.layer` now infers missing content types from file extensions.

Web file responses on the default, Node, and Deno platforms prefer explicit content types, then nonempty `File.type`, then the file extension.

Removed the unused `contentLength` option from `HttpServerResponse.file`; lengths are calculated from the file and requested range.
