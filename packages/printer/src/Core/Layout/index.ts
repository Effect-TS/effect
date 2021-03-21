// tracing: off

import type { Array } from "@effect-ts/core/Array"
import * as A from "@effect-ts/core/Array"
import { constant, not } from "@effect-ts/core/Function"
import * as IO from "@effect-ts/core/IO"
import type { Option } from "@effect-ts/core/Option"
import * as O from "@effect-ts/core/Option"

import type { Doc } from "../Doc"
import type { DocStream } from "../DocStream"
import * as DS from "../DocStream"
import type { PageWidth } from "../PageWidth"
import * as PW from "../PageWidth"

// -------------------------------------------------------------------------------------
// definition
// -------------------------------------------------------------------------------------

export type Layout<A> = (opts: LayoutOptions) => DocStream<A>

/**
 * Represents the options that will influence the layout algorithms.
 */
export interface LayoutOptions {
  readonly pageWidth: PageWidth
}

/**
 * Represents a list of nesting level/document pairs that are yet to be laid out.
 */
export type LayoutPipeline<A> = Nil | Cons<A> | UndoAnnotation<A>

export interface Nil {
  readonly _tag: "Nil"
}

export interface Cons<A> {
  readonly _tag: "Cons"
  readonly indent: number
  readonly document: Doc<A>
  readonly pipeline: LayoutPipeline<A>
}

export interface UndoAnnotation<A> {
  readonly _tag: "UndoAnnotation"
  readonly pipeline: LayoutPipeline<A>
}

/**
 * Decides whether a `SimpleDocStream` fits the given constraints, namely:
 * - original indentation of the current
 * - current column
 * - initial indentation of the alternative `DocStream` if it starts with
 * a line break (used by `layoutSmart`)
 * - width in which to fit the first line
 */
export type FittingPredicate<A> = (
  lineIndent: number,
  currentColumn: number,
  initialIndentY: Option<number>
) => (stream: DocStream<A>) => boolean

// -------------------------------------------------------------------------------------
// constructors
// -------------------------------------------------------------------------------------

export const nil: LayoutPipeline<never> = {
  _tag: "Nil"
}

export function cons<A>(
  indent: number,
  document: Doc<A>,
  pipeline: LayoutPipeline<A>
): LayoutPipeline<A> {
  return {
    _tag: "Cons",
    indent,
    document,
    pipeline
  }
}

export function undoAnnotation<A>(pipeline: LayoutPipeline<A>): LayoutPipeline<A> {
  return {
    _tag: "UndoAnnotation",
    pipeline
  }
}

export function layoutOptions(pageWidth: PageWidth): LayoutOptions {
  return {
    pageWidth
  }
}

/**
 * The default layout options, which are suitable when you want to obtain output
 * but do not care about the details.
 */
export const defaultLayoutOptions = layoutOptions(PW.defaultPageWidth)

// -------------------------------------------------------------------------------------
// destructors
// -------------------------------------------------------------------------------------

export function match_<A, R>(
  pipeline: LayoutPipeline<A>,
  patterns: {
    readonly Nil: () => R
    readonly Cons: (indent: number, document: Doc<A>, pipeline: LayoutPipeline<A>) => R
    readonly UndoAnnotation: (pipeline: LayoutPipeline<A>) => R
  }
): R {
  switch (pipeline._tag) {
    case "Nil":
      return patterns.Nil()
    case "Cons":
      return patterns.Cons(pipeline.indent, pipeline.document, pipeline.pipeline)
    case "UndoAnnotation":
      return patterns.UndoAnnotation(pipeline.pipeline)
  }
}

/**
 * @dataFirst match_
 */
export function match<A, R>(patterns: {
  readonly Nil: () => R
  readonly Cons: (indent: number, document: Doc<A>, pipeline: LayoutPipeline<A>) => R
  readonly UndoAnnotation: (pipeline: LayoutPipeline<A>) => R
}) {
  return (pipeline: LayoutPipeline<A>): R => match_(pipeline, patterns)
}

