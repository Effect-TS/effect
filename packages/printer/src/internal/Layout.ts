import * as LayoutPipeline from "@effect/printer/internal/Layout/pipeline"
import { pipe } from "@fp-ts/data/Function"
import * as List from "@fp-ts/data/List"
import * as Option from "@fp-ts/data/Option"
import * as SafeEval from "@fp-ts/data/SafeEval"

// -----------------------------------------------------------------------------
// wadlerLeijen
// -----------------------------------------------------------------------------

/** @internal */
export function wadlerLeijen<A>(
  fits: Layout.FittingPredicate<A>,
  options: Layout.Options
) {
  return (self: Doc<A>): DocStream<A> =>
    SafeEval.execute(wadlerLeijenSafe(
      0,
      0,
      LayoutPipeline.cons(0, self, LayoutPipeline.nil),
      fits,
      options
    ))
}

function wadlerLeijenSafe<A>(
  nl: number,
  cc: number,
  x: LayoutPipeline.LayoutPipeline<A>,
  fits: Layout.FittingPredicate<A>,
  options: Layout.Options
): SafeEval.SafeEval<DocStream<A>> {
  switch (x._tag) {
    case "Nil": {
      return SafeEval.succeed(DocStream.empty)
    }
    case "Cons": {
      switch (x.document._tag) {
        case "Fail": {
          return SafeEval.succeed(DocStream.failed)
        }
        case "Empty": {
          return SafeEval.suspend(() => wadlerLeijenSafe(nl, cc, x.pipeline, fits, options))
        }
        case "Char": {
          const char = x.document.char
          return pipe(
            SafeEval.suspend(() => wadlerLeijenSafe(nl, cc + 1, x.pipeline, fits, options)),
            SafeEval.map(DocStream.char(char))
          )
        }
        case "Text": {
          const t = x.document.text
          return pipe(
            SafeEval.suspend(() => wadlerLeijenSafe(nl, cc + t.length, x.pipeline, fits, options)),
            SafeEval.map(DocStream.text(t))
          )
        }
        case "Line": {
          return pipe(
            SafeEval.suspend(() => wadlerLeijenSafe(x.indent, x.indent, x.pipeline, fits, options)),
            SafeEval.map((stream) =>
              DocStream.line(stream.isEmptyStream() || stream.isLineStream() ? 0 : x.indent)(stream)
            )
          )
        }
        case "FlatAlt": {
          const pipeline = LayoutPipeline.cons(x.indent, x.document.left, x.pipeline)
          return SafeEval.suspend(() => wadlerLeijenSafe(nl, cc, pipeline, fits, options))
        }
        case "Cat": {
          const inner = LayoutPipeline.cons(x.indent, x.document.right, x.pipeline)
          const outer = LayoutPipeline.cons(x.indent, x.document.left, inner)
          return SafeEval.suspend(() => wadlerLeijenSafe(nl, cc, outer, fits, options))
        }
        case "Nest": {
          const indent = x.indent + x.document.indent
          const pipeline = LayoutPipeline.cons(indent, x.document.doc, x.pipeline)
          return SafeEval.suspend(() => wadlerLeijenSafe(nl, cc, pipeline, fits, options))
        }
        case "Union": {
          const leftPipeline = LayoutPipeline.cons(x.indent, x.document.left, x.pipeline)
          const rightPipeline = LayoutPipeline.cons(x.indent, x.document.right, x.pipeline)
          return pipe(
            SafeEval.suspend(() => wadlerLeijenSafe(nl, cc, leftPipeline, fits, options)),
            SafeEval.zipWith(
              wadlerLeijenSafe(nl, cc, rightPipeline, fits, options),
              (left, right) => selectNicer(fits, nl, cc, left, right)
            )
          )
        }
        case "Column": {
          const pipeline = LayoutPipeline.cons(x.indent, x.document.react(cc), x.pipeline)
          return SafeEval.suspend(() => wadlerLeijenSafe(nl, cc, pipeline, fits, options))
        }
        case "WithPageWidth": {
          const pipeline = LayoutPipeline.cons(x.indent, x.document.react(options.pageWidth), x.pipeline)
          return SafeEval.suspend(() => wadlerLeijenSafe(nl, cc, pipeline, fits, options))
        }
        case "Nesting": {
          const pipeline = LayoutPipeline.cons(x.indent, x.document.react(x.indent), x.pipeline)
          return SafeEval.suspend(() => wadlerLeijenSafe(nl, cc, pipeline, fits, options))
        }
        case "Annotated": {
          const annotation = x.document.annotation
          const pipeline = LayoutPipeline.cons(x.indent, x.document.doc, LayoutPipeline.undoAnnotation(x.pipeline))
          return pipe(
            SafeEval.suspend(() => wadlerLeijenSafe(nl, cc, pipeline, fits, options)),
            SafeEval.map((stream) => DocStream.pushAnnotation(annotation)(stream))
          )
        }
      }
    }
    case "UndoAnnotation":
      return pipe(
        SafeEval.suspend(() => wadlerLeijenSafe(nl, cc, x.pipeline, fits, options)),
        SafeEval.map(DocStream.popAnnotation)
      )
  }
}

