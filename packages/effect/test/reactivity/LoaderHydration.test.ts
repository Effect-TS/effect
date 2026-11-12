import { assert, describe, it } from "@effect/vitest"
import {
  Cause,
  type Context,
  type Duration,
  Effect,
  Equal,
  Exit,
  Fiber,
  Layer,
  Option,
  Redacted,
  Schema,
  Stream
} from "effect"
import { redactAST } from "effect/internal/schemaRedact"
import { AsyncResult, Loader } from "effect/reactivity"
import { TestClock, TestLoader } from "effect/testing"

const User = Schema.Struct({ id: Schema.String, name: Schema.String })
type User = typeof User.Type
const Users = Loader.Tag("users")

const flush = Effect.promise(async () => {
  for (let i = 0; i < 4; i++) await new Promise<void>((resolve) => setTimeout(resolve, 0))
})
const advance = (duration: Duration.Input) =>
  flush.pipe(Effect.andThen(TestClock.adjust(duration)), Effect.andThen(flush))

const makeUsers = (staleTime: Duration.Input = 0) => {
  const db = { calls: 0, name: "Ann" }
  class GetUser extends Loader.Service<GetUser>()(
    "users/GetUser",
    {
      args: { id: Schema.String },
      success: User,
      error: Schema.String,
      staleTime,
      tags: [Users]
    },
    Effect.sync(() => ({ id }) =>
      Effect.gen(function*() {
        db.calls++
        yield* Effect.sleep(10)
        if (id === "404") return yield* Effect.fail("not found")
        return { id, name: db.name }
      })
    )
  ) {}
  return { db, GetUser }
}

/** The server's per-request cache, with its problems collected. */
const settleOnce = (problems: Array<Loader.Problem.Any>) =>
  Layer.effect(
    Loader.Cache,
    Effect.map(
      Loader.makeCache({
        idleMs: 300_000,
        visibility: Loader.makeSignal(true),
        connectivity: Loader.makeSignal(true),
        report: (problem) => problems.push(problem),
        settleOnce: true
      }),
      (cache) => cache as unknown as Context.Service.Shape<typeof Loader.Cache>
    )
  )

const cache = Loader.Cache.useSync(Loader.internals)

/** The Schema of a loader slot holding a snapshot of `read`, as the effect/ui runtime builds it. */
const slotSchema = (read: Loader.Read.Any, label: string) =>
  Loader.snapshotSchema(read, label) as Schema.Codec<unknown, unknown>

const fetchLog = Effect.map(TestLoader.fetches, (fetches) => fetches.map((fetch) => fetch.trigger))

