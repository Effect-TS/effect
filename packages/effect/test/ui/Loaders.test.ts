// @vitest-environment happy-dom
import { assert, describe, it } from "@effect/vitest"
import { Effect, type Layer, Schema } from "effect"
import { AsyncResult, Loader } from "effect/reactivity"
import { TestClock } from "effect/testing"
import { Component, MessageLog, Route, Router } from "effect/ui"
import { Html } from "effect/ui/html"
import { ssr } from "effect/ui/html/testing"
import { Query, Story, TestHost } from "effect/ui/testing"

/**
 * A component with one loader and no `onChange`: the runtime writes the
 * loader's slot, the view shows it, and `update` reads it through
 * `$.loaded`. Fresh per test: the fetch count is closed over.
 */
const makeApp = () => {
  const server = { calls: 0 }

  class GetNote extends Loader.Service<GetNote>()(
    "notes/GetNote",
    {
      args: { id: Schema.String },
      success: Schema.String,
      error: Schema.Never,
      staleTime: "30 seconds"
    },
    Effect.succeed(({ id }) =>
      Effect.sleep("10 millis").pipe(Effect.map(() => {
        server.calls++
        return `Note ${id}`
      }))
    )
  ) {}

  const NoteMessage = Schema.TaggedUnion({ Click: {} })
  const Note = Component.make({
    name: "Note",
    props: Schema.Struct({ id: Schema.String }),
    model: Schema.Struct({ clicks: Schema.Number, last: Schema.String }),
    message: NoteMessage,
    elements: Html,
    loaders: {
      note: { load: GetNote, args: (_model, props) => ({ id: props.id }) }
    },
    init: () => ({ clicks: 0, last: "none" }),
    // What the loader holds when the click is handled, so a replay only reproduces it with the slots.
    update: (model, _message, $) => ({
      clicks: model.clicks + 1,
      last: AsyncResult.isSuccess($.loaded.note) ? $.loaded.note.value : "none"
    }),
    view: (model, h) =>
      h.div(
        h.p(AsyncResult.match(h.loaded.note, {
          onInitial: () => "loading",
          onSuccess: ({ value }) => value,
          onFailure: () => "failed"
        })),
        h.button.onClick(NoteMessage.make({ _tag: "Click" })).children(`clicks ${model.clicks}`)
      )
  })

  const AppRoute = Route.union({
    Home: Route.make("/"),
    Note: Route.make("/notes/:id", { params: { id: Schema.String } })
  })
  const AppMessage = Schema.TaggedUnion({ RouteChanged: { route: AppRoute } })
  const App = Component.make({
    name: "App",
    props: Schema.Struct({ route: AppRoute }),
    model: AppRoute,
    message: AppMessage,
    elements: Html,
    init: ($) => $.props.route,
    update: (_route, message) => message.route,
    subscriptions: (route) => [
      Router.subscription(AppRoute, route, (next) => AppMessage.make({ _tag: "RouteChanged", route: next }))
    ],
    view: (route, h) =>
      h.main(AppRoute.match(route, {
        Home: () => h.h1("Home"),
        Note: (note) => h.child(Note, { key: AppRoute.print(note), props: { id: note.params.id } })
      }))
  })

  return { server, GetNote, Note, NoteMessage, AppRoute, App }
}

const click = (root: TestHost.TestRoot<any, any, any>, text: string) =>
  Query.fire(root.get(Query.text(text, { exact: true })), "click")

/** Runs a block on a fresh TestHost, so each run has its own loader cache. */
const run = <A, E>(layer: Layer.Layer<any>, effect: Effect.Effect<A, E, any>) =>
  effect.pipe(Effect.provide(layer), Effect.scoped, Effect.provide(TestHost.layer())) as Effect.Effect<A, E>

/** Starts what is due and lets the fetches finish: the fetcher sleeps 10 ms. */
const load = TestHost.settle.pipe(Effect.andThen(TestClock.adjust("10 millis")), Effect.andThen(TestHost.settle))

