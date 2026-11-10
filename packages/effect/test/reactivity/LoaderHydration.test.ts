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
import * as internal from "effect/reactivity/internal/loader"
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
    Effect.gen(function*() {
      const context = yield* Effect.context<never>()
      return internal.makeCache({
        scope: yield* Effect.scope,
        context,
        idleMs: 300_000,
        visibility: internal.makeSignal(true),
        connectivity: internal.makeSignal(true),
        report: (problem) => problems.push(problem),
        settleOnce: true
      }) as unknown as Context.Service.Shape<typeof Loader.Cache>
    })
  )

const cache = Effect.map(Effect.service(Loader.Cache), internal.internals)

const fetchLog = Effect.map(TestLoader.fetches, (fetches) => fetches.map((fetch) => fetch.trigger))

describe("Loader snapshots", () => {
  const { GetUser } = makeUsers()
  const def = internal.defOf(GetUser)
  const at = { args: { id: "1" }, argsKey: def.argsKey({ id: "1" }) }
  const json = Schema.toCodecJson(Loader.Snapshot(GetUser, "user"))

  it("encodes as a tuple through the read's own Schemas, and decodes to an equal snapshot", () => {
    const success = internal.makeSnapshot(
      def,
      "user",
      at,
      AsyncResult.success({ id: "1", name: "Ann" }, { timestamp: 5 })
    )
    const encoded = Schema.encodeUnknownSync(json)(success)
    assert.deepStrictEqual(encoded, [{ id: "1" }, 0, { id: "1", name: "Ann" }, 5, false])
    assert.isTrue(Equal.equals(Schema.decodeUnknownSync(json)(encoded), success))

    const failure = internal.makeSnapshot(
      def,
      "user",
      at,
      AsyncResult.failure(Cause.fail("nope"), {
        previousSuccess: Option.some(AsyncResult.success({ id: "1", name: "Ann" }, { timestamp: 5 }))
      })
    )
    const failureEncoded = Schema.encodeUnknownSync(json)(failure)
    assert.deepStrictEqual(failureEncoded, [{ id: "1" }, 1, ["nope"], [{ id: "1", name: "Ann" }, 5]])
    assert.isTrue(Equal.equals(Schema.decodeUnknownSync(json)(failureEncoded), failure))

    const empty = internal.makeSnapshot(def, "user", undefined, undefined)
    assert.deepStrictEqual(Schema.encodeUnknownSync(json)(empty), [])
    assert.isTrue(Equal.equals(Schema.decodeUnknownSync(json)([]), empty))
  })

  it("never carries waiting, and records the patched flag only over a Success", () => {
    const waiting = internal.makeSnapshot(
      def,
      "user",
      at,
      AsyncResult.success({ id: "1", name: "Ann" }, { timestamp: 5, waiting: true }),
      true
    )
    const decoded = internal.snapshotData(Schema.decodeUnknownSync(json)(Schema.encodeUnknownSync(json)(waiting)))
    assert.deepStrictEqual([decoded?.result?.waiting, decoded?.patched, decoded?.argsKey], [false, true, `{"id":"1"}`])
  })

  it("is branded by read and label", () => {
    class Other extends Loader.Service<Other>()("users/Other", {
      args: { id: Schema.String },
      success: User,
      error: Schema.String,
      staleTime: 0
    }, Effect.succeed(({ id }) => Effect.succeed({ id, name: "" }))) {}
    const snapshot = internal.makeSnapshot(def, "user", undefined, undefined)
    assert.isTrue(Schema.is(Loader.Snapshot(GetUser, "user"))(snapshot))
    assert.isFalse(Schema.is(Loader.Snapshot(GetUser, "users"))(snapshot))
    assert.isFalse(Schema.is(Loader.Snapshot(Other, "user"))(snapshot))
    assert.isFalse(Schema.is(Loader.Snapshot(GetUser, "user"))({ user: "forged" }))
  })

  it("a Schema.Redacted in a read's args and success is redacted by the log's walk, and kept in the clear otherwise", () => {
    class GetSecret extends Loader.Service<GetSecret>()("secrets/GetSecret", {
      args: { token: Schema.Redacted(Schema.String) },
      success: Schema.Struct({ value: Schema.Redacted(Schema.String) }),
      error: Schema.Never,
      staleTime: 0
    }, Effect.succeed(() => Effect.succeed({ value: Redacted.make("v") }))) {}
    const secretDef = internal.defOf(GetSecret)
    const args = { token: Redacted.make("t") }
    const snapshot = internal.makeSnapshot(
      secretDef,
      "secret",
      { args, argsKey: secretDef.argsKey(args) },
      AsyncResult.success({ value: Redacted.make("v") }, { timestamp: 1 })
    )
    const Model = Schema.Struct({ secret: Loader.Snapshot(GetSecret, "secret") })
    const logged = Schema.encodeUnknownSync(
      Schema.toCodecJson(Schema.make<Schema.Codec<unknown, unknown>>(redactAST(Model.ast)))
    )({ secret: snapshot })
    assert.deepStrictEqual(logged, {
      secret: [{ token: { "~redacted": true } }, 0, { value: { "~redacted": true } }, 1, false]
    })
    // Page state and history.state keep the real key and value.
    const page = Schema.encodeUnknownSync(Schema.toCodecJson(Model))({ secret: snapshot })
    assert.deepStrictEqual(page, { secret: [{ token: "t" }, 0, { value: "v" }, 1, false] })
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
    const def = internal.defOf(read)
    return internal.makeSnapshot(
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

// `Stream.runForEach` with a synchronous callback.
function runForEach<A>(f: (a: A) => void) {
  return <E, R>(self: Stream.Stream<A, E, R>) => Stream.runForEach(self, (a) => Effect.sync(() => f(a)))
}
