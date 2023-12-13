import * as Http from "@effect/platform-node/HttpServer"
import { runMain } from "@effect/platform-node/Runtime"
import { Effect, Layer } from "effect"
import { createServer } from "node:http"

const ServerLive = Http.server.layer(() => createServer(), { port: 3000 })

const HttpLive = Http.server.serve(Effect.succeed(Http.response.text("Hello World")))
  .pipe(
    Layer.provide(ServerLive)
  )

runMain(Layer.launch(HttpLive))