// -------------------------------------------------------------------------------------
// layout algorithms
// -------------------------------------------------------------------------------------

function initialIndentation<A>(stream: DocStream<A>): Option<number> {
  const go = (x: DocStream<A>): IO.IO<Option<number>> =>
    IO.gen(function* (_) {
      switch (x._tag) {
        case "LineStream":
          return O.some(x.indentation)
        case "PushAnnotationStream":
          return yield* _(go(x.stream))
        case "PopAnnotationStream":
          return yield* _(go(x.stream))
        default:
          return O.none
      }
    })
  return IO.run(go(stream))
}

function selectNicer<A>(
  fits: FittingPredicate<A>,
  lineIndent: number,
  currentColumn: number,
  x: DocStream<A>,
  y: DocStream<A>
): DocStream<A> {
  const fitsLayout = fits(lineIndent, currentColumn, initialIndentation(y))(x)
  return fitsLayout ? x : y
}

function layoutWadlerLeijen<A>(
  doc: Doc<A>,
  fits: FittingPredicate<A>,
  options: LayoutOptions
): DocStream<A> {
  const go = (nl: number, cc: number, x: LayoutPipeline<A>): IO.IO<DocStream<A>> =>
    IO.gen(function* (_) {
      switch (x._tag) {
        case "Nil":
          return DS.empty
        case "Cons": {
          switch (x.document._tag) {
            case "Fail":
              return DS.failed
            case "Empty":
              return yield* _(go(nl, cc, x.pipeline))
            case "Char":
              return DS.char_(yield* _(go(nl, cc + 1, x.pipeline)), x.document.char)
            case "Text":
              return DS.text_(
                yield* _(go(nl, cc + x.document.text.length, x.pipeline)),
                x.document.text
              )
            case "Line": {
              const s = yield* _(go(x.indent, x.indent, x.pipeline))
              const i = DS.isEmptyStream(s) || DS.isLineStream(s) ? 0 : x.indent
              return DS.line_(s, i)
            }
            case "FlatAlt": {
              const s = cons(x.indent, x.document.left, x.pipeline)
              return yield* _(go(nl, cc, s))
            }
            case "Cat": {
              const inner = cons(x.indent, x.document.right, x.pipeline)
              const outer = cons(x.indent, x.document.left, inner)
              return yield* _(go(nl, cc, outer))
            }
            case "Nest": {
              const i = x.indent + x.document.indent
              const s = cons(i, x.document.doc, x.pipeline)
              return yield* _(go(nl, cc, s))
            }
            case "Union": {
              const left = yield* _(
                go(nl, cc, cons(x.indent, x.document.left, x.pipeline))
              )
              const right = yield* _(
                go(nl, cc, cons(x.indent, x.document.right, x.pipeline))
              )
              return selectNicer(fits, nl, cc, left, right)
            }
            case "Column": {
              const s = cons(x.indent, x.document.react(cc), x.pipeline)
              return yield* _(go(nl, cc, s))
            }
            case "WithPageWidth": {
              const s = cons(x.indent, x.document.react(options.pageWidth), x.pipeline)
              return yield* _(go(nl, cc, s))
            }
            case "Nesting": {
              const s = cons(x.indent, x.document.react(x.indent), x.pipeline)
              return yield* _(go(nl, cc, s))
            }
            case "Annotated": {
              const p = cons(x.indent, x.document.doc, undoAnnotation(x.pipeline))
              const s = yield* _(go(nl, cc, p))
              return DS.pushAnnotation_(s, x.document.annotation)
            }
          }
        }
        case "UndoAnnotation":
          return DS.popAnnotation(yield* _(go(nl, cc, x.pipeline)))
      }
    })
  return IO.run(go(0, 0, cons(0, doc, nil)))
}

