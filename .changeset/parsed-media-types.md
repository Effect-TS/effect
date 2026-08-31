---
"effect": patch
---

Add a parsed `effect/unstable/http/MediaType` value with validated construction, deterministic formatting, parameter and RFC 6838 structured-suffix access, charset-aware matching, common JSON/XML/text predicates, and Schema codecs. HTTP API content-type dispatch and multipart parsing now compare validated media-type essences while preserving string-facing transport APIs; malformed request content types continue to receive a 415 response.
