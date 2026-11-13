import { assert, describe, it } from "@effect/vitest"
import { Effect, Schema } from "effect"
import { Component, type MessageLog } from "effect/ui"
import { Html } from "effect/ui/html"
import { Query, TestHost } from "effect/ui/testing"
import { Dialog, type Item, Menu } from "./html/fixtures/headless.ts"

const provideHost = <A, E, R>(effect: Effect.Effect<A, E, R>) => effect.pipe(Effect.provide(TestHost.layer()))
const click = (root: { readonly get: (locator: Query.Locator) => TestHost.TestNode }, text: string) =>
  Query.fire(root.get(Query.text(text, { exact: true })), "click")
const updates = (root: { readonly log: () => ReadonlyArray<MessageLog.Entry> }) =>
  root.log().flatMap((entry) =>
    entry._tag === "Update" ? [entry.path + " " + entry.source._tag + " " + (entry.message as any)._tag] : []
  )
const failures = (root: { readonly log: () => ReadonlyArray<MessageLog.Entry> }) =>
  root.log().flatMap((entry) => entry._tag === "Failed" ? [entry.path + " " + entry.source] : [])

const items: ReadonlyArray<Item> = [
  { id: "a", label: "Archive" },
  { id: "b", label: "Block", disabled: true },
  { id: "c", label: "Copy" }
]

// ---------------------------------------------------------------------------
// Three owners on one element: a Menu inside a Dialog, both placed by Picker
// ---------------------------------------------------------------------------

const PickerMessage = Schema.TaggedUnion({
  Picked: { id: Schema.String },
  Closed: {},
  Clicked: { id: Schema.String }
})

const Picker = Component.define({
  name: "Picker",
  model: Schema.Array(Schema.String),
  message: PickerMessage,
  elements: Html
}).make({
  init: () => [],
  update: (log, message) => [
    ...log,
    PickerMessage.match(message, {
      Picked: ({ id }) => "picked " + id,
      Closed: () => "closed",
      Clicked: ({ id }) => "clicked " + id
    })
  ],
  view: (log, h) =>
    h.child(Dialog, {
      key: "confirm",
      props: { label: "Confirm" },
      onEmit: () => PickerMessage.make({ _tag: "Closed" }),
      view: (d) =>
        h.div(
          d.trigger(h.button).children("Open"),
          d.popup(h.dialog).children(
            d.title(h.h2).children("Pick one"),
            h.child(Menu, {
              key: "actions",
              props: { items },
              onEmit: (event) => PickerMessage.make({ _tag: "Picked", id: event.id }),
              view: (m) =>
                h.ul.children(m.visible.map((item) =>
                  d.close(m.item(h.li.key(item.id), item))
                    .onClick(PickerMessage.make({ _tag: "Clicked", id: item.id }))
                    .children(item.label)
                ))
            })
          ),
          h.output(log.join(", "))
        )
    })
})

// ---------------------------------------------------------------------------
// A stateful normal child declared inside a headless child's closure
// ---------------------------------------------------------------------------

const BellMessage = Schema.TaggedUnion({ Ring: {}, Break: {} })

const Bell = Component.define({
  name: "Bell",
  model: Schema.Number,
  message: BellMessage,
  events: Schema.Literal("rang"),
  elements: Html
}).make({
  init: () => 0,
  update: (count, message, $) =>
    BellMessage.match(message, {
      Ring: () => $.set(count + 1).emit("rang"),
      Break: () => {
        throw new Error("the bell broke")
      }
    }),
  view: (count, h) =>
    h.span(
      h.button.onClick(BellMessage.make({ _tag: "Ring" })).children("ring " + count),
      h.button.onClick(BellMessage.make({ _tag: "Break" })).children("break")
    )
})

const BoardMessage = Schema.TaggedUnion({ Rang: {}, Failed: {} })

const Board = Component.define({
  name: "Board",
  props: Schema.Struct({ fallbackThrows: Schema.Boolean }),
  model: Schema.Array(Schema.String),
  message: BoardMessage,
  elements: Html
}).make({
  init: () => [],
  update: (log, message) => [...log, message._tag],
  view: (log, h) =>
    h.child(Menu, {
      key: "actions",
      props: { items },
      view: (m) =>
        m.popup(h.div).children(
          h.child(Bell, {
            key: "bell",
            onEmit: () => BoardMessage.make({ _tag: "Rang" }),
            onFailure: () => BoardMessage.make({ _tag: "Failed" }),
            fallback: () => {
              if (h.props.fallbackThrows) throw new Error("no fallback")
              return h.span("bell down")
            }
          }),
          h.output(log.join(", "))
        )
    })
})

const Shell = Component.define({
  name: "Shell",
  props: Schema.Struct({ fallbackThrows: Schema.Boolean }),
  model: Schema.Null,
  message: Schema.Never,
  elements: Html
}).make({
  init: () => null,
  update: (model) => model,
  view: (_, h) => h.child(Board, { key: "board", props: h.props, fallback: () => h.p("board down") })
})

describe("headless components", () => {
  it.effect("three owners on one element each get the event, deepest first and the author last", () =>
    provideHost(Effect.gen(function*() {
      const root = yield* TestHost.mount(Picker, {})
      click(root, "Copy")
      yield* TestHost.settle
      // Menu and Dialog each run their own update, and what they emit reaches whoever wrote their slots.
      assert.deepStrictEqual(updates(root), [
        "/Picker/Dialog[confirm]/Menu[actions] DomEvent Pick",
        "/Picker Emit Picked",
        "/Picker/Dialog[confirm] DomEvent Close",
        "/Picker Emit Closed",
        "/Picker DomEvent Clicked"
      ])
      assert.deepStrictEqual(root.model(), ["picked c", "closed", "clicked c"])
      assert.include(root.text(), "picked c, closed, clicked c")
    })))

  it.effect("a normal child inside the closure reports to whoever wrote the closure, never to the headless one", () =>
    provideHost(Effect.gen(function*() {
      const root = yield* TestHost.mount(Shell, { fallbackThrows: false })
      click(root, "ring 0")
      yield* TestHost.settle
      // The closure ran again for Board's new Model, and Bell kept its own.
      click(root, "ring 1")
      yield* TestHost.settle
      click(root, "break")
      yield* TestHost.settle
      assert.deepStrictEqual(updates(root), [
        "/Shell/Board[board]/Menu[actions]/Bell[bell] DomEvent Ring",
        "/Shell/Board[board] Emit Rang",
        "/Shell/Board[board]/Menu[actions]/Bell[bell] DomEvent Ring",
        "/Shell/Board[board] Emit Rang",
        "/Shell/Board[board] Emit Failed"
      ])
      assert.deepStrictEqual(failures(root), ["/Shell/Board[board]/Menu[actions]/Bell[bell] update"])
      assert.include(root.text(), "bell down")
      assert.include(root.text(), "Rang, Rang, Failed")
    })))

  it.effect("a fallback that throws inside the closure fails whoever wrote it", () =>
    provideHost(Effect.gen(function*() {
      const root = yield* TestHost.mount(Shell, { fallbackThrows: true })
      click(root, "break")
      yield* TestHost.settle
      assert.deepStrictEqual(failures(root), [
        "/Shell/Board[board]/Menu[actions]/Bell[bell] update",
        "/Shell/Board[board] fallback"
      ])
      assert.strictEqual(root.text(), "board down")
    })))
})
