import type { Context, Stream } from "effect"
import { Effect, hole, Layer, Schema } from "effect"
import { Entity } from "effect/cluster"
import type { HttpClient } from "effect/http"
import {
  HttpApi,
  type HttpApiClient,
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiMiddleware,
  HttpApiSchema
} from "effect/http-api"
import { type Atom, AtomHttpApi, type AtomRpc } from "effect/reactivity"
import { Rpc, type RpcClient, type RpcGroup, RpcMiddleware } from "effect/rpc"
import { VersionedSchema } from "effect/schema"
import { describe, expect, it } from "tstyche"

const PersonV1 = Schema.Struct({ name: Schema.String })
const PersonV2 = Schema.Struct({ fullName: Schema.String, email: Schema.optionalKey(Schema.String) })

const Person = VersionedSchema.make("Person", { version: 1, payload: PersonV1 }).next({
  version: 2,
  payload: PersonV2,
  migration: (s) => s.renameField("name", "fullName").addField("email")
})

describe("VersionedSchema", () => {
  it("requestVersion is one of the schema's versions", () => {
    expect(VersionedSchema.requestVersion(Person)).type.toBe<Effect.Effect<1 | 2>>()
    const Unversioned = VersionedSchema.make("Unversioned", { version: 1, payload: PersonV1, unversioned: true })
    expect(VersionedSchema.requestVersion(Unversioned)).type.toBe<Effect.Effect<1>>()
    expect(VersionedSchema.requestVersion).type.not.toBeCallableWith(PersonV1)
    expect(VersionedSchema.requestVersion).type.not.toBeCallableWith(Person.annotate({}))
  })

  it("versions are built from the schemas, so only declared types and versions type-check", () => {
    expect(Person.version(2)).type.toBe<VersionedSchema.Versions>()
    expect(Person.version).type.not.toBeCallableWith(3)
    expect(VersionedSchema.versions(Person.version(1), Person.version(2))).type.toBe<VersionedSchema.Versions>()
    expect(VersionedSchema.at).type.not.toBeCallableWith(Person, { Person: 1 })
    expect(VersionedSchema.ClientVersions).type.toBe<Context.Reference<VersionedSchema.Versions>>()
    expect(VersionedSchema.DefaultVersions).type.toBe<Context.Reference<VersionedSchema.Versions>>()
    expect(Layer.succeed(VersionedSchema.DefaultVersions)).type.not.toBeCallableWith({ Person: 1 })
    expect(Layer.succeed(VersionedSchema.DefaultVersions)).type.toBeCallableWith(Person.version(1))
    expect(Effect.provideService(VersionedSchema.ClientVersions)).type.not.toBeCallableWith({ Person: 1 })
    // a server's supported versions retry as they are
    expect(Effect.provideService(VersionedSchema.ClientVersions)).type.toBeCallableWith(
      hole<VersionedSchema.VersionUnsupported>().supported
    )
  })

  it("decodes every version's records into the latest payload's plain type", () => {
    expect(Schema.revealCodec(Person)).type.toBe<
      Schema.Codec<
        { readonly fullName: string; readonly email?: string },
        | { readonly _version: 1; readonly name: string }
        | { readonly _version: 2; readonly fullName: string; readonly email?: string },
        never,
        never
      >
    >()
    expect(Person.id).type.toBe<"Person">()
  })

  it("the unversioned first version's records have no _version", () => {
    const Legacy = VersionedSchema.make("Legacy", { version: 1, payload: PersonV1, unversioned: true }).next({
      version: 2,
      payload: PersonV2,
      migration: (s) => s.renameField("name", "fullName").addField("email")
    })
    expect<typeof Legacy.Encoded>().type.toBe<
      | { readonly _version?: never; readonly name: string }
      | { readonly _version: 2; readonly fullName: string; readonly email?: string }
    >()
  })

  it("next only compiles once the migration turns one version into the next", () => {
    const V1 = VersionedSchema.make("Person", { version: 1, payload: PersonV1 })
    type V1 = typeof PersonV1.Type
    type V2 = typeof PersonV2.Type
    const complete = (s: VersionedSchema.StepBuilder<V1, V1, V2>) => s.renameField("name", "fullName").addField("email")
    // doesn't add `email`
    const incomplete = (s: VersionedSchema.StepBuilder<V1, V1, V2>) => s.renameField("name", "fullName")
    expect(V1.next).type.toBeCallableWith({ version: 2, payload: PersonV2, migration: complete })
    expect(V1.next).type.not.toBeCallableWith({ version: 2, payload: PersonV2, migration: incomplete })
    // a version without a migration must have the same decoded data
    expect(V1.next).type.not.toBeCallableWith({ version: 2, payload: PersonV2 })
    expect(V1.next).type.toBeCallableWith({ version: 2, payload: Schema.Struct({ name: Schema.String }) })
    // versions are new numbers
    expect(V1.next).type.not.toBeCallableWith({ version: 1, payload: PersonV1 })
  })

  it("addField takes a value only for required fields", () => {
    const V1 = VersionedSchema.make("Account", { version: 1, payload: Schema.Struct({ name: Schema.String }) })
    V1.next({
      version: 2,
      payload: Schema.Struct({ name: Schema.String, slug: Schema.String }),
      migration: (s) => s.addField("slug", (previous) => previous.name)
    })
    V1.next({
      version: 2,
      payload: Schema.Struct({ name: Schema.String, nickname: Schema.optionalKey(Schema.String) }),
      // an optional field takes no value: it stays absent in upgraded records
      // @ts-expect-error Expected 1 arguments, but got 2
      migration: (s) => s.addField("nickname", () => "")
    })
  })

  it("payloads are encoded as objects without a _version field", () => {
    expect(VersionedSchema.make).type.not.toBeCallableWith("A", { version: 1, payload: Schema.String })
    expect(VersionedSchema.make).type.not.toBeCallableWith("A", {
      version: 1,
      payload: Schema.Struct({ _version: Schema.Number })
    })
  })

  it("at keeps the schema's types", () => {
    const Team = Schema.Struct({ members: Schema.Array(Person) })
    expect(Schema.revealCodec(VersionedSchema.at(Team, Person.version(1)))).type.toBe<
      Schema.Codec<
        { readonly members: ReadonlyArray<{ readonly fullName: string; readonly email?: string }> },
        {
          readonly members: ReadonlyArray<
            | { readonly _version: 1; readonly name: string }
            | { readonly _version: 2; readonly fullName: string; readonly email?: string }
          >
        },
        never,
        never
      >
    >()
  })

  it("negotiation errors apply to schemas that contain a versioned schema", () => {
    type Errors = VersionedSchema.VersionUnsupported | VersionedSchema.Unrepresentable
    expect<VersionedSchema.NegotiationErrors<typeof Person>>().type.toBe<Errors>()
    expect<VersionedSchema.NegotiationErrors<Schema.Struct<{ people: Schema.$Array<typeof Person> }>>>().type.toBe<
      Errors
    >()
    expect<VersionedSchema.NegotiationErrors<Schema.Union<[typeof Person, Schema.String]>>>().type.toBe<Errors>()
    expect<VersionedSchema.NegotiationErrors<ReturnType<typeof VersionedSchema.at<typeof Person>>>>().type.toBe<
      Errors
    >()
    expect<VersionedSchema.NegotiationErrors<Schema.toType<typeof Person>>>().type.toBe<never>()
    expect<VersionedSchema.NegotiationErrors<Schema.toEncoded<typeof Person>>>().type.toBe<never>()
    expect<VersionedSchema.NegotiationErrors<Schema.flip<typeof Person>>>().type.toBe<never>()
    expect<VersionedSchema.NegotiationErrors<typeof PersonV2>>().type.toBe<never>()
  })

  it("negotiation errors survive the combinators that rebuild a schema", () => {
    type Errors = VersionedSchema.VersionUnsupported | VersionedSchema.Unrepresentable
    const annotated = Person.annotate({ description: "a person" })
    const branded = Person.pipe(Schema.brand("Person"))
    const checked = Person.check(Schema.makeFilter((person) => person.fullName !== ""))
    expect<VersionedSchema.NegotiationErrors<typeof annotated>>().type.toBe<Errors>()
    expect<VersionedSchema.NegotiationErrors<typeof branded>>().type.toBe<Errors>()
    expect<VersionedSchema.NegotiationErrors<typeof checked>>().type.toBe<Errors>()
    expect<VersionedSchema.NegotiationErrors<Schema.Struct<{ person: typeof annotated }>>>().type.toBe<Errors>()
    expect<VersionedSchema.NegotiationErrors<Schema.Result<Schema.String, typeof Person>>>().type.toBe<Errors>()
  })

  it("negotiation errors are found in tagged unions, struct rests and optional unversioned histories", () => {
    type Errors = VersionedSchema.VersionUnsupported | VersionedSchema.Unrepresentable
    const tagged = Schema.TaggedUnion({ Found: { person: Person }, Missing: {} })
    const rest = Schema.StructWithRest(Schema.Struct({ id: Schema.String }), [Schema.Record(Schema.String, Person)])
    const Legacy = VersionedSchema.make("Legacy", { version: 1, payload: PersonV1, unversioned: true })
    expect<VersionedSchema.NegotiationErrors<typeof tagged>>().type.toBe<Errors>()
    expect<VersionedSchema.NegotiationErrors<typeof rest>>().type.toBe<Errors>()
    expect<VersionedSchema.NegotiationErrors<Schema.Struct<{ a: Schema.optionalKey<typeof Legacy> }>>>().type.toBe<
      Errors
    >()
    expect<VersionedSchema.NegotiationErrors<Schema.Struct<{ a: Schema.optional<typeof Legacy> }>>>().type.toBe<
      Errors
    >()
    expect<VersionedSchema.NegotiationErrors<Schema.toType<typeof Legacy>>>().type.toBe<never>()
    const graph = Schema.Graph("directed", Person, Schema.String)
    expect<VersionedSchema.NegotiationErrors<typeof graph>>().type.toBe<Errors>()
  })

  it("versioned schemas keep their constructor types", () => {
    const withDefault = Person.pipe(Schema.withConstructorDefault(Effect.succeed({ fullName: "Ada" })))
    expect(Schema.Struct({ person: withDefault }).make).type.toBeCallableWith({})
    const Annotated = Schema.Struct({ person: Person.annotate({ description: "a person" }) })
    expect(Annotated.make).type.toBeCallableWith({ person: { fullName: "Ada" } })
    expect(Annotated.make).type.not.toBeCallableWith({ person: 123 })
  })

  it("deep schemas without versioned ones stay cheap to check", () => {
    const level = <S extends Schema.Top>(s: S) => Schema.Struct({ a: s, b: Schema.Array(s) })
    const L5 = level(level(level(level(level(Schema.String)))))
    const L10 = level(level(level(level(level(L5)))))
    const L15 = level(level(level(level(level(L10)))))
    const L20 = level(level(level(level(level(L15)))))
    expect<VersionedSchema.NegotiationErrors<typeof L20>>().type.toBe<never>()
  })
})

