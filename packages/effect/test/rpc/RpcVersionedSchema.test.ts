import { assert, describe, it } from "@effect/vitest"
import { Cause, Effect, ErrorReporter, Exit, Layer, Schema, SchemaGetter, type Scope, Stream } from "effect"
import { HttpClient, HttpEffect, HttpRouter, HttpServerRequest, HttpServerResponse } from "effect/http"
import { Rpc, RpcClient, RpcGroup, RpcSerialization, RpcServer, RpcTest } from "effect/rpc"
import { VersionedSchema } from "effect/schema"
import { ada, archived, Current, Next, Old, Org, org, orgEncoded, type Person } from "../schema/fixtures/versioned.ts"

const makeRpcs = <P extends Schema.Top>(person: P) =>
  RpcGroup.make(
    Rpc.make("GetPerson", { payload: { id: Schema.String }, success: person }),
    Rpc.make("UpdatePerson", { payload: { id: Schema.String, person }, success: person }),
    // a plain error, which the version errors must not be mistaken for
    Rpc.make("RenamePerson", {
      payload: { id: Schema.String, person },
      success: person,
      error: Schema.Struct({ message: Schema.String })
    }),
    Rpc.make("ListPeople", { success: person, stream: true }),
    Rpc.make("Ping", { success: Schema.String }),
    Rpc.make("SaveOrg", { payload: { owner: person, org: Org }, success: Org })
  )

const Rpcs = makeRpcs(Current.Person)
const OldRpcs = makeRpcs(Old.Person)
const NextRpcs = makeRpcs(Next.Person)

interface State {
  readonly store: Map<string, Person>
  handled: number
  readonly versions: Array<Readonly<Record<string, number>>>
  /** the `effect-versions` header of each request message */
  readonly headers: Array<string | undefined>
}

// the versions a handler is answering Address and Person at
const requestVersions = Effect.all({
  Address: VersionedSchema.requestVersion(Current.Address),
  Person: VersionedSchema.requestVersion(Current.Person)
})

const makeHandlers = (state: State) =>
  Rpcs.toLayer({
    GetPerson: ({ id }) =>
      Effect.map(requestVersions, (versions) => {
        state.versions.push(versions)
        return state.store.get(id)!
      }),
    UpdatePerson: ({ person }, { headers }) =>
      Effect.map(requestVersions, (versions) => {
        state.handled++
        state.versions.push(versions)
        state.headers.push(headers[VersionedSchema.header])
        return person
      }),
    RenamePerson: ({ id, person }) => Effect.succeed(id === "archived" ? archived : person),
    ListPeople: () => Stream.fromIterable(state.store.values()),
    Ping: (_, { headers }) =>
      Effect.map(requestVersions, (versions) => {
        state.versions.push(versions)
        state.headers.push(headers[VersionedSchema.header])
        return "pong"
      }),
    SaveOrg: ({ org }) => Effect.succeed(org)
  })

const test = <A, E>(
  name: string,
  f: (state: State) => Effect.Effect<A, E, HttpClient.HttpClient | RpcSerialization.RpcSerialization | Scope.Scope>,
  serialization: Layer.Layer<RpcSerialization.RpcSerialization> = RpcSerialization.layerJson,
  options?: {
    /** the versions the server answers types a request doesn't list at */
    readonly defaults?: VersionedSchema.Versions
  }
) =>
  it.effect(name, () =>
    Effect.gen(function*() {
      const state: State = {
        store: new Map([["ada", ada], ["archived", archived]]),
        handled: 0,
        versions: [],
        headers: []
      }
      const made = RpcServer.layer(Rpcs).pipe(
        Layer.provide(makeHandlers(state)),
        Layer.provide(RpcServer.layerProtocolHttp({ path: "/rpc" })),
        Layer.provide(serialization)
      )
      const server = options?.defaults === undefined
        ? made
        : made.pipe(Layer.provide(Layer.succeed(VersionedSchema.DefaultVersions, options.defaults)))
      const handler = yield* HttpRouter.toHttpEffect(server)
      const httpClient = HttpClient.make((request) =>
        handler.pipe(
          Effect.provideService(HttpServerRequest.HttpServerRequest, HttpServerRequest.fromClientRequest(request)),
          Effect.map((response) => HttpServerResponse.toClientResponse(response, { request })),
          Effect.orDie,
          Effect.scoped
        )
      )
      return yield* f(state).pipe(
        Effect.provideService(HttpClient.HttpClient, httpClient),
        Effect.provide(serialization)
      )
    }))

