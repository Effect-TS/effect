import { assert, describe, it } from "@effect/vitest"
import {
  Cause,
  Effect,
  Exit,
  Fiber,
  Latch,
  Layer,
  Option,
  Redacted,
  Schema,
  SchemaGetter,
  SchemaTransformation,
  Scope,
  Stream
} from "effect"
import type { Duration } from "effect"
import { AsyncResult, Loader } from "effect/reactivity"
import * as internal from "effect/reactivity/internal/loader"
import { TestClock, TestLoader } from "effect/testing"

const User = Schema.Struct({ id: Schema.String, name: Schema.String })
type User = typeof User.Type
type Seen = AsyncResult.AsyncResult<User, string>

const Users = Loader.Tag("users")

// A few macrotasks: lets every fiber the cache forked run, and whatever those fork in turn.
const flush = Effect.promise(async () => {
  for (let i = 0; i < 4; i++) await new Promise<void>((resolve) => setTimeout(resolve, 0))
})
const advance = (duration: Duration.Input) =>
  flush.pipe(Effect.andThen(TestClock.adjust(duration)), Effect.andThen(flush))

const show = (result: Seen): string =>
  (AsyncResult.isSuccess(result)
    ? result.value.name
    : AsyncResult.isFailure(result)
    ? "Failure(" + Option.getOrElse(Cause.findErrorOption(result.cause), () => "?") + ")" +
      (Option.isSome(result.previousSuccess) ? " previous" : "")
    : "Initial") + (result.waiting ? " waiting" : "")

// A read whose fetcher takes 10 ms and does what `db.mode` says.
const makeUsers = (options: {
  readonly staleTime: Duration.Input
  readonly idleTimeToLive?: Duration.Input
  readonly refetchInterval?: Loader.RefetchInterval<{ readonly id: string }, User, string>
}) => {
  const db = { calls: 0, name: "Ann", mode: "ok" as "ok" | "fail" | "die" | "interrupt" }
  class GetUser extends Loader.Service<GetUser>()(
    "users/GetUser",
    { args: { id: Schema.String }, success: User, error: Schema.String, tags: [Users], ...options },
    Effect.sync(() => ({ id }) =>
      Effect.gen(function*() {
        db.calls++
        yield* Effect.sleep(10)
        if (db.mode === "die") return yield* Effect.die("boom")
        // A Fail next to an Interrupt is still a Failure, and holds only the Fail.
        if (db.mode === "fail") return yield* Effect.failCause(Cause.combine(Cause.fail("nope"), Cause.interrupt()))
        if (db.mode === "interrupt") return yield* Effect.interrupt
        return { id, name: db.name }
      })
    )
  ) {}
  const provide = Effect.provide(Layer.merge(GetUser.layer, TestLoader.layer()))
  return { db, GetUser, provide }
}

// Watches through the public `changes` Stream, and records what it emits.
const watch = Effect.fnUntraced(function*<R>(changes: Stream.Stream<Seen, never, R>) {
  const seen: Array<string> = []
  const fiber = yield* Effect.forkScoped(
    Stream.runForEach(changes, (result) => Effect.sync(() => seen.push(show(result))))
  )
  yield* flush
  return { seen, fiber, stop: Fiber.interrupt(fiber) }
})

const triggers = Effect.map(
  TestLoader.fetches,
  (fetches) => fetches.map((fetch) => fetch.trigger + (fetch.restart ? " restart" : ""))
)

