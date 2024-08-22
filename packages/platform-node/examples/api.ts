import { Api, ApiBuilder, ApiEndpoint, ApiGroup, HttpMiddleware, HttpServer } from "@effect/platform"
import { NodeHttpServer, NodeRuntime } from "@effect/platform-node"
import { Schema } from "@effect/schema"
import { Effect, Layer } from "effect"
import { createServer } from "node:http"

class User extends Schema.Class<User>("User")({
  id: Schema.Number,
  name: Schema.String
}) {}

class Unauthorized extends Schema.TaggedError<Unauthorized>()("Unauthorized", {
  message: Schema.String
}) {}

const users = ApiGroup.make("users").pipe(
  ApiGroup.add(
    ApiEndpoint.get("findById", "/:id").pipe(
      ApiEndpoint.setPathSchema(Schema.Struct({
        id: Schema.NumberFromString
      })),
      ApiEndpoint.setSuccess(User),
      ApiEndpoint.setError(Schema.String)
    )
  ),
  ApiGroup.add(
    ApiEndpoint.post("create", "/").pipe(
      ApiEndpoint.setPayload(Schema.Struct({
        name: Schema.String
      })),
      ApiEndpoint.setSuccess(User),
      ApiEndpoint.setError(Schema.String)
    )
  ),
  ApiGroup.addError(Unauthorized, { status: 401 })
)

const api = Api.make("My api").pipe(
  Api.addGroup("/users", users)
)

const UsersLive = ApiBuilder.group(api, "users", (handlers) =>
  handlers.pipe(
    ApiBuilder.handle("create", (_) =>
      Effect.succeed(
        new User({
          id: 1,
          name: "John"
        })
      )),
    ApiBuilder.handle("findById", (_) =>
      Effect.succeed(
        new User({
          id: _.path.id,
          name: "John"
        })
      ))
  ))

ApiBuilder.serve(api, HttpServer.serve(HttpMiddleware.logger)).pipe(
  Layer.provide(UsersLive),
  HttpServer.withLogAddress,
  Layer.provide(NodeHttpServer.layer(createServer, { port: 3000 })),
  Layer.launch,
  NodeRuntime.runMain
)
