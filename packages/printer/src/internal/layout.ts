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
  (self, fits, options) =>
    Effect.runSync(wadlerLeijenSafe(0, 0, pipeline.cons(0, self, pipeline.nil), fits, options))
)

const wadlerLeijenSafe = <A>(
  nl: number,
  cc: number,
  x: pipeline.LayoutPipeline<A>,
  fits: Layout.Layout.FittingPredicate<A>,
  options: Layout.Layout.Options
): Effect.Effect<never, never, DocStream.DocStream<A>> => {
  switch (x._tag) {
    case "Nil": {
      return Effect.succeed(docStream.empty)
    }
    case "Cons": {
      switch (x.document._tag) {
        case "Fail": {
          return Effect.succeed(docStream.failed)
        }
        case "Empty": {
          return Effect.suspend(() => wadlerLeijenSafe(nl, cc, x.pipeline, fits, options))
        }
        case "Char": {
          const char = x.document.char
          return Effect.map(
            Effect.suspend(() => wadlerLeijenSafe(nl, cc + 1, x.pipeline, fits, options)),
            docStream.char(char)
          )
        }
        case "Text": {
          const text = x.document.text
          return Effect.map(
            Effect.suspend(() => wadlerLeijenSafe(nl, cc + text.length, x.pipeline, fits, options)),
            docStream.text(text)
          )
        }
        case "Line": {
          return Effect.map(
            Effect.suspend(() => wadlerLeijenSafe(x.indent, x.indent, x.pipeline, fits, options)),
            (stream) =>
              docStream.line(
                stream,
                docStream.isEmptyStream(stream) || docStream.isLineStream(stream) ? 0 : x.indent
              )
          )
        }
        case "FlatAlt": {
          const layoutPipeline = pipeline.cons(x.indent, x.document.left, x.pipeline)
          return Effect.suspend(() => wadlerLeijenSafe(nl, cc, layoutPipeline, fits, options))
        }
        case "Cat": {
          const inner = pipeline.cons(x.indent, x.document.right, x.pipeline)
          const outer = pipeline.cons(x.indent, x.document.left, inner)
          return Effect.suspend(() => wadlerLeijenSafe(nl, cc, outer, fits, options))
        }
        case "Nest": {
          const indent = x.indent + x.document.indent
          const layoutPipeline = pipeline.cons(indent, x.document.doc, x.pipeline)
          return Effect.suspend(() => wadlerLeijenSafe(nl, cc, layoutPipeline, fits, options))
        }
        case "Union": {
          const leftPipeline = pipeline.cons(x.indent, x.document.left, x.pipeline)
          const rightPipeline = pipeline.cons(x.indent, x.document.right, x.pipeline)
          return Effect.zipWith(
            Effect.suspend(() => wadlerLeijenSafe(nl, cc, leftPipeline, fits, options)),
            wadlerLeijenSafe(nl, cc, rightPipeline, fits, options),
            (left, right) => selectNicer(fits, nl, cc, left, right)
          )
        }
        case "Column": {
          const layoutPipeline = pipeline.cons(x.indent, x.document.react(cc), x.pipeline)
          return Effect.suspend(() => wadlerLeijenSafe(nl, cc, layoutPipeline, fits, options))
        }
        case "WithPageWidth": {
          const layoutPipeline = pipeline.cons(
            x.indent,
            x.document.react(options.pageWidth),
            x.pipeline
          )
          return Effect.suspend(() => wadlerLeijenSafe(nl, cc, layoutPipeline, fits, options))
        }
        case "Nesting": {
          const layoutPipeline = pipeline.cons(x.indent, x.document.react(x.indent), x.pipeline)
          return Effect.suspend(() => wadlerLeijenSafe(nl, cc, layoutPipeline, fits, options))
        }
        case "Annotated": {
          const annotation = x.document.annotation
          const layoutPipeline = pipeline.cons(
            x.indent,
            x.document.doc,
            pipeline.undoAnnotation(x.pipeline)
          )
          return Effect.map(
            Effect.suspend(() => wadlerLeijenSafe(nl, cc, layoutPipeline, fits, options)),
            (stream) => docStream.pushAnnotation(annotation)(stream)
          )
        }
      }
    }
    case "UndoAnnotation":
      return Effect.map(
        Effect.suspend(() => wadlerLeijenSafe(nl, cc, x.pipeline, fits, options)),
        docStream.popAnnotation
      )
  }
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
): DocStream.DocStream<A> => fits(lineIndent, currentColumn, initialIndentation(y))(x) ? x : y

// -----------------------------------------------------------------------------
// compact
// -----------------------------------------------------------------------------

/** @internal */
export const compact = <A>(self: Doc.Doc<A>): DocStream.DocStream<A> =>
  Effect.runSync(compactSafe(List.of(self), 0))

const compactSafe = <A>(
  docs: List.List<Doc.Doc<A>>,
  i: number
): Effect.Effect<never, never, DocStream.DocStream<A>> => {
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
      (lineIndent, currentColumn) => (stream) => {
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
  return (lineIndent: number, currentColumn: number, initialIndentY: Option.Option<number>) =>
  <A>(stream: DocStream.DocStream<A>): boolean => {
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
    () => (stream) => !failsOnFirstLine(stream),
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
