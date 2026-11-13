import { assert, describe, it } from "@effect/vitest"
import { Cause, Effect, Layer, Schema } from "effect"
import { AsyncResult } from "effect/reactivity"
import { Component, Feature, MessageLog } from "effect/ui"
import { Query, Story, TestHost } from "effect/ui/testing"

const provideHost = <A, E, R>(effect: Effect.Effect<A, E, R>) => effect.pipe(Effect.provide(TestHost.layer()))
const click = (root: TestHost.TestRoot<any, any, any>, text: string) =>
  Query.fire(root.get(Query.text(text, { exact: true })), "click")

const ItemMessage = Schema.TaggedUnion({ Clear: {}, Boom: {} })

/** Counts the `Clear`s it receives, and shows the label it had at the last one. */
const Item = Component.define({
  name: "Item",
  props: Schema.Struct({ label: Schema.String }),
  model: Schema.Struct({ clears: Schema.Number, label: Schema.String }),
  message: ItemMessage,
  receives: ["Clear"]
}).make({
  init: () => ({ clears: 0, label: "" }),
  update: (model, message, $) => {
    if (message._tag === "Boom") throw new Error("boom")
    return { clears: model.clears + 1, label: $.props.label }
  },
  view: (model, h) =>
    h.el("li").on("click", ItemMessage.make({ _tag: "Boom" })).children(
      `${h.props.label}:${model.clears}:${model.label}`
    )
})

const Row = Item.ref("Row")

const ListMessage = Schema.TaggedUnion({
  Clear: { id: Schema.String },
  Add: { id: Schema.String },
  Clears: { ids: Schema.Array(Schema.String) }
})

const List = Component.define({
  name: "List",
  props: Schema.Struct({ ids: Schema.Array(Schema.String) }),
  model: Schema.Array(Schema.String),
  message: ListMessage
}).make({
  init: ($) => $.props.ids,
  update: (ids, message, $) => {
    switch (message._tag) {
      case "Clear":
        return $.send(Row.at(message.id), ItemMessage.make({ _tag: "Clear" }))
      case "Add":
        return $.set([...ids, message.id]).send(Row.at(message.id), ItemMessage.make({ _tag: "Clear" }))
      case "Clears":
        return message.ids.reduce((step, id) => step.send(Row.at(id), ItemMessage.make({ _tag: "Clear" })), $.set(ids))
    }
  },
  view: (ids, h) =>
    h.el("ul", ids.map((id) => h.child(Item, { ref: Row.at(id), props: { label: `${id}${ids.length}` } })))
})

const updates = (log: ReadonlyArray<MessageLog.Entry>, path: string) =>
  log.filter((entry): entry is MessageLog.Update => entry._tag === "Update" && entry.path === path)

const dropped = (log: ReadonlyArray<MessageLog.Entry>) =>
  log.filter((entry): entry is MessageLog.SendDropped => entry._tag === "SendDropped")

