import { assert, describe, it } from "@effect/vitest"
import { Cause, Context, Deferred, Effect, Exit, Fiber, Layer, Option, Schema, Scope, Stream } from "effect"
import { AsyncResult, Loader } from "effect/reactivity"
import { TestClock } from "effect/testing"

// PROTOTYPE (EFF-3558): the Loader core, driven through its synchronous internal API.

const User = Schema.Struct({ id: Schema.String, name: Schema.String, count: Schema.Number })
type User = typeof User.Type

const UsersTag = Loader.Tag("users")

// One macrotask: lets every fiber forked on the scheduler run.
const flush = Effect.promise(() => new Promise<void>((resolve) => setTimeout(resolve, 0)))
const advance = (duration: Parameters<typeof TestClock.adjust>[0]) =>
  Effect.andThen(Effect.andThen(flush, TestClock.adjust(duration)), flush)

type Seen = AsyncResult.AsyncResult<User, string>
// "patched": the value includes an unconfirmed patch. "waiting": a fetch is in flight. Two separate bits.
const show = (result: Seen, patched = false): string =>
  AsyncResult.isSuccess(result)
    ? result.value.name + ":" + result.value.count + (patched ? " patched" : "") + (result.waiting ? " waiting" : "")
    : AsyncResult.isFailure(result)
    ? "Failure(" + Option.getOrElse(Cause.findErrorOption(result.cause), () => "?") + ")" +
      (Option.isSome(result.previousSuccess) ? " previous" : "") + (result.waiting ? " waiting" : "")
    : "Initial" + (result.waiting ? " waiting" : "")

const makeUsers = (options: {
  readonly staleTime: string | number
  readonly idleTimeToLive?: string
  readonly refetchInterval?: string
}) => {
  const db = {
    calls: 0,
    user: { name: "Ann", count: 5 },
    fail: false,
    die: false
  }
  class GetUser extends Loader.Service<GetUser>()(
    "users/GetUser",
    {
      args: Schema.Struct({ id: Schema.String }),
      success: User,
      error: Schema.String,
      staleTime: options.staleTime as any,
      idleTimeToLive: options.idleTimeToLive as any,
      refetchInterval: options.refetchInterval as any,
      tags: [UsersTag]
    },
    Effect.succeed(({ id }) =>
      Effect.gen(function*() {
        db.calls++
        yield* Effect.sleep(10)
        if (db.die) return yield* Effect.die("boom")
        if (db.fail || id === "404") return yield* Effect.fail("nope")
        return { id, ...db.user }
      })
    )
  ) {}
  return { db, GetUser }
}

const makeCache = Effect.fnUntraced(function*(options?: Loader.CacheOptions) {
  const scope = yield* Effect.scope
  const visibility = Loader.makeSignal(true)
  const connectivity = Loader.makeSignal(true)
  const context = (yield* Effect.context<never>()).pipe(
    Context.add(Loader.Visibility, visibility),
    Context.add(Loader.Connectivity, connectivity)
  )
  const service = Loader.makeCacheUnsafe({ ...options, scope, context })
  const cache = Loader.internals(service)
  const fetches: Array<Loader.FetchEvent> = []
  cache.onFetch((event) => fetches.push(event))
  return { service, cache, visibility, connectivity, fetches }
})

const setup = Effect.fnUntraced(function*(
  readOptions: Parameters<typeof makeUsers>[0],
  cacheOptions?: Loader.CacheOptions
) {
  const users = makeUsers(readOptions)
  const made = yield* makeCache(cacheOptions)
  const fetcher = Context.get(yield* Layer.build(users.GetUser.layer), users.GetUser)
  const provide = <A, E>(effect: Effect.Effect<A, E, any>): Effect.Effect<A, E> =>
    Effect.provide(
      effect,
      Context.make(Loader.Cache, made.service).pipe(Context.add(users.GetUser, fetcher))
    ) as any
  const watch = (id: string, options?: Loader.WatchOptions) => {
    const seen: Array<string> = []
    const defects: Array<unknown> = []
    const handle = made.cache.watch(
      users.GetUser,
      { id },
      fetcher,
      (result, patched) => seen.push(show(result, patched)),
      (cause) => defects.push(Cause.squash(cause)),
      options
    )
    const current = () => show(handle.current(), handle.patched())
    return { seen, defects, handle, current }
  }
  const peek = (id: string) => show(made.cache.peek(users.GetUser, { id }), made.cache.isPatched(users.GetUser, { id }))
  return { ...users, ...made, fetcher, provide, watch, peek }
})

const triggers = (fetches: ReadonlyArray<Loader.FetchEvent>) =>
  fetches.map((event) => event.trigger + (event.restart ? " restart" : ""))

