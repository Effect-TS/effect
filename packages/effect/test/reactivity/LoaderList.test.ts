import { assert, describe, it } from "@effect/vitest"
import { Cause, Effect, Exit, Fiber, Layer, Option, Schema, Scope, Stream } from "effect"
import type { Context, Duration } from "effect"
import { AsyncResult, Loader } from "effect/reactivity"
import { TestClock, TestLoader } from "effect/testing"

// A few macrotasks: lets every fiber the cache forked run, and whatever those fork in turn.
const flush = Effect.promise(async () => {
  for (let i = 0; i < 4; i++) await new Promise<void>((resolve) => setTimeout(resolve, 0))
})
const advance = (duration: Duration.Input) =>
  flush.pipe(Effect.andThen(TestClock.adjust(duration)), Effect.andThen(flush))

const Message = Schema.Struct({ id: Schema.String, text: Schema.String })
const Page = Schema.Struct({ messages: Schema.Array(Message), next: Schema.NullOr(Schema.Number) })
type Page = typeof Page.Type

// A list of `db.length` pages whose fetcher takes `db.delay` ms a page. A message's text carries `db.version` at
// the request, so a walk is told apart from the pages it replaces.
const makeList = (options: {
  readonly staleTime?: Duration.Input
  readonly refetchInterval?: Duration.Input
  readonly next?: (lastPage: Page, allPages: ReadonlyArray<Page>) => Option.Option<number>
} = {}) => {
  const db = {
    length: 3,
    delay: 10,
    version: "a",
    fail: new Set<number>(),
    page: (index: number): Page["messages"] => [{ id: "m" + index, text: db.version + index }]
  }
  class ListMessages extends Loader.ListService<ListMessages>()(
    "chat/ListMessages",
    {
      args: { room: Schema.String },
      page: Page,
      items: (page) => page.messages,
      key: (message) => message.id,
      error: Schema.String,
      cursor: Schema.Number,
      next: options.next ?? ((lastPage) => Option.fromNullishOr(lastPage.next)),
      staleTime: options.staleTime ?? "30 seconds",
      refetchInterval: options.refetchInterval
    },
    Effect.sync(() => (_args, cursor) =>
      Effect.gen(function*() {
        const index = Option.getOrElse(cursor, () => 0)
        const page = { messages: db.page(index), next: index + 1 < db.length ? index + 1 : null }
        if (db.delay > 0) yield* Effect.sleep(db.delay)
        if (db.fail.has(index)) return yield* Effect.fail("nope" + index)
        return page
      })
    )
  ) {}
  return { db, ListMessages, provide: Effect.provide(Layer.merge(ListMessages.layer, TestLoader.layer())) }
}

const room = { room: "r" }

const show = (result: AsyncResult.AsyncResult<ReadonlyArray<Page>, string>): string =>
  (AsyncResult.isSuccess(result)
    ? result.value.map((page) => page.messages.map((message) => message.text).join("+")).join(",")
    : AsyncResult.isFailure(result)
    ? "Failure(" + Option.getOrElse(Cause.findErrorOption(result.cause), () => "?") + ")" +
      (Option.isSome(result.previousSuccess) ? " over " + show(result.previousSuccess.value) : "")
    : "Initial") + (result.waiting ? " waiting" : "")

const watch = Effect.fnUntraced(function*<R>(
  changes: Stream.Stream<AsyncResult.AsyncResult<ReadonlyArray<Page>, string>, never, R>
) {
  const seen: Array<string> = []
  const fiber = yield* Effect.forkScoped(
    Stream.runForEach(changes, (result) => Effect.sync(() => seen.push(show(result))))
  )
  yield* flush
  return { seen, fiber }
})

// Each page requested: its trigger and index.
const pagesLog = Effect.map(
  TestLoader.fetches,
  (fetches) =>
    fetches.map((fetch) =>
      fetch.trigger + "@" + fetch.page + (fetch.restart ? " restart" : "") + (fetch.stored ? "" : " unstored")
    )
)