function failsOnFirstLine<A>(stream: DocStream<A>): boolean {
  const go = (x: DocStream<A>): IO.IO<boolean> =>
    IO.gen(function* (_) {
      switch (x._tag) {
        case "FailedStream":
          return true
        case "EmptyStream":
          return false
        case "CharStream":
          return yield* _(go(x.stream))
        case "TextStream":
          return yield* _(go(x.stream))
        case "LineStream":
          return false
        case "PushAnnotationStream":
          return yield* _(go(x.stream))
        case "PopAnnotationStream":
          return yield* _(go(x.stream))
      }
    })
  return IO.run(go(stream))
}

/**
 * The `layoutUnbounded` layout algorithm will lay out a document an
 * `Unbounded` page width.
 */
export function layoutUnbounded<A>(doc: Doc<A>): DocStream<A> {
  return layoutWadlerLeijen<A>(
    doc,
    constant(not(failsOnFirstLine)),
    layoutOptions(PW.unbounded)
  )
}

function fitsPretty(width: number) {
  return <A>(stream: DocStream<A>): boolean => {
    const go = (x: DocStream<A>, w: number): IO.IO<boolean> =>
      IO.gen(function* (_) {
        if (w < 0) return false
        switch (x._tag) {
          case "FailedStream":
            return false
          case "EmptyStream":
            return true
          case "CharStream":
            return yield* _(go(x.stream, w - 1))
          case "TextStream":
            return yield* _(go(x.stream, w - x.text.length))
          case "LineStream":
            return true
          case "PushAnnotationStream":
            return yield* _(go(x.stream, w))
          case "PopAnnotationStream":
            return yield* _(go(x.stream, w))
        }
      })
    return IO.run(go(stream, width))
  }
}

/**
 * The `pretty` layout algorithm is the default algorithm for rendering
 * documents.
 *
 * `pretty` commites to rendering something in a certain way if the next
 * element fits the layout constrants. In other words, it has one `SimpleDocStream`
 * element lookahead when rendering.
 *
 * Consider using the smarter, but slightly less performant `layoutSmart`
 * algorithm if the results seem to run off to the right before having lots of
 * line breaks.
 */
export function pretty_<A>(options: LayoutOptions, doc: Doc<A>): DocStream<A> {
  return PW.match_(options.pageWidth, {
    AvailablePerLine: (lineWidth, ribbonFraction) =>
      layoutWadlerLeijen(
        doc,
        (lineIndent, currentColumn) => {
          const remainingWidth = PW.remainingWidth(
            lineWidth,
            ribbonFraction,
            lineIndent,
            currentColumn
          )
          return fitsPretty(remainingWidth)
        },
        options
      ),
    Unbounded: () => layoutUnbounded(doc)
  })
}

/**
 * @dataFirst pretty_
 */
export function pretty<A>(doc: Doc<A>): Layout<A> {
  return (options) => pretty_(options, doc)
}

