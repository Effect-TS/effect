---
"@effect/platform-bun": patch
---

Add `BunHttpServer.layerTest`.

```ts
import { HttpClientRequest, HttpRouter, HttpServer } from "@effect/platform"
import { BunHttpServer } from "@effect/platform-bun"
import { expect, it } from "bun:test"
import { Effect } from "effect"

it("test", () =>
  Effect.gen(function* (_) {
    yield* HttpServer.serveEffect(HttpRouter.empty)
    const response = yield* HttpClientRequest.get("/non-existing")
    expect(response.status).toEqual(404)
  }).pipe( Effect.provide(BunHttpServer.layerTest), Effect.scoped, Effect.runPromise))
```
