import * as Effect from "effect/Effect"
import { dual } from "effect/Function"
import * as List from "effect/List"
import * as Option from "effect/Option"
import type * as Doc from "../Doc.js"
import * as DocStream from "../DocStream.js"
import type * as Layout from "../Layout.js"
import type * as PageWidth from "../PageWidth.js"
import * as docStream from "./docStream.js"
import * as pipeline from "./layoutPipeline.js"
import * as pageWidth from "./pageWidth.js"

/** @internal */
export const options = (pageWidth: PageWidth.PageWidth): Layout.Layout.Options => ({ pageWidth })

/** @internal */
export const defaultOptions: Layout.Layout.Options = options(pageWidth.defaultPageWidth)

// -----------------------------------------------------------------------------
// wadlerLeijen
// -----------------------------------------------------------------------------

/** @internal */
export const wadlerLeijen = dual<
  <A>(
    fits: Layout.Layout.FittingPredicate<A>,
    options: Layout.Layout.Options
  ) => (self: Doc.Doc<A>) => DocStream.DocStream<A>,
  <A>(
    self: Doc.Doc<A>,
    fits: Layout.Layout.FittingPredicate<A>,
    options: Layout.Layout.Options
  ) => DocStream.DocStream<A>
>(
  3,
  (self, fits, options) => Effect.runSync(wadlerLeijenSafe(pipeline.cons(0, self, pipeline.nil), 0, 0, fits, options))
)

const wadlerLeijenSafe = <A>(
  self: pipeline.LayoutPipeline<A>,
  nestingLevel: number,
  currentColumn: number,
  fits: Layout.Layout.FittingPredicate<A>,
  options: Layout.Layout.Options
): Effect.Effect<DocStream.DocStream<A>> => {
  const best = (self: pipeline.LayoutPipeline<A>, nl: number, cc: number): Effect.Effect<DocStream.DocStream<A>> =>
    Effect.gen(function*(_) {
      switch (self._tag) {
        case "Nil": {
          return docStream.empty
        }
        case "Cons": {
          switch (self.document._tag) {
            case "Fail": {
              return docStream.failed
            }
            case "Empty": {
              return yield* _(best(self.pipeline, nl, cc))
            }
            case "Char": {
              const stream = yield* _(best(self.pipeline, nl, cc + 1))
              return docStream.char(stream, self.document.char)
            }
            case "Text": {
              const length = self.document.text.length
              const stream = yield* _(best(self.pipeline, nl, cc + length))
              return docStream.text(stream, self.document.text)
            }
            case "Line": {
              const stream = yield* _(best(self.pipeline, self.indent, self.indent))
              // Do not produce indentation if there is no subsequent text on
              // the same line (prevents trailing whitespace)
              const nextIndent = docStream.isEmptyStream(stream) || docStream.isLineStream(stream) ? 0 : self.indent
              return docStream.line(stream, nextIndent)
            }
            case "FlatAlt": {
              const next = pipeline.cons(self.indent, self.document.left, self.pipeline)
              return yield* _(best(next, nl, cc))
            }
            case "Cat": {
              const inner = pipeline.cons(self.indent, self.document.right, self.pipeline)
              const outer = pipeline.cons(self.indent, self.document.left, inner)
              return yield* _(best(outer, nl, cc))
            }
            case "Nest": {
              const indent = self.indent + self.document.indent
              const next = pipeline.cons(indent, self.document.doc, self.pipeline)
              return yield* _(best(next, nl, cc))
            }
            case "Union": {
              const leftPipeline = pipeline.cons(self.indent, self.document.left, self.pipeline)
              const rightPipeline = pipeline.cons(self.indent, self.document.right, self.pipeline)
              const left = yield* _(best(leftPipeline, nl, cc))
              const right = yield* _(best(rightPipeline, nl, cc))
              return selectNicer(fits, nl, cc, left, right)
            }
            case "Column": {
              const doc = self.document.react(cc)
              const next = pipeline.cons(self.indent, doc, self.pipeline)
              return yield* _(best(next, nl, cc))
            }
            case "WithPageWidth": {
              const doc = self.document.react(options.pageWidth)
              const next = pipeline.cons(self.indent, doc, self.pipeline)
              return yield* _(best(next, nl, cc))
            }
            case "Nesting": {
              const doc = self.document.react(self.indent)
              const next = pipeline.cons(self.indent, doc, self.pipeline)
              return yield* _(best(next, nl, cc))
            }
            case "Annotated": {
              const undo = pipeline.undoAnnotation(self.pipeline)
              const next = pipeline.cons(self.indent, self.document.doc, undo)
              const stream = yield* _(best(next, nl, cc))
              return docStream.pushAnnotation(stream, self.document.annotation)
            }
          }
        }
        case "UndoAnnotation": {
          const stream = yield* _(best(self.pipeline, nestingLevel, currentColumn))
          return docStream.popAnnotation(stream)
        }
      }
    })
  return best(self, nestingLevel, currentColumn)
}