describe("Loader snapshots", () => {
  const { GetUser } = makeUsers()
  const def = Loader.defOf(GetUser)
  const at = { args: { id: "1" }, argsKey: def.argsKey({ id: "1" }) }
  const json = Schema.toCodecJson(slotSchema(GetUser, "user"))

  it("encodes as a tuple through the read's own Schemas, and decodes to an equal snapshot", () => {
    const success = Loader.makeSnapshot(
      def,
      "user",
      at,
      AsyncResult.success({ id: "1", name: "Ann" }, { timestamp: 5 })
    )
    const encoded = Schema.encodeUnknownSync(json)(success)
    assert.deepStrictEqual(encoded, [`{"id":"1"}`, 0, { id: "1", name: "Ann" }, 5, false])
    assert.isTrue(Equal.equals(Schema.decodeUnknownSync(json)(encoded), success))

    const failure = Loader.makeSnapshot(
      def,
      "user",
      at,
      AsyncResult.failure(Cause.fail("nope"), {
        previousSuccess: Option.some(AsyncResult.success({ id: "1", name: "Ann" }, { timestamp: 5 }))
      })
    )
    const failureEncoded = Schema.encodeUnknownSync(json)(failure)
    assert.deepStrictEqual(failureEncoded, [`{"id":"1"}`, 1, ["nope"], [{ id: "1", name: "Ann" }, 5]])
    assert.isTrue(Equal.equals(Schema.decodeUnknownSync(json)(failureEncoded), failure))

    const empty = Loader.makeSnapshot(def, "user", undefined, undefined)
    assert.deepStrictEqual(Schema.encodeUnknownSync(json)(empty), [])
    assert.isTrue(Equal.equals(Schema.decodeUnknownSync(json)([]), empty))
  })

  it("never carries waiting, and records the patched flag only over a Success", () => {
    const waiting = Loader.makeSnapshot(
      def,
      "user",
      at,
      AsyncResult.success({ id: "1", name: "Ann" }, { timestamp: 5, waiting: true }),
      true
    )
    const decoded = Loader.snapshotData(Schema.decodeUnknownSync(json)(Schema.encodeUnknownSync(json)(waiting)))
    assert.deepStrictEqual([decoded?.result?.waiting, decoded?.patched, decoded?.argsKey], [false, true, `{"id":"1"}`])
  })

  it("keeps waiting in memory through the type side, so a slots struct built with make carries it", () => {
    const waiting = Loader.makeSnapshot(
      def,
      "user",
      at,
      AsyncResult.success({ id: "1", name: "Ann" }, { timestamp: 5, waiting: true })
    )
    const Slots = Schema.Struct({ user: slotSchema(GetUser, "user") })
    const made = Slots.make({ user: waiting })
    assert.isTrue(Loader.snapshotData(made.user)?.result?.waiting)
    const failing = Loader.makeSnapshot(def, "user", at, AsyncResult.failure(Cause.fail("nope"), { waiting: true }))
    const decoded = Schema.decodeUnknownSync(slotSchema(GetUser, "user"))(failing)
    assert.isTrue(Loader.snapshotData(decoded)?.result?.waiting)
  })

  it("accepts a patched value as it is, so make doesn't throw on a value PatchInvalid reported", () => {
    const patched = Loader.makeSnapshot(
      def,
      "user",
      at,
      AsyncResult.success({ id: "1", name: 42 }, { timestamp: 5 }),
      true
    )
    const schema = slotSchema(GetUser, "user")
    assert.isTrue(Equal.equals(Schema.decodeUnknownSync(schema)(patched), patched))
    const unpatched = Loader.makeSnapshot(def, "user", at, AsyncResult.success({ id: "1", name: 42 }, { timestamp: 5 }))
    assert.throws(() => Schema.decodeUnknownSync(schema)(unpatched))
  })

  it("is branded by read and label", () => {
    class Other extends Loader.Service<Other>()("users/Other", {
      args: { id: Schema.String },
      success: User,
      error: Schema.String,
      staleTime: 0
    }, Effect.succeed(({ id }) => Effect.succeed({ id, name: "" }))) {}
    const snapshot = Loader.makeSnapshot(def, "user", undefined, undefined)
    assert.isTrue(Schema.is(slotSchema(GetUser, "user"))(snapshot))
    assert.isFalse(Schema.is(slotSchema(GetUser, "users"))(snapshot))
    assert.isFalse(Schema.is(slotSchema(Other, "user"))(snapshot))
    assert.isFalse(Schema.is(slotSchema(GetUser, "user"))({ user: "forged" }))
  })

  it("a Schema.Redacted in a read's args and success is redacted by the log's walk, and kept in the clear otherwise", () => {
    class GetSecret extends Loader.Service<GetSecret>()("secrets/GetSecret", {
      args: { token: Schema.Redacted(Schema.String) },
      success: Schema.Struct({ value: Schema.Redacted(Schema.String) }),
      error: Schema.Never,
      staleTime: 0
    }, Effect.succeed(() => Effect.succeed({ value: Redacted.make("v") }))) {}
    const secretDef = Loader.defOf(GetSecret)
    const args = { token: Redacted.make("t") }
    const snapshot = Loader.makeSnapshot(
      secretDef,
      "secret",
      { args, argsKey: secretDef.argsKey(args) },
      AsyncResult.success({ value: Redacted.make("v") }, { timestamp: 1 })
    )
    // The slots of a component with a `secret` loader, as the runtime and the log build them.
    const Slots = Schema.Struct({ secret: slotSchema(GetSecret, "secret") })
    const logged = Schema.encodeUnknownSync(
      Schema.toCodecJson(Schema.make<Schema.Codec<unknown, unknown>>(redactAST(Slots.ast)))
    )({ secret: snapshot })
    assert.deepStrictEqual(logged, {
      secret: [`{"token":{"~redacted":true}}`, 0, { value: { "~redacted": true } }, 1, false]
    })
    // Page state and history.state keep the real key and value.
    const page = Schema.encodeUnknownSync(Schema.toCodecJson(Slots))({ secret: snapshot })
    assert.deepStrictEqual(page, { secret: [`{"token":"t"}`, 0, { value: "v" }, 1, false] })
  })
})

