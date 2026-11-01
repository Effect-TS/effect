import * as NodeHttpServer from "@effect/platform-node/NodeHttpServer"
import * as Effect from "effect/Effect"
import * as HttpApi from "effect/http-api/HttpApi"
import * as HttpApiBuilder from "effect/http-api/HttpApiBuilder"
import * as HttpApiEndpoint from "effect/http-api/HttpApiEndpoint"
import * as HttpApiGroup from "effect/http-api/HttpApiGroup"
import * as HttpRouter from "effect/http/HttpRouter"
import * as Layer from "effect/Layer"
import * as Schema from "effect/Schema"
import { createServer } from "node:http"

const Api = HttpApi.make("bundle").add(
  HttpApiGroup.make("users").add(
    HttpApiEndpoint.get("get", "/users/:id", {
      params: { id: Schema.String },
      success: Schema.Struct({ id: Schema.String, name: Schema.String })
    })
  )
)

const Users = HttpApiBuilder.group(
  Api,
  "users",
  (handlers) => handlers.handle("get", ({ params }) => Effect.succeed({ id: params.id, name: "Alice" }))
)

const Routes = HttpApiBuilder.layer(Api).pipe(Layer.provide(Users))

HttpRouter.serve(Routes).pipe(
  Layer.provide(NodeHttpServer.layer(createServer, { port: 3000 })),
  Layer.launch,
  Effect.runPromise
)
