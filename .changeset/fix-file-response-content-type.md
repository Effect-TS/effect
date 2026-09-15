---
"effect": patch
---

Fix file response content types: honor the `contentType` option and preserve explicit headers, including MIME types set by `HttpStaticServer`. The default `HttpPlatform.layer` now infers missing content types from file extensions.
