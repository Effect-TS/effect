import * as Effect from "@effect/io/Effect"
import * as Http from "@effect/platform-bun/HttpServer"
import { runMain } from "@effect/platform-bun/Runtime"

const ServerLive = Http.server.layer({ port: 3000 })

Http.server.serve(Effect.succeed(Http.response.text("Hello World"))).pipe(
  Effect.scoped,
  Effect.provide(ServerLive),
  Effect.tapErrorCause(Effect.logError),
  runMain
)
