---
"@effect/platform": patch
---

HttpApiBuilder: URL parameters are now automatically converted to arrays when needed, closes #4442.

**Example**

```ts
import {
  HttpApi,
  HttpApiBuilder,
  HttpApiEndpoint,
  HttpApiGroup,
  HttpMiddleware,
  HttpServer
} from "@effect/platform"
import { NodeHttpServer, NodeRuntime } from "@effect/platform-node"
import { Effect, Layer, Schema } from "effect"
import { createServer } from "node:http"

const api = HttpApi.make("api").add(
  HttpApiGroup.make("group").add(
    HttpApiEndpoint.get("get", "/")
      .addSuccess(Schema.String)
      .setUrlParams(
        Schema.Struct({
          param: Schema.NonEmptyArray(Schema.String)
        })
      )
  )
)

const usersGroupLive = HttpApiBuilder.group(api, "group", (handlers) =>
  handlers.handle("get", (req) =>
    Effect.succeed(req.urlParams.param.join(", "))
  )
)

const MyApiLive = HttpApiBuilder.api(api).pipe(Layer.provide(usersGroupLive))

const HttpLive = HttpApiBuilder.serve(HttpMiddleware.logger).pipe(
  Layer.provide(MyApiLive),
  HttpServer.withLogAddress,
  Layer.provide(NodeHttpServer.layer(createServer, { port: 3000 }))
)

Layer.launch(HttpLive).pipe(NodeRuntime.runMain)
```

Previously, if a query parameter was defined as a `NonEmptyArray` (an array that requires at least one element), providing a single value would cause a parsing error.

For example, this worked fine:

```sh
curl "http://localhost:3000/?param=1&param=2"
```

But this would fail:

```sh
curl "http://localhost:3000/?param=1"
```

Resulting in an error because `"1"` was treated as a string instead of an array.

With this update, single values are automatically wrapped in an array, so they match the expected schema without requiring manual fixes.
