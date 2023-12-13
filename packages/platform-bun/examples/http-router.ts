import * as NodeContext from "@effect/platform-bun/BunContext"
import * as Http from "@effect/platform-bun/HttpServer"
import { runMain } from "@effect/platform-bun/Runtime"
import * as Schema from "@effect/schema/Schema"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"

const ServerLive = Http.server.layer({ port: 3000 })

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
      const data = yield* _(Http.request.schemaFormData(Schema.struct({
        files: Http.formData.filesSchema
      })))
      console.log("got files", data.files)
      return Http.response.empty()
    }).pipe(Effect.scoped)
  ),
  Http.server.serve(Http.middleware.logger),
  Layer.provide(ServerLive),
  Layer.provide(NodeContext.layer)
)

runMain(Layer.launch(HttpLive))
