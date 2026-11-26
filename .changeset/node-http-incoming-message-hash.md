---
"@effect/platform-node": patch
---

Fix `HttpApiClient` with `NodeHttpClient.layerNodeHttp` crashing when an error response body isn't JSON, like an HTML 404 page.
