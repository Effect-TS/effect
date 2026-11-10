import { assert, describe, it } from "@effect/vitest"
import { Effect, Layer, Option, Schema } from "effect"
import { AsyncResult, Loader } from "effect/reactivity"
import { TestClock } from "effect/testing"
import { Command, Component, Loaded, Route, Router } from "effect/ui"
import { Query, Snapshot, TestHost } from "effect/ui/testing"

const User = Schema.Struct({ id: Schema.String, name: Schema.String })

/** A fresh read, mutation and components per test: the db is closed over. */
const make = (options: { readonly staleTime: string }) => {
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
      invalidates: (id) => [GetUser.entry({ id })],
      optimistic: (id, name) => [GetUser.patch({ id }, (user) => ({ ...user, name }))]
    }
  ) {}

  const CardMessage = Schema.TaggedUnion({
    UserChanged: { snapshot: Loaded.Snapshot(GetUser, "user") },
    Rename: { name: Schema.String },
    Renamed: {}
  })

  // A routed app: a list page and a detail page, both reading user 1.
  const AppRoute = Route.union({
    List: Route.make("/"),
    Detail: Route.make("/users/:id", { params: { id: Schema.String } })
  })
  const AppMessage = Schema.TaggedUnion({ Changed: { route: AppRoute }, Go: { route: AppRoute }, Back: {}, Done: {} })
  const user = Loaded.at(GetUser, "user", (_model: unknown, props: { readonly id: string; readonly tag: string }) => ({
    id: props.id
  }))
  const Card = Component.make({
    name: "Card",
    props: Schema.Struct({ id: Schema.String, tag: Schema.String }),
    model: Schema.Struct({ user: Loaded.Snapshot(GetUser, "user"), saving: Schema.Boolean }),
    message: CardMessage,
    init: ($) => $.set({ user: user.empty, saving: false }),
    update: (model, message, $) =>
      CardMessage.match(message, {
        UserChanged: ({ snapshot }) => {
          const result = user.open(snapshot, model, $.props)
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
        Renamed: () => ({ ...model, saving: false })
      }),
    subscriptions: (model, props) => [
      user.watch(model, props, (snapshot) => CardMessage.make({ _tag: "UserChanged", snapshot }))
    ],
    view: (model, h) => {
      const text = AsyncResult.match(user.open(model.user, model, h.props), {
        onInitial: (initial) => (initial.waiting ? "loading" : "idle"),
        onSuccess: (success) => success.value.name + (success.waiting ? "…" : ""),
        onFailure: () => "failed"
      })
      order.push(`view ${h.props.tag} ${text}${model.saving ? " saving" : ""}`)
      return h.el("p", `${h.props.tag}=${text}`).on("click", CardMessage.make({ _tag: "Rename", name: "Bob" }))
    }
  })

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
          return h.child(Card, { key, props: { id, tag: key } })
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
  const layer = Layer.mergeAll(TestHost.layer(), GetUser.layer, RenameUser.layer)
  return { db, order, GetUser, RenameUser, Card, CardMessage, Board, user, layer, App, AppRoute, AppMessage }
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
    assert.strictEqual(t.user.open(t.user.empty, {}, props)._tag, "Initial")
    const snapshot = Snapshot.success(t.user, { id: "1" }, { id: "1", name: "Zed" })
    const opened = t.user.open(snapshot, {}, props)
    assert.strictEqual(AsyncResult.isSuccess(opened) && opened.value.name, "Zed")
    // Another id's snapshot under the same binding: the args key differs, so it opens as waiting.
    const other = t.user.open(snapshot, {}, { id: "2", tag: "a" })
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
      assert.deepStrictEqual(t.order.slice(3), ["view a Bob… saving", "view b Bob…"])
      // A live patch shows as waiting.
      assert.strictEqual(root.text(), "a=Bob…b=Bob…")
      yield* TestClock.adjust(10)
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
      assert.strictEqual(root.text(), "a=…")
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
      // The restored Model's snapshot opens as its stored Success: old data, and not marked waiting,
      // while the cold entry's fetch is in flight.
      assert.strictEqual(root.text(), "list=Ann")
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
      () => Component.make({ ...base, model: Schema.Array(Loaded.Snapshot(t.GetUser, "user")) } as any),
      /inside an array/
    )
    assert.throws(
      () =>
        Component.make({
          ...base,
          model: Schema.Struct({ a: Loaded.Snapshot(t.GetUser, "user"), b: Loaded.Snapshot(t.GetUser, "user") })
        } as any),
      /two snapshot fields/
    )
  })
})
