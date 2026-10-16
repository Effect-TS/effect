---
"effect": patch
---

Add `HttpApiSchema.Upgrade` for HttpApi endpoints that switch the connection to another protocol with an HTTP/1.1 upgrade. The handler receives the connection as `socket`, the derived client returns the response headers and the connection as `HttpApiClient.Upgraded`, and OpenAPI documents a `101 Switching Protocols` response. Give `client` and `server` message schemas to exchange typed messages as one line of JSON each: the handler and client then receive an `HttpApiSchema.MessageSocket` with `messages`, `send`, and `end`.
