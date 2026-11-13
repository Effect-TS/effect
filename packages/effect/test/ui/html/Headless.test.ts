// @vitest-environment happy-dom
import { assert, describe, it } from "@effect/vitest"
import { Effect, Schema } from "effect"
import { Component } from "effect/ui"
import { BrowserHost, Html, HtmlServer } from "effect/ui/html"
import { HtmlQuery } from "effect/ui/html/testing"
import { Dialog, type Item, Menu } from "./fixtures/headless.ts"
import { popoverStub } from "./fixtures/popover.ts"

/** Lets the render flush and Commands run. */
const tick = Effect.promise(() => new Promise<void>((resolve) => setTimeout(resolve, 30)))

const container = Effect.acquireRelease(
  Effect.sync(() => document.body.appendChild(document.createElement("div"))),
  (element) => Effect.sync(() => element.remove())
)

const items: ReadonlyArray<Item> = [
  { id: "a", label: "Archive" },
  { id: "b", label: "Block", disabled: true },
  { id: "c", label: "Copy" }
]

// ---------------------------------------------------------------------------
// A Menu inside a Dialog, both placed by Picker
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
// A toolbar with a filterable Menu, and a ref of its own inside the closure
// ---------------------------------------------------------------------------

const Mine = Html.ref("Toolbar.filter", "input")

const ToolbarMessage = Schema.TaggedUnion({
  Picked: { id: Schema.String },
  Focus: {},
  Focused: { found: Schema.Boolean }
})

const Toolbar = Component.define({
  name: "Toolbar",
  model: Schema.Array(Schema.String),
  message: ToolbarMessage,
  elements: Html
}).make({
  init: () => [],
  update: (log, message, $) =>
    ToolbarMessage.match(message, {
      Picked: ({ id }) => [...log, "picked " + id],
      Focus: () => $.run(Html.focus(Mine, ({ found }) => ToolbarMessage.make({ _tag: "Focused", found }))),
      Focused: ({ found }) => [...log, "focused " + String(found)]
    }),
  view: (log, h) =>
    h.child(Menu, {
      key: "actions",
      props: { items },
      onEmit: (event) => ToolbarMessage.make({ _tag: "Picked", id: event.id }),
      view: (m) =>
        h.div.class("toolbar").children(
          m.trigger(h.button.class("btn")).children("Actions"),
          m.popup(h.div.class("menu")).children(
            // The Menu's part puts its ref on this input, and so does the Toolbar.
            m.input(h.input.ref(Mine).attr("aria-label", "Filter actions")),
            m.visible.length === 0 && h.p("No actions found."),
            h.ul.children(m.visible.map((item) => m.item(h.li.key(item.id), item).children(item.label)))
          ),
          h.output(log.join(", "))
        )
    })
})

// ---------------------------------------------------------------------------
// A part with a mount, applied to an element that stays
// ---------------------------------------------------------------------------

const mounts: Array<string> = []

const Anchor = Component.define({
  name: "Anchor",
  model: Schema.Number,
  message: Schema.Literal("placed"),
  elements: Html
}).make({
  init: () => 0,
  update: (count) => count + 1,
  parts: (count, p) => ({
    count,
    anchor: p.part("button", (b) =>
      b.attr("data-anchored", "").onMount("anchor", (node) =>
        Effect.as(
          Effect.acquireRelease(
            Effect.sync(() => mounts.push("start " + node.textContent)),
            () => Effect.sync(() => mounts.push("stop"))
          ),
          "placed" as const
        )))
  })
})

const Tip = Component.define({
  name: "Tip",
  model: Schema.Boolean,
  message: Schema.Literal("toggle"),
  elements: Html
}).make({
  init: () => true,
  update: (on) => !on,
  view: (on, h) =>
    h.child(Anchor, {
      key: "anchor",
      view: (a) => {
        const button = h.button.attr("aria-label", "Target")
        return h.div((on ? a.anchor(button) : button).children("target"), h.output(String(a.count)))
      }
    })
})

// ---------------------------------------------------------------------------
// A headless child whose closure throws on the server
// ---------------------------------------------------------------------------

const flaky = { throws: false }

const Page = Component.define({
  name: "Page",
  model: Schema.Null,
  message: Schema.Never,
  elements: Html
}).make({
  init: () => null,
  update: (model) => model,
  view: (_, h) =>
    h.main(
      h.child(Menu, {
        key: "ok",
        props: { items },
        view: (m) =>
          h.div(
            m.trigger(h.button).children("Actions"),
            m.popup(h.div).children(
              h.ul.children(m.visible.map((item) => m.item(h.li.key(item.id), item).children(item.label)))
            )
          )
      }),
      h.child(Menu, {
        key: "flaky",
        props: { items },
        fallback: () => h.p("menu down"),
        view: (m) => {
          if (flaky.throws) throw new Error("the closure threw")
          return m.trigger(h.button).children("More")
        }
      })
    )
})

