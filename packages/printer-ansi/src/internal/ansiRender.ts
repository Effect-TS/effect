import type * as DocStream from "@effect/printer/DocStream"
import * as Layout from "@effect/printer/Layout"
import * as PageWidth from "@effect/printer/PageWidth"
import * as Effect from "effect/Effect"
import { dual } from "effect/Function"
import * as List from "effect/List"
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

/** @internal */
export const renderStream = (self: DocStream.DocStream<Ansi.Ansi>): string =>
  Effect.runSync(renderSafe(self, List.of(InternalAnsi.none)))

const unsafePeek = (stack: List.List<Ansi.Ansi>): Ansi.Ansi => {
  if (List.isNil(stack)) {
    throw new Error(
      "BUG: AnsiRender.unsafePeek - peeked at an empty stack" +
        " - please report an issue at https://github.com/Effect-TS/printer/issues"
    )
  }
  return stack.head
}

const unsafePop = (
  stack: List.List<Ansi.Ansi>
): readonly [Ansi.Ansi, List.List<Ansi.Ansi>] => {
  if (List.isNil(stack)) {
    throw new Error(
      "BUG: AnsiRender.unsafePop - popped from an empty stack" +
        " - please report an issue at https://github.com/Effect-TS/printer/issues"
    )
  }
  return [stack.head, stack.tail]
}

const renderSafe = (
  self: DocStream.DocStream<Ansi.Ansi>,
  stack: List.List<Ansi.Ansi>
): Effect.Effect<string> => {
  switch (self._tag) {
    case "FailedStream": {
      return Effect.dieMessage(
        "BUG: AnsiRender.renderSafe - attempted to render a failed doc stream" +
          " - please report an issue at https://github.com/Effect-TS/printer/issues"
      )
    }
    case "EmptyStream": {
      return Effect.succeed("")
    }
    case "CharStream": {
      return Effect.map(
        Effect.suspend(() => renderSafe(self.stream, stack)),
        (rest) => self.char + rest
      )
    }
    case "TextStream": {
      return Effect.map(
        Effect.suspend(() => renderSafe(self.stream, stack)),
        (rest) => self.text + rest
      )
    }
    case "LineStream": {
      let indent = "\n"
      for (let i = 0; i < self.indentation; i++) {
        indent = indent += " "
      }
      return Effect.map(
        Effect.suspend(() => renderSafe(self.stream, stack)),
        (rest) => indent + rest
      )
    }
    case "PushAnnotationStream": {
      const currentStyle = unsafePeek(stack)
      const nextStyle = InternalAnsi.combine(self.annotation, currentStyle)
      return Effect.map(
        Effect.suspend(() => renderSafe(self.stream, List.cons(self.annotation, stack))),
        (rest) => InternalAnsi.stringify(nextStyle) + rest
      )
    }
    case "PopAnnotationStream": {
      const [, styles] = unsafePop(stack)
      const nextStyle = unsafePeek(styles)
      return Effect.map(
        Effect.suspend(() => renderSafe(self.stream, styles)),
        (rest) => InternalAnsi.stringify(nextStyle) + rest
      )
    }
  }
}
