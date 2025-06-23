import {
  FetchHttpClient,
  HttpApi,
  HttpApiBuilder,
  HttpApiClient,
  HttpApiEndpoint,
  HttpApiError,
  HttpApiGroup,
  HttpApiMiddleware,
  HttpApiSchema,
  HttpApiSecurity,
  HttpApiSwagger,
  HttpClient,
  HttpClientRequest,
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

export class Authentication extends HttpApiMiddleware.Tag<Authentication>()("Authentication", {
  failure: Unauthorized,
  provides: CurrentUser,
  security: {
    bearer: HttpApiSecurity.bearer
  }
}) {}

const idParam = HttpApiSchema.param("id", Schema.NumberFromString)

class UsersApi extends HttpApiGroup.make("users")
  .add(
    HttpApiEndpoint.get("findById")`/${idParam}`
      .addSuccess(User)
      .setHeaders(Schema.Struct({
        page: Schema.NumberFromString.pipe(
          Schema.optionalWith({ default: () => 1 })
        )
      }))
      .addError(Schema.String.pipe(
        HttpApiSchema.asEmpty({ status: 413, decode: () => "boom" })
      ))
  )
  .add(
    HttpApiEndpoint.post("create", "/")
      .setPayload(HttpApiSchema.Multipart(Schema.Struct({
        name: Schema.String
      })))
      .addSuccess(User)
  )
  .add(
    HttpApiEndpoint.get("me", "/me")
      .addSuccess(User)
  )
  .middleware(Authentication)
  .prefix("/users")
  .annotateContext(OpenApi.annotations({
    title: "Users API",
    description: "API for managing users"
  }))
{}

class TopLevelApi extends HttpApiGroup.make("topLevel", { topLevel: true })
  .add(
    HttpApiEndpoint.get("csv", "/csv")
      .addSuccess(HttpApiSchema.Text({
        contentType: "text/csv"
      }))
      .addError(HttpApiError.Conflict)
  )
  .add(
    HttpApiEndpoint.get("binary", "/binary")
      .addSuccess(HttpApiSchema.Uint8Array())
  )
  .add(
    HttpApiEndpoint.get("urlParams", "/url-params")
      .addSuccess(
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
  .annotateContext(OpenApi.annotations({
    title: "Top Level API",
    description: "API for top level endpoints"
  }))
{}

class PeopleApi extends HttpApiGroup.make("people")
  .add(
    HttpApiEndpoint.get("list", "/")
      .addSuccess(Schema.Array(User))
  )
  .prefix("/people")
{}

class AnotherApi extends HttpApi.make("another").add(PeopleApi).prefix("/v2") {}

class MyApi extends HttpApi.make("api")
  .add(UsersApi)
  .add(TopLevelApi)
  .addHttpApi(AnotherApi)
{}

// ------------------------------------------------
// implementation
// ------------------------------------------------

const AuthenticationLive = Layer.succeed(
  Authentication,
  Authentication.of({
    bearer: (token) =>
      Effect.succeed(
        new User({
          id: 1000,
          name: `Authenticated with ${Redacted.value(token)}`
        })
      )
  })
)

const UsersLive = HttpApiBuilder.group(
  MyApi,
  "users",
  (handlers) =>
    handlers
      .handle("create", (_) => Effect.succeed(new User({ ..._.payload, id: 123 })))
      .handle("findById", (_) =>
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
        ))
      .handle("me", (_) => CurrentUser)
).pipe(
  Layer.provide(AuthenticationLive)
)

const PeopleLive = HttpApiBuilder.group(
  MyApi,
  "people",
  (handlers) => handlers.handle("list", (_) => Effect.succeed([new User({ id: 1, name: "John" })]))
)

const TopLevelLive = HttpApiBuilder.group(
  MyApi,
  "topLevel",
  (handlers) =>
    handlers
      .handle("csv", (_) => Effect.succeed("id,name\n1,John"))
      .handle("urlParams", (_) =>
        Effect.succeed({
          id: 123,
          name: "John"
        }))
      .handle("binary", (_) => Effect.succeed(new Uint8Array([1, 2, 3, 4, 5])))
)

const ApiLive = HttpApiBuilder.api(MyApi).pipe(
  Layer.provide([UsersLive, TopLevelLive, PeopleLive])
)

// ------------------------------------------------
// server
// ------------------------------------------------

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
    baseUrl: "http://localhost:3000",
    transformClient: HttpClient.mapRequest(HttpClientRequest.bearerToken("token"))
  })

  const data = new FormData()
  data.append("name", "John")
  console.log("Multipart", yield* client.users.create({ payload: data }))

  let user = yield* client.users.findById({
    path: { id: 123 },
    headers: { page: 10 }
  })
  console.log("json", user)

  user = yield* client.users.me()
  console.log("json me", user)

  const csv = yield* client.csv({ withResponse: true })
  console.log("csv", csv)

  const urlParams = yield* client.urlParams()
  console.log("urlParams", urlParams)

  const binary = yield* client.binary()
  console.log("binary", binary)

  console.log("merged api", yield* client.people.list())
}).pipe(
  Effect.provide(FetchHttpClient.layer),
  NodeRuntime.runMain
)
