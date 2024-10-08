import {
  Cookies,
  FileSystem,
  HttpApi,
  HttpApiBuilder,
  HttpApiClient,
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiSchema,
  HttpApiSecurity,
  HttpClient,
  HttpClientRequest,
  HttpServerRequest,
  Multipart,
  OpenApi
} from "@effect/platform"
import { NodeHttpServer } from "@effect/platform-node"
import { Schema } from "@effect/schema"
import { assert, describe, it } from "@effect/vitest"
import { Context, DateTime, Effect, Layer, Redacted, Ref, Struct } from "effect"
import OpenApiFixture from "./fixtures/openapi.json"

describe("HttpApi", () => {
  describe("payload", () => {
    it.effect("is decoded / encoded", () =>
      Effect.gen(function*() {
        const client = yield* HttpApiClient.make(Api)
        const user = yield* client.users.create({
          payload: { name: "Joe" }
        })
        assert.deepStrictEqual(
          user,
          new User({
            id: 1,
            name: "Joe",
            createdAt: DateTime.unsafeMake(0)
          })
        )
      }).pipe(Effect.provide(HttpLive)))

    it.live("multipart", () =>
      Effect.gen(function*() {
        const client = yield* HttpApiClient.make(Api)
        const data = new FormData()
        data.append("file", new Blob(["hello"], { type: "text/plain" }), "hello.txt")
        const result = yield* client.users.upload({ payload: data })
        assert.deepStrictEqual(result, {
          contentType: "text/plain",
          length: 5
        })
      }).pipe(Effect.provide(HttpLive)))
  })

  describe("headers", () => {
    it.effect("is decoded / encoded", () =>
      Effect.gen(function*() {
        const client = yield* HttpApiClient.make(Api)
        const users = yield* client.users.list({
          headers: { page: 1 }
        })
        const user = users[0]
        assert.deepStrictEqual(
          user,
          new User({
            id: 1,
            name: "page 1",
            createdAt: DateTime.unsafeMake(0)
          })
        )
      }).pipe(Effect.provide(HttpLive)))
  })

  describe("errors", () => {
    it.scoped("empty errors have no body", () =>
      Effect.gen(function*() {
        const response = yield* HttpClient.get("/groups/0")
        assert.strictEqual(response.status, 418)
        const text = yield* response.text
        assert.strictEqual(text, "")
      }).pipe(Effect.provide(HttpLive)))

    it.effect("empty errors decode", () =>
      Effect.gen(function*() {
        const client = yield* HttpApiClient.make(Api)
        const error = yield* client.groups.findById({ path: { id: 0 } }).pipe(
          Effect.flip
        )
        assert.deepStrictEqual(error, new GroupError())
      }).pipe(Effect.provide(HttpLive)))

    it.scoped("default to 500 status code", () =>
      Effect.gen(function*() {
        const response = yield* HttpClientRequest.get("/users").pipe(
          HttpClientRequest.setHeaders({ page: "0" }),
          HttpClient.execute
        )
        assert.strictEqual(response.status, 500)
        const body = yield* response.json
        assert.deepStrictEqual(body, {
          _tag: "NoStatusError"
        })
      }).pipe(Effect.provide(HttpLive)))

    it.scoped("class level annotations", () =>
      Effect.gen(function*() {
        const response = yield* HttpClientRequest.post("/users").pipe(
          HttpClientRequest.bodyUnsafeJson({ name: "boom" }),
          HttpClient.execute
        )
        assert.strictEqual(response.status, 400)
      }).pipe(Effect.provide(HttpLive)))

    it.effect("HttpApiDecodeError", () =>
      Effect.gen(function*() {
        const client = yield* HttpApiClient.make(Api)
        const error = yield* client.users.upload({ payload: new FormData() }).pipe(
          Effect.flip
        )
        assert(error._tag === "HttpApiDecodeError")
        assert.deepStrictEqual(error.issues[0].path, ["file"])
      }).pipe(Effect.provide(HttpLive)))
  })

  it.effect("handler level context", () =>
    Effect.gen(function*() {
      const client = yield* HttpApiClient.make(Api)
      const users = yield* client.users.list({ headers: { page: 1 } })
      const user = users[0]
      assert.strictEqual(user.name, "page 1")
      assert.deepStrictEqual(user.createdAt, DateTime.unsafeMake(0))
    }).pipe(Effect.provide(HttpLive)))

  describe("security", () => {
    it.effect("security middleware sets current user", () =>
      Effect.gen(function*() {
        const ref = yield* Ref.make(Cookies.empty.pipe(
          Cookies.unsafeSet("token", "foo")
        ))
        const client = yield* HttpApiClient.make(Api, {
          transformClient: HttpClient.withCookiesRef(ref)
        })
        const user = yield* client.users.findById({ path: { id: -1 } })
        assert.strictEqual(user.name, "foo")
      }).pipe(Effect.provide(HttpLive)))

    it.effect("apiKey header security", () =>
      Effect.gen(function*() {
        const decode = HttpApiBuilder.securityDecode(securityHeader).pipe(
          Effect.provideService(
            HttpServerRequest.HttpServerRequest,
            HttpServerRequest.fromWeb(
              new Request("http://localhost:3000/", {
                headers: {
                  "x-api-key": "foo"
                }
              })
            )
          ),
          Effect.provideService(HttpServerRequest.ParsedSearchParams, {})
        )
        const redacted = yield* decode
        assert.strictEqual(Redacted.value(redacted), "foo")
      }).pipe(Effect.provide(HttpLive)))

    it.effect("apiKey query security", () =>
      Effect.gen(function*() {
        const decode = HttpApiBuilder.securityDecode(securityQuery).pipe(
          Effect.provideService(
            HttpServerRequest.HttpServerRequest,
            HttpServerRequest.fromWeb(new Request("http://localhost:3000/"))
          ),
          Effect.provideService(HttpServerRequest.ParsedSearchParams, {
            api_key: "foo"
          })
        )
        const redacted = yield* decode
        assert.strictEqual(Redacted.value(redacted), "foo")
      }).pipe(Effect.provide(HttpLive)))
  })

  it("OpenAPI spec", () => {
    const spec = OpenApi.fromApi(Api)
    assert.deepStrictEqual(spec, OpenApiFixture as any)
  })
})

