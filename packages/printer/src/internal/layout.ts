import * as Effect from "effect/Effect"
import type { LazyArg } from "effect/Function"
import { dual } from "effect/Function"
import * as List from "effect/List"
import * as Option from "effect/Option"
import type * as Doc from "../Doc.js"
import type * as DocStream from "../DocStream.js"
import type * as Layout from "../Layout.js"
import type * as PageWidth from "../PageWidth.js"
import * as InternalDocStream from "./docStream.js"
import * as InternalPipeline from "./layoutPipeline.js"
import * as InternalPageWidth from "./pageWidth.js"

/** @internal */
export const options = (pageWidth: PageWidth.PageWidth): Layout.Layout.Options => ({ pageWidth })

/** @internal */
export const defaultOptions: Layout.Layout.Options = options(InternalPageWidth.defaultPageWidth)

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
  (self, fits, options) =>
    Effect.runSync(wadlerLeijenSafe(InternalPipeline.cons(0, self, InternalPipeline.nil), 0, 0, fits, options))
)

const wadlerLeijenSafe = <A>(
  self: InternalPipeline.LayoutPipeline<A>,
  nestingLevel: number,
  currentColumn: number,
  fits: Layout.Layout.FittingPredicate<A>,
  options: Layout.Layout.Options
): Effect.Effect<DocStream.DocStream<A>> => {
  const best = (
    self: InternalPipeline.LayoutPipeline<A>,
    nl: number,
    cc: number
  ): Effect.Effect<DocStream.DocStream<A>> =>
    Effect.gen(function*() {
      switch (self._tag) {
        case "Nil": {
          return InternalDocStream.empty
        }
        case "Cons": {
          switch (self.document._tag) {
            case "Fail": {
              return InternalDocStream.failed
            }
            case "Empty": {
              return yield* best(self.pipeline, nl, cc)
            }
            case "Char": {
              const stream = yield* best(self.pipeline, nl, cc + 1)
              return InternalDocStream.char(stream, self.document.char)
            }
            case "Text": {
              const length = self.document.text.length
              const stream = yield* best(self.pipeline, nl, cc + length)
              return InternalDocStream.text(stream, self.document.text)
            }
            case "Line": {
              const stream = yield* best(self.pipeline, self.indent, self.indent)
              // Do not produce indentation if there is no subsequent text on
              // the same line (prevents trailing whitespace)
              const nextIndent = InternalDocStream.isEmptyStream(stream) || InternalDocStream.isLineStream(stream)
                ? 0
                : self.indent
              return InternalDocStream.line(stream, nextIndent)
            }
            case "FlatAlt": {
              const next = InternalPipeline.cons(self.indent, self.document.left, self.pipeline)
              return yield* best(next, nl, cc)
            }
            case "Cat": {
              const inner = InternalPipeline.cons(self.indent, self.document.right, self.pipeline)
              const outer = InternalPipeline.cons(self.indent, self.document.left, inner)
              return yield* best(outer, nl, cc)
            }
            case "Nest": {
              const indent = self.indent + self.document.indent
              const next = InternalPipeline.cons(indent, self.document.doc, self.pipeline)
              return yield* best(next, nl, cc)
            }
            case "Union": {
              const leftPipeline = InternalPipeline.cons(self.indent, self.document.left, self.pipeline)
              const rightPipeline = InternalPipeline.cons(self.indent, self.document.right, self.pipeline)
              const left = best(leftPipeline, nl, cc)
              const right = best(rightPipeline, nl, cc)
              return selectNicer(fits, nl, cc, left, right)
            }
            case "Column": {
              const doc = self.document.react(cc)
              const next = InternalPipeline.cons(self.indent, doc, self.pipeline)
              return yield* best(next, nl, cc)
            }
            case "WithPageWidth": {
              const doc = self.document.react(options.pageWidth)
              const next = InternalPipeline.cons(self.indent, doc, self.pipeline)
              return yield* best(next, nl, cc)
            }
            case "Nesting": {
              const doc = self.document.react(self.indent)
              const next = InternalPipeline.cons(self.indent, doc, self.pipeline)
              return yield* best(next, nl, cc)
            }
            case "Annotated": {
              const undo = InternalPipeline.undoAnnotation(self.pipeline)
              const next = InternalPipeline.cons(self.indent, self.document.doc, undo)
              const stream = yield* best(next, nl, cc)
              return InternalDocStream.pushAnnotation(stream, self.document.annotation)
            }
          }
        }
        case "UndoAnnotation": {
          const stream = yield* best(self.pipeline, nestingLevel, currentColumn)
          return InternalDocStream.popAnnotation(stream)
        }
      }
    })
  return best(self, nestingLevel, currentColumn)
}