describe("Loader hydration", () => {
  it.effect("the server cache settles once, stores every settle and serialises it", () => {
    const { GetUser, db } = makeUsers("1 minute")
    const problems: Array<Loader.Problem.Any> = []
    return Effect.gen(function*() {
      const ok = yield* GetUser.get({ id: "1" }).pipe(Effect.forkScoped)
      const missing = yield* GetUser.get({ id: "404" }).pipe(Effect.forkScoped)
      yield* advance(10)
      yield* Fiber.join(ok)
      assert.deepStrictEqual(yield* Fiber.await(missing), Exit.fail("not found"))
      // Never stale after, and a bare Failure nobody watches is stored.
      yield* advance("2 minutes")
      assert.deepStrictEqual(yield* Effect.exit(GetUser.get({ id: "404" })), Exit.fail("not found"))
      assert.deepStrictEqual(yield* GetUser.get({ id: "1" }), { id: "1", name: "Ann" })
      assert.strictEqual(db.calls, 2)
      yield* GetUser.invalidate({ id: "1" })
      assert.deepStrictEqual(problems.map((p) => [p._tag, (p as Loader.InvalidateIgnored).read]), [
        ["InvalidateIgnored", "users/GetUser"]
      ])
      assert.deepStrictEqual((yield* cache).dehydrate(), {
        "users/GetUser": [[`{"id":"1"}`, 0, { id: "1", name: "Ann" }, 10], [`{"id":"404"}`, 1, ["not found"], 10]]
      })
    }).pipe(Effect.provide(Layer.merge(GetUser.layer, settleOnce(problems))))
  })

  it.effect("misses lists the entries still in flight, and a dead fetcher isn't one", () => {
    const { GetUser } = makeUsers("1 minute")
    class Dead extends Loader.Service<Dead>()("users/Dead", {
      args: {},
      success: Schema.String,
      error: Schema.Never,
      staleTime: 0
    }, Effect.succeed(() => Effect.die("boom"))) {}
    return Effect.gen(function*() {
      yield* GetUser.get({ id: "1" }).pipe(Effect.forkScoped)
      yield* Dead.get({}).pipe(Effect.exit, Effect.forkScoped)
      yield* flush
      assert.deepStrictEqual((yield* cache).misses(), [{ read: "users/GetUser", logKey: `{"id":"1"}` }])
      yield* advance(10)
      assert.deepStrictEqual((yield* cache).misses(), [])
    }).pipe(Effect.provide(Layer.mergeAll(GetUser.layer, Dead.layer, settleOnce([]))))
  })

  it.effect("checkWire passes what dehydrate shipped, and names an entry that doesn't round-trip", () => {
    const { GetUser } = makeUsers("1 minute")
    return Effect.gen(function*() {
      yield* GetUser.get({ id: "1" }).pipe(Effect.forkScoped)
      yield* advance(10)
      const internals = yield* cache
      const shipped = JSON.parse(JSON.stringify(internals.dehydrate()))
      assert.deepStrictEqual(internals.checkWire(shipped), [])
      assert.deepStrictEqual(internals.checkWire({ "users/GetUser": [[`{"id":"1"}`, 0, { id: 1 }, 10]] }), [
        `the entry of "users/GetUser" at {"id":"1"} failed to decode or encode again`
      ])
      assert.deepStrictEqual(
        internals.checkWire({ "users/GetUser": [[`{ "id": "1" }`, 0, { id: "1", name: "Ann" }, 10]] }),
        [
          `an entry of "users/GetUser" at {"id":"1"} has args that key differently once decoded`
        ]
      )
      assert.deepStrictEqual(internals.checkWire({ Unknown: [["{}", 0, 1, 0]] }), [
        `the read "Unknown" shipped entries, and this cache doesn't know it`
      ])
      assert.deepStrictEqual(internals.checkWire([1]), ["the ~loader state isn't the tuple shape"])
    }).pipe(Effect.provide(Layer.merge(GetUser.layer, settleOnce([]))))
  })

  it.effect("an entry that doesn't encode is left out and reported", () => {
    class GetCount extends Loader.Service<GetCount>()("counts/GetCount", {
      args: {},
      success: Schema.Number,
      error: Schema.Never,
      staleTime: 0
    }, Effect.succeed(() => Effect.succeed("x" as unknown as number))) {}
    const problems: Array<Loader.Problem.Any> = []
    return Effect.gen(function*() {
      yield* GetCount.get({})
      assert.deepStrictEqual((yield* cache).dehydrate(), {})
      assert.deepStrictEqual(problems.map((p) => p._tag), ["EncodeFailed"])
    }).pipe(Effect.provide(Layer.merge(GetCount.layer, settleOnce(problems))))
  })

  it.effect("inside the fetch-free window a hydrated entry isn't fetched, and closing it drops unwatched Failures", () => {
    const { GetUser, db } = makeUsers(0)
    return Effect.gen(function*() {
      const loader = yield* cache
      yield* advance(1000)
      // Raw until the read registers.
      loader.hydrate({
        "users/GetUser": [[`{"id":"1"}`, 0, { id: "1", name: "Server" }, 7], [`{"id":"404"}`, 1, ["not found"], 7]]
      })
      assert.isTrue(loader.isWindowOpen())
      const seen: Array<unknown> = []
      const watcher = yield* GetUser.changes({ id: "1" }).pipe(
        runForEach((result) => seen.push(result)),
        Effect.forkScoped
      )
      yield* advance(10)
      // The wire timestamp is display-only: the first emission equals the server's snapshot.
      assert.deepStrictEqual(seen, [AsyncResult.success({ id: "1", name: "Server" }, { timestamp: 7 })])
      assert.deepStrictEqual(yield* Effect.exit(GetUser.get({ id: "404" })), Exit.fail("not found"))
      yield* GetUser.prefetch({ id: "1" })
      assert.strictEqual(db.calls, 0)

      loader.closeWindow()
      assert.isUndefined(yield* TestLoader.entry(GetUser, { id: "404" }))
      // After it the entry is ordinary: stale at staleTime 0, so a get fetches.
      const fresh = yield* GetUser.get({ id: "1" }).pipe(Effect.forkScoped)
      yield* advance(10)
      assert.strictEqual((yield* Fiber.join(fresh)).name, "Ann")
      assert.deepStrictEqual(yield* fetchLog, ["get"])
      yield* Fiber.interrupt(watcher)
    }).pipe(Effect.provide(Layer.merge(GetUser.layer, TestLoader.layer())))
  })

  it.effect("an invalidation still fetches inside the window, and a tag drops every raw entry", () => {
    const { GetUser } = makeUsers("1 minute")
    return Effect.gen(function*() {
      const loader = yield* cache
      loader.hydrate({
        "users/GetUser": [[`{"id":"1"}`, 0, { id: "1", name: "Server" }, 7]],
        "other/Read": [["{}", 0, 1, 7]]
      })
      const watcher = yield* GetUser.changes({ id: "1" }).pipe(runForEach(() => {}), Effect.forkScoped)
      yield* advance(1)
      loader.invalidate([Users])
      yield* advance(10)
      assert.deepStrictEqual(yield* fetchLog, ["invalidation"])
      // The raw entry of a read the cache never saw is gone: registering it later finds nothing.
      class Other extends Loader.Service<Other>()("other/Read", {
        args: {},
        success: Schema.Number,
        error: Schema.Never,
        staleTime: "1 minute"
      }, Effect.succeed(() => Effect.succeed(2))) {}
      assert.isUndefined(yield* TestLoader.entry(Other, {}))
      yield* Fiber.interrupt(watcher)
    }).pipe(Effect.provide(Layer.merge(GetUser.layer, TestLoader.layer())))
  })

  it.effect("static hydration has no window, and every entry has an unknown age", () => {
    const { GetUser } = makeUsers("1 minute")
    class Forever extends Loader.Service<Forever>()("forever/Read", {
      args: {},
      success: Schema.Number,
      error: Schema.Never,
      staleTime: "Infinity"
    }, Effect.succeed(() => Effect.succeed(2))) {}
    return Effect.gen(function*() {
      const loader = yield* cache
      loader.hydrate(
        { "users/GetUser": [[`{"id":"1"}`, 0, { id: "1", name: "Server" }, 7]], "forever/Read": [["{}", 0, 1, 7]] },
        { static: true }
      )
      assert.isFalse(loader.isWindowOpen())
      assert.isTrue((yield* TestLoader.entry(GetUser, { id: "1" }))?.stale)
      assert.isFalse((yield* TestLoader.entry(Forever, {}))?.stale)
      assert.strictEqual(yield* Forever.get({}), 1)
    }).pipe(Effect.provide(Layer.mergeAll(GetUser.layer, Forever.layer, TestLoader.layer())))
  })

  it.effect("a malformed payload is ignored whole, and an entry that fails to decode is cold", () => {
    const { GetUser } = makeUsers("1 minute")
    return Effect.gen(function*() {
      const loader = yield* cache
      loader.hydrate({ "users/GetUser": [["{}", 2, null, 0]] })
      assert.deepStrictEqual((yield* TestLoader.expectProblem("HydrationMalformed")).length, 1)
      loader.hydrate({
        "users/GetUser": [
          [`{"id":"1"}`, 0, { id: "1" }, 0],
          [`{"id":2}`, 0, { id: "2", name: "Bob" }, 0],
          ["not json", 0, { id: "3", name: "Cid" }, 0]
        ]
      })
      assert.isUndefined(yield* TestLoader.entry(GetUser, { id: "1" }))
      const failed = yield* TestLoader.expectProblem("HydrationDecodeFailed")
      assert.deepStrictEqual(failed.map((p) => [p.part, p.logKey]), [
        ["value", `{"id":"1"}`],
        ["args", undefined],
        ["args", undefined]
      ])
    }).pipe(Effect.provide(Layer.merge(GetUser.layer, TestLoader.layer())))
  })
})

