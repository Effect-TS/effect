---
"@effect/platform-node": patch
---

Add `NodeHttpServer.layerTest`.

```ts
import { HttpClientRequest, HttpRouter, HttpServer } from "@effect/platform"
import { NodeHttpServer } from "@effect/platform-node"
import { expect, it } from "@effect/vitest"
import { Effect } from "effect"

it.scoped("test", () =>
  Effect.gen(function* () {
    yield* HttpServer.serveEffect(HttpRouter.empty)
    const response = yield* HttpClientRequest.get("/")
    expect(response.status, 404)
  }).pipe(Effect.provide(NodeHttpServer.layerTest))
)
```
