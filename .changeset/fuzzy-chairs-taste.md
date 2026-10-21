---
"@effect/platform": patch
---

Document that `HttpClient.followRedirects` only sees redirects from `FetchHttpClient` when `FetchHttpClient.RequestInit` sets `redirect: "manual"`.
