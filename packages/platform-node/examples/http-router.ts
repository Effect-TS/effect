import {
  HttpMiddleware,
  HttpRouter,
  HttpServer,
  HttpServerRequest,
  HttpServerResponse,
  Multipart
} from "@effect/platform"
import { NodeHttpServer, NodeRuntime } from "@effect/platform-node"
import { Effect, Layer, Schedule, Stream } from "effect"
import * as Schema from "effect/Schema"
import { createServer } from "node:http"

const ServerLive = NodeHttpServer.layer(() => createServer(), { port: 3000 })

const HttpLive = HttpRouter.empty.pipe(
  HttpRouter.get(
    "/",
    Effect.map(
      HttpServerRequest.HttpServerRequest,
      (req) => HttpServerResponse.text(req.url)
    )
  ),
  HttpRouter.get(
    "/healthz",
    HttpServerResponse.text("ok").pipe(
      HttpMiddleware.withLoggerDisabled
    )
  ),
  HttpRouter.post(
    "/upload",
    Effect.gen(function*() {
      const data = yield* HttpServerRequest.schemaBodyForm(Schema.Struct({
        files: Multipart.FilesSchema
      }))
      console.log("got files", data.files)
      return HttpServerResponse.empty()
    })
  ),
  HttpRouter.get(
    "/ws",
    Stream.fromSchedule(Schedule.spaced(1000)).pipe(
      Stream.map(JSON.stringify),
      Stream.encodeText,
      Stream.pipeThroughChannel(HttpServerRequest.upgradeChannel()),
      Stream.decodeText(),
      Stream.runForEach((_) => Effect.log(_)),
      Effect.annotateLogs("ws", "recv"),
      Effect.as(HttpServerResponse.empty())
    )
  ),
  HttpServer.serve(HttpMiddleware.logger),
  HttpServer.withLogAddress,
  Layer.provide(ServerLive)
)

NodeRuntime.runMain(Layer.launch(HttpLive))