function fitsSmart(lineWidth: number, ribbonFraction: number) {
  return (
    lineIndent: number,
    currentColumn: number,
    initialIndentY: Option<number>
  ) => <A>(stream: DocStream<A>): boolean => {
    const availableWidth = PW.remainingWidth(
      lineWidth,
      ribbonFraction,
      lineIndent,
      currentColumn
    )

    const minNestingLevel = O.fold_(
      initialIndentY,
      // If `y` is `None`, then it is definitely not a hanging layout,
      // so we will need to check `x` with the same minNestingLevel
      // that any subsequent lines with the same indentation use
      () => currentColumn,
      // If `y` is some, then `y` could be a (less wide) hanging layout,
      // so we need to check `x` a bit more thoroughly to make sure we
      // do not miss a potentially better fitting `y`
      (i) => Math.min(i, currentColumn)
    )

    const go = (x: DocStream<A>, w: number): IO.IO<boolean> =>
      IO.gen(function* (_) {
        if (w < 0) return false
        switch (x._tag) {
          case "FailedStream":
            return false
          case "EmptyStream":
            return true
          case "CharStream":
            return yield* _(go(x.stream, w - 1))
          case "TextStream":
            return yield* _(go(x.stream, w - x.text.length))
          case "LineStream": {
            if (minNestingLevel > x.indentation) return true
            return yield* _(go(x.stream, x.indentation - lineWidth))
          }
          case "PushAnnotationStream":
            return yield* _(go(x.stream, w))
          case "PopAnnotationStream":
            return yield* _(go(x.stream, w))
        }
      })

    return IO.run(go(stream, availableWidth))
  }
}
/**
 * A layout algorithm with more look ahead than `layoutPretty`, which will introduce
 * line breaks into a document earlier if the content does not, or will not, fit onto
 * one line.
 *
 * ```typescript
 * import { flow, pipe } from '@effect-ts/core/Function'
 * import * as M from '@effect-ts/core/Identity'
 * import * as RA from '@effect-ts/core/Array'
 *
 * import type { Doc } from '@effect-ts/printer/Core/Doc'
 * import * as D from '@effect-ts/printer/Core/Doc'
 * import type { Layout, LayoutOptions } from '@effect-ts/printer/Core/Layout'
 * import * as L from '@effect-ts/printer/Core/Layout'
 * import type { PageWidth } from '@effect-ts/printer/Core/PageWidth'
 * import * as PW from '@effect-ts/printer/Core/PageWidth'
 * import * as R from '@effect-ts/printer/Core/Render'
 *
 * // Consider the following python-ish document:
 * const fun = <A>(doc: Doc<A>): Doc<A> =>
 *   D.hcat([
 *     pipe(
 *       D.hcat<A>([D.text('fun('), D.softLineBreak, doc]),
 *       D.hang(2)
 *     ),
 *     D.text(')')
 *   ])
 *
 * const funs = flow(fun, fun, fun, fun, fun)
 *
 * const doc: Doc<never> = funs(D.align(D.list(D.words('abcdef ghijklm'))))
 *
 * // The document will be rendered using the following pipeline, where the choice
 * // of layout algorithm has been left open:
 * const dashes: Doc<never> = D.text(pipe(RA.replicate(26 - 2, '-'), M.fold(M.string)))
 * const hr: Doc<never> = D.hcat([D.vbar, dashes, D.vbar])
 *
 * const pageWidth: PageWidth = PW.AvailablePerLine(26, 1)
 * const layoutOptions: LayoutOptions = L.LayoutOptions(pageWidth)
 *
 * const render = <A>(doc: Doc<A>) => (layoutAlgorithm: (doc: Doc<A>) => Layout<A>): string =>
 *   pipe(
 *     layoutOptions,
 *     layoutAlgorithm(
 *       D.vsep<A>([hr, doc, hr])
 *     ),
 *     R.renderS
 *   )
 *
 * // If rendered using `layoutPretty`, with a page width of `26` characters per line,
 * // all the calls to `fun` will fit into the first line. However, this exceeds the
 * // desired `26` character page width.
 * console.log(pipe(L.layoutPretty, render(doc)))
 * // |------------------------|
 * // fun(fun(fun(fun(fun(
 * //                   [ abcdef
 * //                   , ghijklm ])))))
 * // |------------------------|
 *
 * // The same document, rendered with `layoutSmart`, fits the layout contstraints:
 * console.log(pipe(L.layoutSmart, render(doc)))
 * // |------------------------|
 * // fun(
 * //   fun(
 * //     fun(
 * //       fun(
 * //         fun(
 * //           [ abcdef
 * //           , ghijklm ])))))
 * // |------------------------|
 *
 * // The key difference between `layoutPretty` and `layoutSmart` is that the
 * // latter will check the potential document until it encounters a line with the
 * // same indentation or less than the start of the document. Any line encountered
 * // earlier is assumed to belong to the same syntactic structure. In contrast,
 * // `layoutPretty` checks only the first line.
 *
 * // Consider for example the question of whether the `A`s fit into the document
 * // below:
 * // > 1 A
 * // > 2   A
 * // > 3  A
 * // > 4 B
 * // > 5   B
 *
 * // `layoutPretty` will check only the first line, ignoring whether the second line
 * // may already be too wide. In contrast, `layoutSmart` stops only once it reaches
 * // the fourth line 4, where the `B` has the same indentation as the first `A`.
 * ```
 */
