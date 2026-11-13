import { assert, describe, it } from "@effect/vitest"
import { Schema } from "effect"
import { Component, View } from "effect/ui"
import { Html } from "effect/ui/html"
import { Query, Story } from "effect/ui/testing"
import { Dialog, type Item, Menu } from "./fixtures/headless.ts"

const items: ReadonlyArray<Item> = [
  { id: "a", label: "Archive" },
  { id: "b", label: "Block", disabled: true },
  { id: "c", label: "Copy" }
]

const ToolbarMessage = Schema.TaggedUnion({ Picked: { id: Schema.String }, Clicked: { id: Schema.String } })

const Toolbar = Component.define({
  name: "Toolbar",
  model: Schema.Array(Schema.String),
  message: ToolbarMessage,
  elements: Html
}).make({
  init: () => [],
  update: (log, message) => [...log, message._tag + " " + message.id],
  view: (_, h) =>
    h.child(Menu, {
      key: "actions",
      props: { items },
      onEmit: (event) => ToolbarMessage.make({ _tag: "Picked", id: event.id }),
      view: (m) =>
        h.div(
          m.trigger(h.button).children("Actions"),
          m.popup(h.div).children(
            m.input(h.input.attr("aria-label", "Filter actions")),
            m.visible.length === 0 && h.p("No actions found."),
            h.ul.children(m.visible.map((item) =>
              m.item(h.li.key(item.id), item)
                .onClick(ToolbarMessage.make({ _tag: "Clicked", id: item.id }))
                .children(item.label)
            ))
          )
        )
    })
})

const filter = Query.attr("aria-label", "Filter actions")
const labels = (story: { readonly all: (locator: Query.Locator) => ReadonlyArray<Query.Node> }) =>
  story.all(Query.tag("li")).map(Query.textOf)

const trigger = Query.text("Actions")

/** A consumer's closure for the author's stories: the least markup the Menu's parts need. */
const standIn = {
  elements: Html,
  view: (
    m: Component.Headless.Parts<typeof Menu>,
    h: View.Helper<never, { readonly items: ReadonlyArray<Item> }> & View.Tags<Html.Elements, never>
  ) =>
    h.div(
      m.trigger(h.button).children("Actions"),
      m.popup(h.div).children(
        m.input(h.input.attr("aria-label", "Filter actions")),
        h.ul.children(m.visible.map((item) => m.item(h.li.key(item.id), item).children(item.label)))
      )
    )
}

const Ids = Component.define({ name: "Ids", model: Schema.Null, message: Schema.Never, elements: Html }).make({
  init: () => null,
  update: (model) => model,
  view: (_, h) =>
    h.div(
      h.span.id(h.id("item-a", "b")).children("one"),
      h.span.id(h.id("item", "a-b")).children("two"),
      h.span.id(h.id("item")).children("three")
    )
})

