/**
 * @since 1.0.0
 */
import * as core from "@actions/core"
import { GenericTag } from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import { ActionSummaryError } from "../ActionError.js"
import type * as Api from "../ActionSummary.js"

/** @internal */
export const TypeId: Api.TypeId = Symbol.for(
  "@effect-native/platform-github/ActionSummary"
) as Api.TypeId

/** @internal */
export const ActionSummary = GenericTag<Api.ActionSummary>(
  "@effect-native/platform-github/ActionSummary"
)

/** @internal */
const make = (): Api.ActionSummary => {
  // Use the core summary instance but wrap operations as Effect
  const summary = core.summary

  const self: Api.ActionSummary = {
    [TypeId]: TypeId,

    addRaw: (text, addEOL) => {
      summary.addRaw(text, addEOL)
      return self
    },

    addEOL: () => {
      summary.addEOL()
      return self
    },

    addHeading: (text, level) => {
      summary.addHeading(text, level)
      return self
    },

    addCodeBlock: (code, lang) => {
      summary.addCodeBlock(code, lang)
      return self
    },

    addList: (items, ordered) => {
      summary.addList(items as Array<string>, ordered)
      return self
    },

    addTable: (rows) => {
      summary.addTable(
        rows.map((row) =>
          row.map((cell) => {
            const result: { data: string; header?: boolean; colspan?: string; rowspan?: string } = {
              data: cell.data
            }
            if (cell.header !== undefined) result.header = cell.header
            if (cell.colspan !== undefined) result.colspan = cell.colspan.toString()
            if (cell.rowspan !== undefined) result.rowspan = cell.rowspan.toString()
            return result
          })
        )
      )
      return self
    },

    addDetails: (label, content) => {
      summary.addDetails(label, content)
      return self
    },

    addImage: (src, alt, options) => {
      summary.addImage(src, alt, options)
      return self
    },

    addLink: (text, href) => {
      summary.addLink(text, href)
      return self
    },

    addSeparator: () => {
      summary.addSeparator()
      return self
    },

    addBreak: () => {
      summary.addBreak()
      return self
    },

    addQuote: (text, cite) => {
      summary.addQuote(text, cite)
      return self
    },

    stringify: () => summary.stringify(),

    isEmptyBuffer: () => summary.isEmptyBuffer(),

    emptyBuffer: () => {
      summary.emptyBuffer()
      return self
    },

    write: (options) =>
      Effect.tryPromise({
        try: async () => {
          await summary.write(options)
          return self
        },
        catch: (error) =>
          new ActionSummaryError({
            reason: "WriteFailed",
            description: error instanceof Error ? error.message : String(error),
            cause: error
          })
      }),

    clear: () =>
      Effect.tryPromise({
        try: async () => {
          await summary.clear()
          return self
        },
        catch: (error) =>
          new ActionSummaryError({
            reason: "WriteFailed",
            description: error instanceof Error ? error.message : String(error),
            cause: error
          })
      })
  }

  return self
}

/** @internal */
export const layer = Layer.succeed(ActionSummary, make())
