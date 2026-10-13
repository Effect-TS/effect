---
"@effect/platform-node": minor
---

Add typed connection options to `NodeHttpClient` for unix sockets and mutual TLS. `makeDispatcherOptions`, `layerDispatcherOptions` and `layerUndiciOptions` accept Undici `Agent` options such as `{ connect: { socketPath } }` or `{ connect: { ca, cert, key, servername } }`. `layerNodeHttpOptions` and the new `HttpAgentOptions` type do the same for the `node:http` client, with `socketPath` now typed.
