---
"effect": patch
---

Add `HttpClientResponse.toWeb`, which returns the original Web `Response` of a fetch-backed response as `Some`, and `None` for other backends. The original body keeps runtime capabilities such as workerd's known length, so it can be written to Cloudflare R2 without copying.