describe("Loader", () => {
  it.effect("only the zero-to-one watcher transition fetches, and watchers share the fetch", () => {
    const { GetUser, db, provide } = makeUsers({ staleTime: "30 seconds" })
    return Effect.gen(function*() {
      const a = yield* watch(GetUser.changes({ id: "1" }))
      const b = yield* watch(GetUser.changes({ id: "1" }))
      assert.strictEqual(db.calls, 1)
      // Quiet over a cold entry.
      assert.deepStrictEqual(a.seen, [])
      assert.deepStrictEqual(yield* GetUser.peek({ id: "1" }), AsyncResult.initial(true))
      yield* advance(10)
      assert.deepStrictEqual(a.seen, ["Ann"])
      assert.deepStrictEqual(b.seen, ["Ann"])

      yield* advance("31 seconds")
      assert.isTrue((yield* TestLoader.entry(GetUser, { id: "1" }))?.stale)
      // A joining watcher never refetches, even over a stale entry.
      const c = yield* watch(GetUser.changes({ id: "1" }))
      yield* advance(20)
      assert.deepStrictEqual(c.seen, ["Ann"])
      assert.strictEqual(db.calls, 1)

      yield* a.stop
      yield* b.stop
      yield* c.stop
      assert.strictEqual((yield* TestLoader.entry(GetUser, { id: "1" }))?.watchers, 0)
      // Zero-to-one over a stale entry serves the stale value at once and refetches.
      const d = yield* watch(GetUser.changes({ id: "1" }))
      assert.deepStrictEqual(d.seen, ["Ann waiting"])
      yield* advance(10)
      assert.deepStrictEqual(d.seen, ["Ann waiting", "Ann"])
      assert.deepStrictEqual(yield* triggers, ["watch", "watch"])
    }).pipe(provide)
  })

  it.effect("get serves a fresh value, fetches a stale one and joins a fetch in flight", () => {
    const { GetUser, db, provide } = makeUsers({ staleTime: "30 seconds" })
    return Effect.gen(function*() {
      const first = yield* Effect.forkScoped(
        Effect.all([GetUser.get({ id: "1" }), GetUser.get({ id: "1" })], { concurrency: "unbounded" })
      )
      yield* advance(10)
      assert.deepStrictEqual(yield* Fiber.join(first), [{ id: "1", name: "Ann" }, { id: "1", name: "Ann" }])
      assert.deepStrictEqual(yield* GetUser.get({ id: "1" }), { id: "1", name: "Ann" })
      assert.strictEqual(db.calls, 1)

      db.name = "Bea"
      yield* advance("30 seconds")
      const second = yield* Effect.forkScoped(GetUser.get({ id: "1" }))
      yield* advance(10)
      assert.deepStrictEqual(yield* Fiber.join(second), { id: "1", name: "Bea" })
      assert.deepStrictEqual(yield* triggers, ["get", "get"])

      // A failed refetch is stored over the old value. A failed first fetch of an unwatched entry isn't stored.
      db.mode = "fail"
      yield* advance("30 seconds")
      const failed = yield* Effect.forkScoped(
        Effect.exit(Effect.all([GetUser.get({ id: "1" }), GetUser.get({ id: "2" })], {
          concurrency: "unbounded",
          mode: "result"
        }))
      )
      yield* advance(10)
      assert.deepStrictEqual(
        (yield* Fiber.join(failed)).pipe(Exit.map((results) => results.map((result) => result._tag))),
        Exit.succeed(["Failure", "Failure"])
      )
      assert.strictEqual(show(yield* GetUser.peek({ id: "1" })), "Failure(nope) previous")
      assert.isUndefined(yield* TestLoader.entry(GetUser, { id: "2" }))
    }).pipe(provide)
  })

  it.effect("prefetch outlives its caller, and an entry nothing uses is collected", () => {
    const { GetUser, db, provide } = makeUsers({ staleTime: "Infinity", idleTimeToLive: "1 minute" })
    return Effect.gen(function*() {
      // peek neither creates an entry nor fetches.
      assert.deepStrictEqual(yield* GetUser.peek({ id: "1" }), AsyncResult.initial())
      assert.isUndefined(yield* TestLoader.entry(GetUser, { id: "1" }))

      yield* GetUser.prefetch({ id: "1" })
      assert.strictEqual(show(yield* GetUser.peek({ id: "1" })), "Initial waiting")
      yield* advance(10)
      assert.strictEqual(show(yield* GetUser.peek({ id: "1" })), "Ann")
      assert.deepStrictEqual(yield* triggers, ["prefetch"])

      // The idle timer started at settle. get and prefetch reset it, peek doesn't.
      yield* advance("50 seconds")
      yield* GetUser.prefetch({ id: "1" })
      yield* advance("50 seconds")
      yield* GetUser.peek({ id: "1" })
      assert.isDefined(yield* TestLoader.entry(GetUser, { id: "1" }))
      yield* advance("10 seconds")
      assert.isUndefined(yield* TestLoader.entry(GetUser, { id: "1" }))

      // A watched entry is never collected, and it outlives its last watcher by the idle time.
      const watcher = yield* watch(GetUser.changes({ id: "1" }))
      yield* advance("5 minutes")
      yield* watcher.stop
      yield* advance("59 seconds")
      assert.strictEqual(show(yield* GetUser.peek({ id: "1" })), "Ann")
      yield* advance("1 second")
      assert.isUndefined(yield* TestLoader.entry(GetUser, { id: "1" }))

      // A failed prefetch of an unwatched entry stores nothing.
      db.mode = "fail"
      yield* GetUser.prefetch({ id: "2" })
      yield* advance(10)
      assert.isUndefined(yield* TestLoader.entry(GetUser, { id: "2" }))
      assert.strictEqual(db.calls, 3)
    }).pipe(provide)
  })

  it.effect("a host edge refetches stale watched entries once both signals are true", () => {
    const { GetUser, db, provide } = makeUsers({ staleTime: "30 seconds" })
    return Effect.gen(function*() {
      yield* watch(GetUser.changes({ id: "1" }))
      yield* advance(10)
      yield* advance("31 seconds")
      // Going stale on its own fetches nothing.
      assert.strictEqual(db.calls, 1)

      yield* TestLoader.setVisible(false)
      yield* TestLoader.setOnline(false)
      yield* TestLoader.setVisible(true)
      yield* flush
      assert.strictEqual(db.calls, 1)
      yield* TestLoader.setOnline(true)
      yield* advance(10)
      assert.strictEqual(db.calls, 2)

      // A fresh entry isn't refetched.
      yield* TestLoader.setVisible(false)
      yield* TestLoader.setVisible(true)
      yield* flush
      assert.strictEqual(db.calls, 2)

      yield* advance("31 seconds")
      yield* TestLoader.setVisible(false)
      yield* TestLoader.setVisible(true)
      yield* advance(10)
      assert.deepStrictEqual(yield* triggers, ["watch", "connectivity", "visibility"])
    }).pipe(provide)
  })

  it.effect("the interval polls a watched entry, pauses while hidden and re-arms after a revert", () => {
    const { GetUser, db, provide } = makeUsers({ staleTime: "Infinity", refetchInterval: "5 seconds" })
    return Effect.gen(function*() {
      const watcher = yield* watch(GetUser.changes({ id: "1" }))
      yield* advance(10)
      yield* advance("5 seconds")
      yield* advance(10)
      assert.deepStrictEqual(yield* triggers, ["watch", "interval"])

      // Hidden: the interval doesn't fire. Due on the edge: it fires at once.
      yield* TestLoader.setVisible(false)
      yield* advance("6 seconds")
      assert.strictEqual(db.calls, 2)
      yield* TestLoader.setVisible(true)
      yield* advance(10)
      assert.deepStrictEqual(yield* triggers, ["watch", "interval", "visibility"])

      // Not due on the edge: it sleeps for the remainder, counted from the last settle.
      yield* advance("2 seconds")
      yield* TestLoader.setVisible(false)
      yield* advance("1 second")
      yield* TestLoader.setVisible(true)
      yield* advance("1 second")
      assert.strictEqual(db.calls, 3)
      yield* advance("1 second")
      assert.strictEqual(db.calls, 4)

      // A reverted fetch isn't a settle, and polling carries on from it.
      db.mode = "interrupt"
      yield* advance(10)
      db.mode = "ok"
      yield* advance("4 seconds")
      assert.strictEqual(db.calls, 4)
      yield* advance("1 second")
      assert.strictEqual(db.calls, 5)
      yield* advance(10)

      // It runs only while the entry is watched.
      yield* watcher.stop
      yield* advance("10 seconds")
      assert.strictEqual(db.calls, 5)
    }).pipe(provide)
  })

  it.effect("a function-form interval that throws or returns nonsense is reported, and stops until the next settle", () => {
    let interval: () => Duration.Input | undefined = () => {
      throw new Error("bad interval")
    }
    const { GetUser, db, provide } = makeUsers({ staleTime: "Infinity", refetchInterval: () => interval() })
    return Effect.gen(function*() {
      yield* watch(GetUser.changes({ id: "1" }))
      yield* advance(10)
      const [threw] = yield* TestLoader.expectProblem("IntervalThrew")
      assert.strictEqual(threw.read, "users/GetUser")
      assert.strictEqual(threw.logKey, `{"id":"1"}`)
      assert.strictEqual((threw.error as Error).message, "bad interval")
      yield* advance("10 seconds")
      assert.strictEqual(db.calls, 1)

      // A bare number under 1000 is a mistake, as is zero.
      interval = () => 5
      yield* GetUser.invalidate({ id: "1" })
      yield* advance(10)
      assert.strictEqual((yield* TestLoader.expectProblem("IntervalInvalid")).length, 1)
      yield* advance("10 seconds")
      assert.strictEqual(db.calls, 2)

      // The next settle asks again. A sub-second interval spelt as a Duration is fine.
      interval = () => "500 millis"
      yield* GetUser.invalidate({ id: "1" })
      yield* advance(10)
      yield* advance(500)
      assert.strictEqual(db.calls, 4)
      assert.deepStrictEqual(yield* TestLoader.problems, [])
    }).pipe(provide)
  })

  it.effect("invalidation refetches a watched entry, restarts a fetch in flight and marks the rest stale", () => {
    const { GetUser, db, provide } = makeUsers({ staleTime: "Infinity" })
    return Effect.gen(function*() {
      // A never-fetched entry is a no-op.
      yield* GetUser.invalidate({ id: "9" })
      assert.isUndefined(yield* TestLoader.entry(GetUser, { id: "9" }))

      yield* GetUser.prefetch({ id: "1" })
      const watcher = yield* watch(GetUser.changes({ id: "2" }))
      yield* advance(10)
      assert.strictEqual(db.calls, 2)

      // The whole read: the watched entry refetches now, the unwatched one on its next use.
      yield* GetUser.invalidate()
      yield* flush
      assert.strictEqual(db.calls, 3)
      assert.deepStrictEqual(watcher.seen, ["Ann", "Ann waiting"])
      assert.isTrue((yield* TestLoader.entry(GetUser, { id: "1" }))?.stale)

      // A fetch in flight is interrupted and restarted, and keeps its trigger.
      yield* GetUser.invalidate({ id: "2" })
      yield* advance(10)
      assert.strictEqual(db.calls, 4)
      assert.deepStrictEqual(watcher.seen, ["Ann", "Ann waiting", "Ann"])

      const get = yield* Effect.forkScoped(GetUser.get({ id: "1" }))
      yield* advance(10)
      yield* Fiber.join(get)
      assert.deepStrictEqual(yield* triggers, ["prefetch", "watch", "invalidation", "invalidation restart", "get"])
    }).pipe(provide)
  })

  it.effect("a tag invalidates every read that lists it", () => {
    const { GetUser, db, provide } = makeUsers({ staleTime: "Infinity" })
    return Effect.gen(function*() {
      yield* watch(GetUser.changes({ id: "1" }))
      yield* advance(10)
      // Targets get their public constructors with Commands. Until then a tag is only reachable here.
      const cache = internal.internals(yield* Loader.Cache)
      cache.invalidate([{ _tag: "Tag", name: "nothing-lists-this" }])
      yield* advance(10)
      assert.strictEqual(db.calls, 1)
      // An entry hit twice in one application restarts once.
      cache.invalidate([{ _tag: "Tag", name: Loader.Tag("users").name }, { _tag: "Tag", name: Users.name }])
      yield* advance(10)
      assert.deepStrictEqual(yield* triggers, ["watch", "invalidation"])
    }).pipe(provide)
  })

  it.effect("a fetch moves to a surviving build when its build closes, and reverts when none survives", () => {
    const { GetUser, db } = makeUsers({ staleTime: "30 seconds" })
    return Effect.gen(function*() {
      const scopeA = yield* Scope.make()
      const scopeB = yield* Scope.make()
      const buildA = yield* Layer.buildWithScope(Layer.fresh(GetUser.layer), scopeA)
      const buildB = yield* Layer.buildWithScope(Layer.fresh(GetUser.layer), scopeB)

      // The fetch runs under the first watcher's build. A pending get under another build is a survivor.
      const a = yield* watch(GetUser.changes({ id: "1" }).pipe(Stream.provideContext(buildA)))
      const get = yield* Effect.forkScoped(GetUser.get({ id: "1" }).pipe(Effect.provideContext(buildB)))
      yield* flush
      yield* Scope.close(scopeA, Exit.void)
      yield* advance(10)
      assert.deepStrictEqual(yield* Fiber.join(get), { id: "1", name: "Ann" })
      assert.deepStrictEqual(a.seen, ["Ann"])
      assert.deepStrictEqual(yield* triggers, ["watch", "watch restart"])
      yield* a.stop

      // No build survives: a stale Success stays and stops waiting.
      yield* advance("31 seconds")
      const b = yield* watch(GetUser.changes({ id: "1" }).pipe(Stream.provideContext(buildB)))
      assert.deepStrictEqual(b.seen, ["Ann waiting"])
      // A cold entry is removed outright, and its get caller is interrupted.
      const cold = yield* Effect.forkScoped(GetUser.get({ id: "2" }).pipe(Effect.provideContext(buildB)))
      yield* flush
      yield* Scope.close(scopeB, Exit.void)
      yield* flush
      assert.deepStrictEqual(b.seen, ["Ann waiting", "Ann"])
      const entry = yield* TestLoader.entry(GetUser, { id: "1" })
      assert.deepStrictEqual([entry?.stale, entry?.fetch], [true, "none"])
      assert.isTrue(Exit.hasInterrupts(yield* Fiber.await(cold)))
      assert.isUndefined(yield* TestLoader.entry(GetUser, { id: "2" }))
      assert.strictEqual(db.calls, 4)
    }).pipe(Effect.provide(TestLoader.layer()))
  })

  // The cleanups below wait on a Latch the test opens, so the order of events is the test's to set.
  it.effect("a fetch finishes its cleanup before its restart begins and before its build's resources are released", () => {
    const events: Array<string> = []
    const cleanup = Latch.makeUnsafe()
    class Slow extends Loader.Service<Slow>()(
      "Slow",
      {
        args: {},
        success: Schema.Number,
        error: Schema.Never,
        staleTime: 0
      },
      Effect.gen(function*() {
        yield* Effect.addFinalizer(() => Effect.sync(() => events.push("resource released")))
        return () =>
          Effect.sync(() => events.push("fetch started")).pipe(
            Effect.andThen(Effect.never),
            Effect.ensuring(Effect.andThen(cleanup.await, Effect.sync(() => events.push("fetch cleaned up"))))
          )
      })
    ) {}
    return Effect.gen(function*() {
      const scope = yield* Scope.make()
      const build = yield* Layer.buildWithScope(Slow.layer, scope)
      yield* Slow.prefetch({}).pipe(Effect.provideContext(build))
      yield* flush
      yield* Slow.invalidate({})
      yield* flush
      assert.deepStrictEqual(events, ["fetch started"])
      yield* cleanup.open
      yield* flush
      assert.deepStrictEqual(events, ["fetch started", "fetch cleaned up", "fetch started"])

      yield* cleanup.close
      const closing = yield* Effect.forkScoped(Scope.close(scope, Exit.void))
      yield* flush
      assert.deepStrictEqual(events, ["fetch started", "fetch cleaned up", "fetch started"])
      yield* cleanup.open
      yield* Fiber.join(closing)
      assert.deepStrictEqual(events, [
        "fetch started",
        "fetch cleaned up",
        "fetch started",
        "fetch cleaned up",
        "resource released"
      ])
    }).pipe(Effect.provide(TestLoader.layer()))
  })

  it.effect("a cache waits for its fetches' cleanup when it is disposed", () => {
    const events: Array<string> = []
    const cleanup = Latch.makeUnsafe()
    class Slow extends Loader.Service<Slow>()(
      "Slow",
      {
        args: {},
        success: Schema.Number,
        error: Schema.Never,
        staleTime: 0
      },
      Effect.succeed(() =>
        Effect.ensuring(Effect.never, Effect.andThen(cleanup.await, Effect.sync(() => events.push("fetch cleaned up"))))
      )
    ) {}
    return Effect.gen(function*() {
      const scope = yield* Scope.make()
      const cache = yield* Layer.buildWithScope(Layer.merge(Slow.layer, Loader.layer()), scope)
      yield* Slow.prefetch({}).pipe(Effect.provideContext(cache))
      yield* flush
      const closing = yield* Effect.forkScoped(
        Effect.andThen(Scope.close(scope, Exit.void), Effect.sync(() => events.push("cache disposed")))
      )
      yield* flush
      assert.deepStrictEqual(events, [])
      yield* cleanup.open
      yield* Fiber.join(closing)
      assert.deepStrictEqual(events, ["fetch cleaned up", "cache disposed"])
    })
  })

  it.effect("a fetch cut by its build closing leaves a fresh entry fresh", () => {
    const { GetUser, db } = makeUsers({ staleTime: "Infinity", refetchInterval: "5 seconds" })
    return Effect.gen(function*() {
      const scope = yield* Scope.make()
      const build = yield* Layer.buildWithScope(GetUser.layer, scope)
      const watcher = yield* watch(GetUser.changes({ id: "1" }).pipe(Stream.provideContext(build)))
      yield* advance(10)
      // The interval refetches an entry that is fresh by staleTime. Nothing survives the close, so the fetch reverts.
      yield* advance("5 seconds")
      yield* watcher.stop
      yield* Scope.close(scope, Exit.void)
      const entry = yield* TestLoader.entry(GetUser, { id: "1" })
      assert.deepStrictEqual([entry?.stale, entry?.fetch, db.calls], [false, "none", 2])
    }).pipe(Effect.provide(TestLoader.layer()))
  })

  it.effect("fetch exits: a Fail is stored, an interrupt reverts and a defect reaches the watchers unstored", () => {
    const { GetUser, db, provide } = makeUsers({ staleTime: "Infinity" })
    return Effect.gen(function*() {
      const watcher = yield* watch(GetUser.changes({ id: "1" }))
      yield* advance(10)

      db.mode = "fail"
      yield* GetUser.invalidate({ id: "1" })
      yield* advance(10)
      const failure = yield* GetUser.peek({ id: "1" })
      assert.deepStrictEqual(
        AsyncResult.isFailure(failure) ? failure.cause.reasons.map((reason) => reason._tag) : [],
        ["Fail"]
      )

      db.mode = "interrupt"
      yield* GetUser.invalidate({ id: "1" })
      yield* advance(10)
      assert.deepStrictEqual(watcher.seen, [
        "Ann",
        "Ann waiting",
        "Failure(nope) previous",
        "Failure(nope) previous waiting",
        "Failure(nope) previous"
      ])
      // A get waiting on a fetch that reverts is interrupted.
      const pending = yield* Effect.forkScoped(GetUser.get({ id: "1" }))
      yield* advance(10)
      assert.isTrue(Exit.hasInterrupts(yield* Fiber.await(pending)))

      db.mode = "die"
      yield* GetUser.invalidate({ id: "1" })
      yield* advance(10)
      assert.deepStrictEqual(yield* Fiber.await(watcher.fiber), Exit.die("boom"))
      assert.strictEqual(show(yield* GetUser.peek({ id: "1" })), "Failure(nope) previous")

      // A Failure with no previous Success is dropped when its last watcher leaves.
      db.mode = "fail"
      const bare = yield* watch(GetUser.changes({ id: "2" }))
      yield* advance(10)
      assert.deepStrictEqual(bare.seen, ["Failure(nope)"])
      yield* bare.stop
      assert.isUndefined(yield* TestLoader.entry(GetUser, { id: "2" }))
    }).pipe(provide)
  })

  it.effect("ten restarts of one fetch in a row are reported once per streak", () => {
    const { GetUser, provide } = makeUsers({ staleTime: "Infinity" })
    return Effect.gen(function*() {
      yield* watch(GetUser.changes({ id: "1" }))
      for (let i = 0; i < 9; i++) yield* GetUser.invalidate({ id: "1" })
      assert.deepStrictEqual(yield* TestLoader.problems, [])
      for (let i = 0; i < 5; i++) yield* GetUser.invalidate({ id: "1" })
      const problems = yield* TestLoader.expectProblem("FetchRestarted")
      assert.deepStrictEqual(problems.map((problem) => [problem.read, problem.logKey]), [[
        "users/GetUser",
        `{"id":"1"}`
      ]])

      // A settle ends the streak.
      yield* advance(10)
      yield* GetUser.invalidate({ id: "1" })
      for (let i = 0; i < 10; i++) yield* GetUser.invalidate({ id: "1" })
      assert.strictEqual((yield* TestLoader.expectProblem("FetchRestarted")).length, 1)
    }).pipe(provide)
  })

  it.effect("the first definition under a name wins, and the second is reported", () => {
    const first = makeUsers({ staleTime: "Infinity" })
    const second = makeUsers({ staleTime: 0 })
    return Effect.gen(function*() {
      yield* first.GetUser.prefetch({ id: "1" })
      yield* advance(10)
      // The second definition says "always stale". The first one's staleTime is the entry's.
      assert.deepStrictEqual(yield* second.GetUser.get({ id: "1" }), { id: "1", name: "Ann" })
      yield* second.GetUser.peek({ id: "1" })
      assert.strictEqual(first.db.calls, 1)
      const problems = yield* TestLoader.expectProblem("DuplicateName")
      assert.deepStrictEqual(problems.map((problem) => problem.read), ["users/GetUser"])
      // One name is one service key, so both classes resolve to the one fetcher provided.
    }).pipe(first.provide)
  })

  it.effect("keys are canonical JSON of the encoded args, and the log key redacts", () => {
    let calls = 0
    class Search extends Loader.Service<Search>()("Search", {
      args: {
        token: Schema.Redacted(Schema.String),
        page: Schema.Number,
        filter: Schema.optionalKey(Schema.Struct({ b: Schema.String, a: Schema.String }))
      },
      success: Schema.Number,
      error: Schema.Never,
      staleTime: "Infinity"
    }, Effect.sync(() => () => Effect.sync(() => ++calls))) {}
    // The args are the key, so they needn't be a struct.
    class ById extends Loader.Service<ById>()("ById", {
      args: Schema.Any,
      success: Schema.Number,
      error: Schema.Never,
      staleTime: "Infinity"
    }, Effect.sync(() => () => Effect.sync(() => ++calls))) {}
    return Effect.gen(function*() {
      const token = Redacted.make("s3cret")
      // Property order doesn't matter. A different secret is a different entry.
      const results = [
        yield* Search.get({ token, page: 1, filter: { b: "b", a: "a" } }),
        yield* Search.get({ filter: { a: "a", b: "b" }, page: 1, token: Redacted.make("s3cret") }),
        yield* Search.get({ token: Redacted.make("other"), page: 1, filter: { a: "a", b: "b" } }),
        yield* ById.get("1"),
        yield* ById.get(1)
      ]
      assert.deepStrictEqual(results, [1, 1, 2, 3, 4])
      assert.deepStrictEqual((yield* TestLoader.fetches).map((fetch) => fetch.logKey), [
        `{"filter":{"a":"a","b":"b"},"page":1,"token":{"~redacted":true}}`,
        `{"filter":{"a":"a","b":"b"},"page":1,"token":{"~redacted":true}}`,
        `"1"`,
        "1"
      ])

      // Building a key throws, and never prints the args or anything an arg can set, such as its string tag.
      class Tagged {
        get [Symbol.toStringTag]() {
          return "s3cret"
        }
      }
      const messages: Array<string> = []
      const calls: ReadonlyArray<Effect.Effect<unknown, never, Search | ById | Loader.Cache>> = [
        Search.get({ token, page: "s3cret" as any }),
        ById.peek({ secret: 1n }),
        ById.prefetch(new Tagged()),
        ById.invalidate(NaN)
      ]
      for (const effect of calls) {
        const exit = yield* Effect.exit(effect)
        messages.push(Exit.isFailure(exit) ? (Cause.squash(exit.cause) as Error).message : "no throw")
      }
      assert.deepStrictEqual(messages, [
        `[Loader] read "Search": the args don't encode with the read's args Schema`,
        `[Loader] read "ById": the encoded args hold a value JSON can't carry (a bigint). Give the args Schema a JSON encoding.`,
        `[Loader] read "ById": the encoded args hold a value JSON can't carry (a class instance). Give the args Schema a JSON encoding.`,
        `[Loader] read "ById": the encoded args hold a value JSON can't carry (a non-finite number). Give the args Schema a JSON encoding.`
      ])
    }).pipe(Effect.provide(Layer.mergeAll(Search.layer, ById.layer, TestLoader.layer())))
  })

  it.effect("an optional property that is undefined is the same entry as a missing one", () => {
    let calls = 0
    const fetcher = Effect.sync(() => () => Effect.sync(() => ++calls))
    const options = { success: Schema.Number, error: Schema.Never, staleTime: "Infinity" } as const
    class Search extends Loader.Service<Search>()("Search", {
      ...options,
      args: {
        token: Schema.Redacted(Schema.String),
        page: Schema.optional(Schema.Number),
        filter: Schema.optional(Schema.Struct({ tag: Schema.optional(Schema.String) })),
        // A required key keeps its undefined, and doesn't stop the optional ones from being dropped.
        cursor: Schema.UndefinedOr(Schema.String)
      }
    }, fetcher) {}
    class Args extends Schema.Class<Args>("Args")({ id: Schema.String, page: Schema.optional(Schema.Number) }) {}
    class ByClass extends Loader.Service<ByClass>()("ByClass", { ...options, args: Args }, fetcher) {}
    // The Schema decides what the args may be: this property may be missing, and may not be undefined.
    class Exact extends Loader.Service<Exact>()("Exact", {
      ...options,
      args: { page: Schema.optionalKey(Schema.Number) }
    }, fetcher) {}
    return Effect.gen(function*() {
      const token = Redacted.make("s3cret")
      const cursor = undefined
      // A property the Schema doesn't name is never looked at, so it may hold anything.
      const cycle: { self?: unknown } = {}
      cycle.self = cycle
      const results = [
        yield* Search.get({ token, cursor, page: undefined, filter: { tag: undefined } }),
        yield* Search.get({ token, cursor, filter: {} }),
        yield* Search.get({ token, cursor, filter: undefined }),
        yield* Search.get({ token, cursor }),
        yield* Search.get({ token, cursor, cycle } as { token: typeof token; cursor: undefined }),
        yield* ByClass.get(new Args({ id: "1", page: undefined })),
        yield* ByClass.get(new Args({ id: "1" }))
      ]
      assert.deepStrictEqual(results, [1, 1, 2, 2, 2, 3, 3])
      assert.deepStrictEqual((yield* TestLoader.fetches).map((fetch) => fetch.read + " " + fetch.logKey), [
        `Search {"cursor":null,"filter":{},"token":{"~redacted":true}}`,
        `Search {"cursor":null,"token":{"~redacted":true}}`,
        `ByClass {"id":"1"}`
      ])
      const exact = yield* Effect.exit(Exact.get({ page: undefined } as {}))
      assert.strictEqual(
        Exit.isFailure(exact) ? (Cause.squash(exact.cause) as Error).message : "no throw",
        `[Loader] read "Exact": the args don't encode with the read's args Schema`
      )
    }).pipe(Effect.provide(Layer.mergeAll(Search.layer, ByClass.layer, Exact.layer, TestLoader.layer())))
  })

  it.effect("an optional property that isn't undefined reaches the Schema's encoding as it is", () => {
    let calls = 0
    // The first member accepts any number as a type and only a positive one when it encodes,
    // so a negative `a` encodes with the second member, which needs the `b` the first doesn't have.
    const Filter = Schema.Union([
      Schema.Struct({ a: Schema.Number.check(Schema.isGreaterThan(0)).pipe(Schema.decodeTo(Schema.Number)) }),
      Schema.Struct({ a: Schema.Number, b: Schema.Number })
    ])
    class Search extends Loader.Service<Search>()("Search", {
      args: { filter: Schema.optionalKey(Filter) },
      success: Schema.Number,
      error: Schema.Never,
      staleTime: "Infinity"
    }, Effect.sync(() => () => Effect.sync(() => ++calls))) {}
    return Effect.gen(function*() {
      const results = [
        yield* Search.get({ filter: { a: -1, b: 1 } }),
        yield* Search.get({ filter: { a: -1, b: 2 } })
      ]
      assert.deepStrictEqual(results, [1, 2])
      assert.deepStrictEqual((yield* TestLoader.fetches).map((fetch) => fetch.logKey), [
        `{"filter":{"a":-1,"b":1}}`,
        `{"filter":{"a":-1,"b":2}}`
      ])
    }).pipe(Effect.provide(Layer.mergeAll(Search.layer, TestLoader.layer())))
  })

  it.effect("an undefined is dropped from the args the caller passes, before the Schema sees them", () => {
    const options = { success: Schema.Number, error: Schema.Never, staleTime: "Infinity" } as const
    const fetcher = Effect.succeed(() => Effect.succeed(1))
    // A check gets the args after the drop, so it treats undefined as it treats a missing property.
    class Checked extends Loader.Service<Checked>()("Checked", {
      ...options,
      args: Schema.Struct({ page: Schema.optional(Schema.Number) }).check(
        Schema.makeFilter((args) => "page" in args)
      )
    }, fetcher) {}
    // The caller passes a number. This undefined is made by the Schema's own encoding, and JSON can't carry it.
    class Encoded extends Loader.Service<Encoded>()("Encoded", {
      ...options,
      args: Schema.Struct({ value: Schema.optionalKey(Schema.Unknown) }).pipe(
        Schema.decodeTo(
          Schema.Number,
          SchemaTransformation.transform({
            decode: () => 1,
            encode: (): { readonly value?: unknown } => ({ value: undefined })
          })
        )
      )
    }, fetcher) {}
    // A type's own guard is the caller's code too. It isn't asked about an undefined the type already allows.
    const guarded: Array<unknown> = []
    class Guarded extends Loader.Service<Guarded>()("Guarded", {
      ...options,
      args: {
        when: Schema.optional(Schema.declare((u): u is Date => {
          guarded.push(u)
          return u instanceof Date
        }))
      }
    }, fetcher) {}
    const thrown = <R>(get: Effect.Effect<number, never, R>) =>
      Effect.map(
        Effect.exit(get),
        (exit) => Exit.isFailure(exit) ? (Cause.squash(exit.cause) as Error).message : "no throw"
      )
    return Effect.gen(function*() {
      assert.strictEqual(yield* Checked.get({ page: 1 }), 1)
      assert.strictEqual(yield* Guarded.get({ when: undefined }), 1)
      assert.deepStrictEqual(guarded, [])
      assert.deepStrictEqual([
        yield* thrown(Checked.get({ page: undefined })),
        yield* thrown(Checked.get({})),
        yield* thrown(Encoded.get(1))
      ], [
        `[Loader] read "Checked": the args don't encode with the read's args Schema`,
        `[Loader] read "Checked": the args don't encode with the read's args Schema`,
        `[Loader] read "Encoded": the args don't encode with the read's args Schema`
      ])
    }).pipe(Effect.provide(Layer.mergeAll(Checked.layer, Encoded.layer, Guarded.layer, TestLoader.layer())))
  })

  it.effect("the args Schema gets everything the drop doesn't change as it was passed", () => {
    const options = { success: Schema.Number, error: Schema.Never, staleTime: "Infinity" } as const
    const fetcher = Effect.succeed(() => Effect.succeed(1))
    class Plain extends Loader.Service<Plain>()("Plain", {
      ...options,
      args: { id: Schema.String, page: Schema.optional(Schema.Number) }
    }, fetcher) {}
    const some = Option.some({ page: 1 })
    class Wrapped extends Loader.Service<Wrapped>()("Wrapped", {
      ...options,
      args: Schema.Struct({
        filter: Schema.Option(Schema.Struct({ page: Schema.optional(Schema.Number) })),
        page: Schema.optional(Schema.Number)
      }).check(Schema.makeFilter((args) => args.filter === some))
    }, fetcher) {}
    return Effect.gen(function*() {
      // The Schema reads `id`, which isn't enumerable, and never reads `broken`, which throws.
      const args = Object.defineProperties({ page: undefined }, {
        id: { value: "1" },
        broken: {
          enumerable: true,
          get() {
            throw new Error("read")
          }
        }
      }) as { readonly id: string; readonly page: undefined }
      assert.strictEqual(yield* Plain.get(args), 1)
      assert.strictEqual(yield* Wrapped.get({ filter: some, page: undefined }), 1)
      assert.deepStrictEqual((yield* TestLoader.fetches).map((fetch) => fetch.read + " " + fetch.logKey), [
        `Plain {"id":"1"}`,
        `Wrapped {"filter":{"_tag":"Some","value":{"page":1}}}`
      ])
    }).pipe(Effect.provide(Layer.mergeAll(Plain.layer, Wrapped.layer, TestLoader.layer())))
  })

  it.effect("a union member and a record's keys are matched on the args as they are passed", () => {
    const options = { success: Schema.Number, error: Schema.Never, staleTime: "Infinity" } as const
    const fetcher = Effect.succeed(() => Effect.succeed(1))
    interface Node {
      readonly next?: Node | undefined
    }
    const Node: Schema.Codec<Node> = Schema.Struct({
      next: Schema.optional(Schema.suspend((): Schema.Codec<Node> => Node))
    })
    const checked: Array<string> = []
    class ByKind extends Loader.Service<ByKind>()("ByKind", {
      ...options,
      args: Schema.Union([
        Schema.Struct({ kind: Schema.Literal("A"), value: Node, page: Schema.optional(Schema.Number) }).check(
          Schema.makeFilter((args) => {
            checked.push(Object.keys(args).join())
            return true
          })
        ),
        Schema.Struct({ kind: Schema.Literal("B"), value: Schema.Struct({ id: Schema.String }) })
      ])
    }, fetcher) {}
    // The caller writes the key `a`. Only the encoded key has the prefix.
    const Name = Schema.String.pipe(
      Schema.encodeTo(Schema.String.check(Schema.isStartingWith("wire-")), {
        decode: SchemaGetter.transform((encoded: string) => encoded.slice(5)),
        encode: SchemaGetter.transform((name: string) => "wire-" + name)
      })
    )
    class ByName extends Loader.Service<ByName>()("ByName", {
      ...options,
      args: Schema.Record(Name, Schema.Struct({ page: Schema.optional(Schema.Number) }))
    }, fetcher) {}
    return Effect.gen(function*() {
      // Member A's check only ever gets the args after the drop.
      yield* ByKind.get({ kind: "A", value: {}, page: undefined })
      assert.deepStrictEqual([...new Set(checked)], ["kind,value"])
      // Member B doesn't name `next`, so what member A would do with it doesn't matter.
      const value: { id: string; next?: unknown } = { id: "1" }
      value.next = value
      yield* ByKind.get({ kind: "B", value })
      yield* ByName.get({ a: { page: undefined } })
      yield* ByName.get({ a: {} })
      assert.deepStrictEqual((yield* TestLoader.fetches).map((fetch) => fetch.read + " " + fetch.logKey), [
        `ByKind {"kind":"A","value":{}}`,
        `ByKind {"kind":"B","value":{"id":"1"}}`,
        `ByName {"wire-a":{}}`
      ])
    }).pipe(Effect.provide(Layer.mergeAll(ByKind.layer, ByName.layer, TestLoader.layer())))
  })

  it.effect("a record's value and a tuple's element keep their undefined, and a struct in one loses its own", () => {
    const Filter = Schema.UndefinedOr(Schema.Struct({ page: Schema.optional(Schema.Number) }))
    class Nested extends Loader.Service<Nested>()("Nested", {
      args: { record: Schema.Record(Schema.String, Filter), tuple: Schema.Tuple([Filter]) },
      success: Schema.Number,
      error: Schema.Never,
      staleTime: "Infinity"
    }, Effect.succeed(() => Effect.succeed(1))) {}
    return Effect.gen(function*() {
      yield* Nested.get({ record: { direct: undefined, nested: { page: undefined } }, tuple: [{ page: undefined }] })
      yield* Nested.get({ record: { direct: undefined, nested: {} }, tuple: [{}] })
      yield* Nested.get({ record: { nested: {} }, tuple: [undefined] })
      assert.deepStrictEqual((yield* TestLoader.fetches).map((fetch) => fetch.logKey), [
        `{"record":{"direct":null,"nested":{}},"tuple":[{}]}`,
        `{"record":{"nested":{}},"tuple":[null]}`
      ])
    }).pipe(Effect.provide(Layer.mergeAll(Nested.layer, TestLoader.layer())))
  })

  it.effect("none of the caller's code runs to find what to drop, and a union's members are asked in no order", () => {
    const options = { success: Schema.Number, error: Schema.Never, staleTime: "Infinity" } as const
    const fetcher = Effect.succeed(() => Effect.succeed(1))
    const page = Schema.optional(Schema.Number)
    class Plain extends Loader.Service<Plain>()("Plain", { ...options, args: { page } }, fetcher) {}
    const guarded: Array<unknown> = []
    const Stamp = Schema.declare((u): u is Date => {
      guarded.push(u)
      return u instanceof Date
    }, {
      toCodecJson: () =>
        Schema.link<Date>()(
          Schema.String,
          SchemaTransformation.transform({
            decode: (iso) => new Date(iso),
            encode: (date) => date.toISOString()
          })
        )
    })
    class Stamped extends Loader.Service<Stamped>()("Stamped", {
      ...options,
      args: Schema.Union([
        Schema.Struct({ kind: Schema.Literal("A"), at: Stamp, page }),
        Schema.Struct({ at: Stamp, page, size: Schema.optionalKey(Schema.Number) })
      ])
    }, fetcher) {}
    // Each property is optional in one member and required in the other.
    const Left = Schema.Struct({ a: Schema.optional(Schema.Number), b: Schema.UndefinedOr(Schema.Number) })
    const Right = Schema.Struct({ a: Schema.UndefinedOr(Schema.Number), b: Schema.optional(Schema.Number) })
    class Crossed
      extends Loader.Service<Crossed>()("Crossed", { ...options, args: Schema.Union([Left, Right]) }, fetcher)
    {}
    class Swapped
      extends Loader.Service<Swapped>()("Swapped", { ...options, args: Schema.Union([Right, Left]) }, fetcher)
    {}
    const List = Schema.Array(Schema.Struct({ page })).check(
      Schema.makeFilter((list) => Object.getOwnPropertyDescriptor(list, "length")?.writable === false)
    )
    class Listed extends Loader.Service<Listed>()("Listed", { ...options, args: List }, fetcher) {}
    const thrown = <R>(get: Effect.Effect<number, never, R>) =>
      Effect.map(
        Effect.exit(get),
        (exit) => Exit.isFailure(exit) ? (Cause.squash(exit.cause) as Error).message : "no throw"
      )
    return Effect.gen(function*() {
      // A getter is the Schema's to run, once. This one can't be run twice.
      let reads = 0
      yield* Plain.get({
        get page() {
          if (++reads > 1) throw new Error("read twice")
          return 1
        }
      })
      // So a property behind a getter is never dropped.
      yield* Plain.get({
        get page() {
          return undefined
        }
      })
      // A type's guard runs when the Schema runs it, and not before to tell which member the args are.
      const at = new Date(0)
      yield* Stamped.get({ kind: "A", at, page: undefined })
      yield* Stamped.get({ at, page: undefined })
      assert.deepStrictEqual(guarded, [at, at])
      // Both members have a say, whichever comes first, and neither takes the args that are left.
      const crossed = { a: undefined, b: undefined }
      assert.deepStrictEqual([yield* thrown(Crossed.get(crossed)), yield* thrown(Swapped.get(crossed))], [
        `[Loader] read "Crossed": the args don't encode with the read's args Schema`,
        `[Loader] read "Swapped": the args don't encode with the read's args Schema`
      ])
      // An array that loses nothing but a property of an element is still the array the caller made.
      yield* Listed.get(Object.defineProperty([{ page: undefined }], "length", { writable: false }))
      assert.deepStrictEqual((yield* TestLoader.fetches).map((fetch) => fetch.read + " " + fetch.logKey), [
        `Plain {"page":1}`,
        `Plain {"page":null}`,
        `Stamped {"at":"1970-01-01T00:00:00.000Z","kind":"A"}`,
        `Stamped {"at":"1970-01-01T00:00:00.000Z"}`,
        `Listed [{}]`
      ])
    }).pipe(Effect.provide(
      Layer.mergeAll(Plain.layer, Stamped.layer, Crossed.layer, Swapped.layer, Listed.layer, TestLoader.layer())
    ))
  })

  it("a definition and a cache throw on durations that can't be meant", () => {
    const define = (options: {
      readonly staleTime?: Duration.Input
      readonly idleTimeToLive?: Duration.Input
      readonly refetchInterval?: Duration.Input
    }) =>
    () =>
      Loader.Service<any>()("Bad", {
        args: {},
        success: Schema.Number,
        error: Schema.Never,
        staleTime: 0,
        ...options
      }, Effect.succeed(() => Effect.succeed(1)))
    assert.throws(define({ staleTime: -1 }), `[Loader] read "Bad": staleTime can't be negative`)
    assert.throws(define({ staleTime: "-Infinity" }), "staleTime can't be negative")
    assert.throws(define({ idleTimeToLive: "-1 second" as Duration.Input }), "idleTimeToLive can't be negative")
    assert.throws(define({ refetchInterval: 0 }), `"500 millis"`)
    assert.throws(define({ refetchInterval: "0 seconds" }), "refetchInterval must be positive")
    assert.throws(define({ refetchInterval: 999 }), `"500 millis"`)
    assert.throws(() => Loader.layer({ idleTimeToLive: -1 }), "[Loader] idleTimeToLive can't be negative")
    // Zero and "Infinity" are legal where they mean something.
    assert.doesNotThrow(define({ staleTime: "Infinity", idleTimeToLive: 0, refetchInterval: "500 millis" }))
    assert.doesNotThrow(define({ refetchInterval: 1000 }))
  })

  it.effect("an unexpected problem fails the test's Scope", () => {
    const first = makeUsers({ staleTime: "Infinity" })
    const second = makeUsers({ staleTime: "Infinity" })
    return Effect.gen(function*() {
      const exit = yield* Effect.exit(
        Effect.andThen(first.GetUser.peek({ id: "1" }), second.GetUser.peek({ id: "1" })).pipe(
          Effect.provide(TestLoader.layer())
        )
      )
      const defect = Exit.isFailure(exit) ? Cause.squash(exit.cause) : undefined
      assert.instanceOf(defect, TestLoader.ProblemsError)
      assert.deepStrictEqual(defect.problems.map((problem) => problem._tag), ["DuplicateName"])
    })
  })
})
