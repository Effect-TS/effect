import { assert, describe, it } from "@effect/vitest"
import { Effect, Schema } from "effect"
import { Component } from "effect/ui"
import type { View } from "effect/ui"
import { Html } from "effect/ui/html"
import { HtmlStory } from "effect/ui/html/testing"
import { Query, Story } from "effect/ui/testing"

const Board = Component.define({
  name: "Board",
  model: Schema.Array(Schema.String),
  message: Schema.String,
  elements: Html
}).make({
  init: (): ReadonlyArray<string> => [],
  update: (log, message) => [...log, message],
  view: (_, h) =>
    h.section.onDrop(
      ({ data, files }) => `outer ${data["application/x-todo"] ?? files.map((file) => file.name).join(",")}`,
      { accepts: ["application/x-todo", "Files"] }
    ).children(
      h.div.attr("aria-label", "Inner")
        .onDrop(() => "inner", { accepts: ["text/uri-list"] }).children(h.p("Inner child")),
      h.p("Plain")
    )
})

describe("HtmlStory", () => {
  it("drop goes to the innermost target that accepts the drag, and throws when none does", () => {
    Story.make(Board, {}, (s) => {
      // The inner target doesn't accept a todo, so the outer one takes it.
      s.pipe(HtmlStory.drop(Query.text("Inner child"), { data: { "application/x-todo": "milk" } }))
        .check((story) => assert.isTrue(story.defaultPrevented))
        .pipe(HtmlStory.drop(Query.text("Inner child"), { data: { "text/uri-list": "https://example.com" } }))
        .pipe(HtmlStory.drop(Query.text("Plain"), { files: [new File(["x"], "a.txt")] }))
        .model((log) => assert.deepStrictEqual(log, ["outer milk", "inner", "outer a.txt"]))
      assert.throws(
        () => s.pipe(HtmlStory.drop(Query.text("Plain"), { data: { "text/plain": "hello" } })),
        /HtmlStory\.drop: nothing at text "Plain" accepts "text\/plain"/
      )
    })
  })

  it("the view value holds an onMount input, for a story to check", () => {
    const Chart = Component.define({
      name: "Chart",
      model: Schema.Array(Schema.Number),
      message: Schema.Never,
      elements: Html
    }).make({
      init: () => [1, 2],
      update: (points) => points,
      view: (points, h) => h.div.onMount("draw", points, () => Effect.void).children("chart")
    })
    const story = Story.make(Chart, {}, () => {})
    const mount = (story.view() as View.Element<never, never>).mount
    assert.strictEqual(mount?.name, "draw")
    assert.deepStrictEqual(mount?.input, [1, 2])
  })
})
