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
  HttpServerResponse,
  Multipart,
  OpenApi
} from "@effect/platform"
import { NodeHttpServer } from "@effect/platform-node"
import * as HttpLayerRouter from "@effect/platform/HttpLayerRouter"
import { assert, describe, it } from "@effect/vitest"
import { Chunk, Context, DateTime, Effect, Layer, Redacted, Ref, Schema, Stream, Struct } from "effect"
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
        const clientUsersGroup = yield* HttpApiClient.group(Api, {
          httpClient: yield* HttpClient.HttpClient,
          group: "users"
        })
        const clientUsersEndpointCreate = yield* HttpApiClient.endpoint(Api, {
          httpClient: yield* HttpClient.HttpClient,
          group: "users",
          endpoint: "create"
        })

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
        const result = yield* client.users.upload({ payload: data, path: {} })
        assert.deepStrictEqual(result, {
          contentType: "text/plain",
          length: 5
        })
      }).pipe(Effect.provide(HttpLive)))

    it.live("multipart stream", () =>
      Effect.gen(function*() {
        const client = yield* HttpApiClient.make(Api)
        const data = new FormData()
        data.append("file", new Blob(["hello"], { type: "text/plain" }), "hello.txt")
        const result = yield* client.users.uploadStream({ payload: data })
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
          headers: { page: 1 },
          urlParams: {}
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
    it.effect("empty errors have no body", () =>
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
        const error = yield* client.users.upload({ path: {}, payload: new FormData() }).pipe(
          Effect.flip
        )
        assert(error._tag === "HttpApiDecodeError")
        assert.deepStrictEqual(error.issues[0].path, ["file"])
      }).pipe(Effect.provide(HttpLive)))
  })

  it.effect("handler level context", () =>
    Effect.gen(function*() {
      const client = yield* HttpApiClient.make(Api)
      const users = yield* client.users.list({ headers: { page: 1 }, urlParams: {} })
      const user = users[0]
      assert.strictEqual(user.name, "page 1")
      assert.deepStrictEqual(user.createdAt, DateTime.unsafeMake(0))
    }).pipe(Effect.provide(HttpLive)))

  it.effect("custom client context", () =>
    Effect.gen(function*() {
      let tapped = false
      const client = yield* HttpApiClient.makeWith(Api, {
        httpClient: (yield* HttpClient.HttpClient).pipe(
          HttpClient.tapRequest(Effect.fnUntraced(function*(_request) {
            tapped = true
            yield* CurrentUser
          }))
        )
      })
      const users = yield* client.users.list({ headers: { page: 1 }, urlParams: {} }).pipe(
        Effect.provideService(
          CurrentUser,
          new User({
            id: 1,
            name: "foo",
            createdAt: DateTime.unsafeMake(0)
          })
        )
      )
      const user = users[0]
      assert.strictEqual(user.name, "page 1")
      assert.isTrue(tapped)
    }).pipe(Effect.provide(HttpLive)))

  describe("security", () => {
    it.effect("security middleware sets current user", () =>
      Effect.gen(function*() {
        const ref = yield* Ref.make(Cookies.empty.pipe(
          Cookies.unsafeSet("token", "foo")
        ))
        const client = yield* HttpApiClient.makeWith(Api, {
          httpClient: HttpClient.withCookiesRef(yield* HttpClient.HttpClient, ref)
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
      const [users, response] = yield* client.users.list({ headers: { page: 1 }, urlParams: {}, withResponse: true })
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

  it.effect(".handle can return HttpServerResponse", () =>
    Effect.gen(function*() {
      const client = yield* HttpApiClient.make(Api)
      const response = yield* client.groups.handle({
        path: { id: 1 },
        payload: { name: "Some group" }
      })
      assert.deepStrictEqual(response, {
        id: 1,
        name: "Some group"
      })
    }).pipe(Effect.provide(HttpLive)))

  it.effect(".handleRaw can manually process body", () =>
    Effect.gen(function*() {
      const client = yield* HttpApiClient.make(Api)
      const response = yield* client.groups.handleRaw({
        path: { id: 1 },
        payload: { name: "Some group" }
      })
      assert.deepStrictEqual(response, {
        id: 1,
        name: "Some group"
      })
    }).pipe(Effect.provide(HttpLive)))

  it("OpenAPI spec", () => {
    const spec = OpenApi.fromApi(Api)
    assert.deepStrictEqual(spec, OpenApiFixture as any)
  })

  it.effect("error from plain text", () => {
    class RateLimitError extends Schema.TaggedError<RateLimitError>("RateLimitError")(
      "RateLimitError",
      Schema.Struct({ message: Schema.String })
    ) {}

    const RateLimitErrorSchema = HttpApiSchema.withEncoding(
      Schema.transform(Schema.String, RateLimitError, {
        encode: ({ message }) => message,
        decode: (message) => RateLimitError.make({ message }),
        strict: true
      }),
      { kind: "Text" }
    ).annotations(HttpApiSchema.annotations({ status: 429 }))

    const Api = HttpApi.make("api").add(
      HttpApiGroup.make("group").add(
        HttpApiEndpoint.get("error")`/error`.addError(RateLimitErrorSchema)
      )
    )
    const ApiLive = HttpLayerRouter.addHttpApi(Api).pipe(
      Layer.provide(
        HttpApiBuilder.group(
          Api,
          "group",
          (handlers) => handlers.handle("error", () => new RateLimitError({ message: "Rate limit exceeded" }))
        )
      ),
      HttpLayerRouter.serve,
      Layer.provideMerge(NodeHttpServer.layerTest)
    )
    return Effect.gen(function*() {
      const client = yield* HttpApiClient.make(Api)
      const response = yield* client.group.error().pipe(Effect.flip)
      assert.deepStrictEqual(response, new RateLimitError({ message: "Rate limit exceeded" }))
    }).pipe(Effect.provide(ApiLive))
  })
})

class GlobalError extends Schema.TaggedClass<GlobalError>()("GlobalError", {}) {}
class GroupError extends Schema.TaggedClass<GroupError>()("GroupError", {}) {}
class UserError extends Schema.TaggedClass<UserError>()("UserError", {}, HttpApiSchema.annotations({ status: 400 })) {}
class NoStatusError extends Schema.TaggedClass<NoStatusError>()("NoStatusError", {}) {}

class User extends Schema.Class<User>("User")({
  id: Schema.Int,
  uuid: Schema.optional(Schema.UUID),
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
    HttpApiEndpoint.get("findById")`/${HttpApiSchema.param("id", Schema.NumberFromString)}`
      .addSuccess(Group)
  )
  .add(
    HttpApiEndpoint.post("create")`/`
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
  .add(
    HttpApiEndpoint.post("handle")`/handle/${HttpApiSchema.param("id", Schema.NumberFromString)}`
      .setPayload(Schema.Struct({
        name: Schema.String
      }))
      .addSuccess(Schema.Struct({
        id: Schema.Number,
        name: Schema.String
      }))
  )
  .add(
    HttpApiEndpoint.post("handleRaw")`/handleraw/${HttpApiSchema.param("id", Schema.NumberFromString)}`
      .setPayload(Schema.Struct({
        name: Schema.String
      }))
      .addSuccess(Schema.Struct({
        id: Schema.Number,
        name: Schema.String
      }))
  )
  .addError(GroupError.pipe(
    HttpApiSchema.asEmpty({ status: 418, decode: () => new GroupError() })
  ))
  .prefix("/groups")
{}

class UsersApi extends HttpApiGroup.make("users")
  .add(
    HttpApiEndpoint.get("findById")`/${HttpApiSchema.param("id", Schema.NumberFromString)}`
      .addSuccess(User)
  )
  .add(
    HttpApiEndpoint.post("create")`/`
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
      .addError(UserError) // ensure errors are deduplicated
  )
  .add(
    HttpApiEndpoint.get("list")`/`
      .setHeaders(Schema.Struct({
        page: Schema.NumberFromString.pipe(
          Schema.optionalWith({ default: () => 1 })
        )
      }))
      .setUrlParams(Schema.Struct({
        query: Schema.optional(Schema.String).annotations({ description: "search query" })
      }))
      .addSuccess(Schema.Array(User))
      .addError(NoStatusError)
      .annotate(OpenApi.Deprecated, true)
      .annotate(OpenApi.Summary, "test summary")
      .annotateContext(OpenApi.annotations({ identifier: "listUsers" }))
  )
  .add(
    HttpApiEndpoint.post("upload")`/upload/${Schema.optional(Schema.String)}`
      .setPayload(HttpApiSchema.Multipart(Schema.Struct({
        file: Multipart.SingleFileSchema
      })))
      .addSuccess(Schema.Struct({
        contentType: Schema.String,
        length: Schema.Int
      }))
  )
  .add(
    HttpApiEndpoint.post("uploadStream")`/uploadstream`
      .setPayload(HttpApiSchema.MultipartStream(Schema.Struct({
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

class TopLevelApi extends HttpApiGroup.make("root", { topLevel: true })
  .add(
    HttpApiEndpoint.get("healthz")`/healthz`
      .addSuccess(HttpApiSchema.NoContent.annotations({ description: "Empty" }))
  )
{}

class AnotherApi extends HttpApi.make("another").add(GroupsApi) {}

class Api extends HttpApi.make("api")
  .addHttpApi(AnotherApi)
  .add(UsersApi.prefix("/users"))
  .add(TopLevelApi)
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
                createdAt: DateTime.toUtc(now)
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
        .handle("uploadStream", (_) =>
          Effect.gen(function*() {
            const { content, file } = yield* _.payload.pipe(
              Stream.filter((part) => part._tag === "File"),
              Stream.mapEffect((file) =>
                file.contentEffect.pipe(
                  Effect.map((content) => ({ file, content }))
                )
              ),
              Stream.runCollect,
              Effect.flatMap(Chunk.head),
              Effect.orDie
            )
            return {
              contentType: file.contentType,
              length: content.length
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
      .handle(
        "handle",
        Effect.fn(function*({ path, payload }) {
          return HttpServerResponse.unsafeJson({
            id: path.id,
            name: payload.name
          })
        })
      )
      .handleRaw(
        "handleRaw",
        Effect.fn(function*({ path, request }) {
          const body = (yield* Effect.orDie(request.json)) as { name: string }
          return HttpServerResponse.unsafeJson({
            id: path.id,
            name: body.name
          })
        })
      )
)

const TopLevelLive = HttpApiBuilder.group(
  Api,
  "root",
  (handlers) => handlers.handle("healthz", (_) => Effect.void)
)

const HttpApiLive = Layer.provide(HttpApiBuilder.api(Api), [
  HttpGroupsLive,
  HttpUsersLive,
  TopLevelLive
])

const HttpLive = HttpApiBuilder.serve().pipe(
  Layer.provide(HttpApiBuilder.middlewareCors()),
  Layer.provide(HttpApiLive),
  Layer.provideMerge(NodeHttpServer.layerTest)
)
