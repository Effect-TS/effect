import { Context, Effect, Schema } from "effect"
import { Component, type View } from "effect/ui"
import { Html } from "effect/ui/html"
import { TestHost } from "effect/ui/testing"
import { describe, expect, it } from "tstyche"
import { Dialog, type Item, Menu, type MenuEvents } from "../../../test/ui/html/fixtures/headless.ts"

class Clock extends Context.Service<Clock, { readonly now: Effect.Effect<number> }>()("Clock") {}
class Tracker extends Context.Service<Tracker, { readonly seen: Effect.Effect<void> }>()("Tracker") {}

const Msg = Schema.TaggedUnion({ Picked: { id: Schema.String }, Clicked: {}, Seen: {} })
type Msg = typeof Msg.Type

const items: ReadonlyArray<Item> = [{ id: "a", label: "Archive" }]

// A headless component whose part has a mount that needs a service.
const Timed = Component.define({
  name: "Timed",
  model: Schema.Number,
  message: Schema.Number,
  elements: Html
}).make({
  init: () => 0,
  update: (_, now) => now,
  parts: (now, p) => ({
    now,
    clock: p.part("time", (b) => b.onMount("tick", () => Clock.use((clock) => clock.now)))
  })
})

describe("headless components", () => {
  it("the consumer calls parts with no annotations", () => {
    Component.define({ name: "App", model: Schema.Null, message: Msg, elements: Html }).make({
      init: () => null,
      update: (model) => model,
      view: (_, h) =>
        h.child(Menu, {
          key: "actions",
          props: { items },
          onEmit: (event) => {
            expect(event).type.toBe<typeof MenuEvents.Type>()
            return Msg.make({ _tag: "Picked", id: event.id })
          },
          view: (m) => {
            expect(m.visible).type.toBe<ReadonlyArray<Item>>()
            expect(m.open).type.toBe<boolean>()
            // Args is fixed by the author: (b, item: Item).
            expect(m.item).type.toBe<View.Part<"li", [item: Item], never>>()
            const trigger = m.trigger(h.button.class("btn"))
            expect(trigger).type.toBe<Html.Element<Msg, never, Html.EventsOf<"button">, HTMLButtonElement, "button">>()
            return h.div.class("toolbar").children(
              trigger.children("Actions"),
              m.popup(h.div.class("menu")).children(
                m.input(h.input.attr("aria-label", "Filter actions")),
                m.visible.length === 0 && h.p("No actions found."),
                h.ul.children(m.visible.map((item) => {
                  expect(item).type.toBe<Item>()
                  return m.item(h.li.key(item.id), item).onClick(Msg.make({ _tag: "Clicked" })).children(item.label)
                }))
              )
            )
          }
        })
    })
  })

  it("a part returns the chain type, so the callable shorthand is gone", () => {
    Component.define({ name: "App", model: Schema.Null, message: Msg, elements: Html }).make({
      init: () => null,
      update: (model) => model,
      view: (_, h) =>
        h.child(Menu, {
          key: "actions",
          props: { items },
          view: (m) => {
            // The root is callable and what a part returns isn't: m.trigger(h.button)("Actions") doesn't compile.
            expect(m.trigger(h.button)).type.toBe<
              Html.Element<Msg, never, Html.EventsOf<"button">, HTMLButtonElement, "button">
            >()
            expect(m.trigger(h.button)).type.not.toBeAssignableTo<(...children: ReadonlyArray<string>) => unknown>()
            expect(h.button).type.toBeCallableWith("Actions")
            // A part is tied to its tag's node: a button part rejects a div, and the missing item is an error.
            expect(m.trigger).type.not.toBeCallableWith(h.div)
            expect(m.item).type.not.toBeCallableWith(h.li)
            expect(m.item).type.not.toBeCallableWith(h.li, "a")
            // The tagless part takes any element.
            return h.child(Dialog, {
              key: "confirm",
              props: { label: "Confirm" },
              view: (d) => d.popup(h.dialog).children(d.close(m.item(h.li, items[0]!)).children("Close"))
            })
          }
        })
    })
  })

  it("a part's mount requirements join the headless component's, and the closure's join the parent's", () => {
    expect<Component.Headless.Requirements<typeof Timed>>().type.toBe<Clock>()
    expect<Component.Headless.Requirements<typeof Menu>>().type.toBe<never>()
    const App = Component.define({ name: "App", model: Schema.Null, message: Msg, elements: Html }).make({
      init: () => null,
      update: (model) => model,
      view: (_, h) =>
        h.child(Timed, {
          key: "t",
          view: (t) =>
            t.clock(h.time).onMount("seen", () =>
              Effect.as(Tracker.use((tracker) => tracker.seen), Msg.make({ _tag: "Seen" })))
              .children(String(t.now))
        })
    })
    expect<Component.Requirements<typeof App>>().type.toBe<Clock | Tracker>()
  })

  it("a headless component isn't a Mountable", () => {
    expect(Menu).type.not.toBeAssignableTo<Component.Any>()
    expect(TestHost.mount).type.not.toBeCallableWith(Menu, { items })
    expect(Menu).type.toBeAssignableTo<Component.Headless.Any>()
  })

  it("view is required for a headless child, and a normal child takes none", () => {
    Component.define({ name: "App", model: Schema.Null, message: Msg, elements: Html }).make({
      init: () => null,
      update: (model) => model,
      view: (_, h) => {
        expect(h.child).type.not.toBeCallableWith(Menu, { key: "actions", props: { items } })
        return h.div()
      }
    })
  })
})
