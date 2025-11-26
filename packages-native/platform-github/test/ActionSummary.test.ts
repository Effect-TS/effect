import { describe, expect, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import { ActionSummaryError } from "../src/ActionError.js"
import * as ActionSummary from "../src/ActionSummary.js"

// Test layer that mocks @actions/core.summary
const makeTestLayer = (options?: {
  writeError?: Error
  clearError?: Error
}) => {
  let buffer = ""

  const summary: ActionSummary.ActionSummary = {
    [ActionSummary.TypeId]: ActionSummary.TypeId,

    addRaw: (text, addEOL) => {
      buffer += text
      if (addEOL) buffer += "\n"
      return summary
    },

    addEOL: () => {
      buffer += "\n"
      return summary
    },

    addHeading: (text, level = 1) => {
      buffer += `<h${level}>${text}</h${level}>\n`
      return summary
    },

    addCodeBlock: (code, lang) => {
      const attrs = lang ? ` lang="${lang}"` : ""
      buffer += `<pre${attrs}><code>${code}</code></pre>\n`
      return summary
    },

    addList: (items, ordered = false) => {
      const tag = ordered ? "ol" : "ul"
      const listItems = items.map((item) => `<li>${item}</li>`).join("")
      buffer += `<${tag}>${listItems}</${tag}>\n`
      return summary
    },

    addTable: (rows) => {
      const tableBody = rows
        .map((row) => {
          const cells = row
            .map((cell) => {
              const tag = cell.header ? "th" : "td"
              const attrs: string[] = []
              if (cell.colspan) attrs.push(`colspan="${cell.colspan}"`)
              if (cell.rowspan) attrs.push(`rowspan="${cell.rowspan}"`)
              const attrStr = attrs.length > 0 ? ` ${attrs.join(" ")}` : ""
              return `<${tag}${attrStr}>${cell.data}</${tag}>`
            })
            .join("")
          return `<tr>${cells}</tr>`
        })
        .join("")
      buffer += `<table>${tableBody}</table>\n`
      return summary
    },

    addDetails: (label, content) => {
      buffer += `<details><summary>${label}</summary>${content}</details>\n`
      return summary
    },

    addImage: (src, alt, opts) => {
      const attrs = [`src="${src}"`, `alt="${alt}"`]
      if (opts?.width) attrs.push(`width="${opts.width}"`)
      if (opts?.height) attrs.push(`height="${opts.height}"`)
      buffer += `<img ${attrs.join(" ")}>\n`
      return summary
    },

    addLink: (text, href) => {
      buffer += `<a href="${href}">${text}</a>\n`
      return summary
    },

    addSeparator: () => {
      buffer += "<hr>\n"
      return summary
    },

    addBreak: () => {
      buffer += "<br>\n"
      return summary
    },

    addQuote: (text, cite) => {
      const attrs = cite ? ` cite="${cite}"` : ""
      buffer += `<blockquote${attrs}>${text}</blockquote>\n`
      return summary
    },

    stringify: () => buffer,

    isEmptyBuffer: () => buffer.length === 0,

    emptyBuffer: () => {
      buffer = ""
      return summary
    },

    write: (_opts) =>
      options?.writeError
        ? Effect.fail(
            new ActionSummaryError({
              reason: "WriteFailed",
              description: options.writeError.message,
              cause: options.writeError
            })
          )
        : Effect.succeed(summary),

    clear: () =>
      options?.clearError
        ? Effect.fail(
            new ActionSummaryError({
              reason: "WriteFailed",
              description: options.clearError.message,
              cause: options.clearError
            })
          )
        : Effect.sync(() => {
            buffer = ""
            return summary
          })
  }

  return {
    layer: Layer.succeed(ActionSummary.ActionSummary, summary),
    getBuffer: () => buffer
  }
}

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
