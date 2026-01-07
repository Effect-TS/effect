---
"@effect/cluster": patch
---

Fix `layerHttpOptions` and `layerWebsocketOptions` to use `layerProtocolHttpRouter` and `layerProtocolWebsocketRouter` instead of `layerProtocolHttp` and `layerProtocolWebsocket`, which were creating their own internal routers instead of using the router from context. This caused 404 errors for RPC routes when using `HttpRunner.layerHttp`.
