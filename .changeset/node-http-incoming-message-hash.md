---
"@effect/platform-node": patch
---

Fix `HttpApiClient` with `NodeHttpClient.layerNodeHttp` dying when a declared error response body isn't JSON, like an HTML 404 page. Node HTTP client responses and server requests now hash and compare by reference.