describe("Loader", () => {
  it.effect("dedupes, and only the zero-to-one watcher transition fetches", () =>
    Effect.gen(function*() {
      const t = yield* setup({ staleTime: "30 seconds" })
      const a = t.watch("1")
      // The count rises and the fetch is in flight synchronously, but the fetcher hasn't started.
      assert.strictEqual(t.cache.inspect(t.GetUser, { id: "1" }).watchers, 1)
      assert.isTrue(t.cache.isFetching())
      assert.strictEqual(t.db.calls, 0)
      assert.deepStrictEqual(a.seen, [])
      const b = t.watch("1")
      yield* flush
      assert.strictEqual(t.db.calls, 1)
      // Quiet over cold.
      assert.deepStrictEqual(a.seen, [])
      yield* advance(10)
      assert.deepStrictEqual(a.seen, ["Ann:5"])
      assert.deepStrictEqual(b.seen, ["Ann:5"])
      assert.isFalse(t.cache.isFetching())

      yield* advance("31 seconds")
      assert.isTrue(t.cache.inspect(t.GetUser, { id: "1" }).stale)
      // A joining watcher never refetches, even over a stale entry.
      const c = t.watch("1")
      yield* advance(20)
      assert.deepStrictEqual(c.seen, ["Ann:5"])
      assert.strictEqual(t.db.calls, 1)

      a.handle.unregister()
      b.handle.unregister()
      c.handle.unregister()
      assert.strictEqual(t.cache.inspect(t.GetUser, { id: "1" }).watchers, 0)
      // Zero-to-one over a stale entry refetches, and serves the stale value at once.
      const d = t.watch("1")
      yield* flush
      assert.deepStrictEqual(d.seen, ["Ann:5 waiting"])
      yield* advance(10)
      assert.deepStrictEqual(d.seen, ["Ann:5 waiting", "Ann:5"])
      assert.strictEqual(t.db.calls, 2)
      assert.deepStrictEqual(triggers(t.fetches), ["watch", "watch"])
      // Nothing new for the old handles.
      assert.deepStrictEqual(a.seen, ["Ann:5"])
    }))

  it.effect("staleTime: get serves a fresh value and fetches a stale one", () =>
    Effect.gen(function*() {
      const t = yield* setup({ staleTime: "30 seconds" })
      const get = t.provide(t.GetUser.get({ id: "1" }))
      const f1 = yield* Effect.forkChild(get)
      const f2 = yield* Effect.forkChild(get)
      yield* advance(10)
      assert.strictEqual((yield* Fiber.join(f1)).name, "Ann")
      assert.strictEqual((yield* Fiber.join(f2)).name, "Ann")
      assert.strictEqual(t.db.calls, 1)
      t.db.user.name = "Bob"
      assert.strictEqual((yield* get).name, "Ann")
      yield* t.provide(t.GetUser.prefetch({ id: "1" }))
      yield* advance(10)
      assert.strictEqual(t.db.calls, 1)
      yield* advance("30 seconds")
      const f3 = yield* Effect.forkChild(get)
      yield* advance(10)
      assert.strictEqual((yield* Fiber.join(f3)).name, "Bob")
      assert.strictEqual(t.db.calls, 2)
      assert.deepStrictEqual(triggers(t.fetches), ["get", "get"])
      assert.strictEqual(show(yield* t.provide(t.GetUser.peek({ id: "1" }))), "Bob:5")
    }))

  it.effect("failures: stored for watchers, never bare when unwatched, defects never stored", () =>
    Effect.gen(function*() {
      const t = yield* setup({ staleTime: "30 seconds" })
      // An unwatched get doesn't store a Failure.
      const f = yield* Effect.forkChild(Effect.exit(t.provide(t.GetUser.get({ id: "404" }))))
      yield* advance(10)
      assert.deepStrictEqual(yield* Fiber.join(f), Exit.fail("nope"))
      assert.isFalse(t.cache.inspect(t.GetUser, { id: "404" }).exists)

      // A watched one is stored, and dropped when its last watcher leaves.
      const a = t.watch("404")
      yield* advance(10)
      assert.deepStrictEqual(a.seen, ["Failure(nope)"])
      // A Failure is always stale, but a joining watcher still doesn't refetch.
      const calls = t.db.calls
      const b = t.watch("404")
      yield* advance(10)
      assert.strictEqual(t.db.calls, calls)
      a.handle.unregister()
      assert.isTrue(t.cache.inspect(t.GetUser, { id: "404" }).exists)
      b.handle.unregister()
      assert.isFalse(t.cache.inspect(t.GetUser, { id: "404" }).exists)

      // A failed background refetch keeps the previous Success.
      const c = t.watch("1")
      yield* advance(10)
      c.handle.unregister()
      t.db.fail = true
      yield* advance("31 seconds")
      const d = t.watch("1")
      yield* advance(10)
      assert.deepStrictEqual(d.seen, ["Ann:5 waiting", "Failure(nope) previous"])
      d.handle.unregister()
      assert.isTrue(t.cache.inspect(t.GetUser, { id: "1" }).exists)

      // A defect fails the watchers and isn't stored.
      t.db.fail = false
      t.db.die = true
      const e = t.watch("2")
      yield* advance(10)
      assert.deepStrictEqual(e.seen, [])
      assert.deepStrictEqual(e.defects, ["boom"])
      assert.strictEqual(show(t.cache.peek(t.GetUser, { id: "2" })), "Initial")
      e.handle.unregister()
      assert.isFalse(t.cache.inspect(t.GetUser, { id: "2" }).exists)
    }))

  it.effect("idleTimeToLive collects an unwatched entry", () =>
    Effect.gen(function*() {
      const t = yield* setup({ staleTime: "Infinity" }, { idleTimeToLive: "5 minutes" })
      const exists = () => t.cache.inspect(t.GetUser, { id: "1" }).exists
      // A prefetched entry that is never watched starts its timer at settle.
      yield* t.provide(t.GetUser.prefetch({ id: "1" }))
      yield* advance(10)
      assert.isTrue(exists())
      yield* advance("4 minutes")
      // A watch cancels the timer.
      const a = t.watch("1")
      yield* advance("10 minutes")
      assert.isTrue(exists())
      a.handle.unregister()
      yield* advance("4 minutes")
      // get resets it, peek doesn't.
      yield* t.provide(t.GetUser.get({ id: "1" }))
      yield* advance("4 minutes")
      t.cache.peek(t.GetUser, { id: "1" })
      assert.isTrue(exists())
      yield* advance("2 minutes")
      assert.isFalse(exists())
      assert.strictEqual(t.db.calls, 1)
    }))

  it.effect("refetchInterval polls while watched and pauses while hidden", () =>
    Effect.gen(function*() {
      const t = yield* setup({ staleTime: "Infinity", refetchInterval: "2 seconds" })
      const a = t.watch("1")
      yield* advance(10)
      assert.strictEqual(t.db.calls, 1)
      yield* advance("2 seconds")
      yield* advance(10)
      assert.strictEqual(t.db.calls, 2)
      // Hidden: the count goes on, the firing doesn't.
      t.visibility.set(false)
      yield* advance("5 seconds")
      assert.strictEqual(t.db.calls, 2)
      // Due on the edge: fires at once.
      t.visibility.set(true)
      yield* advance(10)
      assert.strictEqual(t.db.calls, 3)
      // Not due on the edge: sleeps for the remainder.
      yield* advance("1 seconds")
      t.connectivity.set(false)
      yield* advance(500)
      t.connectivity.set(true)
      yield* advance(100)
      assert.strictEqual(t.db.calls, 3)
      yield* advance(500)
      assert.strictEqual(t.db.calls, 4)
      assert.deepStrictEqual(triggers(t.fetches), ["watch", "interval", "visibility", "interval"])
      // Unwatched: no timer.
      a.handle.unregister()
      yield* advance("10 seconds")
      assert.strictEqual(t.db.calls, 4)
    }))

  it.effect("one invalidation is one batch", () =>
    Effect.gen(function*() {
      const t = yield* setup({ staleTime: "Infinity" })
      const a = t.watch("1")
      yield* t.provide(t.GetUser.prefetch({ id: "2" }))
      yield* advance(10)
      assert.strictEqual(t.db.calls, 2)
      t.fetches.length = 0
      t.db.user.name = "Bob"
      // The entry is hit by a key, a tag and the whole read: it restarts once.
      t.cache.applyInvalidation([t.GetUser.entry({ id: "1" }), UsersTag, t.GetUser, t.GetUser.entry({ id: "never" })])
      assert.deepStrictEqual(triggers(t.fetches), ["invalidation"])
      assert.isFalse(t.cache.inspect(t.GetUser, { id: "never" }).exists)
      // Unwatched: stale despite "Infinity", refetched on its next get.
      assert.isTrue(t.cache.inspect(t.GetUser, { id: "2" }).stale)
      assert.isFalse(t.cache.inspect(t.GetUser, { id: "2" }).fetching)
      // A fetch in flight is interrupted and restarted, keeping its trigger.
      yield* advance(5)
      yield* t.provide(t.GetUser.invalidate({ id: "1" }))
      assert.deepStrictEqual(triggers(t.fetches), ["invalidation", "invalidation restart"])
      yield* advance(5)
      assert.deepStrictEqual(a.seen, ["Ann:5", "Ann:5 waiting"])
      yield* advance(5)
      assert.deepStrictEqual(a.seen, ["Ann:5", "Ann:5 waiting", "Bob:5"])
      const f = yield* Effect.forkChild(t.provide(t.GetUser.get({ id: "2" })))
      yield* advance(10)
      assert.strictEqual((yield* Fiber.join(f)).name, "Bob")
    }))

  it.effect("a count + 1 patch with a visibility edge never double counts", () =>
    Effect.gen(function*() {
      const t = yield* setup({ staleTime: 0 })
      const a = t.watch("1")
      yield* advance(10)
      assert.deepStrictEqual(a.seen, ["Ann:5"])
      t.fetches.length = 0
      const run = t.cache.beginRun([t.GetUser.patch({ id: "1" }, (user) => ({ ...user, count: user.count + 1 }))])
      run.start()
      // The patch reaches the watcher synchronously, as patched and not waiting: no fetch is in flight.
      assert.deepStrictEqual(a.seen, ["Ann:5", "Ann:6 patched"])
      // The tab comes back mid-mutation. The server has already counted.
      t.db.user.count = 6
      t.visibility.set(false)
      t.visibility.set(true)
      yield* advance(20)
      assert.deepStrictEqual(t.fetches, [])
      assert.isFalse(t.cache.isFetching())
      // get gives the server value: fetched for the caller, nothing stored, no cache fetch.
      const got = yield* Effect.forkChild(t.provide(t.GetUser.get({ id: "1" })))
      yield* advance(10)
      assert.strictEqual((yield* Fiber.join(got)).count, 6)
      assert.deepStrictEqual(t.fetches, [])
      assert.strictEqual(t.peek("1"), "Ann:6 patched")
      // The run succeeds: the patch is held through the confirming fetch.
      run.finish({ exit: "success", invalidates: [] })
      assert.deepStrictEqual(triggers(t.fetches), ["visibility"])
      yield* advance(5)
      // Through the confirming refetch both bits are true.
      assert.strictEqual(t.peek("1"), "Ann:6 patched waiting")
      yield* advance(5)
      assert.deepStrictEqual(a.seen, ["Ann:5", "Ann:6 patched", "Ann:6 patched waiting", "Ann:6"])
      assert.strictEqual(t.cache.inspect(t.GetUser, { id: "1" }).patches, 0)
      assert.isFalse(t.cache.isPatched(t.GetUser, { id: "1" }))
    }))

  it.effect("a failed run removes its patch at once, a stopped one invalidates nothing", () =>
    Effect.gen(function*() {
      const t = yield* setup({ staleTime: "Infinity" })
      const a = t.watch("1")
      yield* advance(10)
      t.fetches.length = 0
      const rename = (name: string) => t.GetUser.patch({ id: "1" }, (user) => ({ ...user, name }))
      const stopped = t.cache.beginRun([rename("Zed")])
      stopped.finish({ exit: "stopped" })
      assert.deepStrictEqual(a.seen, ["Ann:5", "Zed:5 patched", "Ann:5"])
      assert.deepStrictEqual(t.fetches, [])
      const failed = t.cache.beginRun([rename("Zed")])
      failed.start()
      failed.finish({ exit: "failure" })
      // The patch is gone and the patched entry is invalidated without being listed.
      assert.deepStrictEqual(a.seen, ["Ann:5", "Zed:5 patched", "Ann:5", "Zed:5 patched", "Ann:5 waiting"])
      assert.deepStrictEqual(triggers(t.fetches), ["invalidation"])
      yield* advance(10)
      assert.strictEqual(a.seen.at(-1), "Ann:5")
      // All-or-nothing: a throwing patch registers nothing.
      assert.throws(() =>
        t.cache.beginRun([
          rename("Zed"),
          t.GetUser.patch({ id: "1" }, () => {
            throw new Error("bad patch")
          })
        ])
      )
      assert.strictEqual(t.cache.inspect(t.GetUser, { id: "1" }).patches, 0)
      // No Success, no patch.
      t.cache.beginRun([t.GetUser.patch({ id: "cold" }, (user) => user)])
      assert.isFalse(t.cache.inspect(t.GetUser, { id: "cold" }).exists)
    }))

  it.effect("two queued saves of one field never flash the first", () =>
    Effect.gen(function*() {
      const t = yield* setup({ staleTime: "30 seconds" })
      const a = t.watch("1")
      yield* advance(10)
      t.fetches.length = 0
      const rename = (name: string) => t.GetUser.patch({ id: "1" }, (user) => ({ ...user, name }))
      const invalidates = [t.GetUser.entry({ id: "1" })]
      const first = t.cache.beginRun([rename("A")])
      first.start()
      const second = t.cache.beginRun([rename("B")])
      // The first lands. Its refetch waits for the second, and its patch is held under it.
      t.db.user.name = "A"
      first.finish({ exit: "success", invalidates })
      yield* advance(20)
      assert.deepStrictEqual(t.fetches, [])
      second.start()
      t.db.user.name = "B"
      second.finish({ exit: "success", invalidates })
      assert.deepStrictEqual(triggers(t.fetches), ["invalidation"])
      yield* advance(10)
      assert.deepStrictEqual(a.seen, ["Ann:5", "A:5 patched", "B:5 patched", "B:5 patched waiting", "B:5"])
      assert.strictEqual(t.db.calls, 2)
    }))

  it.effect("two concurrent renames answered out of order settle on the server's value", () =>
    Effect.gen(function*() {
      const t = yield* setup({ staleTime: "30 seconds" })
      const a = t.watch("1")
      yield* advance(10)
      t.fetches.length = 0
      const rename = (name: string) => t.GetUser.patch({ id: "1" }, (user) => ({ ...user, name }))
      const invalidates = [t.GetUser.entry({ id: "1" })]
      const first = t.cache.beginRun([rename("A")])
      first.start()
      const second = t.cache.beginRun([rename("B")])
      second.start()
      // The server applied B and then A, and answers B first.
      t.db.user.name = "A"
      second.finish({ exit: "success", invalidates })
      yield* advance(20)
      assert.deepStrictEqual(t.fetches, [])
      assert.strictEqual(t.peek("1"), "B:5 patched")
      first.finish({ exit: "success", invalidates })
      yield* advance(10)
      assert.deepStrictEqual(a.seen, ["Ann:5", "A:5 patched", "B:5 patched", "B:5 patched waiting", "A:5"])
      assert.deepStrictEqual(triggers(t.fetches), ["invalidation"])
    }))

  it.effect("writes are stored fresh, or stale when something else hit the entry", () =>
    Effect.gen(function*() {
      const t = yield* setup({ staleTime: "30 seconds" })
      const a = t.watch("1")
      yield* advance(10)
      t.fetches.length = 0
      const target = { id: "1" }
      const write = (name: string) => [t.GetUser.set(target, { id: "1", name, count: 5 })]
      // Fresh: stored, and not refetched by the run's own invalidation.
      const first = t.cache.beginRun()
      first.start()
      first.finish({ exit: "success", invalidates: [t.GetUser], writes: write("W1") })
      yield* advance(20)
      assert.deepStrictEqual(a.seen, ["Ann:5", "W1:5"])
      assert.deepStrictEqual(t.fetches, [])
      assert.isFalse(t.cache.inspect(t.GetUser, target).stale)

      // Stale: another invalidation hit the entry while the run was going.
      a.handle.unregister()
      const second = t.cache.beginRun()
      second.start()
      t.cache.applyInvalidation([t.GetUser])
      second.finish({ exit: "success", invalidates: [], writes: write("W2") })
      assert.strictEqual(show(t.cache.peek(t.GetUser, target)), "W2:5")
      assert.isTrue(t.cache.inspect(t.GetUser, target).stale)

      // Under another run's live patch: not stored, and the entry goes stale.
      const third = t.cache.beginRun()
      third.start()
      const other = t.cache.beginRun([t.GetUser.patch(target, (user) => ({ ...user, count: 9 }))])
      third.finish({ exit: "success", invalidates: [], writes: write("W3") })
      assert.strictEqual(t.peek("1"), "W2:9 patched")
      other.finish({ exit: "stopped" })
      assert.strictEqual(show(t.cache.peek(t.GetUser, target)), "W2:5")

      // A write creates a cold entry.
      const fourth = t.cache.beginRun()
      fourth.finish({ exit: "success", writes: [t.GetUser.set({ id: "new" }, { id: "new", name: "New", count: 0 })] })
      assert.strictEqual(show(t.cache.peek(t.GetUser, { id: "new" })), "New:0")
      assert.isFalse(t.cache.inspect(t.GetUser, { id: "new" }).stale)
    }))

  it.effect("fetches belong to the Layer build that asked", () =>
    Effect.gen(function*() {
      const t = yield* setup({ staleTime: "30 seconds" })
      const scopeA = yield* Scope.make()
      const fetcherA = Context.get(yield* Layer.buildWithScope(t.GetUser.layer, scopeA), t.GetUser)
      const seenA: Array<string> = []
      const a = t.cache.watch(t.GetUser, { id: "1" }, fetcherA, (result) => seenA.push(show(result)))
      yield* flush
      // The last watcher leaves: the fetch carries on while its build lives, and is stored.
      a.unregister()
      yield* advance(10)
      assert.strictEqual(show(t.cache.peek(t.GetUser, { id: "1" })), "Ann:5")

      // The build closes mid-fetch with a surviving watcher of another build: restart under it.
      t.fetches.length = 0
      const a2 = t.cache.watch(t.GetUser, { id: "2" }, fetcherA, () => {})
      const b = t.watch("2")
      yield* advance(5)
      yield* Scope.close(scopeA, Exit.void)
      assert.deepStrictEqual(triggers(t.fetches), ["watch", "watch restart"])
      a2.unregister()
      yield* advance(10)
      assert.deepStrictEqual(b.seen, ["Ann:5"])

      // With no survivor a cold entry is removed.
      const scopeC = yield* Scope.make()
      const fetcherC = Context.get(yield* Layer.buildWithScope(t.GetUser.layer, scopeC), t.GetUser)
      const c = t.cache.watch(t.GetUser, { id: "3" }, fetcherC, () => {})
      yield* advance(5)
      c.unregister()
      assert.isTrue(t.cache.isFetching())
      yield* Scope.close(scopeC, Exit.void)
      assert.isFalse(t.cache.isFetching())
      assert.isFalse(t.cache.inspect(t.GetUser, { id: "3" }).exists)
    }))

  it.effect("changes is a watcher", () =>
    Effect.gen(function*() {
      const t = yield* setup({ staleTime: "30 seconds" })
      const seen: Array<string> = []
      const fiber = yield* Effect.forkChild(
        t.provide(Stream.runForEach(t.GetUser.changes({ id: "1" }), (result) =>
          Effect.sync(() => {
            seen.push(show(result))
          })))
      )
      yield* flush
      assert.strictEqual(t.cache.inspect(t.GetUser, { id: "1" }).watchers, 1)
      yield* advance(10)
      const run = t.cache.beginRun([t.GetUser.patch({ id: "1" }, (user) => ({ ...user, name: "Bob" }))])
      yield* flush
      run.finish({ exit: "stopped" })
      yield* flush
      // The Stream carries the AsyncResult only: the patch shows as a value, not as waiting.
      assert.deepStrictEqual(seen, ["Ann:5", "Bob:5", "Ann:5"])
      yield* Fiber.interrupt(fiber)
      assert.strictEqual(t.cache.inspect(t.GetUser, { id: "1" }).watchers, 0)
    }))

  it.effect("dehydrate, hydrate and the fetch-free window", () =>
    Effect.gen(function*() {
      // The server: a per-request cache.
      const server = yield* setup({ staleTime: 0 }, { settleOnce: true })
      const s1 = server.watch("1")
      const failed = yield* Effect.forkChild(Effect.exit(server.provide(server.GetUser.get({ id: "404" }))))
      yield* advance(10)
      yield* Fiber.join(failed)
      assert.deepStrictEqual(s1.seen, ["Ann:5"])
      // Settle-once: no refetch at staleTime 0, and invalidate is a no-op.
      s1.handle.unregister()
      const s2 = server.watch("1")
      server.cache.applyInvalidation([])
      yield* advance(10)
      assert.strictEqual(server.db.calls, 2)
      assert.deepStrictEqual(s2.seen, ["Ann:5"])
      // A fetch in flight at finish is interrupted and not shipped.
      server.watch("slow")
      yield* flush
      assert.isTrue(server.cache.isFetching())
      const wire = JSON.parse(JSON.stringify(server.cache.dehydrate()))
      assert.isFalse(server.cache.isFetching())
      assert.deepStrictEqual(Object.keys(wire), ["users/GetUser"])
      assert.deepStrictEqual(wire["users/GetUser"].map((tuple: any) => tuple.slice(0, 3)), [
        ["{\"id\":\"1\"}", 0, { id: "1", name: "Ann", count: 5 }],
        ["{\"id\":\"404\"}", 1, ["nope"]]
      ])

      // The client.
      const client = yield* setup({ staleTime: 0 })
      client.db.user.name = "Bob"
      client.cache.hydrate({ nonsense: 1 })
      assert.isFalse(client.cache.isWindowOpen())
      client.cache.hydrate(wire)
      assert.isTrue(client.cache.isWindowOpen())
      // Inside the window a zero-to-one watch and a get don't fetch, even at staleTime 0 or on a Failure.
      const c1 = client.watch("1")
      const c404 = client.watch("404")
      assert.strictEqual((yield* client.provide(client.GetUser.get({ id: "1" }))).name, "Ann")
      yield* advance(20)
      assert.deepStrictEqual(c1.seen, ["Ann:5"])
      assert.deepStrictEqual(c404.seen, ["Failure(nope)"])
      assert.deepStrictEqual(client.fetches, [])
      // Invalidation still fetches inside the window.
      client.cache.applyInvalidation([client.GetUser.entry({ id: "1" })])
      yield* advance(10)
      assert.deepStrictEqual(c1.seen, ["Ann:5", "Ann:5 waiting", "Bob:5"])
      // Closing drops unwatched hydrated Failures; after it the entry is ordinary.
      c404.handle.unregister()
      assert.isTrue(client.cache.inspect(client.GetUser, { id: "404" }).exists)
      client.cache.closeWindow()
      assert.isFalse(client.cache.inspect(client.GetUser, { id: "404" }).exists)
      c1.handle.unregister()
      client.watch("1")
      assert.deepStrictEqual(triggers(client.fetches), ["invalidation", "watch"])

      // Static HTML: unknown age, no window. A finite staleTime refetches once.
      const fresh = yield* setup({ staleTime: "30 seconds" })
      fresh.cache.hydrate(wire, { static: true })
      assert.isFalse(fresh.cache.isWindowOpen())
      const f1 = fresh.watch("1")
      yield* flush
      assert.deepStrictEqual(f1.seen, ["Ann:5 waiting"])
      assert.deepStrictEqual(triggers(fresh.fetches), ["watch"])
      const forever = yield* setup({ staleTime: "Infinity" })
      forever.cache.hydrate(wire, { static: true })
      forever.watch("1")
      yield* flush
      assert.deepStrictEqual(forever.fetches, [])
    }))

  it.effect("budget zero starts no fetch, and a get waits until dehydrate", () =>
    Effect.gen(function*() {
      const t = yield* setup({ staleTime: 0 }, { settleOnce: true, noFetch: true })
      t.watch("1")
      const fiber = yield* Effect.forkChild(Effect.exit(t.provide(t.GetUser.get({ id: "1" }))))
      yield* advance(20)
      assert.strictEqual(t.db.calls, 0)
      assert.isFalse(t.cache.isFetching())
      assert.deepStrictEqual(t.cache.dehydrate(), {})
      const exit = yield* Fiber.join(fiber)
      assert.isTrue(Exit.isFailure(exit) && Cause.hasInterruptsOnly(exit.cause))
    }))

  it.effect("awaitIdle resumes when the last fetch settles", () =>
    Effect.gen(function*() {
      const t = yield* setup({ staleTime: 0 })
      const done = yield* Deferred.make<void>()
      t.watch("1")
      yield* Effect.forkChild(Effect.andThen(t.cache.awaitIdle, Deferred.succeed(done, undefined)))
      yield* flush
      assert.isFalse(yield* Deferred.isDone(done))
      yield* advance(10)
      assert.isTrue(yield* Deferred.isDone(done))
    }))

  // ---------------------------------------------------------------------------
  // EFF-3558 resolution: decisions 2, 7, 8, 9, 10, 11, 12 (core half)
  // ---------------------------------------------------------------------------

  it.effect("#2 emitInitial false: never a callback for the state at registration, nothing pending", () =>
    Effect.gen(function*() {
      const t = yield* setup({ staleTime: "30 seconds" })
      const sync = { emitInitial: false } as const
      // Cold: the sync read is Initial, and the first callback is the settle.
      const a = t.watch("1", sync)
      assert.strictEqual(a.current(), "Initial waiting")
      yield* advance(10)
      assert.deepStrictEqual(a.seen, ["Ann:5"])
      // Warm: the value is there synchronously and no emission follows.
      const b = t.watch("1", sync)
      assert.strictEqual(b.current(), "Ann:5")
      yield* advance(20)
      assert.deepStrictEqual(b.seen, [])
      // Later changes do call back.
      t.cache.applyInvalidation([t.GetUser])
      assert.deepStrictEqual(b.seen, ["Ann:5 waiting"])
      yield* advance(10)
      assert.deepStrictEqual(b.seen, ["Ann:5 waiting", "Ann:5"])
      // Zero-to-one over a stale entry: registration starts the fetch, so the
      // state at registration is already waiting and isn't called back.
      a.handle.unregister()
      b.handle.unregister()
      yield* advance("31 seconds")
      const c = t.watch("1", sync)
      assert.strictEqual(c.current(), "Ann:5 waiting")
      yield* flush
      assert.deepStrictEqual(c.seen, [])
      yield* advance(10)
      assert.deepStrictEqual(c.seen, ["Ann:5"])
      // Registered under a live patch: "last" starts at the patched view.
      const run = t.cache.beginRun([t.GetUser.patch({ id: "1" }, (user) => ({ ...user, name: "Bob" }))])
      const d = t.watch("1", sync)
      assert.strictEqual(d.current(), "Bob:5 patched")
      yield* flush
      assert.deepStrictEqual(d.seen, [])
      run.finish({ exit: "stopped" })
      assert.deepStrictEqual(d.seen, ["Ann:5"])
      // The default is still the deferred first emission (until the runtime is rewired).
      const e = t.watch("1")
      assert.deepStrictEqual(e.seen, [])
      yield* flush
      assert.deepStrictEqual(e.seen, ["Ann:5"])
    }))

  it.effect("#2 changes still starts with the current settled state", () =>
    Effect.gen(function*() {
      const t = yield* setup({ staleTime: "30 seconds" })
      t.watch("1")
      yield* advance(10)
      const first = yield* t.provide(Stream.runHead(t.GetUser.changes({ id: "1" })))
      assert.strictEqual(show(Option.getOrThrow(first)), "Ann:5")
      // Cold: nothing until the settle, then the value.
      const cold = yield* Effect.forkChild(t.provide(Stream.runHead(t.GetUser.changes({ id: "2" }))))
      yield* advance(10)
      assert.strictEqual(show(Option.getOrThrow(yield* Fiber.join(cold))), "Ann:5")
    }))

  it.effect("#7 waiting and patched are separate bits, and a patched flip alone emits", () =>
    Effect.gen(function*() {
      const t = yield* setup({ staleTime: "Infinity" })
      const a = t.watch("1", { emitInitial: false })
      yield* advance(10)
      assert.deepStrictEqual(a.seen, ["Ann:5"])
      const target = { id: "1" }
      // A patch that changes nothing in the value: only the bit flips.
      const same = t.cache.beginRun([t.GetUser.patch(target, (user) => ({ ...user }))])
      assert.deepStrictEqual(a.seen, ["Ann:5", "Ann:5 patched"])
      assert.isFalse(a.handle.current().waiting)
      assert.isTrue(a.handle.patched())
      assert.isTrue(t.cache.isPatched(t.GetUser, target))
      assert.isFalse(t.cache.isFetching())
      // Held through the confirming refetch: both.
      same.start()
      same.finish({ exit: "success" })
      assert.deepStrictEqual(a.seen, ["Ann:5", "Ann:5 patched", "Ann:5 patched waiting"])
      assert.isTrue(a.handle.current().waiting)
      assert.isTrue(a.handle.patched())
      yield* advance(10)
      assert.strictEqual(a.seen.at(-1), "Ann:5")
      assert.isFalse(a.handle.patched())
      // A plain refetch is waiting only.
      t.cache.applyInvalidation([t.GetUser])
      assert.strictEqual(a.seen.at(-1), "Ann:5 waiting")
      assert.isFalse(a.handle.patched())
      // Nothing there: not patched.
      assert.isFalse(t.cache.isPatched(t.GetUser, { id: "cold" }))
    }))

  it.effect("#8 seed stores a stale Success over a cold entry only", () =>
    Effect.gen(function*() {
      const t = yield* setup({ staleTime: "30 seconds" })
      const target = { id: "1" }
      const seeded = { id: "1", name: "Seed", count: 1 }
      assert.isTrue(t.cache.seed(t.GetUser, target, seeded, { timestamp: 123 }))
      assert.strictEqual(t.peek("1"), "Seed:1")
      assert.isTrue(t.cache.inspect(t.GetUser, target).stale)
      const peeked = t.cache.peek(t.GetUser, target)
      assert.isTrue(AsyncResult.isSuccess(peeked) && peeked.timestamp === 123)
      // Seeding starts nothing.
      assert.deepStrictEqual(t.fetches, [])
      // Never overwrites: not a seed, not a fetched value, not a Failure.
      assert.isFalse(t.cache.seed(t.GetUser, target, { ...seeded, name: "Other" }))
      assert.strictEqual(t.peek("1"), "Seed:1")
      // The first frame is the seed, waiting; a failed refetch keeps it as previousSuccess.
      t.db.fail = true
      const a = t.watch("1", { emitInitial: false })
      assert.strictEqual(a.current(), "Seed:1 waiting")
      assert.deepStrictEqual(triggers(t.fetches), ["watch"])
      yield* advance(10)
      assert.deepStrictEqual(a.seen, ["Failure(nope) previous"])
      const failed = a.handle.current()
      assert.isTrue(
        AsyncResult.isFailure(failed) && Option.isSome(failed.previousSuccess) &&
          failed.previousSuccess.value.value.name === "Seed"
      )
      assert.isFalse(t.cache.seed(t.GetUser, target, seeded))
      // Over a fetched Success.
      t.db.fail = false
      const b = t.watch("2", { emitInitial: false })
      // Cold with a fetch in flight still counts as cold: watchers get the seed, waiting.
      assert.isTrue(t.cache.seed(t.GetUser, { id: "2" }, { id: "2", name: "Seed", count: 2 }))
      assert.deepStrictEqual(b.seen, ["Seed:2 waiting"])
      yield* advance(10)
      assert.deepStrictEqual(b.seen, ["Seed:2 waiting", "Ann:5"])
      assert.isFalse(t.cache.seed(t.GetUser, { id: "2" }, { id: "2", name: "Seed", count: 2 }))
      assert.strictEqual(t.peek("2"), "Ann:5")
      // An unwatched seed is collected like any entry.
      assert.isTrue(t.cache.seed(t.GetUser, { id: "3" }, { id: "3", name: "Seed", count: 3 }))
      yield* advance("5 minutes")
      assert.isFalse(t.cache.inspect(t.GetUser, { id: "3" }).exists)
    }))

  it.effect("#8 seed doesn't overwrite a hydrated entry", () =>
    Effect.gen(function*() {
      const server = yield* setup({ staleTime: 0 }, { settleOnce: true })
      server.watch("1")
      yield* advance(10)
      const wire = JSON.parse(JSON.stringify(server.cache.dehydrate()))
      // A per-request cache never seeds.
      assert.isFalse(server.cache.seed(server.GetUser, { id: "9" }, { id: "9", name: "Seed", count: 0 }))
      const client = yield* setup({ staleTime: 0 })
      client.cache.hydrate(wire)
      assert.isFalse(client.cache.seed(client.GetUser, { id: "1" }, { id: "1", name: "Seed", count: 0 }))
      assert.strictEqual(client.peek("1"), "Ann:5")
    }))

  it.effect("#9 two concurrent renames answered out of order never store or show the older answer", () =>
    Effect.gen(function*() {
      const older = (seen: ReadonlyArray<string>) => seen.filter((s) => s.startsWith("A:") && !s.includes("patched"))
      const target = { id: "1" }

      // Writes only.
      const t = yield* setup({ staleTime: "30 seconds" })
      const write = (name: string) => [t.GetUser.set(target, { id: "1", name, count: 5 })]
      const a = t.watch("1", { emitInitial: false })
      yield* advance(10)
      t.fetches.length = 0
      const first = t.cache.beginRun()
      first.start()
      const second = t.cache.beginRun()
      second.start()
      // The server applied A and then B, and answers B first.
      t.db.user.name = "B"
      second.finish({ exit: "success", writes: write("B") })
      assert.deepStrictEqual(a.seen, ["Ann:5", "B:5"])
      assert.isFalse(t.cache.inspect(t.GetUser, target).stale)
      first.finish({ exit: "success", writes: write("A") })
      // Not stored. The skipped write still says the server changed: the entry is stale and refetches.
      assert.strictEqual(t.peek("1"), "B:5 waiting")
      assert.deepStrictEqual(triggers(t.fetches), ["invalidation"])
      yield* advance(10)
      assert.deepStrictEqual(a.seen, ["Ann:5", "B:5", "B:5 waiting", "B:5"])
      assert.deepStrictEqual(older(a.seen), [])

      // Unwatched: skipped, stale, no fetch.
      a.handle.unregister()
      t.fetches.length = 0
      const third = t.cache.beginRun()
      third.start()
      const fourth = t.cache.beginRun()
      fourth.start()
      fourth.finish({ exit: "success", writes: write("D") })
      third.finish({ exit: "success", writes: write("A") })
      assert.strictEqual(t.peek("1"), "D:5")
      assert.isTrue(t.cache.inspect(t.GetUser, target).stale)
      assert.deepStrictEqual(t.fetches, [])
      // Issued and answered in order: both are stored.
      const fifth = t.cache.beginRun()
      fifth.start()
      fifth.finish({ exit: "success", writes: write("E") })
      assert.strictEqual(t.peek("1"), "E:5")

      // With optimistic patches as well (the prototype app's case, F-P4).
      const p = yield* setup({ staleTime: "30 seconds" })
      const b = p.watch("1", { emitInitial: false })
      yield* advance(10)
      p.fetches.length = 0
      const rename = (name: string) => p.GetUser.patch(target, (user) => ({ ...user, name }))
      const set = (name: string) => [p.GetUser.set(target, { id: "1", name, count: 5 })]
      const one = p.cache.beginRun([rename("A")])
      one.start()
      const two = p.cache.beginRun([rename("B")])
      two.start()
      p.db.user.name = "B"
      two.finish({ exit: "success", writes: set("B") })
      assert.strictEqual(p.peek("1"), "B:5 patched")
      one.finish({ exit: "success", writes: set("A") })
      assert.strictEqual(p.peek("1"), "B:5 patched waiting")
      yield* advance(10)
      assert.deepStrictEqual(b.seen, ["Ann:5", "A:5 patched", "B:5 patched", "B:5 patched waiting", "B:5"])
      assert.deepStrictEqual(older(b.seen), [])
      assert.deepStrictEqual(triggers(p.fetches), ["invalidation"])
    }))

  it.effect("#9 a save racing a plain invalidation still stores its write, stale", () =>
    Effect.gen(function*() {
      const t = yield* setup({ staleTime: "30 seconds" })
      const target = { id: "1" }
      const a = t.watch("1", { emitInitial: false })
      yield* advance(10)
      t.fetches.length = 0
      const save = t.cache.beginRun()
      save.start()
      // Not a run: it has no issue order, so it can't make the write "older".
      yield* t.provide(t.GetUser.invalidate(target))
      t.db.user.name = "Saved"
      save.finish({ exit: "success", writes: [t.GetUser.set(target, { id: "1", name: "Saved", count: 5 })] })
      // Stored, stale, and the invalidation's fetch is restarted so it can't land older data.
      assert.strictEqual(t.peek("1"), "Saved:5 waiting")
      assert.isTrue(t.cache.inspect(t.GetUser, target).stale)
      assert.deepStrictEqual(triggers(t.fetches), ["invalidation", "invalidation restart"])
      yield* advance(10)
      assert.deepStrictEqual(a.seen, ["Ann:5", "Ann:5 waiting", "Saved:5 waiting", "Saved:5"])
      // The same with a later run's failure: a failed run doesn't count as having reached the entry.
      const early = t.cache.beginRun()
      early.start()
      const late = t.cache.beginRun()
      late.start()
      late.finish({ exit: "failure", invalidates: [t.GetUser.entry(target)] })
      early.finish({ exit: "success", writes: [t.GetUser.set(target, { id: "1", name: "Early", count: 5 })] })
      assert.strictEqual(t.peek("1"), "Early:5 waiting")
    }))

  it.effect("#10 a held patch on an unwatched entry stays until a fetch settles, a write or collection", () =>
    Effect.gen(function*() {
      const t = yield* setup({ staleTime: "30 seconds", idleTimeToLive: "1 minute" })
      const target = { id: "1" }
      const rename = (name: string) => t.GetUser.patch(target, (user) => ({ ...user, name }))
      const a = t.watch("1", { emitInitial: false })
      yield* advance(10)
      a.handle.unregister()
      t.fetches.length = 0
      // Rename on another page, with nobody watching this entry.
      const run = t.cache.beginRun([rename("Bob")])
      run.start()
      t.db.user.name = "Bob"
      run.finish({ exit: "success" })
      assert.strictEqual(t.peek("1"), "Bob:5 patched")
      yield* advance(20)
      assert.strictEqual(t.peek("1"), "Bob:5 patched")
      assert.deepStrictEqual(t.fetches, [])
      // Going back: the first frame has the new name, and the refetch confirms it.
      const b = t.watch("1", { emitInitial: false })
      assert.strictEqual(b.current(), "Bob:5 patched waiting")
      yield* advance(10)
      assert.deepStrictEqual(b.seen, ["Bob:5"])
      assert.strictEqual(t.cache.inspect(t.GetUser, target).patches, 0)
      b.handle.unregister()

      // A fetch that is interrupted has not settled: the patch stays.
      const second = t.cache.beginRun([rename("Cid")])
      second.start()
      second.finish({ exit: "success" })
      const scope = yield* Scope.make()
      const other = Context.get(yield* Layer.buildWithScope(t.GetUser.layer, scope), t.GetUser)
      t.cache.prefetch(t.GetUser, target, other)
      yield* flush
      assert.strictEqual(t.peek("1"), "Cid:5 patched waiting")
      yield* Scope.close(scope, Exit.void)
      assert.strictEqual(t.peek("1"), "Cid:5 patched")
      // A stored write drops it.
      const third = t.cache.beginRun()
      third.start()
      third.finish({ exit: "success", writes: [t.GetUser.set(target, { id: "1", name: "Dee", count: 5 })] })
      assert.strictEqual(t.peek("1"), "Dee:5")

      // It doesn't block idle collection. A live patch does.
      const fourth = t.cache.beginRun([rename("Eve")])
      fourth.start()
      yield* advance("2 minutes")
      assert.isTrue(t.cache.inspect(t.GetUser, target).exists)
      fourth.finish({ exit: "success" })
      assert.strictEqual(t.peek("1"), "Eve:5 patched")
      yield* advance("59 seconds")
      assert.isTrue(t.cache.inspect(t.GetUser, target).exists)
      yield* advance("2 seconds")
      assert.isFalse(t.cache.inspect(t.GetUser, target).exists)
      assert.strictEqual(t.peek("1"), "Initial")
    }))

  it.effect("#11 the args key is canonical JSON, and a non-JSON leaf throws", () =>
    Effect.gen(function*() {
      const make = <S extends Schema.Codec<any, any>>(name: string, args: S) =>
        class extends Loader.Service<any>()(
          name,
          { args, success: Schema.String, error: Schema.Never, staleTime: 0 },
          Effect.succeed(() => Effect.succeed(""))
        ) {}
      const Wide = make(
        "keys/Wide",
        Schema.Struct({
          b: Schema.Number,
          a: Schema.String,
          n: Schema.FiniteFromString,
          list: Schema.Array(Schema.Struct({ z: Schema.Boolean, y: Schema.NullOr(Schema.String) })),
          skip: Schema.optional(Schema.String)
        })
      )
      const key = Wide.entry({ b: -0, a: "x\"y", n: 7, list: [{ z: true, y: null }] }).argsKey
      assert.strictEqual(key, "{\"a\":\"x\\\"y\",\"b\":-0,\"list\":[{\"y\":null,\"z\":true}],\"n\":\"7\"}")
      // Parseable, and key order in the input doesn't matter.
      assert.deepStrictEqual(JSON.parse(key), { a: "x\"y", b: -0, list: [{ y: null, z: true }], n: "7" })
      assert.strictEqual(Wide.entry({ list: [{ y: null, z: true }], n: 7, a: "x\"y", b: -0 }).argsKey, key)
      assert.notStrictEqual(Wide.entry({ b: 0, a: "x\"y", n: 7, list: [{ z: true, y: null }] }).argsKey, key)
      // FINDING (not wanted, pinned so it is seen): the JSON codec encodes an explicit
      // "skip: undefined" as null, so it is a different key, and a different entry, from leaving it out.
      assert.strictEqual(
        Wide.entry({ b: -0, a: "x\"y", n: 7, list: [{ z: true, y: null }], skip: undefined }).argsKey,
        "{\"a\":\"x\\\"y\",\"b\":-0,\"list\":[{\"y\":null,\"z\":true}],\"n\":\"7\",\"skip\":null}"
      )
      // No args at all.
      assert.strictEqual(make("keys/None", Schema.Void).entry(undefined).argsKey, "null")
      // Schema.Number's JSON encoding turns NaN and Infinity into strings, so they are sound keys.
      const Num = make("keys/Num", Schema.Struct({ page: Schema.Number }))
      assert.strictEqual(Num.entry({ page: 1 }).argsKey, "{\"page\":1}")
      assert.strictEqual(Num.entry({ page: NaN }).argsKey, "{\"page\":\"NaN\"}")
      assert.strictEqual(Num.entry({ page: Infinity }).argsKey, "{\"page\":\"Infinity\"}")
      // A leaf JSON can't carry: only a Schema with no JSON encoding of its own lets one through.
      const Loose = make("keys/Loose", Schema.Any)
      assert.throws(() => Loose.entry(5n), /JSON can't carry/)
      assert.throws(() => Loose.entry({ page: NaN }), /JSON can't carry/)
      assert.throws(() => Loose.entry({ page: Infinity }), /JSON can't carry/)
      assert.throws(() => Loose.entry({ at: new Date(0) }), /JSON can't carry/)
      assert.throws(() => Loose.entry([undefined]), /JSON can't carry/)
      assert.throws(() => Loose.entry({ f: () => 1 }), /JSON can't carry/)
      // Every way in builds the key, so every way in throws.
      const t = yield* makeCache()
      assert.throws(() => t.cache.peek(Loose, { page: NaN }), /JSON can't carry/)
      assert.throws(() => t.cache.watch(Loose, { page: NaN }, () => Effect.succeed(""), () => {}), /JSON can't carry/)
    }))

  it.effect("#11 a hydrated entry has its args: patchAll, function refetchInterval and fetching", () =>
    Effect.gen(function*() {
      const calls: Array<unknown> = []
      const intervalArgs: Array<unknown> = []
      class Page extends Loader.Service<Page>()(
        "pages/Page",
        {
          // The encoded form differs from the type, so recovering needs the codec, not just JSON.parse.
          args: Schema.Struct({ page: Schema.FiniteFromString }),
          success: Schema.String,
          error: Schema.Never,
          staleTime: "Infinity",
          refetchInterval: (_result, args) => {
            intervalArgs.push(args)
            return "2 seconds"
          }
        },
        Effect.succeed((args) =>
          Effect.sync(() => {
            calls.push(args)
            return "page " + (args.page + 1)
          })
        )
      ) {}
      const server = yield* makeCache({ settleOnce: true })
      const serverFetcher = Context.get(yield* Layer.build(Page.layer), Page)
      server.cache.watch(Page, { page: 7 }, serverFetcher, () => {})
      yield* flush
      const wire = JSON.parse(JSON.stringify(server.cache.dehydrate()))
      assert.deepStrictEqual(wire["pages/Page"].map((tuple: any) => tuple.slice(0, 3)), [[
        "{\"page\":\"7\"}",
        0,
        "page 8"
      ]])

      const client = yield* makeCache()
      const fetcher = Context.get(yield* Layer.build(Page.layer), Page)
      client.cache.hydrate(wire)
      client.cache.register(Page)
      calls.length = 0
      intervalArgs.length = 0
      // patchAll reaches the entry before anyone has addressed it by args.
      const patchArgs: Array<unknown> = []
      const run = client.cache.beginRun([Page.patchAll((value, args) => {
        patchArgs.push(args)
        return value + " of " + args.page
      })])
      assert.deepStrictEqual(patchArgs[0], { page: 7 })
      assert.strictEqual(client.cache.inspect(Page, { page: 7 }).patches, 1)
      run.finish({ exit: "stopped" })
      // The entry keeps the args it recovered: the interval function and the fetcher get those, decoded.
      const mine = { page: 7 }
      client.cache.closeWindow()
      client.cache.watch(Page, mine, fetcher, () => {}, undefined, { emitInitial: false })
      assert.isTrue(intervalArgs.length > 0)
      assert.deepStrictEqual(intervalArgs[0], { page: 7 })
      assert.notStrictEqual(intervalArgs[0], mine)
      yield* advance("2 seconds")
      assert.deepStrictEqual(calls, [{ page: 7 }])
      assert.notStrictEqual(calls[0], mine)
      assert.deepStrictEqual(triggers(client.fetches), ["interval"])
    }))

  it.effect("#12 a reverted interval fetch re-arms its timer", () =>
    Effect.gen(function*() {
      // A defect: nothing is stored, the entry reverts.
      const t = yield* setup({ staleTime: "Infinity", refetchInterval: "2 seconds" })
      const a = t.watch("1", { emitInitial: false })
      yield* advance(10)
      assert.strictEqual(t.db.calls, 1)
      t.db.die = true
      yield* advance("2 seconds")
      yield* advance(10)
      assert.strictEqual(t.db.calls, 2)
      assert.strictEqual(a.defects.length, 1)
      assert.isFalse(t.cache.isFetching())
      // Polling goes on, counted from the revert.
      t.db.die = false
      t.db.user.name = "Bob"
      yield* advance("1 seconds")
      assert.strictEqual(t.db.calls, 2)
      yield* advance("1 seconds")
      yield* advance(10)
      assert.strictEqual(t.db.calls, 3)
      assert.strictEqual(a.seen.at(-1), "Bob:5")
      assert.deepStrictEqual(triggers(t.fetches), ["watch", "interval", "interval"])

      // An interrupt: the owning build closes with its watcher still registered.
      const u = yield* setup({ staleTime: "Infinity", refetchInterval: "2 seconds" })
      const scope = yield* Scope.make()
      const doomed = Context.get(yield* Layer.buildWithScope(u.GetUser.layer, scope), u.GetUser)
      const handle = u.cache.watch(u.GetUser, { id: "1" }, doomed, () => {}, undefined, { emitInitial: false })
      yield* advance(10)
      yield* advance("2 seconds")
      assert.isTrue(u.cache.isFetching())
      yield* Scope.close(scope, Exit.void)
      assert.isFalse(u.cache.isFetching())
      // Another instance, under a live build, joins: the re-armed timer fetches for it.
      const b = u.watch("1", { emitInitial: false })
      u.fetches.length = 0
      yield* advance("2 seconds")
      yield* advance(10)
      assert.deepStrictEqual(triggers(u.fetches), ["interval"])
      assert.strictEqual(b.seen.at(-1), "Ann:5")
      handle.unregister()
    }))

  it.effect("#6 a run may finish after everything that issued it is gone", () =>
    Effect.gen(function*() {
      const t = yield* setup({ staleTime: "30 seconds" })
      const target = { id: "1" }
      const a = t.watch("1", { emitInitial: false })
      yield* advance(10)
      const run = t.cache.beginRun([t.GetUser.patch(target, (user) => ({ ...user, name: "Bob" }))])
      run.start()
      // The instance closes: no watcher, no build of its own in play.
      a.handle.unregister()
      t.db.user.name = "Bob"
      run.finish({
        exit: "success",
        invalidates: [t.GetUser],
        writes: [t.GetUser.set({ id: "2" }, { id: "2", name: "Two", count: 0 })]
      })
      // Patch removal, writes and invalidation all reach the cache; nothing fetches with nobody watching.
      assert.strictEqual(t.peek("1"), "Bob:5 patched")
      assert.isTrue(t.cache.inspect(t.GetUser, target).stale)
      assert.strictEqual(t.peek("2"), "Two:0")
      assert.isFalse(t.cache.isFetching())
      // After the cache itself is disposed, finish is a no-op and throws nothing.
      const scope = yield* Scope.make()
      const gone = Loader.internals(Loader.makeCacheUnsafe({ scope }))
      const late = gone.beginRun()
      late.start()
      yield* Scope.close(scope, Exit.void)
      late.finish({
        exit: "success",
        invalidates: [t.GetUser],
        writes: [t.GetUser.set(target, { id: "1", name: "Late", count: 0 })]
      })
      assert.isFalse(gone.inspect(t.GetUser, target).exists)
    }))
})