describe("HttpApi", () => {
  it("endpoints with versioned bodies can fail with the negotiation errors", () => {
    const versioned = HttpApiEndpoint.put("update", "/people", { payload: Person, success: Person })
    const plain = HttpApiEndpoint.get("ping", "/ping", { success: Schema.String })
    expect<HttpApiEndpoint.Errors<typeof versioned>>().type.toBe<
      VersionedSchema.VersionUnsupported | VersionedSchema.Unrepresentable
    >()
    expect<HttpApiEndpoint.Errors<typeof plain>>().type.toBe<never>()
  })

  it("a versioned schema in a middleware error counts too", () => {
    const Denied = Schema.TaggedStruct("Denied", { person: Person })
    class Guard extends HttpApiMiddleware.Service<Guard>()("Guard", { error: Denied }) {}
    const guarded = HttpApiEndpoint.get("ping", "/ping", { success: Schema.String }).middleware(Guard)
    expect<HttpApiEndpoint.Errors<typeof guarded>>().type.toBe<
      typeof Denied.Type | VersionedSchema.VersionUnsupported | VersionedSchema.Unrepresentable
    >()
  })

  it("handler requests keep their shape; handlers read versions with requestVersion", () => {
    const versioned = HttpApiEndpoint.put("update", "/people", { payload: Person, success: Person })
    expect<HttpApiEndpoint.Request<typeof versioned>>().type.not.toHaveProperty("versions")
  })

  it("stream bodies negotiate too, and Server-Sent Events can fail with Unrepresentable", () => {
    const sse = HttpApiSchema.StreamSse({ data: Person })
    const events = HttpApiEndpoint.get("events", "/events", { success: sse })
    const lines = HttpApiEndpoint.get("lines", "/lines", { success: HttpApiSchema.StreamNdjson({ schema: Person }) })
    type Errors = VersionedSchema.VersionUnsupported | VersionedSchema.Unrepresentable
    expect<HttpApiEndpoint.Errors<typeof events>>().type.toBe<Errors>()
    expect<HttpApiEndpoint.Errors<typeof lines>>().type.toBe<Errors>()
    type Unrepresentable<S> = Extract<Stream.Error<HttpApiClient.SuccessType<S>>, VersionedSchema.Unrepresentable>
    const plain = HttpApiSchema.StreamSse({ data: Schema.String })
    expect<Unrepresentable<typeof sse>>().type.toBe<VersionedSchema.Unrepresentable>()
    expect<Unrepresentable<typeof plain>>().type.toBe<never>()
  })
})

