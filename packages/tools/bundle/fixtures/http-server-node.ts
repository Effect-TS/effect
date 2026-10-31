import * as NodeHttpServer from "@effect/platform-node/NodeHttpServer"
import * as Effect from "effect/Effect"
import * as HttpRouter from "effect/http/HttpRouter"
import * as HttpServerResponse from "effect/http/HttpServerResponse"
import * as Layer from "effect/Layer"
import { createServer } from "node:http"

const Routes = Layer.mergeAll(
  HttpRouter.add("GET", "/hello", HttpServerResponse.text("Hello")),
  HttpRouter.add(
    "GET",
    "/users/:id",
    Effect.map(HttpRouter.params, (params) => HttpServerResponse.jsonUnsafe({ id: params.id }))
  )
)

HttpRouter.serve(Routes).pipe(
  Layer.provide(NodeHttpServer.layer(createServer, { port: 3000 })),
  Layer.launch,
  Effect.runPromise
)
