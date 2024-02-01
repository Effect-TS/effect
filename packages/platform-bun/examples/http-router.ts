import { BunHttpServer, BunRuntime } from "@effect/platform-bun"
import * as Http from "@effect/platform/HttpServer"
import { Schema } from "@effect/schema"
import { Effect, Layer } from "effect"

const ServerLive = BunHttpServer.server.layer({ port: 3000 })

const HttpLive = Http.router.empty.pipe(
  Http.router.get(
    "/",
    Effect.map(
      Http.request.ServerRequest,
      (req) => Http.response.text(req.url)
    )
  ),
  Http.router.get("/package", Http.response.file("./package.json")),
  Http.router.get("/sleep", Effect.as(Effect.sleep("10 seconds"), Http.response.empty())),
  Http.router.post(
    "/upload",
    Effect.gen(function*(_) {
      const data = yield* _(Http.request.schemaBodyForm(Schema.struct({
        files: Http.multipart.filesSchema
      })))
      console.log("got files", data.files)
      return Http.response.empty()
    })
  ),
  Http.server.serve(Http.middleware.logger),
  Http.server.withLogAddress,
  Layer.provide(ServerLive)
)

BunRuntime.runMain(Layer.launch(HttpLive))