const initialIndentation = <A>(self: DocStream.DocStream<A>): Option.Option<number> => {
  let stream = self
  while (
    stream._tag === "LineStream" ||
    stream._tag === "PushAnnotationStream" ||
    stream._tag === "PopAnnotationStream"
  ) {
    if (stream._tag === "LineStream") {
      return Option.some(stream.indentation)
    }
    stream = stream.stream
  }
  return Option.none()
}

const selectNicer = <A>(
  fits: Layout.Layout.FittingPredicate<A>,
  lineIndent: number,
  currentColumn: number,
  x: DocStream.DocStream<A>,
  y: DocStream.DocStream<A>
): DocStream.DocStream<A> => fits(x, lineIndent, currentColumn, initialIndentation(y)) ? x : y

// -----------------------------------------------------------------------------
// compact
// -----------------------------------------------------------------------------

/** @internal */
export const compact = <A>(self: Doc.Doc<A>): DocStream.DocStream<A> => Effect.runSync(compactSafe(List.of(self), 0))

const compactSafe = <A>(
  docs: List.List<Doc.Doc<A>>,
  i: number
): Effect.Effect<DocStream.DocStream<A>> => {
  if (List.isNil(docs)) {
    return Effect.succeed(DocStream.empty)
  }
  const head = docs.head
  const tail = docs.tail
  switch (head._tag) {
    case "Fail": {
      return Effect.succeed(DocStream.failed)
    }
    case "Empty": {
      return Effect.suspend(() => compactSafe(tail, i))
    }
    case "Char": {
      return Effect.map(
        Effect.suspend(() => compactSafe(tail, i + 1)),
        DocStream.char(head.char)
      )
    }
    case "Text": {
      return Effect.map(
        Effect.suspend(() => compactSafe(tail, i + head.text.length)),
        DocStream.text(head.text)
      )
    }
    case "Line": {
      return Effect.map(
        Effect.suspend(() => compactSafe(tail, 0)),
        DocStream.line(0)
      )
    }
    case "FlatAlt": {
      return Effect.suspend(() => compactSafe(List.cons(head.left, tail), i))
    }
    case "Cat": {
      return Effect.suspend(() => compactSafe(List.cons(head.left, List.cons(head.right, tail)), i))
    }
    case "Nest": {
      return Effect.suspend(() => compactSafe(List.cons(head.doc, tail), i))
    }
    case "Union": {
      return Effect.suspend(() => compactSafe(List.cons(head.right, tail), i))
    }
    case "Column": {
      return Effect.suspend(() => compactSafe(List.cons(head.react(i), tail), i))
    }
    case "WithPageWidth": {
      return Effect.suspend(() => compactSafe(List.cons(head.react(pageWidth.unbounded), tail), i))
    }
    case "Nesting": {
      return Effect.suspend(() => compactSafe(List.cons(head.react(0), tail), i))
    }
    case "Annotated": {
      return Effect.suspend(() => compactSafe(List.cons(head.doc, tail), i))
    }
  }
}

// -----------------------------------------------------------------------------
// pretty
// -----------------------------------------------------------------------------

/** @internal */
export const pretty = dual<
  (options: Layout.Layout.Options) => <A>(self: Doc.Doc<A>) => DocStream.DocStream<A>,
  <A>(self: Doc.Doc<A>, options: Layout.Layout.Options) => DocStream.DocStream<A>
>(2, (self, options) => {
  const width = options.pageWidth
  if (width._tag === "AvailablePerLine") {
    return wadlerLeijen(
      self,
      (stream, lineIndent, currentColumn) => {
        const remainingWidth = pageWidth.remainingWidth(
          width.lineWidth,
          width.ribbonFraction,
          lineIndent,
          currentColumn
        )
        return fitsPretty(stream, remainingWidth)
      },
      options
    )
  }
  return unbounded(self)
})