describe("Rpc", () => {
  const Versioned = Rpc.make("Update", { payload: { person: Person }, success: Person })
  const Plain = Rpc.make("Ping", { success: Schema.String })

  it("clients of rpcs with versioned schemas can fail with the negotiation errors", () => {
    type Client = RpcClient.RpcClient<RpcGroup.Rpcs<RpcGroup.RpcGroup<typeof Versioned | typeof Plain>>>
    expect<Effect.Error<ReturnType<Client["Update"]>>>().type.toBe<
      VersionedSchema.VersionUnsupported | VersionedSchema.Unrepresentable
    >()
    expect<Effect.Error<ReturnType<Client["Ping"]>>>().type.toBe<never>()
  })

  it("handler options keep their shape; handlers read versions with requestVersion", () => {
    type Options = Parameters<Rpc.ToHandlerFn<typeof Versioned>>[1]
    expect<Options>().type.not.toHaveProperty("versions")
  })

  it("a versioned schema in a middleware error counts too", () => {
    const Denied = Schema.TaggedStruct("Denied", { person: Person })
    class Guard extends RpcMiddleware.Service<Guard>()("Guard", { error: Denied, requiredForClient: undefined }) {}
    const Guarded = Rpc.make("Guarded", { success: Schema.String }).middleware(Guard)
    type Errors = typeof Denied.Type | VersionedSchema.VersionUnsupported | VersionedSchema.Unrepresentable
    expect<Rpc.Error<typeof Guarded>>().type.toBe<Errors>()
    type Client = RpcClient.RpcClient<RpcGroup.Rpcs<RpcGroup.RpcGroup<typeof Guarded>>>
    expect<Effect.Error<ReturnType<Client["Guarded"]>>>().type.toBe<Errors>()
  })
})