describe("Loader history restore", () => {
  const snapshotOf = (read: Loader.Read.Any, name: string, patched = false) => {
    const def = Loader.defOf(read)
    return Loader.makeSnapshot(
      def,
      "user",
      { args: { id: "1" }, argsKey: def.argsKey({ id: "1" }) },
      AsyncResult.success({ id: "1", name }, { timestamp: 3 }),
      patched
    )
  }

  it.effect("a cold entry is seeded stale from a snapshot, and refetches once", () => {
    const { GetUser } = makeUsers("1 minute")
    return Effect.gen(function*() {
      const loader = yield* cache
      // Never from a snapshot taken under a patch.
      assert.isFalse(loader.seed(snapshotOf(GetUser, "Patched", true)))
      assert.isUndefined(yield* TestLoader.entry(GetUser, { id: "1" }))
      assert.isTrue(loader.seed(snapshotOf(GetUser, "Restored")))
      // Seeding only fills a cold entry.
      assert.isFalse(loader.seed(snapshotOf(GetUser, "Again")))
      const seen: Array<string> = []
      const watcher = yield* GetUser.changes({ id: "1" }).pipe(
        runForEach((result) =>
          seen.push(
            (AsyncResult.isSuccess(result) ? result.value.name : result._tag) + (result.waiting ? " waiting" : "")
          )
        ),
        Effect.forkScoped
      )
      yield* advance(10)
      assert.deepStrictEqual(seen, ["Restored waiting", "Ann"])
      assert.deepStrictEqual(yield* fetchLog, ["watch"])
      yield* Fiber.interrupt(watcher)
    }).pipe(Effect.provide(Layer.merge(GetUser.layer, TestLoader.layer())))
  })
})

