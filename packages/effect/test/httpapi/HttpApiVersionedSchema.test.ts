import { assert, describe, it } from "@effect/vitest"
import { Cause, Effect, Exit, FileSystem, Layer, Path, Schema, type Scope, Stream } from "effect"
import {
  Etag,
  HttpClient,
  HttpClientRequest,
  HttpPlatform,
  HttpRouter,
  HttpServerRequest,
  HttpServerResponse
} from "effect/http"
import {
  HttpApi,
  HttpApiBuilder,
  HttpApiClient,
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiMiddleware,
  HttpApiSchema,
  OpenApi
} from "effect/http-api"
import { VersionedSchema } from "effect/schema"
import { ada, archived, Current, Next, Old, Org, org, orgEncoded, type Person } from "../schema/fixtures/versioned.ts"

// a plain error, which the version errors must not be mistaken for
const Invalid = Schema.Struct({ message: Schema.String }).annotate({ httpApiStatus: 422 })

// Each build's API, typed with the server's conflict error to keep the helper simple.
const makeApi = <P extends Schema.Top>(types: { readonly Person: P; readonly Conflict: Schema.Top }) =>
  HttpApi.make("app").add(
    HttpApiGroup.make("people")
      .add(HttpApiEndpoint.get("get", "/people/:id", { params: { id: Schema.String }, success: types.Person }))
      .add(HttpApiEndpoint.put("update", "/people/:id", {
        params: { id: Schema.String },
        payload: types.Person,
        success: types.Person,
        error: types.Conflict as typeof Current.Conflict
      }))
      .add(HttpApiEndpoint.put("rename", "/people/:id/name", {
        params: { id: Schema.String },
        payload: types.Person,
        success: types.Person,
        error: Invalid
      }))
      .add(HttpApiEndpoint.get("events", "/events", { success: HttpApiSchema.StreamSse({ data: types.Person }) }))
      .add(HttpApiEndpoint.get("plainFeed", "/plain-feed", {
        success: HttpApiSchema.StreamSse({ data: types.Person, error: Schema.Struct({ message: Schema.String }) })
      }))
      .add(HttpApiEndpoint.get("feed", "/feed", {
        success: HttpApiSchema.StreamSse({ data: types.Person, error: types.Conflict as typeof Current.Conflict })
      }))
      .add(HttpApiEndpoint.get("lines", "/lines", { success: HttpApiSchema.StreamNdjson({ schema: types.Person }) }))
      .add(HttpApiEndpoint.post("import", "/import", {
        payload: HttpApiSchema.StreamNdjson({ schema: types.Person }),
        success: Schema.Array(types.Person)
      }))
      .add(HttpApiEndpoint.get("ping", "/ping", { success: Schema.String }))
      .add(HttpApiEndpoint.put("org", "/org", { payload: Org, success: Org }))
  )

const Api = makeApi(Current)
const OldApi = makeApi(Old)
const NextApi = makeApi(Next)

interface State {
  readonly store: Map<string, Person>
  /** how many times the update handler ran */
  handled: number
  /** the versions each handler call saw */
  readonly versions: Array<Readonly<Record<string, number>>>
  /** the records the update handler wrote to its own storage */
  readonly stored: Array<unknown>
  /** the people the import handler read */
  readonly imported: Array<Person>
  /** the `effect-versions` header of each request, and the status of its response */
  readonly exchanges: Array<{ header: string | undefined; status?: number }>
}

// the versions a handler is answering Address and Person at
const requestVersions = Effect.all({
  Address: VersionedSchema.requestVersion(Current.Address),
  Person: VersionedSchema.requestVersion(Current.Person)
})