describe("Cluster", () => {
  type Errors = VersionedSchema.VersionUnsupported | VersionedSchema.Unrepresentable
  const People = Entity.make("People", [
    Rpc.make("Update", { payload: { person: Person }, success: Person }),
    Rpc.make("Ping", { success: Schema.String })
  ])

  it("entity clients can fail with the negotiation errors", () => {
    type Client = ReturnType<Effect.Success<typeof People.client>>
    expect<Extract<Effect.Error<ReturnType<Client["Update"]>>, Errors>>().type.toBe<Errors>()
    expect<Extract<Effect.Error<ReturnType<Client["Ping"]>>, Errors>>().type.toBe<never>()
  })

  it("entity requests keep their shape; handlers read versions with requestVersion", () => {
    type Request = Parameters<Entity.HandlersFrom<RpcGroup.Rpcs<typeof People.protocol>>["Update"]>[0]
    expect<Request>().type.not.toHaveProperty("versions")
  })
})

describe("Atom wrappers", () => {
  type Errors = VersionedSchema.VersionUnsupported | VersionedSchema.Unrepresentable

  it("AtomHttpApi queries can fail with the negotiation errors", () => {
    const Api = HttpApi.make("Api").add(
      HttpApiGroup.make("people")
        .add(HttpApiEndpoint.get("get", "/person", { success: Person }))
        .add(HttpApiEndpoint.get("ping", "/ping", { success: Schema.String }))
    )
    const Client = AtomHttpApi.Service()("Client", { api: Api, httpClient: hole<Layer.Layer<HttpClient.HttpClient>>() })
    expect<Extract<Atom.Failure<ReturnType<typeof Client.query<"people", "get">>>, Errors>>().type.toBe<Errors>()
    expect<Extract<Atom.Failure<ReturnType<typeof Client.query<"people", "ping">>>, Errors>>().type.toBe<never>()
  })

  it("AtomRpc queries can fail with the negotiation errors", () => {
    const Get = Rpc.make("Get", { success: Person })
    const Ping = Rpc.make("Ping", { success: Schema.String })
    const client = hole<AtomRpc.AtomRpcClient<unknown, "Client", typeof Get | typeof Ping>>()
    expect<Extract<Atom.Failure<ReturnType<typeof client.query<"Get">>>, Errors>>().type.toBe<Errors>()
    expect<Extract<Atom.Failure<ReturnType<typeof client.query<"Ping">>>, Errors>>().type.toBe<never>()
  })
})
