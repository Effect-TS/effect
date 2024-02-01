import { NodeContext, NodeHttpServer, NodeRuntime } from "@effect/platform-node"
import * as Http from "@effect/platform/HttpServer"
import * as Schema from "@effect/schema/Schema"
import { Effect, Layer } from "effect"
import { createServer } from "node:http"

const ServerLive = NodeHttpServer.server.layer(() => createServer(), { port: 3000 })

const HttpLive = Http.router.empty.pipe(
  Http.router.get(
    "/",
    Effect.map(
      Http.request.ServerRequest,
      (req) => Http.response.text(req.url)
    )
  ),
  Http.router.get(
    "/healthz",
    Http.response.text("ok").pipe(
      Http.middleware.withLoggerDisabled
    )
  ),
  Http.router.post(
    "/upload",
    Effect.gen(function*(_) {
      const data = yield* _(Http.request.schemaBodyForm(Schema.struct({
        files: Http.multipart.filesSchema
      })))
      console.log("got files", data.files)
      return Http.response.empty()
    }).pipe(Effect.scoped)
  ),
  Http.server.serve(Http.middleware.logger),
  Http.server.withLogAddress,
  Layer.provide(ServerLive),
  Layer.provide(NodeContext.layer)
)

NodeRuntime.runMain(Layer.launch(HttpLive))
