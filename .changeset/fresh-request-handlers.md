---
"effect": patch
"@effect/platform-node": patch
---

Scope pre-response handlers to each server request so retries and redirects in `HttpApiTest` do not reuse handlers from earlier attempts. Preserve request identity through modified requests and decompression wrappers.
