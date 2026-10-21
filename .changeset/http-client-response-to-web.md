---
"effect": patch
---

Add `HttpClientResponse.toWeb`. It returns the original Web `Response` for fetch-backed responses, so the body keeps runtime capabilities such as workerd's known length (for example, when writing to Cloudflare R2).
