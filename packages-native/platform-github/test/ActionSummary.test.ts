import { describe, expect, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as ActionSummary from "../src/ActionSummary.js"
import * as ActionSummaryTest from "../src/ActionSummaryTest.js"

// Re-export for backwards compatibility in tests
const makeTestLayer = ActionSummaryTest.make

describe("ActionSummary", () => {
  describe("content methods", () => {
    it.effect("addRaw adds text", () =>
      Effect.gen(function*() {
        const test = makeTestLayer()
        const summary = yield* ActionSummary.ActionSummary.pipe(Effect.provide(test.layer))
        summary.addRaw("Hello")
        expect(test.getBuffer()).toBe("Hello")
      }))

    it.effect("addRaw with EOL", () =>
      Effect.gen(function*() {
        const test = makeTestLayer()
        const summary = yield* ActionSummary.ActionSummary.pipe(Effect.provide(test.layer))
        summary.addRaw("Hello", true)
        expect(test.getBuffer()).toBe("Hello\n")
      }))

    it.effect("addHeading adds h1 by default", () =>
      Effect.gen(function*() {
        const test = makeTestLayer()
        const summary = yield* ActionSummary.ActionSummary.pipe(Effect.provide(test.layer))
        summary.addHeading("Title")
        expect(test.getBuffer()).toBe("<h1>Title</h1>\n")
      }))

    it.effect("addHeading with custom level", () =>
      Effect.gen(function*() {
        const test = makeTestLayer()
        const summary = yield* ActionSummary.ActionSummary.pipe(Effect.provide(test.layer))
        summary.addHeading("Subtitle", 2)
        expect(test.getBuffer()).toBe("<h2>Subtitle</h2>\n")
      }))

    it.effect("addCodeBlock adds code", () =>
      Effect.gen(function*() {
        const test = makeTestLayer()
        const summary = yield* ActionSummary.ActionSummary.pipe(Effect.provide(test.layer))
        summary.addCodeBlock("const x = 1", "typescript")
        expect(test.getBuffer()).toBe('<pre lang="typescript"><code>const x = 1</code></pre>\n')
      }))

    it.effect("addList adds unordered list", () =>
      Effect.gen(function*() {
        const test = makeTestLayer()
        const summary = yield* ActionSummary.ActionSummary.pipe(Effect.provide(test.layer))
        summary.addList(["a", "b", "c"])
        expect(test.getBuffer()).toBe("<ul><li>a</li><li>b</li><li>c</li></ul>\n")
      }))

    it.effect("addList adds ordered list", () =>
      Effect.gen(function*() {
        const test = makeTestLayer()
        const summary = yield* ActionSummary.ActionSummary.pipe(Effect.provide(test.layer))
        summary.addList(["a", "b", "c"], true)
        expect(test.getBuffer()).toBe("<ol><li>a</li><li>b</li><li>c</li></ol>\n")
      }))

    it.effect("addTable adds table", () =>
      Effect.gen(function*() {
        const test = makeTestLayer()
        const summary = yield* ActionSummary.ActionSummary.pipe(Effect.provide(test.layer))
        summary.addTable([
          [{ data: "Name", header: true }, { data: "Value", header: true }],
          [{ data: "foo" }, { data: "bar" }]
        ])
        expect(test.getBuffer()).toBe(
          "<table><tr><th>Name</th><th>Value</th></tr><tr><td>foo</td><td>bar</td></tr></table>\n"
        )
      }))

    it.effect("addDetails adds collapsible", () =>
      Effect.gen(function*() {
        const test = makeTestLayer()
        const summary = yield* ActionSummary.ActionSummary.pipe(Effect.provide(test.layer))
        summary.addDetails("Click me", "Hidden content")
        expect(test.getBuffer()).toBe("<details><summary>Click me</summary>Hidden content</details>\n")
      }))

    it.effect("addImage adds image", () =>
      Effect.gen(function*() {
        const test = makeTestLayer()
        const summary = yield* ActionSummary.ActionSummary.pipe(Effect.provide(test.layer))
        summary.addImage("https://example.com/img.png", "Example", { width: "100" })
        expect(test.getBuffer()).toBe('<img src="https://example.com/img.png" alt="Example" width="100">\n')
      }))

    it.effect("addLink adds anchor", () =>
      Effect.gen(function*() {
        const test = makeTestLayer()
        const summary = yield* ActionSummary.ActionSummary.pipe(Effect.provide(test.layer))
        summary.addLink("Click here", "https://example.com")
        expect(test.getBuffer()).toBe('<a href="https://example.com">Click here</a>\n')
      }))

    it.effect("addSeparator adds hr", () =>
      Effect.gen(function*() {
        const test = makeTestLayer()
        const summary = yield* ActionSummary.ActionSummary.pipe(Effect.provide(test.layer))
        summary.addSeparator()
        expect(test.getBuffer()).toBe("<hr>\n")
      }))

    it.effect("addBreak adds br", () =>
      Effect.gen(function*() {
        const test = makeTestLayer()
        const summary = yield* ActionSummary.ActionSummary.pipe(Effect.provide(test.layer))
        summary.addBreak()
        expect(test.getBuffer()).toBe("<br>\n")
      }))

    it.effect("addQuote adds blockquote", () =>
      Effect.gen(function*() {
        const test = makeTestLayer()
        const summary = yield* ActionSummary.ActionSummary.pipe(Effect.provide(test.layer))
        summary.addQuote("Famous words", "https://example.com")
        expect(test.getBuffer()).toBe('<blockquote cite="https://example.com">Famous words</blockquote>\n')
      }))
  })

  describe("buffer methods", () => {
    it.effect("stringify returns buffer", () =>
      Effect.gen(function*() {
        const test = makeTestLayer()
        const summary = yield* ActionSummary.ActionSummary.pipe(Effect.provide(test.layer))
        summary.addRaw("content")
        expect(summary.stringify()).toBe("content")
      }))

    it.effect("isEmptyBuffer returns true when empty", () =>
      Effect.gen(function*() {
        const test = makeTestLayer()
        const summary = yield* ActionSummary.ActionSummary.pipe(Effect.provide(test.layer))
        expect(summary.isEmptyBuffer()).toBe(true)
      }))

    it.effect("isEmptyBuffer returns false when not empty", () =>
      Effect.gen(function*() {
        const test = makeTestLayer()
        const summary = yield* ActionSummary.ActionSummary.pipe(Effect.provide(test.layer))
        summary.addRaw("x")
        expect(summary.isEmptyBuffer()).toBe(false)
      }))

    it.effect("emptyBuffer clears buffer", () =>
      Effect.gen(function*() {
        const test = makeTestLayer()
        const summary = yield* ActionSummary.ActionSummary.pipe(Effect.provide(test.layer))
        summary.addRaw("content")
        summary.emptyBuffer()
        expect(summary.isEmptyBuffer()).toBe(true)
      }))
  })

  describe("file operations", () => {
    it.effect("write succeeds", () =>
      Effect.gen(function*() {
        const test = makeTestLayer()
        const result = yield* ActionSummary.write().pipe(Effect.provide(test.layer))
        expect(result).toBeDefined()
      }))

    it.effect("write fails with error", () =>
      Effect.gen(function*() {
        const test = makeTestLayer({ writeError: new Error("Permission denied") })
        const result = yield* ActionSummary.write().pipe(Effect.provide(test.layer), Effect.either)
        expect(result._tag).toBe("Left")
        if (result._tag === "Left") {
          expect(result.left._tag).toBe("ActionSummaryError")
          expect(result.left.reason).toBe("WriteFailed")
        }
      }))

    it.effect("clear succeeds", () =>
      Effect.gen(function*() {
        const test = makeTestLayer()
        const result = yield* ActionSummary.clear.pipe(Effect.provide(test.layer))
        expect(result).toBeDefined()
      }))

    it.effect("clear fails with error", () =>
      Effect.gen(function*() {
        const test = makeTestLayer({ clearError: new Error("Permission denied") })
        const result = yield* ActionSummary.clear.pipe(Effect.provide(test.layer), Effect.either)
        expect(result._tag).toBe("Left")
        if (result._tag === "Left") {
          expect(result.left._tag).toBe("ActionSummaryError")
        }
      }))
  })

  describe("chaining", () => {
    it.effect("methods can be chained", () =>
      Effect.gen(function*() {
        const test = makeTestLayer()
        const summary = yield* ActionSummary.ActionSummary.pipe(Effect.provide(test.layer))
        summary.addHeading("Title").addRaw("Content").addList(["a", "b"])
        expect(test.getBuffer()).toContain("<h1>Title</h1>")
        expect(test.getBuffer()).toContain("Content")
        expect(test.getBuffer()).toContain("<ul>")
      }))
  })
})
