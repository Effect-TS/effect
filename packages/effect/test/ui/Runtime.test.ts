import { assert, describe, it } from "@effect/vitest"
import { Context, Effect, Layer, LayerMap, Option, Redacted, Schema, Stream } from "effect"
import { TestClock } from "effect/testing"
import { Command, Component, Feature, MessageLog, Renderer, Subscription } from "effect/ui"
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

const Hold = Command.make("Hold", (): Effect.Effect<typeof RowMessage.Type> => Effect.never)
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
      assert.deepStrictEqual(update.source, { _tag: "Event", name: "click" })
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
        yield* TestHost.settle
        assert.strictEqual(root.text(), "Something went wrong")
        assert.isUndefined(root.model())
        assert.includeMembers(tags(root), ["Failed", "Crashed"])
      })))

    it.effect("a defect in a Command fails its instance", () =>
      provideHost(Effect.gen(function*() {
        const Explode = Command.make("Explode", (): Effect.Effect<string> => Effect.die("kaboom"))
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

  describe("Commands", () => {
    const Msg = Schema.TaggedUnion({ Query: { text: Schema.String }, Results: { text: Schema.String } })
    const Search = Command.make(
      "Search",
      (text: string) => Effect.as(Effect.sleep("1 second"), Msg.make({ _tag: "Results", text })),
      { mode: "switch" }
    )
    const Box = Component.make({
      name: "Box",
      model: Schema.String,
      message: Msg,
      init: () => "",
      update: (_, message, $) =>
        Msg.match(message, {
          Query: ({ text }) => $.run(Search(text)),
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
        assert.deepStrictEqual(root.pending(), [{ path: "/Box", name: "Search", status: "running" }])
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
        const Look = Command.make("Look", () =>
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
      Effect.gen(function*() {
        const greeter = yield* Greeter
        return (name: string) => Effect.succeed(greeter.greet(name))
      })
    ) {}
    const Hello = Component.make({
      name: "Hello",
      model: Schema.String,
      message: Schema.String,
      init: ($) => $.set("...").run(Greet.make("world")),
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
      emits: Schema.String
    }) {}
    const BadgeImpl = Component.make({
      name: "BadgeImpl",
      props: Schema.Struct({ label: Schema.String }),
      model: Schema.Number,
      message: Schema.Never,
      emits: Schema.String,
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

    it("the Wire encodes args structurally, with placeholders", () => {
      const Send = Command.make("Send", (_token: unknown, _when: unknown, _f: unknown) => Effect.succeed(1))
      const command = Send(Redacted.make("secret"), new Date(0), () => 1)
      assert.deepStrictEqual(MessageLog.encodeCommand(command), {
        _tag: "Effect",
        name: "Send",
        key: null,
        args: [{ "~redacted": true }, "1970-01-01T00:00:00.000Z", { "~unserialisable": "function" }]
      })
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
        emits: [],
        adopted: false
      }
      const wire = encoder.encode(entry)
      assert.deepStrictEqual((wire as any).model, { "~truncated": 19 })
      assert.throws(() => Story.fromLog(Counter, [wire]), /entry #1 \(\/Counter\).*~truncated/)
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
        emits: Schema.Redacted(Schema.String),
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
        emits: [Redacted.make("e")]
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
      assert.deepStrictEqual(wire.emits, [placeholder])
      assert.deepStrictEqual(warnings, [])
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
        Effect.map(Effect.service(Greeter), (greeter) => () => Effect.succeed(greeter.room))
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
      const Again = Command.make("Again", () => Effect.succeed(Msg.make({ _tag: "Again" })))
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
