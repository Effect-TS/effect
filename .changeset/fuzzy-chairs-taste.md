---
"@effect/platform": patch
---

Allow `HttpClient.followRedirects` to take effect on `FetchHttpClient` by exposing `redirect` through the requestInit FiberRef and documenting the interaction.
