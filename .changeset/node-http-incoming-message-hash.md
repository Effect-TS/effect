---
"@effect/platform-node": patch
---

Fix `HttpApiClient` on `NodeHttpClient.layerNodeHttp` dying, instead of failing with a `StatusCodeError`, when a declared error response has a non-JSON body.
