import { assert, describe, it } from "@effect/vitest"
import { Effect, Layer, Option, Schema } from "effect"
import { AsyncResult, Loader } from "effect/reactivity"
import { TestClock } from "effect/testing"
import { Command, Component, Route, Router } from "effect/ui"
import { Query, Snapshot, TestHost } from "effect/ui/testing"

const User = Schema.Struct({ id: Schema.String, name: Schema.String })

/** A fresh read, mutation and components per test: the db is closed over. */
const make = (
  options: {
    readonly staleTime: string
    readonly mode?: Command.Mode
    /** Each Card provides RenameUser itself, so the Layer build closes with the Card. */
    readonly ownLayer?: boolean
  }
) => {
  const db = { calls: 0, names: new Map<string, string>([["1", "Ann"], ["2", "Bea"]]) }
  /** What happened, in order: updates and views, to assert on ordering. */
  const order: Array<string> = []

  class GetUser extends Loader.Service<GetUser>()(
    "users/GetUser",
    {
      args: Schema.Struct({ id: Schema.String }),
      success: User,
      error: Schema.String,
      staleTime: options.staleTime as any
    },
    Effect.succeed(({ id }) =>
      Effect.gen(function*() {
        db.calls++
        yield* Effect.sleep(10)
        const name = db.names.get(id)
        return name === undefined ? yield* Effect.fail("missing") : { id, name }
      })
    )
  ) {}

  class RenameUser extends Command.Service<RenameUser>()(
    "users/RenameUser",
    Effect.succeed((id: string, name: string) =>
      Effect.gen(function*() {
        yield* Effect.sleep(10)
        if (name === "") return yield* Effect.fail("empty")
        db.names.set(id, name)
        return { id, name }
      })
    ),
    {
      mode: options.mode ?? "concurrent",
      invalidates: (id) => [GetUser.entry({ id })],
      optimistic: (id, name) => [GetUser.patch({ id }, (user) => ({ ...user, name }))]
    }
  ) {}

  const CardMessage = Schema.TaggedUnion({
    UserChanged: { snapshot: Loader.Snapshot(GetUser, "user") },
    Rename: { name: Schema.String },
    Renamed: {}
  })

  // A routed app: a list page and a detail page, both reading user 1.
  const AppRoute = Route.union({
    List: Route.make("/"),
    Detail: Route.make("/users/:id", { params: { id: Schema.String } })
  })
  const AppMessage = Schema.TaggedUnion({ Changed: { route: AppRoute }, Go: { route: AppRoute }, Back: {}, Done: {} })
  const Card = Component.make({
    name: "Card",
    props: Schema.Struct({ id: Schema.String, tag: Schema.String }),
    model: Schema.Struct({ user: Loader.Snapshot(GetUser, "user"), saving: Schema.Boolean }),
    message: CardMessage,
    loaders: {
      // An empty id disables the read.
      user: (_model, props) => props.id === "" ? undefined : { id: props.id }
    },
    init: ($) => $.set({ ...$.empty, saving: false }),
    update: (model, message, $) =>
      CardMessage.match(message, {
        UserChanged: ({ snapshot }) => {
          const result = $.loadedOf({ ...model, user: snapshot }).user
          order.push(`update ${$.props.tag} ${AsyncResult.isSuccess(result) ? result.value.name : result._tag}`)
          return { ...model, user: snapshot }
        },
        Rename: ({ name }) => {
          order.push(`update ${$.props.tag} Rename`)
          return $.set({ ...model, saving: true }).run(
            RenameUser.make($.props.id, name).pipe(Command.match({
              onSuccess: () => CardMessage.make({ _tag: "Renamed" }),
              onFailure: () => CardMessage.make({ _tag: "Renamed" })
            }))
          )
        },
        Renamed: () => {
          order.push(`update ${$.props.tag} Renamed`)
          return { ...model, saving: false }
        }
      }),
    subscriptions: (_model, _props, watch) => [
      watch({ user: (snapshot) => CardMessage.make({ _tag: "UserChanged", snapshot }) })
    ],
    view: (model, h) => {
      const text = AsyncResult.match(h.loaded.user, {
        onInitial: (initial) => (initial.waiting ? "loading" : "idle"),
        // "~": the value includes an unconfirmed patch. "…": a fetch is in flight.
        onSuccess: (success) => success.value.name + (h.patched.user ? "~" : "") + (success.waiting ? "…" : ""),
        onFailure: () => "failed"
      })
      order.push(`view ${h.props.tag} ${text}${model.saving ? " saving" : ""}`)
      // A click renames to Bob, and a click on Bob renames to Cy.
      const next = AsyncResult.isSuccess(h.loaded.user) && h.loaded.user.value.name === "Bob" ? "Cy" : "Bob"
      return h.el("p", `${h.props.tag}=${text}`).on("click", CardMessage.make({ _tag: "Rename", name: next }))
    }
  })

  const OwnCard = Component.provide(Card, RenameUser.layer, { local: true })

  /** A parent whose Model says which cards are mounted: "key:id" each. */
  const Board = Component.make({
    name: "Board",
    model: Schema.Array(Schema.String),
    message: Schema.Array(Schema.String),
    props: Schema.Struct({ cards: Schema.Array(Schema.String) }),
    init: ($) => $.set($.props.cards),
    update: (_model, message) => message,
    view: (cards, h) =>
      h.el(
        "div",
        cards.map((card) => {
          const [key, id] = card.split(":")
          return h.child(options.ownLayer ? OwnCard : Card, { key, props: { id, tag: key } })
        })
      )
  })
  const App = Component.make({
    name: "App",
    props: Schema.Struct({ route: AppRoute }),
    model: AppRoute,
    message: AppMessage,
    init: ($) => $.set($.props.route),
    update: (model, message, $) =>
      AppMessage.match(message, {
        Changed: ({ route }) => route,
        Go: ({ route }) =>
          $.run(Router.push(AppRoute, route).pipe(Command.map(() => AppMessage.make({ _tag: "Done" })))),
        Back: () => $.run(Router.Back.make().pipe(Command.map(() => AppMessage.make({ _tag: "Done" })))),
        Done: () => model
      }),
    subscriptions: () => [Router.subscription(AppRoute, (route) => AppMessage.make({ _tag: "Changed", route }))],
    view: (route, h) =>
      AppRoute.match(route, {
        List: () => h.child(Card, { key: "list", props: { id: "1", tag: "list" } }),
        Detail: ({ params }) => h.child(Card, { key: `detail-${params.id}`, props: { id: params.id, tag: "detail" } })
      })
  })
  const shared = Layer.mergeAll(TestHost.layer(), GetUser.layer, RenameUser.layer)
  // With `ownLayer` nothing above the Cards provides RenameUser. Only the Board is mounted then.
  const layer = options.ownLayer ? Layer.mergeAll(TestHost.layer(), GetUser.layer) as typeof shared : shared
  return { db, order, GetUser, RenameUser, Card, CardMessage, Board, layer, App, AppRoute, AppMessage }
}

