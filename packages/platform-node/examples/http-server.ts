import { NodeHttpServer, NodeRuntime } from "@effect/platform-node"
import * as Http from "@effect/platform/HttpServer"
import { Effect, Layer } from "effect"
import { createServer } from "node:http"

const ServerLive = NodeHttpServer.server.layer(() => createServer(), { port: 3000 })

const HttpLive = Http.server.serve(Effect.succeed(Http.response.text("Hello World")))
  .pipe(
    Layer.provide(ServerLive)
  )

NodeRuntime.runMain(Layer.launch(HttpLive))
