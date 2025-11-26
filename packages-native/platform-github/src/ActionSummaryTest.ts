/**
 * Test utilities for ActionSummary service.
 *
 * Provides a mock layer factory for testing actions that use ActionSummary.
 *
 * @since 1.0.0
 * @example
 * ```typescript
 * import { ActionSummary, ActionSummaryTest } from "@effect-native/platform-github"
 * import { Effect } from "effect"
 * import { it, expect } from "@effect/vitest"
 *
 * it.effect("my action works", () =>
 *   Effect.gen(function*() {
 *     const test = ActionSummaryTest.make()
 *     const summary = yield* ActionSummary.ActionSummary.pipe(Effect.provide(test.layer))
 *     summary.addHeading("Title").addRaw("Content")
 *     expect(test.getBuffer()).toContain("<h1>Title</h1>")
 *   }))
 * ```
 */
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import { ActionSummaryError } from "./ActionError.js"
import { ActionSummary, type SummaryTableCell, TypeId } from "./ActionSummary.js"

/**
 * Options for creating a test ActionSummary layer.
 *
 * @since 1.0.0
 * @category models
 */
export interface TestOptions {
  readonly writeError?: Error
  readonly clearError?: Error
}

/**
 * Result of creating a test ActionSummary layer, including the layer
 * and a function to inspect the buffer.
 *
 * @since 1.0.0
 * @category models
 */
export interface TestContext {
  readonly layer: Layer.Layer<ActionSummary>
  readonly getBuffer: () => string
}

/**
 * Creates a test layer for ActionSummary with the given options.
 *
 * @since 1.0.0
 * @category constructors
 */
export const make = (options: TestOptions = {}): TestContext => {
  let buffer = ""

  const summary: ActionSummary = {
    [TypeId]: TypeId,

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
            .map((cell: SummaryTableCell) => {
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
    layer: Layer.succeed(ActionSummary, summary),
    getBuffer: () => buffer
  }
}

/**
 * A default test layer.
 *
 * @since 1.0.0
 * @category layers
 */
export const layer: Layer.Layer<ActionSummary> = make().layer