describe("$.send", () => {
  it.effect("reaches the slot with the ref's key, among several of one component", () =>
    provideHost(Effect.gen(function*() {
      const root = yield* TestHost.mount(List, { ids: ["a", "b", "c"] })
      yield* TestHost.settle
      root.send(ListMessage.make({ _tag: "Clear", id: "b" }))
      yield* TestHost.settle
      assert.strictEqual(root.text(), "a3:0:b3:1:b3c3:0:")
      const [sent] = updates(root.log(), "/List")
      assert.deepStrictEqual(sent.sends?.map((send) => [send.ref.key, send.message]), [["Row[b]", { _tag: "Clear" }]])
      const [received] = updates(root.log(), "/List/Item[Row[b]]")
      assert.deepStrictEqual(received.source, { _tag: "Send", path: "/List", seq: sent.seq })
      assert.deepStrictEqual(received.message, { _tag: "Clear" })
      assert.lengthOf(updates(root.log(), "/List/Item[Row[a]]"), 0)
    })))

  it.effect("reaches a child mounted in the same step, which has the props from the new Model", () =>
    provideHost(Effect.gen(function*() {
      const root = yield* TestHost.mount(List, { ids: ["a"] })
      yield* TestHost.settle
      root.send(ListMessage.make({ _tag: "Add", id: "b" }))
      yield* TestHost.settle
      // The child's re-render lands in the parent's commit: no frame shows the new row before the send.
      assert.deepStrictEqual(root.frames(), ["a1:0:", "a2:0:b2:1:b2"])
    })))

  it.effect("delivers several sends in the order they were issued", () =>
    provideHost(Effect.gen(function*() {
      const root = yield* TestHost.mount(List, { ids: ["a", "b"] })
      yield* TestHost.settle
      root.send(ListMessage.make({ _tag: "Clears", ids: ["b", "a", "b"] }))
      yield* TestHost.settle
      assert.strictEqual(root.text(), "a2:1:a2b2:2:b2")
      assert.deepStrictEqual(
        root.log().filter((entry) => entry._tag === "Update" && entry.path !== "/List").map((entry) => entry.path),
        ["/List/Item[Row[b]]", "/List/Item[Row[a]]", "/List/Item[Row[b]]"]
      )
    })))

  it.effect("drops and logs a send to a ref that isn't rendered", () =>
    provideHost(Effect.gen(function*() {
      const root = yield* TestHost.mount(List, { ids: ["a"] })
      yield* TestHost.settle
      root.send(ListMessage.make({ _tag: "Clear", id: "z" }))
      yield* TestHost.settle
      const [sent] = updates(root.log(), "/List")
      const [drop] = dropped(root.log())
      assert.strictEqual(drop.path, "/List")
      assert.strictEqual(drop.ref, "Row[z]")
      assert.deepStrictEqual(drop.issued, { seq: sent.seq, index: 0 })
      assert.strictEqual(drop.reason, "unrendered")
      assert.strictEqual(root.text(), "a1:0:")
    })))

  it.effect("fails the sender when Message.make builds a tag the child doesn't receive", () =>
    provideHost(Effect.gen(function*() {
      const Message = Schema.TaggedUnion({ Go: {} })
      const Draft = Item.ref("Draft")
      const Page = Component.define({ name: "Page", model: Schema.Null, message: Message }).make({
        init: () => null,
        // `make` returns the whole Message, so the tag is checked when the send is made.
        update: (_, __, $) => $.send(Draft, ItemMessage.make({ _tag: "Boom" })),
        view: (_, h) =>
          h.el(
            "div",
            h.el("button").on("click", Message.make({ _tag: "Go" })).children("go"),
            h.child(Item, { ref: Draft, props: { label: "d" } })
          )
      })
      // Under a shell, so the failure stays in its slot instead of crashing the root.
      const Shell = Component.define({ name: "Shell", model: Schema.Null, message: Schema.Never }).make({
        init: () => null,
        update: (model) => model,
        view: (_, h) => h.child(Page, { key: "p", fallback: () => h.text("failed") })
      })
      const root = yield* TestHost.mount(Shell, {})
      yield* TestHost.settle
      Query.fire(root.get(Query.text("go", { exact: true })), "click")
      yield* TestHost.settle
      assert.strictEqual(root.text(), "failed")
      const failed = root.log().find((entry): entry is MessageLog.Failed => entry._tag === "Failed")
      assert.strictEqual(failed?.path, "/Shell/Page[p]")
      assert.strictEqual(failed?.source, "update")
      assert.include(Cause.pretty(failed!.cause), "Boom isn't one of the messages the slot Draft receives")
      assert.lengthOf(updates(root.log(), "/Shell/Page[p]/Item[Draft]"), 0)
    })))

  it.effect("drops and logs a send to a child that failed", () =>
    provideHost(Effect.gen(function*() {
      const Message = Schema.TaggedUnion({ Boom: {}, Clear: {} })
      const Draft = Item.ref("Draft")
      const Page = Component.define({ name: "Page", model: Schema.Null, message: Message }).make({
        init: () => null,
        update: (model, message, $) =>
          message._tag === "Clear" ? $.send(Draft, ItemMessage.make({ _tag: "Clear" })) : model,
        view: (_, h) =>
          h.child(Item, {
            ref: Draft,
            props: { label: "d" },
            fallback: () => h.text("failed"),
            onEmit: () => undefined
          })
      })
      const root = yield* TestHost.mount(Page, {})
      yield* TestHost.settle
      click(root, "d:0:")
      yield* TestHost.settle
      assert.strictEqual(root.text(), "failed")
      root.send(Message.make({ _tag: "Clear" }))
      yield* TestHost.settle
      const [drop] = dropped(root.log())
      assert.strictEqual(drop.ref, "Draft")
      assert.strictEqual(drop.reason, "failed")
    })))

  it.effect("drops and logs a send to a feature on its fallback", () =>
    provideHost(Effect.gen(function*() {
      const EditorReceives = Schema.TaggedUnion({ Clear: {} })
      class Editor extends Feature.Service<Editor>()("Editor", {
        props: Schema.Struct({ label: Schema.String }),
        receives: EditorReceives
      }) {}
      const Main = Editor.ref("Main")
      const Message = Schema.TaggedUnion({ Clear: {} })
      const Page = Component.define({ name: "Page", model: Schema.Null, message: Message }).make({
        init: () => null,
        update: (_, __, $) => $.send(Main, EditorReceives.make({ _tag: "Clear" })),
        view: (_, h) => h.child(Editor, { ref: Main, props: { label: "m" }, fallback: () => h.text("loading") })
      })
      const Never: Layer.Layer<Editor> = Layer.effect(Editor, Effect.never)
      const root = yield* TestHost.mount(Component.provide(Page, Never), {})
      root.send(Message.make({ _tag: "Clear" }))
      yield* TestHost.settle
      assert.strictEqual(root.text(), "loading")
      const [drop] = dropped(root.log())
      assert.strictEqual(drop.ref, "Main")
      assert.strictEqual(drop.reason, "fallback")
    })))

  it.effect("reaches a feature's implementation, and a provided component, through a ref", () =>
    provideHost(Effect.gen(function*() {
      const EditorReceives = Schema.TaggedUnion({ Clear: {} })
      class Editor extends Feature.Service<Editor>()("Editor", {
        props: Schema.Struct({ label: Schema.String }),
        receives: EditorReceives
      }) {}
      const Main = Editor.ref("Main")
      const Draft = Item.ref("Draft")
      const Provided = Component.provide(Item, Layer.empty)
      const Message = Schema.TaggedUnion({ Clear: {} })
      const Page = Component.define({ name: "Page", model: Schema.Null, message: Message }).make({
        init: () => null,
        update: (_, __, $) =>
          $.send(Main, EditorReceives.make({ _tag: "Clear" })).send(Draft, ItemMessage.make({ _tag: "Clear" })),
        view: (_, h) =>
          h.el(
            "div",
            h.child(Editor, { ref: Main, props: { label: "m" }, fallback: () => h.text("loading") }),
            h.child(Provided, { ref: Draft, props: { label: "d" } })
          )
      })
      const root = yield* TestHost.mount(Component.provide(Page, Editor.toLayer(Item)), {})
      yield* TestHost.settle
      root.send(Message.make({ _tag: "Clear" }))
      yield* TestHost.settle
      assert.strictEqual(root.text(), "m:1:md:1:d")
      assert.lengthOf(dropped(root.log()), 0)
    })))

  it.effect("fails the sender when a parent and child answer each other", () =>
    provideHost(Effect.gen(function*() {
      const PingMessage = Schema.TaggedUnion({ Ping: {} })
      const Echo = Component.define({
        name: "Echo",
        model: Schema.Null,
        message: PingMessage,
        events: PingMessage,
        receives: ["Ping"]
      }).make({
        init: () => null,
        update: (model, message, $) => $.set(model).emit(message),
        view: (_, h) => h.text("echo")
      })
      const Other = Echo.ref("Other")
      const Loop = Component.define({ name: "Loop", model: Schema.Null, message: PingMessage }).make({
        init: () => null,
        update: (_, message, $) => $.send(Other, message),
        view: (_, h) =>
          h.el("button").on("click", PingMessage.make({ _tag: "Ping" })).children(
            h.child(Echo, { ref: Other, onEmit: (ping) => ping })
          )
      })
      const Page = Component.define({ name: "Page", model: Schema.Null, message: PingMessage }).make({
        init: () => null,
        update: (model) => model,
        view: (_, h) => h.child(Loop, { key: "l", fallback: () => h.text("looped") })
      })
      const root = yield* TestHost.mount(Page, {})
      yield* TestHost.settle
      click(root, "echo")
      yield* TestHost.settle
      assert.strictEqual(root.text(), "looped")
      const failed = root.log().filter((entry): entry is MessageLog.Failed => entry._tag === "Failed")
      assert.lengthOf(failed, 1)
      assert.strictEqual(failed[0].path, "/Page/Loop[l]")
      assert.strictEqual(failed[0].source, "send")
      assert.include(Cause.pretty(failed[0].cause), "/Page/Loop[l] sent to its children")
    })))
})

