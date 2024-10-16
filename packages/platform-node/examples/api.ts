import {
  FetchHttpClient,
  HttpApi,
  HttpApiBuilder,
  HttpApiClient,
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiSchema,
  HttpApiSecurity,
  HttpApiSwagger,
  HttpMiddleware,
  HttpServer,
  OpenApi
} from "@effect/platform"
import { NodeHttpServer, NodeRuntime } from "@effect/platform-node"
import { Context, Effect, Layer, Redacted, Schema } from "effect"
import { createServer } from "node:http"

class User extends Schema.Class<User>("User")({
  id: Schema.Number,
  name: Schema.String
}) {}

class CurrentUser extends Context.Tag("CurrentUser")<CurrentUser, User>() {}

class Unauthorized extends Schema.TaggedError<Unauthorized>()("Unauthorized", {
  message: Schema.String
}, HttpApiSchema.annotations({ status: 401 })) {}

const security = HttpApiSecurity.bearer

const securityMiddleware = HttpApiBuilder.middlewareSecurity(
  security,
  CurrentUser,
  (token) => Effect.succeed(new User({ id: 1000, name: `Authenticated with ${Redacted.value(token)}` }))
)

class UsersApi extends HttpApiGroup.make("users").pipe(
  HttpApiGroup.add(
    HttpApiEndpoint.get("findById", "/:id").pipe(
      HttpApiEndpoint.setPath(Schema.Struct({
        id: Schema.NumberFromString
      })),
      HttpApiEndpoint.setSuccess(User),
      HttpApiEndpoint.setHeaders(Schema.Struct({
        page: Schema.NumberFromString.pipe(
          Schema.optionalWith({ default: () => 1 })
        )
      })),
      HttpApiEndpoint.addError(Schema.String.pipe(
        HttpApiSchema.asEmpty({ status: 413, decode: () => "boom" })
      ))
    )
  ),
  HttpApiGroup.add(
    HttpApiEndpoint.post("create", "/").pipe(
      HttpApiEndpoint.setPayload(HttpApiSchema.Multipart(Schema.Struct({
        name: Schema.String
      }))),
      HttpApiEndpoint.setSuccess(User)
    )
  ),
  HttpApiGroup.add(
    HttpApiEndpoint.get("me", "/me").pipe(
      HttpApiEndpoint.setSuccess(User)
    )
  ),
  HttpApiGroup.add(
    HttpApiEndpoint.get("csv", "/csv").pipe(
      HttpApiEndpoint.setSuccess(HttpApiSchema.Text({
        contentType: "text/csv"
      }))
    )
  ),
  HttpApiGroup.add(
    HttpApiEndpoint.get("binary", "/binary").pipe(
      HttpApiEndpoint.setSuccess(HttpApiSchema.Uint8Array())
    )
  ),
  HttpApiGroup.add(
    HttpApiEndpoint.get("urlParams", "/url-params").pipe(
      HttpApiEndpoint.setSuccess(
        Schema.Struct({
          id: Schema.NumberFromString,
          name: Schema.String
        }).pipe(
          HttpApiSchema.withEncoding({
            kind: "UrlParams"
          })
        )
      )
    )
  ),
  HttpApiGroup.addError(Unauthorized),
  HttpApiGroup.prefix("/users"),
  OpenApi.annotate({ security })
) {}

class MyApi extends HttpApi.empty.pipe(
  HttpApi.addGroup(UsersApi),
  OpenApi.annotate({
    title: "Users API",
    description: "API for managing users"
  })
) {}

const UsersLive = HttpApiBuilder.group(MyApi, "users", (handlers) =>
  handlers.pipe(
    HttpApiBuilder.handle("create", (_) => Effect.succeed(new User({ ..._.payload, id: 123 }))),
    HttpApiBuilder.handle("findById", (_) =>
      Effect.as(
        HttpApiBuilder.securitySetCookie(
          HttpApiSecurity.apiKey({
            in: "cookie",
            key: "token"
          }),
          "secret123"
        ),
        new User({
          id: _.path.id,
          name: `John Doe (${_.headers.page})`
        })
      )),
    HttpApiBuilder.handle("me", (_) => CurrentUser),
    HttpApiBuilder.handle("csv", (_) => Effect.succeed("id,name\n1,John")),
    HttpApiBuilder.handle("urlParams", (_) =>
      Effect.succeed({
        id: 123,
        name: "John"
      })),
    HttpApiBuilder.handle("binary", (_) => Effect.succeed(new Uint8Array([1, 2, 3, 4, 5]))),
    securityMiddleware
  ))

const ApiLive = HttpApiBuilder.api(MyApi).pipe(
  Layer.provide(UsersLive)
)

HttpApiBuilder.serve(HttpMiddleware.logger).pipe(
  Layer.provide(HttpApiSwagger.layer()),
  Layer.provide(HttpApiBuilder.middlewareOpenApi()),
  Layer.provide(ApiLive),
  Layer.provide(HttpApiBuilder.middlewareCors()),
  HttpServer.withLogAddress,
  Layer.provide(NodeHttpServer.layer(createServer, { port: 3000 })),
  Layer.launch,
  NodeRuntime.runMain
)

Effect.gen(function*() {
  yield* Effect.sleep(2000)
  const client = yield* HttpApiClient.make(MyApi, {
    baseUrl: "http://localhost:3000"
  })

  const data = new FormData()
  data.append("name", "John")
  console.log("Multipart", yield* client.users.create({ payload: data }))

  const user = yield* client.users.findById({
    path: { id: 123 },
    headers: { page: 10 }
  })
  console.log("json", user)

  const csv = yield* client.users.csv()
  console.log("csv", csv)

  const urlParams = yield* client.users.urlParams()
  console.log("urlParams", urlParams)

  const binary = yield* client.users.binary()
  console.log("binary", binary)
}).pipe(
  Effect.provide(FetchHttpClient.layer),
  NodeRuntime.runMain
)
