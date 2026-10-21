---
"@effect/platform-node": patch
---

Support HTTP/2 servers in `NodeHttpServer`. `make`, `layerServer`, `layer` and `layerConfig` accept `Http2.createServer()` and `Http2.createSecureServer()`, including `allowHTTP1`, without a cast. HTTP/2 requests no longer expose pseudo-headers, so `HttpServerRequest.toWeb` works, and `toURL` uses the request's `:scheme` and `:authority`. Responses drop the connection-specific headers HTTP/2 forbids instead of being lost, a body that fails after the headers were sent resets the stream with `INTERNAL_ERROR` instead of ending cleanly, and shutdown closes idle HTTP/2 sessions, so it no longer waits for the graceful timeout on Node 22.

Breaking (types only): `NodeHttpServerRequest.toIncomingMessage` and `toServerResponse` now return `Http.IncomingMessage | Http2.Http2ServerRequest` and `Http.ServerResponse | Http2.Http2ServerResponse`. Code that uses members only the HTTP/1.1 objects have needs to narrow first, for example on `httpVersionMajor`.
