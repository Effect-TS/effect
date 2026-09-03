---
"effect": patch
"@effect/platform-node": patch
"@effect/platform-bun": patch
---

Improve HTTP server and `HttpRouter` request throughput.

- `FindMyWay`: static routes match with a single map lookup, single trailing
  parameter routes (`/users/:id`) match with a prefix comparison instead of a
  radix tree walk, route parameter objects are compiled into fast-mode object
  literals, and the per-request backtracking stack and empty query string
  results are no longer allocated.
- `HttpRouter`: route dispatch avoids the per-request context restore and
  interruptibility wrapper primitives.
- `HttpEffect.toHandled`: the request scope and uninterruptibility wrappers
  are fused into a single primitive, and the server tracing middleware is
  skipped entirely when no tracing backend can observe the request.
- `HttpBody`: text bodies keep their original string and encode lazily, so
  Node servers write strings directly (a single socket write) and other
  adapters encode with `Buffer.from` instead of `TextEncoder` when available.
- `HttpServerResponse`: response construction no longer spreads and re-brands
  header records for the common no-custom-headers case, and `arrayBuffer`
  copies exactly the body bytes for pooled or offset `Buffer` views.
