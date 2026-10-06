---
"effect": minor
---

Type received and forwarded HTTP request methods as `string` so methods such as `PROPFIND` are represented accurately, including in AI HTTP error details. Exhaustive matches on request methods now need a fallback or a guard using `HttpMethod.isHttpMethod`.