const makeServer = (state: State) =>
  HttpApiBuilder.layer(Api).pipe(
    Layer.provide(HttpApiBuilder.group(Api, "people", (handlers) =>
      handlers
        .handle("get", ({ params }) =>
          Effect.map(requestVersions, (versions) => {
            state.versions.push(versions)
            return state.store.get(params.id)!
          }))
        .handle("update", ({ params, payload }) =>
          Effect.gen(function*() {
            state.handled++
            state.versions.push(yield* requestVersions)
            if (params.id === "conflict") {
              return yield* Effect.fail(Current.Conflict.make({ current: archived }))
            }
            state.stored.push(yield* Effect.orDie(Schema.encodeEffect(Current.Person)(payload)))
            state.store.set(params.id, payload)
            return payload
          }))
        .handle("rename", ({ params, payload }) => Effect.succeed(params.id === "archived" ? archived : payload))
        .handle("plainFeed", () => Effect.succeed(Stream.fromIterable(state.store.values())))
        .handle("events", () => Effect.succeed(Stream.fromIterable(state.store.values())))
        .handle(
          "feed",
          () =>
            Effect.succeed(Stream.concat(Stream.make(ada), Stream.fail(Current.Conflict.make({ current: archived }))))
        )
        .handle("lines", () => Effect.succeed(Stream.fromIterable(state.store.values())))
        .handle("import", ({ payload }) =>
          Stream.runForEach(payload, (person) => Effect.sync(() => state.imported.push(person))).pipe(
            Effect.as(state.imported),
            Effect.orDie
          ))
        .handle("ping", () => Effect.succeed("pong"))
        .handle("org", ({ payload }) => Effect.succeed(payload)))),
    Layer.provide([Path.layer, Etag.layerWeak, HttpPlatform.layer]),
    Layer.provide(FileSystem.layerNoop({}))
  )

const test = <A, E>(
  name: string,
  f: (state: State) => Effect.Effect<A, E, HttpClient.HttpClient | Scope.Scope>,
  options?: {
    readonly problemDetails?: boolean
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
        stored: [],
        imported: [],
        exchanges: []
      }
      const made = options?.problemDetails ? makeProblemServer(state) : makeServer(state)
      const server = options?.defaults === undefined
        ? made
        : made.pipe(Layer.provide(Layer.succeed(VersionedSchema.DefaultVersions, options.defaults)))
      const handler = yield* HttpRouter.toHttpEffect(server)
      const httpClient = HttpClient.make((request) => {
        const exchange: State["exchanges"][number] = { header: request.headers[VersionedSchema.header] }
        state.exchanges.push(exchange)
        return handler.pipe(
          Effect.provideService(HttpServerRequest.HttpServerRequest, HttpServerRequest.fromClientRequest(request)),
          Effect.map((response) => {
            exchange.status = response.status
            return HttpServerResponse.toClientResponse(response, { request })
          }),
          Effect.orDie,
          Effect.scoped
        )
      })
      return yield* f(state).pipe(Effect.provideService(HttpClient.HttpClient, httpClient))
    }))

const ProblemApi = Api.middleware(HttpApiMiddleware.ProblemDetails)

const makeProblemServer = (state: State) =>
  HttpApiBuilder.layer(ProblemApi).pipe(
    Layer.provide(HttpApiBuilder.group(ProblemApi, "people", (handlers) =>
      handlers
        .handle("get", ({ params }) => Effect.succeed(state.store.get(params.id)!))
        .handle("update", ({ payload }) => {
          state.handled++
          return Effect.succeed(payload)
        })
        .handle("rename", ({ payload }) => Effect.succeed(payload))
        .handle("plainFeed", () => Effect.succeed(Stream.empty))
        .handle("events", () => Effect.succeed(Stream.empty))
        .handle("feed", () => Effect.succeed(Stream.empty))
        .handle("lines", () => Effect.succeed(Stream.empty))
        .handle("import", () => Effect.succeed([]))
        .handle("ping", () => Effect.succeed("pong"))
        .handle("org", ({ payload }) => Effect.succeed(payload)))),
    Layer.provide(HttpApiMiddleware.layerProblemDetails()),
    Layer.provide([Path.layer, Etag.layerWeak, HttpPlatform.layer]),
    Layer.provide(FileSystem.layerNoop({}))
  )

const baseUrl = "http://localhost"

