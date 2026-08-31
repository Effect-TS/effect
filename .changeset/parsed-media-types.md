---
"effect": patch
"@effect/openapi-generator": patch
---

Add a parsed `effect/unstable/http/MediaType` value with validated construction, deterministic formatting, parameter and RFC 6838 structured-suffix access, charset-aware matching, common JSON/XML/text predicates, `Schema.MediaType` codecs, and `Config.MediaType` support. `HttpApiSchema` content-type options now require parsed media types, while encoding metadata, OpenAPI documents, and wire values remain string-based. HTTP API dispatch and multipart parsing compare validated media-type essences; malformed request content types continue to receive a 415 response. OpenAPI-generated HTTP APIs now construct parsed media types for custom content-type declarations.
