import {
  HttpMiddleware,
  HttpRouter,
  HttpServer,
  HttpServerRequest,
  HttpServerRespondable,
  HttpServerResponse,
  Multipart
} from "@effect/platform"
import { BunHttpServer, BunRuntime } from "@effect/platform-bun"
import { Effect, Layer, Schedule, Schema, Stream } from "effect"

const ServerLive = BunHttpServer.layer({ port: 3000 })

class MyError extends Schema.TaggedError<MyError>()("MyError", {
  message: Schema.String
}) {
  [HttpServerRespondable.symbol]() {
    return HttpServerResponse.schemaJson(MyError)(this, { status: 403 })
  }
}

const HttpLive = HttpRouter.empty.pipe(
  HttpRouter.get(
    "/",
    Effect.map(
      HttpServerRequest.HttpServerRequest,
      (req) => HttpServerResponse.text(req.url)
    )
  ),
  HttpRouter.get("/package", HttpServerResponse.file("./package.json")),
  HttpRouter.get("/fail", new MyError({ message: "failed" })),
  HttpRouter.get("/sleep", Effect.as(Effect.sleep("10 seconds"), HttpServerResponse.empty())),
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

BunRuntime.runMain(Layer.launch(HttpLive))
