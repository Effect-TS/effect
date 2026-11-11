import { assert, describe, it } from "@effect/vitest"
import { Effect, Layer, Option, Redacted, Schema } from "effect"
import { AsyncResult, Loader } from "effect/reactivity"
import { TestClock } from "effect/testing"
import { Command, Component, MessageLog } from "effect/ui"
import { Query, TestHost } from "effect/ui/testing"

const User = Schema.Struct({ id: Schema.String, name: Schema.String })

/** A fresh read, mutation and components per test: the db is closed over. */
const makeApp = (options?: {
  readonly staleTime?: "30 seconds" | 0 | "Infinity"
  readonly interval?: boolean
  readonly debounce?: "300 millis"
}) => {
  const db = { calls: 0, names: new Map<string, string>([["1", "Ann"], ["2", "Bea"]]) }
  const order: Array<string> = []

  class GetUser extends Loader.Service<GetUser>()(
    "users/GetUser",
    {
      args: { id: Schema.String },
      success: User,
      error: Schema.String,
      staleTime: options?.staleTime ?? "30 seconds",
      refetchInterval: options?.interval === true ? "5 seconds" : undefined
    },
    Effect.succeed(({ id }) =>
      Effect.gen(function*() {
        db.calls++
        yield* Effect.sleep("10 millis")
        const name = db.names.get(id)
        return name === undefined ? yield* Effect.fail("missing") : { id, name }
      })
    )
  ) {}

  class RenameUser extends Command.Service<RenameUser>()(
    "users/RenameUser",
    {
      args: { id: Schema.String, name: Schema.String },
      invalidates: ({ id }) => [GetUser.entry({ id })],
      optimistic: ({ id, name }) => [GetUser.patch({ id }, (user) => ({ ...user, name }))]
    },
    Effect.succeed(({ id, name }: { readonly id: string; readonly name: string }) =>
      Effect.gen(function*() {
        yield* Effect.sleep("10 millis")
        if (name === "") return yield* Effect.fail("empty")
        db.names.set(id, name)
        return name
      })
    )
  ) {}

  // An empty id disables the loader.
  const userArgs = (_model: unknown, props: { readonly id: string }) => props.id === "" ? undefined : { id: props.id }
  const CardMessage = Schema.TaggedUnion({
    UserChanged: { user: Loader.Snapshot(GetUser, "user") },
    Rename: { name: Schema.String },
    Renamed: {}
  })
  const Card = Component.make({
    name: "Card",
    props: Schema.Struct({ id: Schema.String, tag: Schema.String }),
    model: Schema.Struct({ user: Loader.Snapshot(GetUser, "user"), saving: Schema.Boolean }),
    message: CardMessage,
    loaders: {
      user: options?.debounce === undefined ? userArgs : Component.debounce(options.debounce, userArgs)
    },
    init: ($) => ({ ...$.empty, saving: false }),
    update: (model, message, $) =>
      CardMessage.match(message, {
        UserChanged: ({ user }) => {
          order.push(`update ${$.props.tag} UserChanged`)
          return { ...model, user }
        },
        Rename: ({ name }) => {
          order.push(`update ${$.props.tag} Rename`)
          return $.set({ ...model, saving: true }).run(
            RenameUser.make({ id: $.props.id, name }).pipe(Command.match({
              onSuccess: () => CardMessage.make({ _tag: "Renamed" }),
              onFailure: () => CardMessage.make({ _tag: "Renamed" })
            }))
          )
        },
        Renamed: () => ({ ...model, saving: false })
      }),
    subscriptions: (_model, _props, $) => [
      $.watch({ user: (user) => CardMessage.make({ _tag: "UserChanged", user }) })
    ],
    view: (model, h) => {
      const text = AsyncResult.match(h.loaded.user, {
        onInitial: (initial) =>
          Option.isSome(h.previous.user)
            ? `was ${h.previous.user.value.name}${initial.waiting ? "…" : ""}`
            : initial.waiting
            ? "loading"
            : "idle",
        // "~": the value includes an unconfirmed patch. "…": a fetch is in flight.
        onSuccess: (success) => success.value.name + (h.patched.user ? "~" : "") + (success.waiting ? "…" : ""),
        onFailure: () => "failed"
      })
      order.push(`view ${h.props.tag} ${text}${model.saving ? " saving" : ""}`)
      return h.el("p", `${h.props.tag}=${text}`).on("click", CardMessage.make({ _tag: "Rename", name: "Bob" }))
    }
  })

  /** A parent whose Model says which cards are mounted: "tag:id" each. */
  const ListMessage = Schema.TaggedUnion({ Set: { cards: Schema.Array(Schema.String) } })
  const List = Component.make({
    name: "List",
    props: Schema.Struct({ cards: Schema.Array(Schema.String) }),
    model: Schema.Array(Schema.String),
    message: ListMessage,
    init: ($) => $.props.cards,
    update: (_model, message) => message.cards,
    view: (cards, h) =>
      h.el(
        "div",
        cards.map((card) => {
          const [tag, id] = card.split(":")
          return h.child(Card, { key: tag, props: { id, tag } })
        })
      )
  })

  /** Calls `get` and `prefetch` from Commands, as an app would outside a loader field. */
  const ToolsMessage = Schema.TaggedUnion({
    Get: { id: Schema.String },
    Prefetch: { id: Schema.String },
    Got: { name: Schema.String }
  })
  class Load extends Command.Service<Load>()(
    "Load",
    { args: { id: Schema.String }, invalidates: () => [] },
    Effect.map(
      Effect.context<GetUser>(),
      (context) => ({ id }: { readonly id: string }) =>
        GetUser.get({ id }).pipe(Effect.map((user) => user.name), Effect.provide(context))
    )
  ) {}
  class Warm extends Command.Service<Warm>()(
    "Warm",
    { args: { id: Schema.String }, invalidates: () => [] },
    Effect.map(
      Effect.context<GetUser>(),
      (context) => ({ id }: { readonly id: string }) => GetUser.prefetch({ id }).pipe(Effect.provide(context))
    )
  ) {}
  const got = (name: string) => ToolsMessage.make({ _tag: "Got", name })
  const Tools = Component.make({
    name: "Tools",
    model: Schema.String,
    message: ToolsMessage,
    init: () => "",
    update: (model, message, $) =>
      ToolsMessage.match(message, {
        Get: ({ id }) =>
          $.set(model).run(Load.make({ id }).pipe(Command.match({ onSuccess: got, onFailure: () => got("failed") }))),
        Prefetch: ({ id }) => $.set(model).run(Warm.make({ id }).pipe(Command.map(() => got("prefetched")))),
        Got: ({ name }) => name
      }),
    view: (model, h) => h.el("p", model)
  })

  return {
    db,
    order,
    GetUser,
    RenameUser,
    CardMessage,
    Card,
    List,
    ListMessage,
    Tools,
    ToolsMessage,
    layer: Layer.mergeAll(RenameUser.layer, Load.layer, Warm.layer).pipe(Layer.provideMerge(GetUser.layer))
  }
}

