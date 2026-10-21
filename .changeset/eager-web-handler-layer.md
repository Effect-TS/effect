---
"@effect/platform": patch
---

Build the layer eagerly in `HttpApp.toWebHandlerLayerWith`, so an aborted first request can no longer leave the handler hanging on runtimes such as Cloudflare workerd.