export function smart_<A>(options: LayoutOptions, doc: Doc<A>): DocStream<A> {
  return PW.match_(options.pageWidth, {
    AvailablePerLine: (lineWidth, ribbonFraction) =>
      layoutWadlerLeijen(doc, fitsSmart(lineWidth, ribbonFraction), options),
    Unbounded: () => layoutUnbounded(doc)
  })
}

/**
 * @dataFirst smart_
 */
export function smart<A>(doc: Doc<A>): Layout<A> {
  return (options) => smart_(options, doc)
}

/**
 * A layout algorithm which will lay out a document without adding any
 * indentation and without preserving annotations.
 *
 * Since no pretty-printing is involved, this layout algorithm is ver fast. The
 * resulting output contains fewer characters than a pretty-printed version and
 * can be used for output that is read by other programs.
 *
 * ```typescript
 * import { pipe } from '@effect-ts/core/Function'
 *
 * import * as D from '@effect-ts/printer/Core/Doc'
 * import * as L from '@effect-ts/printer/Core/Layout'
 * import * as R from '@effect-ts/printer/Core/Render'
 *
 * const doc = pipe(
 *   D.vsep([
 *     D.text('lorem'),
 *     D.text('ipsum'),
 *     pipe(D.vsep([D.text('dolor'), D.text('sit')]), D.hang(4))
 *   ]),
 *   D.hang(4)
 * )
 *
 * console.log(R.render(doc))
 * // lorem
 * //     ipsum
 * //     dolor
 * //         sit
 *
 * console.log(pipe(doc, L.layoutCompact, R.renderS))
 * // lorem
 * // ipsum
 * // dolor
 * // sit
 * ```
 */
export function compact<A, B>(doc: Doc<A>): DocStream<B> {
  const go = (docs: Array<Doc<A>>, i: number): IO.IO<DocStream<B>> =>
    IO.gen(function* (_) {
      if (A.isNonEmpty(docs)) {
        const [x, ...rest] = docs
        switch (x._tag) {
          case "Fail":
            return DS.failed
          case "Empty":
            return yield* _(go(rest, i))
          case "Char": {
            const s = yield* _(go(rest, i + 1))
            return DS.char_(s, x.char)
          }
          case "Text": {
            const s = yield* _(go(rest, i + x.text.length))
            return DS.text_(s, x.text)
          }
          case "Line": {
            const s = yield* _(go(rest, 0))
            return DS.line_(s, 0)
          }
          case "FlatAlt":
            return yield* _(go(A.cons_(rest, x.left), i))
          case "Cat":
            return yield* _(go(A.cons_(A.cons_(rest, x.right), x.left), i))
          case "Nest":
            return yield* _(go(A.cons_(rest, x.doc), i))
          case "Union":
            return yield* _(go(A.cons_(rest, x.right), i))
          case "Column":
            return yield* _(go(A.cons_(rest, x.react(i)), i))
          case "WithPageWidth":
            return yield* _(go(A.cons_(rest, x.react(PW.unbounded)), i))
          case "Nesting":
            return yield* _(go(A.cons_(rest, x.react(0)), i))
          case "Annotated":
            return yield* _(go(A.cons_(rest, x.doc), i))
        }
      }
      return DS.empty
    })
  return IO.run(go(A.single(doc), 0))
}
