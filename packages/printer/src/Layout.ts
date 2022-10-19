/**
 * @since 1.0.0
 */

import * as L from "@effect/printer/internal/Layout"
import type { Option } from "@fp-ts/data/Option"
import type { Predicate } from "@fp-ts/data/Predicate"

// -----------------------------------------------------------------------------
// Models
// -----------------------------------------------------------------------------

/**
 * @category model
 * @since 1.0.0
 * @tsplus type effect/printer/Layout
 */
export interface Layout<A> {
  (options: Layout.Options): DocStream<A>
}

/**
 * @since 1.0.0
 */
export declare namespace Layout {
  /**
   * Represents the options that will influence the layout algorithms.
   *
   * @category model
   * @since 1.0.0
   * @tsplus type effect/printer/Layout.Options
   */
  export interface Options {
    readonly pageWidth: PageWidth
  }

  /**
   * Decides whether a `DocStream` fits the given constraints, namely:
   * - original indentation of the current column
   * - initial indentation of the alternative `DocStream` if it starts with
   *   a line break (used by `layoutSmart`)
   * - width in which to fit the first line
   *
   * @category model
   * @since 1.0.0
   */
  export type FittingPredicate<A> = (
    lineIndent: number,
    currentColumn: number,
    initialIndentY: Option<number>
  ) => Predicate<DocStream<A>>
}

/**
 * @category model
 * @since 1.0.0
 * @tsplus type effect/printer/Layout.Ops
 */
export interface LayoutOps {
  readonly $: LayoutAspects
  readonly Options: LayoutOptionsOps
}

/**
 * @category model
 * @since 1.0.0
 * @tsplus type effect/printer/Layout.Options.Ops
 */
export interface LayoutOptionsOps {
  (pageWidth: PageWidth): Layout.Options
}
/**
 * @category constructors
 * @since 1.0.0
 * @tsplus static effect/printer/Layout.Ops Options
 */
export const LayoutOptions: LayoutOptionsOps = (pageWidth) => ({ pageWidth })

/**
 * @category instances
 * @since 1.0.0
 */
export const Layout: LayoutOps = {
  $: {},
  Options: LayoutOptions
}

/**
 * @category model
 * @since 1.0.0
 * @tsplus type effect/printer/Layout.Aspects
 */
export interface LayoutAspects {}

/**
 * The default layout options, which are suitable when you want to obtain output
 * but do not care about the details.
 *
 * @category constructors
 * @since 1.0.0
 * @tsplus static effect/printer/Layout.Options.Ops default
 */
export const defaultLayoutOptions = LayoutOptions(PageWidth.default)

// -----------------------------------------------------------------------------
// Layout Algorithms
// -----------------------------------------------------------------------------

/**
 * @category layout algorithms
 * @since 1.0.0
 * @tsplus static effect/printer/Doc.Aspects layoutWadlerLeijen
 * @tsplus pipeable effect/printer/Doc layoutWadlerLeijen
 */
export const wadlerLeijen: <A>(
  fits: Layout.FittingPredicate<A>,
  options: Layout.Options
) => (self: Doc<A>) => DocStream<A> = L.wadlerLeijen

/**
 * A layout algorithm which will lay out a document without adding any
 * indentation and without preserving annotations.
 *
 * Since no pretty-printing is involved, this layout algorithm is very fast. The
 * resulting output contains fewer characters than a pretty-printed version and
 * can be used for output that is read by other programs.
 *
 * @example
 * import * as Doc from "@effect/printer/Doc"
 * import * as Render from "@effect/printer/Render"
 * import { pipe } from "@fp-ts/data/Function"
 * import * as String from "@fp-ts/data/String"
 *
 * const doc = pipe(
 *   Doc.vsep([
 *     Doc.text("lorem"),
 *     Doc.text("ipsum"),
 *     pipe(
 *       Doc.vsep([Doc.text("dolor"), Doc.text("sit")]),
 *       Doc.hang(4)
 *     )
 *   ]),
 *   Doc.hang(4)
 * )
 *
 * assert.strictEqual(
 *   Render.prettyDefault(doc),
 *   String.stripMargin(
 *     `|lorem
 *      |    ipsum
 *      |    dolor
 *      |        sit`
 *   )
 * )
 *
 * assert.strictEqual(
 *   Render.compact(doc),
 *   String.stripMargin(
 *     `|lorem
 *      |ipsum
 *      |dolor
 *      |sit`
 *   )
 * )
 *
 * @category layout algorithms
 * @since 1.0.0
 * @tsplus static effect/printer/Doc.Ops layoutCompact
 * @tsplus getter effect/printer/Doc layoutCompact
 */
