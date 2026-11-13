import { assert, describe, it } from "@effect/vitest"
import { Cause, Deferred, Effect, Layer, Schema } from "effect"
import { Command, Component, Feature, type MessageLog, type View } from "effect/ui"
import { Html } from "effect/ui/html"
import { Query, Story, TestHost } from "effect/ui/testing"
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

// ---------------------------------------------------------------------------
// A parent that sends to a headless child through its ref
// ---------------------------------------------------------------------------

const lingering = { release: Deferred.makeUnsafe<void>() }
const Linger = Command.make(
  "Linger",
  { args: {} },
  () => Effect.onInterrupt(Effect.never, () => Deferred.await(lingering.release))
)
const Lingering = Component.define({ name: "Lingering", model: Schema.Null, message: Schema.Never }).make({
  init: ($) => $.set(null).run(Linger()),
  update: (model) => model,
  view: (_, h) => h.el("span")
})

const OpenerMessage = Schema.TaggedUnion({ Open: {}, Twin: {}, Swap: {} })

const Actions = Menu.ref("Actions")
const Spare = Menu.ref("Spare")

/**
 * Sends to the Menu at `Actions`. Its closure renders a second slot with that ref: from the mount,
 * once `Twin` re-renders the view, or once the Menu opens and re-renders alone. `Swap` moves the
 * slot with the ref `Spare` between the view and the closure, in one render.
 */
const Opener = Component.define({
  name: "Opener",
  props: Schema.Struct({ twin: Schema.Literals(["never", "mount", "open"]) }),
  model: Schema.Struct({ twin: Schema.Boolean, swapped: Schema.Boolean }),
  message: OpenerMessage,
  elements: Html
}).make({
  init: ($) => ({ twin: $.props.twin === "mount", swapped: false }),
  update: (model, message, $) =>
    message._tag === "Twin"
      ? { ...model, twin: true }
      : message._tag === "Swap"
      ? { ...model, swapped: !model.swapped }
      : $.send(Actions, { _tag: "Toggle" }),
  view: (model, h) =>
    h.div(
      h.button.onClick(OpenerMessage.make({ _tag: "Open" })).children("open"),
      h.child(Menu, {
        ref: Actions,
        props: { items },
        view: (m) =>
          h.p(
            m.open ? "shown" : "hidden",
            // The closure is the parent's code, so a slot in it takes the parent's refs.
            (model.twin || (h.props.twin === "open" && m.open)) &&
              h.child(Menu, { ref: Actions, props: { items }, view: () => h.span("again") }),
            // Removed with its holder when the ref moves back to the view. The holder's Scope closes
            // after its `Lingering` child's, which its Command holds open.
            model.swapped && h.child(Menu, {
              key: "holder",
              props: { items },
              view: () =>
                h.div(
                  h.child(Menu, { ref: Spare, props: { items }, view: () => h.span("spare in a closure") }),
                  h.child(Lingering, { key: "l" })
                )
            })
          )
      }),
      !model.swapped && h.child(Menu, { ref: Spare, props: { items }, view: () => h.span("spare in the view") })
    )
})

// ---------------------------------------------------------------------------
// A feature slot in a closure, under a Layer that never finishes building
// ---------------------------------------------------------------------------

class Badge extends Feature.Service<Badge>()("Badge", { props: Schema.Struct({}) }) {}
const BadgeImpl = Component.define({ name: "BadgeImpl", model: Schema.Null, message: Schema.Never }).make({
  init: () => null,
  update: (model) => model,
  view: (_, h) => h.el("span", "badge")
})
const Bare = Component.define({ name: "Bare", model: Schema.Null, message: Schema.Never }).make({
  init: () => null,
  update: (model) => model,
  parts: () => ({})
})
const ConsumerMessage = Schema.TaggedUnion({ Break: {} })
const Consumer = Component.define({
  name: "Consumer",
  props: Schema.Struct({ throwsAt: Schema.Literals(["mount", "re-render"]) }),
  model: Schema.Boolean,
  message: ConsumerMessage
}).make({
  init: ($) => $.props.throwsAt === "mount",
  update: () => true,
  view: (broken, h) =>
    h.el(
      "div",
      h.el("button").on("click", ConsumerMessage.make({ _tag: "Break" })).children("break"),
      h.child(Bare, {
        key: "h",
        fallback: () => h.text("headless down"),
        view: () =>
          h.child(Badge, {
            key: "b",
            fallback: () => {
              if (broken) throw new Error("the fallback threw")
              return h.text("loading")
            }
          })
      })
    )
})
const Provided = Component.provide(
  Consumer,
  Layer.merge(Badge.toLayer(BadgeImpl), Layer.effectDiscard(Effect.never))
)
const Waiting = Component.define({
  name: "Waiting",
  props: Schema.Struct({ throwsAt: Schema.Literals(["mount", "re-render"]) }),
  model: Schema.Null,
  message: Schema.Never
}).make({
  init: () => null,
  update: (model) => model,
  view: (_, h) =>
    h.child(Provided, {
      key: "c",
      props: { throwsAt: h.props.throwsAt },
      fallback: () => h.text("consumer down")
    })
})

