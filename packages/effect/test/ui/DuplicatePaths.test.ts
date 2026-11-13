import { assert, describe, it } from "@effect/vitest"
import { Cause, Effect, Schema } from "effect"
import { Component, type MessageLog } from "effect/ui"
import { Story, TestHost } from "effect/ui/testing"

const provideHost = <A, E, R>(effect: Effect.Effect<A, E, R>) => effect.pipe(Effect.provide(TestHost.layer()))

const Row = Component.define({
  name: "Row",
  props: Schema.Struct({ label: Schema.String }),
  model: Schema.Null,
  message: Schema.Never
}).make({
  init: () => null,
  update: (model) => model,
  view: (_, h) => h.el("li", h.props.label)
})

const ListMessage = Schema.TaggedUnion({ Set: { keys: Schema.Array(Schema.String) } })

/** Renders a `Row` per key, either as siblings or each under its own element. */
const makeList = (layout: "siblings" | "nested") =>
  Component.define({
    name: "List",
    props: Schema.Struct({ keys: Schema.Array(Schema.String) }),
    model: Schema.Array(Schema.String),
    message: ListMessage
  }).make({
    init: ($) => $.props.keys,
    update: (_, message) => message.keys,
    view: (keys, h) =>
      layout === "siblings"
        ? h.el("ul", keys.map((key) => h.child(Row, { key, props: { label: key } })))
        : h.el("div", keys.map((key) => h.el("ul", h.child(Row, { key, props: { label: key } }))))
  })

/** Holds the list in a slot with a fallback, so the list's failure shows instead of crashing the root. */
const makePage = (layout: "siblings" | "nested") => {
  const List = makeList(layout)
  return Component.define({
    name: "Page",
    props: Schema.Struct({ keys: Schema.Array(Schema.String) }),
    model: Schema.Null,
    message: Schema.Never
  }).make({
    init: () => null,
    update: (model) => model,
    view: (_, h) =>
      h.el("main", h.child(List, { key: "l", props: { keys: h.props.keys }, fallback: () => h.text("failed") }))
  })
}

const failure = (log: ReadonlyArray<MessageLog.Entry>) => {
  const failed = log.filter((entry): entry is MessageLog.Failed => entry._tag === "Failed")
  assert.strictEqual(failed.length, 1)
  return failed[0]
}

describe("duplicate child paths", () => {
  for (const layout of ["siblings", "nested"] as const) {
    it.effect(`fail the parent on its first render, for ${layout}`, () =>
      provideHost(Effect.gen(function*() {
        const root = yield* TestHost.mount(makePage(layout), { keys: ["a", "b", "a"] })
        yield* TestHost.settle
        assert.strictEqual(root.text(), "failed")
        const failed = failure(root.log())
        assert.strictEqual(failed.path, "/Page/List[l]")
        assert.strictEqual(failed.source, "view")
        assert.include(Cause.pretty(failed.cause), "/Page/List[l] renders two children at Row[a]")
        // No row of the failed list stays mounted.
        assert.deepStrictEqual(
          root.log().filter((entry) => entry._tag === "Mounted").map((entry) => entry.path),
          ["/Page", "/Page/List[l]"]
        )
      })))

    it.effect(`fail the parent on a re-render, for ${layout}`, () =>
      provideHost(Effect.gen(function*() {
        const root = yield* TestHost.mount(makeList(layout), { keys: ["a", "b"] }, {
          fallback: (_, h) => h.text("crashed")
        })
        yield* TestHost.settle
        assert.strictEqual(root.text(), "ab")
        root.send(ListMessage.make({ _tag: "Set", keys: ["a", "b", "b"] }))
        const crashed = yield* Effect.flip(TestHost.settle)
        assert.strictEqual(crashed._tag, "RootCrashed")
        assert.strictEqual(root.text(), "crashed")
        const failed = failure(root.log())
        assert.strictEqual(failed.source, "view")
        assert.include(Cause.pretty(failed.cause), "/List renders two children at Row[b]")
      })))
  }

  it("fail a parent that renders one ref on two components", () => {
    const Other = Component.define({
      name: "Other",
      props: Schema.Struct({ label: Schema.String }),
      model: Schema.Null,
      message: Schema.Never
    }).make({ init: () => null, update: (model) => model, view: (_, h) => h.el("p", h.props.label) })
    const Shared = Row.ref("Shared")
    const Both = Component.define({ name: "Both", model: Schema.Null, message: Schema.Never }).make({
      init: () => null,
      update: (model) => model,
      view: (_, h) =>
        h.el(
          "div",
          h.child(Row, { ref: Shared, props: { label: "a" } }),
          h.child(Other, { ref: Shared, props: { label: "b" } })
        )
    })
    assert.throws(() => Story.start(Both, {}), /\/Both renders two children with the ref Shared/)
  })

  it("fail a Story step whose view renders two children at one path", () => {
    const steps = Story.start(makeList("nested"), { keys: ["a"] })
    assert.lengthOf(Story.children(steps.current.view()), 1)
    assert.throws(
      () => steps.send(ListMessage.make({ _tag: "Set", keys: ["a", "a"] })),
      /\/List renders two children at Row\[a\]/
    )
    assert.throws(
      () => Story.start(makeList("siblings"), { keys: ["b", "b"] }),
      /\/List renders two children at Row\[b\]/
    )
  })
})
