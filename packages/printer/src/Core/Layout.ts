// tracing: off

import type { Array } from "@effect-ts/core/Array"
import * as A from "@effect-ts/core/Array"
import { constant, not, pipe } from "@effect-ts/core/Function"
import * as IO from "@effect-ts/core/IO"
import type { Option } from "@effect-ts/core/Option"
import * as O from "@effect-ts/core/Option"

import type { Doc } from "./Doc"
import type { DocStream } from "./DocStream"
import * as DS from "./DocStream"
import type { PageWidth } from "./PageWidth"
import * as PW from "./PageWidth"

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

export const cons = <A>(
  indent: number,
  document: Doc<A>,
  pipeline: LayoutPipeline<A>
): LayoutPipeline<A> => ({
  _tag: "Cons",
  indent,
  document,
  pipeline
})

export const undoAnnotation = <A>(pipeline: LayoutPipeline<A>): LayoutPipeline<A> => ({
  _tag: "UndoAnnotation",
  pipeline
})

export const layoutOptions = (pageWidth: PageWidth): LayoutOptions => ({
  pageWidth
})

/**
 * The default layout options, which are suitable when you want to obtain output
 * but do not care about the details.
 */
export const defaultLayoutOptions = layoutOptions(PW.defaultPageWidth)

// -------------------------------------------------------------------------------------
// destructors
// -------------------------------------------------------------------------------------

export const match = <A, R>(patterns: {
  readonly Nil: () => R
  readonly Cons: (indent: number, document: Doc<A>, pipeline: LayoutPipeline<A>) => R
  readonly UndoAnnotation: (pipeline: LayoutPipeline<A>) => R
}): ((pipeline: LayoutPipeline<A>) => R) => {
  const f = (x: LayoutPipeline<A>): R => {
    switch (x._tag) {
      case "Nil":
        return patterns.Nil()
      case "Cons":
        return patterns.Cons(x.indent, x.document, x.pipeline)
      case "UndoAnnotation":
        return patterns.UndoAnnotation(x.pipeline)
    }
  }
  return f
}

// -------------------------------------------------------------------------------------
// layout algorithms
// -------------------------------------------------------------------------------------

const initialIndentation = <A>(stream: DocStream<A>): Option<number> => {
  const go = (x: DocStream<A>): IO.IO<Option<number>> =>
    IO.gen(function* (_) {
      switch (x._tag) {
        case "LineStream":
          return O.some(x.indentation)
        case "PushAnnotation":
          return yield* _(go(x.stream))
        case "PopAnnotation":
          return yield* _(go(x.stream))
        default:
          return O.none
      }
    })
  return IO.run(go(stream))
}

const selectNicer = <A>(
  fits: FittingPredicate<A>,
  lineIndent: number,
  currentColumn: number,
  x: DocStream<A>,
  y: DocStream<A>
): DocStream<A> =>
  pipe(x, fits(lineIndent, currentColumn, initialIndentation(y))) ? x : y

