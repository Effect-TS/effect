import type { Array } from '@effect-ts/core/Array'
import * as A from '@effect-ts/core/Array'
import { absurd, constant, flow, not, pipe } from '@effect-ts/core/Function'
import type { Option } from '@effect-ts/core/Option'
import * as O from '@effect-ts/core/Option'
import * as Sy from '@effect-ts/core/Sync'
import type { XReader } from '@effect-ts/core/XPure/XReader'
import * as R from '@effect-ts/core/XPure/XReader'

import type { Doc } from './Doc'
import type { DocStream } from './DocStream'
import * as DS from './DocStream'
import type { PageWidth } from './PageWidth'
import * as PW from './PageWidth'

// -------------------------------------------------------------------------------------
// definition
// -------------------------------------------------------------------------------------

export interface Layout<A> extends XReader<LayoutOptions, DocStream<A>> {}

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
  readonly _tag: 'Nil'
}

export interface Cons<A> {
  readonly _tag: 'Cons'
  readonly indent: number
  readonly document: Doc<A>
  readonly pipeline: LayoutPipeline<A>
}

export interface UndoAnnotation<A> {
  readonly _tag: 'UndoAnnotation'
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
  _tag: 'Nil'
}

export const cons = <A>(
  indent: number,
  document: Doc<A>,
  pipeline: LayoutPipeline<A>
): LayoutPipeline<A> => ({
  _tag: 'Cons',
  indent,
  document,
  pipeline
})

export const undoAnnotation = <A>(
  pipeline: LayoutPipeline<A>
): LayoutPipeline<A> => ({
  _tag: 'UndoAnnotation',
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
  readonly Cons: (
    indent: number,
    document: Doc<A>,
    pipeline: LayoutPipeline<A>
  ) => R
  readonly UndoAnnotation: (pipeline: LayoutPipeline<A>) => R
}): ((pipeline: LayoutPipeline<A>) => R) => {
  const f = (x: LayoutPipeline<A>): R => {
    switch (x._tag) {
      case 'Nil':
        return patterns.Nil()
      case 'Cons':
        return patterns.Cons(x.indent, x.document, x.pipeline)
      case 'UndoAnnotation':
        return patterns.UndoAnnotation(x.pipeline)
      default:
        return absurd(x as never)
    }
  }
  return f
}

// -------------------------------------------------------------------------------------
// layout algorithms
// -------------------------------------------------------------------------------------

const initialIndentation = <A>(stream: DocStream<A>): Option<number> => {
  const go = (x: DocStream<A>): Sy.UIO<Option<number>> =>
    Sy.gen(function* (_) {
      switch (x._tag) {
        case 'LineStream':
          return O.some(x.indentation)
        case 'PushAnnotation':
          return yield* _(go(x.stream))
        case 'PopAnnotation':
          return yield* _(go(x.stream))
        default:
          return O.none
      }
    })
  return pipe(go(stream), Sy.run)
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
  const go = (nl: number, cc: number) => (x: LayoutPipeline<A>): Layout<A> =>
    R.gen(function* (_) {
      switch (x._tag) {
        case 'Nil':
          return DS.empty
        case 'Cons': {
          switch (x.document._tag) {
            case 'Fail':
              return DS.failed
            case 'Empty':
              return yield* _(pipe(x.pipeline, go(nl, cc)))
            case 'Char':
              return DS.char(
                x.document.char,
                yield* _(pipe(x.pipeline, go(nl, cc + 1)))
              )
            case 'Text':
              return DS.text(
                x.document.text,
                yield* _(pipe(x.pipeline, go(nl, cc + x.document.text.length)))
              )
            case 'Line': {
              const s = yield* _(pipe(x.pipeline, go(x.indent, x.indent)))
              const i = DS.isEmptyStream(s) || DS.isLineStream(s) ? 0 : x.indent
              return DS.line(i, s)
            }
            case 'FlatAlt': {
              const s = cons(x.indent, x.document.left, x.pipeline)
              return yield* _(pipe(s, go(nl, cc)))
            }
            case 'Cat': {
              const inner = cons(x.indent, x.document.right, x.pipeline)
              const outer = cons(x.indent, x.document.left, inner)
              return yield* _(pipe(outer, go(nl, cc)))
            }
            case 'Nest': {
              const i = x.indent + x.document.indent
              const s = cons(i, x.document.doc, x.pipeline)
              return yield* _(pipe(s, go(nl, cc)))
            }
            case 'Union': {
              const left = yield* _(
                pipe(cons(x.indent, x.document.left, x.pipeline), go(nl, cc))
              )
              const right = yield* _(
                pipe(cons(x.indent, x.document.right, x.pipeline), go(nl, cc))
              )
              return selectNicer(fits, nl, cc, left, right)
            }
            case 'Column': {
              const s = cons(x.indent, x.document.react(cc), x.pipeline)
              return yield* _(pipe(s, go(nl, cc)))
            }
            case 'WithPageWidth': {
              const pageWidth = yield* _(
                R.access((_: LayoutOptions) => _.pageWidth)
              )
              const s = cons(x.indent, x.document.react(pageWidth), x.pipeline)
              return yield* _(pipe(s, go(nl, cc)))
            }
            case 'Nesting': {
              const s = cons(x.indent, x.document.react(x.indent), x.pipeline)
              return yield* _(pipe(s, go(nl, cc)))
            }
            case 'Annotated': {
              const p = cons(
                x.indent,
                x.document.doc,
                undoAnnotation(x.pipeline)
              )
              const s = yield* _(pipe(p, go(nl, cc)))
              return DS.pushAnnotation(x.document.annotation, s)
            }
            default:
              return absurd(x.document)
          }
        }
        case 'UndoAnnotation':
          return DS.popAnnotation(yield* _(pipe(x.pipeline, go(nl, cc))))
        default:
          return absurd(x)
      }
    })
  return pipe(cons(0, doc, nil), go(0, 0))
}