const fitsPretty = <A>(self: DocStream.DocStream<A>, width: number): boolean => {
  let w = width
  let stream = self
  while (w >= 0) {
    switch (stream._tag) {
      case "FailedStream": {
        return false
      }
      case "EmptyStream": {
        return true
      }
      case "CharStream": {
        w = w - 1
        stream = stream.stream
        break
      }
      case "TextStream": {
        w = w - stream.text.length
        stream = stream.stream
        break
      }
      case "LineStream": {
        return true
      }
      case "PushAnnotationStream": {
        stream = stream.stream
        break
      }
      case "PopAnnotationStream": {
        stream = stream.stream
        break
      }
    }
  }
  return false
}

// -----------------------------------------------------------------------------
// smart
// -----------------------------------------------------------------------------

/** @internal */
export const smart = dual<
  (options: Layout.Layout.Options) => <A>(self: Doc.Doc<A>) => DocStream.DocStream<A>,
  <A>(self: Doc.Doc<A>, options: Layout.Layout.Options) => DocStream.DocStream<A>
>(2, (self, options) => {
  const width = options.pageWidth
  if (width._tag === "AvailablePerLine") {
    return wadlerLeijen(
      self,
      fitsSmart(width.lineWidth, width.ribbonFraction),
      options
    )
  }
  return unbounded(self)
})

const fitsSmart = (lineWidth: number, ribbonFraction: number) => {
  return <A>(
    stream: DocStream.DocStream<A>,
    lineIndent: number,
    currentColumn: number,
    initialIndentY: Option.Option<number>
  ): boolean => {
    const availableWidth = pageWidth.remainingWidth(
      lineWidth,
      ribbonFraction,
      lineIndent,
      currentColumn
    )
    let minNestingLevel: number
    switch (initialIndentY._tag) {
      // If `y` is `None`, then it is definitely not a hanging layout,
      // so we will need to check `x` with the same minNestingLevel
      // that any subsequent lines with the same indentation use
      case "None": {
        minNestingLevel = currentColumn
        break
      }
      // If `y` is some, then `y` could be a (less wide) hanging layout,
      // so we need to check `x` a bit more thoroughly to make sure we
      // do not miss a potentially better fitting `y`
      case "Some": {
        minNestingLevel = Math.min(initialIndentY.value, currentColumn)
        break
      }
    }
    return fitsSmartLoop(stream, availableWidth, minNestingLevel, lineWidth)
  }
}

const fitsSmartLoop = <A>(
  self: DocStream.DocStream<A>,
  width: number,
  minNestingLevel: number,
  lineWidth: number
): boolean => {
  let stream = self
  let w = width
  while (w >= 0) {
    switch (stream._tag) {
      case "FailedStream": {
        return false
      }
      case "EmptyStream": {
        return true
      }
      case "CharStream": {
        w = w - 1
        stream = stream.stream
        break
      }
      case "TextStream": {
        w = w - stream.text.length
        stream = stream.stream
        break
      }
      case "LineStream": {
        if (minNestingLevel >= stream.indentation) {
          return true
        }
        w = lineWidth - stream.indentation
        stream = stream.stream
        break
      }
      case "PushAnnotationStream": {
        stream = stream.stream
        break
      }
      case "PopAnnotationStream": {
        stream = stream.stream
        break
      }
    }
  }
  return false
}

// -----------------------------------------------------------------------------
// unbounded
// -----------------------------------------------------------------------------

/** @internal */
export const unbounded = <A>(self: Doc.Doc<A>): DocStream.DocStream<A> =>
  wadlerLeijen(
    self,
    (stream) => !failsOnFirstLine(stream),
    { pageWidth: pageWidth.unbounded }
  )

const failsOnFirstLine = <A>(self: DocStream.DocStream<A>): boolean => {
  let stream = self
  // eslint-disable-next-line no-constant-condition
  while (1) {
    switch (stream._tag) {
      case "FailedStream": {
        return true
      }
      case "EmptyStream": {
        return false
      }
      case "CharStream": {
        stream = stream.stream
        break
      }
      case "TextStream": {
        stream = stream.stream
        break
      }
      case "LineStream": {
        return false
      }
      case "PushAnnotationStream": {
        stream = stream.stream
        break
      }
      case "PopAnnotationStream": {
        stream = stream.stream
        break
      }
    }
  }
  throw new Error("bug")
}