const load = Effect.gen(function*() {
  yield* TestHost.settle
  yield* TestClock.adjust(10)
  yield* TestHost.settle
})

describe("Loaded", () => {
  it.effect("a component with a read renders Initial(waiting), then Success", () => {
    const t = make({ staleTime: "1 minute" })
    return Effect.gen(function*() {
      const root = yield* TestHost.mount(t.Card, { id: "1", tag: "a" })
      yield* TestHost.settle
      assert.strictEqual(root.text(), "a=loading")
      yield* load
      assert.strictEqual(root.text(), "a=Ann")
      assert.deepStrictEqual(root.fetches().map((fetch) => fetch.trigger), ["watch"])
      // The Model's snapshot encodes without `waiting`, and decodes back equal.
      const schema = Schema.toCodecJson(t.Card.model)
      const encoded = Schema.encodeSync(schema)(root.model()!)
      assert.deepStrictEqual(Schema.decodeSync(schema)(encoded), root.model())
    }).pipe(Effect.provide(t.layer))
  })

  it.effect("a disabled read opens as Initial, not waiting, and a testing snapshot opens as its result", () => {
    const t = make({ staleTime: "1 minute" })
    const props = { id: "1", tag: "a" }
    const empty = t.Card.init(props).model
    const initial = t.Card.loaded(empty, props).user
    assert.deepStrictEqual([initial._tag, initial.waiting], ["Initial", true])
    const disabled = t.Card.loaded(empty, { id: "", tag: "a" }).user
    assert.deepStrictEqual([disabled._tag, disabled.waiting], ["Initial", false])
    const snapshot = Snapshot.success(t.GetUser, "user", { id: "1" }, { id: "1", name: "Zed" })
    const model = { ...empty, user: snapshot }
    const opened = t.Card.loaded(model, props).user
    assert.strictEqual(AsyncResult.isSuccess(opened) && opened.value.name, "Zed")
    // Another id's snapshot in the same field: the args key differs, so it opens as waiting.
    const other = t.Card.loaded(model, { id: "2", tag: "a" }).user
    assert.deepStrictEqual([other._tag, other.waiting], ["Initial", true])
    return Effect.void
  })

  it.effect("two instances share one fetch", () => {
    const t = make({ staleTime: "1 minute" })
    return Effect.gen(function*() {
      const root = yield* TestHost.mount(t.Board, { cards: ["a:1", "b:1"] })
      yield* load
      assert.strictEqual(root.text(), "a=Annb=Ann")
      assert.strictEqual(t.db.calls, 1)
      assert.strictEqual(root.cache.inspect(t.GetUser, { id: "1" }).watchers, 2)
    }).pipe(Effect.provide(t.layer))
  })

  it.effect("a keyed swap on a stale shared entry is a zero-to-one and refetches; a join doesn't", () => {
    const t = make({ staleTime: "1 second" })
    return Effect.gen(function*() {
      const root = yield* TestHost.mount(t.Board, { cards: ["a:1"] })
      yield* load
      yield* TestClock.adjust("2 seconds")
      yield* TestHost.settle
      assert.strictEqual(root.cache.inspect(t.GetUser, { id: "1" }).stale, true)
      assert.strictEqual(t.db.calls, 1)

      // A child joining a watched stale entry starts nothing.
      root.send(["a:1", "c:1"])
      yield* load
      assert.strictEqual(root.text(), "a=Annc=Ann")
      assert.strictEqual(t.db.calls, 1)
      root.send(["a:1"])
      yield* load

      // A -> B: the new instance is created before the old one is destroyed, and the count still
      // passes through zero.
      root.send(["b:1"])
      assert.strictEqual(root.cache.inspect(t.GetUser, { id: "1" }).watchers, 1)
      yield* TestHost.settle
      assert.strictEqual(root.cache.inspect(t.GetUser, { id: "1" }).watchers, 1)
      assert.deepStrictEqual(root.fetches().map((fetch) => fetch.trigger), ["watch", "watch"])
      // Stale data shows at once, waiting.
      assert.strictEqual(root.text(), "b=Ann…")
      yield* load
      assert.strictEqual(root.text(), "b=Ann")
      assert.strictEqual(t.db.calls, 2)
    }).pipe(Effect.provide(t.layer))
  })

  it.effect("the watcher count drops synchronously when the root closes", () => {
    const t = make({ staleTime: "1 minute" })
    return Effect.gen(function*() {
      const root = yield* TestHost.mount(t.Board, { cards: ["a:1", "b:2"] })
      yield* load
      root.send([])
      yield* TestHost.settle
      assert.strictEqual(root.cache.inspect(t.GetUser, { id: "1" }).watchers, 0)
      assert.strictEqual(root.cache.inspect(t.GetUser, { id: "2" }).watchers, 0)
    }).pipe(Effect.provide(t.layer))
  })

  it.effect("an optimistic patch reaches a second watching instance before the flush that renders the issuing update", () => {
    const t = make({ staleTime: "1 minute" })
    return Effect.gen(function*() {
      const root = yield* TestHost.mount(t.Board, { cards: ["a:1", "b:1"] })
      yield* load
      t.order.length = 0
      Query.fire(root.get(Query.text("a=Ann", { exact: true })), "click")
      // Synchronously, before any flush: both instances already hold the patched snapshot.
      assert.deepStrictEqual(t.order, ["update a Rename", "update a Bob", "update b Bob"])
      yield* TestHost.settle
      // One flush renders the issuing update and the patch together: "Ann saving" never shows.
      assert.deepStrictEqual(t.order.slice(3), ["view a Bob~ saving", "view b Bob~"])
      // A live patch is `patched` and not `waiting` (resolution #7).
      assert.strictEqual(root.text(), "a=Bob~b=Bob~")
      yield* TestClock.adjust(10)
      yield* TestHost.settle
      // The run succeeded. Through the confirming refetch the patch is held: patched and waiting.
      assert.strictEqual(root.text(), "a=Bob~…b=Bob~…")
      yield* load
      // The run succeeded: invalidation refetched, and the server agrees.
      assert.strictEqual(root.text(), "a=Bobb=Bob")
      assert.deepStrictEqual(root.fetches().map((fetch) => fetch.trigger), ["watch", "invalidation"])
      assert.strictEqual(root.cache.inspect(t.GetUser, { id: "1" }).patches, 0)
    }).pipe(Effect.provide(t.layer))
  })

  it.effect("a failed mutation takes its patch back and still invalidates", () => {
    const t = make({ staleTime: "1 minute" })
    return Effect.gen(function*() {
      const root = yield* TestHost.mount(t.Card, { id: "1", tag: "a" })
      yield* load
      // The mutation fails on an empty name.
      root.send(t.CardMessage.make({ _tag: "Rename", name: "" }))
      yield* TestHost.settle
      assert.strictEqual(root.text(), "a=~")
      assert.strictEqual(root.cache.inspect(t.GetUser, { id: "1" }).patches, 1)
      yield* TestClock.adjust(10)
      yield* TestHost.settle
      // The patch is gone, and the refetch a failure also asks for is in flight.
      assert.strictEqual(root.cache.inspect(t.GetUser, { id: "1" }).patches, 0)
      assert.strictEqual(root.text(), "a=Ann…")
      yield* load
      assert.strictEqual(root.text(), "a=Ann")
      assert.deepStrictEqual(root.fetches().map((fetch) => fetch.trigger), ["watch", "invalidation"])
    }).pipe(Effect.provide(t.layer))
  })

  it.effect("a Visibility edge refetches a stale watched entry, and TestClock drives staleness", () => {
    const t = make({ staleTime: "1 second" })
    const visibility = Loader.makeSignal(true)
    return Effect.gen(function*() {
      const root = yield* TestHost.mount(t.Card, { id: "1", tag: "a" }).pipe(
        Effect.provideService(Loader.Visibility, visibility)
      )
      yield* load
      visibility.set(false)
      yield* TestClock.adjust("5 seconds")
      yield* TestHost.settle
      // Stale and watched, but hidden: nothing fetches on a timer.
      assert.strictEqual(t.db.calls, 1)
      t.db.names.set("1", "Ann2")
      visibility.set(true)
      yield* load
      assert.deepStrictEqual(root.fetches().map((fetch) => fetch.trigger), ["watch", "visibility"])
      assert.strictEqual(root.text(), "a=Ann2")
    }).pipe(Effect.provide(t.layer))
  })

  it.effect("push and back over one fresh entry fetch once, and history.state holds the snapshot", () => {
    const t = make({ staleTime: "1 minute" })
    const history = Router.memoryHistory("/")
    const route = (url: string) => Option.getOrThrow(t.AppRoute.parse(url))
    return Effect.gen(function*() {
      const root = yield* TestHost.mount(t.App, { route: route("/") })
      yield* load
      assert.strictEqual(root.text(), "list=Ann")
      root.send(t.AppMessage.make({ _tag: "Go", route: route("/users/1") }))
      yield* load
      // The detail page watches the entry the list page left: a zero-to-one on a fresh entry.
      assert.strictEqual(root.text(), "detail=Ann")
      assert.strictEqual(t.db.calls, 1)
      // Leaving by a push wrote the list page's Models, snapshot included, into the entry left.
      const saved = JSON.stringify(history.states()[0])
      assert.isTrue(saved.includes("\"Ann\""))
      assert.isBelow(saved.length, 400)
      root.send(t.AppMessage.make({ _tag: "Back" }))
      yield* TestHost.settle
      // Restored from the snapshot: the data shows in the first frame, with no fetch.
      assert.strictEqual(root.text(), "list=Ann")
      yield* load
      assert.strictEqual(t.db.calls, 1)
    }).pipe(Effect.provide(Router.make({ routes: t.AppRoute, history })), Effect.provide(t.layer))
  })

  it.effect("a cold restore (a reload, then back) shows the snapshot from history.state and fetches once", () => {
    const t = make({ staleTime: "1 minute" })
    const history = Router.memoryHistory("/")
    const route = (url: string) => Option.getOrThrow(t.AppRoute.parse(url))
    const router = () => Router.make({ routes: t.AppRoute, history })
    const first = Effect.gen(function*() {
      const root = yield* TestHost.mount(t.App, { route: route("/") })
      yield* load
      root.send(t.AppMessage.make({ _tag: "Go", route: route("/users/2") }))
      yield* load
      assert.strictEqual(root.text(), "detail=Bea")
    })
    const reloaded = Effect.gen(function*() {
      // A new mount is a new, cold cache.
      const root = yield* TestHost.mount(t.App, { route: route("/users/2") })
      yield* load
      assert.strictEqual(t.db.calls, 3)
      t.db.names.set("1", "Ann2")
      history.go(-1)
      yield* TestHost.settle
      // Resolution #8: the cold entry is seeded as stale from the restored snapshot, so the old data
      // shows in the first frame marked waiting, while the entry's fetch is in flight.
      assert.strictEqual(root.text(), "list=Ann…")
      assert.deepStrictEqual(
        [root.cache.inspect(t.GetUser, { id: "1" }).stale, root.cache.inspect(t.GetUser, { id: "1" }).fetching],
        [true, true]
      )
      assert.deepStrictEqual(root.fetches().map((fetch) => fetch.argsKey).length, 2)
      yield* load
      assert.strictEqual(root.text(), "list=Ann2")
      assert.strictEqual(t.db.calls, 4)
    })
    return Effect.gen(function*() {
      yield* first.pipe(Effect.provide(router()), Effect.scoped)
      yield* reloaded.pipe(Effect.provide(router()), Effect.scoped)
    }).pipe(Effect.provide(t.layer))
  })

  it.effect("resolution #6: a Command.Service run outlives its instance, its result message is dropped, and the cache still hears", () => {
    const t = make({ staleTime: "1 minute", mode: "queue" })
    return Effect.gen(function*() {
      const root = yield* TestHost.mount(t.Board, { cards: ["a:1", "b:1"] })
      yield* load
      // Two saves from card a: one running, one queued.
      Query.fire(root.get(Query.text("a=")), "click")
      yield* TestHost.settle
      Query.fire(root.get(Query.text("a=")), "click")
      yield* TestHost.settle
      assert.deepStrictEqual(root.pending().map((run) => run.status), ["running", "queued"])
      // Card a unmounts.
      t.order.length = 0
      root.send(["b:1"])
      yield* TestHost.settle
      // Both runs are still there, under the path of an instance that no longer exists.
      assert.deepStrictEqual(root.pending(), [
        { path: "/Board/Card[a]", name: "users/RenameUser", status: "running" },
        { path: "/Board/Card[a]", name: "users/RenameUser", status: "queued" }
      ])
      assert.strictEqual(root.cache.inspect(t.GetUser, { id: "1" }).patches, 2)
      assert.strictEqual(root.text(), "b=Cy~")
      yield* TestClock.adjust(10)
      yield* TestHost.settle
      // The first finished and the queue went on without the instance.
      assert.strictEqual(t.db.names.get("1"), "Bob")
      assert.deepStrictEqual(root.pending().map((run) => run.status), ["running"])
      yield* TestClock.adjust(10)
      yield* TestHost.settle
      assert.strictEqual(t.db.names.get("1"), "Cy")
      assert.deepStrictEqual(root.pending(), [])
      yield* load
      assert.strictEqual(root.text(), "b=Cy")
      assert.strictEqual(root.cache.inspect(t.GetUser, { id: "1" }).patches, 0)
      // No "Renamed" reached anyone: the result messages were dropped.
      assert.isFalse(t.order.some((entry) => entry.includes("Renamed") || entry.startsWith("update a")))
      // Both runs invalidated. The second landed while the first one's refetch was in flight: one fetch event.
      assert.deepStrictEqual(root.fetches().map((fetch) => fetch.trigger), ["watch", "invalidation"])
    }).pipe(Effect.provide(t.layer))
  })

  it.effect("resolution #6: a switch-mode run still ends with its instance", () => {
    const t = make({ staleTime: "1 minute", mode: "switch" })
    return Effect.gen(function*() {
      const root = yield* TestHost.mount(t.Board, { cards: ["a:1", "b:1"] })
      yield* load
      Query.fire(root.get(Query.text("a=")), "click")
      yield* TestHost.settle
      assert.strictEqual(root.text(), "a=Bob~b=Bob~")
      root.send(["b:1"])
      yield* TestHost.settle
      // Interrupted with the instance: the patch is gone, and the server never renamed.
      assert.deepStrictEqual(root.pending(), [])
      assert.strictEqual(root.cache.inspect(t.GetUser, { id: "1" }).patches, 0)
      yield* load
      yield* load
      assert.strictEqual(t.db.names.get("1"), "Ann")
      assert.strictEqual(root.text(), "b=Ann")
    }).pipe(Effect.provide(t.layer))
  })

  it.effect("resolution #6: a run whose service Layer is provided by the instance that unmounts ends with it", () => {
    const t = make({ staleTime: "1 minute", mode: "queue", ownLayer: true })
    return Effect.gen(function*() {
      const root = yield* TestHost.mount(t.Board, { cards: ["a:1", "b:1"] })
      yield* load
      Query.fire(root.get(Query.text("a=")), "click")
      yield* TestHost.settle
      Query.fire(root.get(Query.text("a=")), "click")
      yield* TestHost.settle
      assert.strictEqual(root.text(), "a=Cy~b=Cy~")
      root.send(["b:1"])
      yield* TestHost.settle
      // The build that owned both runs closed with card a.
      assert.deepStrictEqual(root.pending(), [])
      assert.strictEqual(root.cache.inspect(t.GetUser, { id: "1" }).patches, 0)
      yield* load
      yield* load
      assert.strictEqual(t.db.names.get("1"), "Ann")
      assert.strictEqual(root.text(), "b=Ann")
    }).pipe(Effect.provide(t.layer))
  })

  it.effect("[SURPRISE] resolution #6 with history restore: a `saving` flag kept in the Model is restored set, and nothing ever clears it", () => {
    const t = make({ staleTime: "1 minute" })
    const history = Router.memoryHistory("/")
    const route = (url: string) => Option.getOrThrow(t.AppRoute.parse(url))
    return Effect.gen(function*() {
      const root = yield* TestHost.mount(t.App, { route: route("/") })
      yield* load
      root.send(t.AppMessage.make({ _tag: "Go", route: route("/users/1") }))
      yield* load
      Query.fire(root.get(Query.text("detail=Ann", { exact: true })), "click")
      yield* TestHost.settle
      assert.strictEqual(root.text(), "detail=Bob~")
      // Leave while the save is in flight. The push writes `saving: true` and the patched snapshot.
      root.send(t.AppMessage.make({ _tag: "Go", route: route("/") }))
      yield* TestHost.settle
      const saved = JSON.stringify(history.states()[1])
      assert.isTrue(saved.includes("\"saving\":true"))
      // The snapshot's fifth element is the patched bit.
      assert.isTrue(/\{\\?"id\\?":\\?"1\\?",\\?"name\\?":\\?"Bob\\?"\},\d+,1\]/.test(saved), saved)
      yield* load
      yield* load
      // The save finished with nobody to tell.
      assert.strictEqual(t.db.names.get("1"), "Bob")
      assert.deepStrictEqual(root.pending(), [])
      assert.isFalse(t.order.includes("update detail Renamed"))
      t.order.length = 0
      root.send(t.AppMessage.make({ _tag: "Back" }))
      yield* load
      yield* load
      assert.strictEqual(root.text(), "detail=Bob")
      // The restored Model says a save is running. No Command is, and no message will come.
      assert.strictEqual(t.order[t.order.length - 1], "view detail Bob saving")
      assert.deepStrictEqual(root.pending(), [])
    }).pipe(Effect.provide(Router.make({ routes: t.AppRoute, history })), Effect.provide(t.layer))
  })

  it.effect("resolution #2: mounting or re-keying onto an entry the cache holds never renders \"loading\"", () => {
    const t = make({ staleTime: "1 minute" })
    return Effect.gen(function*() {
      const root = yield* TestHost.mount(t.Board, { cards: ["a:1", "b:2"] })
      yield* load
      t.order.length = 0
      // A new instance on user 1, and card b re-keyed from user 2 to user 1.
      root.send(["a:1", "c:1", "b:1"])
      yield* TestHost.settle
      // Each folds the cache's value through update before its render: no "loading", no "Bea" under b's new key.
      assert.deepStrictEqual(t.order, ["update c Ann", "view c Ann", "update b Ann", "view b Ann"])
      assert.strictEqual(root.text(), "a=Annc=Annb=Ann")
      assert.strictEqual(t.db.calls, 2)
    }).pipe(Effect.provide(t.layer))
  })

  it.effect("resolution #2: a Command issued by the folded first emission starts after init's, and after the first render", () => {
    const t = make({ staleTime: "1 minute" })
    const seen: Array<string> = []
    const Message = Schema.TaggedUnion({ UserChanged: { snapshot: Loader.Snapshot(t.GetUser, "user") }, Noted: {} })
    const Note = Command.make("Note", (text: string) =>
      Effect.sync(() => {
        seen.push(`command ${text}`)
        return Message.make({ _tag: "Noted" })
      }))
    const Noter = Component.make({
      name: "Noter",
      model: Schema.Struct({ user: Loader.Snapshot(t.GetUser, "user") }),
      message: Message,
      loaders: { user: () => ({ id: "1" }) },
      init: ($) => $.set($.empty).run(Note("init")),
      update: (model, message, $) =>
        Message.match(message, {
          UserChanged: ({ snapshot }) => {
            seen.push("update UserChanged")
            return $.set({ user: snapshot }).run(Note("fold"))
          },
          Noted: () => model
        }),
      subscriptions: (_model, _props, watch) => [
        watch({ user: (snapshot) => Message.make({ _tag: "UserChanged", snapshot }) })
      ],
      view: (_model, h) => {
        seen.push(`view ${h.loaded.user._tag}`)
        return h.el("i", "noter")
      }
    })
    const Host = Component.make({
      name: "Host",
      model: Schema.Boolean,
      message: Schema.Boolean,
      init: ($) => $.set(false),
      update: (_model, message) => message,
      view: (show, h) =>
        h.el("div", h.child(t.Card, { key: "a", props: { id: "1", tag: "a" } }), show && h.child(Noter, { key: "n" }))
    })
    return Effect.gen(function*() {
      const root = yield* TestHost.mount(Host, {})
      yield* load
      root.send(true)
      yield* TestHost.settle
      // Folded before the first render. Its Command is issued where init's is: after that render, and after init's.
      assert.deepStrictEqual(seen, [
        "update UserChanged",
        "view Success",
        "command init",
        "command fold",
        "view Success"
      ])
    }).pipe(Effect.provide(t.layer))
  })

  it.effect("resolution #8: a snapshot taken under a patch seeds nothing on a cold restore", () => {
    const t = make({ staleTime: "1 minute" })
    const history = Router.memoryHistory("/users/1")
    const route = (url: string) => Option.getOrThrow(t.AppRoute.parse(url))
    const router = () => Router.make({ routes: t.AppRoute, history })
    const first = Effect.gen(function*() {
      const root = yield* TestHost.mount(t.App, { route: route("/users/1") })
      yield* load
      Query.fire(root.get(Query.text("detail=")), "click")
      yield* TestHost.settle
      assert.strictEqual(root.text(), "detail=Bob~")
      // Pushed while the patch is live.
      root.send(t.AppMessage.make({ _tag: "Go", route: route("/users/2") }))
      yield* TestHost.settle
      assert.isTrue(JSON.stringify(history.states()[0]).includes("Bob"))
    })
    const reloaded = Effect.gen(function*() {
      // A new mount is a new, cold cache, and this page doesn't read user 1.
      const root = yield* TestHost.mount(t.App, { route: route("/users/2") })
      yield* load
      const calls = t.db.calls
      t.order.length = 0
      history.go(-1)
      yield* TestHost.settle
      // Nothing was seeded: the restored snapshot opens empty, and the cold entry fetches.
      assert.deepStrictEqual(t.order, ["view detail loading saving"])
      assert.strictEqual(root.text(), "detail=loading")
      assert.strictEqual(t.db.calls - calls, 1)
      yield* load
      assert.strictEqual(root.text(), "detail=Bob")
    })
    return Effect.gen(function*() {
      yield* first.pipe(Effect.provide(router()), Effect.scoped)
      yield* reloaded.pipe(Effect.provide(router()), Effect.scoped)
    }).pipe(Effect.provide(t.layer))
  })

  it.effect("[SURPRISE] resolution #6: a run outlives the mount itself when its service Layer is provided outside the mount", () => {
    const t = make({ staleTime: "1 minute" })
    return Effect.gen(function*() {
      yield* Effect.gen(function*() {
        const root = yield* TestHost.mount(t.Card, { id: "1", tag: "a" })
        yield* load
        Query.fire(root.get(Query.text("a=")), "click")
        yield* TestHost.settle
        assert.strictEqual(root.text(), "a=Bob~")
      }).pipe(Effect.scoped)
      // The mount's Scope is closed. RenameUser.layer was built outside it and is still open.
      assert.strictEqual(t.db.names.get("1"), "Ann")
      yield* TestClock.adjust(10)
      assert.strictEqual(t.db.names.get("1"), "Bob")
    }).pipe(Effect.provide(t.layer))
  })

  it.effect("the mount's idleTimeToLive collects an entry nobody watches", () => {
    const t = make({ staleTime: "1 minute" })
    return Effect.gen(function*() {
      const root = yield* TestHost.mount(t.Board, { cards: ["a:1"] }, { loader: { idleTimeToLive: "1 second" } })
      yield* load
      root.send([])
      yield* TestHost.settle
      assert.strictEqual(root.cache.inspect(t.GetUser, { id: "1" }).exists, true)
      yield* TestClock.adjust("2 seconds")
      assert.strictEqual(root.cache.inspect(t.GetUser, { id: "1" }).exists, false)
    }).pipe(Effect.provide(t.layer))
  })

  it("Component.make rejects a snapshot inside an array, and two fields with one (read, label)", () => {
    const t = make({ staleTime: "1 minute" })
    const base = {
      name: "Bad",
      message: Schema.Never,
      init: ($: any) => $.set(undefined),
      update: (m: any) => m,
      view: (_: any, h: any) => h.text("")
    }
    assert.throws(
      () => Component.make({ ...base, model: Schema.Array(Loader.Snapshot(t.GetUser, "user")) } as any),
      /inside an array/
    )
    assert.throws(
      () =>
        Component.make({
          ...base,
          model: Schema.Struct({ a: Loader.Snapshot(t.GetUser, "user"), b: Loader.Snapshot(t.GetUser, "user") })
        } as any),
      /two snapshot fields/
    )
    const snapshot = Loader.Snapshot(t.GetUser, "user")
    // The label is the field's name.
    assert.throws(
      () => Component.make({ ...base, model: Schema.Struct({ person: snapshot }) } as any),
      /A snapshot's label is its field's name/
    )
    // A snapshot that isn't directly a field of the Model has no loader key.
    assert.throws(
      () => Component.make({ ...base, model: Schema.Struct({ user: Schema.NullOr(snapshot) }) } as any),
      /Only a field of the Model itself has a loader/
    )
    // What the types already reject: no loader, no subscriptions, a watch that is missing or has no handler.
    const model = Schema.Struct({ user: snapshot })
    assert.throws(() => Component.make({ ...base, model } as any), /has no loader/)
    const loaders = { user: () => ({ id: "1" }) }
    assert.throws(() => Component.make({ ...base, model, loaders } as any), /subscriptions must return/)
    const unwatched = Component.make({ ...base, model, loaders, subscriptions: () => [] } as any)
    assert.throws(() => unwatched.subscriptions!({ user: undefined }, {}), /made by watch/)
    const unhandled = Component.make(
      { ...base, model, loaders, subscriptions: (_m: any, _p: any, watch: any) => [watch({})] } as any
    )
    assert.throws(() => unhandled.subscriptions!({ user: undefined }, {}), /no handler/)
  })
})
