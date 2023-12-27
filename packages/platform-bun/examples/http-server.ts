import * as Http from "@effect/platform-bun/HttpServer"
import { runMain } from "@effect/platform-bun/Runtime"
import { Effect, Layer } from "effect"

const HttpLive = Http.server.serve(Effect.succeed(Http.response.text("Hello World"))).pipe(
  Layer.provide(Http.server.layer({ port: 3000 }))
)

runMain(Layer.launch(HttpLive))