class GlobalError extends Schema.TaggedClass<GlobalError>()("GlobalError", {}) {}
class GroupError extends Schema.TaggedClass<GroupError>()("GroupError", {}) {}
class UserError extends Schema.TaggedClass<UserError>()("UserError", {}, HttpApiSchema.annotations({ status: 400 })) {}
class NoStatusError extends Schema.TaggedClass<NoStatusError>()("NoStatusError", {}) {}

class User extends Schema.Class<User>("User")({
  id: Schema.Int,
  name: Schema.String,
  createdAt: Schema.DateTimeUtc
}) {}

class Group extends Schema.Class<Group>("Group")({
  id: Schema.Int,
  name: Schema.String
}) {}

const securityCookie = HttpApiSecurity.apiKey({
  in: "cookie",
  key: "token"
})

const securityHeader = HttpApiSecurity.apiKey({
  in: "header",
  key: "x-api-key"
})

const securityQuery = HttpApiSecurity.apiKey({
  in: "query",
  key: "api_key"
})

class GroupsApi extends HttpApiGroup.make("groups").pipe(
  HttpApiGroup.add(
    HttpApiEndpoint.get("findById", "/:id").pipe(
      HttpApiEndpoint.setPath(Schema.Struct({
        id: Schema.NumberFromString
      })),
      HttpApiEndpoint.setSuccess(Group)
    )
  ),
  HttpApiGroup.add(
    HttpApiEndpoint.post("create", "/").pipe(
      HttpApiEndpoint.setPayload(Schema.Struct(Struct.pick(Group.fields, "name"))),
      HttpApiEndpoint.setSuccess(Group)
    )
  ),
  HttpApiGroup.addError(GroupError.pipe(
    HttpApiSchema.asEmpty({ status: 418, decode: () => new GroupError() })
  )),
  HttpApiGroup.prefix("/groups"),
  OpenApi.annotate({ security: securityCookie })
) {}