describe("headless components on BrowserHost", { concurrent: false }, () => {
  it.effect("three owners on one element each get a real click, and one layer's preventDefault holds", () =>
    Effect.gen(function*() {
      const app = yield* container
      const root = yield* BrowserHost.mountEffect(Picker, {}, app)
      yield* tick
      const copy = HtmlQuery.getByRole(app, "menuitem", { name: "Copy", hidden: true })
      const event = new MouseEvent("click", { bubbles: true, cancelable: true })
      copy.dispatchEvent(event)
      yield* tick
      assert.deepStrictEqual(root.model(), ["picked c", "closed", "clicked c"])
      // Only the Dialog's layer asked for it, and its handler returned a message.
      assert.isTrue(event.defaultPrevented)
      assert.strictEqual(app.querySelector("output")!.textContent, "picked c, closed, clicked c")
    }).pipe(Effect.scoped))

  it.effect("the Menu focuses its own refs, and the Toolbar a ref it put on the same element", () =>
    Effect.gen(function*() {
      const stub = yield* popoverStub
      const app = yield* container
      const root = yield* BrowserHost.mountEffect(Toolbar, {}, app)
      yield* tick
      const settle = Effect.andThen(Effect.sync(stub.run), tick)
      const trigger = app.querySelector("button")!
      const input = app.querySelector("input")!
      assert.strictEqual(trigger.getAttribute("class"), "btn")
      assert.strictEqual(trigger.getAttribute("aria-expanded"), "false")

      HtmlQuery.click(trigger)
      yield* tick
      yield* settle
      assert.strictEqual(trigger.getAttribute("aria-expanded"), "true")
      assert.strictEqual(document.activeElement, input)

      input.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }))
      yield* tick
      yield* settle
      assert.strictEqual(trigger.getAttribute("aria-expanded"), "false")
      assert.strictEqual(document.activeElement, trigger)

      root.send(ToolbarMessage.make({ _tag: "Focus" }))
      yield* tick
      assert.deepStrictEqual(root.model(), ["focused true"])
      assert.strictEqual(document.activeElement, input)
    }).pipe(Effect.scoped))

  it.effect("a part's mount runs while the part is applied to an element that stays", () =>
    Effect.gen(function*() {
      mounts.length = 0
      const app = yield* container
      const root = yield* BrowserHost.mountEffect(Tip, {}, app)
      yield* tick
      const button = app.querySelector("button")!
      assert.deepStrictEqual(mounts, ["start target"])
      // The mount's message went to Anchor, whose part it is.
      assert.strictEqual(app.querySelector("output")!.textContent, "1")
      assert.isTrue(button.hasAttribute("data-anchored"))

      root.send("toggle")
      yield* tick
      assert.strictEqual(app.querySelector("button"), button)
      assert.isFalse(button.hasAttribute("data-anchored"))
      assert.deepStrictEqual(mounts, ["start target", "stop"])

      root.send("toggle")
      yield* tick
      assert.strictEqual(app.querySelector("button"), button)
      assert.deepStrictEqual(mounts, ["start target", "stop", "start target"])
      assert.strictEqual(app.querySelector("output")!.textContent, "2")
    }).pipe(Effect.scoped))

  it.effect("a server render is adopted, ids match, and a headless child that failed is built fresh", () =>
    Effect.gen(function*() {
      flaky.throws = true
      const rendered = yield* HtmlServer.renderToHtml(Page, {})
      flaky.throws = false
      assert.deepStrictEqual(rendered.state["~deferred"], ["/Page/Menu[flaky]"])
      assert.include(rendered.html, "menu down")

      const app = yield* container
      app.innerHTML = rendered.html
      const trigger = app.querySelector("button")!
      const popup = app.querySelector("[role=menu]")!
      const rows = Array.from(app.querySelectorAll("li"))
      const serverIds = [trigger.getAttribute("aria-controls"), popup.id, ...rows.map((row) => row.id)]
      assert.strictEqual(serverIds[0], serverIds[1])

      const stub = yield* popoverStub
      const root = yield* BrowserHost.mountEffect(Page, {}, app, { state: rendered.state })
      yield* root.adopted
      yield* tick
      // Adopted: the same nodes, with the ids the server wrote.
      assert.strictEqual(app.querySelector("button"), trigger)
      assert.strictEqual(app.querySelector("[role=menu]"), popup)
      assert.deepStrictEqual(Array.from(app.querySelectorAll("li")), rows)
      assert.deepStrictEqual(
        [trigger.getAttribute("aria-controls"), popup.id, ...rows.map((row) => row.id)],
        serverIds
      )
      // And live: the part's handler reaches the Menu.
      HtmlQuery.click(trigger)
      yield* tick
      assert.strictEqual(trigger.getAttribute("aria-expanded"), "true")
      assert.isTrue(stub.showing.has(popup))
      // The one that failed on the server was deferred, and the client built it.
      assert.notInclude(app.textContent, "menu down")
      assert.strictEqual(app.querySelectorAll("button")[1]!.textContent, "More")
    }).pipe(Effect.scoped))
})
