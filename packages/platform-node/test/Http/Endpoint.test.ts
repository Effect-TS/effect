import { HttpClient, HttpServer } from "@effect/platform"
import { NodeHttpClient, NodeHttpServer } from "@effect/platform-node"
import * as Endpoint from "@effect/platform/Http/Endpoint"
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
    id: Endpoint.PathParam("id", Schema.NumberFromString),
    user: Endpoint.BodyJson(Schema.Struct({
      name: Schema.String
    })),
    suffix: Endpoint.UrlParam("suffix", Schema.String),
    search: Endpoint.UrlParams(Schema.Struct({
      age: Schema.NumberFromString
    })),
    extraAge: Endpoint.Header("x-extra-age", Schema.NumberFromString)
  },
  Endpoint.annotations({
    path: "/users/:id",
    method: "POST"
  })
) {}

class CreateUser extends Schema.TaggedRequest<CreateUser>()(
  "CreateUser",
  Schema.Never,
  Schema.Void,
  {
    user: Endpoint.BodyJson(Schema.Struct({
      name: Schema.String,
      age: Schema.Number
    }))
  },
  Endpoint.annotations({
    path: "/users",
    method: "POST"
  })
) {}

const group = Endpoint.group(
  {
    name: "users"
  },
  Endpoint.handle(GetUserById, (req) =>
    Effect.succeed(
      new User({
        id: req.id,
        name: req.user.name + req.suffix,
        age: req.search.age + req.extraAge
      })
    )),
  Endpoint.handle(CreateUser, ({ user }) => Effect.log("Creating user", user))
)

type Group = typeof group

const router = Endpoint.groupToRouter(group)

const ServerLive = NodeHttpServer.server.layer(createServer, { port: 0 })
const EnvLive = Layer.mergeAll(ServerLive, NodeHttpClient.layerUndici)
const makeClient = Effect.map(
  Effect.all([HttpServer.server.Server, HttpClient.client.Client]),
  ([server, client]) => {
    client = HttpClient.client.mapRequest(
      client,
      HttpClient.request.prependUrl(`http://127.0.0.1:${(server.address as HttpServer.server.TcpAddress).port}`)
    )
    return Endpoint.client<Group>()(client)
  }
)

describe("Endpoint", () => {
  describe("e2e", () => {
    it.scoped("works", () =>
      Effect.gen(function*(_) {
        yield* _(router, HttpServer.server.serveEffect())
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
  })
})