/** Runs a test on a fresh TestHost, with the app's reads and Commands built for the whole test. */
const run = <A, E>(layer: Layer.Layer<any>, effect: Effect.Effect<A, E, any>) =>
  effect.pipe(Effect.provide(layer), Effect.scoped, Effect.provide(TestHost.layer())) as Effect.Effect<A, E>

/** Starts what is due and lets the fetches finish: each fetcher sleeps 10 ms. */
const load = TestHost.settle.pipe(Effect.andThen(TestClock.adjust("10 millis")), Effect.andThen(TestHost.settle))

type Root = Pick<TestHost.TestRoot<any, any, any>, "fetches">
const triggers = (root: Root) => root.fetches().map((fetch) => fetch.trigger)

describe("Loaded", () => {
  it.effect("a loader field opens as Initial(waiting), then Success, from one fetch the watch started", () => {
    const app = makeApp()
    return run(
      app.layer,
      Effect.gen(function*() {
        const root = yield* TestHost.mount(app.Card, { id: "1", tag: "a" })
        assert.strictEqual(root.text(), "a=loading")
        yield* TestHost.settle
        yield* TestClock.adjust("10 millis")
        // The clock wake drained the scheduler: no settle needed.
        assert.strictEqual(root.text(), "a=Ann")
        assert.deepStrictEqual(root.fetches().map((f) => [f.read, f.logKey, f.trigger]), [[
          "users/GetUser",
          "{\"id\":\"1\"}",
          "watch"
        ]])
        assert.deepStrictEqual(root.frames(), ["a=loading", "a=Ann"])
        const entry = root.entry(app.GetUser, { id: "1" })!
        assert.strictEqual(entry.watchers, 1)
        assert.isTrue(AsyncResult.isSuccess(entry.stored))
      })
    )
  })

  it.effect("debounce: a burst of args changes shows the previous value, then fetches the last args once", () => {
    const app = makeApp({ debounce: "300 millis" })
    const set = (...cards: Array<string>) => app.ListMessage.make({ _tag: "Set", cards })
    return run(
      app.layer,
      Effect.gen(function*() {
        const root = yield* TestHost.mount(app.List, { cards: ["a:1"] })
        // The first args at mount don't wait.
        yield* load
        assert.strictEqual(root.text(), "a=Ann")
        for (const id of ["2", "3", "2"]) {
          root.send(set(`a:${id}`))
          yield* TestHost.settle
          yield* TestClock.adjust("100 millis")
        }
        // Initial, waiting, with the old value as previous.
        assert.strictEqual(root.text(), "a=was Ann…")
        assert.strictEqual(app.db.calls, 1)
        // 300 ms after the last change.
        yield* TestClock.adjust("200 millis")
        yield* load
        assert.strictEqual(root.text(), "a=Bea")
        assert.deepStrictEqual(root.fetches().map((fetch) => fetch.logKey), ["{\"id\":\"1\"}", "{\"id\":\"2\"}"])
      })
    )
  })

  it.effect("debounce: args whose entry is fresh, and a disabled loader, don't wait", () => {
    const app = makeApp({ debounce: "300 millis" })
    const set = (...cards: Array<string>) => app.ListMessage.make({ _tag: "Set", cards })
    return run(
      app.layer,
      Effect.gen(function*() {
        const root = yield* TestHost.mount(app.List, { cards: ["a:1", "b:2"] })
        yield* load
        // b leaves, so a moves onto a fresh entry nothing watches.
        root.send(set("a:2"))
        yield* TestHost.settle
        assert.strictEqual(root.text(), "a=Bea")
        root.send(set("a:"))
        yield* TestHost.settle
        assert.strictEqual(root.text(), "a=idle")
        assert.strictEqual(app.db.calls, 2)
      })
    )
  })

  it.effect("$.empty opens a disabled loader as Initial, not waiting, and nothing is fetched", () => {
    const app = makeApp()
    return run(
      app.layer,
      Effect.gen(function*() {
        const root = yield* TestHost.mount(app.Card, { id: "", tag: "a" })
        yield* load
        assert.strictEqual(root.text(), "a=idle")
        assert.deepStrictEqual(root.fetches(), [])
        assert.strictEqual(app.db.calls, 0)
        assert.isUndefined(root.entry(app.GetUser, { id: "" }))
      })
    )
  })

  it.effect("two instances share one fetch", () => {
    const app = makeApp()
    return run(
      app.layer,
      Effect.gen(function*() {
        const root = yield* TestHost.mount(app.List, { cards: ["a:1", "b:1"] })
        yield* load
        assert.strictEqual(root.text(), "a=Annb=Ann")
        assert.strictEqual(app.db.calls, 1)
        assert.strictEqual(root.entry(app.GetUser, { id: "1" })?.watchers, 2)
      })
    )
  })

  it.effect("watch: a swap on a stale shared entry is a zero-to-one and refetches; a joining child doesn't", () => {
    const app = makeApp()
    return run(
      app.layer,
      Effect.gen(function*() {
        const root = yield* TestHost.mount(app.List, { cards: ["a:1"] })
        yield* load
        yield* TestClock.adjust("31 seconds")
        assert.isTrue(root.entry(app.GetUser, { id: "1" })?.stale)
        // A child joining a watched stale entry starts nothing.
        root.send(app.ListMessage.make({ _tag: "Set", cards: ["a:1", "c:1"] }))
        yield* load
        assert.strictEqual(root.text(), "a=Annc=Ann")
        assert.strictEqual(app.db.calls, 1)
        root.send(app.ListMessage.make({ _tag: "Set", cards: ["a:1"] }))
        yield* TestHost.settle
        // a -> b: the new instance is created before the old one is destroyed, and the count still passes through zero.
        root.send(app.ListMessage.make({ _tag: "Set", cards: ["b:1"] }))
        yield* TestHost.settle
        assert.strictEqual(root.entry(app.GetUser, { id: "1" })?.watchers, 1)
        assert.deepStrictEqual(triggers(root), ["watch", "watch"])
        // Stale data shows at once, waiting.
        assert.strictEqual(root.text(), "b=Ann…")
        yield* load
        assert.strictEqual(root.text(), "b=Ann")
        assert.strictEqual(app.db.calls, 2)
      })
    )
  })

  it.effect("watch: the pre-pass releases a removal below a kept element before a sibling element creates its watcher", () => {
    const app = makeApp()
    // Two kept sections: the second loses the old card as the first gains a new one on the same entry.
    const Sections = Component.make({
      name: "Sections",
      model: Schema.Boolean,
      message: Schema.Boolean,
      init: () => false,
      update: (_model, message) => message,
      view: (swapped, h) =>
        h.el(
          "div",
          h.el("section", swapped ? [h.child(app.Card, { key: "new", props: { id: "1", tag: "n" } })] : []),
          h.el("section", swapped ? [] : [h.child(app.Card, { key: "old", props: { id: "1", tag: "o" } })])
        )
    })
    return run(
      app.layer,
      Effect.gen(function*() {
        const root = yield* TestHost.mount(Sections, {})
        yield* load
        yield* TestClock.adjust("31 seconds")
        root.send(true)
        yield* TestHost.settle
        assert.deepStrictEqual(triggers(root), ["watch", "watch"])
        assert.strictEqual(root.entry(app.GetUser, { id: "1" })?.watchers, 1)
        assert.strictEqual(root.text(), "n=Ann…")
        yield* load
        assert.strictEqual(app.db.calls, 2)
      })
    )
  })

  it.effect("watch: a kept child's new args release its old entry before a new sibling watches it", () => {
    const app = makeApp()
    return run(
      app.layer,
      Effect.gen(function*() {
        const root = yield* TestHost.mount(app.List, { cards: ["a:1"] })
        yield* load
        yield* TestClock.adjust("31 seconds")
        // b is created first in document order, and a, kept, moves from 1 to 2 after it.
        root.send(app.ListMessage.make({ _tag: "Set", cards: ["b:1", "a:2"] }))
        yield* TestHost.settle
        assert.deepStrictEqual(root.fetches().map((fetch) => [fetch.logKey, fetch.trigger]), [
          ["{\"id\":\"1\"}", "watch"],
          ["{\"id\":\"1\"}", "watch"],
          ["{\"id\":\"2\"}", "watch"]
        ])
        assert.strictEqual(root.entry(app.GetUser, { id: "1" })?.watchers, 1)
        yield* load
        assert.strictEqual(root.text(), "b=Anna=Bea")
      })
    )
  })

  it.effect("watch: a removal inside a kept child's re-render counts as it would if the child were inlined", () => {
    const app = makeApp()
    // The second section of the two-section test, extracted into a component.
    const Shell = Component.make({
      name: "Shell",
      props: Schema.Struct({ show: Schema.Boolean }),
      model: Schema.Null,
      message: Schema.Never,
      init: () => null,
      update: (model) => model,
      view: (_model, h) =>
        h.el("div", h.props.show ? [h.child(app.Card, { key: "old", props: { id: "1", tag: "o" } })] : [])
    })
    const Page = Component.make({
      name: "Page",
      model: Schema.Boolean,
      message: Schema.Boolean,
      init: () => false,
      update: (_model, message) => message,
      view: (swapped, h) =>
        h.el(
          "div",
          h.el("section", swapped ? [h.child(app.Card, { key: "new", props: { id: "1", tag: "n" } })] : []),
          h.child(Shell, { key: "shell", props: { show: !swapped } })
        )
    })
    return run(
      app.layer,
      Effect.gen(function*() {
        const root = yield* TestHost.mount(Page, {})
        yield* load
        yield* TestClock.adjust("31 seconds")
        root.send(true)
        yield* TestHost.settle
        assert.deepStrictEqual(triggers(root), ["watch", "watch"])
        assert.strictEqual(root.entry(app.GetUser, { id: "1" })?.watchers, 1)
        assert.strictEqual(root.text(), "n=Ann…")
        // The waiting value renders in the pass that decided the fetch: no frame shows it settled.
        assert.deepStrictEqual(root.frames(), ["o=loading", "o=Ann", "n=Ann…"])
        yield* load
        assert.strictEqual(app.db.calls, 2)
      })
    )
  })

  it.effect("watch: a kept child moving onto a stale entry that a later sibling leaves is a zero-to-one", () => {
    const app = makeApp()
    return run(
      app.layer,
      Effect.gen(function*() {
        const root = yield* TestHost.mount(app.List, { cards: ["a:2", "b:1"] })
        yield* load
        yield* TestClock.adjust("31 seconds")
        // a, kept and first, re-keys to 1 before b, which watched 1, is removed.
        root.send(app.ListMessage.make({ _tag: "Set", cards: ["a:1"] }))
        yield* TestHost.settle
        assert.deepStrictEqual(root.fetches().map((fetch) => fetch.logKey).slice(2), ["{\"id\":\"1\"}"])
        assert.strictEqual(root.entry(app.GetUser, { id: "1" })?.watchers, 1)
        assert.strictEqual(root.text(), "a=Ann…")
        yield* load
        assert.strictEqual(app.db.calls, 3)
      })
    )
  })

  /** Watches user `id`, and records each message's result as "tag Tag:waiting". */
  const makeWatcher = (app: ReturnType<typeof makeApp>, messages: Array<string>) => {
    const WatchMessage = Schema.TaggedUnion({
      Changed: { user: Loader.Snapshot(app.GetUser, "user"), state: Schema.String }
    })
    return Component.make({
      name: "Watcher",
      props: Schema.Struct({ id: Schema.String, tag: Schema.String }),
      model: Schema.Struct({ user: Loader.Snapshot(app.GetUser, "user") }),
      message: WatchMessage,
      loaders: { user: (_model, props) => ({ id: props.id }) },
      init: ($) => $.empty,
      update: (_model, message, $) => {
        messages.push(`${$.props.tag} ${message.state}`)
        return { user: message.user }
      },
      subscriptions: (_model, _props, $) => [
        $.watch({
          user: (user, result) =>
            WatchMessage.make({ _tag: "Changed", user, state: `${result._tag}:${result.waiting}` })
        })
      ],
      view: (_model, h) => h.el("p", `${h.props.tag}=${h.loaded.user._tag}:${h.loaded.user.waiting}`)
    })
  }

  it.effect("watch: a swap off a bare Failure clears it whether the old watcher is inlined or in a kept child", () => {
    const swap = (extracted: boolean) => {
      const app = makeApp()
      const messages: Array<string> = []
      const Watcher = makeWatcher(app, messages)
      const Shell = Component.make({
        name: "Shell",
        props: Schema.Struct({ show: Schema.Boolean }),
        model: Schema.Null,
        message: Schema.Never,
        init: () => null,
        update: (model) => model,
        view: (_model, h) =>
          h.el("div", h.props.show ? [h.child(Watcher, { key: "old", props: { id: "9", tag: "o" } })] : [])
      })
      const Page = Component.make({
        name: "Page",
        model: Schema.Boolean,
        message: Schema.Boolean,
        init: () => false,
        update: (_model, message) => message,
        view: (swapped, h) =>
          h.el(
            "div",
            h.el("section", swapped ? [h.child(Watcher, { key: "new", props: { id: "9", tag: "n" } })] : []),
            extracted
              ? h.child(Shell, { key: "shell", props: { show: !swapped } })
              : h.el("div", swapped ? [] : [h.child(Watcher, { key: "old", props: { id: "9", tag: "o" } })])
          )
      })
      return run(
        app.layer,
        Effect.gen(function*() {
          const root = yield* TestHost.mount(Page, {})
          // User 9 doesn't exist: a bare Failure.
          yield* load
          messages.length = 0
          root.send(true)
          yield* TestHost.settle
          const swapped = {
            messages: messages.slice(),
            text: root.text(),
            stored: root.entry(app.GetUser, { id: "9" })?.stored._tag,
            triggers: triggers(root)
          }
          yield* load
          return { swapped, settled: messages.slice(), frames: root.frames() }
        })
      )
    }
    return Effect.gen(function*() {
      const expected = {
        // The new watcher never sees the old Failure, and its view shows loading.
        swapped: {
          messages: [],
          text: "n=Initial:true",
          stored: "Initial" as const,
          triggers: ["watch", "watch"] as Array<Loader.Trigger>
        },
        settled: ["n Failure:false"],
        frames: ["o=Initial:true", "o=Failure:false", "n=Initial:true", "n=Failure:false"]
      }
      assert.deepStrictEqual(yield* swap(false), expected)
      assert.deepStrictEqual(yield* swap(true), expected)
    })
  })

  it.effect("watch: a bare Failure stored while a pass is open, or in an earlier one, is withheld in either layout", () => {
    const swap = (timing: "this pass" | "an earlier pass", extracted: boolean) => {
      // The fetcher waits for the test to finish it.
      const finish = new Map<string, (effect: Effect.Effect<string, string>) => void>()
      const messages: Array<string> = []
      class Read extends Loader.Service<Read>()(
        "test/Read",
        { args: { id: Schema.String }, success: Schema.String, error: Schema.String, staleTime: "1 second" },
        Effect.succeed(({ id }) => Effect.callback<string, string>((resume) => void finish.set(id, resume)))
      ) {}
      const Message = Schema.TaggedUnion({ Changed: { data: Loader.Snapshot(Read, "data"), state: Schema.String } })
      const Watcher = Component.make({
        name: "Watcher",
        props: Schema.Struct({ tag: Schema.String }),
        model: Schema.Struct({ data: Loader.Snapshot(Read, "data") }),
        message: Message,
        loaders: { data: () => ({ id: "fail" }) },
        init: ($) => $.empty,
        update: (_model, message, $) => {
          messages.push(`${$.props.tag} ${message.state}`)
          return { data: message.data }
        },
        subscriptions: (_model, _props, $) => [
          $.watch({
            data: (data, result) => Message.make({ _tag: "Changed", data, state: `${result._tag}:${result.waiting}` })
          })
        ],
        view: (_model, h) => h.el("p", `${h.props.tag}=${h.loaded.data._tag}:${h.loaded.data.waiting}`)
      })
      const Shell = Component.make({
        name: "Shell",
        props: Schema.Struct({ show: Schema.Boolean }),
        model: Schema.Null,
        message: Schema.Never,
        init: () => null,
        update: (model) => model,
        view: (_model, h) => h.el("div", h.props.show ? [h.child(Watcher, { key: "old", props: { tag: "o" } })] : [])
      })
      const PageMessage = Schema.TaggedUnion({
        Changed: { other: Loader.Snapshot(Read, "other") },
        Enable: {},
        Swap: {}
      })
      const Page = Component.make({
        name: "Page",
        model: Schema.Struct({
          other: Loader.Snapshot(Read, "other"),
          enabled: Schema.Boolean,
          swapped: Schema.Boolean
        }),
        message: PageMessage,
        loaders: { other: (model) => model.enabled ? { id: "other" } : undefined },
        init: ($) => ({ ...$.empty, enabled: false, swapped: false }),
        update: (model, message) =>
          PageMessage.match(message, {
            Changed: ({ other }) => ({ ...model, other }),
            Enable: () => ({ ...model, enabled: true }),
            Swap: () => ({ ...model, swapped: true })
          }),
        subscriptions: (
          _model,
          _props,
          $
        ) => [$.watch({ other: (other) => PageMessage.make({ _tag: "Changed", other }) })],
        view: (model, h) =>
          h.el(
            "div",
            h.el("section", model.swapped ? [h.child(Watcher, { key: "new", props: { tag: "n" } })] : []),
            extracted
              ? h.child(Shell, { key: "shell", props: { show: !model.swapped } })
              : h.el("div", model.swapped ? [] : [h.child(Watcher, { key: "old", props: { tag: "o" } })])
          )
      })
      return run(
        Read.layer,
        Effect.gen(function*() {
          const root = yield* TestHost.mount(Page, {})
          yield* TestHost.settle
          // An unrelated loader opens a pass, and the old watcher's fetch fails while it is open.
          root.send(PageMessage.make({ _tag: "Enable" }))
          finish.get("fail")!(Effect.fail("missing"))
          if (timing === "an earlier pass") yield* TestHost.settle
          messages.length = 0
          root.send(PageMessage.make({ _tag: "Swap" }))
          yield* TestHost.settle
          return {
            messages,
            text: root.text(),
            frames: root.frames(),
            stored: root.entry(Read, { id: "fail" })?.stored._tag,
            fetches: root.fetches().map((fetch) => `${fetch.trigger} ${fetch.logKey}`)
          }
        })
      )
    }
    return Effect.gen(function*() {
      for (const timing of ["this pass", "an earlier pass"] as const) {
        const expected = {
          // The new watcher never sees the Failure: it is dropped and refetched.
          messages: [],
          text: "n=Initial:true",
          frames: timing === "this pass"
            ? ["o=Initial:true", "n=Initial:true"]
            : ["o=Initial:true", "o=Failure:false", "n=Initial:true"],
          stored: "Initial" as const,
          fetches: ["watch {\"id\":\"fail\"}", "watch {\"id\":\"other\"}", "watch {\"id\":\"fail\"}"]
        }
        assert.deepStrictEqual(yield* swap(timing, false), expected, `${timing}, inlined`)
        assert.deepStrictEqual(yield* swap(timing, true), expected, `${timing}, extracted`)
      }
    })
  })

  it.effect("watch: joining a bare Failure delivers it in the pass that registered, so no loading frame commits", () => {
    const app = makeApp()
    const messages: Array<string> = []
    const Watcher = makeWatcher(app, messages)
    const Pair = Component.make({
      name: "Pair",
      model: Schema.Boolean,
      message: Schema.Boolean,
      init: () => false,
      update: (_model, message) => message,
      view: (joined, h) =>
        h.el(
          "div",
          h.child(Watcher, { key: "a", props: { id: "9", tag: "a" } }),
          joined ? [h.child(Watcher, { key: "b", props: { id: "9", tag: "b" } })] : []
        )
    })
    return run(
      app.layer,
      Effect.gen(function*() {
        const root = yield* TestHost.mount(Pair, {})
        yield* load
        messages.length = 0
        root.send(true)
        yield* TestHost.settle
        assert.deepStrictEqual(messages, ["b Failure:false"])
        assert.strictEqual(root.text(), "a=Failure:falseb=Failure:false")
        assert.deepStrictEqual(root.frames(), [
          "a=Initial:true",
          "a=Failure:false",
          "a=Failure:falseb=Failure:false"
        ])
        // A join never refetches.
        assert.deepStrictEqual(triggers(root), ["watch"])
        assert.strictEqual(root.entry(app.GetUser, { id: "9" })?.watchers, 2)
      })
    )
  })

  it.effect("a kept child's warm re-key emits through the onEmit of the view that re-keyed it", () => {
    const app = makeApp()
    const EmitterMessage = Schema.TaggedUnion({ UserChanged: { user: Loader.Snapshot(app.GetUser, "user") } })
    const Emitter = Component.make({
      name: "Emitter",
      props: Schema.Struct({ id: Schema.String }),
      model: Schema.Struct({ user: Loader.Snapshot(app.GetUser, "user") }),
      message: EmitterMessage,
      events: Schema.String,
      loaders: { user: (_model, props) => ({ id: props.id }) },
      init: ($) => $.empty,
      update: (_model, message, $) => $.set({ user: message.user }).emit($.props.id),
      subscriptions: (
        _model,
        _props,
        $
      ) => [$.watch({ user: (user) => EmitterMessage.make({ _tag: "UserChanged", user }) })],
      view: (_model, h) => h.el("p", "emitter")
    })
    const ParentMessage = Schema.TaggedUnion({ Switch: {}, Noted: { label: Schema.String } })
    const Parent = Component.make({
      name: "Parent",
      model: Schema.Struct({ switched: Schema.Boolean, labels: Schema.Array(Schema.String) }),
      message: ParentMessage,
      init: () => ({ switched: false, labels: [] }),
      update: (model, message) =>
        message._tag === "Switch"
          ? { ...model, switched: true }
          : { ...model, labels: [...model.labels, message.label] },
      view: (model, h) =>
        h.el(
          "div",
          // Keeps user 2 warm.
          h.child(app.Card, { key: "warm", props: { id: "2", tag: "w" } }),
          h.child(Emitter, {
            key: "emitter",
            props: { id: model.switched ? "2" : "1" },
            onEmit: (id) => ParentMessage.make({ _tag: "Noted", label: (model.switched ? "new " : "old ") + id })
          })
        )
    })
    return run(
      app.layer,
      Effect.gen(function*() {
        const root = yield* TestHost.mount(Parent, {})
        yield* load
        root.send(ParentMessage.make({ _tag: "Switch" }))
        yield* TestHost.settle
        assert.deepStrictEqual(root.model()?.labels, ["old 1", "new 2"])
      })
    )
  })

  it.effect("a failed instance drops its watchers before its Command cleanup ends, so its fallback refetches", () => {
    const app = makeApp()
    // Stopping it takes 10 seconds of uninterruptible cleanup.
    let cleaned = false
    const cleanup = Effect.sleep("10 seconds").pipe(Effect.andThen(Effect.sync(() => {
      cleaned = true
    })))
    const Hold = Command.make(
      "Hold",
      { args: {} },
      () => Effect.never.pipe(Effect.ensuring(Effect.uninterruptible(cleanup)))
    )
    const BadMessage = Schema.TaggedUnion({ UserChanged: { user: Loader.Snapshot(app.GetUser, "user") }, Crash: {} })
    const Bad = Component.make({
      name: "Bad",
      model: Schema.Struct({ user: Loader.Snapshot(app.GetUser, "user") }),
      message: BadMessage,
      loaders: { user: () => ({ id: "1" }) },
      init: ($) => $.set($.empty).run(Hold()),
      update: (model, message) => {
        if (message._tag === "Crash") throw new Error("crash")
        return { ...model, user: message.user }
      },
      subscriptions: (
        _model,
        _props,
        $
      ) => [$.watch({ user: (user) => BadMessage.make({ _tag: "UserChanged", user }) })],
      view: (_model, h) => h.el("p", "bad").on("click", BadMessage.make({ _tag: "Crash" }))
    })
    const Host = Component.make({
      name: "Host",
      model: Schema.Null,
      message: Schema.Never,
      init: () => null,
      update: (model) => model,
      view: (_model, h) =>
        h.child(Bad, {
          key: "bad",
          fallback: () => h.child(app.Card, { key: "fallback", props: { id: "1", tag: "f" } })
        })
    })
    return run(
      app.layer,
      Effect.gen(function*() {
        const root = yield* TestHost.mount(Host, {})
        yield* load
        yield* TestClock.adjust("31 seconds")
        Query.fire(root.get(Query.text("bad", { exact: true })), "click")
        yield* TestHost.settle
        // Hold is still cleaning up, and the fallback's watch was a zero-to-one. Read now and checked
        // after the cleanup, so a failure doesn't leave the close waiting on the clock.
        const during = {
          cleaned,
          watchers: root.entry(app.GetUser, { id: "1" })?.watchers,
          triggers: triggers(root),
          text: root.text()
        }
        yield* TestClock.adjust("10 seconds")
        assert.deepStrictEqual(during, { cleaned: false, watchers: 1, triggers: ["watch", "watch"], text: "f=Ann…" })
        assert.isTrue(cleaned)
        assert.strictEqual(root.text(), "f=Ann")
        assert.strictEqual(root.entry(app.GetUser, { id: "1" })?.watchers, 1)
      })
    )
  })

  it.effect("settle waits for a resolved Promise while an interval sleeps on the clock", () => {
    const app = makeApp({ interval: true })
    const PollMessage = Schema.TaggedUnion({
      UserChanged: { user: Loader.Snapshot(app.GetUser, "user") },
      Go: {},
      Done: {}
    })
    const Go = Command.make(
      "Go",
      { args: {} },
      () => Effect.promise(() => Promise.resolve(PollMessage.make({ _tag: "Done" })))
    )
    const Poll = Component.make({
      name: "Poll",
      model: Schema.Struct({ user: Loader.Snapshot(app.GetUser, "user"), done: Schema.Boolean }),
      message: PollMessage,
      loaders: { user: () => ({ id: "1" }) },
      init: ($) => ({ ...$.empty, done: false }),
      update: (model, message, $) =>
        PollMessage.match(message, {
          UserChanged: ({ user }) => ({ ...model, user }),
          Go: () => $.set(model).run(Go()),
          Done: () => ({ ...model, done: true })
        }),
      subscriptions: (
        _model,
        _props,
        $
      ) => [$.watch({ user: (user) => PollMessage.make({ _tag: "UserChanged", user }) })],
      view: (model, h) => h.el("p", model.done ? "done" : "not yet")
    })
    return run(
      app.layer,
      Effect.gen(function*() {
        const root = yield* TestHost.mount(Poll, {})
        yield* load
        root.send(PollMessage.make({ _tag: "Go" }))
        yield* TestHost.settle
        assert.strictEqual(root.text(), "done")
        assert.deepStrictEqual(root.pending(), [])
      })
    )
  })

  it.effect("mounting or re-keying onto an entry the cache holds never renders loading", () => {
    const app = makeApp()
    return run(
      app.layer,
      Effect.gen(function*() {
        const root = yield* TestHost.mount(app.List, { cards: ["a:1", "b:2"] })
        yield* load
        app.order.length = 0
        // A new instance on user 1, and card b re-keyed from user 2 to user 1.
        root.send(app.ListMessage.make({ _tag: "Set", cards: ["a:1", "c:1", "b:1"] }))
        yield* TestHost.settle
        // Each folds the cache's value through update before its first render.
        assert.deepStrictEqual(app.order, ["update c UserChanged", "view c Ann", "update b UserChanged", "view b Ann"])
        assert.strictEqual(root.text(), "a=Annc=Annb=Ann")
        assert.strictEqual(app.db.calls, 2)
      })
    )
  })

  it.effect("a Command issued by the folded first emission starts after init's, and after the first render", () => {
    const app = makeApp()
    const seen: Array<string> = []
    const Message = Schema.TaggedUnion({ UserChanged: { user: Loader.Snapshot(app.GetUser, "user") }, Noted: {} })
    const Note = Command.make("Note", { args: { text: Schema.String } }, ({ text }) =>
      Effect.sync(() => {
        seen.push(`command ${text}`)
        return Message.make({ _tag: "Noted" })
      }))
    const Noter = Component.make({
      name: "Noter",
      model: Schema.Struct({ user: Loader.Snapshot(app.GetUser, "user") }),
      message: Message,
      loaders: { user: () => ({ id: "1" }) },
      init: ($) => $.set($.empty).run(Note({ text: "init" })),
      update: (model, message, $) =>
        Message.match(message, {
          UserChanged: ({ user }) => {
            seen.push("update UserChanged")
            return $.set({ user }).run(Note({ text: "fold" }))
          },
          Noted: () => model
        }),
      subscriptions: (
        _model,
        _props,
        $
      ) => [$.watch({ user: (user) => Message.make({ _tag: "UserChanged", user }) })],
      view: (_model, h) => {
        seen.push(`view ${h.loaded.user._tag}`)
        return h.el("i", "noter")
      }
    })
    const Host = Component.make({
      name: "Host",
      model: Schema.Boolean,
      message: Schema.Boolean,
      init: () => false,
      update: (_model, message) => message,
      view: (show, h) =>
        h.el("div", h.child(app.Card, { key: "a", props: { id: "1", tag: "a" } }), show && h.child(Noter, { key: "n" }))
    })
    return run(
      app.layer,
      Effect.gen(function*() {
        const root = yield* TestHost.mount(Host, {})
        yield* load
        root.send(true)
        yield* TestHost.settle
        assert.deepStrictEqual(seen, [
          "update UserChanged",
          "view Success",
          "command init",
          "command fold",
          "view Success"
        ])
      })
    )
  })

  it.effect("the watcher count drops when instances unmount and when the root closes", () => {
    const app = makeApp()
    return run(
      app.layer,
      Effect.gen(function*() {
        const root = yield* Effect.scoped(Effect.gen(function*() {
          const root = yield* TestHost.mount(app.List, { cards: ["a:1", "b:2"] })
          yield* load
          root.send(app.ListMessage.make({ _tag: "Set", cards: ["a:1"] }))
          yield* TestHost.settle
          assert.strictEqual(root.entry(app.GetUser, { id: "1" })?.watchers, 1)
          assert.strictEqual(root.entry(app.GetUser, { id: "2" })?.watchers, 0)
          return root
        }))
        assert.strictEqual(root.entry(app.GetUser, { id: "1" })?.watchers ?? 0, 0)
      })
    )
  })

  it.effect("invalidation: an optimistic patch reaches a second watching instance before the flush that renders the issuing update", () => {
    const app = makeApp()
    return run(
      app.layer,
      Effect.gen(function*() {
        const root = yield* TestHost.mount(app.List, { cards: ["a:1", "b:1"] })
        yield* load
        app.order.length = 0
        Query.fire(root.get(Query.text("a=Ann", { exact: true })), "click")
        yield* TestHost.settle
        // Both instances fold the patched snapshot before the one flush that renders the issuing update.
        assert.deepStrictEqual(app.order, [
          "update a Rename",
          "update a UserChanged",
          "update b UserChanged",
          "view a Bob~ saving",
          "view b Bob~"
        ])
        // A live patch is patched, not waiting.
        assert.strictEqual(root.text(), "a=Bob~b=Bob~")
        yield* TestClock.adjust("10 millis")
        // The run succeeded. Through the confirming refetch the patch is held: patched and waiting.
        assert.strictEqual(root.text(), "a=Bob~…b=Bob~…")
        yield* load
        assert.strictEqual(root.text(), "a=Bobb=Bob")
        assert.deepStrictEqual(triggers(root), ["watch", "invalidation"])
        assert.deepStrictEqual(root.entry(app.GetUser, { id: "1" })?.patches, { live: 0, held: 0 })
      })
    )
  })

  it.effect("a failed mutation takes its patch back and still invalidates", () => {
    const app = makeApp()
    return run(
      app.layer,
      Effect.gen(function*() {
        const root = yield* TestHost.mount(app.Card, { id: "1", tag: "a" })
        yield* load
        root.send(app.CardMessage.make({ _tag: "Rename", name: "" }))
        yield* TestHost.settle
        assert.strictEqual(root.text(), "a=~")
        yield* TestClock.adjust("10 millis")
        // The patch is gone, and the refetch a failure also asks for is in flight.
        assert.deepStrictEqual(root.entry(app.GetUser, { id: "1" })?.patches, { live: 0, held: 0 })
        assert.strictEqual(root.text(), "a=Ann…")
        yield* load
        assert.strictEqual(root.text(), "a=Ann")
        assert.deepStrictEqual(triggers(root), ["watch", "invalidation"])
      })
    )
  })

  it.effect("visibility: an edge refetches a stale watched entry, and nothing fetches while hidden", () => {
    const app = makeApp()
    return run(
      app.layer,
      Effect.gen(function*() {
        const root = yield* TestHost.mount(app.Card, { id: "1", tag: "a" })
        yield* load
        yield* TestHost.setVisible(false)
        yield* TestClock.adjust("31 seconds")
        assert.strictEqual(app.db.calls, 1)
        app.db.names.set("1", "Ann2")
        yield* TestHost.setVisible(true)
        yield* load
        assert.deepStrictEqual(triggers(root), ["watch", "visibility"])
        assert.strictEqual(root.text(), "a=Ann2")
      })
    )
  })

  it.effect("connectivity: coming back online refetches a stale watched entry", () => {
    const app = makeApp()
    return run(
      app.layer,
      Effect.gen(function*() {
        const root = yield* TestHost.mount(app.Card, { id: "1", tag: "a" })
        yield* load
        yield* TestHost.setOnline(false)
        yield* TestClock.adjust("31 seconds")
        app.db.names.set("1", "Ann2")
        yield* TestHost.setOnline(true)
        yield* load
        assert.deepStrictEqual(triggers(root), ["watch", "connectivity"])
        assert.strictEqual(root.text(), "a=Ann2")
      })
    )
  })

  it.effect("interval: refetchInterval refetches a watched entry on the clock", () => {
    const app = makeApp({ interval: true })
    return run(
      app.layer,
      Effect.gen(function*() {
        const root = yield* TestHost.mount(app.Card, { id: "1", tag: "a" })
        yield* load
        app.db.names.set("1", "Ann2")
        yield* TestClock.adjust("5 seconds")
        yield* load
        assert.deepStrictEqual(triggers(root), ["watch", "interval"])
        assert.strictEqual(root.text(), "a=Ann2")
      })
    )
  })

  it.effect("get: a Command's get of a cold entry fetches, and a watch of it then joins the stored value", () => {
    const app = makeApp()
    return run(
      app.layer,
      Effect.gen(function*() {
        const root = yield* TestHost.mount(app.Tools, {})
        root.send(app.ToolsMessage.make({ _tag: "Get", id: "2" }))
        yield* load
        assert.strictEqual(root.text(), "Bea")
        assert.deepStrictEqual(triggers(root), ["get"])
        assert.isTrue(AsyncResult.isSuccess(root.entry(app.GetUser, { id: "2" })!.stored))
      })
    )
  })

  it.effect("prefetch: a Command's prefetch fetches a cold entry and stores it", () => {
    const app = makeApp()
    return run(
      app.layer,
      Effect.gen(function*() {
        const root = yield* TestHost.mount(app.Tools, {})
        root.send(app.ToolsMessage.make({ _tag: "Prefetch", id: "2" }))
        yield* load
        assert.strictEqual(root.text(), "prefetched")
        assert.deepStrictEqual(triggers(root), ["prefetch"])
        assert.isTrue(AsyncResult.isSuccess(root.entry(app.GetUser, { id: "2" })!.stored))
        // A prefetch of a fresh entry starts nothing.
        root.send(app.ToolsMessage.make({ _tag: "Prefetch", id: "2" }))
        yield* load
        assert.strictEqual(app.db.calls, 1)
      })
    )
  })

  it("Component.make rejects a nested or mislabelled snapshot, a missing loader, and missing watch subscriptions", () => {
    const app = makeApp()
    const base = {
      name: "Bad",
      message: Schema.Never,
      init: () => ({}),
      update: (model: any) => model,
      view: (_: any, h: any) => h.text("")
    }
    const snapshot = Loader.Snapshot(app.GetUser, "user")
    assert.throws(
      () => Component.make({ ...base, model: Schema.Struct({ user: Schema.Array(snapshot) }) } as any),
      /below its top level/
    )
    assert.throws(
      () => Component.make({ ...base, model: Schema.Struct({ user: Schema.NullOr(snapshot) }) } as any),
      /below its top level/
    )
    assert.throws(
      () => Component.make({ ...base, model: Schema.Struct({ person: snapshot }) } as any),
      /A snapshot's label is its field's name/
    )
    const model = Schema.Struct({ user: snapshot })
    assert.throws(() => Component.make({ ...base, model } as any), /has no loader/)
    const loaders = { user: () => ({ id: "1" }) }
    assert.throws(() => Component.make({ ...base, model, loaders } as any), /subscriptions must return/)
    const unwatched = Component.make({ ...base, model, loaders, subscriptions: () => [] } as any)
    assert.throws(() => unwatched.subscriptions!({ user: undefined }, {}), /subscriptions must return/)
    const unhandled = Component.make(
      { ...base, model, loaders, subscriptions: (_m: any, _p: any, $: any) => [$.watch({})] } as any
    )
    assert.throws(() => unhandled.subscriptions!({ user: undefined }, {}), /no handler/)
  })

  it.effect("loaders that read each other in a cycle fail the instance, and settle fails with RootCrashed", () => {
    const app = makeApp()
    const Message = Schema.TaggedUnion({
      A: { a: Loader.Snapshot(app.GetUser, "a") },
      B: { b: Loader.Snapshot(app.GetUser, "b") }
    })
    const Cycle = Component.make({
      name: "Cycle",
      model: Schema.Struct({ a: Loader.Snapshot(app.GetUser, "a"), b: Loader.Snapshot(app.GetUser, "b") }),
      message: Message,
      loaders: {
        a: (_model: any, _props: any, loaded: any) => (loaded.b, { id: "1" }),
        b: (_model: any, _props: any, loaded: any) => (loaded.a, { id: "2" })
      },
      init: ($: any) => $.empty,
      update: (model: any, message: any) => ({ ...model, ...message }),
      subscriptions: (_model: any, _props: any, $: any) => [
        $.watch({ a: (a: any) => Message.make({ _tag: "A", a }), b: (b: any) => Message.make({ _tag: "B", b }) })
      ],
      view: (_model: any, h: any) => h.el("p", "never")
    } as any)
    return run(
      app.layer,
      Effect.gen(function*() {
        yield* TestHost.mount(Cycle as any, {})
        const error = yield* Effect.flip(TestHost.settle)
        assert.strictEqual(error._tag, "RootCrashed")
        assert.match(String(error.message), /read each other in a cycle/)
      })
    )
  })

  it.effect("Schema.Redacted in a read's args and success: the log is redacted, the Model and the cache are not", () => {
    const Account = Schema.Struct({ id: Schema.String, secret: Schema.Redacted(Schema.String) })
    class GetAccount extends Loader.Service<GetAccount>()(
      "accounts/GetAccount",
      {
        args: { token: Schema.Redacted(Schema.String) },
        success: Account,
        error: Schema.Never,
        staleTime: "30 seconds"
      },
      Effect.succeed(({ token }) =>
        Effect.succeed({ id: "acc", secret: Redacted.make(`secret-of-${Redacted.value(token)}`) })
      )
    ) {}
    const Message = Schema.TaggedUnion({ Changed: { account: Loader.Snapshot(GetAccount, "account") } })
    const Page = Component.make({
      name: "Page",
      props: Schema.Struct({ token: Schema.Redacted(Schema.String) }),
      model: Schema.Struct({ account: Loader.Snapshot(GetAccount, "account") }),
      message: Message,
      loaders: { account: (_model, props) => ({ token: props.token }) },
      init: ($) => $.empty,
      update: (_model, message) => ({ account: message.account }),
      subscriptions: (
        _model,
        _props,
        $
      ) => [$.watch({ account: (account) => Message.make({ _tag: "Changed", account }) })],
      view: (_model, h) =>
        h.el("p", AsyncResult.isSuccess(h.loaded.account) ? Redacted.value(h.loaded.account.value.secret) : "…")
    })
    return run(
      GetAccount.layer,
      Effect.gen(function*() {
        const root = yield* TestHost.mount(Page, { token: Redacted.make("tok-123") })
        yield* TestHost.settle
        // Page state keeps the real values: the snapshot's key and value as the Model's JSON codec writes them.
        assert.strictEqual(root.text(), "secret-of-tok-123")
        const state = JSON.stringify(Schema.encodeUnknownSync(Schema.toCodecJson(Page.model))(root.model()))
        assert.include(state, "tok-123")
        assert.include(state, "secret-of-tok-123")
        // The log doesn't: not the args in the log key, nor the value in the folded snapshot.
        const fetch = root.fetches()[0]
        assert.notInclude(fetch.logKey, "tok-123")
        const encoder = MessageLog.makeEncoder()
        const wire = JSON.stringify(root.log().map((entry) => encoder.encode(entry)))
        assert.notInclude(wire, "tok-123")
        assert.notInclude(wire, "secret-of")
        assert.include(wire, "FetchStarted")
        assert.notInclude(TestHost.formatLog(root.log()), "tok-123")
      })
    )
  })

  it.effect("a problem fails settle until expectProblem takes it", () => {
    const app = makeApp()
    class BadRename extends Command.Service<BadRename>()(
      "users/BadRename",
      {
        args: { id: Schema.String },
        invalidates: () => [],
        // The patched value fails the read's success Schema.
        optimistic: ({ id }) => [app.GetUser.patch({ id }, (user) => ({ ...user, name: 42 as unknown as string }))]
      },
      Effect.succeed(() => Effect.never)
    ) {}
    const Message = Schema.TaggedUnion({ UserChanged: { user: Loader.Snapshot(app.GetUser, "user") }, Break: {} })
    const Breaker = Component.make({
      name: "Breaker",
      model: Schema.Struct({ user: Loader.Snapshot(app.GetUser, "user") }),
      message: Message,
      loaders: { user: () => ({ id: "1" }) },
      init: ($) => $.empty,
      update: (model, message, $) =>
        Message.match(message, {
          UserChanged: ({ user }) => ({ user }),
          Break: () =>
            $.set(model).run(BadRename.make({ id: "1" }).pipe(Command.map(() => Message.make({ _tag: "Break" }))))
        }),
      subscriptions: (
        _model,
        _props,
        $
      ) => [$.watch({ user: (user) => Message.make({ _tag: "UserChanged", user }) })],
      view: (_model, h) => h.el("p", "breaker")
    })
    return run(
      Layer.merge(app.layer, BadRename.layer),
      Effect.gen(function*() {
        const root = yield* TestHost.mount(Breaker, {})
        yield* load
        root.send(Message.make({ _tag: "Break" }))
        const error = yield* Effect.flip(TestHost.settle)
        assert.strictEqual(error._tag, "ProblemsError")
        const [problem] = yield* TestHost.expectProblem("PatchInvalid")
        assert.deepStrictEqual([problem.read, problem.logKey, problem.command], [
          "users/GetUser",
          `{"id":"1"}`,
          "users/BadRename"
        ])
        assert.deepStrictEqual(yield* TestHost.problems, [])
        // Taken: settle passes, and the patched value is shown as it is.
        yield* TestHost.settle
        assert.strictEqual(root.entry(app.GetUser, { id: "1" })?.patched, true)
      })
    )
  })

  it.effect("a clock wake that runs out of budget reports DrainExhausted", () => {
    const Message = Schema.TaggedUnion({ Tick: {} })
    const Wait = Command.make(
      "Wait",
      { args: {} },
      () => Effect.sleep("1 millis").pipe(Effect.as(Message.make({ _tag: "Tick" })))
    )
    const Spin = Command.make("Spin", { args: {} }, () => Effect.succeed(Message.make({ _tag: "Tick" })))
    const Spinner = Component.make({
      name: "Spinner",
      model: Schema.Number,
      message: Message,
      init: ($) => $.set(0).run(Wait()),
      // Each Tick issues the next: the work never runs out.
      update: (count, _message, $) => $.set(count + 1).run(Spin()),
      view: (count, h) => h.el("p", String(count))
    })
    return Effect.gen(function*() {
      const root = yield* TestHost.mount(Spinner, {})
      yield* TestHost.settle
      yield* TestClock.adjust("1 millis")
      const [problem] = yield* TestHost.expectProblem("DrainExhausted")
      assert.match(problem.message, /clock wake ran 50 tasks/)
      assert.isAbove(root.model()!, 0)
    }).pipe(Effect.scoped, Effect.provide(TestHost.layer({ budget: 50 })))
  })
})