const loaderChanges = (log: ReadonlyArray<MessageLog.Entry>, path: string) =>
  log.filter((entry): entry is MessageLog.LoaderChanged => entry._tag === "LoaderChanged" && entry.path === path)

const updates = (log: ReadonlyArray<MessageLog.Entry>, path: string) =>
  log.filter((entry): entry is MessageLog.Update => entry._tag === "Update" && entry.path === path)

describe("a loader without onChange", { concurrent: false }, () => {
  it.effect("renders the loaded value, and update reads it through $.loaded", () => {
    const app = makeApp()
    return run(
      app.GetNote.layer,
      Effect.gen(function*() {
        const root = yield* TestHost.mount(app.Note, { id: "1" })
        assert.strictEqual(root.text(), "loadingclicks 0")
        yield* load
        assert.strictEqual(root.text(), "Note 1clicks 0")
        assert.strictEqual(app.server.calls, 1)
        // The slot is written by the runtime: one LoaderChanged entry holding the Success, and no update.
        assert.deepStrictEqual(
          loaderChanges(root.log(), "/Note").map((entry) => [
            entry.name,
            entry.component.name,
            Loader.snapshotData(entry.slot)?.result?._tag
          ]),
          [["note", "Note", "Success"]]
        )
        assert.deepStrictEqual(updates(root.log(), "/Note"), [])
        click(root, "clicks 0")
        yield* TestHost.settle
        assert.deepStrictEqual(root.model(), { clicks: 1, last: "Note 1" })
        assert.strictEqual(root.text(), "Note 1clicks 1")
      })
    )
  })

  it.effect("hydrates the server's { model, loaded } state without refetching", () => {
    const app = makeApp()
    return Effect.gen(function*() {
      const result = yield* ssr(app.Note, { id: "1" })
      // The page state of a component with loaders: its Model and its slots, a slot as its snapshot tuple.
      const state = result.state["/Note"] as {
        readonly model: unknown
        readonly loaded: { readonly note: ReadonlyArray<unknown> }
      }
      assert.deepStrictEqual(Object.keys(state).sort(), ["loaded", "model"])
      assert.deepStrictEqual(state.model, { clicks: 0, last: "none" })
      assert.deepStrictEqual(Object.keys(state.loaded), ["note"])
      assert.deepStrictEqual(state.loaded.note.slice(0, 3), [`{"id":"1"}`, 0, "Note 1"])
      assert.deepStrictEqual(result.adopted, ["/Note"])
      // Only the server fetched.
      assert.deepStrictEqual(result.root.fetches(), [])
      assert.strictEqual(app.server.calls, 1)
      assert.strictEqual(result.container.textContent, "Note 1clicks 0")
      // The hydrated slot is logged once, right after Mounted; the watch's first value equals it, so it isn't
      // written again.
      const index = result.log.findIndex((entry) => entry._tag === "Mounted" && entry.path === "/Note")
      assert.isTrue((result.log[index] as MessageLog.Mounted).adopted)
      assert.strictEqual(result.log[index + 1]?._tag, "LoaderChanged")
      assert.strictEqual(loaderChanges(result.log, "/Note").length, 1)
      assert.deepStrictEqual(updates(result.log, "/Note"), [])
      // update sees the hydrated slot.
      result.root.send(app.NoteMessage.make({ _tag: "Click" }))
      yield* TestHost.settle
      assert.deepStrictEqual(result.root.model(), { clicks: 1, last: "Note 1" })
      assert.strictEqual(app.server.calls, 1)
    }).pipe(
      Effect.provide(app.GetNote.layer),
      Effect.scoped,
      Effect.provide(TestHost.layer())
    ) as Effect.Effect<void, unknown>
  })

  it.effect("restores the Model and slot from history.state, seeding the cold cache, and refetches once", () => {
    const app = makeApp()
    const history = Router.memoryHistory("/notes/1")
    const path = "/App/Note[/notes/1]"
    const mount = TestHost.mount(app.App, Router.props(app.AppRoute))
    const routed = <E>(effect: Effect.Effect<void, E, any>) =>
      run(Router.make({ routes: app.AppRoute, history }), effect.pipe(Effect.provide(app.GetNote.layer)))
    return Effect.gen(function*() {
      yield* routed(Effect.gen(function*() {
        const root = yield* mount
        yield* load
        click(root, "clicks 0")
        yield* TestHost.settle
        assert.strictEqual(root.text(), "Note 1clicks 1")
        // Leaving by a push writes the saved state into the entry being left.
        const router = yield* Router.Router
        yield* router.navigate("/")
        yield* TestHost.settle
        assert.strictEqual(root.text(), "Home")
      }))
      assert.strictEqual(app.server.calls, 1)

      // The entry's history.state holds the instance's { model, loaded }.
      history.go(-1)
      const saved = Object.values(history.current().state as Record<string, { readonly snapshot: any }>)[0]
        .snapshot[path]
      assert.deepStrictEqual(saved.model, { clicks: 1, last: "Note 1" })
      assert.deepStrictEqual(saved.loaded.note.slice(0, 3), [`{"id":"1"}`, 0, "Note 1"])
      history.go(1)

      // As after a reload: a new Router and a cold cache, then back.
      yield* routed(Effect.gen(function*() {
        const root = yield* mount
        yield* TestHost.settle
        history.go(-1)
        yield* TestHost.settle
        // The restored slot shows at once, stale, while one refetch runs.
        assert.strictEqual(root.text(), "Note 1clicks 1")
        const log = root.log()
        const index = log.findIndex((entry) => entry._tag === "Mounted" && entry.path === path)
        assert.isTrue((log[index] as MessageLog.Mounted).adopted)
        const restored = log[index + 1]
        assert.isTrue(restored?._tag === "LoaderChanged" && restored.name === "note")
        assert.strictEqual(root.entry(app.GetNote, { id: "1" })?.fetch, "running")
        yield* TestClock.adjust("10 millis")
        yield* TestHost.settle
        assert.deepStrictEqual(root.fetches().map((fetch) => [fetch.read, fetch.trigger]), [["notes/GetNote", "watch"]])
        assert.strictEqual(app.server.calls, 2)
        assert.strictEqual(root.text(), "Note 1clicks 1")
        assert.deepStrictEqual(updates(log, path), [])
        click(root, "clicks 1")
        yield* TestHost.settle
        assert.strictEqual(root.text(), "Note 1clicks 2")
      }))
    })
  })

  it.effect("replays from the MessageLog with Story.fromLog, update reading the logged slots as $.loaded", () => {
    const app = makeApp()
    return run(
      app.GetNote.layer,
      Effect.gen(function*() {
        const root = yield* TestHost.mount(app.Note, { id: "1" })
        click(root, "clicks 0")
        yield* load
        click(root, "clicks 1")
        yield* TestHost.settle
        assert.deepStrictEqual(root.model(), { clicks: 2, last: "Note 1" })

        const replay = Story.fromLog(app.Note, root.log())
        assert.isUndefined(replay.divergence)
        assert.strictEqual(replay.replayed, 2)
        assert.deepStrictEqual(replay.model, { clicks: 2, last: "Note 1" })

        // Through the Wire: the slots are decoded with the loader's Schema.
        const encoder = MessageLog.makeEncoder()
        const wire = root.log().map(encoder.encode)
        const fromWire = Story.fromLog(app.Note, wire)
        assert.isUndefined(fromWire.divergence)
        assert.deepStrictEqual(fromWire.model, { clicks: 2, last: "Note 1" })

        // Without the LoaderChanged entries, update never sees the note, so the second click diverges.
        const withoutSlots = Story.fromLog(app.Note, root.log().filter((entry) => entry._tag !== "LoaderChanged"))
        assert.deepStrictEqual(withoutSlots.divergence?.recorded.model, { clicks: 2, last: "Note 1" })
        assert.deepStrictEqual(withoutSlots.divergence?.recomputed.model, { clicks: 2, last: "none" })
      })
    )
  })
})
