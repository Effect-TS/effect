import { assert, describe, it } from "@effect/vitest"
import { Schema } from "effect"
import { Component } from "effect/ui"
import { Html } from "effect/ui/html"
import { HtmlStory } from "effect/ui/html/testing"
import { Query, Story } from "effect/ui/testing"

const Board = Component.make({
  name: "Board",
  model: Schema.Array(Schema.String),
  message: Schema.String,
  elements: Html,
  init: (): ReadonlyArray<string> => [],
  update: (log, message) => [...log, message],
  view: (_, h) =>
    h.section(
      h.div(h.p("Inner child")).attr("aria-label", "Inner")
        .onDrop(() => "inner", { accepts: ["text/uri-list"] }),
      h.p("Plain")
    ).onDrop(
      ({ data, files }) => `outer ${data["application/x-todo"] ?? files.map((file) => file.name).join(",")}`,
      { accepts: ["application/x-todo", "Files"] }
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
})