describe("Story and sends", () => {
  it("records what update sent, and resets it with given", () => {
    const steps = Story.start(List, { ids: ["a", "b"] })
      .send(ListMessage.make({ _tag: "Clear", id: "b" }))
      .sent((sent) => assert.deepStrictEqual(sent.map((send) => send.ref.key), ["Row[b]"]))
      .send(ListMessage.make({ _tag: "Add", id: "c" }))
    assert.deepStrictEqual(steps.current.sent.map((send) => [send.ref.key, send.message]), [
      ["Row[b]", { _tag: "Clear" }],
      ["Row[c]", { _tag: "Clear" }]
    ])
    assert.lengthOf(steps.given(["a"]).current.sent, 0)
  })

  it("finds a slot by its ref in childEmit, childFailure and fallback", () => {
    const Message = Schema.TaggedUnion({ Saw: { what: Schema.String } })
    const EchoMessage = Schema.TaggedUnion({ Said: {} })
    const Echo = Component.define({
      name: "Echo",
      model: Schema.Null,
      message: EchoMessage,
      events: EchoMessage
    }).make({ init: () => null, update: (model) => model, view: (_, h) => h.text("echo") })
    const Mine = Echo.ref("Mine")
    const Page = Component.define({ name: "Page", model: Schema.Array(Schema.String), message: Message }).make({
      init: () => [],
      update: (seen, message) => [...seen, message.what],
      view: (_, h) =>
        h.child(Echo, {
          ref: Mine,
          onEmit: () => Message.make({ _tag: "Saw", what: "emit" }),
          onFailure: () => Message.make({ _tag: "Saw", what: "failure" }),
          fallback: () => h.text("gone")
        })
    })
    const story = Story.make(
      Page,
      {},
      (s) => s.childEmit(Mine, EchoMessage.make({ _tag: "Said" })).childFailure(Mine, Cause.die("x"))
    )
    assert.deepStrictEqual(story.model, ["emit", "failure"])
    assert.deepStrictEqual(Story.fallback(story.view(), Mine, AsyncResult.initial()), { _tag: "Text", text: "gone" })
    assert.throws(() => Story.start(Page, {}).childEmit(Echo.ref("Other"), {}), /no child with the ref Other/)
  })

  it.effect("fromLog reports a divergence when a send changes, from entries and from the Wire", () =>
    provideHost(Effect.gen(function*() {
      const root = yield* TestHost.mount(List, { ids: ["a", "b"] })
      yield* TestHost.settle
      root.send(ListMessage.make({ _tag: "Clear", id: "b" }))
      yield* TestHost.settle
      const log = root.log()
      const encoder = MessageLog.makeEncoder()
      const wire = log.map((entry) => encoder.encode(entry))
      const [sent] = updates(log, "/List")
      assert.deepStrictEqual((wire.find((frame) => frame.seq === sent.seq) as any).sends, [{
        ref: "Row[b]",
        message: { _tag: "Clear" }
      }])
      // Sends to the first row, whatever the message says.
      const Changed = Component.define({
        name: "List",
        props: Schema.Struct({ ids: Schema.Array(Schema.String) }),
        model: Schema.Array(Schema.String),
        message: ListMessage
      }).make({
        init: ($) => $.props.ids,
        update: (ids, _, $) => $.set(ids).send(Row.at(ids[0]), ItemMessage.make({ _tag: "Clear" })),
        view: (ids, h) => h.el("ul", ids.map((id) => h.child(Item, { ref: Row.at(id), props: { label: id } })))
      })
      for (const entries of [log, wire]) {
        assert.isUndefined(Story.fromLog(List, entries).divergence)
        const divergence = Story.fromLog(Changed, entries).divergence
        assert.strictEqual(divergence?.seq, sent.seq)
        assert.deepStrictEqual(divergence?.recorded.sends, [{ ref: "Row[b]", message: { _tag: "Clear" } }])
        assert.deepStrictEqual(divergence?.recomputed.sends, [{ ref: "Row[a]", message: { _tag: "Clear" } }])
      }
    })))

  it.effect("stub records what a parent sends it", () =>
    provideHost(Effect.gen(function*() {
      const EditorReceives = Schema.TaggedUnion({ Clear: {}, Focus: {} })
      class Editor extends Feature.Service<Editor>()("Editor", {
        props: Schema.Struct({}),
        receives: EditorReceives
      }) {}
      const Main = Editor.ref("Main")
      const Message = Schema.TaggedUnion({ Go: {} })
      const Page = Component.define({ name: "Page", model: Schema.Null, message: Message }).make({
        init: () => null,
        update: (_, __, $) =>
          $.send(Main, EditorReceives.make({ _tag: "Focus" })).send(Main, EditorReceives.make({ _tag: "Clear" })),
        view: (_, h) => h.child(Editor, { ref: Main, fallback: () => h.text("loading") })
      })
      const stub = TestHost.stub(Editor)
      const root = yield* TestHost.mount(Page, {}).pipe(Effect.provide(stub.layer))
      yield* TestHost.settle
      root.send(Message.make({ _tag: "Go" }))
      yield* TestHost.settle
      assert.deepStrictEqual(stub.received(), [{ _tag: "Focus" }, { _tag: "Clear" }])
    })))
})
