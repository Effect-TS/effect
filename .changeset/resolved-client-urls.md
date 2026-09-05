---
"@effect/platform-browser": patch
"@effect/platform-node": patch
"effect": patch
---

Expose the final response URL on `HttpClientResponse`. Fetch and XMLHttpRequest clients now preserve the URL reported by
the underlying response after redirects, while other clients report the URL of the request that produced the response.
