---
"@effect/platform": minor
---

allow overriding http span names

```ts
import { FetchHttpClient, HttpClient } from "@effect/platform"
import { NodeRuntime } from "@effect/platform-node"
import { Effect } from "effect"

Effect.gen(function* () {
  const client = (yield* HttpClient.HttpClient).pipe(
    // Customize the span names for this HttpClient
    HttpClient.withSpanNameGenerator(
      (request) => `http.client ${request.method} ${request.url}`
    )
  )

  yield* client.get("https://jsonplaceholder.typicode.com/posts/1")
}).pipe(Effect.provide(FetchHttpClient.layer), NodeRuntime.runMain)
```

And for a server:

```ts
import {
  HttpMiddleware,
  HttpRouter,
  HttpServer,
  HttpServerResponse
} from "@effect/platform"
import { NodeHttpServer, NodeRuntime } from "@effect/platform-node"
import { Layer } from "effect"
import { createServer } from "http"

HttpRouter.empty.pipe(
  HttpRouter.get("/", HttpServerResponse.empty()),
  HttpServer.serve(),
  // Customize the span names for this HttpApp
  HttpMiddleware.withSpanNameGenerator((request) => `GET ${request.url}`),
  Layer.provide(NodeHttpServer.layer(createServer, { port: 3000 })),
  Layer.launch,
  NodeRuntime.runMain
)
```
