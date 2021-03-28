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

function initialIndentationRec<A>(x: DocStream<A>): IO.IO<Option<number>> {
  return IO.gen(function* (_) {
    switch (x._tag) {
      case "LineStream":
        return O.some(x.indentation)
      case "PushAnnotationStream":
        return yield* _(initialIndentationRec(x.stream))
      case "PopAnnotationStream":
        return yield* _(initialIndentationRec(x.stream))
      default:
        return O.none
    }
  })
}

function initialIndentation<A>(stream: DocStream<A>): Option<number> {
  return IO.run(initialIndentationRec(stream))
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

function layoutWadlerLeijenRec<A>(
  nl: number,
  cc: number,
  x: LayoutPipeline<A>,
  fits: FittingPredicate<A>,
  options: LayoutOptions
): IO.IO<DocStream<A>> {
  return IO.gen(function* (_) {
    switch (x._tag) {
      case "Nil":
        return DS.empty
      case "Cons": {
        switch (x.document._tag) {
          case "Fail":
            return DS.failed
          case "Empty":
            return yield* _(layoutWadlerLeijenRec(nl, cc, x.pipeline, fits, options))
          case "Char":
            return DS.char_(
              yield* _(layoutWadlerLeijenRec(nl, cc + 1, x.pipeline, fits, options)),
              x.document.char
            )
          case "Text":
            return DS.text_(
              yield* _(
                layoutWadlerLeijenRec(
                  nl,
                  cc + x.document.text.length,
                  x.pipeline,
                  fits,
                  options
                )
              ),
              x.document.text
            )
          case "Line": {
            const s = yield* _(
              layoutWadlerLeijenRec(x.indent, x.indent, x.pipeline, fits, options)
            )
            const i = DS.isEmptyStream(s) || DS.isLineStream(s) ? 0 : x.indent
            return DS.line_(s, i)
          }
          case "FlatAlt": {
            const s = cons(x.indent, x.document.left, x.pipeline)
            return yield* _(layoutWadlerLeijenRec(nl, cc, s, fits, options))
          }
          case "Cat": {
            const inner = cons(x.indent, x.document.right, x.pipeline)
            const outer = cons(x.indent, x.document.left, inner)
            return yield* _(layoutWadlerLeijenRec(nl, cc, outer, fits, options))
          }
          case "Nest": {
            const i = x.indent + x.document.indent
            const s = cons(i, x.document.doc, x.pipeline)
            return yield* _(layoutWadlerLeijenRec(nl, cc, s, fits, options))
          }
          case "Union": {
            const left = yield* _(
              layoutWadlerLeijenRec(
                nl,
                cc,
                cons(x.indent, x.document.left, x.pipeline),
                fits,
                options
              )
            )
            const right = yield* _(
              layoutWadlerLeijenRec(
                nl,
                cc,
                cons(x.indent, x.document.right, x.pipeline),
                fits,
                options
              )
            )
            return selectNicer(fits, nl, cc, left, right)
          }
          case "Column": {
            const s = cons(x.indent, x.document.react(cc), x.pipeline)
            return yield* _(layoutWadlerLeijenRec(nl, cc, s, fits, options))
          }
          case "WithPageWidth": {
            const s = cons(x.indent, x.document.react(options.pageWidth), x.pipeline)
            return yield* _(layoutWadlerLeijenRec(nl, cc, s, fits, options))
          }
          case "Nesting": {
            const s = cons(x.indent, x.document.react(x.indent), x.pipeline)
            return yield* _(layoutWadlerLeijenRec(nl, cc, s, fits, options))
          }
          case "Annotated": {
            const p = cons(x.indent, x.document.doc, undoAnnotation(x.pipeline))
            const s = yield* _(layoutWadlerLeijenRec(nl, cc, p, fits, options))
            return DS.pushAnnotation_(s, x.document.annotation)
          }
        }
      }
      case "UndoAnnotation":
        return DS.popAnnotation(
          yield* _(layoutWadlerLeijenRec(nl, cc, x.pipeline, fits, options))
        )
    }
  })
}

function layoutWadlerLeijen<A>(
  doc: Doc<A>,
  fits: FittingPredicate<A>,
  options: LayoutOptions
): DocStream<A> {
  return IO.run(layoutWadlerLeijenRec(0, 0, cons(0, doc, nil), fits, options))
}

function failsOnFirstLineRec<A>(x: DocStream<A>): IO.IO<boolean> {
  return IO.gen(function* (_) {
    switch (x._tag) {
      case "FailedStream":
        return true
      case "EmptyStream":
        return false
      case "CharStream":
        return yield* _(failsOnFirstLineRec(x.stream))
      case "TextStream":
        return yield* _(failsOnFirstLineRec(x.stream))
      case "LineStream":
        return false
      case "PushAnnotationStream":
        return yield* _(failsOnFirstLineRec(x.stream))
      case "PopAnnotationStream":
        return yield* _(failsOnFirstLineRec(x.stream))
    }
  })
}

function failsOnFirstLine<A>(stream: DocStream<A>): boolean {
  return IO.run(failsOnFirstLineRec(stream))
}

/**
 * The `unbounded` layout algorithm will lay out a document an
 * `Unbounded` page width.
 */
export function unbounded<A>(doc: Doc<A>): DocStream<A> {
  return layoutWadlerLeijen<A>(
    doc,
    constant(not(failsOnFirstLine)),
    layoutOptions(PW.unbounded)
  )
}

function fitsPrettyRec<A>(x: DocStream<A>, w: number): IO.IO<boolean> {
  return IO.gen(function* (_) {
    if (w < 0) return false
    switch (x._tag) {
      case "FailedStream":
        return false
      case "EmptyStream":
        return true
      case "CharStream":
        return yield* _(fitsPrettyRec(x.stream, w - 1))
      case "TextStream":
        return yield* _(fitsPrettyRec(x.stream, w - x.text.length))
      case "LineStream":
        return true
      case "PushAnnotationStream":
        return yield* _(fitsPrettyRec(x.stream, w))
      case "PopAnnotationStream":
        return yield* _(fitsPrettyRec(x.stream, w))
    }
  })
}

function fitsPretty(width: number) {
  return <A>(stream: DocStream<A>): boolean => {
    return IO.run(fitsPrettyRec(stream, width))
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
  return PW.PageWidth.matchStrict({
    AvailablePerLine: ({ lineWidth, ribbonFraction }) =>
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
    Unbounded: () => unbounded(doc)
  })(options.pageWidth)
}

/**
 * @dataFirst pretty_
 */
export function pretty<A>(doc: Doc<A>): Layout<A> {
  return (options) => pretty_(options, doc)
}

function fitsSmartRec<A>(
  x: DocStream<A>,
  w: number,
  minNestingLevel: number,
  lineWidth: number
): IO.IO<boolean> {
  return IO.gen(function* (_) {
    if (w < 0) return false
    switch (x._tag) {
      case "FailedStream":
        return false
      case "EmptyStream":
        return true
      case "CharStream":
        return yield* _(fitsSmartRec(x.stream, w - 1, minNestingLevel, lineWidth))
      case "TextStream":
        return yield* _(
          fitsSmartRec(x.stream, w - x.text.length, minNestingLevel, lineWidth)
        )
      case "LineStream": {
        if (minNestingLevel > x.indentation) return true
        return yield* _(
          fitsSmartRec(x.stream, x.indentation - lineWidth, minNestingLevel, lineWidth)
        )
      }
      case "PushAnnotationStream":
        return yield* _(fitsSmartRec(x.stream, w, minNestingLevel, lineWidth))
      case "PopAnnotationStream":
        return yield* _(fitsSmartRec(x.stream, w, minNestingLevel, lineWidth))
    }
  })
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

    return IO.run(fitsSmartRec(stream, availableWidth, minNestingLevel, lineWidth))
  }
}
/**
 * A layout algorithm with more look ahead than `layoutPretty`, which will introduce
 * line breaks into a document earlier if the content does not, or will not, fit onto
 * one line.
 *
 * ```typescript
 * import * as A from "@effect-ts/core/Array"
 * import { flow, pipe } from "@effect-ts/core/Function"
 * import * as I from "@effect-ts/core/Identity"
 * import type { Doc } from "@effect-ts/printer/Core/Doc"
 * import * as D from "@effect-ts/printer/Core/Doc"
 * import type { Layout, LayoutOptions } from "@effect-ts/printer/Core/Layout"
 * import * as L from "@effect-ts/printer/Core/Layout"
 * import type { PageWidth } from "@effect-ts/printer/Core/PageWidth"
 * import * as PW from "@effect-ts/printer/Core/PageWidth"
 * import * as R from "@effect-ts/printer/Core/Render"
 *
 * // Consider the following python-ish document:
 * const fun = <A>(doc: Doc<A>): Doc<A> =>
 *   D.hcat([D.hang_(D.hcat([D.text("fun("), D.softLineBreak, doc]), 2), D.text(")")])
 *
 * const funs = flow(fun, fun, fun, fun, fun)
 *
 * const doc = funs(D.align(D.list(D.words("abcdef ghijklm"))))
 *
 * // The document will be rendered using the following pipeline, where the choice
 * // of layout algorithm has been left open:
 * const pageWidth: PageWidth = PW.availablePerLine(26, 1)
 * const layoutOptions: LayoutOptions = L.layoutOptions(pageWidth)
 * const dashes = D.text(pipe(A.replicate_(26 - 2, "-"), I.fold(I.string)))
 * const hr = D.hcat([D.vbar, dashes, D.vbar])
 *
 * const render = <A>(doc: Doc<A>) => (
 *   layoutAlgorithm: (doc: Doc<A>) => Layout<A>
 * ): string => pipe(layoutOptions, layoutAlgorithm(D.vsep([hr, doc, hr])), R.render)
 *
 * // If rendered using `Layout.pretty`, with a page width of `26` characters per line,
 * // all the calls to `fun` will fit into the first line. However, this exceeds the
 * // desired `26` character page width.
 * console.log(pipe(L.pretty, render(doc)))
 * // |------------------------|
 * // fun(fun(fun(fun(fun(
 * //                   [ abcdef
 * //                   , ghijklm ])))))
 * // |------------------------|
 *
 * // The same document, rendered with `Layout.smart`, fits the layout contstraints:
 * console.log(pipe(L.smart, render(doc)))
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
 * // The key difference between `Layout.pretty` and `Layout.smart` is that the
 * // latter will check the potential document until it encounters a line with the
 * // same indentation or less than the start of the document. Any line encountered
 * // earlier is assumed to belong to the same syntactic structure. In contrast,
 * // `Layout.pretty` checks only the first line.
 *
 * // Consider for example the question of whether the `A`s fit into the document
 * // below:
 * // > 1 A
 * // > 2   A
 * // > 3  A
 * // > 4 B
 * // > 5   B
 *
 * // `Layout.pretty` will check only the first line, ignoring whether the second line
 * // may already be too wide. In contrast, `Layout.smart` stops only once it reaches
 * // the fourth line 4, where the `B` has the same indentation as the first `A`.
 * ```
 */
export function smart_<A>(options: LayoutOptions, doc: Doc<A>): DocStream<A> {
  return PW.PageWidth.matchStrict({
    AvailablePerLine: ({ lineWidth, ribbonFraction }) =>
      layoutWadlerLeijen(doc, fitsSmart(lineWidth, ribbonFraction), options),
    Unbounded: () => unbounded(doc)
  })(options.pageWidth)
}

/**
 * @dataFirst smart_
 */
export function smart<A>(doc: Doc<A>): Layout<A> {
  return (options) => smart_(options, doc)
}

function compactRec<A>(docs: Array<Doc<A>>, i: number): IO.IO<DocStream<A>> {
  return IO.gen(function* (_) {
    if (A.isNonEmpty(docs)) {
      const [x, ...rest] = docs
      switch (x._tag) {
        case "Fail":
          return DS.failed
        case "Empty":
          return yield* _(compactRec(rest, i))
        case "Char": {
          const s = yield* _(compactRec(rest, i + 1))
          return DS.char_(s, x.char)
        }
        case "Text": {
          const s = yield* _(compactRec(rest, i + x.text.length))
          return DS.text_(s, x.text)
        }
        case "Line": {
          const s = yield* _(compactRec(rest, 0))
          return DS.line_(s, 0)
        }
        case "FlatAlt":
          return yield* _(compactRec(A.cons_(rest, x.left), i))
        case "Cat":
          return yield* _(compactRec(A.cons_(A.cons_(rest, x.right), x.left), i))
        case "Nest":
          return yield* _(compactRec(A.cons_(rest, x.doc), i))
        case "Union":
          return yield* _(compactRec(A.cons_(rest, x.right), i))
        case "Column":
          return yield* _(compactRec(A.cons_(rest, x.react(i)), i))
        case "WithPageWidth":
          return yield* _(compactRec(A.cons_(rest, x.react(PW.unbounded)), i))
        case "Nesting":
          return yield* _(compactRec(A.cons_(rest, x.react(0)), i))
        case "Annotated":
          return yield* _(compactRec(A.cons_(rest, x.doc), i))
      }
    }
    return DS.empty
  })
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
 * import { pipe } from "@effect-ts/core/Function"
 * import * as D from "@effect-ts/printer/Core/Doc"
 * import * as R from "@effect-ts/printer/Core/Render"
 *
 * const doc = pipe(
 *   D.vsep([
 *     D.text("lorem"),
 *     D.text("ipsum"),
 *     D.hang_(D.vsep([D.text("dolor"), D.text("sit")]), 4)
 *   ]),
 *   D.hang(4)
 * )
 *
 * console.log(R.renderPrettyDefault(doc))
 * // lorem
 * //     ipsum
 * //     dolor
 * //         sit
 *
 * console.log(R.renderCompact(doc))
 * // lorem
 * // ipsum
 * // dolor
 * // sit
 * ```
 */
export function compact<A>(doc: Doc<A>): DocStream<A> {
  return IO.run(compactRec(A.single(doc), 0))
}