describe("headless components in a story", () => {
  it("arrow keys skip a disabled row and wrap, and typeahead on the trigger reads the labels and starts over", () => {
    const active = (story: { readonly model: unknown; readonly props: { readonly items: ReadonlyArray<Item> } }) =>
      Story.parts(Menu, story).active
    const story = Story.make(Menu, { items }, standIn, (s) => {
      // Block is disabled, so typing its first letter moves nowhere.
      s.fire(trigger, "keydown", { key: "b" })
        .check((story) => assert.isNull(active(story)))
        .fire(trigger, "keydown", { key: "c" })
        .fire(trigger, "keydown", { key: "o" })
        .check((story) => assert.strictEqual(active(story), "c"))
        // No label starts with "coa", so typing starts over from "a".
        .fire(trigger, "keydown", { key: "a" })
        .check((story) => assert.strictEqual(active(story), "a"))
        // Up from the first row wraps to the last, down wraps back, and from there skips Block.
        .fire(filter, "keydown", { key: "ArrowUp" })
        .check((story) => assert.strictEqual(active(story), "c"))
        .fire(filter, "keydown", { key: "ArrowDown" })
        .check((story) => assert.strictEqual(active(story), "a"))
        .fire(filter, "keydown", { key: "ArrowDown" })
        .check((story) => assert.strictEqual(active(story), "c"))
        .fire(filter, "keydown", { key: "ArrowUp" })
        .check((story) => {
          assert.strictEqual(active(story), "a")
          assert.strictEqual(
            story.get(filter).attrs?.["aria-activedescendant"],
            story.get(Query.text("Archive")).attrs?.id
          )
        })
        .fire(filter, "keydown", { key: "Enter" })
    })
    assert.deepStrictEqual(story.emitted, [{ _tag: "Picked", id: "a" }])
  })

  it("an item that new props removed is no longer active, and Enter picks nothing", () => {
    const story = Story.make(Menu, { items }, standIn, (s) => {
      s.fire(filter, "keydown", { key: "ArrowUp" })
        .check((story) => assert.strictEqual(Story.parts(Menu, story).active, "c"))
        .props({ items: [items[0]!] })
        .check((story) => {
          assert.isNull(Story.parts(Menu, story).active)
          assert.isUndefined(story.get(filter).attrs?.["aria-activedescendant"])
        })
        .fire(filter, "keydown", { key: "Enter" })
    })
    assert.deepStrictEqual(story.emitted, [])
  })

  it("parts need no runtime, and an id outside a mount is under the component's own name", () => {
    // No story and no host: the Model from init, the props, and nothing else.
    const m = Story.parts(Menu, { model: Menu.init({ items }).model, props: { items } })
    assert.deepStrictEqual(m.visible, items)
    const Bare = Component.define({ name: "Bare", model: Schema.Null, message: Schema.Never, elements: Html }).make({
      init: () => null,
      update: (model) => model,
      view: (_, h) => h.div(m.trigger(h.button).children("Actions"), h.span.id(h.id("label")).children("label"))
    })
    const view = Bare.view(null, {}) as View.Element<never>
    const [button, span] = view.children as ReadonlyArray<View.Element<never>>
    assert.strictEqual(button!.attrs["aria-controls"], "_1b_Menu-popup")
    assert.strictEqual(span!.attrs.id, "_1b_Bare-label")
  })

  it("a part checks the tag name it's given, as its type does", () => {
    const d = Story.parts(Dialog, { model: { open: false }, props: { label: "Confirm" } })
    const h = View.makeHelper<never, {}, Html.Elements>({}, Html)
    assert.strictEqual(d.title(h.h2).tag, "h2")
    // Both are HTMLHeadingElement, but the part was declared for <h2>.
    assert.throws(() => d.title(h.h3 as any), /a part for <h2> was given <h3>/)
  })

  it("ids of one instance differ whenever the name or the key does", () => {
    Story.make(Ids, {}, (s) => {
      s.check((story) => {
        const ids = story.all(Query.tag("span")).map((span) => span.attrs?.id)
        assert.strictEqual(new Set(ids).size, 3, ids.join(" "))
      })
    })
  })

  it("an author's story runs the component with a stand-in view, and reads its parts", () => {
    // The stand-in view is written in place here, where its parameters need no annotation.
    const story = Story.make(Menu, { items }, {
      elements: Html,
      view: (m, h) =>
        h.div(
          m.trigger(h.button).children("Actions"),
          m.popup(h.div).children(
            m.input(h.input.attr("aria-label", "Filter actions")),
            h.ul.children(m.visible.map((item) => m.item(h.li.key(item.id), item).children(item.label)))
          )
        )
    }, (s) => {
      s.click("Actions")
        .check((story) => assert.strictEqual(story.get(Query.text("Actions")).attrs?.["aria-expanded"], "true"))
        .fire(filter, "input", { value: "co", checked: false })
        .check((story) => {
          const m = Story.parts(Menu, story)
          assert.deepStrictEqual(m.visible.map((item) => item.label), ["Copy"])
          assert.strictEqual(m.active, "c")
          assert.deepStrictEqual(labels(story), ["Copy"])
        })
        .fire(filter, "keydown", { key: "Enter" })
        .check((story) => assert.isTrue(story.defaultPrevented))
    })
    assert.deepStrictEqual(story.emitted, [{ _tag: "Picked", id: "c" }])
    assert.isFalse(Story.parts(Menu, story).open)
  })

  it("a consumer's story shows the child expanded, and runs only the consumer's layer", () => {
    Story.make(Toolbar, {}, (s) => {
      // Expanded from the Menu's init Model.
      s.check((story) => {
        assert.strictEqual(story.get(Query.text("Actions")).attrs?.["aria-expanded"], "false")
        assert.deepStrictEqual(labels(story), ["Archive", "Block", "Copy"])
      })
      s.givenChild("actions", { open: true, query: "co", active: "c", typed: "", focused: [] })
        .check((story) => {
          assert.strictEqual(story.get(Query.text("Actions")).attrs?.["aria-expanded"], "true")
          assert.deepStrictEqual(labels(story), ["Copy"])
        })
        // The row has the Menu's layer and the Toolbar's: the story runs the Toolbar's.
        .click("Copy")
        .childEmit("actions", { _tag: "Picked", id: "c" })
        .model((log) => assert.deepStrictEqual(log, ["Clicked c", "Picked c"]))
      // Only the Menu handles a click on its trigger, and a story doesn't run the Menu's update.
      assert.throws(() => s.click("Actions"), /only \/Toolbar\/Menu\[actions\] handles "click"/)
    })
  })
})
