// @vitest-environment happy-dom
import { assert, describe, it } from "@effect/vitest"
import { Effect, Schema } from "effect"
import { Component } from "effect/ui"
import { BrowserHost, Html, HtmlServer } from "effect/ui/html"
import { HtmlQuery, ssr } from "effect/ui/html/testing"
import { TestHost } from "effect/ui/testing"
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

// The closure's second slot takes the ref `Actions` on the client only, at the path the server gave it.
const twin = { client: false }
const TwinActions = Menu.ref("Actions")
const Twin = Component.define({ name: "Twin", model: Schema.Null, message: Schema.Never, elements: Html }).make({
  init: () => null,
  update: (model) => model,
  view: (_, h) =>
    h.child(Menu, {
      ref: TwinActions,
      props: { items },
      view: (m) =>
        h.div(
          m.trigger(h.button).children("Actions"),
          h.child(Menu, {
            ...(twin.client ? { ref: TwinActions } : { key: "Actions" }),
            props: { items },
            view: () => h.span("again")
          })
        )
    })
})
const TwinShell = Component.define({ name: "Shell", model: Schema.Null, message: Schema.Never, elements: Html })
  .make({
    init: () => null,
    update: (model) => model,
    view: (_, h) => h.main(h.child(Twin, { key: "t", props: {}, fallback: () => h.p("twin down") }))
  })

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

// ---------------------------------------------------------------------------
// A key handler on a container part, and one on the part that has focus
// ---------------------------------------------------------------------------

const Keys = Component.define({
  name: "Keys",
  model: Schema.Array(Schema.String),
  message: Schema.String,
  elements: Html
}).make({
  init: () => [],
  update: (seen, message) => [...seen, message],
  parts: (seen, p) => ({
    seen,
    container: p.part("div", (b) => b.onKeyDown(({ key }) => "container " + key)),
    focused: p.part("input", (b) => b.onKeyDown(({ key }) => "focused " + key))
  })
})

const KeysApp = Component.define({
  name: "KeysApp",
  model: Schema.Array(Schema.String),
  message: Schema.String,
  elements: Html
}).make({
  init: () => [],
  update: (seen, message) => [...seen, message],
  view: (seen, h) =>
    h.child(Keys, {
      key: "keys",
      view: (k) =>
        k.container(h.div).children(
          h.input.attr("aria-label", "Bare"),
          // A handler of the consumer's that sends nothing still takes the event from the container.
          h.input.attr("aria-label", "Shadowing").onKeyDown(() => undefined),
          k.focused(h.input.attr("aria-label", "Composed")).onKeyDown(({ key }) => "consumer " + key),
          h.output(k.seen.join(", ") + " | " + seen.join(", "))
        )
    })
})

// ---------------------------------------------------------------------------
// A Dialog on its own
// ---------------------------------------------------------------------------

const Confirm = Component.define({
  name: "Confirm",
  model: Schema.Number,
  message: Schema.Literal("closed"),
  elements: Html
}).make({
  init: () => 0,
  update: (closed) => closed + 1,
  view: (closed, h) =>
    h.child(Dialog, {
      key: "confirm",
      props: { label: "Confirm" },
      onEmit: () => "closed" as const,
      view: (d) =>
        h.div(
          d.trigger(h.button).children("Open"),
          d.popup(h.dialog).children(d.title(h.h2).children("Sure?")),
          h.output(String(closed))
        )
    })
})

