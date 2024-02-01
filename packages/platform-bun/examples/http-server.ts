import { HttpServerBun, RuntimeBun } from "@effect/platform-bun"
import * as Http from "@effect/platform/HttpServer"
import { Effect, Layer } from "effect"

const HttpLive = Http.server.serve(Effect.succeed(Http.response.text("Hello World"))).pipe(
  Layer.provide(HttpServerBun.server.layer({ port: 3000 }))
)

RuntimeBun.runMain(Layer.launch(HttpLive))
