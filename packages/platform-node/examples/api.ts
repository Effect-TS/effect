import { Api, ApiBuilder, ApiEndpoint, ApiGroup, HttpMiddleware, HttpServer } from "@effect/platform"
import { NodeHttpServer, NodeRuntime } from "@effect/platform-node"
import { Schema } from "@effect/schema"
import { Context, Effect, Layer } from "effect"
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
      ApiEndpoint.path(Schema.Struct({
        id: Schema.NumberFromString
      })),
      ApiEndpoint.success(User),
      ApiEndpoint.error(Schema.String)
    )
  ),
  ApiGroup.add(
    ApiEndpoint.post("create", "/").pipe(
      ApiEndpoint.payload(Schema.Struct({
        name: Schema.String
      })),
      ApiEndpoint.success(User)
    )
  ),
  ApiGroup.add(
    ApiEndpoint.get("me", "/me").pipe(
      ApiEndpoint.success(User)
    )
  ),
  ApiGroup.addError(Unauthorized, { status: 401 })
)

const api = Api.make("My api").pipe(
  Api.addGroup("/users", users)
)

class CurrentUser extends Context.Tag("CurrentUser")<CurrentUser, User>() {}

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
      )),
    ApiBuilder.handle("me", (_) => CurrentUser),
    ApiBuilder.middleware(Effect.provideService(CurrentUser, new User({ id: 1000, name: "Provided" })))
  ))

ApiBuilder.serve(api, HttpMiddleware.logger).pipe(
  HttpServer.withLogAddress,
  Layer.provide(UsersLive),
  Layer.provide(ApiBuilder.middlewareCors()),
  Layer.provide(NodeHttpServer.layer(createServer, { port: 3000 })),
  Layer.launch,
  NodeRuntime.runMain
)
