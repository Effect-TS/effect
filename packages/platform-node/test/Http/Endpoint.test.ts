import { HttpClient, HttpServer as Http } from "@effect/platform"
import { NodeHttpClient, NodeHttpServer } from "@effect/platform-node"
import { Schema } from "@effect/schema"
import { assert, describe, it } from "@effect/vitest"
import { Effect, Layer } from "effect"
import { createServer } from "http"

class User extends Schema.Class<User>("User")({
  id: Schema.Number,
  name: Schema.String,
  age: Schema.Number
}) {}

class GetUserById extends Schema.TaggedRequest<GetUserById>()(
  "GetUserById",
  Schema.Never,
  User,
  {
    id: Http.endpoint.PathParam("id", Schema.NumberFromString),
    user: Http.endpoint.BodyJson(Schema.Struct({
      name: Schema.String
    })),
    suffix: Http.endpoint.UrlParam("suffix", Schema.String),
    search: Http.endpoint.UrlParams(Schema.Struct({
      age: Schema.NumberFromString
    })),
    extraAge: Http.endpoint.Header("x-extra-age", Schema.NumberFromString)
  },
  Http.endpoint.annotations({
    path: "/users/:id",
    method: "POST"
  })
) {}

class UserError extends Schema.TaggedError<UserError>()(
  "UserError",
  {},
  Http.endpoint.errorAnnotations({
    statusCode: 400
  })
) {}

class CreateUser extends Schema.TaggedRequest<CreateUser>()(
  "CreateUser",
  UserError,
  Schema.Void,
  {
    user: Http.endpoint.BodyJson(Schema.Struct({
      name: Schema.String,
      age: Schema.Number
    }))
  },
  Http.endpoint.annotations({
    path: "/users",
    method: "POST"
  })
) {}

const group = Http.endpoint.group(
  {
    name: "users"
  },
  Http.endpoint.make(GetUserById, (req) =>
    Effect.succeed(
      new User({
        id: req.id,
        name: req.user.name + req.suffix,
        age: req.search.age + req.extraAge
      })
    )),
  Http.endpoint.make(CreateUser, ({ user }) =>
    user.name === "fail" ?
      Effect.fail(new UserError()) :
      user.name === "defect" ?
      Effect.die("defect") :
      Effect.log("Creating user", user))
)

type Group = typeof group

const router = Http.endpoint.toRouter(group)

const ServerLive = NodeHttpServer.server.layer(createServer, { port: 0 })
const EnvLive = Layer.mergeAll(ServerLive, NodeHttpClient.layerUndici)
const makeClient = Effect.map(
  Effect.all([Http.server.Server, HttpClient.client.Client]),
  ([server, client]) => {
    client = HttpClient.client.mapRequest(
      client,
      HttpClient.request.prependUrl(`http://127.0.0.1:${(server.address as Http.server.TcpAddress).port}`)
    )
    return Http.endpoint.client<Group>()(client)
  }
)

describe("Endpoint", () => {
  describe("e2e", () => {
    it.scoped("success", () =>
      Effect.gen(function*(_) {
        yield* _(router, Http.server.serveEffect())
        const client = yield* _(makeClient)
        const user = yield* _(client(
          new GetUserById({
            id: 123,
            search: {
              age: 100
            },
            user: {
              name: "John"
            },
            suffix: " Senior",
            extraAge: 53
          })
        ))
        assert.deepStrictEqual(user, new User({ id: 123, name: "John Senior", age: 153 }))

        const result = yield* _(client(new CreateUser({ user: { name: "John", age: 30 } })))
        assert.isUndefined(result)
      }).pipe(Effect.provide(EnvLive)))

    it.scoped("failure", () =>
      Effect.gen(function*(_) {
        yield* _(router, Http.server.serveEffect())
        const client = yield* _(makeClient)
        const result = yield* _(client(new CreateUser({ user: { name: "fail", age: 30 } })), Effect.flip)
        assert.deepStrictEqual(result, new UserError())
      }).pipe(Effect.provide(EnvLive)))

    it.scoped("defect", () =>
      Effect.gen(function*(_) {
        yield* _(router, Http.server.serveEffect())
        const client = yield* _(makeClient)
        const result = yield* _(client(new CreateUser({ user: { name: "defect", age: 30 } })), Effect.flip)
        assert(result._tag === "ResponseError")
        assert.strictEqual(result.reason, "StatusCode")
        assert.strictEqual(result.response.status, 500)
      }).pipe(Effect.provide(EnvLive)))
  })
})
