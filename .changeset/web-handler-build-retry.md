---
"effect": patch
---

Retry the layer build in `HttpEffect.toWebHandlerLayerWith` when the first request fails or aborts.

The handlers returned by `HttpEffect.toWebHandlerLayerWith`, `HttpEffect.toWebHandlerLayer`, and
`HttpRouter.toWebHandler` build their layer lazily inside the first request and memoize the resulting
promise. On runtimes that never settle promises created inside an aborted request (e.g. Cloudflare
workerd), a client-aborted first request left the memoized promise pending forever, permanently hanging
every subsequent request in that isolate. A failed build was also memoized forever, so a transient build
error kept failing all later requests.

The memoized build is now forgotten when it fails, or when the request that started it is aborted before
the build completes, so a later request retries the build instead of waiting on a dead promise.
