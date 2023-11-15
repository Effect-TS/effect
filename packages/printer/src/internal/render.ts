import * as Effect from "effect/Effect"
import { dual } from "effect/Function"
import type * as Doc from "../Doc.js"
import type * as DocStream from "../DocStream.js"
import type * as PageWidth from "../PageWidth.js"
import * as layout from "./layout.js"
import * as pageWidth from "./pageWidth.js"

// -----------------------------------------------------------------------------
// Rendering Algorithms
// -----------------------------------------------------------------------------

/** @internal */
export const render = <A>(self: DocStream.DocStream<A>): string => Effect.runSync(renderSafe(self))

const renderSafe = <A>(self: DocStream.DocStream<A>): Effect.Effect<never, never, string> => {
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

/** @internal */
export const compact = <A>(self: Doc.Doc<A>): string => render(layout.compact(self))

/** @internal */
export const pretty = dual<
  (options: Partial<Omit<PageWidth.AvailablePerLine, "_tag">>) => <A>(self: Doc.Doc<A>) => string,
  <A>(self: Doc.Doc<A>, options: Partial<Omit<PageWidth.AvailablePerLine, "_tag">>) => string
>(2, (self, options) => {
  const width = Object.assign({}, pageWidth.defaultPageWidth, options)
  const layoutOptions = layout.options(width)
  return render(layout.pretty(self, layoutOptions))
})

/** @internal */
export const prettyDefault = <A>(self: Doc.Doc<A>): string => render(layout.pretty(self, layout.defaultOptions))

/** @internal */
export const prettyUnbounded = <A>(self: Doc.Doc<A>): string =>
  render(layout.pretty(self, layout.options(pageWidth.unbounded)))

/** @internal */
export const smart = dual<
  (options: Partial<Omit<PageWidth.AvailablePerLine, "_tag">>) => <A>(self: Doc.Doc<A>) => string,
  <A>(self: Doc.Doc<A>, options: Partial<Omit<PageWidth.AvailablePerLine, "_tag">>) => string
>(2, (self, options) => {
  const width = Object.assign({}, pageWidth.defaultPageWidth, options)
  const layoutOptions = layout.options(width)
  return render(layout.smart(self, layoutOptions))
})

/** @internal */
export const smartDefault = <A>(self: Doc.Doc<A>): string => render(layout.smart(self, layout.defaultOptions))

/** @internal */
export const smartUnbounded = <A>(self: Doc.Doc<A>): string =>
  render(layout.smart(self, layout.options(pageWidth.unbounded)))
