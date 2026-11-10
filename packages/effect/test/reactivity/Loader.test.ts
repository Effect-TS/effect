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
const show = (result: Seen): string =>
  AsyncResult.isSuccess(result)
    ? result.value.name + ":" + result.value.count + (result.waiting ? " waiting" : "")
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
  const watch = (id: string) => {
    const seen: Array<string> = []
    const defects: Array<unknown> = []
    const handle = made.cache.watch(
      users.GetUser,
      { id },
      fetcher,
      (result) => seen.push(show(result)),
      (cause) => defects.push(Cause.squash(cause))
    )
    return { seen, defects, handle }
  }
  return { ...users, ...made, fetcher, provide, watch }
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
      // The patch reaches the watcher synchronously, as waiting.
      assert.deepStrictEqual(a.seen, ["Ann:5", "Ann:6 waiting"])
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
      assert.strictEqual(show(t.cache.peek(t.GetUser, { id: "1" })), "Ann:6 waiting")
      // The run succeeds: the patch is held through the confirming fetch.
      run.finish({ exit: "success", invalidates: [] })
      assert.deepStrictEqual(triggers(t.fetches), ["visibility"])
      yield* advance(5)
      assert.strictEqual(show(t.cache.peek(t.GetUser, { id: "1" })), "Ann:6 waiting")
      yield* advance(5)
      assert.deepStrictEqual(a.seen, ["Ann:5", "Ann:6 waiting", "Ann:6"])
      assert.strictEqual(t.cache.inspect(t.GetUser, { id: "1" }).patches, 0)
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
      assert.deepStrictEqual(a.seen, ["Ann:5", "Zed:5 waiting", "Ann:5"])
      assert.deepStrictEqual(t.fetches, [])
      const failed = t.cache.beginRun([rename("Zed")])
      failed.start()
      failed.finish({ exit: "failure" })
      // The patch is gone and the patched entry is invalidated without being listed.
      assert.deepStrictEqual(a.seen, ["Ann:5", "Zed:5 waiting", "Ann:5", "Zed:5 waiting", "Ann:5 waiting"])
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
      assert.deepStrictEqual(a.seen, ["Ann:5", "A:5 waiting", "B:5 waiting", "B:5"])
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
      assert.strictEqual(show(t.cache.peek(t.GetUser, { id: "1" })), "B:5 waiting")
      first.finish({ exit: "success", invalidates })
      yield* advance(10)
      assert.deepStrictEqual(a.seen, ["Ann:5", "A:5 waiting", "B:5 waiting", "A:5"])
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
      assert.strictEqual(show(t.cache.peek(t.GetUser, target)), "W2:9 waiting")
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
      assert.deepStrictEqual(seen, ["Ann:5", "Bob:5 waiting", "Ann:5"])
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
})