// `GetPerson` declared without versioned schemas, so its client sends no
// `effect-versions` header and returns the record as it was written
const Unversioned = RpcGroup.make(Rpc.make("GetPerson", { payload: { id: Schema.String }, success: Schema.Unknown }))

const clientFor = <R extends Rpc.Any>(group: RpcGroup.RpcGroup<R>) =>
  RpcClient.make(group).pipe(Effect.provide(RpcClient.layerProtocolHttp({ url: "http://localhost/rpc" })))

const failureOf = <A, E>(exit: Exit.Exit<A, E>): E => {
  assert.isTrue(Exit.isFailure(exit))
  const error = Exit.isFailure(exit) ? exit.cause.reasons.find((reason) => reason._tag === "Fail") : undefined
  assert.isDefined(error)
  return (error as { readonly error: E }).error
}

const adaV1 = { name: "Ada", status: "active" as const, address: { street: "1 Main St" } }

describe("Rpc with versioned schemas", () => {
  test("a client on the server's version gets the latest shape", (state) =>
    Effect.gen(function*() {
      const client = yield* clientFor(Rpcs)
      assert.deepStrictEqual(yield* client.GetPerson({ id: "ada" }), ada)
      assert.deepStrictEqual(state.versions, [{ Address: 2, Person: 3 }])
    }))

  test("an older client gets the versions it was built for, and its request is read", (state) =>
    Effect.gen(function*() {
      const client = yield* clientFor(OldRpcs)
      assert.deepStrictEqual(yield* client.GetPerson({ id: "ada" }), adaV1)
      assert.deepStrictEqual(yield* client.UpdatePerson({ id: "ada", person: adaV1 }), adaV1)
      assert.deepStrictEqual(state.versions, [{ Address: 1, Person: 1 }, { Address: 1, Person: 1 }])
      assert.deepStrictEqual(state.headers, ["Address=1, Person=1"])
    }))

  test("a newer client reads responses without retrying", () =>
    Effect.gen(function*() {
      const client = yield* clientFor(NextRpcs)
      assert.deepStrictEqual(yield* client.GetPerson({ id: "ada" }), ada)
    }))

  test("a newer client's request is rejected before the handler, and a retry succeeds", (state) =>
    Effect.gen(function*() {
      const client = yield* clientFor(NextRpcs)
      const update = client.UpdatePerson({ id: "ada", person: ada })
      const error = failureOf(yield* Effect.exit(update))
      assert.instanceOf(error, VersionedSchema.VersionUnsupported)
      assert.deepStrictEqual(
        (error as VersionedSchema.VersionUnsupported).supported,
        VersionedSchema.versions(Current.Address.version(2), Current.Person.version(3))
      )
      assert.strictEqual(state.handled, 0)

      const retried = yield* update.pipe(
        Effect.catchTag(
          "VersionUnsupported",
          (error) => update.pipe(Effect.provideService(VersionedSchema.ClientVersions, error.supported))
        )
      )
      assert.deepStrictEqual(retried, ada)
      assert.deepStrictEqual(state.headers, ["Address=2, Person=3"])
    }))

  test("a value an older client can't represent is a typed Unrepresentable", () =>
    Effect.gen(function*() {
      const client = yield* clientFor(OldRpcs)
      const error = failureOf(yield* Effect.exit(client.GetPerson({ id: "archived" })))
      assert.instanceOf(error, VersionedSchema.Unrepresentable)
    }))

  for (
    const [name, serialization] of [
      ["JSON", RpcSerialization.layerJson],
      ["SchemaBinary", RpcSerialization.layerSchemaBinary()]
    ] as const
  ) {
    test(
      `a stream ends at the first value the client can't represent, after the values before it (${name})`,
      (state) =>
        Effect.gen(function*() {
          // all three are sent in one chunk
          state.store.set("later", { ...ada, fullName: "Later" })
          const client = yield* clientFor(OldRpcs)
          const received: Array<unknown> = []
          const exit = yield* Effect.exit(
            Stream.runForEach(client.ListPeople(), (person) => Effect.sync(() => received.push(person)))
          )
          assert.deepStrictEqual(received, [adaV1])
          assert.instanceOf(failureOf(exit), VersionedSchema.Unrepresentable)
        }),
      serialization
    )
  }

  test("version errors aren't mistaken for a plain user error", () =>
    Effect.gen(function*() {
      const next = yield* clientFor(NextRpcs)
      const rejected = failureOf(yield* Effect.exit(next.RenamePerson({ id: "ada", person: ada })))
      assert.instanceOf(rejected, VersionedSchema.VersionUnsupported)
      const old = yield* clientFor(OldRpcs)
      const unrepresentable = failureOf(yield* Effect.exit(old.RenamePerson({ id: "archived", person: adaV1 })))
      assert.instanceOf(unrepresentable, VersionedSchema.Unrepresentable)
    }))

  test("recursive schemas built by a function don't stop the client from being built", () =>
    Effect.gen(function*() {
      // each level of this schema is a new one, so walking it never meets a node twice
      interface Node {
        readonly next?: Node | undefined
      }
      const NodeSchema = (): Schema.Codec<Node> => Schema.Struct({ next: Schema.optional(Schema.suspend(NodeSchema)) })
      const client = yield* clientFor(
        RpcGroup.make(Rpc.make("Ping", { success: Schema.String, payload: NodeSchema() }))
      )
      assert.isFunction(client.Ping)
    }))

  test("an rpc using two different versioned types with the same id fails when the client is built", () =>
    Effect.gen(function*() {
      const Other = VersionedSchema.make("Person", { version: 1, payload: Schema.Struct({ other: Schema.String }) })
      const Conflicting = RpcGroup.make(
        Rpc.make("Ping", { success: Schema.String }),
        Rpc.make("Compare", { payload: { other: Other }, success: Current.Person })
      )
      const exit = yield* Effect.exit(clientFor(Conflicting))
      assert.isTrue(Exit.isFailure(exit))
      assert.include(String(Cause.squash((exit as Exit.Failure<unknown, unknown>).cause)), "two different definitions")
    }))

  test("clients that don't negotiate get the latest versions, as without versioning", () =>
    Effect.gen(function*() {
      const client = yield* clientFor(Unversioned)
      assert.deepStrictEqual(yield* client.GetPerson({ id: "ada" }), Schema.encodeSync(Current.Person)(ada))
    }))

  test(
    "DefaultVersions pins the versions clients that don't negotiate get",
    (state) =>
      Effect.gen(function*() {
        const client = yield* clientFor(Unversioned)
        assert.deepStrictEqual(yield* client.GetPerson({ id: "ada" }), {
          _version: 1,
          name: "Ada",
          status: "active",
          address: { _version: 1, street: "1 Main St" }
        })
        assert.deepStrictEqual(state.versions, [{ Address: 2, Person: 1 }])
      }),
    RpcSerialization.layerJson,
    { defaults: Current.Person.version(1) }
  )

  test("a request the chosen versions can't represent fails before it is sent", (state) =>
    Effect.gen(function*() {
      const client = yield* clientFor(Rpcs)
      const exit = yield* Effect.exit(
        client.UpdatePerson({ id: "x", person: archived }).pipe(
          Effect.provideService(VersionedSchema.ClientVersions, Current.Person.version(2))
        )
      )
      assert.instanceOf(failureOf(exit), VersionedSchema.Unrepresentable)
      assert.strictEqual(state.handled, 0)
    }))

  test("a versioned type the search didn't find is a defect, not written at its latest version", (state) =>
    Effect.gen(function*() {
      const defectOf = (exit: Exit.Exit<unknown, unknown>) => {
        assert.isTrue(Exit.hasDies(exit))
        return String(Cause.squash((exit as Exit.Failure<unknown, unknown>).cause))
      }
      const client = yield* clientFor(Rpcs)
      assert.include(defectOf(yield* Effect.exit(client.SaveOrg({ owner: ada, org }))), `"Badge" wasn't found`)
      assert.deepStrictEqual(state.headers, [])
      // a client that writes the hierarchy itself, for the server to answer
      const Loose = RpcGroup.make(
        Rpc.make("SaveOrg", { payload: { owner: Current.Person, org: Schema.Unknown }, success: Schema.Unknown })
      )
      const loose = yield* clientFor(Loose)
      assert.include(
        defectOf(yield* Effect.exit(loose.SaveOrg({ owner: ada, org: orgEncoded }))),
        `"Badge" wasn't found`
      )
    }))

  test("rpcs without versioned schemas are unchanged", (state) =>
    Effect.gen(function*() {
      const client = yield* clientFor(Rpcs)
      assert.strictEqual(yield* client.Ping(), "pong")
      assert.deepStrictEqual(state.headers, [undefined])
      // nothing was negotiated, so its handler sees the latest versions
      assert.deepStrictEqual(state.versions, [{ Address: 2, Person: 3 }])
    }))

  test(
    "the binary serialization tells versions apart by _version, so builds on different versions agree",
    (state) =>
      Effect.gen(function*() {
        const old = yield* clientFor(OldRpcs)
        assert.deepStrictEqual(yield* old.GetPerson({ id: "ada" }), adaV1)
        assert.deepStrictEqual(yield* old.UpdatePerson({ id: "ada", person: adaV1 }), adaV1)
        const next = yield* clientFor(NextRpcs)
        assert.deepStrictEqual(yield* next.GetPerson({ id: "ada" }), ada)
        assert.deepStrictEqual(state.versions, [{ Address: 1, Person: 1 }, { Address: 1, Person: 1 }, {
          Address: 2,
          Person: 3
        }])
      }),
    RpcSerialization.layerSchemaBinary()
  )
})

