import { assert, describe, it } from "@effect/vitest"
import {
  Cause,
  Context,
  Deferred,
  Effect,
  Exit,
  Fiber,
  Layer,
  LayerMap,
  Option,
  Redacted,
  Scheduler,
  Schema,
  SchemaTransformation,
  Scope,
  Stream
} from "effect"
import { AsyncResult, Loader } from "effect/reactivity"
import { TestClock } from "effect/testing"
import { Command, Component, Feature, MessageLog, Renderer, Subscription } from "effect/ui"
import { Html } from "effect/ui/html"
import * as runtime from "effect/ui/internal/runtime"
import { Query, Story, TestHost } from "effect/ui/testing"
import { Counter, CounterMessage } from "./fixtures/components.ts"
import { Tiny } from "./fixtures/vocabulary.ts"

const provideHost = <A, E, R>(effect: Effect.Effect<A, E, R>) => effect.pipe(Effect.provide(TestHost.layer()))
const tags = (root: { readonly log: () => ReadonlyArray<MessageLog.Entry> }, path?: string) =>
  root.log().filter((entry) => path === undefined || entry.path === path).map((entry) => entry._tag)
const click = (root: TestHost.TestRoot<any, any, any>, text: string) =>
  Query.fire(root.get(Query.text(text, { exact: true })), "click")

// ---------------------------------------------------------------------------
// A keyed list whose rows hold a Command open until they unmount
// ---------------------------------------------------------------------------

const RowMessage = Schema.TaggedUnion({ Bump: {} })

const Hold = Command.make("Hold", { args: {} }, () => Effect.never)
const Row = Component.make({
  name: "Row",
  props: Schema.Struct({ id: Schema.String }),
  model: Schema.Number,
  message: RowMessage,
  init: ($) => $.set(0).run(Hold()),
  update: (count) => count + 1,
  view: (count, h) => h.el("li", `${h.props.id}:${count}`).on("click", RowMessage.make({ _tag: "Bump" }))
})

const ListMessage = Schema.TaggedUnion({
  Add: { id: Schema.String },
  Remove: { id: Schema.String },
  Reverse: {}
})
const List = Component.make({
  name: "List",
  props: Schema.Struct({ ids: Schema.Array(Schema.String) }),
  model: Schema.Array(Schema.String),
  message: ListMessage,
  init: ($) => $.props.ids,
  update: (ids, message) =>
    ListMessage.match(message, {
      Add: ({ id }) => [...ids, id],
      Remove: ({ id }) => ids.filter((x) => x !== id),
      Reverse: () => [...ids].reverse()
    }),
  view: (ids, h) => h.el("ul", ids.map((id) => h.child(Row, { key: id, props: { id } })))
})