describe("headless components on BrowserHost", { concurrent: false }, () => {
  it.effect("an inner handler takes a key from a container part, and a part on the focused element composes", () =>
    Effect.gen(function*() {
      const app = yield* container
      yield* BrowserHost.mountEffect(KeysApp, {}, app)
      yield* tick
      const press = (label: string, key: string) =>
        Effect.andThen(
          Effect.sync(() =>
            HtmlQuery.getByRole(app, "textbox", { name: label }).dispatchEvent(
              new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true })
            )
          ),
          tick
        )
      const output = () => app.querySelector("output")!.textContent
      yield* press("Bare", "a")
      assert.strictEqual(output(), "container a | ")
      yield* press("Shadowing", "b")
      assert.strictEqual(output(), "container a | ")
      yield* press("Composed", "c")
      assert.strictEqual(output(), "container a, focused c | consumer c")
    }).pipe(Effect.scoped))

  it.effect("the Dialog opens as a modal, and cancelling it closes it and tells the consumer", () =>
    Effect.gen(function*() {
      const app = yield* container
      const root = yield* BrowserHost.mountEffect(Confirm, {}, app)
      yield* tick
      const dialog = app.querySelector("dialog")!
      assert.strictEqual(dialog.getAttribute("aria-labelledby"), app.querySelector("h2")!.id)
      HtmlQuery.click(app.querySelector("button")!)
      yield* tick
      assert.isTrue(dialog.open)
      dialog.dispatchEvent(new Event("cancel", { cancelable: true }))
      yield* tick
      assert.isFalse(dialog.open)
      assert.strictEqual(root.model(), 1)
    }).pipe(Effect.scoped))

  it.effect("ssr() adopts a headless child, and defers one whose closure threw on the server", () =>
    Effect.gen(function*() {
      // The closure throws once: on the server, which renders before the client mounts.
      flaky.throws = true
      const failing = Component.define({ name: "Shell", model: Schema.Null, message: Schema.Never, elements: Html })
        .make({
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
                  if (flaky.throws) {
                    flaky.throws = false
                    throw new Error("the closure threw")
                  }
                  return m.trigger(h.button).children("More")
                }
              })
            )
        })
      // ssr() fails if the client rebuilds a node the server rendered outside a deferred instance.
      const result = yield* ssr(failing, {})
      assert.deepStrictEqual(result.state["~deferred"], ["/Shell/Menu[flaky]"])
      assert.include(result.html, "menu down")
      assert.include(result.adopted, "/Shell/Menu[ok]")
      assert.notInclude(result.adopted, "/Shell/Menu[flaky]")
      const trigger = result.container.querySelector("button")!
      const popup = result.container.querySelector("[role=menu]")!
      assert.strictEqual(trigger.getAttribute("aria-controls"), popup.id)
      assert.include(result.html, `id="${popup.id}"`)
      assert.strictEqual(result.container.querySelectorAll("button")[1]!.textContent, "More")
    }).pipe(Effect.provide(TestHost.layer())))

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

  it.effect("an adopted render fails whoever gives a ref to a slot in its view and one in a closure", () =>
    Effect.gen(function*() {
      twin.client = false
      const rendered = yield* HtmlServer.renderToHtml(TwinShell, {})
      assert.include(rendered.html, "again")
      const app = yield* container
      app.innerHTML = rendered.html
      twin.client = true
      const root = yield* BrowserHost.mountEffect(TwinShell, {}, app, { state: rendered.state })
      yield* root.adopted
      yield* tick
      assert.strictEqual(app.textContent, "twin down")
    }).pipe(Effect.scoped, Effect.ensuring(Effect.sync(() => twin.client = false))))

  it.effect("a layer's preventDefault false leaves another layer's prevention in place", () =>
    Effect.gen(function*() {
      const Hit = Component.define({
        name: "Hit",
        model: Schema.Number,
        message: Schema.Literal("hit"),
        elements: Html
      })
        .make({
          init: () => 0,
          update: (count) => count + 1,
          parts: (_, p) => ({ button: p.part("button", (b) => b.onClick("hit", { preventDefault: true })) })
        })
      const App = Component.define({ name: "App", model: Schema.Null, message: Schema.Never, elements: Html }).make({
        init: () => null,
        update: (model) => model,
        view: (_, h) =>
          h.child(Hit, {
            key: "h",
            view: (p) => p.button(h.button).onClick(() => undefined, { preventDefault: false }).children("hit")
          })
      })
      const app = yield* container
      yield* BrowserHost.mountEffect(App, {}, app)
      const event = new MouseEvent("click", { bubbles: true, cancelable: true })
      app.querySelector("button")!.dispatchEvent(event)
      assert.isTrue(event.defaultPrevented)
    }).pipe(Effect.scoped))

  it.effect("the author's own preventDefault holds on an element a part decorated", () =>
    Effect.gen(function*() {
      const Plain = Component.define({
        name: "Plain",
        model: Schema.Null,
        message: Schema.Literal("hit"),
        elements: Html
      }).make({
        init: () => null,
        update: (model) => model,
        parts: (_, p) => ({ button: p.part("button", (b) => b.onClick("hit")) })
      })
      const App = Component.define({ name: "App", model: Schema.Null, message: Schema.Literal("own"), elements: Html })
        .make({
          init: () => null,
          update: (model) => model,
          view: (_, h) =>
            h.child(Plain, {
              key: "p",
              view: (p) => p.button(h.button).onClick("own", { preventDefault: true }).children("hit")
            })
        })
      const app = yield* container
      yield* BrowserHost.mountEffect(App, {}, app)
      const event = new MouseEvent("click", { bubbles: true, cancelable: true })
      app.querySelector("button")!.dispatchEvent(event)
      assert.isTrue(event.defaultPrevented)
    }).pipe(Effect.scoped))
})