const layoutWadlerLeijen = <A>(fits: FittingPredicate<A>) => (
  doc: Doc<A>
): Layout<A> => {
  const go = (nl: number, cc: number, opts: LayoutOptions) => (
    x: LayoutPipeline<A>
  ): IO.IO<DocStream<A>> =>
    IO.gen(function* (_) {
      switch (x._tag) {
        case "Nil":
          return DS.empty
        case "Cons": {
          switch (x.document._tag) {
            case "Fail":
              return DS.failed
            case "Empty":
              return yield* _(pipe(x.pipeline, go(nl, cc, opts)))
            case "Char":
              return DS.char(
                x.document.char,
                yield* _(pipe(x.pipeline, go(nl, cc + 1, opts)))
              )
            case "Text":
              return DS.text(
                x.document.text,
                yield* _(pipe(x.pipeline, go(nl, cc + x.document.text.length, opts)))
              )
            case "Line": {
              const s = yield* _(pipe(x.pipeline, go(x.indent, x.indent, opts)))
              const i = DS.isEmptyStream(s) || DS.isLineStream(s) ? 0 : x.indent
              return DS.line(i, s)
            }
            case "FlatAlt": {
              const s = cons(x.indent, x.document.left, x.pipeline)
              return yield* _(pipe(s, go(nl, cc, opts)))
            }
            case "Cat": {
              const inner = cons(x.indent, x.document.right, x.pipeline)
              const outer = cons(x.indent, x.document.left, inner)
              return yield* _(pipe(outer, go(nl, cc, opts)))
            }
            case "Nest": {
              const i = x.indent + x.document.indent
              const s = cons(i, x.document.doc, x.pipeline)
              return yield* _(pipe(s, go(nl, cc, opts)))
            }
            case "Union": {
              const left = yield* _(
                pipe(cons(x.indent, x.document.left, x.pipeline), go(nl, cc, opts))
              )
              const right = yield* _(
                pipe(cons(x.indent, x.document.right, x.pipeline), go(nl, cc, opts))
              )
              return selectNicer(fits, nl, cc, left, right)
            }
            case "Column": {
              const s = cons(x.indent, x.document.react(cc), x.pipeline)
              return yield* _(pipe(s, go(nl, cc, opts)))
            }
            case "WithPageWidth": {
              const s = cons(x.indent, x.document.react(opts.pageWidth), x.pipeline)
              return yield* _(pipe(s, go(nl, cc, opts)))
            }
            case "Nesting": {
              const s = cons(x.indent, x.document.react(x.indent), x.pipeline)
              return yield* _(pipe(s, go(nl, cc, opts)))
            }
            case "Annotated": {
              const p = cons(x.indent, x.document.doc, undoAnnotation(x.pipeline))
              const s = yield* _(pipe(p, go(nl, cc, opts)))
              return DS.pushAnnotation(x.document.annotation, s)
            }
          }
        }
        case "UndoAnnotation":
          return DS.popAnnotation(yield* _(pipe(x.pipeline, go(nl, cc, opts))))
      }
    })
  return (opts) => IO.run(go(0, 0, opts)(cons(0, doc, nil)))
}

const failsOnFirstLine = <A>(stream: DocStream<A>): boolean => {
  const go = (x: DocStream<A>): IO.IO<boolean> =>
    IO.gen(function* (_) {
      switch (x._tag) {
        case "Failed":
          return true
        case "EmptyStream":
          return false
        case "CharStream":
          return yield* _(go(x.stream))
        case "TextStream":
          return yield* _(go(x.stream))
        case "LineStream":
          return false
        case "PushAnnotation":
          return yield* _(go(x.stream))
        case "PopAnnotation":
          return yield* _(go(x.stream))
      }
    })
  return IO.run(go(stream))
}

/**
 * The `layoutUnbounded` layout algorithm will lay out a document an
 * `Unbounded` page width.
 */
export const layoutUnbounded = <A>(doc: Doc<A>): DocStream<A> =>
  layoutWadlerLeijen<A>(constant(not(failsOnFirstLine)))(doc)(
    layoutOptions(PW.unbounded)
  )

