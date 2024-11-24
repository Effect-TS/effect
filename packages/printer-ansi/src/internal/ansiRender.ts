import type * as DocStream from "@effect/printer/DocStream"
import * as Layout from "@effect/printer/Layout"
import * as PageWidth from "@effect/printer/PageWidth"
import { dual } from "effect/Function"
import type * as Ansi from "../Ansi.js"
import type * as AnsiDoc from "../AnsiDoc.js"
import * as InternalAnsi from "./ansi.js"

// -----------------------------------------------------------------------------
// Rendering Algorithms
// -----------------------------------------------------------------------------

/** @internal */
export const render = dual<
  (config: AnsiDoc.AnsiDoc.RenderConfig) => (self: AnsiDoc.AnsiDoc) => string,
  (self: AnsiDoc.AnsiDoc, config: AnsiDoc.AnsiDoc.RenderConfig) => string
>(2, (self, config) => {
  switch (config.style) {
    case "compact": {
      return renderStream(Layout.compact(self))
    }
    case "pretty": {
      const width = Object.assign({}, PageWidth.defaultPageWidth, config.options)
      return renderStream(Layout.pretty(self, Layout.options(width)))
    }
    case "smart": {
      const width = Object.assign({}, PageWidth.defaultPageWidth, config.options)
      return renderStream(Layout.smart(self, Layout.options(width)))
    }
  }
})

function unsafePeek(annotations: Array<Ansi.Ansi>): Ansi.Ansi {
  const annotation = annotations[0]
  if (annotation === undefined) {
    throw new Error(
      "BUG: Ansi.renderStream - peeked at an empty annotation stack" +
        " - please report an issue at https://github.com/Effect-TS/cli/issues"
    )
  }
  return annotation
}

function unsafePop(annotations: Array<Ansi.Ansi>): Ansi.Ansi {
  const annotation = annotations.pop()
  if (annotation === undefined) {
    throw new Error(
      "BUG: Ansi.renderStream - popped from an empty annotation stack" +
        " - please report an issue at https://github.com/Effect-TS/cli/issues"
    )
  }
  return annotation
}

const renderStream = (self: DocStream.DocStream<Ansi.Ansi>): string => {
  const annotations: Array<Ansi.Ansi> = [InternalAnsi.none]
  let current: DocStream.DocStream<Ansi.Ansi> = self
  let result = ""
  while (true) {
    switch (current._tag) {
      case "FailedStream": {
        throw new Error(
          "BUG: Help.renderStream - attempted to render a document which could not be laid out" +
            " - please report an issue at https://github.com/Effect-TS/cli/issues"
        )
      }
      case "EmptyStream": {
        return result
      }
      case "CharStream": {
        result = result + current.char
        current = current.stream
        break
      }
      case "TextStream": {
        result = result + current.text
        current = current.stream
        break
      }
      case "LineStream": {
        let indent = "\n"
        for (let i = 0; i < current.indentation; i++) {
          indent = indent += " "
        }
        result = result + indent
        current = current.stream
        break
      }
      case "PushAnnotationStream": {
        const currentStyle = unsafePeek(annotations)
        const nextStyle = InternalAnsi.combine(current.annotation, currentStyle)
        result = result + InternalAnsi.stringify(nextStyle)
        annotations.push(current.annotation)
        current = current.stream
        break
      }
      case "PopAnnotationStream": {
        unsafePop(annotations)
        const nextStyle = unsafePeek(annotations)
        result = result + InternalAnsi.stringify(nextStyle)
        current = current.stream
        break
      }
    }
  }
}