function initialIndentation<A>(self: DocStream<A>): Option.Option<number> {
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
  return Option.none
}

function selectNicer<A>(
  fits: Layout.FittingPredicate<A>,
  lineIndent: number,
  currentColumn: number,
  x: DocStream<A>,
  y: DocStream<A>
): DocStream<A> {
  const fitsLayout = fits(lineIndent, currentColumn, initialIndentation(y))(x)
  return fitsLayout ? x : y
}

// -----------------------------------------------------------------------------
// compact
// -----------------------------------------------------------------------------

/** @internal */
export function compact<A>(self: Doc<A>): DocStream<A> {
  return SafeEval.execute(compactSafe(List.of(self), 0))
}

function compactSafe<A>(docs: List.List<Doc<A>>, i: number): SafeEval.SafeEval<DocStream<A>> {
  if (List.isNil(docs)) {
    return SafeEval.succeed(DocStream.empty)
  }
  const head = docs.head
  const tail = docs.tail
  switch (head._tag) {
    case "Fail": {
      return SafeEval.succeed(DocStream.failed)
    }
    case "Empty":
      return SafeEval.suspend(() => compactSafe(tail, i))
    case "Char": {
      return pipe(
        SafeEval.suspend(() => compactSafe(tail, i + 1)),
        SafeEval.map(DocStream.char(head.char))
      )
    }
    case "Text": {
      return pipe(
        SafeEval.suspend(() => compactSafe(tail, i + head.text.length)),
        SafeEval.map(DocStream.text(head.text))
      )
    }
    case "Line": {
      return pipe(
        SafeEval.suspend(() => compactSafe(tail, 0)),
        SafeEval.map(DocStream.line(0))
      )
    }
    case "FlatAlt": {
      return SafeEval.suspend(() => compactSafe(List.cons(head.left, tail), i))
    }
    case "Cat": {
      return SafeEval.suspend(() => compactSafe(List.cons(head.left, List.cons(head.right, tail)), i))
    }
    case "Nest": {
      return SafeEval.suspend(() => compactSafe(List.cons(head.doc, tail), i))
    }
    case "Union": {
      return SafeEval.suspend(() => compactSafe(List.cons(head.right, tail), i))
    }
    case "Column": {
      return SafeEval.suspend(() => compactSafe(List.cons(head.react(i), tail), i))
    }
    case "WithPageWidth": {
      return SafeEval.suspend(() => compactSafe(List.cons(head.react(PageWidth.Unbounded), tail), i))
    }
    case "Nesting": {
      return SafeEval.suspend(() => compactSafe(List.cons(head.react(0), tail), i))
    }
    case "Annotated": {
      return SafeEval.suspend(() => compactSafe(List.cons(head.doc, tail), i))
    }
  }
}