const selectNicer = <A>(
  fits: Layout.Layout.FittingPredicate<A>,
  lineIndent: number,
  currentColumn: number,
  left: Effect.Effect<DocStream.DocStream<A>>,
  right: Effect.Effect<DocStream.DocStream<A>>
): DocStream.DocStream<A> => {
  const leftStream = Effect.runSync(left)
  let rightStream: DocStream.DocStream<A> | undefined = undefined
  return fits(
      leftStream,
      lineIndent,
      currentColumn,
      () => rightStream ?? (rightStream = Effect.runSync(right), rightStream)
    ) ?
    leftStream :
    rightStream ?? Effect.runSync(right)
}

// -----------------------------------------------------------------------------
// compact
// -----------------------------------------------------------------------------

/** @internal */
export const compact = <A>(self: Doc.Doc<A>): DocStream.DocStream<A> => Effect.runSync(compactSafe(List.of(self), 0))

const compactSafe = <A>(
  docs: List.List<Doc.Doc<A>>,
  i: number
): Effect.Effect<DocStream.DocStream<A>> =>
  Effect.gen(function*() {
    if (List.isNil(docs)) {
      return InternalDocStream.empty
    }
    const head = docs.head
    const tail = docs.tail
    switch (head._tag) {
      case "Fail": {
        return InternalDocStream.failed
      }
      case "Empty": {
        return yield* compactSafe(tail, i)
      }
      case "Char": {
        const stream = yield* compactSafe(tail, i + 1)
        return InternalDocStream.char(stream, head.char)
      }
      case "Text": {
        const stream = yield* compactSafe(tail, i + head.text.length)
        return InternalDocStream.text(stream, head.text)
      }
      case "Line": {
        const stream = yield* compactSafe(tail, 0)
        return InternalDocStream.line(stream, 0)
      }
      case "FlatAlt": {
        return yield* compactSafe(List.cons(head.left, tail), i)
      }
      case "Cat": {
        const list = List.cons(head.left, List.cons(head.right, tail))
        return yield* compactSafe(list, i)
      }
      case "Nest": {
        return yield* compactSafe(List.cons(head.doc, tail), i)
      }
      case "Union": {
        return yield* compactSafe(List.cons(head.right, tail), i)
      }
      case "Column": {
        return yield* compactSafe(List.cons(head.react(i), tail), i)
      }
      case "WithPageWidth": {
        return yield* compactSafe(List.cons(head.react(InternalPageWidth.unbounded), tail), i)
      }
      case "Nesting": {
        return yield* compactSafe(List.cons(head.react(0), tail), i)
      }
      case "Annotated": {
        return yield* compactSafe(List.cons(head.doc, tail), i)
      }
    }
  })

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
      (stream, indentation, currentColumn) => {
        const remainingWidth = InternalPageWidth.remainingWidth(
          width.lineWidth,
          width.ribbonFraction,
          indentation,
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

const fitsSmart = (pageWidth: number, ribbonFraction: number) => {
  return <A>(
    stream: DocStream.DocStream<A>,
    indentation: number,
    currentColumn: number,
    comparator: LazyArg<DocStream.DocStream<A>>
  ): boolean => {
    const availableWidth = InternalPageWidth.remainingWidth(
      pageWidth,
      ribbonFraction,
      indentation,
      currentColumn
    )
    return fitsSmartLoop(
      stream,
      comparator,
      pageWidth,
      currentColumn,
      availableWidth
    )
  }
}

const fitsSmartLoop = <A>(
  self: DocStream.DocStream<A>,
  comparator: LazyArg<DocStream.DocStream<A>>,
  pageWidth: number,
  currentColumn: number,
  availableWidth: number
): boolean => {
  let minNestingLevel: number | undefined
  let stream = self
  let w = availableWidth
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
        if (!minNestingLevel) {
          minNestingLevel = Option.match(getInitialIndentation(comparator()), {
            // Definitely not a hanging layout. Return the same `minNestingLevel` that
            // subsequent lines with the same indentation use
            onNone: () => currentColumn,
            // Could be a (less wide) hanging layout, so take the minimum of the indent
            // and the current column
            onSome: (value) => Math.min(value, currentColumn)
          })
        }
        if (minNestingLevel < stream.indentation) {
          return false
        }
        w = pageWidth - stream.indentation
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

const getInitialIndentation = <A>(self: DocStream.DocStream<A>): Option.Option<number> => {
  let stream: DocStream.DocStream<A> = self
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

// -----------------------------------------------------------------------------
// unbounded
// -----------------------------------------------------------------------------

/** @internal */
export const unbounded = <A>(self: Doc.Doc<A>): DocStream.DocStream<A> =>
  wadlerLeijen(
    self,
    (stream) => !failsOnFirstLine(stream),
    { pageWidth: InternalPageWidth.unbounded }
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
