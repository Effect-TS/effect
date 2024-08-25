import {
  Api,
  ApiBuilder,
  ApiClient,
  ApiEndpoint,
  ApiGroup,
  ApiSchema,
  ApiSecurity,
  HttpClient,
  HttpMiddleware,
  HttpServer,
  OpenApi
} from "@effect/platform"
import { NodeHttpServer, NodeRuntime } from "@effect/platform-node"
import { Schema } from "@effect/schema"
import { Context, Effect, Layer, Redacted } from "effect"
import { createServer } from "node:http"

class User extends Schema.Class<User>("User")({
  id: Schema.Number,
  name: Schema.String
}) {}

class CurrentUser extends Context.Tag("CurrentUser")<CurrentUser, User>() {}

class Unauthorized extends Schema.TaggedError<Unauthorized>()("Unauthorized", {
  message: Schema.String
}, ApiSchema.annotations({ status: 401 })) {}

const security = ApiSecurity.bearer()

const securityMiddleware = ApiBuilder.middlewareSecurity(
  security,
  CurrentUser,
  (token) => Effect.succeed(new User({ id: 1000, name: `Authenticated with ${Redacted.value(token)}` }))
)

const users = ApiGroup.make("users").pipe(
  ApiGroup.add(
    ApiEndpoint.get("findById", "/:id").pipe(
      ApiEndpoint.path(Schema.Struct({
        id: Schema.NumberFromString
      })),
      ApiEndpoint.success(User),
      ApiEndpoint.error(Schema.String.pipe(
        ApiSchema.asEmpty({ status: 413, decode: () => "boom" })
      ))
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
  ApiGroup.addError(Unauthorized),
  ApiGroup.prefix("/users")
)

const api = Api.empty.pipe(
  Api.addGroup(users),
  OpenApi.annotate({
    title: "Users API",
    description: "API for managing users"
  })
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
      )),
    ApiBuilder.handle("me", (_) => CurrentUser),
    securityMiddleware
  ))

const ApiLive = ApiBuilder.api(api).pipe(
  Layer.provide(UsersLive)
)

ApiBuilder.serve(HttpMiddleware.logger).pipe(
  Layer.provide(ApiBuilder.middlewareOpenApi()),
  Layer.provide(ApiLive),
  Layer.provide(ApiBuilder.middlewareCors()),
  HttpServer.withLogAddress,
  Layer.provide(NodeHttpServer.layer(createServer, { port: 3000 })),
  Layer.launch,
  NodeRuntime.runMain
)

Effect.gen(function*() {
  yield* Effect.sleep(2000)
  const client = yield* ApiClient.make(api, {
    baseUrl: "http://localhost:3000"
  })
  const user = yield* client.users.findById({ path: { id: 123 } })
  console.log(user)
}).pipe(
  Effect.provide(HttpClient.layer),
  NodeRuntime.runMain
)
