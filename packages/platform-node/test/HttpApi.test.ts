import {
  Cookies,
  FileSystem,
  HttpApi,
  HttpApiBuilder,
  HttpApiClient,
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiMiddleware,
  HttpApiSchema,
  HttpApiSecurity,
  HttpClient,
  HttpClientRequest,
  HttpServerRequest,
  Multipart,
  OpenApi
} from "@effect/platform"
import { NodeHttpServer } from "@effect/platform-node"
import { assert, describe, it } from "@effect/vitest"
import { Context, DateTime, Effect, Layer, Redacted, Ref, Schema, Struct } from "effect"
import OpenApiFixture from "./fixtures/openapi.json" with { type: "json" }

describe("HttpApi", () => {
  describe("payload", () => {
    it.effect("is decoded / encoded", () =>
      Effect.gen(function*() {
        const expected = new User({
          id: 123,
          name: "Joe",
          createdAt: DateTime.unsafeMake(0)
        })
        const client = yield* HttpApiClient.make(Api)
        const clientUsersGroup = yield* HttpApiClient.group(Api, "users")
        const clientUsersEndpointCreate = yield* HttpApiClient.endpoint(
          Api,
          "users",
          "create"
        )

        const apiClientUser = yield* client.users.create({
          urlParams: { id: 123 },
          payload: { name: "Joe" }
        })
        assert.deepStrictEqual(
          apiClientUser,
          expected
        )
        const groupClientUser = yield* clientUsersGroup.create({
          urlParams: { id: 123 },
          payload: { name: "Joe" }
        })
        assert.deepStrictEqual(
          groupClientUser,
          expected
        )
        const endpointClientUser = yield* clientUsersEndpointCreate({
          urlParams: { id: 123 },
          payload: { name: "Joe" }
        })
        assert.deepStrictEqual(
          endpointClientUser,
          expected
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
          HttpClientRequest.setUrlParams({ id: "0" }),
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
        const redacted = yield* HttpApiBuilder.securityDecode(securityQuery).pipe(
          Effect.provideService(
            HttpServerRequest.HttpServerRequest,
            HttpServerRequest.fromWeb(new Request("http://localhost:3000/"))
          ),
          Effect.provideService(HttpServerRequest.ParsedSearchParams, {
            api_key: "foo"
          })
        )
        assert.strictEqual(Redacted.value(redacted), "foo")
      }).pipe(Effect.provide(HttpLive)))
  })

  it.effect("client withResponse", () =>
    Effect.gen(function*() {
      const client = yield* HttpApiClient.make(Api)
      const [users, response] = yield* client.users.list({ headers: { page: 1 }, withResponse: true })
      assert.strictEqual(users[0].name, "page 1")
      assert.strictEqual(response.status, 200)
    }).pipe(Effect.provide(HttpLive)))

  it.effect("multiple payload types", () =>
    Effect.gen(function*() {
      const client = yield* HttpApiClient.make(Api)
      let [group, response] = yield* client.groups.create({
        payload: { name: "Some group" },
        withResponse: true
      })
      assert.deepStrictEqual(group, new Group({ id: 1, name: "Some group" }))
      assert.strictEqual(response.status, 200)

      const data = new FormData()
      data.set("name", "Some group")
      ;[group, response] = yield* client.groups.create({
        payload: data,
        withResponse: true
      })
      assert.deepStrictEqual(group, new Group({ id: 1, name: "Some group" }))
      assert.strictEqual(response.status, 200)

      group = yield* client.groups.create({
        payload: { foo: "Some group" }
      })
      assert.deepStrictEqual(group, new Group({ id: 1, name: "Some group" }))
    }).pipe(Effect.provide(HttpLive)))

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

const securityHeader = HttpApiSecurity.apiKey({
  in: "header",
  key: "x-api-key"
})

const securityQuery = HttpApiSecurity.apiKey({
  in: "query",
  key: "api_key"
})

class CurrentUser extends Context.Tag("CurrentUser")<CurrentUser, User>() {}

class Authorization extends HttpApiMiddleware.Tag<Authorization>()("Authorization", {
  security: {
    cookie: HttpApiSecurity.apiKey({
      in: "cookie",
      key: "token"
    })
  },
  provides: CurrentUser
}) {}

class GroupsApi extends HttpApiGroup.make("groups")
  .add(
    HttpApiEndpoint.get("findById", "/:id")
      .setPath(Schema.Struct({
        id: Schema.NumberFromString
      }))
      .addSuccess(Group)
  )
  .add(
    HttpApiEndpoint.post("create", "/")
      .setPayload(Schema.Union(
        Schema.Struct(Struct.pick(Group.fields, "name")),
        Schema.Struct({ foo: Schema.String }).pipe(
          HttpApiSchema.withEncoding({ kind: "UrlParams" })
        ),
        HttpApiSchema.Multipart(
          Schema.Struct(Struct.pick(Group.fields, "name"))
        )
      ))
      .addSuccess(Group)
  )
  .addError(GroupError.pipe(
    HttpApiSchema.asEmpty({ status: 418, decode: () => new GroupError() })
  ))
  .prefix("/groups")
{}

class UsersApi extends HttpApiGroup.make("users")
  .add(
    HttpApiEndpoint.get("findById", "/:id")
      .setPath(Schema.Struct({
        id: Schema.NumberFromString
      }))
      .addSuccess(User)
  )
  .add(
    HttpApiEndpoint.post("create", "/")
      .setPayload(Schema.Struct(Struct.omit(
        User.fields,
        "id",
        "createdAt"
      )))
      .setUrlParams(Schema.Struct({
        id: Schema.NumberFromString
      }))
      .addSuccess(User)
      .addError(UserError)
  )
  .add(
    HttpApiEndpoint.get("list", "/")
      .setHeaders(Schema.Struct({
        page: Schema.NumberFromString.pipe(
          Schema.optionalWith({ default: () => 1 })
        )
      }))
      .addSuccess(Schema.Array(User))
      .addError(NoStatusError)
      .annotate(OpenApi.Deprecated, true)
      .annotate(OpenApi.Summary, "test summary")
      .annotateContext(OpenApi.annotations({ identifier: "listUsers" }))
  )
  .add(
    HttpApiEndpoint.post("upload", "/upload")
      .setPayload(HttpApiSchema.Multipart(Schema.Struct({
        file: Multipart.SingleFileSchema
      })))
      .addSuccess(Schema.Struct({
        contentType: Schema.String,
        length: Schema.Int
      }))
  )
  .middleware(Authorization)
  .annotateContext(OpenApi.annotations({ title: "Users API" }))
{}

class AnotherApi extends HttpApi.empty.add(GroupsApi) {}

class Api extends HttpApi.empty
  .addHttpApi(AnotherApi)
  .add(UsersApi.prefix("/users"))
  .addError(GlobalError, { status: 413 })
  .annotateContext(OpenApi.annotations({
    title: "API",
    summary: "test api summary",
    transform: (openApiSpec) => ({
      ...openApiSpec,
      tags: [...openApiSpec.tags ?? [], {
        name: "Tag from OpenApi.Transform annotation"
      }]
    })
  }))
  .annotate(
    HttpApi.AdditionalSchemas,
    [
      Schema.Struct({
        contentType: Schema.String,
        length: Schema.Int
      }).annotations({
        identifier: "ComponentsSchema"
      })
    ]
  )
{}

// impl

class UserRepo extends Context.Tag("UserRepo")<UserRepo, {
  readonly findById: (id: number) => Effect.Effect<User>
}>() {
  static Live = Layer.succeed(this, {
    findById: (id) => Effect.map(DateTime.now, (now) => ({ id, name: "foo", createdAt: now }))
  })
}

const AuthorizationLive = Layer.succeed(
  Authorization,
  Authorization.of({
    cookie: (token) =>
      Effect.succeed(
        new User({
          id: 1,
          name: Redacted.value(token),
          createdAt: DateTime.unsafeNow()
        })
      )
  })
)

const HttpUsersLive = HttpApiBuilder.group(
  Api,
  "users",
  (handlers) =>
    Effect.gen(function*() {
      const fs = yield* FileSystem.FileSystem
      const repo = yield* UserRepo
      return handlers
        .handle("findById", (_) =>
          _.path.id === -1
            ? CurrentUser :
            repo.findById(_.path.id))
        .handle("create", (_) =>
          _.payload.name === "boom"
            ? Effect.fail(new UserError())
            : Effect.map(DateTime.now, (now) =>
              new User({
                id: _.urlParams.id,
                name: _.payload.name,
                createdAt: now
              })))
        .handle("list", (_) =>
          _.headers.page === 0
            ? Effect.fail(new NoStatusError())
            // test handler level context
            : Effect.map(DateTime.nowInCurrentZone, (now) => [
              new User({
                id: 1,
                name: `page ${_.headers.page}`,
                createdAt: DateTime.unsafeMake(now.epochMillis)
              })
            ]))
        .handle("upload", (_) =>
          Effect.gen(function*() {
            const stat = yield* fs.stat(_.payload.file.path).pipe(Effect.orDie)
            return {
              contentType: _.payload.file.contentType,
              length: Number(stat.size)
            }
          }))
    })
).pipe(Layer.provide([
  DateTime.layerCurrentZoneOffset(0),
  UserRepo.Live,
  AuthorizationLive
]))

const HttpGroupsLive = HttpApiBuilder.group(
  Api,
  "groups",
  (handlers) =>
    handlers
      .handle("findById", ({ path }) =>
        path.id === 0
          ? Effect.fail(new GroupError())
          : Effect.succeed(new Group({ id: 1, name: "foo" })))
      .handle("create", ({ payload }) =>
        Effect.succeed(
          new Group({
            id: 1,
            name: "foo" in payload ? payload.foo : payload.name
          })
        ))
)

const HttpApiLive = Layer.provide(HttpApiBuilder.api(Api), [
  HttpGroupsLive,
  HttpUsersLive
])

const HttpLive = HttpApiBuilder.serve().pipe(
  Layer.provide(HttpApiBuilder.middlewareCors()),
  Layer.provide(HttpApiLive),
  Layer.provideMerge(NodeHttpServer.layerTest)
)
