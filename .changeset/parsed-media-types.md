---
"effect": patch
"@effect/jsdocs": patch
"@effect/openapi-generator": patch
---

Add a parsed `effect/unstable/http/MediaType` value with validated construction, deterministic formatting, input conversion, parameter and RFC 6838 structured-suffix access, charset-aware matching, common JSON/XML/text predicates, `Schema.MediaType` codecs, and `Config.MediaType` support. `HttpApiSchema` content-type options accept media type values, strings, or structured parts and normalize them into parsed encoding metadata. `PayloadEncoding["contentType"]`, `ResponseEncoding["contentType"]`, and `StreamSchema["contentType"]` now return `MediaType` values instead of strings; use `MediaType.format` when a string is required. HTTP API dispatch, response selection, multipart parsing, and OpenAPI generation compare validated media-type essences. Missing response content types remain distinct from empty or malformed fields, and malformed request content types continue to receive a 415 response. OpenAPI-generated HTTP APIs pass custom content-type strings through these normalized input boundaries. The JSDoc checker now accepts the valueless `@unstable` marker on public declarations.