const moreOf = <R extends Loader.Read.Any>(read: R, args: Loader.Read.Args<R>) =>
  Effect.map(TestLoader.entry(read, args), (entry) => {
    const more = entry?.more
    return more?._tag === "Failed" ? "Failed(" + more.error + ")" : more?._tag
  })

describe("Loader lists", () => {
  it.effect("loadMore appends one page; during a walk it raises the walk's target, and get joins the walk", () => {
    const { ListMessages, db, provide } = makeList()
    return Effect.gen(function*() {
      const w = yield* watch(ListMessages.changes(room))
      yield* advance(10)
      assert.deepStrictEqual(w.seen, ["a0"])
      assert.strictEqual(yield* moreOf(ListMessages, room), "Available")
      const before = yield* ListMessages.peek(room)

      const append = yield* Effect.forkScoped(ListMessages.loadMore(room))
      yield* flush
      // An append doesn't make the pages waiting: `more` says it.
      assert.strictEqual(yield* moreOf(ListMessages, room), "Loading")
      yield* advance(10)
      const appended = yield* Fiber.join(append)
      assert.deepStrictEqual([appended.pages.length, appended.hasMore], [2, true])
      assert.deepStrictEqual(w.seen, ["a0", "a0,a1"])
      // An append changes no timestamp.
      const after = yield* ListMessages.peek(room)
      assert.isTrue(
        AsyncResult.isSuccess(before) && AsyncResult.isSuccess(after) && before.timestamp === after.timestamp
      )

      // A refetch walks from the first page, and swaps the pages in at the end.
      db.version = "b"
      yield* ListMessages.invalidate(room)
      yield* advance(5)
      const more = yield* Effect.forkScoped(ListMessages.loadMore(room))
      const get = yield* Effect.forkScoped(ListMessages.get(room))
      yield* flush
      assert.strictEqual(yield* moreOf(ListMessages, room), "Loading")
      yield* advance(30)
      assert.deepStrictEqual(w.seen, ["a0", "a0,a1", "a0,a1 waiting", "b0,b1,b2"])
      assert.deepStrictEqual((yield* Fiber.join(get)).length, 3)
      assert.deepStrictEqual((yield* Fiber.join(more)).hasMore, false)
      assert.strictEqual(yield* moreOf(ListMessages, room), "End")

      // At the end, a load more loads nothing.
      assert.deepStrictEqual((yield* ListMessages.loadMore(room)).pages.length, 3)
      assert.deepStrictEqual(yield* pagesLog, [
        "watch@0",
        "loadMore@1",
        "invalidation@0",
        "invalidation@1",
        "invalidation@2"
      ])
      assert.deepStrictEqual((yield* TestLoader.fetches).map((fetch) => fetch.cursor), [undefined, 1, undefined, 1, 2])
    }).pipe(provide)
  })

  it.effect("get, prefetch, connectivity and interval walk the held pages, and a patch issued mid-walk restarts it", () => {
    const { ListMessages, db, provide } = makeList({ staleTime: 0, refetchInterval: "1 minute" })
    return Effect.gen(function*() {
      yield* ListMessages.prefetch({ room: "p" })
      yield* advance(10)
      const w = yield* watch(ListMessages.changes(room))
      yield* advance(10)
      yield* Effect.forkScoped(ListMessages.loadMore(room))
      yield* advance(10)
      const get = yield* Effect.forkScoped(ListMessages.get(room))
      yield* advance(20)
      assert.strictEqual((yield* Fiber.join(get)).length, 2)
      yield* TestLoader.setOnline(false)
      yield* TestLoader.setOnline(true)
      yield* advance(20)
      yield* advance("1 minute")
      yield* advance(20)
      const before = (yield* TestLoader.fetches).length
      db.version = "b"
      yield* ListMessages.invalidate(room)
      yield* advance(5)
      const cache = Loader.internals(yield* Loader.Cache)
      const handle = cache.beginRun({
        command: "Edit",
        invalidates: [],
        optimistic: [ListMessages.patch(room, (page) => page)]
      })
      yield* advance(30)
      // Held while the patch is live.
      assert.strictEqual((yield* TestLoader.entry(ListMessages, room))?.fetch, "held")
      yield* Effect.forkScoped(handle.run(Effect.void, undefined))
      yield* advance(30)
      assert.deepStrictEqual((yield* pagesLog).slice(0, before), [
        "prefetch@0",
        "watch@0",
        "loadMore@1",
        "get@0",
        "get@1",
        "connectivity@0",
        "connectivity@1",
        "interval@0",
        "interval@1"
      ])
      // The walk under the patch stopped at its first page, and walks both from the first once the run exits.
      assert.deepStrictEqual((yield* pagesLog).slice(before), [
        "invalidation@0",
        "invalidation@0 restart",
        "invalidation@1"
      ])
      assert.strictEqual(w.seen.at(-1), "b0,b1")
    }).pipe(provide)
  })

  it.effect("a time trigger during an append runs as a walk when it ends; during a walk it is dropped", () => {
    const { ListMessages, db, provide } = makeList({ staleTime: 0 })
    return Effect.gen(function*() {
      const w = yield* watch(ListMessages.changes(room))
      yield* advance(10)
      yield* Effect.forkScoped(ListMessages.loadMore(room))
      yield* flush
      db.version = "b"
      yield* TestLoader.setVisible(false)
      yield* TestLoader.setVisible(true)
      yield* advance(10)
      // The walk runs now: one during it is dropped.
      yield* TestLoader.setVisible(false)
      yield* TestLoader.setVisible(true)
      yield* advance(20)
      assert.deepStrictEqual(w.seen, ["a0", "a0,a1 waiting", "b0,b1"])
      assert.deepStrictEqual(yield* pagesLog, ["watch@0", "loadMore@1", "visibility@0", "visibility@1"])
    }).pipe(provide)
  })

  it.effect("an invalidation and the build closing restart a walk from the first page, keeping its target and callers", () => {
    const { ListMessages, db } = makeList()
    return Effect.gen(function*() {
      const scopeA = yield* Scope.make()
      const scopeB = yield* Scope.make()
      const buildA = yield* Layer.buildWithScope(Layer.fresh(ListMessages.layer), scopeA)
      const buildB = yield* Layer.buildWithScope(Layer.fresh(ListMessages.layer), scopeB)
      const w = yield* watch(ListMessages.changes(room).pipe(Stream.provideContext(buildA)))
      yield* advance(10)
      yield* ListMessages.loadMore(room).pipe(Effect.provideContext(buildA), Effect.forkScoped)
      yield* advance(10)

      db.version = "b"
      yield* ListMessages.invalidate(room)
      yield* advance(15)
      yield* ListMessages.invalidate(room)
      const get = yield* Effect.forkScoped(ListMessages.get(room).pipe(Effect.provideContext(buildB)))
      yield* advance(15)
      // The watcher's build closes: the walk moves to the get caller's.
      yield* Scope.close(scopeA, Exit.void)
      yield* advance(20)
      assert.deepStrictEqual(w.seen, ["a0", "a0,a1", "a0,a1 waiting", "b0,b1"])
      assert.deepStrictEqual((yield* Fiber.join(get)).length, 2)
      assert.deepStrictEqual(yield* pagesLog, [
        "watch@0",
        "loadMore@1",
        "invalidation@0",
        "invalidation@1",
        "invalidation@0 restart",
        "invalidation@1",
        "invalidation@0 restart",
        "invalidation@1"
      ])
      yield* Scope.close(scopeB, Exit.void)
    }).pipe(Effect.provide(TestLoader.layer()))
  })

  it.effect("a Fail on a held page is a Failure over the held pages, and past them the pages swap in with an append error", () => {
    const { ListMessages, db, provide } = makeList()
    return Effect.gen(function*() {
      const w = yield* watch(ListMessages.changes(room))
      yield* advance(10)
      yield* Effect.forkScoped(ListMessages.loadMore(room))
      yield* advance(10)

      db.fail.add(1)
      yield* ListMessages.invalidate(room)
      yield* advance(20)
      assert.strictEqual(w.seen.at(-1), "Failure(nope1) over a0,a1")

      db.fail = new Set([2])
      db.version = "b"
      yield* ListMessages.invalidate(room)
      yield* advance(5)
      const more = yield* Effect.forkScoped(ListMessages.loadMore(room))
      yield* advance(30)
      assert.strictEqual(w.seen.at(-1), "b0,b1")
      assert.deepStrictEqual(yield* Fiber.await(more), Exit.fail("nope2"))
      assert.strictEqual(yield* moreOf(ListMessages, room), "Failed(nope2)")

      // A failed append keeps the pages. The next load more clears the error.
      const again = yield* Effect.forkScoped(ListMessages.loadMore(room))
      yield* flush
      assert.strictEqual(yield* moreOf(ListMessages, room), "Loading")
      yield* advance(10)
      assert.deepStrictEqual(yield* Fiber.await(again), Exit.fail("nope2"))
      assert.strictEqual(w.seen.at(-1), "b0,b1")
      db.fail.clear()
      yield* Effect.forkScoped(ListMessages.loadMore(room))
      yield* advance(10)
      assert.strictEqual(w.seen.at(-1), "b0,b1,b2")
      assert.strictEqual(yield* moreOf(ListMessages, room), "End")
    }).pipe(provide)
  })

  it.effect("reset drops the pages after the first, then walks one page", () => {
    const { ListMessages, db, provide } = makeList()
    return Effect.gen(function*() {
      const w = yield* watch(ListMessages.changes(room))
      yield* advance(10)
      yield* Effect.forkScoped(ListMessages.loadMore(room))
      yield* advance(10)
      db.version = "b"
      yield* ListMessages.reset(room)
      yield* advance(10)
      assert.deepStrictEqual(w.seen, ["a0", "a0,a1", "a0 waiting", "b0"])
      assert.deepStrictEqual(yield* pagesLog, ["watch@0", "loadMore@1", "reset@0"])
    }).pipe(provide)
  })

  it.effect("a live patch maps each page and holds a load more until its run exits", () => {
    const { ListMessages, db, provide } = makeList()
    return Effect.gen(function*() {
      yield* watch(ListMessages.changes(room))
      yield* advance(10)
      const cache = Loader.internals(yield* Loader.Cache)
      const handle = cache.beginRun({
        command: "Edit",
        invalidates: [ListMessages.entry(room)],
        optimistic: [
          ListMessages.patch(room, (page, index) => ({
            ...page,
            messages: page.messages.map((message) => ({ ...message, text: message.text + "!" + index }))
          }))
        ]
      })
      assert.strictEqual(show((yield* TestLoader.entry(ListMessages, room))!.view), "a0!0")

      const more = yield* Effect.forkScoped(ListMessages.loadMore(room))
      yield* advance(10)
      const held = yield* TestLoader.entry(ListMessages, room)
      assert.deepStrictEqual([held?.fetch, held?.more?._tag], ["held", "Loading"])

      db.version = "b"
      yield* Effect.forkScoped(handle.run(Effect.void, undefined))
      yield* advance(20)
      assert.deepStrictEqual((yield* Fiber.join(more)).pages.length, 2)
      assert.deepStrictEqual(yield* pagesLog, ["watch@0", "loadMore@0", "loadMore@1"])
    }).pipe(provide)
  })

  it.effect("a settle-once cache loads the first page only", () => {
    const { ListMessages, db } = makeList()
    db.delay = 0
    return Effect.gen(function*() {
      assert.deepStrictEqual((yield* ListMessages.get(room)).length, 1)
      const { hasMore, pages } = yield* ListMessages.loadMore(room)
      assert.deepStrictEqual([pages.length, hasMore], [1, true])
    }).pipe(Effect.provide(Layer.merge(ListMessages.layer, settleOnce)))
  })

  it.effect("items keeps the first item of a key, and a page holding one key twice is reported", () => {
    const { ListMessages, db, provide } = makeList()
    db.delay = 0
    return Effect.gen(function*() {
      db.length = 2
      db.page = (index) => [{ id: "m0", text: "x" + index }, { id: "m" + (index + 1), text: "y" + index }]
      yield* ListMessages.get(room)
      // Across two pages: left out silently.
      const pages = (yield* ListMessages.loadMore(room)).pages
      assert.deepStrictEqual(ListMessages.items(pages).map((message) => message.text), ["x0", "y0", "y1"])

      db.page = () => [{ id: "m9", text: "first" }, { id: "m9", text: "second" }]
      yield* ListMessages.reset(room)
      const reset = yield* ListMessages.get(room)
      assert.deepStrictEqual(ListMessages.items(reset).map((message) => message.text), ["first"])
      assert.strictEqual((yield* TestLoader.expectProblem("DuplicateKeyInPage")).length, 1)
    }).pipe(provide)
  })

  it.effect("a walk that gets a cursor again is reported once, and a next that throws mid-walk stores nothing", () => {
    let throws = false
    const { ListMessages, db, provide } = makeList({
      next: (_lastPage, allPages) => {
        if (throws && allPages.length === 2) throw new Error("next")
        return Option.some(1)
      }
    })
    db.delay = 0
    return Effect.gen(function*() {
      yield* ListMessages.get(room)
      yield* ListMessages.loadMore(room)
      yield* ListMessages.loadMore(room)
      // Each append is a walk of its own.
      assert.deepStrictEqual(yield* TestLoader.problems, [])
      yield* ListMessages.invalidate(room)
      assert.strictEqual((yield* ListMessages.get(room)).length, 3)
      assert.strictEqual((yield* TestLoader.expectProblem("PageRepeated")).length, 1)

      throws = true
      yield* ListMessages.invalidate(room)
      const exit = yield* Effect.exit(ListMessages.get(room))
      assert.isTrue(Exit.hasDies(exit))
      // The pages stay, stale.
      assert.strictEqual(show(yield* ListMessages.peek(room)), "a0,a1,a1")
      assert.isTrue((yield* TestLoader.entry(ListMessages, room))?.stale)
    }).pipe(provide)
  })
  it.effect("a restored snapshot seeds a cold list stale and walks its pages; a warm entry and a patched snapshot seed nothing", () => {
    const { ListMessages, db, provide } = makeList()
    return Effect.gen(function*() {
      const cache = yield* Loader.Cache
      const def = Loader.defOf(ListMessages)
      const pages = [{ messages: db.page(0), next: 1 }, { messages: db.page(1), next: 2 }]
      const snapshot = (patched: boolean) =>
        Loader.makeSnapshot(
          def,
          "messages",
          { args: room, argsKey: def.argsKey(room) },
          AsyncResult.success(pages, { timestamp: 0 }),
          patched,
          { _tag: "Available" }
        )
      // Under a patch: never seeded.
      assert.isFalse(Loader.internals(cache).seed(snapshot(true)))
      assert.isTrue(Loader.internals(cache).seed(snapshot(false)))
      // Warm now: the entry keeps its own pages.
      assert.isFalse(Loader.internals(cache).seed(snapshot(false)))
      db.version = "b"
      const w = yield* watch(ListMessages.changes(room))
      yield* advance(20)
      assert.deepStrictEqual(w.seen, ["a0,a1 waiting", "b0,b1"])
      assert.deepStrictEqual(yield* pagesLog, ["watch@0", "watch@1"])
    }).pipe(provide)
  })
  it.effect("a patch that drops a walk counts as a restart: ten in a row report FetchRestarted", () => {
    const { ListMessages, provide } = makeList()
    return Effect.gen(function*() {
      yield* watch(ListMessages.changes(room))
      yield* advance(10)
      const cache = Loader.internals(yield* Loader.Cache)
      yield* ListMessages.invalidate(room)
      for (let i = 0; i < 10; i++) {
        yield* advance(5)
        // Each patch drops the walk in flight, and the walk starts again from the first page when its run exits.
        const handle = cache.beginRun({
          command: "Edit",
          invalidates: [],
          optimistic: [ListMessages.patch(room, (page) => page)]
        })
        yield* Effect.forkScoped(handle.run(Effect.void, undefined))
        yield* flush
      }
      const problem = yield* TestLoader.expectProblem("FetchRestarted")
      assert.strictEqual(problem.length, 1)
      const log = (yield* pagesLog).slice(1)
      assert.deepStrictEqual(log, ["invalidation@0", ...Array.from({ length: 10 }, () => "invalidation@0 restart")])
      yield* advance(10)
      // The settle ends the streak.
      assert.deepStrictEqual((yield* TestLoader.entry(ListMessages, room))?.fetch, "none")
    }).pipe(provide)
  })

  it.effect("a run reading back a list it invalidates fails when a held page fails", () => {
    const { ListMessages, db, provide } = makeList()
    return Effect.gen(function*() {
      yield* watch(ListMessages.changes(room))
      yield* advance(10)
      yield* Effect.forkScoped(ListMessages.loadMore(room))
      yield* advance(10)
      db.fail.add(1)
      const cache = Loader.internals(yield* Loader.Cache)
      const handle = cache.beginRun({ command: "Edit", invalidates: [ListMessages.entry(room)] })
      const fiber = yield* Effect.forkScoped(Effect.exit(handle.run(ListMessages.get(room), undefined)))
      yield* advance(30)
      const exit = yield* Fiber.join(fiber)
      assert.isTrue(Exit.isFailure(exit))
      if (Exit.isFailure(exit)) assert.deepStrictEqual(Cause.findErrorOption(exit.cause), Option.some("nope1"))
      assert.deepStrictEqual((yield* pagesLog).slice(2, 4), ["get@0 unstored", "get@1 unstored"])
    }).pipe(provide)
  })

  it.effect("prefetch of a stale ordinary read loads it again, whatever its value", () => {
    let calls = 0
    class GetTags extends Loader.Service<GetTags>()("chat/GetTags", {
      args: { id: Schema.String },
      success: Schema.NullOr(Schema.Array(Schema.String)),
      error: Schema.Never,
      staleTime: 0
    }, Effect.succeed(({ id }) => Effect.sync(() => (calls++, id === "none" ? null : ["a"])))) {}
    return Effect.gen(function*() {
      for (const id of ["some", "none"]) {
        yield* GetTags.get({ id })
        yield* GetTags.prefetch({ id })
        yield* flush
      }
      assert.strictEqual(calls, 4)
      assert.deepStrictEqual((yield* TestLoader.fetches).map((fetch) => fetch.trigger), [
        "get",
        "prefetch",
        "get",
        "prefetch"
      ])
    }).pipe(Effect.provide(Layer.merge(GetTags.layer, TestLoader.layer())))
  })
})

/** The server's per-request cache. */
const settleOnce = Layer.effect(
  Loader.Cache,
  Effect.gen(function*() {
    return Loader.makeCache({
      scope: yield* Effect.scope,
      context: yield* Effect.context<never>(),
      idleMs: 300_000,
      visibility: Loader.makeSignal(true),
      connectivity: Loader.makeSignal(true),
      report: () => {},
      settleOnce: true
    }) as unknown as Context.Service.Shape<typeof Loader.Cache>
  })
)
