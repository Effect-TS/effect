---
"effect": patch
"@effect/platform-node": patch
"@effect/platform-bun": patch
"@effect/platform-deno": patch
---

Fix a request body read before `HttpServerRequest.modify` being lost to the modified request. A handler on a prefixed `HttpRouter` route, which receives `request.modify({ url })`, got an empty body on Node, or failed with "Body has already been read" on web runtimes, when a middleware had already read the body. Requests created with `modify`, including those of the `HttpMiddleware.decompression` request, now share the body reads of the request they came from.