class UsersApi extends HttpApiGroup.make("users").pipe(
  HttpApiGroup.add(
    HttpApiEndpoint.get("findById", "/:id").pipe(
      HttpApiEndpoint.setPath(Schema.Struct({
        id: Schema.NumberFromString
      })),
      HttpApiEndpoint.setSuccess(User)
    )
  ),
  HttpApiGroup.add(
    HttpApiEndpoint.post("create", "/").pipe(
      HttpApiEndpoint.setPayload(Schema.Struct(Struct.omit(
        User.fields,
        "id",
        "createdAt"
      ))),
      HttpApiEndpoint.setSuccess(User),
      HttpApiEndpoint.addError(UserError)
    )
  ),
  HttpApiGroup.add(
    HttpApiEndpoint.get("list", "/").pipe(
      HttpApiEndpoint.setHeaders(Schema.Struct({
        page: Schema.NumberFromString.pipe(
          Schema.optionalWith({ default: () => 1 })
        )
      })),
      HttpApiEndpoint.setSuccess(Schema.Array(User)),
      HttpApiEndpoint.addError(NoStatusError),
      OpenApi.annotate({ identifier: "listUsers" })
    )
  ),
  HttpApiGroup.add(
    HttpApiEndpoint.post("upload", "/upload").pipe(
      HttpApiEndpoint.setPayload(HttpApiSchema.Multipart(Schema.Struct({
        file: Multipart.SingleFileSchema
      }))),
      HttpApiEndpoint.setSuccess(Schema.Struct({
        contentType: Schema.String,
        length: Schema.Int
      }))
    )
  ),
  OpenApi.annotate({ title: "Users API" })
) {}

class Api extends HttpApi.empty.pipe(
  HttpApi.addGroup(GroupsApi),
  HttpApi.addGroup("/users", UsersApi),
  HttpApi.addError(GlobalError, { status: 413 }),
  OpenApi.annotate({ title: "API" })
) {}

// impl

class UserRepo extends Context.Tag("UserRepo")<UserRepo, {
  readonly findById: (id: number) => Effect.Effect<User>
}>() {
  static Live = Layer.succeed(this, {
    findById: (id) => Effect.map(DateTime.now, (now) => ({ id, name: "foo", createdAt: now }))
  })
}

class CurrentUser extends Context.Tag("CurrentUser")<CurrentUser, User>() {}

const securityMiddleware = HttpApiBuilder.middlewareSecurity(
  securityCookie,
  CurrentUser,
  (token) =>
    Effect.succeed(
      new User({
        id: 1,
        name: Redacted.value(token),
        createdAt: DateTime.unsafeNow()
      })
    )
)

const HttpUsersLive = HttpApiBuilder.group(Api, "users", (handlers) =>
  Effect.gen(function*() {
    const fs = yield* FileSystem.FileSystem
    const repo = yield* UserRepo
    return handlers.pipe(
      HttpApiBuilder.handle("findById", (_) =>
        _.path.id === -1
          ? CurrentUser :
          repo.findById(_.path.id)),
      HttpApiBuilder.handle("create", (_) =>
        _.payload.name === "boom"
          ? Effect.fail(new UserError())
          : Effect.map(DateTime.now, (now) =>
            new User({
              id: 1,
              name: _.payload.name,
              createdAt: now
            }))),
      HttpApiBuilder.handle("list", (_) =>
        _.headers.page === 0
          ? Effect.fail(new NoStatusError())
          // test handler level context
          : Effect.map(DateTime.nowInCurrentZone, (now) => [
            new User({
              id: 1,
              name: `page ${_.headers.page}`,
              createdAt: DateTime.unsafeMake(now.epochMillis)
            })
          ])),
      HttpApiBuilder.handle("upload", (_) =>
        Effect.gen(function*() {
          const stat = yield* fs.stat(_.payload.file.path).pipe(Effect.orDie)
          return {
            contentType: _.payload.file.contentType,
            length: Number(stat.size)
          }
        })),
      securityMiddleware
    )
  })).pipe(
    Layer.provide(DateTime.layerCurrentZoneOffset(0)),
    Layer.provide(UserRepo.Live)
  )

const HttpGroupsLive = HttpApiBuilder.group(Api, "groups", (handlers) =>
  handlers.pipe(
    HttpApiBuilder.handle("findById", (_) =>
      _.path.id === 0
        ? Effect.fail(new GroupError())
        : Effect.succeed(new Group({ id: 1, name: "foo" }))),
    HttpApiBuilder.handle("create", (_) => Effect.succeed(new Group({ id: 1, name: _.payload.name }))),
    securityMiddleware
  ))

const HttpApiLive = HttpApiBuilder.api(Api).pipe(
  Layer.provide(HttpUsersLive),
  Layer.provide(HttpGroupsLive)
)

const HttpLive = HttpApiBuilder.serve().pipe(
  Layer.provide(HttpApiBuilder.middlewareCors()),
  Layer.provide(HttpApiLive),
  Layer.provideMerge(NodeHttpServer.layerTest)
)