describe("Loader snapshot identity", () => {
  it.effect("a snapshot keeps its entry's args key through JSON text, -0 included, and seeds that entry", () => {
    class GetPoint extends Loader.Service<GetPoint>()(
      "points/GetPoint",
      { args: { n: Schema.Number }, success: Schema.String, error: Schema.Never, staleTime: "1 minute" },
      Effect.sync(() => ({ n }) => Effect.succeed(Object.is(n, -0) ? "minus zero" : "zero"))
    ) {}
    const def = Loader.defOf(GetPoint)
    const json = Schema.toCodecJson(slotSchema(GetPoint, "point"))
    const snapshot = Loader.makeSnapshot(
      def,
      "point",
      { args: { n: -0 }, argsKey: def.argsKey({ n: -0 }) },
      AsyncResult.success("restored", { timestamp: 1 })
    )
    // Through text, as page state and history.state carry it: JSON text has no -0 in an args object.
    const text = JSON.stringify(Schema.encodeUnknownSync(json)(snapshot))
    const decoded = Schema.decodeUnknownSync(json)(JSON.parse(text))
    assert.strictEqual(Loader.snapshotData(decoded)?.argsKey, `{"n":-0}`)
    assert.isTrue(Equal.equals(decoded, snapshot))
    // A key that doesn't key back to itself is rejected, not seeded under another entry.
    assert.isTrue(Exit.isFailure(Schema.decodeUnknownExit(json)([`{ "n": 0 }`, 0, "x", 1, false])))
    return Effect.gen(function*() {
      const loader = yield* cache
      assert.isTrue(loader.seed(decoded))
      assert.strictEqual((yield* TestLoader.entry(GetPoint, { n: -0 }))?.stored?._tag, "Success")
      assert.isUndefined(yield* TestLoader.entry(GetPoint, { n: 0 }))
    }).pipe(Effect.provide(Layer.merge(GetPoint.layer, TestLoader.layer())))
  })

  it("a decoded snapshot's key must be the key of its args decoded all the way", () => {
    class GetTrimmed extends Loader.Service<GetTrimmed>()(
      "trimmed/GetTrimmed",
      { args: { s: Schema.Trim }, success: Schema.String, error: Schema.Never, staleTime: "1 minute" },
      Effect.sync(() => ({ s }) => Effect.succeed(s))
    ) {}
    const def = Loader.defOf(GetTrimmed)
    const json = Schema.toCodecJson(slotSchema(GetTrimmed, "trimmed"))
    // " a " decodes to "a", whose key is {"s":"a"}: the snapshot would name an entry it wasn't taken from.
    assert.isTrue(Exit.isFailure(Schema.decodeUnknownExit(json)([`{"s":" a "}`, 0, "cached", 1, false])))
    const decoded = Schema.decodeUnknownSync(json)([`{"s":"a"}`, 0, "cached", 1, false])
    assert.deepStrictEqual(Loader.snapshotData(decoded)?.args, { s: "a" })
    assert.strictEqual(Loader.snapshotData(decoded)?.argsKey, def.argsKey({ s: "a" }))
  })

  it("a snapshot of an entry keyed with an optional undefined dropped encodes as the key does", () => {
    // Accepts a missing page, and rejects one that is present and undefined.
    const Args = Schema.Struct({ id: Schema.String, page: Schema.optional(Schema.Number) }).check(
      Schema.makeFilter((args) => !("page" in args) || args.page !== undefined)
    )
    class GetPage extends Loader.Service<GetPage>()(
      "pages/GetPage",
      { args: Args, success: Schema.String, error: Schema.Never, staleTime: "1 minute" },
      Effect.sync(() => ({ id }) => Effect.succeed(id))
    ) {}
    const def = Loader.defOf(GetPage)
    const json = Schema.toCodecJson(slotSchema(GetPage, "page"))
    const args = { id: "1", page: undefined }
    const snapshot = Loader.makeSnapshot(
      def,
      "page",
      { args, argsKey: def.argsKey(args) },
      AsyncResult.success("one", { timestamp: 1 })
    )
    const encoded = Schema.encodeUnknownSync(json)(snapshot)
    assert.deepStrictEqual(encoded, [`{"id":"1"}`, 0, "one", 1, false])
    const decoded = Schema.decodeUnknownSync(json)(JSON.parse(JSON.stringify(encoded)))
    assert.strictEqual(Loader.snapshotData(decoded)?.argsKey, def.argsKey(args))
  })
})

// `Stream.runForEach` with a synchronous callback.
function runForEach<A>(f: (a: A) => void) {
  return <E, R>(self: Stream.Stream<A, E, R>) => Stream.runForEach(self, (a) => Effect.sync(() => f(a)))
}
