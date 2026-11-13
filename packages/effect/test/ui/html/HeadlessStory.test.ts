import { assert, describe, it } from "@effect/vitest"
import { Schema } from "effect"
import { Component } from "effect/ui"
import { Html } from "effect/ui/html"
import { Query, Story } from "effect/ui/testing"
import { type Item, Menu } from "./fixtures/headless.ts"

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

describe("headless components in a story", () => {
  it("an author's story runs the component with a stand-in view, and reads its parts", () => {
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