const failsOnFirstLine = <A>(stream: DocStream<A>): boolean => {
  const go = (x: DocStream<A>): Sy.UIO<boolean> =>
    Sy.gen(function* (_) {
      switch (x._tag) {
        case 'Failed':
          return true
        case 'EmptyStream':
          return false
        case 'CharStream':
          return yield* _(go(x.stream))
        case 'TextStream':
          return yield* _(go(x.stream))
        case 'LineStream':
          return false
        case 'PushAnnotation':
          return yield* _(go(x.stream))
        case 'PopAnnotation':
          return yield* _(go(x.stream))
        default:
          return absurd(x)
      }
    })
  return pipe(go(stream), Sy.run)
}

/**
 * The `layoutUnbounded` layout algorithm will lay out a document an
 * `Unbounded` page width.
 */
export const layoutUnbounded: <A>(doc: Doc<A>) => DocStream<A> = flow(
  layoutWadlerLeijen(constant(not(failsOnFirstLine))),
  R.runEnv(layoutOptions(PW.unbounded))
)

const fitsPretty = (width: number) => <A>(stream: DocStream<A>): boolean => {
  const go = (w: number) => (x: DocStream<A>): Sy.UIO<boolean> =>
    Sy.gen(function* (_) {
      if (w < 0) return false
      switch (x._tag) {
        case 'Failed':
          return false
        case 'EmptyStream':
          return true
        case 'CharStream':
          return yield* _(pipe(x.stream, go(w - 1)))
        case 'TextStream':
          return yield* _(pipe(x.stream, go(w - x.text.length)))
        case 'LineStream':
          return true
        case 'PushAnnotation':
          return yield* _(pipe(x.stream, go(w)))
        case 'PopAnnotation':
          return yield* _(pipe(x.stream, go(w)))
        default:
          return absurd(x)
      }
    })
  return pipe(stream, go(width), Sy.run)
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
export const pretty = <A>(doc: Doc<A>): Layout<A> =>
  pipe(
    R.access((_: LayoutOptions) => _),
    R.map((_) =>
      pipe(
        _.pageWidth,
        PW.match({
          AvailablePerLine: (lw, rf) =>
            pipe(
              doc,
              layoutWadlerLeijen((nl, cc) =>
                fitsPretty(PW.remainingWidth(lw, rf, nl, cc))
              ),
              R.runEnv(_)
            ),
          Unbounded: () => pipe(doc, layoutUnbounded)
        })
      )
    )
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

  const go = (w: number) => (x: DocStream<A>): Sy.UIO<boolean> =>
    Sy.gen(function* (_) {
      if (w < 0) return false
      switch (x._tag) {
        case 'Failed':
          return false
        case 'EmptyStream':
          return true
        case 'CharStream':
          return yield* _(pipe(x.stream, go(w - 1)))
        case 'TextStream':
          return yield* _(pipe(x.stream, go(w - x.text.length)))
        case 'LineStream': {
          if (minNestingLevel > x.indentation) return true
          return yield* _(pipe(x.stream, go(x.indentation - lineWidth)))
        }
        case 'PushAnnotation':
          return yield* _(pipe(x.stream, go(w)))
        case 'PopAnnotation':
          return yield* _(pipe(x.stream, go(w)))
        default:
          return absurd(x)
      }
    })

  return pipe(stream, go(availableWidth), Sy.run)
}

/**
 * A layout algorithm with more look ahead than `layoutPretty`, which will introduce
 * line breaks into a document earlier if the content does not, or will not, fit onto
 * one line.
 *
 * ```typescript
 * import { flow, pipe } from 'fp-ts/function'
 * import * as M from 'fp-ts/Monoid'
 * import * as RA from 'fp-ts/ReadonlyArray'
 *
 * import type { Doc } from 'prettyprinter-ts/lib/Doc'
 * import * as D from 'prettyprinter-ts/lib/Doc'
 * import type { Layout, LayoutOptions } from 'prettyprinter-ts/lib/Layout'
 * import * as L from 'prettyprinter-ts/lib/Layout'
 * import type { PageWidth } from 'prettyprinter-ts/lib/PageWidth'
 * import * as PW from 'prettyprinter-ts/lib/PageWidth'
 * import * as R from 'prettyprinter-ts/lib/Render'
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
 * const dashes: Doc<never> = D.text(pipe(RA.replicate(26 - 2, '-'), M.fold(M.monoidString)))
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
export const smart = <A>(doc: Doc<A>): Layout<A> =>
  pipe(
    R.access((_: LayoutOptions) => _),
    R.map((_) =>
      pipe(
        _.pageWidth,
        PW.match({
          AvailablePerLine: (lw, rf) =>
            pipe(doc, layoutWadlerLeijen<A>(fitsSmart(lw, rf)), R.runEnv(_)),
          Unbounded: () => pipe(doc, layoutUnbounded)
        })
      )
    )
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
 * import { pipe } from 'fp-ts/function'
 *
 * import * as D from 'prettyprinter-ts/lib/Doc'
 * import * as L from 'prettyprinter-ts/lib/Layout'
 * import * as R from 'prettyprinter-ts/lib/Render'
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
  const go = (i: number) => (docs: Array<Doc<A>>): Sy.UIO<DocStream<B>> =>
    Sy.gen(function* (_) {
      if (A.isEmpty(docs)) return DS.empty
      const [x, ...rest] = docs
      switch (x._tag) {
        case 'Fail':
          return DS.failed
        case 'Empty':
          return yield* _(pipe(rest, go(i)))
        case 'Char': {
          const s = yield* _(pipe(rest, go(i + 1)))
          return DS.char(x.char, s)
        }
        case 'Text': {
          const s = yield* _(pipe(rest, go(i + x.text.length)))
          return DS.text(x.text, s)
        }
        case 'Line': {
          const s = yield* _(pipe(rest, go(0)))
          return DS.line(0, s)
        }
        case 'FlatAlt':
          return yield* _(pipe(rest, A.cons(x.left), go(i)))
        case 'Cat':
          return yield* _(pipe(rest, A.cons(x.right), A.cons(x.left), go(i)))
        case 'Nest':
          return yield* _(pipe(rest, A.cons(x.doc), go(i)))
        case 'Union':
          return yield* _(pipe(rest, A.cons(x.right), go(i)))
        case 'Column':
          return yield* _(pipe(rest, A.cons(x.react(i)), go(i)))
        case 'WithPageWidth':
          return yield* _(pipe(rest, A.cons(x.react(PW.unbounded)), go(i)))
        case 'Nesting':
          return yield* _(pipe(rest, A.cons(x.react(0)), go(i)))
        case 'Annotated':
          return yield* _(pipe(rest, A.cons(x.doc), go(i)))
        default:
          return absurd(x)
      }
    })
  return pipe(A.single(doc), go(0), Sy.run)
}
