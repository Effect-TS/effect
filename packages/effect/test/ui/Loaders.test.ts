// @vitest-environment happy-dom
import { assert, describe, it } from "@effect/vitest"
import { Effect, Layer, Schema } from "effect"
import { AsyncResult, Loader } from "effect/reactivity"
import { TestClock } from "effect/testing"
import { Command, Component, Head, MessageLog, Route, Router } from "effect/ui"
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

  // Invalidates the note, so the loader refetches it while it keeps the old value.
  class Touch extends Command.Service<Touch>()(
    "notes/Touch",
    { args: { id: Schema.String }, invalidates: ({ id }) => [GetNote.entry({ id })] },
    Effect.succeed(() => Effect.void)
  ) {}

  const NoteMessage = Schema.TaggedUnion({ Click: {}, Touch: {}, Touched: {} })
  const touched = NoteMessage.make({ _tag: "Touched" })
  const Note = Component.define({
    name: "Note",
    props: Schema.Struct({ id: Schema.String }),
    model: Schema.Struct({ clicks: Schema.Number, last: Schema.String }),
    message: NoteMessage,
    elements: Html,
    loaders: {
      // An empty id disables the loader.
      note: { load: GetNote, args: (_model, props) => props.id === "" ? undefined : { id: props.id } }
    }
  }).make({
    init: () => ({ clicks: 0, last: "none" }),
    // What the loader holds when the click is handled, so a replay only reproduces it with the slots.
    update: (model, message, $) =>
      NoteMessage.match(message, {
        Click: () => ({
          clicks: model.clicks + 1,
          last: AsyncResult.isSuccess($.loaded.note)
            ? $.loaded.note.value + ($.loaded.note.waiting ? " (waiting)" : "")
            : "none"
        }),
        Touch: () =>
          $.run(
            Touch.make({ id: $.props.id }).pipe(Command.as(touched))
          ),
        Touched: () => model
      }),
    head: (_model, loaded) => [Head.title(AsyncResult.isSuccess(loaded.note) ? loaded.note.value : "Note")],
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
  const App = Component.define({
    name: "App",
    props: Schema.Struct({ route: AppRoute }),
    model: AppRoute,
    message: AppMessage,
    elements: Html
  }).make({
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

  // Passes its id to one Note under a fixed key, so a new id is new props, not a re-key.
  const ShellMessage = Schema.TaggedUnion({ SetId: { id: Schema.String } })
  const Shell = Component.define({
    name: "Shell",
    model: Schema.String,
    message: ShellMessage,
    elements: Html
  }).make({
    init: () => "1",
    update: (_id, message) => message.id,
    view: (id, h) => h.div(h.child(Note, { key: "note", props: { id } }))
  })
  const setId = (id: string) => ShellMessage.make({ _tag: "SetId", id })

  return {
    server,
    GetNote,
    Touch,
    Shell,
    setId,
    layer: Layer.mergeAll(GetNote.layer, Touch.layer),
    Note,
    NoteMessage,
    AppRoute,
    App
  }
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

/** The note a replay ends with, as `h.loaded.note` would show it. */
const noteOf = (replay: Story.Replay<any, any, any>) => {
  const note = replay.loaded().note as AsyncResult.AsyncResult<string, never>
  return AsyncResult.isSuccess(note) ? note.value : note._tag
}

/** The Note's Mounted entry, for its path under a parent. */
const noteMount = (log: ReadonlyArray<MessageLog.Entry>) =>
  log.find((entry): entry is MessageLog.Mounted => entry._tag === "Mounted" && entry.component.name === "Note")!

const updates = (log: ReadonlyArray<MessageLog.Entry>, path: string) =>
  log.filter((entry): entry is MessageLog.Update => entry._tag === "Update" && entry.path === path)

describe("a loader without onChange", { concurrent: false }, () => {
  it.effect("renders the loaded value, and update reads it through $.loaded", () => {
    const app = makeApp()
    return run(
      app.layer,
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
      Effect.provide(app.layer),
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
      run(Router.make({ routes: app.AppRoute, history }), effect.pipe(Effect.provide(app.layer)))
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
      app.layer,
      Effect.gen(function*() {
        const root = yield* TestHost.mount(app.Note, { id: "1" })
        click(root, "clicks 0")
        yield* load
        click(root, "clicks 1")
        yield* TestHost.settle
        click(root, "clicks 2")
        yield* TestHost.settle
        assert.deepStrictEqual(root.model(), { clicks: 3, last: "Note 1" })
        const log = root.log()

        const replay = Story.fromLog(app.Note, log)
        assert.isUndefined(replay.divergence)
        assert.strictEqual(replay.replayed, 3)
        assert.deepStrictEqual(replay.model, { clicks: 3, last: "Note 1" })

        // Through the Wire: each Update's slots are decoded with the loaders' Schemas.
        const encoder = MessageLog.makeEncoder()
        const fromWire = Story.fromLog(app.Note, log.map(encoder.encode))
        assert.isUndefined(fromWire.divergence)
        assert.deepStrictEqual(fromWire.model, { clicks: 3, last: "Note 1" })
      })
    )
  })

  it.effect("replays a bounded log whose slot writes were evicted", () => {
    const app = makeApp()
    return run(
      app.layer,
      Effect.gen(function*() {
        const root = yield* TestHost.mount(app.Note, { id: "1" })
        yield* load
        click(root, "clicks 0")
        yield* TestHost.settle
        click(root, "clicks 1")
        yield* TestHost.settle
        const log = root.log()
        // What a ring buffer keeps once Mounted and the slot's only LoaderChanged have been evicted.
        const first = log.findIndex((entry) => entry._tag === "Update" && entry.path === "/Note")
        const bounded = log.slice(first)
        assert.deepStrictEqual(loaderChanges(bounded, "/Note"), [])
        assert.strictEqual(updates(bounded, "/Note").length, 2)

        const replay = Story.fromLog(app.Note, bounded)
        assert.isUndefined(replay.divergence)
        assert.strictEqual(replay.replayed, 1)
        assert.deepStrictEqual(replay.model, { clicks: 2, last: "Note 1" })
        // The first Update's record gives the slots back, so the final state has the note.
        assert.strictEqual(noteOf(replay), "Note 1")
        const fromWire = Story.fromLog(app.Note, bounded.map(MessageLog.makeEncoder().encode))
        assert.isUndefined(fromWire.divergence)
        assert.deepStrictEqual(fromWire.model, { clicks: 2, last: "Note 1" })
        assert.strictEqual(noteOf(fromWire), "Note 1")
      })
    )
  })

  it.effect("replays an update that read a refetch in flight, live and through the Wire", () => {
    const app = makeApp()
    return run(
      app.layer,
      Effect.gen(function*() {
        const root = yield* TestHost.mount(app.Note, { id: "1" })
        yield* load
        root.send(app.NoteMessage.make({ _tag: "Touch" }))
        yield* TestHost.settle
        // The refetch is in flight: the slot keeps the value, waiting.
        click(root, "clicks 0")
        yield* TestHost.settle
        assert.deepStrictEqual(root.model(), { clicks: 1, last: "Note 1 (waiting)" })
        yield* load
        click(root, "clicks 1")
        yield* TestHost.settle
        assert.deepStrictEqual(root.model(), { clicks: 2, last: "Note 1" })
        assert.strictEqual(app.server.calls, 2)

        const log = root.log()
        const replay = Story.fromLog(app.Note, log)
        assert.isUndefined(replay.divergence)
        assert.deepStrictEqual(replay.model, { clicks: 2, last: "Note 1" })
        // Page state drops waiting, and the log's form keeps it.
        const fromWire = Story.fromLog(app.Note, log.map(MessageLog.makeEncoder().encode))
        assert.isUndefined(fromWire.divergence)
        assert.deepStrictEqual(fromWire.model, { clicks: 2, last: "Note 1" })
        assert.strictEqual(fromWire.replayed, 4)
      })
    )
  })

  it.effect("replay ends with the slots a load wrote after the last message, live and through the Wire", () => {
    const app = makeApp()
    return run(
      app.layer,
      Effect.gen(function*() {
        const root = yield* TestHost.mount(app.Note, { id: "1" })
        // Nothing is loaded yet: the replay ends with the slot empty.
        assert.strictEqual(noteOf(Story.fromLog(app.Note, root.log())), "Initial")
        click(root, "clicks 0")
        yield* TestHost.settle
        const before = Story.fromLog(app.Note, root.log())
        assert.strictEqual(noteOf(before), "Initial")
        yield* load
        assert.strictEqual(root.text(), "Note 1clicks 1")
        const log = root.log()
        assert.deepStrictEqual(log.filter((entry) => entry.path === "/Note").map((entry) => entry._tag).slice(-2), [
          "Update",
          "LoaderChanged"
        ])
        for (
          const replay of [
            Story.fromLog(app.Note, log),
            Story.fromLog(app.Note, log.map(MessageLog.makeEncoder().encode))
          ]
        ) {
          assert.isUndefined(replay.divergence)
          assert.strictEqual(replay.replayed, 1)
          assert.deepStrictEqual(replay.model, { clicks: 1, last: "none" })
          assert.deepStrictEqual(replay.props, { id: "1" })
          assert.strictEqual(noteOf(replay), "Note 1")
        }
      })
    )
  })

  it.effect("replay ends with a load that settled without any message", () => {
    const app = makeApp()
    return run(
      app.layer,
      Effect.gen(function*() {
        const root = yield* TestHost.mount(app.Note, { id: "1" })
        yield* load
        const replay = Story.fromLog(app.Note, root.log().map(MessageLog.makeEncoder().encode))
        assert.strictEqual(replay.replayed, 0)
        assert.strictEqual(noteOf(replay), "Note 1")
      })
    )
  })

  it.effect("a Mounted entry at the same path starts the slots over", () => {
    const app = makeApp()
    return Effect.gen(function*() {
      const first = yield* run(
        app.layer,
        Effect.gen(function*() {
          const root = yield* TestHost.mount(app.Note, { id: "1" })
          yield* load
          return root.log()
        })
      )
      // A second mount on a cold cache: the earlier session's slot isn't carried over.
      const second = yield* run(app.layer, Effect.map(TestHost.mount(app.Note, { id: "2" }), (root) => root.log()))
      const replay = Story.fromLog(app.Note, [...first, ...second])
      assert.strictEqual(noteOf(Story.fromLog(app.Note, first)), "Note 1")
      assert.strictEqual(noteOf(replay), "Initial")
      assert.deepStrictEqual(replay.props, { id: "2" })
    })
  })

  it.effect("replay follows props from the parent: a new id's load, then disabling the loader, live and through the Wire", () => {
    const app = makeApp()
    return run(
      app.layer,
      Effect.gen(function*() {
        const root = yield* TestHost.mount(app.Shell, {})
        yield* load
        assert.strictEqual(root.text(), "Note 1clicks 0")
        const path = noteMount(root.log()).path
        /** Both replays of the Note: from the live log, and from the Wire. */
        const replays = () => {
          const log = root.log()
          return [
            Story.fromLog(app.Note, log, { path }),
            Story.fromLog(app.Note, log.map(MessageLog.makeEncoder().encode), { path })
          ]
        }

        root.send(app.setId("2"))
        yield* load
        assert.strictEqual(root.text(), "Note 2clicks 0")
        // The props are logged before the slot write they cause.
        assert.deepStrictEqual(
          root.log().filter((entry) => entry.path === path).map((entry) => entry._tag).filter((tag) =>
            tag === "PropsChanged" || tag === "LoaderChanged"
          ),
          ["LoaderChanged", "PropsChanged", "LoaderChanged"]
        )
        for (const replay of replays()) {
          assert.isUndefined(replay.divergence)
          assert.strictEqual(replay.replayed, 0)
          assert.deepStrictEqual(replay.props, { id: "2" })
          assert.strictEqual(noteOf(replay), "Note 2")
        }

        // Disabling writes no slot: only the props show that the loader is off.
        root.send(app.setId(""))
        yield* load
        assert.strictEqual(root.text(), "loadingclicks 0")
        for (const replay of replays()) {
          assert.isUndefined(replay.divergence)
          assert.deepStrictEqual(replay.props, { id: "" })
          assert.strictEqual(noteOf(replay), "Initial")
        }
      })
    )
  })

  it.effect("a divergence returns the props and slots the diverging update read", () => {
    const app = makeApp()
    return run(
      app.layer,
      Effect.gen(function*() {
        const root = yield* TestHost.mount(app.Shell, {})
        yield* load
        root.send(app.setId("2"))
        yield* load
        click(root, "clicks 0")
        yield* TestHost.settle
        const path = noteMount(root.log()).path
        // A log without the PropsChanged entry, whose last Update records a Model that update doesn't compute.
        const tampered = root.log().filter((entry) => entry._tag !== "PropsChanged").map((entry) =>
          entry._tag === "Update" && entry.path === path ? { ...entry, model: { clicks: 9, last: "Note 2" } } : entry
        )
        for (
          const replay of [
            Story.fromLog(app.Note, tampered, { path }),
            Story.fromLog(app.Note, tampered.map(MessageLog.makeEncoder().encode), { path })
          ]
        ) {
          assert.deepStrictEqual(replay.divergence?.recomputed.model, { clicks: 1, last: "Note 2" })
          // The Model before the message, with the props and slots it was sent with.
          assert.deepStrictEqual(replay.model, { clicks: 0, last: "none" })
          assert.deepStrictEqual(replay.props, { id: "2" })
          assert.strictEqual(noteOf(replay), "Note 2")
        }
      })
    )
  })

  it("Story.head opens the loaders at the props it is given, with every slot empty", () => {
    const app = makeApp()
    // The loader's args read the props, so head needs them to open it.
    assert.deepStrictEqual(Story.head(app.Note, { clicks: 0, last: "none" }, { id: "1" }), [Head.title("Note")])
    const story = Story.start(app.Note, { id: "1" }).loaded("note", "Note 1").current
    assert.deepStrictEqual(Story.head(story), [Head.title("Note 1")])
  })
})
