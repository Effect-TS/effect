import * as Effect from "effect/Effect"
import { dual } from "effect/Function"
import type * as Doc from "../Doc.js"
import type * as DocStream from "../DocStream.js"
import * as layout from "./layout.js"
import * as pageWidth from "./pageWidth.js"

// -----------------------------------------------------------------------------
// Rendering Algorithms
// -----------------------------------------------------------------------------

/** @internal */
export const render = dual<
  (config: Doc.Doc.RenderConfig) => <A>(self: Doc.Doc<A>) => string,
  <A>(self: Doc.Doc<A>, config: Doc.Doc.RenderConfig) => string
>(2, (self, config) => {
  switch (config.style) {
    case "compact": {
      return renderStream(layout.compact(self))
    }
    case "pretty": {
      const width = Object.assign({}, pageWidth.defaultPageWidth, config.options)
      return renderStream(layout.pretty(self, layout.options(width)))
    }
    case "smart": {
      const width = Object.assign({}, pageWidth.defaultPageWidth, config.options)
      return renderStream(layout.smart(self, layout.options(width)))
    }
  }
})

/** @internal */
export const renderStream = <A>(self: DocStream.DocStream<A>): string => Effect.runSync(renderSafe(self))

const renderSafe = <A>(self: DocStream.DocStream<A>): Effect.Effect<string> => {
  switch (self._tag) {
    case "FailedStream": {
      throw new Error("bug, we ended up with a failed in render!")
    }
    case "EmptyStream": {
      return Effect.succeed("")
    }
    case "CharStream": {
      return Effect.map(
        Effect.suspend(() => renderSafe(self.stream)),
        (rest) => self.char + rest
      )
    }
    case "TextStream": {
      return Effect.map(
        Effect.suspend(() => renderSafe(self.stream)),
        (rest) => self.text + rest
      )
    }
    case "LineStream": {
      let indent = "\n"
      for (let i = 0; i < self.indentation; i++) {
        indent = indent += " "
      }
      return Effect.map(
        Effect.suspend(() => renderSafe(self.stream)),
        (rest) => indent + rest
      )
    }
    case "PopAnnotationStream":
    case "PushAnnotationStream": {
      return Effect.suspend(() => renderSafe(self.stream))
    }
  }
}