const clientFor = <Groups extends HttpApiGroup.Constraint>(api: HttpApi.HttpApi<"app", Groups>) =>
  Effect.flatMap(HttpClient.HttpClient, (httpClient) => HttpApiClient.makeWith(api, { httpClient, baseUrl }))

const raw = (request: HttpClientRequest.HttpClientRequest) =>
  Effect.flatMap(HttpClient.HttpClient, (client) => client.execute(HttpClientRequest.prependUrl(request, baseUrl)))

const failureOf = <A, E>(exit: Exit.Exit<A, E>): E => {
  assert.isTrue(Exit.isFailure(exit))
  const error = Exit.isFailure(exit) ? exit.cause.reasons.find((reason) => reason._tag === "Fail") : undefined
  assert.isDefined(error)
  return (error as { readonly error: E }).error
}

const adaV1 = { name: "Ada", status: "active" as const, address: { street: "1 Main St" } }

// the values a stream delivered, and how it ended
const collect = Effect.fnUntraced(function*<A, E>(stream: Stream.Stream<A, E>) {
  const received: Array<A> = []
  const exit = yield* Effect.exit(Stream.runForEach(stream, (a) => Effect.sync(() => received.push(a))))
  return { received, exit }
})

describe("HttpApi with versioned schemas", () => {
  test("a client on the server's version gets the latest shape and says which versions it speaks", (state) =>
    Effect.gen(function*() {
      const client = yield* clientFor(Api)
      assert.deepStrictEqual(yield* client.people.get({ params: { id: "ada" } }), ada)
      assert.deepStrictEqual(state.exchanges, [{ header: "Address=2, Person=3", status: 200 }])
      assert.deepStrictEqual(state.versions, [{ Address: 2, Person: 3 }])
    }))

  test("an older client gets the versions it was built for", (state) =>
    Effect.gen(function*() {
      const client = yield* clientFor(OldApi)
      assert.deepStrictEqual(yield* client.people.get({ params: { id: "ada" } }), adaV1)
      assert.deepStrictEqual(state.versions, [{ Address: 1, Person: 1 }])
    }))

  test("an older client's request is read into the latest type, and its handler writes the latest version", (state) =>
    Effect.gen(function*() {
      const client = yield* clientFor(OldApi)
      const updated = yield* client.people.update({ params: { id: "ada" }, payload: { ...adaV1, name: "Ada L" } })
      assert.deepStrictEqual(updated, { ...adaV1, name: "Ada L" })
      assert.deepStrictEqual(state.store.get("ada"), {
        fullName: "Ada L",
        status: "active",
        address: { street: "1 Main St" }
      })
      // the client's versions apply only to the response, not to what the handler writes
      assert.deepStrictEqual(state.stored, [{
        _version: 3,
        fullName: "Ada L",
        status: "active",
        address: { _version: 2, street: "1 Main St" }
      }])
    }))

  test("a newer client reads responses without retrying", () =>
    Effect.gen(function*() {
      const client = yield* clientFor(NextApi)
      assert.deepStrictEqual(yield* client.people.get({ params: { id: "ada" } }), ada)
    }))

  test("a newer client's request is rejected before the handler, and a retry at the supported versions succeeds", (state) =>
    Effect.gen(function*() {
      const client = yield* clientFor(NextApi)
      const update = client.people.update({ params: { id: "ada" }, payload: ada })
      const error = failureOf(yield* Effect.exit(update))
      assert.instanceOf(error, VersionedSchema.VersionUnsupported)
      const { id, oldest, requested, supported } = error as VersionedSchema.VersionUnsupported
      assert.deepStrictEqual({ id, requested, oldest, supported }, {
        id: "Person",
        requested: 4,
        oldest: 1,
        supported: { Address: 2, Person: 3 }
      })
      assert.strictEqual(state.handled, 0)
      assert.strictEqual(state.exchanges[0].status, 400)

      const retried = yield* update.pipe(
        Effect.catchTag(
          "VersionUnsupported",
          (error) => update.pipe(Effect.provideService(VersionedSchema.ClientVersions, error.supported))
        )
      )
      assert.deepStrictEqual(retried, ada)
      assert.strictEqual(state.handled, 1)
      assert.strictEqual(state.exchanges[2].header, "Address=2, Person=3")
    }))

  test("a value an older client can't represent is a typed Unrepresentable, including inside errors", (state) =>
    Effect.gen(function*() {
      const client = yield* clientFor(OldApi)
      const error = failureOf(yield* Effect.exit(client.people.get({ params: { id: "archived" } })))
      assert.instanceOf(error, VersionedSchema.Unrepresentable)
      assert.strictEqual(
        (error as VersionedSchema.Unrepresentable).reason,
        "Person can't be written at v1: archived people need Person v3"
      )
      assert.strictEqual(state.exchanges[0].status, 406)

      const conflict = failureOf(
        yield* Effect.exit(client.people.update({ params: { id: "conflict" }, payload: adaV1 }))
      )
      assert.instanceOf(conflict, VersionedSchema.Unrepresentable)
    }))

  test("a client can choose older versions, and its header and body agree", (state) =>
    Effect.gen(function*() {
      const client = yield* clientFor(Api)
      const person = yield* client.people.update({ params: { id: "ada" }, payload: ada }).pipe(
        Effect.provideService(VersionedSchema.ClientVersions, Current.Person.version(1))
      )
      // Person v1 has no email, and its address is the Address v1 it was declared with
      assert.deepStrictEqual(person, { fullName: "Ada", status: "active", address: { street: "1 Main St" } })
      assert.deepStrictEqual(state.exchanges[0].header, "Address=2, Person=1")
      assert.deepStrictEqual(state.versions, [{ Address: 2, Person: 1 }])
    }))

  test("a request the chosen versions can't represent fails before it is sent", (state) =>
    Effect.gen(function*() {
      const client = yield* clientFor(Api)
      const exit = yield* Effect.exit(
        client.people.update({ params: { id: "x" }, payload: archived }).pipe(
          Effect.provideService(VersionedSchema.ClientVersions, Current.Person.version(2))
        )
      )
      assert.instanceOf(failureOf(exit), VersionedSchema.Unrepresentable)
      assert.deepStrictEqual(state.exchanges, [])
    }))

  test("requests without the header get the latest versions, as without versioning", () =>
    Effect.gen(function*() {
      const response = yield* raw(HttpClientRequest.get("/people/ada"))
      assert.deepStrictEqual(yield* response.json, Schema.encodeSync(Current.Person)(ada))
    }))

  test("DefaultVersions pins the versions requests without the header get", (state) =>
    Effect.gen(function*() {
      const response = yield* raw(HttpClientRequest.get("/people/ada"))
      // Person v1 holds the Address it was declared with, v1
      assert.deepStrictEqual(yield* response.json, {
        _version: 1,
        ...adaV1,
        address: { _version: 1, street: "1 Main St" }
      })
      assert.deepStrictEqual(state.versions, [{ Address: 2, Person: 1 }])
      // a client that negotiates isn't affected
      const client = yield* clientFor(Api)
      assert.deepStrictEqual(yield* client.people.get({ params: { id: "ada" } }), ada)
      assert.deepStrictEqual(state.versions[1], { Address: 2, Person: 3 })
    }), { defaults: Current.Person.version(1) })

  test("streams are written and read at the client's versions", (state) =>
    Effect.gen(function*() {
      state.store.delete("archived")
      const client = yield* clientFor(OldApi)
      assert.deepStrictEqual(yield* Stream.runCollect(yield* client.people.events()), [adaV1])
      assert.deepStrictEqual(yield* Stream.runCollect(yield* client.people.lines()), [adaV1])
      assert.deepStrictEqual(yield* client.people.import({ payload: Stream.make(adaV1) }), [adaV1])
    }))

  test("a stream ends at the first value the client can't represent, after the values before it", (state) =>
    Effect.gen(function*() {
      // all three are sent in one chunk
      state.store.set("later", { ...ada, fullName: "Later" })
      const client = yield* clientFor(OldApi)

      // Server-Sent Events carry the typed failure
      const events = yield* collect(yield* client.people.events())
      assert.deepStrictEqual(events.received, [adaV1])
      assert.instanceOf(failureOf(events.exit), VersionedSchema.Unrepresentable)

      // NDJSON has no failure channel, so the response is cut off
      const lines = yield* collect(yield* client.people.lines())
      assert.deepStrictEqual(lines.received, [adaV1])
      assert.isTrue(Exit.isFailure(lines.exit))

      // a typed stream failure holding such a value becomes Unrepresentable
      const feed = yield* collect(yield* client.people.feed())
      assert.deepStrictEqual(feed.received, [adaV1])
      assert.instanceOf(failureOf(feed.exit), VersionedSchema.Unrepresentable)
    }))

  test("a request stream stops at the first value the chosen versions can't represent", (state) =>
    Effect.gen(function*() {
      const client = yield* clientFor(Api)
      const exit = yield* Effect.exit(
        client.people.import({ payload: Stream.make(ada, archived, ada) }).pipe(
          Effect.provideService(VersionedSchema.ClientVersions, Current.Person.version(2))
        )
      )
      // a streamed body has no failure channel, so the request fails like any cut-off body
      assert.isTrue(Exit.isFailure(exit))
      assert.deepStrictEqual(state.imported, [ada])
    }))

  test("version errors aren't mistaken for a plain user error", (state) =>
    Effect.gen(function*() {
      const next = yield* clientFor(NextApi)
      const rejected = failureOf(yield* Effect.exit(next.people.rename({ params: { id: "ada" }, payload: ada })))
      assert.instanceOf(rejected, VersionedSchema.VersionUnsupported)
      assert.deepStrictEqual(
        (rejected as VersionedSchema.VersionUnsupported).supported,
        VersionedSchema.versions(Current.Address.version(2), Current.Person.version(3))
      )
      const old = yield* clientFor(OldApi)
      const unrepresentable = failureOf(
        yield* Effect.exit(old.people.rename({ params: { id: "archived" }, payload: adaV1 }))
      )
      assert.instanceOf(unrepresentable, VersionedSchema.Unrepresentable)
      assert.deepStrictEqual(state.exchanges.map((exchange) => exchange.status), [400, 406])
      // also in the failure event of Server-Sent Events
      const feed = yield* collect(yield* old.people.plainFeed())
      assert.deepStrictEqual(feed.received, [adaV1])
      assert.instanceOf(failureOf(feed.exit), VersionedSchema.Unrepresentable)
    }))

  test("version errors stay typed behind Problem Details", (state) =>
    Effect.gen(function*() {
      const next = yield* clientFor(NextApi)
      const rejected = failureOf(yield* Effect.exit(next.people.update({ params: { id: "ada" }, payload: ada })))
      assert.instanceOf(rejected, VersionedSchema.VersionUnsupported)
      assert.strictEqual(state.handled, 0)

      const old = yield* clientFor(OldApi)
      const unrepresentable = failureOf(yield* Effect.exit(old.people.get({ params: { id: "archived" } })))
      assert.instanceOf(unrepresentable, VersionedSchema.Unrepresentable)
      assert.strictEqual(state.exchanges[1].status, 406)
    }), { problemDetails: true })

  test("decodeResponse reads versioned responses by their version field", () =>
    Effect.gen(function*() {
      // pinned to the oldest versions, which the decoder upgrades
      const response = yield* raw(HttpClientRequest.get("/people/ada"))
      const decode = HttpApiClient.decodeResponse(Api, { group: "people", endpoint: "get" })
      assert.deepStrictEqual(yield* decode(response), {
        fullName: "Ada",
        status: "active",
        address: { street: "1 Main St" }
      })
    }), { defaults: VersionedSchema.versions(Current.Address.version(1), Current.Person.version(1)) })

  test("endpoints without versioned schemas are unchanged", (state) =>
    Effect.gen(function*() {
      const client = yield* clientFor(Api)
      assert.strictEqual(yield* client.people.ping(), "pong")
      assert.deepStrictEqual(state.exchanges, [{ header: undefined, status: 200 }])
    }))

  test("a versioned type the search didn't find is a defect, not written at its latest version", (state) =>
    Effect.gen(function*() {
      const defectOf = (exit: Exit.Exit<unknown, unknown>) => {
        assert.isTrue(Exit.hasDies(exit))
        return String(Cause.squash((exit as Exit.Failure<unknown, unknown>).cause))
      }
      const client = yield* clientFor(Api)
      assert.include(defectOf(yield* Effect.exit(client.people.org({ payload: org }))), `"Badge" wasn't found`)
      assert.deepStrictEqual(state.exchanges, [])
      // the server's answer to a request that carries the hierarchy
      const response = raw(HttpClientRequest.put("/org").pipe(HttpClientRequest.bodyJsonUnsafe(orgEncoded)))
      assert.include(defectOf(yield* Effect.exit(response)), `"Badge" wasn't found`)
      assert.strictEqual(state.exchanges.length, 1)
    }))

  it("a record of a version the server doesn't know is a 400, even without the header", async () => {
    const state: State = {
      store: new Map([["ada", ada]]),
      handled: 0,
      versions: [],
      stored: [],
      imported: [],
      exchanges: []
    }
    const { dispose, handler } = HttpRouter.toWebHandler(makeServer(state), { disableLogger: true })
    try {
      const response = await handler(
        new Request(`${baseUrl}/people/ada`, {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ _version: 9, fullName: "x" })
        })
      )
      assert.strictEqual(response.status, 400)
      assert.strictEqual(state.handled, 0)
    } finally {
      await dispose()
    }
  })

  it("responses of versioned endpoints vary on the versions header", async () => {
    const state: State = {
      store: new Map([["ada", ada]]),
      handled: 0,
      versions: [],
      stored: [],
      imported: [],
      exchanges: []
    }
    const { dispose, handler } = HttpRouter.toWebHandler(makeServer(state), { disableLogger: true })
    try {
      const versioned = await handler(new Request(`${baseUrl}/people/ada`))
      assert.strictEqual(versioned.headers.get("vary"), "effect-versions")
      const rejected = await handler(
        new Request(`${baseUrl}/people/ada`, {
          method: "PUT",
          headers: { "content-type": "application/json", "effect-versions": "Person=4" },
          body: JSON.stringify({ _version: 4 })
        })
      )
      assert.strictEqual(rejected.status, 400)
      assert.strictEqual(rejected.headers.get("vary"), "effect-versions")
      const plain = await handler(new Request(`${baseUrl}/ping`))
      assert.isNull(plain.headers.get("vary"))
    } finally {
      await dispose()
    }
  })
})