describe("RpcServer with versioned schemas", () => {
  it.effect("reports a versioned type the search didn't find, as it does other encoding failures", () => {
    const reports: Array<string> = []
    return Effect.gen(function*() {
      const group = RpcGroup.make(Rpc.make("GetOrg", { success: Org }))
      const handler = HttpEffect.toWebHandler(
        yield* RpcServer.toHttpEffect(group).pipe(
          Effect.provide(Layer.mergeAll(
            group.toLayer({ GetOrg: () => Effect.succeed(org) }),
            RpcSerialization.layerNdjson
          ))
        )
      )
      const body = yield* Effect.promise(() =>
        handler(
          new Request("http://test/rpc", {
            method: "POST",
            body: `{"_tag":"Request","id":1,"tag":"GetOrg","payload":null,"headers":[]}\n`
          })
        ).then((response) => response.text())
      )
      const response = JSON.parse(body)
      assert.include(response.exit.cause[0].defect.message, `Failed to encode response for RPC "GetOrg"`)
      assert.include(response.exit.cause[0].defect.message, `"Badge" wasn't found`)
      assert.strictEqual(reports.length, 1)
      assert.include(reports[0], `Failed to encode response for RPC "GetOrg"`)
    }).pipe(Effect.provide(ErrorReporter.layer([ErrorReporter.make(({ error }) => reports.push(error.message))])))
  })
})