// -----------------------------------------------------------------------------
// pretty
// -----------------------------------------------------------------------------

/** @internal */
export function pretty(options: Layout.Options) {
  return <A>(self: Doc<A>): DocStream<A> => {
    const pageWidth = options.pageWidth
    switch (pageWidth._tag) {
      case "AvailablePerLine": {
        return wadlerLeijen<A>(
          (lineIndent, currentColumn) =>
            (stream) => {
              const remainingWidth = PageWidth.remainingWidth(
                pageWidth.lineWidth,
                pageWidth.ribbonFraction,
                lineIndent,
                currentColumn
              )
              return fitsPretty(stream, remainingWidth)
            },
          options
        )(self)
      }
      case "Unbounded": {
        return unbounded(self)
      }
    }
  }
}

function fitsPretty<A>(self: DocStream<A>, width: number): boolean {
  let _width = width
  let _self = self
  while (_width >= 0) {
    switch (_self._tag) {
      case "FailedStream": {
        return false
      }
      case "EmptyStream": {
        return true
      }
      case "CharStream": {
        _width = _width - 1
        _self = _self.stream
        break
      }
      case "TextStream": {
        _width = _width - _self.text.length
        _self = _self.stream
        break
      }
      case "LineStream": {
        return true
      }
      case "PushAnnotationStream": {
        _self = _self.stream
        break
      }
      case "PopAnnotationStream": {
        _self = _self.stream
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
export function smart(options: Layout.Options) {
  return <A>(self: Doc<A>): DocStream<A> => {
    const pageWidth = options.pageWidth
    switch (pageWidth._tag) {
      case "AvailablePerLine": {
        return wadlerLeijen<A>(
          fitsSmart(pageWidth.lineWidth, pageWidth.ribbonFraction),
          options
        )(self)
      }
      case "Unbounded": {
        return unbounded(self)
      }
    }
  }
}

function fitsSmart(lineWidth: number, ribbonFraction: number) {
  return (lineIndent: number, currentColumn: number, initialIndentY: Option.Option<number>) =>
    <A>(stream: DocStream<A>): boolean => {
      const availableWidth = PageWidth.remainingWidth(
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

function fitsSmartLoop<A>(
  self: DocStream<A>,
  width: number,
  minNestingLevel: number,
  lineWidth: number
): boolean {
  let _self = self
  let _width = width
  while (_width >= 0) {
    switch (_self._tag) {
      case "FailedStream": {
        return false
      }
      case "EmptyStream": {
        return true
      }
      case "CharStream": {
        _width = _width - 1
        _self = _self.stream
        break
      }
      case "TextStream": {
        _width = _width - _self.text.length
        _self = _self.stream
        break
      }
      case "LineStream": {
        if (minNestingLevel >= _self.indentation) {
          return true
        }
        _width = lineWidth - _self.indentation
        _self = _self.stream
        break
      }
      case "PushAnnotationStream": {
        _self = _self.stream
        break
      }
      case "PopAnnotationStream": {
        _self = _self.stream
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
export function unbounded<A>(self: Doc<A>): DocStream<A> {
  return wadlerLeijen<A>(
    () => (stream) => !failsOnFirstLine(stream),
    { pageWidth: PageWidth.Unbounded }
  )(self)
}

function failsOnFirstLine<A>(self: DocStream<A>): boolean {
  let _self = self
  // eslint-disable-next-line no-constant-condition
  while (1) {
    switch (_self._tag) {
      case "FailedStream": {
        return true
      }
      case "EmptyStream": {
        return false
      }
      case "CharStream": {
        _self = _self.stream
        break
      }
      case "TextStream": {
        _self = _self.stream
        break
      }
      case "LineStream": {
        return false
      }
      case "PushAnnotationStream": {
        _self = _self.stream
        break
      }
      case "PopAnnotationStream": {
        _self = _self.stream
        break
      }
    }
  }
  throw new Error("bug")
}
