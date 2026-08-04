---
"effect": patch
---

unstable/httpapi HttpApiSchema: carry `httpApiStatus` in the key context so a named schema reused with `status()` keeps one representation identity — one OpenAPI component referenced by every status — instead of throwing `Duplicate identifier`