export const compact: <A>(self: Doc<A>) => DocStream<A> = L.compact

/**
 * The `pretty` layout algorithm is the default algorithm for rendering
 * documents.
 *
 * `pretty` commits to rendering something in a certain way if the next
 * element fits the layout constrants. In other words, it has one `DocStream`
 * element lookahead when rendering.
 *
 * Consider using the smarter, but slightly less performant `smart`
 * algorithm if the results seem to run off to the right before having lots of
 * line breaks.
 *
 * @tsplus static effect/printer/Doc.Aspects layoutPretty
 * @tsplus pipeable effect/printer/Doc layoutPretty
 */
export const pretty: (
  options: Layout.Options
) => <A>(self: Doc<A>) => DocStream<A> = L.pretty

/**
 * A layout algorithm with more look ahead than `pretty`, which will introduce
 * line breaks into a document earlier if the content does not, or will not, fit
 * onto one line.
 *
 * @example
 * import * as Doc from "@effect/printer/Doc"
 * import type * as DocStream from "@effect/printer/DocStream"
 * import * as Layout from "@effect/printer/Layout"
 * import * as PageWidth from "@effect/printer/PageWidth"
 * import * as Render from "@effect/printer/Render"
 * import { flow, pipe } from "@fp-ts/data/Function"
 * import * as String from "@fp-ts/data/String"
 *
 * // Consider the following python-ish document:
 * const fun = <A>(doc: Doc.Doc<A>): Doc.Doc<A> =>
 *   Doc.hcat([
 *     pipe(
 *       Doc.hcat([Doc.text("fun("), Doc.softLineBreak, doc]),
 *       Doc.hang(2)
 *     ),
 *     Doc.text(")")
 *   ])
 *
 * const funs = flow(fun, fun, fun, fun, fun)
 *
 * const doc = funs(Doc.align(Doc.list(Doc.words("abcdef ghijklm"))))
 *
 * // The document will be rendered using the following pipeline, where the choice
 * // of layout algorithm has been left open:
 * const pageWidth = PageWidth.availablePerLine(26, 1)
 * const layoutOptions = Layout.LayoutOptions(pageWidth)
 * const dashes = Doc.text(Array.from({ length: 26 - 2 }, () => "-").join(""))
 * const hr = Doc.hcat([Doc.vbar, dashes, Doc.vbar])
 *
 * const render = <A>(
 *   doc: Doc.Doc<A>
 * ) =>
 *   (
 *     layoutAlgorithm: (options: Layout.Layout.Options) => (doc: Doc.Doc<A>) => DocStream.DocStream<A>
 *   ): string => pipe(Doc.vsep([hr, doc, hr]), layoutAlgorithm(layoutOptions), Render.render)
 *
 * // If rendered using `Layout.pretty`, with a page width of `26` characters per line,
 * // all the calls to `fun` will fit into the first line. However, this exceeds the
 * // desired `26` character page width.
 * assert.strictEqual(
 *   render(doc)(Layout.pretty),
 *   String.stripMargin(
 *     `||------------------------|
 *      |fun(fun(fun(fun(fun(
 *      |                  [ abcdef
 *      |                  , ghijklm ])))))
 *      ||------------------------|`
 *   )
 * )
 *
 * // The same document, rendered with `Layout.smart`, fits the layout contstraints:
 * assert.strictEqual(
 *   render(doc)(Layout.smart),
 *   String.stripMargin(
 *     `||------------------------|
 *      |fun(
 *      |  fun(
 *      |    fun(
 *      |      fun(
 *      |        fun(
 *      |          [ abcdef
 *      |          , ghijklm ])))))
 *      ||------------------------|`
 *   )
 * )
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
 * // `pretty` will check only the first line, ignoring whether the second line
 * // may already be too wide. In contrast, `Layout.smart` stops only once it reaches
 * // the fourth line 4, where the `B` has the same indentation as the first `A`.
 *
 * @category layout algorithms
 * @since 1.0.0
 * @tsplus static effect/printer/Doc.Aspects layoutSmart
 * @tsplus pipeable effect/printer/Doc layoutSmart
 */
export const smart: (
  options: Layout.Options
) => <A>(self: Doc<A>) => DocStream<A> = L.smart

/**
 * The `unbounded` layout algorithm will lay out a document an `Unbounded`
 * page width.
 *
 * @category layout algorithms
 * @since 1.0.0
 * @tsplus static effect/printer/Doc.Ops layoutUnbounded
 * @tsplus getter effect/printer/Doc layoutUnbounded
 */
export const unbounded: <A>(self: Doc<A>) => DocStream<A> = L.unbounded
