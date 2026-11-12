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
  Scheduler,
  Schema,
  SchemaTransformation,
  Scope,
  Stream
} from "effect"
import type { Duration } from "effect"
import { AsyncResult, Loader } from "effect/reactivity"
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

  it.effect("the last watcher abandoning its fetch interrupts it, unless a get or a prefetch joined it", () => {
    const { GetUser, db, provide } = makeUsers({ staleTime: "30 seconds" })
    return Effect.gen(function*() {
      const cache = Loader.internals(yield* Loader.Cache)
      const def = Loader.defOf(GetUser)
      const fetcher = (yield* GetUser) as unknown as (args: unknown) => Effect.Effect<any, any>
      const watchOne = (id: string) => cache.watch(def, { id }, fetcher, () => {})
      // Alone: the fetch goes, and the cold entry with it.
      const alone = watchOne("1")
      yield* flush
      alone.unregister(true)
      yield* advance(10)
      assert.isUndefined(yield* TestLoader.entry(GetUser, { id: "1" }))
      // Joined by a get, which still gets its value.
      const waited = watchOne("2")
      const got = yield* Effect.forkScoped(GetUser.get({ id: "2" }))
      yield* flush
      waited.unregister(true)
      yield* advance(10)
      assert.deepStrictEqual(yield* Fiber.join(got), { id: "2", name: "Ann" })
      // Joined by a prefetch, which outlives its caller.
      const prefetched = watchOne("3")
      yield* GetUser.prefetch({ id: "3" })
      yield* flush
      prefetched.unregister(true)
      yield* advance(10)
      assert.isTrue(AsyncResult.isSuccess((yield* TestLoader.entry(GetUser, { id: "3" }))!.stored))
      assert.strictEqual(db.calls, 3)
    }).pipe(provide)
  })

  it.effect("under a hold, the zero-to-one decision waits for release and ignores the order of releases and registrations", () => {
    const { GetUser, db, provide } = makeUsers({ staleTime: "30 seconds" })
    return Effect.gen(function*() {
      const cache = Loader.internals(yield* Loader.Cache)
      const def = Loader.defOf(GetUser)
      const fetcher = (yield* GetUser) as unknown as (args: unknown) => Effect.Effect<any, any>
      const watchOne = () => cache.watch(def, { id: "1" }, fetcher, () => {})
      const old = watchOne()
      yield* advance(10)
      yield* advance("31 seconds")
      // The new watcher registers before the old one goes: a join, were it decided then.
      const release = cache.hold()
      const next = watchOne()
      old.unregister()
      yield* flush
      assert.strictEqual((yield* TestLoader.entry(GetUser, { id: "1" }))?.fetch, "none")
      release()
      assert.strictEqual(next.current().waiting, true)
      yield* advance(10)
      assert.strictEqual(db.calls, 2)
      // A watcher from before the hold survives it: a join.
      yield* advance("31 seconds")
      const releaseAgain = cache.hold()
      const joining = watchOne()
      releaseAgain()
      yield* advance(10)
      assert.strictEqual(db.calls, 2)
      next.unregister()
      joining.unregister()
      assert.deepStrictEqual(yield* triggers, ["watch", "watch"])
    }).pipe(provide)
  })

  it.effect("under a hold, a bare Failure is withheld: a swap clears it unseen, and a join gets it at release", () => {
    const { GetUser, db, provide } = makeUsers({ staleTime: "30 seconds" })
    return Effect.gen(function*() {
      const cache = Loader.internals(yield* Loader.Cache)
      const def = Loader.defOf(GetUser)
      const fetcher = (yield* GetUser) as unknown as (args: unknown) => Effect.Effect<any, any>
      const seen: Array<string> = []
      const watchOne = (name: string) =>
        cache.watch(def, { id: "1" }, fetcher, (result) => seen.push(name + " " + show(result as Seen)))
      db.mode = "fail"
      const old = watchOne("old")
      yield* advance(10)
      assert.deepStrictEqual(seen, ["old Failure(nope)"])

      // Join: old survives the hold.
      const releaseJoin = cache.hold()
      const joining = watchOne("joining")
      // It reads what it would had the Failure been dropped: cold, with no fetch yet.
      assert.deepStrictEqual(joining.current(), AsyncResult.initial())
      releaseJoin()
      assert.deepStrictEqual(seen, ["old Failure(nope)", "joining Failure(nope)"])
      assert.strictEqual(show(joining.current() as Seen), "Failure(nope)")
      joining.unregister()

      // Swap: the new watcher registers before old leaves, and never sees the Failure.
      seen.length = 0
      const releaseSwap = cache.hold()
      const next = watchOne("next")
      old.unregister()
      assert.deepStrictEqual(next.patchedView().result, AsyncResult.initial())
      releaseSwap()
      assert.deepStrictEqual(next.current(), AsyncResult.initial(true))
      db.mode = "ok"
      yield* advance(10)
      assert.deepStrictEqual(seen, ["next Ann"])
      assert.deepStrictEqual(yield* triggers, ["watch", "watch"])
      next.unregister()
    }).pipe(provide)
  })

  it.effect("under a hold, a bare Failure stored during it or an earlier one is withheld, in either order", () =>
    Effect.gen(function*() {
      for (const timing of ["this hold", "an earlier hold"] as const) {
        for (const order of ["register first", "release first"] as const) {
          const { GetUser, db, provide } = makeUsers({ staleTime: "30 seconds" })
          const result = yield* Effect.gen(function*() {
            const cache = Loader.internals(yield* Loader.Cache)
            const def = Loader.defOf(GetUser)
            const fetcher = (yield* GetUser) as unknown as (args: unknown) => Effect.Effect<any, any>
            const seen: Array<string> = []
            const watchOne = (name: string) =>
              cache.watch(def, { id: "1" }, fetcher, (result) => seen.push(name + " " + show(result as Seen)))
            db.mode = "fail"
            const old = watchOne("old")
            const first = cache.hold()
            // The fetch fails while the hold is open.
            yield* advance(10)
            if (timing === "an earlier hold") first()
            const release = timing === "this hold" ? first : cache.hold()
            seen.length = 0
            if (order === "release first") old.unregister()
            const next = watchOne("next")
            const before = show(next.current() as Seen)
            if (order === "register first") old.unregister()
            release()
            const after = show(next.current() as Seen)
            db.mode = "ok"
            yield* advance(10)
            next.unregister()
            return { before, after, seen, triggers: yield* triggers }
          }).pipe(provide)
          assert.deepStrictEqual(result, {
            before: "Initial",
            after: "Initial waiting",
            seen: ["next Ann"],
            triggers: ["watch", "watch"]
          }, `${timing}, ${order}`)
        }
      }
    }))

  it.effect("under a hold, the window counts only the watchers that survive it", () =>
    Effect.gen(function*() {
      for (const survives of [false, true]) {
        for (const order of ["register first", "release first"] as const) {
          const { GetUser, provide } = makeUsers({ staleTime: "30 seconds" })
          const result = yield* Effect.gen(function*() {
            const cache = Loader.internals(yield* Loader.Cache)
            const def = Loader.defOf(GetUser)
            const fetcher = (yield* GetUser) as unknown as (args: unknown) => Effect.Effect<any, any>
            const seen: Array<string> = []
            cache.hydrate({ "users/GetUser": [["{\"id\":\"1\"}", 1, ["nope"], 0]] })
            const release = cache.hold()
            const inside = cache.watch(def, { id: "1" }, fetcher, () => {})
            cache.closeWindow()
            if (!survives && order === "release first") inside.unregister()
            const outside = cache.watch(def, { id: "1" }, fetcher, (result) => seen.push(show(result as Seen)))
            const before = show(outside.current() as Seen)
            if (!survives && order === "register first") inside.unregister()
            release()
            const after = show(outside.current() as Seen)
            yield* advance(10)
            outside.unregister()
            inside.unregister()
            return { before, after, seen, triggers: yield* triggers }
          }).pipe(provide)
          assert.deepStrictEqual(
            result,
            survives
              // A join on the hydrated Failure: delivered at release, with no fetch.
              ? { before: "Initial", after: "Failure(nope)", seen: ["Failure(nope)"], triggers: [] }
              // The watcher that came inside the window left after it closed: dropped and fetched.
              : { before: "Initial", after: "Initial waiting", seen: ["Ann"], triggers: ["watch"] },
            `${survives ? "survives" : "leaves"}, ${order}`
          )
        }
      }
    }))

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
      const cache = Loader.internals(yield* Loader.Cache)
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

  it.effect("makeCache builds the cache when it runs and disposes it with its Scope", () => {
    let listeners = 0
    const signal: Loader.Signal = {
      get: () => true,
      subscribe: () => {
        listeners++
        return () => {
          listeners--
        }
      }
    }
    return Effect.gen(function*() {
      const make = Loader.makeCache({ visibility: signal, connectivity: signal, report: () => {}, idleMs: 300_000 })
      assert.strictEqual(listeners, 0)
      const scope = yield* Scope.make()
      yield* make.pipe(Scope.provide(scope))
      assert.strictEqual(listeners, 2)
      yield* Scope.close(scope, Exit.void)
      assert.strictEqual(listeners, 0)
    })
  })

  it.effect("makeCache disposes a cache whose build is interrupted", () => {
    let listeners = 0
    const signal: Loader.Signal = {
      get: () => true,
      subscribe: () => {
        listeners++
        return () => {
          listeners--
        }
      }
    }
    // Yields once, right after the build subscribes both signals.
    let yielded = false
    const scheduler = new Scheduler.MixedScheduler()
    scheduler.shouldYield = () => {
      if (listeners !== 2 || yielded) return false
      yielded = true
      return true
    }
    return Effect.gen(function*() {
      const scope = yield* Scope.make()
      const fiber = Effect.runFork(
        Loader.makeCache({ visibility: signal, connectivity: signal, report: () => {}, idleMs: 300_000 }).pipe(
          Scope.provide(scope),
          Effect.provideService(Scheduler.Scheduler, scheduler)
        )
      )
      fiber.interruptUnsafe()
      yield* Fiber.await(fiber)
      yield* Scope.close(scope, Exit.void)
      assert.isTrue(yielded)
      assert.strictEqual(listeners, 0)
    })
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

  it.effect("an optional field of the args struct that is undefined is the same entry as a missing one", () => {
    let calls = 0
    const fetcher = Effect.sync(() => () => Effect.sync(() => ++calls))
    const options = { success: Schema.Number, error: Schema.Never, staleTime: "Infinity" } as const
    class Search extends Loader.Service<Search>()("Search", {
      ...options,
      args: {
        token: Schema.Redacted(Schema.String),
        page: Schema.optional(Schema.Number),
        // Here `null` is data and `undefined` is dropped, so the two are told apart.
        size: Schema.optional(Schema.NullOr(Schema.Number)),
        // A required key keeps its undefined.
        cursor: Schema.UndefinedOr(Schema.String)
      }
    }, fetcher) {}
    // The Schema decides what the args may be: this property may be missing, and may not be undefined.
    class Exact extends Loader.Service<Exact>()("Exact", {
      ...options,
      args: { page: Schema.optionalKey(Schema.Number) }
    }, fetcher) {}
    // Two more ways to write a struct with optional fields. What isn't a field keeps its undefined.
    class Rest extends Loader.Service<Rest>()("Rest", {
      ...options,
      args: Schema.StructWithRest(Schema.Struct({ id: Schema.Number, page: Schema.optional(Schema.Number) }), [
        Schema.Record(Schema.String, Schema.UndefinedOr(Schema.Number))
      ])
    }, fetcher) {}
    class Keyed extends Loader.Service<Keyed>()("Keyed", {
      ...options,
      args: Schema.Record(Schema.Literals(["a", "b"]), Schema.optional(Schema.Number))
    }, fetcher) {}
    return Effect.gen(function*() {
      const token = Redacted.make("s3cret")
      const cursor = undefined
      const results = [
        yield* Search.get({ token, cursor, page: undefined, size: undefined }),
        yield* Search.get({ token, cursor }),
        yield* Search.get({ token, cursor, size: null }),
        yield* Rest.get({ id: 1, page: undefined, extra: undefined }),
        yield* Rest.get({ id: 1, extra: undefined }),
        yield* Keyed.get({ a: undefined, b: 1 }),
        yield* Keyed.get({ b: 1 })
      ]
      assert.deepStrictEqual(results, [1, 1, 2, 3, 3, 4, 4])
      assert.deepStrictEqual((yield* TestLoader.fetches).map((fetch) => fetch.read + " " + fetch.logKey), [
        `Search {"cursor":null,"token":{"~redacted":true}}`,
        `Search {"cursor":null,"size":null,"token":{"~redacted":true}}`,
        `Rest {"extra":null,"id":1}`,
        `Keyed {"b":1}`
      ])
      const exact = yield* Effect.exit(Exact.get({ page: undefined } as {}))
      assert.strictEqual(
        Exit.isFailure(exact) ? (Cause.squash(exact.cause) as Error).message : "no throw",
        `[Loader] read "Exact": the args don't encode with the read's args Schema`
      )
    }).pipe(Effect.provide(
      Layer.mergeAll(Search.layer, Exact.layer, Rest.layer, Keyed.layer, TestLoader.layer())
    ))
  })

  it.effect("the drop comes before the args Schema sees the args, and runs nothing of theirs to decide", () => {
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
    // A declared type's guard is the Schema's to run. `when` names undefined, so the guard isn't asked.
    // `until` doesn't, and only the guard could say, so the Schema gets the undefined and rejects it.
    const guarded: Array<unknown> = []
    const Stamp = Schema.declare((u): u is Date => {
      guarded.push(u)
      return u instanceof Date
    })
    class Guarded extends Loader.Service<Guarded>()("Guarded", {
      ...options,
      args: { when: Schema.optional(Stamp), until: Schema.optionalKey(Stamp) }
    }, fetcher) {}
    // What the drop leaves is handed on as it was defined, and args that lose nothing are handed on themselves.
    const seen: Array<unknown> = []
    class Plain extends Loader.Service<Plain>()("Plain", {
      ...options,
      args: Schema.Struct({ id: Schema.String, page: Schema.optional(Schema.Number) }).check(
        Schema.makeFilter((args) => {
          seen.push(args)
          return true
        })
      )
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
        yield* thrown(Encoded.get(1)),
        yield* thrown(Guarded.get({ until: undefined } as {}))
      ], [
        `[Loader] read "Checked": the args don't encode with the read's args Schema`,
        `[Loader] read "Checked": the args don't encode with the read's args Schema`,
        `[Loader] read "Encoded": the args don't encode with the read's args Schema`,
        `[Loader] read "Guarded": the args don't encode with the read's args Schema`
      ])
      assert.deepStrictEqual(guarded, [undefined])
      // The Schema reads `id`, which isn't enumerable, and never reads `broken`, which throws.
      const defined = Object.defineProperties({ page: undefined }, {
        id: { value: "1" },
        broken: {
          enumerable: true,
          get() {
            throw new Error("read")
          }
        }
      }) as { readonly id: string; readonly page: undefined }
      const same = { id: "2", page: 2 }
      // A getter is the Schema's to run, once, and a property the args inherit is the Schema's to find.
      let reads = 0
      const getter = {
        id: "3",
        get page() {
          reads++
          return undefined
        }
      }
      const inherited: { readonly id: string } = Object.assign(Object.create({ page: undefined }), { id: "4" })
      for (const args of [defined, same, getter, inherited]) yield* Plain.get(args)
      assert.strictEqual(seen[1], same)
      assert.strictEqual(reads, 1)
      assert.deepStrictEqual((yield* TestLoader.fetches).map((fetch) => fetch.read + " " + fetch.logKey), [
        `Checked {"page":1}`,
        `Guarded {}`,
        `Plain {"id":"1"}`,
        `Plain {"id":"2","page":2}`,
        `Plain {"id":"3","page":null}`,
        `Plain {"id":"4","page":null}`
      ])
    }).pipe(Effect.provide(
      Layer.mergeAll(Checked.layer, Encoded.layer, Guarded.layer, Plain.layer, TestLoader.layer())
    ))
  })

  it.effect("what a field of the args struct holds reaches the args Schema as it was passed", () => {
    let calls = 0
    const fetcher = Effect.sync(() => () => Effect.sync(() => ++calls))
    const options = { success: Schema.Number, error: Schema.Never, staleTime: "Infinity" } as const
    const Page = Schema.Struct({ page: Schema.optional(Schema.NullOr(Schema.Number)) })
    class Paged extends Schema.Class<Paged>("Paged")({ page: Schema.optional(Schema.Number) }) {}
    class Nested extends Loader.Service<Nested>()("Nested", {
      ...options,
      args: { id: Schema.String, filter: Page }
    }, fetcher) {}
    class Held extends Loader.Service<Held>()("Held", {
      ...options,
      args: {
        union: Schema.Union([Page, Schema.String]),
        instance: Paged,
        record: Schema.Record(Schema.String, Schema.UndefinedOr(Page)),
        tuple: Schema.Tuple([Page, Schema.UndefinedOr(Page)]),
        option: Schema.Option(Page)
      }
    }, fetcher) {}
    // Args that are not themselves a struct are not looked into either.
    class ByClass extends Loader.Service<ByClass>()("ByClass", { ...options, args: Paged }, fetcher) {}
    class ByUnion extends Loader.Service<ByUnion>()("ByUnion", {
      ...options,
      args: Schema.Union([Page, Schema.String])
    }, fetcher) {}
    class BySuspend extends Loader.Service<BySuspend>()("BySuspend", {
      ...options,
      args: Schema.suspend(() => Page)
    }, fetcher) {}
    return Effect.gen(function*() {
      const page = { page: undefined }
      // The JSON encoding has no `undefined`, so below the args struct it and `null` are one entry, whichever
      // comes first, and the later caller gets the earlier one's data. A missing property is another entry.
      const results = [
        yield* Nested.get({ id: "a", filter: { page: undefined } }),
        yield* Nested.get({ id: "a", filter: { page: null } }),
        yield* Nested.get({ id: "b", filter: { page: null } }),
        yield* Nested.get({ id: "b", filter: { page: undefined } }),
        yield* Nested.get({ id: "a", filter: {} }),
        yield* Held.get({
          union: page,
          instance: new Paged(page),
          record: { held: page, direct: undefined },
          tuple: [page, undefined],
          option: Option.some(page)
        }),
        yield* ByClass.get(new Paged(page)),
        yield* ByClass.get(new Paged({})),
        yield* ByUnion.get(page),
        yield* BySuspend.get(page)
      ]
      assert.deepStrictEqual(results, [1, 1, 2, 2, 3, 4, 5, 6, 7, 8])
      assert.deepStrictEqual((yield* TestLoader.fetches).map((fetch) => fetch.read + " " + fetch.logKey), [
        `Nested {"filter":{"page":null},"id":"a"}`,
        `Nested {"filter":{"page":null},"id":"b"}`,
        `Nested {"filter":{},"id":"a"}`,
        `Held {"instance":{"page":null},"option":{"_tag":"Some","value":{"page":null}},` +
        `"record":{"direct":null,"held":{"page":null}},"tuple":[{"page":null},null],"union":{"page":null}}`,
        `ByClass {"page":null}`,
        `ByClass {}`,
        `ByUnion {"page":null}`,
        `BySuspend {"page":null}`
      ])
    }).pipe(Effect.provide(Layer.mergeAll(
      Nested.layer,
      Held.layer,
      ByClass.layer,
      ByUnion.layer,
      BySuspend.layer,
      TestLoader.layer()
    )))
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