describe("Runtime", () => {
  it.effect("renders, handles an event and re-renders after settle", () =>
    provideHost(Effect.gen(function*() {
      const root = yield* TestHost.mount(Counter, { initial: 1 })
      assert.strictEqual(root.text(), "-1+")
      click(root, "+")
      click(root, "+")
      yield* TestHost.settle
      assert.strictEqual(root.text(), "-3+")
      assert.deepStrictEqual(root.model(), { count: 3 })
      assert.deepStrictEqual(tags(root), ["SessionStarted", "Mounted", "Update", "Update"])
      const update = root.log()[2] as MessageLog.Update
      assert.deepStrictEqual(update.source, { _tag: "DomEvent", name: "click" })
      assert.deepStrictEqual(update.message, CounterMessage.make({ _tag: "Increment" }))
    })))

  it.effect("only the innermost handler fires", () =>
    provideHost(Effect.gen(function*() {
      const Msg = Schema.TaggedUnion({ Outer: {}, Inner: {} })
      const Nested = Component.make({
        name: "Nested",
        model: Schema.Array(Schema.String),
        message: Msg,
        init: () => [],
        update: (seen, message) => [...seen, message._tag],
        view: (_, h) =>
          h.el(
            "div",
            h.el("button", "inner").on("click", Msg.make({ _tag: "Inner" })),
            h.el("span", "plain")
          ).on("click", Msg.make({ _tag: "Outer" }))
      })
      const root = yield* TestHost.mount(Nested, {})
      click(root, "inner")
      click(root, "plain")
      yield* TestHost.settle
      assert.deepStrictEqual(root.model(), ["Inner", "Outer"])
    })))

  describe("keyed list", () => {
    it.effect("adds, removes and reorders children, closing the Scopes of the removed ones", () =>
      provideHost(Effect.gen(function*() {
        const root = yield* TestHost.mount(List, { ids: ["a", "b", "c"] })
        yield* TestHost.settle
        const testHost = yield* TestHost.TestHost
        const items = () => root.all(Query.tag("li"))
        const [a, b, c] = items()
        assert.strictEqual(root.text(), "a:0b:0c:0")
        assert.deepStrictEqual(root.pending().map((p) => p.path), ["/List/Row[a]", "/List/Row[b]", "/List/Row[c]"])

        // A row keeps its Model and node across moves.
        click(root, "b:0")
        yield* TestHost.settle
        testHost.host.clearOperations()
        root.send(ListMessage.make({ _tag: "Reverse" }))
        yield* TestHost.settle
        assert.strictEqual(root.text(), "c:0b:1a:0")
        assert.deepStrictEqual(items(), [c, b, a])
        assert.isFalse(testHost.host.operations().some((op) => op.startsWith("create")))

        root.send(ListMessage.make({ _tag: "Remove", id: "b" }))
        root.send(ListMessage.make({ _tag: "Add", id: "d" }))
        yield* TestHost.settle
        assert.strictEqual(root.text(), "c:0a:0d:0")
        assert.deepStrictEqual(items().slice(0, 2), [c, a])
        assert.deepStrictEqual(tags(root, "/List/Row[b]").slice(-2), ["CommandInterrupted", "Unmounted"])
        assert.sameMembers(root.pending().map((p) => p.path), ["/List/Row[c]", "/List/Row[a]", "/List/Row[d]"])
      })))

    it.effect("closing the mount's Scope unmounts every instance", () =>
      Effect.gen(function*() {
        const testHost = yield* TestHost.TestHost
        const root = yield* Effect.scoped(Effect.gen(function*() {
          const root = yield* TestHost.mount(List, { ids: ["a", "b"] })
          yield* TestHost.settle
          return root
        }))
        yield* TestHost.settle
        const unmounted = testHost.log.entries().filter((entry) => entry._tag === "Unmounted").map((entry) =>
          entry.path
        )
        assert.sameMembers(unmounted, ["/List", "/List/Row[a]", "/List/Row[b]"])
        assert.deepStrictEqual(root.container.children, [])
      }).pipe(Effect.provide(TestHost.layer())))
  })

  describe("failures", () => {
    const BombMessage = Schema.TaggedUnion({ Explode: {} })
    const Bomb = Component.make({
      name: "Bomb",
      model: Schema.Number,
      message: BombMessage,
      init: () => 0,
      update: (): number => {
        throw new Error("boom")
      },
      view: (_, h) => h.el("button", "bomb").on("click", BombMessage.make({ _tag: "Explode" }))
    })
    const PageMessage = Schema.TaggedUnion({ BombFailed: {}, Retry: {} })
    const Page = Component.make({
      name: "Page",
      model: Schema.Struct({ failures: Schema.Number, attempt: Schema.Number }),
      message: PageMessage,
      init: () => ({ failures: 0, attempt: 0 }),
      update: (model, message) =>
        PageMessage.match(message, {
          BombFailed: () => ({ ...model, failures: model.failures + 1 }),
          Retry: () => ({ ...model, attempt: model.attempt + 1 })
        }),
      view: (model, h) =>
        h.el(
          "main",
          h.child(Bomb, {
            key: `bomb-${model.attempt}`,
            props: {},
            onFailure: () => PageMessage.make({ _tag: "BombFailed" }),
            fallback: () => h.el("p", "bomb failed")
          }),
          h.child(Counter, { key: "counter", props: { initial: 0 } })
        )
    })

    it.effect("a failing child shows its fallback while its siblings keep running", () =>
      provideHost(Effect.gen(function*() {
        const root = yield* TestHost.mount(Page, {})
        click(root, "bomb")
        yield* TestHost.settle
        assert.strictEqual((root.get(Query.tag("main")) as TestHost.TestElement).children.length, 2)
        assert.strictEqual(root.text(), "bomb failed-0+")
        assert.deepStrictEqual(root.model(), { failures: 1, attempt: 0 })
        const failed = root.log().find((entry) => entry._tag === "Failed") as MessageLog.Failed
        assert.strictEqual(failed.path, "/Page/Bomb[bomb-0]")
        assert.strictEqual(failed.source, "update")

        click(root, "+")
        yield* TestHost.settle
        assert.strictEqual(root.text(), "bomb failed-1+")

        // Re-keying is the retry.
        root.send(PageMessage.make({ _tag: "Retry" }))
        yield* TestHost.settle
        assert.strictEqual(root.text(), "bomb-1+")
        assert.include(tags(root, "/Page/Bomb[bomb-1]"), "Mounted")
      })))

    it.effect("a child failing in view shows its fallback from the first render", () =>
      provideHost(Effect.gen(function*() {
        const Broken = Component.make({
          name: "Broken",
          model: Schema.Number,
          message: Schema.Never,
          init: () => 0,
          view: (): never => {
            throw new Error("no view")
          },
          update: (model) => model
        })
        const Parent = Component.make({
          name: "Parent",
          model: Schema.Number,
          message: Schema.Never,
          init: () => 0,
          update: (model) => model,
          view: (_, h) =>
            h.el("div", "before ", h.child(Broken, { key: "x", props: {}, fallback: () => h.text("down") }))
        })
        const root = yield* TestHost.mount(Parent, {})
        yield* TestHost.settle
        assert.strictEqual(root.text(), "before down")
        const failed = root.log().find((entry) => entry._tag === "Failed") as MessageLog.Failed
        assert.strictEqual(failed.source, "view")
      })))

    it.effect("a crashed root shows mount's fallback", () =>
      provideHost(Effect.gen(function*() {
        const root = yield* TestHost.mount(Page, {}, { fallback: (_, h) => h.el("h1", "Something went wrong") })
        root.send("not a message" as any)
        const crashed = yield* Effect.flip(TestHost.settle)
        assert.strictEqual(crashed._tag, "RootCrashed")
        assert.strictEqual(root.text(), "Something went wrong")
        assert.isUndefined(root.model())
        assert.includeMembers(tags(root), ["Failed", "Crashed"])
      })))

    it.effect("a defect in a Command fails its instance", () =>
      provideHost(Effect.gen(function*() {
        const Explode = Command.make("Explode", { args: {} }, () => Effect.die("kaboom"))
        const Child = Component.make({
          name: "Child",
          model: Schema.Number,
          message: Schema.String,
          init: ($) => $.set(0).run(Explode()),
          update: (model) => model,
          view: (_, h) => h.text("child")
        })
        const Parent = Component.make({
          name: "Parent",
          model: Schema.Number,
          message: Schema.Never,
          init: () => 0,
          update: (model) => model,
          view: (_, h) => h.el("div", h.child(Child, { key: "c", props: {} }), "parent")
        })
        const root = yield* TestHost.mount(Parent, {})
        assert.strictEqual(root.text(), "childparent")
        yield* TestHost.settle
        assert.strictEqual(root.text(), "parent")
        const failed = root.log().find((entry) => entry._tag === "Failed") as MessageLog.Failed
        assert.deepStrictEqual([failed.source, failed.name], ["command", "Explode"])
      })))
  })

  describe("a provided Layer factory and a fallback's child", () => {
    const Leaf = Component.make({
      name: "Leaf",
      model: Schema.Number,
      message: Schema.String,
      init: () => 0,
      update: (n) => n + 1,
      view: (n, h) => h.text(`leaf${n}`)
    })
    const broken = (): Layer.Layer<never> => {
      throw new Error("factory broke")
    }

    it.effect("a throwing factory fails the child's own slot", () =>
      provideHost(Effect.gen(function*() {
        const Child = Component.provide(Leaf, broken)
        const Parent = Component.make({
          name: "Parent",
          model: Schema.Number,
          message: Schema.Never,
          init: () => 0,
          update: (n) => n,
          view: (_, h) => h.el("main", h.child(Child, { key: "c", fallback: () => h.text("down ") }), "alive")
        })
        const root = yield* TestHost.mount(Parent, {}, { fallback: (_, h) => h.text("ROOT CRASH") })
        yield* TestHost.settle
        assert.strictEqual(root.text(), "down alive")
        const failed = root.log().find((entry) => entry._tag === "Failed") as MessageLog.Failed
        assert.deepStrictEqual([failed.path, failed.source], ["/Parent/Leaf[c]", "layer"])
      })))

    it.effect("with onFailure, a throwing factory becomes a message", () =>
      provideHost(Effect.gen(function*() {
        const root = yield* TestHost.mount(Component.provide(Leaf, broken, { onFailure: () => "failed" }), {})
        yield* TestHost.settle
        assert.strictEqual(root.text(), "leaf1")
      })))

    it.effect("re-keying the child a fallback returns mounts it again", () =>
      provideHost(Effect.gen(function*() {
        let starts = 0
        const Counted = Component.make({
          name: "Counted",
          model: Schema.Number,
          message: Schema.Never,
          init: () => ++starts,
          update: (n) => n,
          view: (n, h) => h.text(String(n))
        })
        const Broken = Component.make({
          name: "Broken",
          model: Schema.Number,
          message: Schema.Never,
          init: () => 0,
          update: (n) => n,
          view: (): never => {
            throw new Error("broken")
          }
        })
        const Parent = Component.make({
          name: "Parent",
          model: Schema.Number,
          message: Schema.Number,
          init: () => 0,
          update: (_, n) => n,
          view: (n, h) => h.child(Broken, { key: "b", fallback: () => h.child(Counted, { key: String(n) }) })
        })
        const root = yield* TestHost.mount(Parent, {})
        assert.strictEqual(root.text(), "1")
        root.send(1)
        yield* TestHost.settle
        assert.strictEqual(root.text(), "2")
      })))
  })

  describe("Commands", () => {
    const Msg = Schema.TaggedUnion({ Query: { text: Schema.String }, Results: { text: Schema.String } })
    const Search = Command.make(
      "Search",
      { args: { text: Schema.String }, mode: "switch" },
      ({ text }) => Effect.as(Effect.sleep("1 second"), Msg.make({ _tag: "Results", text }))
    )
    const Box = Component.make({
      name: "Box",
      model: Schema.String,
      message: Msg,
      init: () => "",
      update: (_, message, $) =>
        Msg.match(message, {
          Query: ({ text }) => $.run(Search({ text })),
          Results: ({ text }) => text
        }),
      view: (model, h) => h.text(model)
    })

    it.effect("switch interrupts the running run, and results come back as messages", () =>
      provideHost(Effect.gen(function*() {
        const root = yield* TestHost.mount(Box, {})
        root.send(Msg.make({ _tag: "Query", text: "a" }))
        root.send(Msg.make({ _tag: "Query", text: "ab" }))
        yield* TestHost.settle
        assert.deepStrictEqual(root.pending(), [{
          _tag: "Command",
          path: "/Box",
          name: "Search",
          status: "running",
          detached: false
        }])
        yield* TestClock.adjust("1 second")
        yield* TestHost.settle
        assert.strictEqual(root.text(), "ab")
        assert.deepStrictEqual(tags(root), [
          "SessionStarted",
          "Mounted",
          "Update",
          "Update",
          "CommandInterrupted",
          "Update",
          "CommandEnded"
        ])
        const result = root.log()[5] as MessageLog.Update
        assert.strictEqual(result.source._tag, "Command")
        if (result.source._tag === "Command") assert.deepStrictEqual(result.source.issued, { seq: 4, index: 0 })
      })))

    it.effect("a ref resolves within the issuing instance after the render is committed", () =>
      provideHost(Effect.gen(function*() {
        const Field = Renderer.ref("Field")
        const RefMsg = Schema.TaggedUnion({ Show: {}, Found: { found: Schema.Boolean } })
        const Look = Command.make("Look", { args: {} }, () =>
          Effect.gen(function*() {
            const refs = yield* Renderer.Refs
            const node = yield* refs.lookup(Field)
            return RefMsg.make({ _tag: "Found", found: Option.isSome(node) })
          }))
        const Form = Component.make({
          name: "Form",
          model: Schema.Struct({ shown: Schema.Boolean, found: Schema.optional(Schema.Boolean) }),
          message: RefMsg,
          init: ($) => $.set({ shown: false }).run(Look()),
          update: (model, message, $) =>
            RefMsg.match(message, {
              Show: () => $.set({ shown: true }).run(Look()),
              Found: ({ found }) => ({ ...model, found })
            }),
          view: (model, h) => h.el("form", model.shown ? h.el("input").ref(Field) : null)
        })
        const root = yield* TestHost.mount(Form, {})
        yield* TestHost.settle
        assert.deepStrictEqual(root.model(), { shown: false, found: false })
        root.send(RefMsg.make({ _tag: "Show" }))
        yield* TestHost.settle
        assert.deepStrictEqual(root.model(), { shown: true, found: true })
      })))
  })

  describe("run owners", () => {
    // The server behind the fake API, and the requests that reached the read's fetcher.
    const makeServer = () => ({ count: 0, requests: 0, interrupted: 0 })
    type Server = ReturnType<typeof makeServer>

    class GetCount extends Loader.Service<GetCount>()("test/GetCount", {
      args: { id: Schema.String },
      success: Schema.Number,
      error: Schema.Never,
      staleTime: "Infinity"
    }, Effect.succeed(() => Effect.succeed(0))) {}
    const fetcher = (server: Server) =>
      Layer.succeed(GetCount, () =>
        Effect.sync(() => {
          server.requests++
          return server.count
        }))

    class Api extends Context.Service<Api, { readonly save: (n: number) => Effect.Effect<number> }>()("test/Api") {}
    const api = (server: Server) =>
      Layer.succeed(Api, {
        save: (n) =>
          Effect.sleep("1 second").pipe(
            Effect.andThen(Effect.sync(() => (server.count = n))),
            Effect.onInterrupt(() => Effect.sync(() => server.interrupted++))
          )
      })

    class Save extends Command.Service<Save>()(
      "test/Save",
      { args: { n: Schema.Number }, invalidates: () => [GetCount], mode: "queue" },
      Effect.gen(function*() {
        const { save } = yield* Api
        return ({ n }) => save(n)
      })
    ) {}
    class Rename extends Command.Service<Rename>()(
      "test/Rename",
      {
        args: { n: Schema.Number },
        invalidates: () => [],
        optimistic: () => [GetCount.patch({ id: "a" }, (count) => count + 100)],
        writes: (count) => [GetCount.set({ id: "a" }, count)]
      },
      Effect.gen(function*() {
        const { save } = yield* Api
        return ({ n }) => save(n)
      })
    ) {}

    const EditorMsg = Schema.TaggedUnion({ Save: {}, Rename: {}, Stop: {}, Saved: { n: Schema.Number } })
    const Editor = Component.make({
      name: "Editor",
      model: Schema.Number,
      message: EditorMsg,
      init: () => 0,
      update: (n, message, $) =>
        EditorMsg.match(message, {
          Save: () =>
            $.set(n + 1).run(Save.make({ n: n + 1 }).pipe(Command.map((n) => EditorMsg.make({ _tag: "Saved", n })))),
          Rename: () =>
            $.set(n + 1).run(Rename.make({ n: n + 1 }).pipe(Command.map((n) => EditorMsg.make({ _tag: "Saved", n })))),
          Stop: () => $.run(Command.interrupt(Save)),
          Saved: () => n
        }),
      view: (_, h) =>
        h.el("div", [
          h.el("button", "save").on("click", EditorMsg.make({ _tag: "Save" })),
          h.el("button", "rename").on("click", EditorMsg.make({ _tag: "Rename" })),
          h.el("button", "stop").on("click", EditorMsg.make({ _tag: "Stop" })),
          h.text(h.running(Save) ? "saving" : "idle")
        ])
    })

    // The layout: it watches the server count through `changes`, which carries server values only.
    const PageMsg = Schema.TaggedUnion({ Count: { value: Schema.Number }, Close: {}, Watch: { on: Schema.Boolean } })
    const page = <R>(editor: Component.Component<"Editor", {}, number, any, never, R, any>) =>
      Component.make({
        name: "Page",
        model: Schema.Struct({ count: Schema.Number, editing: Schema.Boolean, watching: Schema.Boolean }),
        message: PageMsg,
        init: () => ({ count: -1, editing: true, watching: true }),
        update: (model, message) =>
          PageMsg.match(message, {
            Count: ({ value }) => ({ ...model, count: value }),
            Close: () => ({ ...model, editing: false }),
            Watch: ({ on }) => ({ ...model, watching: on })
          }),
        subscriptions: (model) => [
          model.watching && Subscription.make(
            "count",
            GetCount.changes({ id: "a" }).pipe(
              Stream.filter(AsyncResult.isSuccess),
              Stream.map((result) => PageMsg.make({ _tag: "Count", value: result.value }))
            )
          )
        ],
        view: (model, h) =>
          h.el("main", [
            h.el("p", `count ${model.count}`),
            model.editing ? h.child(editor, { key: "editor", props: {} }) : null
          ])
      })
    const EditorPage = page(Editor)

    it.effect("a save outlives its instance: the queue drains, its messages are dropped, the cache invalidates", () =>
      provideHost(Effect.gen(function*() {
        const server = makeServer()
        const App = Component.provide(
          EditorPage,
          Layer.mergeAll(Save.layer.pipe(Layer.provide(api(server))), fetcher(server))
        )
        const root = yield* TestHost.mount(App, {})
        yield* TestHost.settle
        assert.include(root.text(), "count 0")
        click(root, "save")
        click(root, "save")
        yield* TestHost.settle
        assert.include(root.text(), "saving")
        root.send(PageMsg.make({ _tag: "Close" }))
        yield* TestHost.settle
        assert.deepStrictEqual(root.pending(), [
          { _tag: "Command", path: "/Page/Editor[editor]", name: "test/Save", status: "running", detached: true },
          { _tag: "Command", path: "/Page/Editor[editor]", name: "test/Save", status: "queued", detached: true }
        ])
        yield* TestClock.adjust("1 second")
        yield* TestHost.settle
        assert.include(root.text(), "count 1")
        yield* TestClock.adjust("1 second")
        yield* TestHost.settle
        assert.include(root.text(), "count 2")
        assert.strictEqual(server.requests, 3)
        assert.deepStrictEqual(root.pending(), [])
        const editor = root.log().filter((entry) => entry.path === "/Page/Editor[editor]")
        const unmounted = editor.findIndex((entry) => entry._tag === "Unmounted")
        assert.deepStrictEqual(editor.slice(unmounted).map((entry) => entry._tag), [
          "Unmounted",
          "CommandEnded",
          "CommandEnded"
        ])
        assert.isTrue(
          editor.slice(unmounted + 1).every((entry) => (entry as MessageLog.CommandSettled).detached)
        )
      })))

    it.effect("the Layer build that owns a detached run ends it when it closes", () =>
      provideHost(Effect.gen(function*() {
        const server = makeServer()
        const App = Component.provide(
          page(Component.provide(Editor, Save.layer.pipe(Layer.provide(api(server))))),
          fetcher(server)
        )
        const root = yield* TestHost.mount(App, {})
        yield* TestHost.settle
        click(root, "save")
        yield* TestHost.settle
        root.send(PageMsg.make({ _tag: "Close" }))
        yield* TestHost.settle
        assert.strictEqual(server.interrupted, 1)
        assert.deepStrictEqual(root.pending(), [])
        const last = root.log().filter((entry) => entry._tag === "CommandInterrupted")
        assert.deepStrictEqual(
          last.map((entry) => (entry as MessageLog.CommandSettled).detached),
          [true]
        )
        // A started run invalidates however it exits.
        assert.strictEqual(server.requests, 2)
      })))

    it.effect("the root is a second owner, even for a service provided outside the mount", () => {
      const server = makeServer()
      return Effect.gen(function*() {
        yield* Effect.scoped(Effect.gen(function*() {
          const root = yield* TestHost.mount(EditorPage, {})
          yield* TestHost.settle
          click(root, "save")
          yield* TestHost.settle
          root.send(PageMsg.make({ _tag: "Close" }))
          yield* TestHost.settle
          assert.strictEqual(root.pending().length, 1)
        }))
        yield* TestHost.settle
        assert.strictEqual(server.interrupted, 1)
        assert.strictEqual(server.count, 0)
      }).pipe(
        Effect.provide(Layer.mergeAll(Save.layer.pipe(Layer.provide(api(server))), fetcher(server))),
        Effect.provide(TestHost.layer())
      )
    })

    it.effect("a detached run's Scope closes with the run's own exit", () =>
      provideHost(Effect.gen(function*() {
        const exits: Array<string> = []
        class Tx extends Command.Service<Tx>()(
          "test/Tx",
          { args: { outcome: Schema.Literals(["succeed", "fail", "hold"]) }, invalidates: () => [] },
          Effect.succeed(({ outcome }: { readonly outcome: "succeed" | "fail" | "hold" }) =>
            Effect.acquireRelease(Effect.void, (_, exit) =>
              Effect.sync(() =>
                exits.push(
                  Exit.isSuccess(exit) ? "Success" : Cause.hasFails(exit.cause) ? "Fail" : "Interrupt"
                )
              )).pipe(
                Effect.andThen(
                  outcome === "succeed" ? Effect.void : outcome === "fail" ? Effect.fail("rejected") : Effect.never
                )
              )
          )
        ) {}
        const Msg = Schema.TaggedUnion({
          Issue: { outcome: Schema.Literals(["succeed", "fail", "hold"]) },
          Stop: {},
          Done: {}
        })
        const done = Command.match({
          onSuccess: () => Msg.make({ _tag: "Done" }),
          onFailure: () => Msg.make({ _tag: "Done" })
        })
        const Tx_ = Component.provide(
          Component.make({
            name: "Tx",
            model: Schema.Null,
            message: Msg,
            init: () => null,
            update: (model, message, $) =>
              Msg.match(message, {
                Issue: ({ outcome }) => $.run(Tx.make({ outcome }).pipe(done)),
                Stop: () => $.run(Command.interrupt(Tx)),
                Done: () => model
              }),
            view: (_, h) => h.text("tx")
          }),
          Tx.layer
        )
        const root = yield* TestHost.mount(Tx_, {})
        yield* TestHost.settle
        for (const outcome of ["succeed", "fail", "hold"] as const) {
          root.send(Msg.make({ _tag: "Issue", outcome }))
          yield* TestHost.settle
        }
        root.send(Msg.make({ _tag: "Stop" }))
        yield* TestHost.settle
        assert.deepStrictEqual(exits, ["Success", "Fail", "Interrupt"])
      })))

    // A body that can't be interrupted, so an owner that only asks it to stop closes before it ends.
    const makeStubborn = () => {
      const events: Array<string> = []
      const gate = Deferred.makeUnsafe<void>()
      class Stubborn extends Command.Service<Stubborn>()(
        "test/Stubborn",
        { args: {}, invalidates: () => [] },
        Effect.gen(function*() {
          yield* Effect.addFinalizer(() => Effect.sync(() => events.push("build released")))
          return () =>
            Effect.uninterruptible(Effect.andThen(Deferred.await(gate), Effect.sync(() => events.push("body done"))))
        })
      ) {}
      const Msg = Schema.TaggedUnion({ Close: {}, Stop: {}, Done: {} })
      const Child = Component.make({
        name: "Child",
        model: Schema.Null,
        message: Msg,
        init: ($) => $.set(null).run(Stubborn.make().pipe(Command.map(() => Msg.make({ _tag: "Done" })))),
        update: (model, message, $) => message._tag === "Stop" ? $.run(Command.interrupt(Stubborn)) : model,
        view: (_, h) => h.el("button", "stop").on("click", Msg.make({ _tag: "Stop" }))
      })
      // A child whose `Command.make` run ends with it.
      const Holder = Component.make({
        name: "Child",
        model: Schema.Null,
        message: Msg,
        init: ($) =>
          $.set(null).run(
            Command.make(
              "test/Hold",
              { args: {} },
              () =>
                Effect.uninterruptible(
                  Effect.andThen(Deferred.await(gate), Effect.sync(() => events.push("body done")))
                )
            )().pipe(Command.map(() => Msg.make({ _tag: "Done" })))
          ),
        update: (model) => model,
        view: (_, h) => h.text("holder")
      })
      const parent = <R>(child: Component.Component<"Child", {}, null, any, never, R, any>) =>
        Component.make({
          name: "Parent",
          model: Schema.Boolean,
          message: Msg,
          init: () => true,
          update: (open, message) => message._tag === "Close" ? false : open,
          view: (open, h) => h.el("div", open ? h.child(child, { key: "child", props: {} }) : null)
        })
      return { events, gate, Stubborn, Child, Holder, parent, Msg }
    }

    // Closes the mount Scope and checks the close waits for the body, which the gate holds.
    const closeWaitsForBody = Effect.fnUntraced(
      function*(
        scope: Scope.Closeable,
        { events, gate }: { readonly events: Array<string>; readonly gate: Deferred.Deferred<void> }
      ) {
        const closing = yield* Effect.forkChild(Scope.close(scope, Exit.void))
        // The close fiber runs on the default scheduler, so it gets turns between the settles.
        for (let turn = 0; turn < 3; turn++) {
          yield* TestHost.settle
          yield* Effect.yieldNow
        }
        assert.isUndefined(closing.pollUnsafe())
        Deferred.doneUnsafe(gate, Exit.void)
        yield* TestHost.settle
        yield* Fiber.join(closing)
        events.push("root closed")
        assert.deepStrictEqual(events, ["body done", "root closed"])
      }
    )

    it.effect("closing the root waits for a detached run that was already interrupted", () => {
      const stubborn = makeStubborn()
      const { Child, Stubborn, parent } = stubborn
      return Effect.gen(function*() {
        const scope = yield* Scope.make()
        const root = yield* TestHost.mount(parent(Child), {}).pipe(Scope.provide(scope))
        yield* TestHost.settle
        click(root, "stop")
        yield* TestHost.settle
        // Out of the schedule, but its fiber hasn't exited.
        assert.deepStrictEqual(root.pending(), [])
        yield* closeWaitsForBody(scope, stubborn)
      }).pipe(Effect.provide(Stubborn.layer), Effect.provide(TestHost.layer()))
    })

    it.effect("closing the root waits for an unmounted instance's close that is still running", () =>
      provideHost(Effect.gen(function*() {
        const stubborn = makeStubborn()
        const { Holder, Msg, parent } = stubborn
        const scope = yield* Scope.make()
        const root = yield* TestHost.mount(parent(Holder), {}).pipe(Scope.provide(scope))
        yield* TestHost.settle
        root.send(Msg.make({ _tag: "Close" }))
        yield* TestHost.settle
        assert.notInclude(root.text(), "holder")
        yield* closeWaitsForBody(scope, stubborn)
      })))

    it.effect("closing the root waits for a detached run to exit", () => {
      const stubborn = makeStubborn()
      const { Child, Msg, Stubborn, parent } = stubborn
      return Effect.gen(function*() {
        const scope = yield* Scope.make()
        const root = yield* TestHost.mount(parent(Child), {}).pipe(Scope.provide(scope))
        yield* TestHost.settle
        root.send(Msg.make({ _tag: "Close" }))
        yield* TestHost.settle
        assert.strictEqual(root.pending().length, 1)
        yield* closeWaitsForBody(scope, stubborn)
      }).pipe(Effect.provide(Stubborn.layer), Effect.provide(TestHost.layer()))
    })

    it.effect("closing the root waits for a run that ends with its instance", () =>
      provideHost(Effect.gen(function*() {
        const stubborn = makeStubborn()
        const scope = yield* Scope.make()
        yield* TestHost.mount(stubborn.Holder, {}).pipe(Scope.provide(scope))
        yield* TestHost.settle
        yield* closeWaitsForBody(scope, stubborn)
      })))

    it.effect("closing the Layer build that owns a detached run waits for it before the build is released", () =>
      provideHost(Effect.gen(function*() {
        const { Child, Msg, Stubborn, events, gate, parent } = makeStubborn()
        const root = yield* TestHost.mount(parent(Component.provide(Child, Stubborn.layer)), {})
        yield* TestHost.settle
        root.send(Msg.make({ _tag: "Close" }))
        yield* TestHost.settle
        assert.deepStrictEqual(events, [])
        Deferred.doneUnsafe(gate, Exit.void)
        yield* TestHost.settle
        assert.deepStrictEqual(events, ["body done", "build released"])
      })))

    it.effect("switch runs, Stream Commands and Command.make Commands end with their instance", () =>
      provideHost(Effect.gen(function*() {
        const stopped: Array<string> = []
        const held = (name: string) => Effect.onInterrupt(Effect.never, () => Effect.sync(() => stopped.push(name)))
        class Latest extends Command.Service<Latest>()(
          "test/Latest",
          { args: {}, invalidates: () => [], mode: "switch" },
          Effect.succeed(() => held("switch"))
        ) {}
        class Watch extends Command.Service<Watch>()(
          "test/Watch",
          { args: {}, invalidates: () => [], stream: true },
          Effect.succeed(() => Stream.fromEffect(held("stream")))
        ) {}
        const Local = Command.make("test/Local", { args: {} }, () => held("make"))
        const Msg = Schema.TaggedUnion({ Close: {} })
        const Busy = Component.make({
          name: "Busy",
          model: Schema.Boolean,
          message: Msg,
          init: ($) => $.set(true).run(Latest.make()).run(Watch.make()).run(Local()),
          update: () => false,
          view: (open, h) =>
            h.el(
              "div",
              open ?
                h.child(
                  Component.make({
                    name: "Inner",
                    model: Schema.Null,
                    message: Schema.Never,
                    init: ($) => $.set(null).run(Latest.make()).run(Watch.make()).run(Local()),
                    update: (model) => model,
                    view: (_, h) => h.text("inner")
                  }),
                  { key: "inner", props: {} }
                ) :
                null
            )
        })
        const App = Component.provide(
          Busy,
          Layer.mergeAll(
            Layer.succeed(Latest, () => held("switch")),
            Layer.succeed(Watch, () => Stream.fromEffect(held("stream")))
          )
        )
        const root = yield* TestHost.mount(App, {})
        yield* TestHost.settle
        assert.deepStrictEqual(root.pending().map((entry) => entry._tag === "Command" && entry.detached), [
          false,
          false,
          false,
          false,
          false,
          false
        ])
        root.send(Msg.make({ _tag: "Close" }))
        yield* TestHost.settle
        assert.sameMembers(stopped, ["switch", "stream", "make"])
        assert.strictEqual(root.pending().length, 3)
      })))

    it.effect("h.running ends when an interrupted run's fiber exits, and the instance re-renders", () =>
      provideHost(Effect.gen(function*() {
        const server = makeServer()
        const App = Component.provide(
          EditorPage,
          Layer.mergeAll(Save.layer.pipe(Layer.provide(api(server))), fetcher(server))
        )
        const root = yield* TestHost.mount(App, {})
        yield* TestHost.settle
        click(root, "save")
        yield* TestHost.settle
        assert.include(root.text(), "saving")
        click(root, "stop")
        yield* TestHost.settle
        assert.include(root.text(), "idle")
        assert.strictEqual(server.interrupted, 1)
      })))

    it.effect("a write lands in its entry without a request, and changes never shows the patch", () =>
      provideHost(Effect.gen(function*() {
        const server = makeServer()
        const App = Component.provide(
          EditorPage,
          Layer.mergeAll(Rename.layer.pipe(Layer.provide(api(server))), fetcher(server))
        )
        const root = yield* TestHost.mount(App, {})
        yield* TestHost.settle
        assert.strictEqual(server.requests, 1)
        click(root, "rename")
        yield* TestHost.settle
        // The patch is live from issue. `changes` shows the server value, which doesn't move.
        assert.include(root.text(), "count 0")
        yield* TestClock.adjust("1 second")
        yield* TestHost.settle
        assert.include(root.text(), "count 1")
        // The write was stored fresh, so the run's own invalidation skipped it.
        assert.strictEqual(server.requests, 1)
      })))

    it.effect("the loader mount option sets how long an unwatched entry stays", () =>
      provideHost(Effect.gen(function*() {
        const server = makeServer()
        const App = Component.provide(
          page(Editor),
          Layer.mergeAll(fetcher(server), Save.layer.pipe(Layer.provide(api(server))))
        )
        const root = yield* TestHost.mount(App, {}, { loader: { idleTimeToLive: "1 second" } })
        yield* TestHost.settle
        root.send(PageMsg.make({ _tag: "Watch", on: false }))
        yield* TestHost.settle
        yield* TestClock.adjust("500 millis")
        root.send(PageMsg.make({ _tag: "Watch", on: true }))
        yield* TestHost.settle
        assert.strictEqual(server.requests, 1)
        root.send(PageMsg.make({ _tag: "Watch", on: false }))
        yield* TestHost.settle
        yield* TestClock.adjust("1 second")
        root.send(PageMsg.make({ _tag: "Watch", on: true }))
        yield* TestHost.settle
        assert.strictEqual(server.requests, 2)
      })))
  })

  describe("Subscriptions", () => {
    it.effect("are diffed by key, closing the old key before starting the new one", () =>
      provideHost(Effect.gen(function*() {
        const Msg = Schema.TaggedUnion({ Room: { id: Schema.String }, Said: { text: Schema.String } })
        const Chat = Component.make({
          name: "Chat",
          model: Schema.Struct({ room: Schema.String, said: Schema.Array(Schema.String) }),
          message: Msg,
          init: () => ({ room: "1", said: [] }),
          update: (model, message) =>
            Msg.match(message, {
              Room: ({ id }) => ({ ...model, room: id }),
              Said: ({ text }) => ({ ...model, said: [...model.said, text] })
            }),
          view: (model, h) => h.text(model.said.join(",")),
          subscriptions: (model) => [
            Subscription.make(
              "room",
              [model.room],
              ([room]) => Stream.make(Msg.make({ _tag: "Said", text: `hello from ${room}` }))
            )
          ]
        })
        const root = yield* TestHost.mount(Chat, {})
        yield* TestHost.settle
        root.send(Msg.make({ _tag: "Room", id: "2" }))
        yield* TestHost.settle
        assert.strictEqual(root.text(), "hello from 1,hello from 2")
        const changes = root.log().filter((entry) =>
          entry._tag === "SubscriptionStarted" || entry._tag === "SubscriptionStopped"
        ) as ReadonlyArray<MessageLog.SubscriptionChanged>
        assert.deepStrictEqual(changes.map((entry) => entry._tag), [
          "SubscriptionStarted",
          "SubscriptionStopped",
          "SubscriptionStarted"
        ])
        assert.notStrictEqual(changes[0].key, changes[2].key)
      })))
  })

  it.effect("a child's emit from init reaches its parent after the parent's first Model", () =>
    provideHost(Effect.gen(function*() {
      const Child = Component.make({
        name: "Child",
        model: Schema.Number,
        message: Schema.Never,
        events: Schema.String,
        init: ($) => $.set(0).emit("ready"),
        update: (n) => n,
        view: (_, h) => h.text("child")
      })
      const Parent = Component.make({
        name: "Parent",
        model: Schema.Number,
        message: Schema.String,
        init: () => 0,
        update: (n) => n + 1,
        view: (n, h) => h.el("div", String(n), h.child(Child, { key: "c", onEmit: (message) => message }))
      })
      const root = yield* TestHost.mount(Parent, {})
      yield* TestHost.settle
      assert.strictEqual(root.model(), 1)
      assert.strictEqual(root.text(), "1child")
    })))

  describe("props", () => {
    it.effect("a props change re-renders the child without reaching its update", () =>
      provideHost(Effect.gen(function*() {
        const Label = Component.make({
          name: "Label",
          props: Schema.Struct({ text: Schema.String }),
          model: Schema.Number,
          message: Schema.Never,
          init: () => 0,
          update: (model) => model,
          view: (_, h) => h.el("span", h.props.text)
        })
        const Msg = Schema.TaggedUnion({ Rename: { text: Schema.String } })
        const Host = Component.make({
          name: "Host",
          model: Schema.String,
          message: Msg,
          init: () => "one",
          update: (_, message) => message.text,
          view: (text, h) => h.el("div", h.child(Label, { key: "l", props: { text } }))
        })
        const root = yield* TestHost.mount(Host, {})
        const span = root.get(Query.tag("span"))
        root.send(Msg.make({ _tag: "Rename", text: "two" }))
        yield* TestHost.settle
        assert.strictEqual(root.text(), "two")
        assert.strictEqual(root.get(Query.tag("span")), span)
        assert.deepStrictEqual(tags(root, "/Host/Label[l]"), ["Mounted"])
      })))
  })

  describe("provided Layers", () => {
    class Greeter extends Context.Service<Greeter, { readonly greet: (name: string) => string }>()("test/Greeter") {}
    class Greet extends Command.Service<Greet>()(
      "test/Greet",
      { args: { name: Schema.String }, invalidates: () => [] },
      Effect.gen(function*() {
        const greeter = yield* Greeter
        return ({ name }) => Effect.succeed(greeter.greet(name))
      })
    ) {}
    const Hello = Component.make({
      name: "Hello",
      model: Schema.String,
      message: Schema.String,
      init: ($) => $.set("...").run(Greet.make({ name: "world" })),
      update: (_, message) => message,
      view: (text, h) => h.text(text)
    })

    it.effect("Commands wait for a Layer that builds in the background", () =>
      provideHost(Effect.gen(function*() {
        const slow = Layer.effect(
          Greeter,
          Effect.as(Effect.sleep("1 second"), { greet: (name: string) => `hello ${name}` })
        )
        const App = Component.provide(Hello, Greet.layer.pipe(Layer.provideMerge(slow)))
        const root = yield* TestHost.mount(App, {})
        yield* TestHost.settle
        assert.strictEqual(root.text(), "...")
        yield* TestClock.adjust("1 second")
        yield* TestHost.settle
        assert.strictEqual(root.text(), "hello world")
        assert.deepStrictEqual(tags(root).slice(0, 5), [
          "SessionStarted",
          "Mounted",
          "LayerPending",
          "LayerReady",
          "Update"
        ])
      })))

    it.effect("a Layer value is built once per Env and closed by its last user", () =>
      provideHost(Effect.gen(function*() {
        let builds = 0
        let closes = 0
        const counted = Layer.effect(
          Greeter,
          Effect.acquireRelease(
            Effect.sync(() => {
              builds++
              return { greet: (name: string) => `hi ${name}` }
            }),
            () => Effect.sync(() => closes++)
          )
        )
        const Shared = Component.provide(Hello, Greet.layer.pipe(Layer.provideMerge(counted)))
        const Msg = Schema.TaggedUnion({ Drop: {} })
        const Two = Component.make({
          name: "Two",
          model: Schema.Number,
          message: Msg,
          init: () => 2,
          update: (n) => n - 1,
          view: (n, h) =>
            h.el("div", Array.from({ length: n }, (_, i) => h.child(Shared, { key: String(i), props: {} })))
        })
        const root = yield* TestHost.mount(Two, {})
        yield* TestHost.settle
        assert.strictEqual(root.text(), "hi worldhi world")
        assert.strictEqual(builds, 1)
        root.send(Msg.make({ _tag: "Drop" }))
        yield* TestHost.settle
        assert.strictEqual(closes, 0)
        root.send(Msg.make({ _tag: "Drop" }))
        yield* TestHost.settle
        assert.strictEqual(closes, 1)
      })))

    it.effect("onFailure turns a failed build into a message, and the component stays mounted", () =>
      provideHost(Effect.gen(function*() {
        const failing = Layer.effect(Greeter, Effect.fail("offline" as const))
        const Msg = Schema.TaggedUnion({ Failed: {} })
        const Status = Component.make({
          name: "Status",
          model: Schema.String,
          message: Msg,
          init: () => "loading",
          update: () => "failed",
          view: (text, h) => h.text(text)
        })
        const App = Component.provide(Status, failing, { onFailure: () => Msg.make({ _tag: "Failed" }) })
        const root = yield* TestHost.mount(App, {})
        yield* TestHost.settle
        assert.strictEqual(root.text(), "failed")
        assert.includeMembers(tags(root), ["LayerFailed", "Update"])
        assert.notInclude(tags(root), "Failed")
      })))
  })

  describe("features", () => {
    class Badge extends Feature.Service<Badge>()("test/Badge", {
      props: Schema.Struct({ label: Schema.String }),
      events: Schema.String
    }) {}
    const BadgeImpl = Component.make({
      name: "BadgeImpl",
      props: Schema.Struct({ label: Schema.String }),
      model: Schema.Number,
      message: Schema.Never,
      events: Schema.String,
      init: () => 0,
      update: (model) => model,
      view: (_, h) => h.el("b", h.props.label)
    })
    const Msg = Schema.TaggedUnion({ Heard: { text: Schema.String } })
    const Shell = Component.make({
      name: "Shell",
      model: Schema.Array(Schema.String),
      message: Msg,
      init: () => [],
      update: (heard, message) => [...heard, message.text],
      view: (_, h) =>
        h.el(
          "div",
          h.child(Badge, {
            key: "b",
            props: { label: "new" },
            onEmit: (text) => Msg.make({ _tag: "Heard", text }),
            fallback: (result) => h.text(result._tag === "Initial" ? "loading" : "unavailable")
          })
        )
    })

    it.effect("a feature child shows its fallback until the Layer above it is ready", () =>
      provideHost(Effect.gen(function*() {
        const slowBadge = Layer.merge(
          Badge.layer(BadgeImpl),
          Layer.effectDiscard(Effect.sleep("1 second"))
        )
        const App = Component.provide(Shell, slowBadge)
        const root = yield* TestHost.mount(App, {})
        assert.strictEqual(root.text(), "loading")
        yield* TestClock.adjust("1 second")
        yield* TestHost.settle
        assert.strictEqual(root.text(), "new")
        assert.include(tags(root, "/Shell/test/Badge[b]"), "Mounted")
      })))

    it.effect("stub records props and emits what the test sends", () =>
      Effect.gen(function*() {
        const stub = TestHost.stub(Badge)
        const root = yield* TestHost.mount(Shell, {}).pipe(Effect.provide(stub.layer))
        yield* TestHost.settle
        assert.deepStrictEqual(stub.props(), [{ label: "new" }])
        assert.isDefined(root.query(Query.attr("data-stub", "test/Badge")))
        stub.emit("ping")
        yield* TestHost.settle
        assert.deepStrictEqual(root.model(), ["ping"])
      }).pipe(provideHost))
  })

  describe("MessageLog", () => {
    it.effect("a logged session replays through Story.fromLog", () =>
      provideHost(Effect.gen(function*() {
        const root = yield* TestHost.mount(Counter, { initial: 5 })
        click(root, "+")
        click(root, "-")
        click(root, "+")
        yield* TestHost.settle
        const replay = Story.fromLog(Counter, root.log())
        assert.strictEqual(replay.replayed, 3)
        assert.isUndefined(replay.divergence)
        assert.deepStrictEqual(replay.model, { count: 6 })

        // Through the Wire, and against a component whose update changed.
        const encoder = MessageLog.makeEncoder()
        const wire = root.log().map(encoder.encode)
        assert.deepStrictEqual(Story.fromLog(Counter, wire).model, { count: 6 })
        const Changed = Component.make({
          name: "Counter",
          props: Schema.Struct({ initial: Schema.Number }),
          model: Schema.Struct({ count: Schema.Number }),
          message: CounterMessage,
          init: ($) => ({ count: $.props.initial }),
          update: (model, message) => ({ count: model.count + (message._tag === "Increment" ? 2 : -1) }),
          view: (model, h) => h.text(String(model.count))
        })
        const diverged = Story.fromLog(Changed, wire)
        assert.deepStrictEqual(diverged.divergence?.recorded.model, { count: 6 })
        assert.deepStrictEqual(diverged.divergence?.recomputed.model, { count: 7 })
        assert.strictEqual(diverged.divergence?.seq, wire[2].seq)
      })))

    it("the Wire encodes args through their Schema, redacted, with a structural fallback per field", () => {
      const Send = Command.make(
        "Send",
        {
          args: {
            channel: Schema.String,
            token: Schema.Redacted(Schema.String),
            when: Schema.Date,
            nested: Schema.Struct({ secret: Schema.Redacted(Schema.String), loose: Schema.Any }),
            f: Schema.Any
          },
          group: ["channel"]
        },
        () => Effect.succeed(1)
      )
      const command = Send({
        channel: "general",
        token: Redacted.make("secret"),
        when: new Date(0),
        nested: { secret: Redacted.make("hidden"), loose: new Date(0) },
        f: () => 1
      })
      const encoded = MessageLog.encodeCommand(command)
      assert.deepStrictEqual(encoded, {
        _tag: "Effect",
        name: "Send",
        group: `{"channel":"general"}`,
        args: {
          channel: "general",
          token: { "~redacted": true },
          when: "1970-01-01T00:00:00.000Z",
          nested: { secret: { "~redacted": true }, loose: "1970-01-01T00:00:00.000Z" },
          f: { "~unserialisable": "function" }
        }
      })
      assert.notInclude(JSON.stringify(encoded), ":\"secret\"")
      assert.notInclude(JSON.stringify(encoded), "hidden")
    })

    it("the Wire's group is the group fields encoded with redaction, for a run and an Interrupt", () => {
      const Sync = Command.make(
        "Sync",
        { args: { secret: Schema.RedactedFromValue(Schema.String), room: Schema.String }, group: ["secret", "room"] },
        () => Effect.succeed(1)
      )
      const command = Sync({ secret: Redacted.make("secret-token"), room: "a" })
      const interrupt = Command.interrupt(Sync, { secret: Redacted.make("secret-token"), room: "a" })
      // The scheduling key keeps the real encoding, so two secrets are two groups.
      assert.strictEqual(command.groupKey, interrupt.groupKey)
      assert.include(command.groupKey, "secret-token")
      const placeholder = JSON.stringify({ room: "a", secret: { "~redacted": true } })
      assert.strictEqual(MessageLog.encodeCommand(command).group, placeholder)
      assert.strictEqual(MessageLog.encodeCommand(interrupt).group, placeholder)
      assert.notInclude(JSON.stringify(MessageLog.encodeCommand(command)), "secret-token")
      assert.notInclude(JSON.stringify(MessageLog.encodeCommand(interrupt)), "secret-token")
    })

    it("the Wire falls back on the leaf that fails, keeping its siblings' codecs and redaction", () => {
      const EncodedSecret = Schema.Redacted(Schema.String).pipe(
        Schema.decodeTo(
          Schema.String,
          SchemaTransformation.transform({ decode: Redacted.value, encode: Redacted.make })
        )
      )
      const Upload = Command.make(
        "Upload",
        {
          args: {
            items: Schema.Array(Schema.Struct({
              secret: EncodedSecret,
              file: Schema.instanceOf(File),
              n: Schema.NumberFromString
            })),
            pair: Schema.Tuple([Schema.NumberFromString, Schema.instanceOf(File)]),
            choice: Schema.Union([Schema.NumberFromString, Schema.Struct({ file: Schema.instanceOf(File) })]),
            hidden: Schema.Option(Schema.Redacted(Schema.String))
          }
        },
        () => Effect.succeed(1)
      )
      const file = new File(["x"], "a.txt")
      const command = Upload({
        items: [{ secret: "must-not-log", file, n: 2 }],
        pair: [3, file],
        choice: { file },
        // A malformed value under a Schema that declares a Redacted is a placeholder, not `structural`.
        hidden: "must-not-log-either" as any
      })
      const encoded = MessageLog.encodeCommand(command)
      assert.deepStrictEqual(encoded.args, {
        items: [{ secret: { "~redacted": true }, file: {}, n: "2" }],
        pair: ["3", {}],
        choice: { file: {} },
        hidden: { "~redacted": true }
      })
      assert.notInclude(JSON.stringify(encoded), "must-not-log")
    })

    it("the Wire's fallback keeps redaction in tuple tails and in every matching record signature", () => {
      const EncodedSecret = Schema.Redacted(Schema.String).pipe(
        Schema.decodeTo(
          Schema.String,
          SchemaTransformation.transform({ decode: Redacted.value, encode: Redacted.make })
        )
      )
      const Upload = Command.make(
        "Upload",
        {
          args: {
            tail: Schema.TupleWithRest(Schema.Tuple([]), [Schema.instanceOf(File), EncodedSecret]),
            middle: Schema.TupleWithRest(Schema.Tuple([Schema.NumberFromString]), [
              Schema.instanceOf(File),
              EncodedSecret,
              Schema.NumberFromString
            ]),
            keyed: Schema.StructWithRest(Schema.Struct({ n: Schema.NumberFromString }), [
              Schema.Record(Schema.TemplateLiteral(["file-", Schema.String]), Schema.instanceOf(File)),
              Schema.Record(Schema.TemplateLiteral(["secret-", Schema.String]), EncodedSecret)
            ]),
            // Both signatures match `secret-a`, and one declares a Redacted, so it's a placeholder.
            overlapping: Schema.StructWithRest(Schema.Struct({}), [
              Schema.Record(Schema.String, Schema.Unknown),
              Schema.Record(Schema.TemplateLiteral(["secret-", Schema.String]), EncodedSecret)
            ])
          }
        },
        () => Effect.succeed(1)
      )
      const file = new File(["x"], "a.txt")
      const command = Upload({
        tail: [file, "must-not-log"],
        middle: [1, file, file, "must-not-log", 2],
        keyed: { n: 3, "file-a": file, "secret-a": "must-not-log" },
        overlapping: { "secret-a": "must-not-log", other: file }
      } as any)
      const encoded = MessageLog.encodeCommand(command)
      assert.deepStrictEqual(encoded.args, {
        tail: [{}, { "~redacted": true }],
        middle: ["1", {}, {}, { "~redacted": true }, "2"],
        keyed: { n: "3", "file-a": {}, "secret-a": { "~redacted": true } },
        overlapping: { "secret-a": { "~redacted": true }, other: {} }
      })
      assert.notInclude(JSON.stringify(encoded), "must-not-log")
    })

    it("the Wire redacts a key that two record signatures match, through the codec and in the fallback", () => {
      const EncodedSecret = Schema.Redacted(Schema.String).pipe(
        Schema.decodeTo(
          Schema.String,
          SchemaTransformation.transform({ decode: Redacted.value, encode: Redacted.make })
        )
      )
      // Two signatures that redact different fields. With `withFile` a leaf fails, so the codec falls back.
      const Entries = (withFile: boolean) =>
        Schema.StructWithRest(Schema.Struct({}), [
          Schema.Record(
            Schema.String,
            Schema.Struct({
              a: EncodedSecret,
              b: Schema.String,
              ...(withFile ? { file: Schema.instanceOf(File) } : {})
            })
          ),
          Schema.Record(
            Schema.TemplateLiteral(["secret-", Schema.String]),
            Schema.Struct({
              a: Schema.String,
              b: EncodedSecret,
              ...(withFile ? { file: Schema.instanceOf(File) } : {})
            })
          )
        ])
      const Save = Command.make(
        "Save",
        { args: { codec: Entries(false), fallback: Entries(true) } },
        () => Effect.succeed(1)
      )
      const file = new File(["x"], "a.txt")
      const encoded = MessageLog.encodeCommand(Save({
        codec: { "secret-a": { a: "hidden-one", b: "hidden-two" }, plain: { a: "hidden-three", b: "shown" } },
        fallback: {
          "secret-a": { a: "hidden-one", b: "hidden-two", file },
          plain: { a: "hidden-three", b: "shown", file }
        }
      } as any))
      assert.deepStrictEqual(encoded.args, {
        codec: { "secret-a": { "~redacted": true }, plain: { a: { "~redacted": true }, b: "shown" } },
        fallback: { "secret-a": { "~redacted": true }, plain: { a: { "~redacted": true }, b: "shown", file: {} } }
      })
      assert.notInclude(JSON.stringify(encoded), "hidden")
    })

    it("the Wire redacts a named property that a redacting index signature matches, through the codec and in the fallback", () => {
      const EncodedSecret = Schema.Redacted(Schema.String).pipe(
        Schema.decodeTo(
          Schema.String,
          SchemaTransformation.transform({ decode: Redacted.value, encode: Redacted.make })
        )
      )
      // `token` is a named property, and the `tok` signature, which redacts, matches it too.
      const Entry = (withFile: boolean) =>
        Schema.StructWithRest(
          Schema.Struct({
            token: Schema.String,
            other: Schema.NumberFromString,
            ...(withFile ? { file: Schema.instanceOf(File) } : {})
          }),
          [Schema.Record(Schema.TemplateLiteral(["tok", Schema.String]), EncodedSecret)]
        )
      // The reverse: the property redacts, and a plain signature matches it.
      const Reverse = Schema.StructWithRest(Schema.Struct({ token: EncodedSecret }), [
        Schema.Record(Schema.String, Schema.String)
      ])
      const Save = Command.make(
        "Save",
        { args: { codec: Entry(false), fallback: Entry(true), reverse: Reverse } },
        () => Effect.succeed(1)
      )
      const file = new File(["x"], "a.txt")
      const encoded = MessageLog.encodeCommand(Save({
        codec: { token: "hidden-one", other: 1, tokB: "hidden-two" },
        fallback: { token: "hidden-three", other: 2, file },
        reverse: { token: "hidden-four", note: "shown" }
      } as any))
      assert.deepStrictEqual(encoded.args, {
        codec: { token: { "~redacted": true }, other: "1", tokB: { "~redacted": true } },
        fallback: { token: { "~redacted": true }, other: "2", file: {} },
        reverse: { token: { "~redacted": true }, note: "shown" }
      })
      assert.notInclude(JSON.stringify(encoded), "hidden")
    })

    it("the Wire reads only what the Schema declares, and a value that throws is a placeholder", () => {
      const Save = Command.make(
        "Save",
        {
          args: {
            codec: Schema.Struct({ id: Schema.NumberFromString }),
            fallback: Schema.Struct({ id: Schema.NumberFromString, file: Schema.instanceOf(File) }),
            throws: Schema.Struct({ id: Schema.NumberFromString, file: Schema.instanceOf(File) })
          }
        },
        () => Effect.succeed(1)
      )
      const file = new File(["x"], "a.txt")
      const unread = <A extends object>(value: A): A =>
        Object.defineProperty(value, "unused", {
          enumerable: true,
          get: () => {
            throw new Error("must not be read")
          }
        })
      const throws = Object.defineProperty({ file }, "id", {
        enumerable: true,
        get: () => {
          throw new Error("declared, and it throws")
        }
      })
      const encoded = MessageLog.encodeCommand(Save({
        codec: unread({ id: 1 }),
        fallback: unread({ id: 2, file }),
        throws: throws as any
      }))
      assert.deepStrictEqual(encoded.args, {
        codec: { id: "1" },
        fallback: { id: "2", file: {} },
        throws: { id: { "~unserialisable": "encode" }, file: {} }
      })
    })

    it("the Wire encodes a cyclic arg with a placeholder for the cycle, instead of overflowing", () => {
      interface Node {
        readonly label: string
        readonly secret: Redacted.Redacted<string>
        readonly next: Node | null
      }
      const Node: Schema.Codec<Node, unknown> = Schema.Struct({
        label: Schema.String,
        secret: Schema.Redacted(Schema.String),
        next: Schema.NullOr(Schema.suspend((): Schema.Codec<Node, unknown> => Node))
      })
      interface Link {
        readonly next: Link
      }
      const Link: Schema.Codec<Link> = Schema.Struct({ next: Schema.suspend((): Schema.Codec<Link> => Link) })
      const Walk = Command.make(
        "Walk",
        { args: { node: Node, link: Link, list: Schema.Array(Schema.Unknown) } },
        () => Effect.succeed(1)
      )
      const node: { label: string; secret: Redacted.Redacted<string>; next: unknown } = {
        label: "a",
        secret: Redacted.make("must-not-log"),
        next: null
      }
      node.next = node
      const list: Array<unknown> = [1]
      list.push(list)
      const link: { next: unknown } = { next: null }
      link.next = link
      const encoded = MessageLog.encodeCommand(Walk({ node: node as Node, link: link as Link, list }))
      assert.deepStrictEqual(encoded.args, {
        node: { label: "a", secret: { "~redacted": true }, next: { "~unserialisable": "cycle" } },
        link: { next: { "~unserialisable": "cycle" } },
        list: [1, { "~unserialisable": "cycle" }]
      })
      assert.notInclude(JSON.stringify(encoded), "must-not-log")
    })

    it("Renderer.Ref encodes as its key, and the log shows a ref Command's args that way", () => {
      const Field = Renderer.ref("Field")
      const row = Field.at(3)
      assert.strictEqual(Schema.encodeSync(Renderer.Ref)(row), "Field[3]")
      const decoded = Schema.decodeSync(Renderer.Ref)("Field[3]")
      assert.deepStrictEqual([decoded.name, decoded.key, decoded.at(1).key], ["Field", "Field[3]", "Field[3][1]"])
      assert.deepStrictEqual(MessageLog.encodeCommand(Html.Focus({ ref: row })).args, { ref: "Field[3]" })
    })

    it("truncates a Model over maxEntryBytes, and fromLog names the entry", () => {
      const encoder = MessageLog.makeEncoder({ maxEntryBytes: 10 })
      const entry: MessageLog.Mounted = {
        _tag: "Mounted",
        seq: 1,
        at: 0,
        session: "s",
        path: "/Counter",
        component: Counter,
        props: { initial: 123456789 },
        model: { count: 123456789 },
        commands: [],
        events: [],
        adopted: false
      }
      const wire = encoder.encode(entry)
      assert.deepStrictEqual((wire as any).model, { "~truncated": 19 })
      assert.throws(() => Story.fromLog(Counter, [wire]), /entry #1 \(\/Counter\).*~truncated/)
    })

    it("truncates a message over maxEntryBytes, as it does a Model", () => {
      // The message is 20 bytes and the Model 11.
      const encoder = MessageLog.makeEncoder({ maxEntryBytes: 15 })
      const entry: MessageLog.Update = {
        _tag: "Update",
        seq: 2,
        at: 0,
        session: "s",
        path: "/Counter",
        component: Counter,
        source: { _tag: "Dispatch" },
        message: CounterMessage.make({ _tag: "Increment" }),
        props: { initial: 1 },
        model: { count: 1 },
        commands: [],
        events: []
      }
      assert.deepStrictEqual((encoder.encode(entry) as any).message, { "~truncated": 20 })
      assert.deepStrictEqual((encoder.encode(entry) as any).model, { count: 1 })
    })

    it("encodes FetchStarted on the Wire as it is, and decodes it back", () => {
      const entry: MessageLog.FetchStarted = {
        _tag: "FetchStarted",
        seq: 3,
        at: 10,
        session: "s",
        path: "/App",
        read: "users/GetUser",
        logKey: `{"id":"1"}`,
        trigger: "visibility",
        restart: false,
        inWindow: false,
        stored: true
      }
      const wire = MessageLog.makeEncoder().encode(entry)
      assert.deepStrictEqual(wire, entry)
      assert.deepStrictEqual(Schema.decodeUnknownSync(MessageLog.Wire)(JSON.parse(JSON.stringify(wire))), wire)
    })

    it("Redacted values in component Schemas are sent as placeholders", () => {
      class User extends Schema.Class<User>("User")({ name: Schema.String, pin: Schema.Redacted(Schema.Number) }) {}
      const Secret = Component.make({
        name: "Secret",
        props: Schema.Struct({ key: Schema.Redacted(Schema.String) }),
        model: Schema.Struct({
          token: Schema.Redacted(Schema.String),
          fromValue: Schema.RedactedFromValue(Schema.String),
          maybe: Schema.optional(Schema.Redacted(Schema.String)),
          option: Schema.Option(Schema.Redacted(Schema.String)),
          users: Schema.Array(User)
        }),
        message: Schema.TaggedUnion({ Login: { password: Schema.Redacted(Schema.String) } }),
        events: Schema.Redacted(Schema.String),
        init: () => ({ token: Redacted.make("t"), fromValue: Redacted.make("v"), option: Option.none(), users: [] }),
        update: (model) => model,
        view: (_, h) => h.text("")
      })
      const placeholder = { "~redacted": true }
      const warnings: Array<string> = []
      const entry: MessageLog.Update = {
        _tag: "Update",
        seq: 1,
        at: 0,
        session: "s",
        path: "/Secret",
        component: Secret,
        source: { _tag: "Dispatch" },
        message: { _tag: "Login", password: Redacted.make("hunter2") },
        props: { key: Redacted.make("k") },
        model: {
          token: Redacted.make("t"),
          fromValue: Redacted.make("v"),
          maybe: Redacted.make("m"),
          option: Option.some(Redacted.make("o")),
          users: [new User({ name: "ada", pin: Redacted.make(1234) })]
        },
        commands: [],
        events: [Redacted.make("e")]
      }
      const wire = MessageLog.makeEncoder({ onWarning: (warning) => warnings.push(warning) }).encode(entry) as any
      assert.deepStrictEqual(wire.message, { _tag: "Login", password: placeholder })
      assert.deepStrictEqual(wire.props, { key: placeholder })
      assert.deepStrictEqual(wire.model, {
        token: placeholder,
        fromValue: placeholder,
        maybe: placeholder,
        option: { _tag: "Some", value: placeholder },
        users: [{ name: "ada", pin: placeholder }]
      })
      assert.deepStrictEqual(wire.events, [placeholder])
      assert.deepStrictEqual(warnings, [])
    })

    it("Redacted values inside declarations and transformations are sent as placeholders", () => {
      const Secret = Schema.RedactedFromValue(Schema.String)
      class Holder extends Schema.Class<Holder>("Holder")({ secret: Secret }) {}
      const Model = Schema.Struct({
        option: Schema.Option(Secret),
        nested: Schema.Option(Schema.Option(Holder)),
        map: Schema.ReadonlyMap(Schema.String, Secret),
        encodedSide: Schema.Redacted(Schema.String).pipe(
          Schema.decodeTo(
            Schema.String,
            SchemaTransformation.transform({ decode: Redacted.value, encode: Redacted.make })
          )
        ),
        plain: Schema.Option(Schema.ReadonlyMap(Schema.String, Schema.Date))
      })
      const model: typeof Model.Type = {
        option: Option.some(Redacted.make("s1")),
        nested: Option.some(Option.some(new Holder({ secret: Redacted.make("s2") }))),
        map: new Map([["k", Redacted.make("s3")]]),
        encodedSide: "s4",
        plain: Option.some(new Map([["at", new Date(0)]]))
      }
      const Secrets = Component.make({
        name: "Secrets",
        model: Model,
        message: Schema.Never,
        init: () => model,
        update: (model) => model,
        view: (_, h) => h.text("")
      })
      const placeholder = { "~redacted": true }
      const wire = MessageLog.makeEncoder().encode({
        _tag: "Mounted",
        seq: 1,
        at: 0,
        session: "s",
        path: "/Secrets",
        component: Secrets,
        props: {},
        model,
        commands: [],
        events: [],
        adopted: false
      }) as any
      assert.deepStrictEqual(wire.model, {
        option: { _tag: "Some", value: placeholder },
        nested: { _tag: "Some", value: { _tag: "Some", value: { secret: placeholder } } },
        map: [["k", placeholder]],
        encodedSide: placeholder,
        // Schemas without a Redacted value encode as `Schema.toCodecJson` does.
        plain: Schema.encodeSync(Schema.toCodecJson(Model.fields.plain))(model.plain)
      })
    })

    it("memory keeps the last entries, and fanout feeds several logs", () => {
      const memory = MessageLog.makeMemory({ size: 2 })
      const other = MessageLog.makeMemory()
      const log = MessageLog.fanoutAll([memory, other, MessageLog.noop])
      for (let seq = 1; seq <= 3; seq++) {
        log.record({ _tag: "Unmounted", seq, at: 0, session: "s", path: "/x" })
      }
      assert.deepStrictEqual(memory.entries().map((entry) => entry.seq), [2, 3])
      assert.deepStrictEqual(other.entries().map((entry) => entry.seq), [1, 2, 3])
      assert.isFalse(MessageLog.fanoutAll([MessageLog.noop]).enabled)
    })
  })

  describe("vocabularies", () => {
    it.effect("h.el rejects text outside the vocabulary's text parents", () =>
      provideHost(Effect.gen(function*() {
        const Loose = Component.make({
          name: "Loose",
          model: Schema.Number,
          message: Schema.Never,
          elements: Tiny,
          init: () => 0,
          update: (model) => model,
          view: (_, h) => h.el("box", "loose text")
        })
        const root = yield* TestHost.mount(Loose, {})
        const failed = root.log().find((entry) => entry._tag === "Failed") as MessageLog.Failed
        assert.strictEqual(failed.source, "view")
        assert.include(String(failed.cause), "text goes inside label")
      })))

    it.effect("a nested component whose vocabulary the host doesn't show fails its slot", () =>
      Effect.gen(function*() {
        const Inner = Component.make({
          name: "Inner",
          model: Schema.Number,
          message: Schema.Never,
          elements: Tiny,
          init: () => 0,
          update: (model) => model,
          view: (_, h) => h.label("tiny")
        })
        const Outer = Component.make({
          name: "Outer",
          model: Schema.Number,
          message: Schema.Never,
          init: () => 0,
          update: (model) => model,
          view: (_, h) =>
            h.el("div", "outer ", h.child(Inner, { key: "i", props: {}, fallback: () => h.text("unsupported") }))
        })
        const root = yield* TestHost.mount(Outer, {})
        assert.strictEqual(root.text(), "outer unsupported")
        const failed = root.log().find((entry) => entry._tag === "Failed") as MessageLog.Failed
        assert.deepStrictEqual([failed.path, failed.source], ["/Outer/Inner[i]", "init"])
      }).pipe(
        Effect.provide(Renderer.layer({ ...TestHost.makeHost(), elements: ["html"] })),
        provideHost
      ))

    it.effect("controlled properties are re-applied after every patch", () =>
      provideHost(Effect.gen(function*() {
        const Msg = Schema.TaggedUnion({ Typed: { value: Schema.String }, Touch: {} })
        const Form = Component.make({
          name: "Form",
          model: Schema.Struct({ value: Schema.String, touched: Schema.Number }),
          message: Msg,
          elements: Tiny,
          init: () => ({ value: "a", touched: 0 }),
          update: (model, message) =>
            Msg.match(message, {
              Typed: ({ value }) => ({ ...model, value: value.toUpperCase() }),
              Touch: () => ({ ...model, touched: model.touched + 1 })
            }),
          view: (model, h) =>
            h.box(
              h.field().value(model.value).on("input", ({ value }) => Msg.make({ _tag: "Typed", value })),
              h.label(String(model.touched)).on("click", Msg.make({ _tag: "Touch" }))
            )
        })
        const root = yield* TestHost.mount(Form, {})
        const field = root.get(Query.tag("field")) as TestHost.TestElement
        // The user edits the live value; the next patch puts the Model's value back.
        field.props.value = "edited"
        click(root, "0")
        yield* TestHost.settle
        assert.strictEqual(field.props.value, "a")
        field.props.value = "b"
        Query.fire(field, "input", { value: "b" })
        yield* TestHost.settle
        assert.strictEqual(field.props.value, "B")
      })))

    it.effect("onMount runs with the element's node on hosts that run mounts", () =>
      Effect.gen(function*() {
        const Msg = Schema.TaggedUnion({ Mounted: { tag: Schema.String } })
        const Auto = Component.make({
          name: "Auto",
          model: Schema.String,
          message: Msg,
          elements: Tiny,
          init: () => "",
          update: (_, message) => message.tag,
          view: (tag, h) =>
            h.box(
              h.label(tag),
              h.field().onMount(
                "focus",
                (node) => Effect.succeed(Msg.make({ _tag: "Mounted", tag: (node as any).tag }))
              )
            )
        })
        const root = yield* TestHost.mount(Auto, {})
        yield* TestHost.settle
        assert.strictEqual(root.text(), "field")
        const update = root.log().find((entry) => entry._tag === "Update") as MessageLog.Update
        assert.deepStrictEqual(update.source, { _tag: "Mount", name: "focus" })
      }).pipe(
        Effect.provide(Renderer.layer({ ...TestHost.makeHost(), runsMounts: true })),
        provideHost
      ))

    it.effect("TestHost never runs onMount", () =>
      provideHost(Effect.gen(function*() {
        const Auto = Component.make({
          name: "Auto",
          model: Schema.String,
          message: Schema.String,
          elements: Tiny,
          init: () => "waiting",
          update: (_, message) => message,
          view: (text, h) => h.box(h.label(text), h.field().onMount("focus", () => Effect.succeed("mounted")))
        })
        const root = yield* TestHost.mount(Auto, {})
        yield* TestHost.settle
        assert.strictEqual(root.text(), "waiting")
      })))
  })

  it.effect("a removed element's mount that was waiting for its Layer never runs", () =>
    Effect.gen(function*() {
      let mounts = 0
      class Slow extends Context.Service<Slow, number>()("test/SlowMount") {}
      const App = Component.provide(
        Component.make({
          name: "App",
          model: Schema.Boolean,
          message: Schema.Boolean,
          init: () => true,
          update: (_, shown) => shown,
          view: (shown, h) =>
            h.el(
              "main",
              shown ?
                h.el("input").onMount("count", () =>
                  Effect.sync(() => {
                    mounts++
                    return false
                  })) :
                null
            )
        }),
        Layer.effect(Slow, Effect.as(Effect.sleep("1 second"), 1))
      )
      const root = yield* TestHost.mount(App, {})
      root.send(false)
      yield* TestHost.settle
      yield* TestClock.adjust("1 second")
      yield* TestHost.settle
      assert.strictEqual(mounts, 0)
    }).pipe(
      Effect.provide(Renderer.layer({ ...TestHost.makeHost(), runsMounts: true })),
      provideHost
    ))

  it.effect("Renderer.mount closes every instance before it removes the root nodes", () =>
    provideHost(Effect.gen(function*() {
      const testHost = yield* TestHost.TestHost
      const container = testHost.host.createElement("#app") as TestHost.TestElement
      let childrenAtRelease = -1
      const App = Component.provide(
        Component.make({
          name: "App",
          model: Schema.Number,
          message: Schema.Never,
          init: () => 0,
          update: (n) => n,
          view: (_, h) => h.el("div", "still here")
        }),
        Layer.effectDiscard(Effect.addFinalizer(() =>
          Effect.sync(() => {
            childrenAtRelease = container.children.length
          })
        ))
      )
      yield* Effect.scoped(Renderer.mount(App, {}, container))
      yield* TestHost.settle
      assert.strictEqual(childrenAtRelease, 1)
      assert.strictEqual(container.children.length, 0)
    })))

  it.effect("Renderer.mount stopped at any yield point leaves nothing behind once its Scope closes", () =>
    Effect.gen(function*() {
      // No TestHost executor: the mount runs on the scheduler below throughout, the loader cache's build included.
      const host = TestHost.makeHost()
      // The mount is interrupted and its Scope closes after it exits, or while it's pending. Or the Scope
      // closes under a pending mount that isn't interrupted, which then mounts nothing.
      for (const mode of ["interrupt, then close", "interrupt and close", "close"] as const) {
        for (let at = 1;; at++) {
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
          // Yields once, at the `at`-th check.
          let checks = 0
          const scheduler = new Scheduler.MixedScheduler()
          scheduler.shouldYield = () => ++checks === at
          const container = host.createElement("#app") as TestHost.TestElement
          const scope = yield* Scope.make()
          const fiber = Effect.runFork(
            Renderer.mount(Counter, { initial: 1 }, container).pipe(
              Scope.provide(scope),
              Effect.provide(Renderer.layer(host)),
              Effect.provideService(Loader.Visibility, signal),
              Effect.provideService(Loader.Connectivity, signal),
              Effect.provideService(Scheduler.Scheduler, scheduler)
            )
          )
          if (mode !== "close") fiber.interruptUnsafe()
          if (mode === "interrupt, then close") yield* Fiber.await(fiber)
          const closed = yield* Effect.exit(Scope.close(scope, Exit.void))
          yield* Fiber.await(fiber)
          assert.deepStrictEqual([mode, at, closed._tag, listeners, container.children.length], [
            mode,
            at,
            "Success",
            0,
            0
          ])
          if (checks < at) break
        }
      }
    }))

  it.effect("Renderer.mount whose owner a setup callback closes mounts nothing, and cleans up in order", () =>
    Effect.gen(function*() {
      const host = TestHost.makeHost()
      for (const site of ["Problems", "init", "view", "Layer"] as const) {
        const scope = yield* Scope.make()
        const container = host.createElement("#app") as TestHost.TestElement
        let closing: Fiber.Fiber<void> | undefined
        const close = () => {
          closing ??= Effect.runFork(Scope.close(scope, Exit.void))
        }
        let childrenAtRelease = -1
        const App = Component.provide(
          Component.make({
            name: "App",
            model: Schema.Number,
            message: Schema.Never,
            init: () => {
              if (site === "init") close()
              return 0
            },
            update: (n) => n,
            view: (_, h) => {
              if (site === "view") close()
              return h.el("div", "ok")
            }
          }),
          Layer.effectDiscard(Effect.andThen(
            Effect.addFinalizer(() =>
              Effect.sync(() => {
                childrenAtRelease = container.children.length
              })
            ),
            Effect.sync(() => {
              if (site === "Layer") close()
            })
          ))
        )
        const mounted = yield* Effect.exit(
          Renderer.mount(App, {}, container, { state: { "~loader": "malformed" } }).pipe(
            Scope.provide(scope),
            Effect.provide(Renderer.layer(host)),
            Effect.provideService(Loader.Problems, () => {
              if (site === "Problems") close()
            })
          )
        )
        const closed = yield* Fiber.await(closing!)
        // The close waits for setup, then closes the instances before it removes the root's nodes.
        assert.deepStrictEqual(
          [site, Exit.hasInterrupts(mounted), closed._tag, childrenAtRelease, container.children.length],
          [site, true, "Success", 1, 0]
        )
      }
    }))

  it.effect("Renderer.mount mounts in a container on the Renderer's host", () =>
    provideHost(Effect.gen(function*() {
      const testHost = yield* TestHost.TestHost
      const container = testHost.host.createElement("#app") as TestHost.TestElement
      const root = yield* Renderer.mount(Counter, { initial: 7 }, container)
      assert.strictEqual(Query.textOf(container), "-7+")
      root.send(CounterMessage.make({ _tag: "Decrement" }))
      yield* TestHost.settle
      assert.strictEqual(Query.textOf(container), "-6+")
      assert.isAbove(testHost.host.commits(), 1)
    })))

  it.effect("a LayerMap shares one build per key between unrelated components", () =>
    provideHost(Effect.gen(function*() {
      class Greeter extends Context.Service<Greeter, { readonly room: string }>()("test/RoomGreeter") {}
      let builds = 0
      class Rooms extends LayerMap.Service<Rooms>()("test/Rooms", {
        lookup: (room: string) =>
          Layer.sync(Greeter, () => {
            builds++
            return { room }
          })
      }) {}
      class Show extends Command.Service<Show>()(
        "test/Show",
        { args: {}, invalidates: () => [] },
        Greeter.useSync((greeter) => () => Effect.succeed(greeter.room))
      ) {}
      const RoomView = Component.make({
        name: "RoomView",
        props: Schema.Struct({ room: Schema.String }),
        model: Schema.String,
        message: Schema.String,
        init: ($) => $.set("").run(Show.make()),
        update: (_, message) => message,
        view: (text, h) => h.text(`[${text}]`)
      })
      const Room = Component.provide(RoomView, (props) => Show.layer.pipe(Layer.provideMerge(Rooms.get(props.room))))
      const Lobby = Component.make({
        name: "Lobby",
        model: Schema.Number,
        message: Schema.Never,
        init: () => 0,
        update: (model) => model,
        view: (_, h) =>
          h.el(
            "div",
            h.child(Room, { key: "1", props: { room: "a" } }),
            h.child(Room, { key: "2", props: { room: "a" } }),
            h.child(Room, { key: "3", props: { room: "b" } })
          )
      })
      const root = yield* TestHost.mount(Lobby, {}).pipe(Effect.provide(Rooms.layer))
      yield* TestHost.settle
      assert.strictEqual(root.text(), "[a][a][b]")
      assert.strictEqual(builds, 2)
    })))

  it.effect("each provided Layer build is stamped with the flush it began in", () =>
    provideHost(Effect.gen(function*() {
      class Slow extends Context.Service<Slow, { readonly name: string }>()("test/Slow") {}
      const Inner = Component.provide(
        Component.make({
          name: "Inner",
          props: Schema.Struct({ name: Schema.String }),
          model: Schema.Number,
          message: Schema.String,
          init: () => 0,
          update: (model) => model,
          view: (_, h) => h.text(h.props.name)
        }),
        (props) =>
          Layer.effect(
            Slow,
            props.name === "fail" ? Effect.fail("no") : Effect.as(Effect.sleep("1 hour"), { name: props.name })
          ),
        { onFailure: () => "failed" }
      )
      const Msg = Schema.TaggedUnion({ Add: { name: Schema.String } })
      const Shell = Component.make({
        name: "Shell",
        model: Schema.Array(Schema.String),
        message: Msg,
        init: () => ["first"],
        update: (names, message) => [...names, message.name],
        view: (names, h) => h.el("div", names.map((name) => h.child(Inner, { key: name, props: { name } })))
      })
      const testHost = yield* TestHost.TestHost
      const root = yield* runtime.mount(Shell, {}, testHost.host.createElement("#app"))
      assert.strictEqual(root.flush(), 0)
      assert.strictEqual(root.buildsPendingSince(0), 1)

      root.send(Msg.make({ _tag: "Add", name: "second" }))
      yield* TestHost.settle
      const navigated = root.flush()
      assert.isAbove(navigated, 0)
      // The first build was already running, so it doesn't count from the later flush.
      assert.strictEqual(root.buildsPendingSince(0), 2)
      assert.strictEqual(root.buildsPendingSince(navigated), 1)

      root.send(Msg.make({ _tag: "Add", name: "fail" }))
      yield* TestHost.settle
      assert.strictEqual(root.buildsPendingSince(navigated), 1)
      // A failed build counts as settled.
      root.send(Msg.make({ _tag: "Add", name: "x" }))
      yield* TestHost.settle
      assert.strictEqual(root.buildsPendingSince(0), 3)
    })))

  it.effect("settle fails with the log's tail when work never stops", () =>
    Effect.gen(function*() {
      const Msg = Schema.TaggedUnion({ Again: {} })
      const Again = Command.make("Again", { args: {} }, () => Effect.succeed(Msg.make({ _tag: "Again" })))
      const Loop = Component.make({
        name: "Loop",
        model: Schema.Number,
        message: Msg,
        init: ($) => $.set(0).run(Again()),
        update: (n, _, $) => $.set(n + 1).run(Again()),
        view: (n, h) => h.text(String(n))
      })
      yield* TestHost.mount(Loop, {})
      const error = yield* Effect.flip(TestHost.settle)
      assert.strictEqual(error._tag, "SettleError")
      assert.include(error.message, "/Loop Update")
      assert.include(error.message, "Again")
    }).pipe(Effect.provide(TestHost.layer({ budget: 200 }))))
})
