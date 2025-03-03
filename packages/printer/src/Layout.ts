/**
 * @since 1.0.0
 */

import type { LazyArg } from "effect/Function"
import type { Doc } from "./Doc.js"
import type { DocStream } from "./DocStream.js"
import * as internal from "./internal/layout.js"
import { defaultPageWidth } from "./PageWidth.js"
import type { PageWidth } from "./PageWidth.js"

// -----------------------------------------------------------------------------
// Models
// -----------------------------------------------------------------------------

/**
 * @since 1.0.0
 * @category model
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
   * @since 1.0.0
   * @category model
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
   * @since 1.0.0
   * @category model
   */
  export interface FittingPredicate<A> {
    (
      stream: DocStream<A>,
      indentation: number,
      currentColumn: number,
      comparator: LazyArg<DocStream<A>>
    ): boolean
  }
}

/**
 * @since 1.0.0
 * @category constructors
 */
export const options: (pageWidth: PageWidth) => Layout.Options = internal.options

/**
 * The default layout options, which are suitable when you want to obtain output
 * but do not care about the details.
 *
 * @since 1.0.0
 * @category constructors
 */
export const defaultOptions: Layout.Options = options(defaultPageWidth)

// -----------------------------------------------------------------------------
// Layout Algorithms
// -----------------------------------------------------------------------------

/**
 * @since 1.0.0
 * @category layout algorithms
 */
export const wadlerLeijen: {
  <A>(fits: Layout.FittingPredicate<A>, options: Layout.Options): (self: Doc<A>) => DocStream<A>
  <A>(self: Doc<A>, fits: Layout.FittingPredicate<A>, options: Layout.Options): DocStream<A>
} = internal.wadlerLeijen

/**
 * A layout algorithm which will lay out a document without adding any
 * indentation and without preserving annotations.
 *
 * Since no pretty-printing is involved, this layout algorithm is very fast. The
 * resulting output contains fewer characters than a pretty-printed version and
 * can be used for output that is read by other programs.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import * as Doc from "@effect/printer/Doc"
 * import { pipe } from "effect/Function"
 * import * as String from "effect/String"
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
 *   Doc.render(doc, { style: "pretty" }),
 *   String.stripMargin(
 *     `|lorem
 *      |    ipsum
 *      |    dolor
 *      |        sit`
 *   )
 * )
 *
 * assert.strictEqual(
 *   Doc.render(doc, { style: "compact" }),
 *   String.stripMargin(
 *     `|lorem
 *      |ipsum
 *      |dolor
 *      |sit`
 *   )
 * )
 * ```
 *
 * @since 1.0.0
 * @category layout algorithms
 */
export const compact: <A>(self: Doc<A>) => DocStream<A> = internal.compact

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
 * @since 1.0.0
 * @category layout algorithms
 */
export const pretty: {
  (options: Layout.Options): <A>(self: Doc<A>) => DocStream<A>
  <A>(self: Doc<A>, options: Layout.Options): DocStream<A>
} = internal.pretty

/**
 * A layout algorithm with more look ahead than `pretty`, which will introduce
 * line breaks into a document earlier if the content does not, or will not, fit
 * onto one line.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import * as Doc from "@effect/printer/Doc"
 * import type * as DocStream from "@effect/printer/DocStream"
 * import * as Layout from "@effect/printer/Layout"
 * import * as PageWidth from "@effect/printer/PageWidth"
 * import { pipe } from "effect/Function"
 * import * as String from "effect/String"
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
 * const funs = <A>(doc: Doc.Doc<A>): Doc.Doc<A> =>
 *   pipe(doc, fun, fun, fun, fun, fun)
 *
 * const doc = funs(Doc.align(Doc.list(Doc.words("abcdef ghijklm"))))
 *
 * // The document will be rendered using the following pipeline, where the choice
 * // of layout algorithm has been left open:
 * const pageWidth = PageWidth.availablePerLine(26, 1)
 * const layoutOptions = Layout.options(pageWidth)
 * const dashes = Doc.text(Array.from({ length: 26 - 2 }, () => "-").join(""))
 * const hr = Doc.hcat([Doc.vbar, dashes, Doc.vbar])
 *
 * const render = <A>(
 *   doc: Doc.Doc<A>
 * ) =>
 *   (
 *     layoutAlgorithm: (options: Layout.Layout.Options) => (doc: Doc.Doc<A>) => DocStream.DocStream<A>
 *   ): string => pipe(Doc.vsep([hr, doc, hr]), layoutAlgorithm(layoutOptions), Doc.renderStream)
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
 * ```
 *
 * @since 1.0.0
 * @category layout algorithms
 */
export const smart: {
  (options: Layout.Options): <A>(self: Doc<A>) => DocStream<A>
  <A>(self: Doc<A>, options: Layout.Options): DocStream<A>
} = internal.smart

/**
 * The `unbounded` layout algorithm will lay out a document an `Unbounded`
 * page width.
 *
 * @since 1.0.0
 * @category layout algorithms
 */
export const unbounded: <A>(self: Doc<A>) => DocStream<A> = internal.unbounded