describe("RpcServer encoding defects", () => {
  it.effect("names the rpc whatever the defect is", () => {
    const reports: Array<string> = []
    return Effect.gen(function*() {
      // a defect that can't be turned into a string
      const Throwing = Schema.String.pipe(Schema.encode({
        decode: SchemaGetter.passthrough(),
        encode: SchemaGetter.transform(() => {
          throw Object.create(null)
        })
      }))
      const group = RpcGroup.make(Rpc.make("Get", { success: Throwing }))
      const handler = HttpEffect.toWebHandler(
        yield* RpcServer.toHttpEffect(group).pipe(
          Effect.provide(
            Layer.mergeAll(group.toLayer({ Get: () => Effect.succeed("x") }), RpcSerialization.layerNdjson)
          )
        )
      )
      const body = yield* Effect.promise(() =>
        handler(
          new Request("http://test/rpc", {
            method: "POST",
            body: `{"_tag":"Request","id":1,"tag":"Get","payload":null,"headers":[]}\n`
          })
        ).then((response) => response.text())
      )
      assert.strictEqual(JSON.parse(body).exit.cause[0].defect.message, `Failed to encode response for RPC "Get": {}`)
      assert.deepStrictEqual(reports, [`Failed to encode response for RPC "Get": {}`])
    }).pipe(Effect.provide(ErrorReporter.layer([ErrorReporter.make(({ error }) => reports.push(error.message))])))
  })
})

describe("RpcTest with versioned schemas", () => {
  it.effect("handlers see the versions of the client, without serialization", () =>
    Effect.gen(function*() {
      const state: State = { store: new Map([["ada", ada]]), handled: 0, versions: [], headers: [] }
      const client = yield* RpcTest.makeClient(Rpcs).pipe(Effect.provide(makeHandlers(state)))
      assert.deepStrictEqual(yield* client.GetPerson({ id: "ada" }), ada)
      assert.deepStrictEqual(state.versions, [{ Address: 2, Person: 3 }])
    }))
})