const fitsPretty = (width: number) => <A>(stream: DocStream<A>): boolean => {
  const go = (w: number) => (x: DocStream<A>): IO.IO<boolean> =>
    IO.gen(function* (_) {
      if (w < 0) return false
      switch (x._tag) {
        case "Failed":
          return false
        case "EmptyStream":
          return true
        case "CharStream":
          return yield* _(pipe(x.stream, go(w - 1)))
        case "TextStream":
          return yield* _(pipe(x.stream, go(w - x.text.length)))
        case "LineStream":
          return true
        case "PushAnnotation":
          return yield* _(pipe(x.stream, go(w)))
        case "PopAnnotation":
          return yield* _(pipe(x.stream, go(w)))
      }
    })
  return pipe(stream, go(width), IO.run)
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
export const pretty = <A>(doc: Doc<A>): Layout<A> => (_) =>
  pipe(
    _.pageWidth,
    PW.match({
      AvailablePerLine: (lw, rf) =>
        layoutWadlerLeijen((nl, cc) => fitsPretty(PW.remainingWidth(lw, rf, nl, cc)))(
          doc
        )(_),
      Unbounded: () => layoutUnbounded(doc)
    })
  )

const fitsSmart = (lineWidth: number, ribbonFraction: number) => (
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

  const minNestingLevel = pipe(
    initialIndentY,
    O.fold(
      // y is definitely not a hanging layout - let's check x with
      // the same minNestingLevel that any subsequent lines with
      // the same indentation use
      () => currentColumn,
      // y could be a (less wide) hanging layout - let's check x a
      // bit more thoroughly to make sure we do not miss a potentially
      // better fitting y
      (i) => Math.min(i, currentColumn)
    )
  )

  const go = (w: number) => (x: DocStream<A>): IO.IO<boolean> =>
    IO.gen(function* (_) {
      if (w < 0) return false
      switch (x._tag) {
        case "Failed":
          return false
        case "EmptyStream":
          return true
        case "CharStream":
          return yield* _(pipe(x.stream, go(w - 1)))
        case "TextStream":
          return yield* _(pipe(x.stream, go(w - x.text.length)))
        case "LineStream": {
          if (minNestingLevel > x.indentation) return true
          return yield* _(pipe(x.stream, go(x.indentation - lineWidth)))
        }
        case "PushAnnotation":
          return yield* _(pipe(x.stream, go(w)))
        case "PopAnnotation":
          return yield* _(pipe(x.stream, go(w)))
      }
    })

  return pipe(stream, go(availableWidth), IO.run)
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
export const smart = <A>(doc: Doc<A>): Layout<A> => (_) =>
  pipe(
    _.pageWidth,
    PW.match({
      AvailablePerLine: (lw, rf) => layoutWadlerLeijen<A>(fitsSmart(lw, rf))(doc)(_),
      Unbounded: () => pipe(doc, layoutUnbounded)
    })
  )

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
export const compact = <A, B>(doc: Doc<A>): DocStream<B> => {
  const go = (i: number) => (docs: Array<Doc<A>>): IO.IO<DocStream<B>> =>
    IO.gen(function* (_) {
      if (A.isNonEmpty(docs)) {
        const [x, ...rest] = docs
        switch (x._tag) {
          case "Fail":
            return DS.failed
          case "Empty":
            return yield* _(go(i)(rest))
          case "Char": {
            const s = yield* _(go(i + 1)(rest))
            return DS.char(x.char, s)
          }
          case "Text": {
            const s = yield* _(go(i + x.text.length)(rest))
            return DS.text(x.text, s)
          }
          case "Line": {
            const s = yield* _(go(0)(rest))
            return DS.line(0, s)
          }
          case "FlatAlt":
            return yield* _(go(i)(A.cons_(rest, x.left)))
          case "Cat":
            return yield* _(go(i)(A.cons_(A.cons_(rest, x.right), x.left)))
          case "Nest":
            return yield* _(go(i)(A.cons_(rest, x.doc)))
          case "Union":
            return yield* _(go(i)(A.cons_(rest, x.right)))
          case "Column":
            return yield* _(go(i)(A.cons_(rest, x.react(i))))
          case "WithPageWidth":
            return yield* _(go(i)(A.cons_(rest, x.react(PW.unbounded))))
          case "Nesting":
            return yield* _(go(i)(A.cons_(rest, x.react(0))))
          case "Annotated":
            return yield* _(go(i)(A.cons_(rest, x.doc)))
        }
      }
      return DS.empty
    })
  return IO.run(go(0)(A.single(doc)))
}
