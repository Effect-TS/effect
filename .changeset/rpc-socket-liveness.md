---
"effect": patch
---

Add configurable `pingInterval` and `pingTimeout` to RPC socket clients, counting any decoded server frame as liveness. Forward `retryPolicy` through `layerProtocolSocket`. The default ping interval and timeout remain 5 seconds.