// ---------------------------------------------------------------------------
// Token lists: a part adds to the consumer's class and aria-describedby
// ---------------------------------------------------------------------------

const Field = Component.define({ name: "Field", model: Schema.Null, message: Schema.Never, elements: Html }).make({
  init: () => null,
  update: (model) => model,
  parts: (_, p) => ({ input: p.part("input", (b) => b.class("field").attr("aria-describedby", "hint")) })
})

const Form = Component.define({ name: "Form", model: Schema.Null, message: Schema.Never, elements: Html }).make({
  init: () => null,
  update: (model) => model,
  // One list set before the part is applied, and one after.
  view: (_, h) =>
    h.child(Field, { key: "f", view: (f) => f.input(h.input.class("wide field")).attr("aria-describedby", "note") })
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
      assert.deepStrictEqual((root.get(Query.text("Copy", { exact: true })) as TestHost.TestElement).owners, {
        click: ["/Picker/Dialog[confirm]/Menu[actions]", "/Picker/Dialog[confirm]", "/Picker"]
      })
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

  it.effect("a parent sends to a headless child through its ref", () =>
    provideHost(Effect.gen(function*() {
      const root = yield* TestHost.mount(Opener, { twin: "never" } as const)
      assert.include(root.text(), "hidden")
      click(root, "open")
      yield* TestHost.settle
      assert.include(root.text(), "shown")
      assert.deepStrictEqual(updates(root), ["/Opener DomEvent Open", "/Opener/Menu[Actions] Send Toggle"])
    })))

  describe("a ref on a slot in the view and on one in a closure", () => {
    const crashed = (twin: "never" | "mount" | "open") =>
      TestHost.mount(Opener, { twin }, { fallback: (_, h) => h.text("crashed") })
    const failed = (root: { readonly log: () => ReadonlyArray<MessageLog.Entry> }) =>
      root.log().flatMap((entry) =>
        entry._tag === "Failed" ? [entry.path + " " + entry.source + " " + Cause.squash(entry.cause)] : []
      )
    const twice =
      "/Opener view Error: /Opener renders two children with the ref Actions, in the view it gives /Opener/Menu[Actions]"

    it.effect("fail the parent on its first render", () =>
      provideHost(Effect.gen(function*() {
        const root = yield* crashed("mount")
        yield* Effect.flip(TestHost.settle)
        assert.strictEqual(root.text(), "crashed")
        assert.deepStrictEqual(failed(root), [twice])
      })))

    it.effect("fail the parent when its view re-renders", () =>
      provideHost(Effect.gen(function*() {
        const root = yield* crashed("never")
        root.send(OpenerMessage.make({ _tag: "Twin" }))
        yield* Effect.flip(TestHost.settle)
        assert.strictEqual(root.text(), "crashed")
        assert.deepStrictEqual(failed(root), [twice])
      })))

    it.effect("fail the parent when the closure re-renders alone, before another send", () =>
      provideHost(Effect.gen(function*() {
        const root = yield* crashed("open")
        click(root, "open")
        yield* Effect.flip(TestHost.settle)
        assert.strictEqual(root.text(), "crashed")
        assert.deepStrictEqual(failed(root), [twice])
        assert.deepStrictEqual(updates(root), ["/Opener DomEvent Open", "/Opener/Menu[Actions] Send Toggle"])
      })))

    it.effect("let a ref move between the view and a closure in one render", () =>
      provideHost(
        Effect.gen(function*() {
          lingering.release = Deferred.makeUnsafe()
          const root = yield* crashed("never")
          root.send(OpenerMessage.make({ _tag: "Swap" }))
          yield* TestHost.settle
          assert.include(root.text(), "spare in a closure")
          root.send(OpenerMessage.make({ _tag: "Swap" }))
          yield* TestHost.settle
          assert.include(root.text(), "spare in the view")
          assert.deepStrictEqual(failed(root), [])
        }).pipe(Effect.ensuring(Effect.sync(() => Deferred.doneUnsafe(lingering.release, Effect.void))))
      ))

    it.effect("fail the parent for a closure inside another closure", () =>
      provideHost(Effect.gen(function*() {
        const Nested = Component.define({ name: "Nested", model: Schema.Null, message: Schema.Never, elements: Html })
          .make({
            init: () => null,
            update: (model) => model,
            view: (_, h) =>
              h.div(
                h.child(Menu, { ref: Spare, props: { items }, view: () => h.span("in the view") }),
                h.child(Menu, {
                  key: "outer",
                  props: { items },
                  view: () =>
                    h.child(Menu, {
                      key: "inner",
                      props: { items },
                      view: () =>
                        h.child(Menu, { ref: Spare, props: { items }, view: () => h.span("two closures down") })
                    })
                })
              )
          })
        const root = yield* TestHost.mount(Nested, {}, { fallback: (_, h) => h.text("crashed") })
        yield* Effect.flip(TestHost.settle)
        assert.strictEqual(root.text(), "crashed")
        assert.deepStrictEqual(failed(root), [
          "/Nested view Error: /Nested renders two children with the ref Spare, in the view it gives " +
          "/Nested/Menu[outer]/Menu[inner]"
        ])
      })))

    it("fail a Story step the same way", () => {
      const twice = /\/Opener renders two children with the ref Actions, in the view it gives \/Opener\/Menu\[Actions\]/
      assert.throws(() => Story.start(Opener, { twin: "mount" }).current.view(), twice)
      assert.throws(() => Story.start(Opener, { twin: "never" }).send(OpenerMessage.make({ _tag: "Twin" })), twice)
      const open = { open: true, query: "", active: null, typed: "", focused: [] }
      assert.throws(() => Story.start(Opener, { twin: "open" }).givenChild("Actions", open).current.view(), twice)
      // Moved in one step, the ref is held once.
      const swapped = Story.start(Opener, { twin: "never" }).send(OpenerMessage.make({ _tag: "Swap" }))
      assert.lengthOf(swapped.current.all(Query.text("spare in a closure")), 1)
    })
  })

  it.effect("a part adds its tokens to a token list, whenever the consumer set it", () =>
    provideHost(Effect.gen(function*() {
      const root = yield* TestHost.mount(Form, {})
      const input = root.get(Query.tag("input")) as TestHost.TestElement
      assert.strictEqual(input.attrs.class, "wide field")
      assert.strictEqual(input.attrs["aria-describedby"], "note hint")
    })))

  it.effect("an element written by hand leaves owned out", () =>
    provideHost(Effect.gen(function*() {
      const Hand = Component.define({ name: "Hand", model: Schema.Number, message: Schema.Literal("hit") }).make({
        init: () => 0,
        update: (count) => count + 1,
        view: (count): View.Element<"hit"> => ({
          _tag: "Element",
          tag: "button",
          elementKey: undefined,
          attrs: {},
          props: {},
          handlers: { click: "hit" },
          eventOptions: {},
          refKey: undefined,
          mount: undefined,
          children: [{ _tag: "Text", text: "hits " + count }]
        })
      })
      const root = yield* TestHost.mount(Hand, {})
      click(root, "hits 0")
      yield* TestHost.settle
      assert.strictEqual(root.text(), "hits 1")
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

  for (const when of ["mount", "re-render"] as const) {
    it.effect(`a feature's fallback in a closure that throws on ${when} fails whoever wrote it`, () =>
      provideHost(Effect.gen(function*() {
        const root = yield* TestHost.mount(Waiting, { throwsAt: when })
        yield* TestHost.settle
        if (when === "re-render") {
          assert.strictEqual(root.text(), "breakloading")
          click(root, "break")
          yield* TestHost.settle
        }
        assert.deepStrictEqual(failures(root), ["/Waiting/Consumer[c] fallback"])
        assert.strictEqual(root.text(), "consumer down")
      })))
  }
})
