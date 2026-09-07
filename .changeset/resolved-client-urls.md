---
"@effect/platform-browser": patch
"@effect/platform-node": patch
"effect": patch
---

Expose the resolved response URL on `HttpClientResponse`, including query parameters and excluding the hash. Fetch and
XMLHttpRequest clients preserve the URL reported by the underlying response after redirects. Other clients report the
resolved URL of the request that produced the response; Node clients follow redirects with `HttpClient.followRedirects`.
Pass the originating request through `HttpApiTest` so its responses also expose the resolved URL.
