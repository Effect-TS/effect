---
"effect": patch
"@effect/platform-node": patch
"@effect/platform-bun": patch
"@effect/platform-deno": patch
---

Allow buffered payloads and typed `101` response headers on `HttpApiSchema.Upgrade` endpoints.

- `HttpApiSchema.Upgrade({ protocol, headers })` declares `101` headers, encoded like `WithHeaders` headers. Clients decode them and return `{ headers, socket }`, and OpenAPI lists them on the `101`.
- Upgrade endpoints can declare buffered payloads. Streaming payloads are still rejected.
- Handlers receive an `upgrade` function instead of `socket`: `upgrade()`, or `upgrade({ headers })` when headers are declared.
- `426 Upgrade Required` is returned before the payload is decoded.
- `HttpServerRequest` gains `upgradeWith({ headers })`, and `upgrade` is `upgradeWith({})`. Third-party `HttpServerRequest` implementations must add it. WebSocket upgrades fail when headers are given.
- `NodeHttpServer` waits for the request body to end before writing the `101`. On Node 25 and older, which do not parse upgrade request bodies, it reads `Content-Length` bodies from the connection and answers chunked ones with `411 Length Required`.
- `NodeMultipart` fails with a `MultipartError` when its source stream errors, instead of waiting for more input.
