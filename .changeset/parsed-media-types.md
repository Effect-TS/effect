---
"effect": patch
"@effect/openapi-generator": patch
---

Add a parsed `effect/unstable/http/MediaType` value with validated construction, deterministic formatting, input conversion, parameter and RFC 6838 structured-suffix access, charset-aware matching, common JSON/XML/text predicates, `Schema.MediaType` codecs, and `Config.MediaType` support. `HttpApiSchema` content-type options accept media type values, strings, or structured parts and normalize them into parsed encoding metadata, formatting them only when producing OpenAPI documents or wire values. HTTP API dispatch, response selection, and multipart parsing compare validated media-type essences; missing response content types remain distinct from empty or malformed fields, and malformed request content types continue to receive a 415 response. OpenAPI-generated HTTP APIs pass custom content-type strings through these normalized input boundaries.
