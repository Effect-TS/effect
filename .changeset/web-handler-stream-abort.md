---
"effect": patch
---

`HttpEffect.toWebHandler` now interrupts a streamed response body when the request is aborted after its headers were sent, even if the body is no longer being read, which releases the request scope. Requests whose signal is already aborted before the request or during synchronous handler startup are interrupted too. `Stream.toReadableStreamWith` and `HttpServerResponse.toWeb` accept a `signal` option for this.
