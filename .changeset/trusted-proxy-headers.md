---
"effect": patch
"@effect/platform-node": patch
"@effect/platform-bun": patch
"@effect/platform-deno": patch
---

Require an explicit trusted proxy policy before applying forwarded headers.

`HttpMiddleware.xForwardedHeaders` now takes `{ trustedProxies }` and only applies `X-Forwarded-*` headers when the connecting peer is trusted. `X-Forwarded-For` is read from the right, skipping trusted proxies, and `X-Forwarded-Host` / `X-Forwarded-Proto` are only used when they line up with it.

`HttpServerRequest.toURL` no longer reads `x-forwarded-proto` directly. It uses the new `request.protocol`, set by the trusted proxy middleware, before the transport scheme. The connecting peer stays available as `request.peerAddress`.

```ts
import { HttpMiddleware } from "effect/http"
import { IpNetwork } from "effect/net"

// before
HttpMiddleware.xForwardedHeaders

// after
HttpMiddleware.xForwardedHeaders({
  trustedProxies: [IpNetwork.fromStringUnsafe("10.0.0.0/8")]
})
```
