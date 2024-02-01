import { BunHttpServer, BunRuntime } from "@effect/platform-bun"
import * as Http from "@effect/platform/HttpServer"
import { Effect, Layer } from "effect"

const HttpLive = Http.server.serve(Effect.succeed(Http.response.text("Hello World"))).pipe(
  Layer.provide(BunHttpServer.server.layer({ port: 3000 }))
)

BunRuntime.runMain(Layer.launch(HttpLive))