describe("HttpApiEndpoint with versioned schemas", () => {
  it("doesn't resolve suspended schemas when an endpoint is built", () => {
    // endpoints are often declared before the schemas they refer to
    interface Filter {
      readonly q: string
    }
    const endpoint = HttpApiEndpoint.get("search", "/search", {
      query: { filter: Schema.suspend((): Schema.Codec<Filter> => Filter) }
    })
    const Filter = Schema.Struct({ q: Schema.String })
    assert.strictEqual(endpoint.identifier, "search")
  })

  it("rejects versioned schemas outside JSON bodies", () => {
    const get = HttpApiEndpoint.get as (identifier: string, path: string, options: object) => unknown
    const post = HttpApiEndpoint.post as (identifier: string, path: string, options: object) => unknown
    assert.throws(() => get("a", "/a", { query: { person: Current.Person } }))
    assert.throws(() => get("a", "/a", { headers: { person: Current.Person } }))
    assert.throws(() => get("a", "/a", { payload: Current.Person }))
    assert.throws(() => post("a", "/a", { payload: Current.Person.pipe(HttpApiSchema.asFormUrlEncoded()) }))
  })

  it("rejects versioned schemas outside JSON bodies through suspended schemas when first used", () => {
    const get = HttpApiEndpoint.get as (identifier: string, path: string, options: object) => any
    // built before the schema it refers to is resolved, so the endpoint can't check it
    const endpoint = get("a", "/a", { query: { person: Schema.fromJsonString(Schema.suspend(() => Current.Person)) } })
    const api = HttpApi.make("app").add(HttpApiGroup.make("g").add(endpoint))
    assert.throws(() => HttpApiClient.urlBuilder(api), /can only be used in JSON bodies, .* but Address, Person are/)
    assert.throws(() => OpenApi.fromApi(api), /can only be used in JSON bodies/)
  })

  it("rejects versioned schemas in the headers of encodeToWithHeaders", () => {
    const get = HttpApiEndpoint.get as (identifier: string, path: string, options: object) => any
    const withHeader = (header: Schema.Top) =>
      Schema.Struct({ id: Schema.String }).pipe(
        HttpApiSchema.encodeToWithHeaders({ body: HttpApiSchema.Empty(200), headers: { "x-value": header } }, {
          decode: () => ({ id: "x" }),
          encode: () => ({ headers: { "x-value": undefined as any }, body: undefined })
        })
      )
    assert.throws(
      () => get("a", "/a", { success: withHeader(Schema.fromJsonString(Current.Person)) }),
      /can only be used in JSON bodies/
    )
  })

  it("a versioned type the search missed in a response header is a defect", async () => {
    const OrgHeader = Schema.Struct({ id: Schema.String }).pipe(
      HttpApiSchema.encodeToWithHeaders({
        body: HttpApiSchema.Empty(200),
        headers: { "x-org": Schema.fromJsonString(Org) }
      }, {
        decode: () => ({ id: "x" }),
        encode: () => ({ headers: { "x-org": org as any }, body: undefined })
      })
    )
    const api = HttpApi.make("app").add(
      HttpApiGroup.make("g").add(HttpApiEndpoint.get("a", "/a", { success: OrgHeader }))
    )
    const server = HttpApiBuilder.layer(api).pipe(
      Layer.provide(
        HttpApiBuilder.group(api, "g", (handlers) => handlers.handle("a", () => Effect.succeed({ id: "x" })))
      ),
      Layer.provide([Path.layer, Etag.layerWeak, HttpPlatform.layer]),
      Layer.provide(FileSystem.layerNoop({}))
    )
    const { dispose, handler } = HttpRouter.toWebHandler(server, { disableLogger: true })
    try {
      const response = await handler(new Request(`${baseUrl}/a`))
      assert.strictEqual(response.status, 500)
      assert.isNull(response.headers.get("x-org"))
    } finally {
      await dispose()
    }
  })

  it("encoding a versioned type the search missed outside JSON bodies is a defect", () => {
    const get = HttpApiEndpoint.get as (identifier: string, path: string, options: object) => any
    const endpoint = get("a", "/a", { query: { org: Schema.fromJsonString(Org) } })
    const api = HttpApi.make("app").add(HttpApiGroup.make("g").add(endpoint))
    const urls = HttpApiClient.urlBuilder(api) as any
    // the synchronous encoder wraps the defect
    const error = (() => {
      try {
        urls.g.a({ query: { org } })
      } catch (error) {
        return error as Error
      }
    })()
    assert.include(String(error?.cause), `"Badge" is encoded outside a JSON body`)
  })

  it("OpenAPI documents the header, the errors and every version", () => {
    const spec = OpenApi.fromApi(Api)
    const get = spec.paths["/people/{id}"].get!
    assert.deepStrictEqual(get.parameters.map((parameter) => parameter.name), ["id", "effect-versions"])
    assert.deepStrictEqual(Object.keys(get.responses).sort(), ["200", "400", "406"])
    const person = spec.components.schemas.Person as { readonly anyOf: ReadonlyArray<unknown> }
    assert.strictEqual(person.anyOf.length, 3)
    const ping = spec.paths["/ping"].get!
    assert.deepStrictEqual(ping.parameters, [])
  })
})
