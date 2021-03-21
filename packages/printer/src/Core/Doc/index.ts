// tracing: off

import type { Array } from "@effect-ts/core/Array"
import * as A from "@effect-ts/core/Array"
import type { Associative } from "@effect-ts/core/Associative"
import * as Assoc from "@effect-ts/core/Associative"
import { constant, identity } from "@effect-ts/core/Function"
import type { Identity } from "@effect-ts/core/Identity"
import * as Ident from "@effect-ts/core/Identity"
import * as IO from "@effect-ts/core/IO"
import type { URI } from "@effect-ts/core/Prelude"
import * as P from "@effect-ts/core/Prelude"
import type { _A } from "@effect-ts/system/Utils"

import type { Flatten } from "../Flatten"
import * as F from "../Flatten"
import type { PageWidth } from "../PageWidth"

// -------------------------------------------------------------------------------------
// definition
// -------------------------------------------------------------------------------------

/**
 * The abstract data type `Doc` represents prettified documents that
 * have been annotated with data of type `A`.
 *
 * More specifically, a value of type `Doc` represents a non-empty
 * set of possible layouts for a given document. The layout algorithms
 * select one of these possibilities, taking into account variables
 * such as the width of the document.
 *
 * The annotation is an arbitrary piece of data associated with (part
 * of) a document. Annotations may be used by rendering algorithms to
 * display documents differently by providing information such as:
 *
 * - color information (e.g., when rendering to the terminal)
 * - mouseover text (e.g., when rendering to rich HTML)
 * - whether to show something or not (to allow simple or detailed versions)
 */
export type Doc<A> =
  | Fail<A>
  | Empty<A>
  | Char<A>
  | Text<A>
  | Line<A>
  | FlatAlt<A>
  | Cat<A>
  | Nest<A>
  | Union<A>
  | Column<A>
  | WithPageWidth<A>
  | Nesting<A>
  | Annotated<A>

/**
 * Represents a document that cannot be rendered. Generally occurs when
 * flattening a line. The layout algorithms will reject this document
 * and choose a more suitable rendering.
 */
export class Fail<A> {
  readonly _tag = "Fail"
  readonly _A!: () => A
  constructor(readonly id: (_: never) => A) {}
}

/**
 * Represents the empty document. Conceptually, the unit of `Cat`.
 */
export class Empty<A> {
  readonly _tag = "Empty"
  readonly _A!: () => A
  constructor(readonly id: (_: never) => A) {}
}

/**
 * Represents a document containing a single character.
 *
 * **Invariants**
 * - Cannot be the newline (`"\n"`) character
 */
export class Char<A> {
  readonly _tag = "Char"
  readonly _A!: () => A
  constructor(readonly char: string, readonly id: (_: never) => A) {}
}

/**
 * Represents a document containing a string of text.
 *
 * **Invariants**
 * - Text cannot be less than two characters long
 * - Text cannot contain a newline (`"\n"`) character
 */
export class Text<A> {
  readonly _tag = "Text"
  readonly _A!: () => A
  constructor(readonly text: string, readonly id: (_: never) => A) {}
}

/**
 * Represents a document that contains a hard line break.
 */
export class Line<A> {
  readonly _tag = "Line"
  readonly _A!: () => A
  constructor(readonly id: (_: never) => A) {}
}

/**
 * Represents a flattened alternative of two documents. The
 * layout algorithms will choose the first document, but when
 * flattened (via `group`) the second document will be preferred.
 *
 * The layout algorithms operate under the assumption that the
 * first alternative is less wide than the flattened second
 * alternative.
 */
export class FlatAlt<A> {
  readonly _tag = "FlatAlt"
  readonly _A!: () => A
  constructor(readonly left: Doc<A>, readonly right: Doc<A>) {}
}

/**
 * Represents the concatenation of two documents.
 */
export class Cat<A> {
  readonly _tag = "Cat"
  readonly _A!: () => A
  constructor(readonly left: Doc<A>, readonly right: Doc<A>) {}
}

/**
 * Represents a document that is indented by a certain
 * number of columns.
 */
export class Nest<A> {
  readonly _tag = "Nest"
  readonly _A!: () => A
  constructor(readonly indent: number, readonly doc: Doc<A>) {}
}

/**
 * Represents the union of two documents. Used to implement
 * layout alternatives for `group`.
 *
 * **Invariants**
 * - The first lines of the first document should be longer
 * than the first lines of the second document so that the
 * layout algorithm can pick the document with the best fit
 */
export class Union<A> {
  readonly _tag = "Union"
  readonly _A!: () => A
  constructor(readonly left: Doc<A>, readonly right: Doc<A>) {}
}

/**
 * Represents a document that reacts to the current cursor
 * position.
 */
export class Column<A> {
  readonly _tag = "Column"
  readonly _A!: () => A
  constructor(readonly react: (position: number) => Doc<A>) {}
}

/**
 * Represents a document that reacts to the current page width.
 */
export class WithPageWidth<A> {
  readonly _tag = "WithPageWidth"
  readonly _A!: () => A
  constructor(readonly react: (pageWidth: PageWidth) => Doc<A>) {}
}

/**
 * Represents a document that reacts to the current nesting level.
 */
export class Nesting<A> {
  readonly _tag = "Nesting"
  readonly _A!: () => A
  constructor(readonly react: (level: number) => Doc<A>) {}
}

/**
 * Represents a document with an associated annotation.
 */
export class Annotated<A> {
  readonly _tag = "Annotated"
  readonly _A!: () => A
  constructor(readonly annotation: A, readonly doc: Doc<A>) {}
}

// -------------------------------------------------------------------------------------
// constructors
// -------------------------------------------------------------------------------------

const line_: Doc<never> = new Line(identity)

/**
 * The `fail` document is a document that cannot be rendered. Generally
 * occurs when flattening a line. The layout algorithms will reject this
 * document and choose a more suitable rendering.
 */
export const fail: Doc<never> = new Fail(identity)

/**
 * The `empty` document behaves like a document containing the empty string
 * (`""`), so it has a height of `1`.
 *
 * This may lead to surprising behavior if the empty document is expected
 * to bear no weight inside certain layout functions, such as`vcat`, where
 * it will render an empty line of output.
 *
 * ```typescript
 * import * as D from '@effect-ts/pretty/Doc'
 * import * as R from '@effect-ts/pretty/Render'
 *
 * const doc = D.vsep([
 *   D.text('hello'),
 *   D.parens(D.empty), // `parens` for visibility purposes only
 *   D.text('world')
 * ])
 *
 * console.log(R.render(doc))
 * // hello
 * // ()
 * // world
 * ```
 */
export const empty: Doc<never> = new Empty(identity)

/**
 * A document containing a single character.
 *
 * **Invariants**
 * - Cannot be the newline (`"\n"`) character
 */
export function char(char: string): Doc<never> {
  return new Char(char, identity)
}

/**
 * A document containing a string of text.
 *
 * **Invariants**
 * - Text cannot be less than two characters long
 * - Text cannot contain a newline (`"\n"`) character
 */
export function text(text: string): Doc<never> {
  return new Text(text, identity)
}

/**
 * A document containing a string of text.
 */
export function string(str: string): Doc<never> {
  return cats(
    str
      .split("\n")
      .map((s) => (s.length === 0 ? empty : s.length === 1 ? char(s) : text(s)))
  )
}

/**
 * The `flatAlt` document will render `left` by default. However, when
 * `group`ed, `y` will be preferred with `left` as the fallback for cases
 * where `y` does not fit onto the page.
 *
 * **NOTE:**
 * Users should be careful to ensure that `left` is less wide than `right`.
 * Otherwise, if `right` ends up not fitting the page, then the layout
 * algorithms will fall back to an even wider layout.
 *
 * ```typescript
 * import { pipe } from '@effect-ts/core/Function'
 *
 * import type { Doc } from '@effect-ts/printer/Core/Doc'
 * import * as D from '@effect-ts/printer/Core/Doc'
 * import * as R from '@effect-ts/printer/Core/Render'
 *
 * const open = D.flatAlt(D.empty, D.text('{ '))
 * const close = D.flatAlt(D.empty, D.text(' }'))
 * const separator = D.flatAlt(D.empty, D.text('; '))
 *
 * const prettyDo = <A>(xs: Array<Doc<A>>): Doc<A> =>
 *   D.group(D.hsep([D.text('do'), D.align(pipe(xs, D.encloseSep<A>(open, close, separator)))]))
 *
 * const statements = [
 *   D.text('name:_ <- getArgs'),
 *   D.text('let greet = "Hello, " <> name"'),
 *   D.text('putStrLn greet')
 * ]
 *
 * // If it fits, then the content is put onto a single line with the `{;}` style
 * console.log(pipe(prettyDo(statements), R.renderWidth(80)))
 * // do { name:_ <- getArgs; let greet = "Hello, " <> name"; putStrLn greet }
 *
 * // When there is not enough space, the content is broken up onto multiple lines
 * console.log(pipe(prettyDo(statements), R.renderWidth(10)))
 * // do name:_ <- getArgs
 * //    let greet = "Hello, " <> name"
 * //    putStrLn greet
 *```
 */
export function flatAlt_<A, B>(left: Doc<A>, right: Doc<B>): Doc<A | B> {
  return new FlatAlt<A | B>(left, right)
}

/**
 * @dataFirst flatAlt_
 */
export function flatAlt<B>(right: Doc<B>) {
  return <A>(left: Doc<A>): Doc<A | B> => new FlatAlt<A | B>(left, right)
}

export function union_<A, B>(left: Doc<A>, right: Doc<B>): Doc<A | B> {
  return new Union<A | B>(left, right)
}

/**
 * @dataFirst union_
 */
export function union<B>(right: Doc<B>) {
  return <A>(left: Doc<A>): Doc<A | B> => new Union<A | B>(left, right)
}

export function cat_<A, B>(left: Doc<A>, right: Doc<B>): Doc<A | B> {
  return new Cat<A | B>(left, right)
}

/**
 * @dataFirst cat_
 */
export function cat<B>(right: Doc<B>) {
  return <A>(left: Doc<A>): Doc<A | B> => new Cat<A | B>(left, right)
}

/**
 * The `line` document advances to the next line and indents to the
 * current nesting level. However, `line` will behave like `space`
 * if the line break is undone by `group`.
 *
 * ```typescript
 * import * as D from '@effect-ts/printer/Core/Doc'
 * import * as R from '@effect-ts/printer/Core/Render'
 *
 * const doc = D.hcat([
 *   D.text('lorem ipsum'),
 *   D.line,
 *   D.text('dolor sit amet')
 * ])
 *
 * console.log(R.render(doc))
 * // lorem ipsum
 * // dolor sit amet
 *
 * console.log(R.render(D.group(doc)))
 * // lorem ipsum dolor sit amet
 *```
 */
export const line: Doc<never> = flatAlt_(line_, char(" "))

/**
 * The `lineBreak` document is like `line` but behaves like `empty` if the
 * line break is undone by `group` (instead of `space`).
 *
 * ```typescript
 * import * as D from '@effect-ts/printer/Core/Doc'
 * import * as R from '@effect-ts/printer/Core/Render'
 *
 * const doc = D.hcat([
 *   D.text('lorem ipsum'),
 *   D.lineBreak,
 *   D.text('dolor sit amet')
 * ])
 *
 * console.log(R.render(doc))
 * // lorem ipsum
 * // dolor sit amet
 *
 * console.log(R.render(D.group(doc)))
 * // lorem ipsumdolor sit amet
 * ```
 */
export const lineBreak: Doc<never> = flatAlt_(line_, empty)

/**
 * The `softLine` document behaves like `space` if the resulting output
 * fits onto the page, otherwise it behaves like `line`.
 *
 * ```typescript
 * import { pipe } from '@effect-ts/core/Function'
 *
 * import * as D from '@effect-ts/printer/Core/Doc'
 * import * as R from '@effect-ts/printer/Core/Render'
 *
 * // Here we have enough space to put everything onto one line:
 *
 * const doc = D.hcat([
 *   D.text('lorem ipsum'),
 *   D.softLine,
 *   D.text('dolor sit amet')
 * ])
 *
 * console.log(pipe(doc, R.renderWidth(80)))
 * // lorem ipsum dolor sit amet
 *
 * // If the page width is narrowed to `10`, the layout algorithm will
 * // introduce a line break:
 *
 * console.log(pipe(doc, R.renderWidth(10)))
 * // lorem ipsum
 * // dolor sit amet
 * ```
 */
export const softLine: Doc<never> = union_(char(" "), line_)

/**
 * The `softLineBreak` document is similar to `softLine`, but behaves
 * like `empty` if the resulting output does not fit onto the page
 * (instead of `space`).
 *
 * ```typescript
 * import { pipe } from '@effect-ts/core/Function'
 *
 * import * as D from '@effect-ts/printer/Core/Doc'
 * import * as R from '@effect-ts/printer/Core/Render'
 *
 * // With enough space, we get direct concatenation of documents:
 * const doc = D.hcat([
 *   D.text('ThisText'),
 *   D.softLineBreak,
 *   D.text('IsWayTooLong')
 * ])
 *
 * console.log(pipe(doc, R.renderWidth(80)))
 * // ThisTextIsWayTooLong
 *
 * // If the page width is narrowed to `10`, the layout algorithm will
 * // introduce a line break:
 * console.log(pipe(doc, R.renderWidth(10)))
 * // ThisText
 * // IsWayTooLong
 * ```
 */
export const softLineBreak: Doc<never> = union_(empty, line_)

/**
 * The `hardLine` document is always laid out as a line break,
 * regardless of space or whether or not the document was
 * `group`'ed.
 *
 * ```typescript
 * import { pipe } from '@effect-ts/core/Function'
 *
 * import * as D from '@effect-ts/printer/Core/Doc'
 * import * as R from '@effect-ts/printer/Core/Render'
 *
 * const doc = D.hcat([
 *   D.text('lorem ipsum'),
 *   D.hardLine,
 *   D.text('dolor sit amet')
 * ])
 *
 * console.log(pipe(doc, R.renderWidth(1000)))
 * // lorem ipsum
 * // dolor sit amet
 * ```
 */
export const hardLine: Doc<never> = line_

/**
 * Lays out a document with the current nesting level (indentation
 * of the following lines) increased by the specified `indent`.
 * Negative values are allowed and will decrease the nesting level
 * accordingly.
 *
 * See also:
 * * `hang`: nest a document relative to the current cursor
 * position instead of the current nesting level
 * * `align`: set the nesting level to the current cursor
 * position
 * * `indent`: increase the indentation on the spot, padding
 * any empty space with spaces
 *
 * ```typescript
 * import { pipe } from '@effect-ts/core/Function'
 *
 * import * as D from '@effect-ts/printer/Core/Doc'
 * import * as R from '@effect-ts/printer/Core/Render'
 *
 * const doc = D.vsep([
 *   pipe(D.vsep(D.words('lorem ipsum dolor')), D.nest(4)),
 *   D.text('sit'),
 *   D.text('amet')
 * ])
 *
 * console.log(R.render(doc))
 * // lorem
 * //     ipsum
 * //     dolor
 * // sit
 * // amet
 * ```
 *
 * @dataFirst nest_
 */
export function nest(indent: number) {
  return <A>(doc: Doc<A>): Doc<A> => nest_(doc, indent)
}

export function nest_<A>(doc: Doc<A>, indent: number): Doc<A> {
  return indent === 0 ? doc : new Nest(indent, doc)
}

/**
 * Lays out a document depending upon the column at which the
 * document starts.
 *
 * ```typescript
 * import { pipe } from '@effect-ts/core/Function'
 * import * as RA from '@effect-ts/core/Array'
 *
 * import * as D from '@effect-ts/printer/Core/Doc'
 * import * as R from '@effect-ts/printer/Core/Render'
 *
 * // Example 1:
 * const example1 = D.column((l) => D.hsep([D.text('Columns are'), D.text(`${l}-based.`)]))
 *
 * console.log(R.render(example1))
 * // Columns are 0-based.
 *
 * // Example 2:
 * const doc = D.hsep([
 *   D.text('prefix'),
 *   D.column((l) => D.text(`| <- column ${l}`))
 * ])
 *
 * const example2 = D.vsep(
 *   pipe(
 *     [0, 4, 8],
 *     RA.map((n) => D.indent(n)(doc))
 *   )
 * )
 *
 * console.log(R.render(example2))
 * // prefix | <- column 7
 * //     prefix | <- column 11
 * //         prefix | <- column 15
 * ```
 */
export function column<A>(react: (position: number) => Doc<A>): Doc<A> {
  return new Column(react)
}

/**
 * Lays out a document depending upon the current nesting level (i.e.,
 * the current indentation of the document).
 *
 * ```typescript
 * import { pipe } from '@effect-ts/core/Function'
 * import * as RA from '@effect-ts/core/Array'
 *
 * import * as D from '@effect-ts/printer/Core/Doc'
 * import * as R from '@effect-ts/printer/Core/Render'
 *
 * const doc = D.hsep([D.text('prefix'), D.nesting((l) => D.brackets(D.text(`Nested: ${l}`)))])
 *
 * const example = D.vsep(
 *   pipe(
 *     [0, 4, 8],
 *     RA.map((n) => D.indent(n)(doc))
 *   )
 * )
 *
 * console.log(R.render(example))
 * // prefix [Nested: 0]
 * //     prefix [Nested: 4]
 * //         prefix [Nested: 8]
 * ```
 */
export function nesting<A>(react: (level: number) => Doc<A>): Doc<A> {
  return new Nesting(react)
}

/**
 * Lays out a document according to the document's`PageWidth`.
 *
 * ```
 * import { pipe } from '@effect-ts/core/Function'
 * import * as RA from '@effect-ts/core/Array'
 *
 * import * as D from '@effect-ts/printer/Core/Doc'
 * import * as R from '@effect-ts/printer/Core/Render'
 * import * as PW from '@effect-ts/printer/Core/PageWidth'
 *
 * const doc = D.hsep([
 *   D.text('prefix'),
 *   D.pageWidth(
 *     PW.match({
 *       AvailablePerLine: (lw, rf) => D.brackets(D.text(`Width: ${lw}, ribbon fraction: ${rf}`)),
 *       Unbounded: () => D.empty
 *     })
 *   )
 * ])
 *
 * const example = D.vsep(
 *   pipe(
 *     [0, 4, 8],
 *     RA.map((n) => pipe(doc, D.indent(n)))
 *   )
 * )
 *
 * console.log(pipe(example, R.renderWidth(32)))
 * // prefix [Width: 32, ribbon fraction: 1]
 * //     prefix [Width: 32, ribbon fraction: 1]
 * //         prefix [Width: 32, ribbon fraction: 1]
 * ```
 */
export function withPageWidth<A>(react: (pageWidth: PageWidth) => Doc<A>): Doc<A> {
  return new WithPageWidth(react)
}

/**
 * Adds an annotation to a `Doc`. The annotation can then be used by the rendering
 * algorithm to, for example, add color to certain parts of the output.
 *
 * **Note** This function is relevant only for custom formats with their own annotations,
 * and is not relevant for basic pretty printing.
 *
 * @dataFirst anotate_
 */
export function annotate<A>(annotation: A) {
  return <B>(doc: Doc<B>): Doc<A | B> => new Annotated<A | B>(annotation, doc)
}

/**
 * Adds an annotation to a `Doc`. The annotation can then be used by the rendering
 * algorithm to, for example, add color to certain parts of the output.
 *
 * **Note** This function is relevant only for custom formats with their own annotations,
 * and is not relevant for basic pretty printing.
 */
export function annotate_<A, B>(doc: Doc<B>, annotation: A): Doc<A | B> {
  return new Annotated<A | B>(annotation, doc)
}

// -------------------------------------------------------------------------------------
// destructors
// -------------------------------------------------------------------------------------

/**
 * @dataFirst match_
 */
export function match<A, R>(patterns: {
  readonly Fail: () => R
  readonly Empty: () => R
  readonly Char: (char: string) => R
  readonly Text: (text: string) => R
  readonly Line: () => R
  readonly FlatAlt: (x: Doc<A>, y: Doc<A>) => R
  readonly Cat: (x: Doc<A>, y: Doc<A>) => R
  readonly Nest: (indent: number, doc: Doc<A>) => R
  readonly Union: (x: Doc<A>, y: Doc<A>) => R
  readonly Column: (react: (position: number) => Doc<A>) => R
  readonly WithPageWidth: (react: (pageWidth: PageWidth) => Doc<A>) => R
  readonly Nesting: (react: (level: number) => Doc<A>) => R
  readonly Annotated: (annotation: A, doc: Doc<A>) => R
}): (doc: Doc<A>) => R {
  return (doc) => match_(doc, patterns)
}

export function match_<A, R>(
  doc: Doc<A>,
  patterns: {
    readonly Fail: () => R
    readonly Empty: () => R
    readonly Char: (char: string) => R
    readonly Text: (text: string) => R
    readonly Line: () => R
    readonly FlatAlt: (x: Doc<A>, y: Doc<A>) => R
    readonly Cat: (x: Doc<A>, y: Doc<A>) => R
    readonly Nest: (indent: number, doc: Doc<A>) => R
    readonly Union: (x: Doc<A>, y: Doc<A>) => R
    readonly Column: (react: (position: number) => Doc<A>) => R
    readonly WithPageWidth: (react: (pageWidth: PageWidth) => Doc<A>) => R
    readonly Nesting: (react: (level: number) => Doc<A>) => R
    readonly Annotated: (annotation: A, doc: Doc<A>) => R
  }
): R {
  switch (doc._tag) {
    case "Fail":
      return patterns.Fail()
    case "Empty":
      return patterns.Empty()
    case "Char":
      return patterns.Char(doc.char)
    case "Text":
      return patterns.Text(doc.text)
    case "Line":
      return patterns.Line()
    case "FlatAlt":
      return patterns.FlatAlt(doc.left, doc.right)
    case "Cat":
      return patterns.Cat(doc.left, doc.right)
    case "Nest":
      return patterns.Nest(doc.indent, doc.doc)
    case "Union":
      return patterns.Union(doc.left, doc.right)
    case "Column":
      return patterns.Column(doc.react)
    case "WithPageWidth":
      return patterns.WithPageWidth(doc.react)
    case "Nesting":
      return patterns.Nesting(doc.react)
    case "Annotated":
      return patterns.Annotated(doc.annotation, doc.doc)
  }
}

// -------------------------------------------------------------------------------------
// operations
// -------------------------------------------------------------------------------------

export function isFail<A>(doc: Doc<A>): doc is Fail<A> {
  return doc._tag === "Fail"
}

export function isEmpty<A>(doc: Doc<A>): doc is Empty<A> {
  return doc._tag === "Empty"
}

export function isChar<A>(doc: Doc<A>): doc is Char<A> {
  return doc._tag === "Char"
}

export function isText<A>(doc: Doc<A>): doc is Text<A> {
  return doc._tag === "Text"
}

export function isLine<A>(doc: Doc<A>): doc is Line<A> {
  return doc._tag === "Line"
}

export function isFlatAlt<A>(doc: Doc<A>): doc is FlatAlt<A> {
  return doc._tag === "FlatAlt"
}

export function isCat<A>(doc: Doc<A>): doc is Cat<A> {
  return doc._tag === "Cat"
}

export function isNest<A>(doc: Doc<A>): doc is Nest<A> {
  return doc._tag === "Nest"
}

export function isUnion<A>(doc: Doc<A>): doc is Union<A> {
  return doc._tag === "Union"
}

export function isColumn<A>(doc: Doc<A>): doc is Column<A> {
  return doc._tag === "Column"
}

export function isWithPageWidth<A>(doc: Doc<A>): doc is WithPageWidth<A> {
  return doc._tag === "WithPageWidth"
}

export function isNesting<A>(doc: Doc<A>): doc is Nesting<A> {
  return doc._tag === "Nesting"
}

export function isAnnotated<A>(doc: Doc<A>): doc is Annotated<A> {
  return doc._tag === "Annotated"
}

/**
 * Change the annotations of a document. Individual annotations can be
 * removed, changed, or replaced by multiple ones.
 *
 * This is a general function that combines `unAnnotate` and `reAnnotate`,
 * and is useful for mapping semantic annotations (such as »this is a keyword«)
 * to display annotations (such as »this is red and underlined«) because some
 * backends may not care about certain annotations while others may.
 *
 * Annotations earlier in the new list will be applied earlier, so returning
 * `[Bold, Green]` will result in a bold document that contains green text,
 * and not vice versa.
 *
 * Since this traverses the entire document tree, including the parts that are
 * not rendered (due to other layouts having better fit), it is preferable to
 * reannotate a document **after** producing the layout by using
 * `alterAnnotations` from the `SimpleDocStream` module.
 *
 * @dataFirst alterAnnotations_
 */
export function alterAnnotations<A, B>(f: (a: A) => Array<B>) {
  return (doc: Doc<A>) => alterAnnotations_(doc, f)
}

/**
 * Change the annotations of a document. Individual annotations can be
 * removed, changed, or replaced by multiple ones.
 *
 * This is a general function that combines `unAnnotate` and `reAnnotate`,
 * and is useful for mapping semantic annotations (such as »this is a keyword«)
 * to display annotations (such as »this is red and underlined«) because some
 * backends may not care about certain annotations while others may.
 *
 * Annotations earlier in the new list will be applied earlier, so returning
 * `[Bold, Green]` will result in a bold document that contains green text,
 * and not vice versa.
 *
 * Since this traverses the entire document tree, including the parts that are
 * not rendered (due to other layouts having better fit), it is preferable to
 * reannotate a document **after** producing the layout by using
 * `alterAnnotations` from the `SimpleDocStream` module.
 */
export function alterAnnotations_<A, B>(doc: Doc<A>, f: (a: A) => Array<B>): Doc<B> {
  function go(x: Doc<A>): IO.IO<Doc<B>> {
    return IO.gen(function* (_) {
      switch (x._tag) {
        case "Cat":
          return cat_(yield* _(go(x.left)), yield* _(go(x.right)))
        case "FlatAlt":
          return flatAlt_(yield* _(go(x.left)), yield* _(go(x.right)))
        case "Union":
          return union_(yield* _(go(x.left)), yield* _(go(x.right)))
        case "Nest":
          return nest(x.indent)(yield* _(go(x.doc)))
        case "Column":
          return column((position) => IO.run(go(x.react(position))))
        case "WithPageWidth":
          return withPageWidth((pageWidth) => IO.run(go(x.react(pageWidth))))
        case "Nesting":
          return nesting((level) => IO.run(go(x.react(level))))
        case "Annotated":
          return A.reduceRight_(f(x.annotation), yield* _(go(x.doc)), (ann, doc) =>
            annotate_(doc, ann)
          )
        case "Fail":
          return fail
        case "Empty":
          return empty
        case "Char":
          return char(x.char)
        case "Text":
          return text(x.text)
        case "Line":
          return line
      }
    })
  }
  return IO.run(go(doc))
}

/**
 * Removes all annotations from a document.
 *
 * **Note** that with each invocation, the entire document tree is traversed.
 * If possible, it is preferable to unannotate a document after producing the
 * layout using `unAnnotateS`.
 */
export const unAnnotate: <A>(doc: Doc<A>) => Doc<never> = alterAnnotations(constant([]))

/**
 * Changes the annotation of a document. Useful for modifying documents embedded
 * with one form of annotation with a more general annotation.
 *
 * **Note** that with each invocation, the entire document tree is traversed.
 * If possible, it is preferable to reannotate a document after producing the
 * layout using `reAnnotateS`.
 *
 * @dataFirst reAnnotate_
 */
export function reAnnotate<A, B>(f: (a: A) => B) {
  return (doc: Doc<A>): Doc<B> => reAnnotate_(doc, f)
}

export function reAnnotate_<A, B>(doc: Doc<A>, f: (a: A) => B): Doc<B> {
  return alterAnnotations_(doc, (_) => A.single(f(_)))
}

/**
 * @dataFirst map_
 */
export const map = reAnnotate

export const map_ = reAnnotate_

// -------------------------------------------------------------------------------------
// primitives
// -------------------------------------------------------------------------------------

/**
 * A document containing a single `'` character.
 */
export const squote: Doc<never> = char("'")

/**
 * A document containing a single `"` character.
 */
export const dquote: Doc<never> = char('"')

/**
 * A document containing a single `(` character.
 */
export const lparen: Doc<never> = char("(")

/**
 * A document containing a single `)` character.
 */
export const rparen: Doc<never> = char(")")

/**
 * A document containing a single `<` character.
 */
export const langle: Doc<never> = char("<")

/**
 * A document containing a single `>` character.
 */
export const rangle: Doc<never> = char(">")

/**
 * A document containing a single `[` character.
 */
export const lbracket: Doc<never> = char("[")

/**
 * A document containing a single `]` character.
 */
export const rbracket: Doc<never> = char("]")

/**
 * A document containing a single `{` character.
 */
export const lbrace: Doc<never> = char("{")

/**
 * A document containing a single `}` character.
 */
export const rbrace: Doc<never> = char("}")

/**
 * A document containing a single `;` character.
 */
export const semi: Doc<never> = char(";")

/**
 * A document containing a single `:` character.
 */
export const colon: Doc<never> = char(":")

/**
 * A document containing a single `,` character.
 */
export const comma: Doc<never> = char(",")

/**
 * A document containing a single `.` character.
 */
export const dot: Doc<never> = char(".")

/**
 * A document containing a single `/` character.
 */
export const slash: Doc<never> = char("/")

/**
 * A document containing a single `\` character.
 */
export const backslash: Doc<never> = char("\\")

/**
 * A document containing a single `=` character.
 */
export const equals: Doc<never> = char("=")

/**
 * A document containing a single `|` character.
 */
export const vbar: Doc<never> = char("|")

/**
 * A document containing a single ` ` character.
 */
export const space: Doc<never> = char(" ")

// -------------------------------------------------------------------------------------
// concatenation combinators
// -------------------------------------------------------------------------------------

/**
 * The `concatWith` combinator concatenates all documents in a list element-wise with
 * a binary function.
 *
 * ```typescript
 * import { pipe } from '@effect-ts/core/Function'
 *
 * import * as D from '@effect-ts/printer/Core/Doc'
 * import * as R from '@effect-ts/printer/Core/Render'
 *
 * const doc = pipe(
 *   [D.char('a'), D.char('b')],
 *   D.concatWith(D.appendWithSpace)
 * )
 *
 * console.log(R.render(doc))
 * // a b
 * ```
 *
 * @dataFirst_ concatWith_
 */
export function concatWith<A>(f: (x: Doc<A>, y: Doc<A>) => Doc<A>) {
  return (docs: Array<Doc<A>>): Doc<A> => concatWith_(docs, f)
}

export function concatWith_<A>(
  docs: Array<Doc<A>>,
  f: (x: Doc<A>, y: Doc<A>) => Doc<A>
): Doc<A> {
  return A.foldRight_(
    docs,
    () => empty,
    (init, last) => A.reduceRight_(init, last, f)
  )
}

/**
 * The `appendWithSpace` combinator concatenates two documents, `x` and `y`, with a
 * `space` between them.
 *
 * ```typescript
 * import * as D from '@effect-ts/printer/Core/Doc'
 * import * as R from '@effect-ts/printer/Core/Render'
 *
 * const doc = D.appendWithSpace(D.char('a'), D.char('b'))
 *
 * console.log(R.render(doc))
 * // a b
 * ```
 */
export function appendWithSpace_<A>(x: Doc<A>, y: Doc<A>): Doc<A> {
  return cat_(x, cat_(space, y))
}

/**
 * @dataFirst appendWithSpace_
 */
export function appendWithSpace<A>(y: Doc<A>) {
  return (x: Doc<A>) => appendWithSpace_(x, y)
}

/**
 * The `appendWithLine` combinator concatenates two documents, `x` and `y`, with a
 * `line` between them.
 *
 * ```typescript
 * import * as D from '@effect-ts/printer/Core/Doc'
 * import * as R from '@effect-ts/printer/Core/Render'
 *
 * const doc = D.appendWithLine(D.char('a'), D.char('b'))
 *
 * console.log(R.render(doc))
 * // a
 * // b
 * ```
 */
export function appendWithLine_<A>(x: Doc<A>, y: Doc<A>): Doc<A> {
  return cat_(x, cat_(line, y))
}

/**
 * @dataFirst appendWithLine_
 */
export function appendWithLine<A>(y: Doc<A>) {
  return (x: Doc<A>) => appendWithLine_(x, y)
}

/**
 * The `appendWithLineBreak` combinator concatenates two documents, `x` and `y`, with a
 * `lineBreak` between them.
 *
 * ```typescript
 * import * as D from '@effect-ts/printer/Core/Doc'
 * import * as R from '@effect-ts/printer/Core/Render'
 *
 * const doc = D.appendWithLineBreak(D.char('a'), D.char('b'))
 *
 * console.log(R.render(doc))
 * // a
 * // b
 *
 * console.log(R.render(D.group(doc)))
 * // ab
 * ```
 */
export function appendWithLineBreak_<A>(x: Doc<A>, y: Doc<A>): Doc<A> {
  return cat_(x, cat_(lineBreak, y))
}

/**
 * @dataFirst appendWithLineBreak_
 */
export function appendWithLineBreak<A>(y: Doc<A>) {
  return (x: Doc<A>) => appendWithLineBreak_(x, y)
}

/**
 * The `appendWithSoftLine` combinator concatenates two documents, `x` and `y`, with a
 * `softLine` between them.
 *
 * ```typescript
 * import { pipe } from '@effect-ts/core/Function'
 *
 * import * as D from '@effect-ts/printer/Core/Doc'
 * import * as R from '@effect-ts/printer/Core/Render'
 *
 * const doc = D.appendWithSoftLine(D.char('a'), D.char('b'))
 *
 * console.log(R.render(doc))
 * // a b
 *
 * console.log(pipe(doc, R.renderWidth(1)))
 * // a
 * // b
 * ```
 */
export function appendWithSoftLine_<A>(x: Doc<A>, y: Doc<A>): Doc<A> {
  return cat_(x, cat_(softLine, y))
}

/**
 * @dataFirst appendWithSoftLine_
 */
export function appendWithSoftLine<A>(y: Doc<A>) {
  return (x: Doc<A>) => appendWithSoftLine_(x, y)
}

/**
 * The `appendWithSoftLineBreak` combinator concatenates two documents, `x` and `y`, with a
 * `softLineBreak` between them.
 *
 * ```typescript
 * import { pipe } from '@effect-ts/core/Function'
 *
 * import * as D from '@effect-ts/printer/Core/Doc'
 * import * as R from '@effect-ts/printer/Core/Render'
 *
 * const doc = D.appendWithSoftLineBreak(D.char('a'), D.char('b'))
 *
 * console.log(R.render(doc))
 * // ab
 *
 * console.log(pipe(doc, R.renderWidth(1)))
 * // a
 * // b
 * ```
 */
export function appendWithSoftLineBreak_<A>(x: Doc<A>, y: Doc<A>): Doc<A> {
  return cat_(x, cat_(softLineBreak, y))
}

/**
 * @dataFirst appendWithSoftLineBreak_
 */
export function appendWithSoftLineBreak<A>(y: Doc<A>) {
  return (x: Doc<A>) => appendWithSoftLineBreak_(x, y)
}

// -------------------------------------------------------------------------------------
// alternative combinators
// -------------------------------------------------------------------------------------

function flattenRec<A>(x: Doc<A>): IO.IO<Doc<A>> {
  return IO.gen(function* (_) {
    switch (x._tag) {
      case "Line":
        return fail
      case "Cat":
        return cat_(yield* _(flattenRec(x.left)), yield* _(flattenRec(x.right)))
      case "FlatAlt":
        return yield* _(flattenRec(x.right))
      case "Union":
        return yield* _(flattenRec(x.left))
      case "Nest":
        return nest(x.indent)(yield* _(flattenRec(x.doc)))
      case "Column":
        return column((position) => IO.run(flattenRec(x.react(position))))
      case "WithPageWidth":
        return withPageWidth((pageWidth) => IO.run(flattenRec(x.react(pageWidth))))
      case "Nesting":
        return nesting((level) => IO.run(flattenRec(x.react(level))))
      case "Annotated":
        return annotate_(yield* _(flattenRec(x.doc)), x.annotation)
      default:
        return x
    }
  })
}

/**
 * Flattens a document but does not report changes.
 */
const flatten = <A>(doc: Doc<A>): Doc<A> => {
  return IO.run(flattenRec(doc))
}

function changesUponFlatteningRec<A>(x: Doc<A>): IO.IO<Flatten<Doc<A>>> {
  return IO.gen(function* (_) {
    switch (x._tag) {
      case "FlatAlt":
        return F.flattened(flatten(x.right))
      case "Cat": {
        const left = yield* _(changesUponFlatteningRec(x.left))
        const right = yield* _(changesUponFlatteningRec(x.right))

        if (F.isNeverFlat(left) || F.isNeverFlat(right)) {
          return F.neverFlat
        }
        if (F.isFlattened(left) && F.isFlattened(right)) {
          return F.flattened(cat_(left.value, right.value))
        }
        if (F.isFlattened(left) && F.isAlreadyFlat(right)) {
          return F.flattened(cat_(left.value, x.right))
        }
        if (F.isAlreadyFlat(left) && F.isFlattened(right)) {
          return F.flattened(cat_(x.left, right.value))
        }
        if (F.isAlreadyFlat(left) && F.isAlreadyFlat(right)) {
          return F.alreadyFlat
        }

        throw new Error("bug, it seems we didn't manage a branch")
      }
      case "Nest": {
        const flatten = yield* _(changesUponFlatteningRec(x.doc))
        return F.map_(flatten, nest(x.indent))
      }
      case "Union":
        return F.flattened(x.left)
      case "Column":
        return F.flattened(column((y) => flatten(x.react(y))))
      case "WithPageWidth":
        return F.flattened(withPageWidth((y) => flatten(x.react(y))))
      case "Nesting":
        return F.flattened(nesting((y) => flatten(x.react(y))))
      case "Annotated": {
        const flatten = yield* _(changesUponFlatteningRec(x.doc))
        return F.map_(flatten, annotate(x.annotation))
      }
      default:
        return F.alreadyFlat
    }
  })
}

/**
 * Select the first element of each `Union` and discard the first element
 * of each `FlatAlt` to produce a "flattened" version of the input document.
 *
 * The result is `Flattened` if the element might change depending on the
 * chosen layout algorithm (i.e., the resulting document contains
 * sub-documents that may be rendered differently).
 *
 * The result is `AlreadyFlat` if the document is static (i.e., the resulting
 * document contains only a plain `Empty` node).
 *
 * `NeverFlat` is returned when the document cannot be flattened because it
 * contains either a hard `Line` or a `Fail`.
 */
const changesUponFlattening = <A>(doc: Doc<A>): Flatten<Doc<A>> => {
  return IO.run(changesUponFlatteningRec(doc))
}

/**
 * The `group` combinator attempts to lay out a document onto a single line by
 * removing the contained line breaks. If the result does not fit the page, or
 * if a `hardLine` prevents flattening the document, `x` is laid out without
 * any changes.
 *
 * The `group` function is key to layouts that adapt to available space nicely.
 */
export const group = <A>(doc: Doc<A>): Doc<A> => {
  const group_ = (a: Doc<A>): Doc<A> =>
    F.match_(changesUponFlattening(a), {
      Flattened: (b) => union_(b, a),
      AlreadyFlat: () => a,
      NeverFlat: () => a
    })
  return match_(doc, {
    Fail: () => group_(doc),
    Empty: () => group_(doc),
    Char: () => group_(doc),
    Text: () => group_(doc),
    Line: () => group_(doc),
    FlatAlt: (a, b) =>
      F.match_(changesUponFlattening(b), {
        Flattened: (b_) => union_(b_, a),
        AlreadyFlat: () => union_(b, a),
        NeverFlat: () => a
      }),
    Cat: () => group_(doc),
    Nest: () => group_(doc),
    Union: () => doc,
    Column: () => group_(doc),
    WithPageWidth: () => group_(doc),
    Nesting: () => group_(doc),
    Annotated: () => group_(doc)
  })
}

// -------------------------------------------------------------------------------------
// sep combinators
// -------------------------------------------------------------------------------------

/**
 * The `hsep` combinator concatenates all documents in a list horizontally by placing
 * a `space` between each pair of documents.
 *
 * For automatic line breaks, consider using `fillSep`.
 *
 * ```typescript
 * import { pipe } from '@effect-ts/core/Function'
 *
 * import * as D from '@effect-ts/printer/Core/Doc'
 * import * as R from '@effect-ts/printer/Core/Render'
 *
 * const doc = D.hsep(D.words('lorem ipsum dolor sit amet'))
 *
 * console.log(pipe(doc, R.renderWidth(80)))
 * // lorem ipsum dolor sit amet
 *
 * // The `hsep` combinator will not introduce line breaks on its own, even when
 * // the page is too narrow
 * console.log(pipe(doc, R.renderWidth(5)))
 * // lorem ipsum dolor sit amet
 * ```
 */
export const hsep: <A>(docs: Array<Doc<A>>) => Doc<A> = concatWith(appendWithSpace_)

/**
 * The `vsep` combinator concatenates all documents in a list vertically. If a `group`
 * undoes the line breaks inserted by `vsep`, the documents are separated with a space
 * instead.
 *
 * When a `vsep` is `group`ed, the documents are separated with a `space` if the layout
 * fits the page, otherwise nothing is done. See the `sep` convenience function for this
 * use case.
 *
 * ```typescript
 * import * as D from '@effect-ts/printer/Core/Doc'
 * import * as R from '@effect-ts/printer/Core/Render'
 *
 * const unaligned = D.hsep([
 *   D.text('prefix'),
 *   D.vsep(D.words('text to lay out'))
 * ])
 *
 * console.log(R.render(unaligned))
 * // prefix text
 * // to
 * // lay
 * // out
 *
 * // The `align` function can be used to align the documents under their first element
 * const aligned = D.hsep([
 *   D.text('prefix'),
 *   D.align(D.vsep(D.words('text to lay out')))
 * ])
 *
 * console.log(R.render(aligned))
 * // prefix text
 * //        to
 * //        lay
 * //        out
 * ```
 */
export const vsep: <A>(docs: Array<Doc<A>>) => Doc<A> = concatWith(appendWithLine_)

/**
 * The `fillSep` combinator concatenates all documents in a list horizontally by placing
 * a `space` between each pair of documents as long as they fit the page. Once the page
 * width is exceeded, a `line` is inserted and the process is repeated for all documents
 * in the list. **Note** that the use of `line` means that if `group`ed, the documents
 * will be separated with a `space` instead of newlines. See `fillCat` if you do not want
 * a `space`.
 */
export const fillSep: <A>(docs: Array<Doc<A>>) => Doc<A> = concatWith(
  appendWithSoftLine_
)

/**
 * The `sep` combinator will attempt to lay out a list of documents separated by `space`s.
 * If the output does not fit the page, then the documents will be separated by newlines.
 * This is what differentiates it from `vsep`, which always lays out documents beneath one
 * another.
 *
 * ```typescript
 * import { pipe } from '@effect-ts/core/Function'
 *
 * import * as D from '@effect-ts/printer/Core/Doc'
 * import * as R from '@effect-ts/printer/Core/Render'
 *
 * const doc = D.hsep([
 *   D.text('prefix'),
 *   D.sep(D.words('text to lay out'))
 * ])
 *
 * console.log(R.render(doc))
 * // prefix text to lay out
 *
 * // If the page width is too narrow, documents are separated by newlines
 * console.log(pipe(doc, R.renderWidth(20)))
 * // prefix text
 * // to
 * // lay
 * // out
 * ```
 */
export const seps: <A>(docs: Array<Doc<A>>) => Doc<A> = (_) => group(vsep(_))

// -------------------------------------------------------------------------------------
// cat combinators
// -------------------------------------------------------------------------------------

/**
 * The `hcat` combinator concatenates all documents in a list horizontally without
 * any spacing. It is provided for completeness, but is identical in function to
 * folding an array of documents using the `Semigroup` instance for `Doc`.
 *
 * ```typescript
 * import * as D from '@effect-ts/printer/Core/Doc'
 * import * as R from '@effect-ts/printer/Core/Render'
 *
 * const doc = D.hcat(D.words('lorem ipsum dolor'))
 *
 * console.log(R.render(doc))
 * // loremipsumdolor
 * ```
 */
export const hcat: <A>(docs: Array<Doc<A>>) => Doc<A> = concatWith(cat_)

/**
 * The `vcat` combinator concatenates all documents in a list vertically. If the
 * output is grouped then the line breaks are removed.
 *
 * ```typescript
 * import * as D from '@effect-ts/printer/Core/Doc'
 * import * as R from '@effect-ts/printer/Core/Render'
 *
 * const doc = D.vcat(D.words('lorem ipsum dolor'))
 *
 * console.log(R.render(doc))
 * // lorem
 * // ipsum
 * // dolor
 * ```
 */
export const vcat: <A>(docs: Array<Doc<A>>) => Doc<A> = concatWith(appendWithLineBreak_)

/**
 * The `fillCat` combinator concatenates all documents in a list horizontally by placing
 * a `space` between each pair of documents as long as they fit the page. Once the page
 * width is exceeded, a `lineBreak` is inserted and the process is repeated for all
 * documents in the list.
 *
 * **Note** that the use of `lineBreak` means that if `group`ed, the documents will be
 * separated with `empty` instead of newlines. See `fillSep` if you want a `space` instead.
 */
export const fillCat: <A>(docs: Array<Doc<A>>) => Doc<A> = concatWith(
  appendWithSoftLineBreak_
)

/**
 * The `cat` combinator will attempt to lay out a list of documents separated by nothing.
 * If the output does not fit the page, then the documents will be separated by newlines.
 * This is what differentiates it from `vcat`, which always lays out documents beneath one
 * another.
 *
 * ```typescript
 * import { pipe } from '@effect-ts/core/Function'
 *
 * import * as D from '@effect-ts/printer/Core/Doc'
 * import * as R from '@effect-ts/printer/Core/Render'
 *
 * const doc = D.hsep([
 *   D.text('Docs:'),
 *   D.cat(D.words('lorem ipsum dolor'))
 * ])
 *
 * console.log(R.render(doc))
 * // Docs: loremipsumdolor
 *
 * // If the document exceeds the width of the page, the documents are rendered
 * // one above another
 * console.log(pipe(doc, R.renderWidth(10)))
 * // Docs: lorem
 * // ipsum
 * // dolor
 * ```
 */
export function cats<A>(docs: Array<Doc<A>>): Doc<A> {
  return group(vcat(docs))
}

/**
 * Tupled variant of cats
 */
export function catsT<Docs extends Array<Doc<any>>>(
  ...docs: Docs
): Doc<_A<Docs[number]>> {
  return cats(docs)
}

// -------------------------------------------------------------------------------------
// filler combinators
// -------------------------------------------------------------------------------------

/**
 * The `fill` combinator first lays out the document `x` and then appends `space`s
 * until the width of the document is equal to the specified `width`. If the width
 * of `x` is already larger than the specified `width`, nothing is appended.
 *
 * ```typescript
 * import { pipe } from '@effect-ts/core/Function'
 * import * as RA from '@effect-ts/core/Array'
 *
 * import type { Doc } from '@effect-ts/printer/Core/Doc'
 * import * as D from '@effect-ts/printer/Core/Doc'
 * import * as R from '@effect-ts/printer/Core/Render'
 *
 * type Signature = [name: string, type: string]
 *
 * const signatures: ReadonlyArray<Signature> = [
 *   ['empty', 'Doc'],
 *   ['nest', 'Int -> Doc -> Doc'],
 *   ['fillSep', '[Doc] -> Doc']
 * ]
 *
 * const prettySignature = <A>([name, type]: Signature): Doc<A> =>
 *   D.hsep([pipe(D.text<never>(name), D.fill(5)), D.text('::'), D.text(type)])
 *
 * const doc = D.hsep([D.text('let'), D.align(D.vcat(pipe(signatures, RA.map(prettySignature))))])
 *
 * console.log(R.render(doc))
 * // let empty :: Doc
 * //     nest :: Int -> Doc -> Doc
 * //     fillSep :: [Doc] -> Doc
 * ```
 *
 * @dataFirst fill_
 */
export function fill(width: number) {
  return <A>(doc: Doc<A>): Doc<A> => fill_(doc, width)
}

export function fill_<A>(doc: Doc<A>, width: number): Doc<A> {
  return width_(doc, (x) => spaces(width - x))
}

/**
 * The `fillBreak` combinator first lays out the document `x` and then appends `space`s
 * until the width of the document is equal to the specified `width`. If the width of
 * `x` is already larger than the specified `width`, the nesting level is increased by
 * the specified `width` and a `line` is appended.
 *
 * ```typescript
 * import { pipe } from '@effect-ts/core/Function'
 * import * as RA from '@effect-ts/core/Array'
 *
 * import type { Doc } from '@effect-ts/printer/Core/Doc'
 * import * as D from '@effect-ts/printer/Core/Doc'
 * import * as R from '@effect-ts/printer/Core/Render'
 *
 * type Signature = [name: string, type: string]
 *
 * const signatures: ReadonlyArray<Signature> = [
 *   ['empty', 'Doc'],
 *   ['nest', 'Int -> Doc -> Doc'],
 *   ['fillSep', '[Doc] -> Doc']
 * ]
 *
 * const prettySignature = <A>([name, type]: Signature): Doc<A> =>
 *   D.hsep([pipe(D.text<never>(name), D.fillBreak(5)), D.text('::'), D.text(type)])
 *
 * const doc = D.hsep([D.text('let'), D.align(D.vcat(pipe(signatures, RA.map(prettySignature))))])
 *
 * console.log(R.render(doc))
 * // let empty :: Doc
 * //     nest :: Int -> Doc -> Doc
 * //     fillSep
 * //          :: [Doc] -> Doc
 * ```
 *
 * @dataFirst fillBreak_
 */
export function fillBreak(width: number) {
  return <A>(doc: Doc<A>): Doc<A> => fillBreak_(doc, width)
}

export function fillBreak_<A>(doc: Doc<A>, width: number): Doc<A> {
  return width_(doc, (w) => (w > width ? nest_(lineBreak, width) : spaces(width - w)))
}

// -------------------------------------------------------------------------------------
// alignment combinators
// -------------------------------------------------------------------------------------

/**
 * The `align` combinator lays out a document with the nesting level set to
 * the current column.
 *
 * ```typescript
 * import * as D from '@effect-ts/printer/Core/Doc'
 * import * as R from '@effect-ts/printer/Core/Render'
 *
 * // As an example, the documents below will be placed one above the other
 * // regardless of the current nesting level
 *
 * // Without `align`ment, the second line is simply placed below everything
 * // that has been laid out so far
 * const unaligned = D.hsep([
 *   D.text('lorem'),
 *   D.vsep([D.text('ipsum'), D.text('dolor')])
 * ])
 *
 * console.log(R.render(unaligned))
 * // lorem ipsum
 * // dolor
 *
 * // With `align`ment, the `vsep`ed documents all start at the same column
 * const aligned = D.hsep([
 *   D.text('lorem'),
 *   D.align(D.vsep([D.text('ipsum'), D.text('dolor')]))
 * ])
 *
 * console.log(R.render(aligned))
 * // lorem ipsum
 * //       dolor
 * ```
 */
export function align<A>(doc: Doc<A>): Doc<A> {
  return column((k) => nesting((i) => nest(k - i)(doc)))
}

/**
 * The `hang` combinator lays out a document with the nesting level set to
 * the *current column* plus the specified `indent`. Negative values for `indent`
 * are allowed and decrease the nesting level accordingly.
 *
 * This differs from the `nest` combinator, which is based on the *current
 * nesting level* plus the specified `indent`. When you're not sure, try the more
 * efficient combinator (`nest`) first.
 *
 * ```typescript
 * import { pipe } from '@effect-ts/core/Function'
 *
 * import * as D from '@effect-ts/printer/Core/Doc'
 * import * as R from '@effect-ts/printer/Core/Render'
 *
 * const doc = D.hsep([
 *   D.text('prefix'),
 *   pipe(D.reflow('Indenting these words with hang'), D.hang(4))
 * ])
 *
 * console.log(pipe(doc, R.renderWidth(24)))
 * // prefix Indenting these
 * //            words with
 * //            hang
 * ```
 *
 * @dataFirst hang_
 */
export function hang(indent: number): <A>(doc: Doc<A>) => Doc<A> {
  return (doc) => hang_(doc, indent)
}

export function hang_<A>(doc: Doc<A>, indent: number): Doc<A> {
  return align(nest_(doc, indent))
}

/**
 * The `indent` combinator indents a document by the specified `indent`
 * beginning from the current cursor position.
 *
 * ```typescript
 * import { pipe } from '@effect-ts/core/Function'
 *
 * import * as D from '@effect-ts/printer/Core/Doc'
 * import * as R from '@effect-ts/printer/Core/Render'
 *
 * const doc = D.hsep([
 *   D.text('prefix'),
 *   pipe(D.reflow('The indent function indents these words!'), D.indent(4))
 * ])
 *
 * console.log(pipe(doc, R.renderWidth(24)))
 * //  prefix    The indent
 * //            function
 * //            indents these
 * //            words!
 * ```
 *
 * @dataFirst indent_
 */
export function indent(indent: number) {
  return <A>(doc: Doc<A>): Doc<A> => indent_(doc, indent)
}

export function indent_<A>(doc: Doc<A>, indent: number): Doc<A> {
  return hang_(cat_(spaces(indent), doc), indent)
}

/**
 * The `encloseSep` combinator concatenates a list of documents, separating
 * each document in the list using the specified `sep` document. After
 * concatenation, the resulting document is enclosed by the specified `left`
 * and `right` documents.
 *
 * To place the `sep` document at the end of each list entry, see the
 * `punctuate` combinator.
 *
 * ```typescript
 * import { pipe } from '@effect-ts/core/Function'
 * import * as RA from '@effect-ts/core/Array'
 *
 * import type { Doc } from '@effect-ts/printer/Core/Doc'
 * import * as D from '@effect-ts/printer/Core/Doc'
 * import * as R from '@effect-ts/printer/Core/Render'
 *
 * const doc = D.hsep([
 *   D.text('list'),
 *   D.align(
 *     pipe(
 *       ['1', '20', '300', '4000'],
 *       RA.map<string, Doc<never>>((n) => (n.length === 1 ? D.char(n) : D.text(n))),
 *       D.encloseSep(D.lbracket, D.rbracket, D.comma)
 *     )
 *   )
 * ])
 *
 * // The documents are laid out horizontally if that fits the page:
 * console.log(pipe(doc, R.renderWidth(80)))
 * // list [1,20,300,4000]
 *
 * // Otherwise they are laid out vertically, with separators put in the front:
 * console.log(pipe(doc, R.renderWidth(10)))
 * // list [1
 * //      ,20
 * //      ,300
 * //      ,4000]
 * ```
 *
 * @dataFirst encloseSep_
 */
export function encloseSep<A, B, C>(left: Doc<A>, right: Doc<B>, sep: Doc<C>) {
  return <D>(docs: Array<Doc<D>>): Doc<A | B | C | D> =>
    encloseSep_(docs, left, right, sep)
}

export function encloseSep_<A, B, C, D>(
  docs: Array<Doc<D>>,
  left: Doc<A>,
  right: Doc<B>,
  sep: Doc<C>
): Doc<A | B | C | D> {
  if (docs.length === 0) return cat_(left, right)
  if (docs.length === 1) return cat_(left, cat_(docs[0]!, right))
  const xs = A.zipWith_(
    A.cons_(A.replicate_(docs.length - 1, sep), left as Doc<A | C>),
    docs,
    cat_
  )
  return cat_(cats(xs), right)
}

/**
 * A Haskell-inspired variant of `encloseSep` that uses a comma as the separator and
 * braces as the enclosure for a list of documents.
 *
 * ```typescript
 * import { pipe } from '@effect-ts/core/Function'
 * import * as RA from '@effect-ts/core/Array'
 *
 * import type { Doc } from '@effect-ts/printer/Core/Doc'
 * import * as D from '@effect-ts/printer/Core/Doc'
 * import * as R from '@effect-ts/printer/Core/Render'
 *
 * const doc = pipe(
 *   ['1', '20', '300', '4000'],
 *   RA.map<string, Doc<never>>((n) => (n.length === 1 ? D.char(n) : D.text(n))),
 *   D.list
 * )
 *
 * console.log(pipe(doc, R.renderWidth(80)))
 * // [1, 20, 300, 4000]
 * ```
 */
export function list<A>(docs: Array<Doc<A>>): Doc<A> {
  return group(
    encloseSep_(
      docs,
      flatAlt_(char("[ "), lbracket),
      flatAlt_(char(" ]"), rbracket),
      char(", ")
    )
  )
}

/**
 * A Haskell-inspired variant of `encloseSep` that uses a comma as the separator and
 * parentheses as the enclosure for a list of documents.
 *
 * ```typescript
 * import { pipe } from '@effect-ts/core/Function'
 * import * as RA from '@effect-ts/core/Array'
 *
 * import type { Doc } from '@effect-ts/printer/Core/Doc'
 * import * as D from '@effect-ts/printer/Core/Doc'
 * import * as R from '@effect-ts/printer/Core/Render'
 *
 * const doc = pipe(
 *   ['1', '20', '300', '4000'],
 *   RA.map<string, Doc<never>>((n) => (n.length === 1 ? D.char(n) : D.text(n))),
 *   D.tupled
 * )
 *
 * console.log(pipe(doc, R.renderWidth(80)))
 * // (1, 20, 300, 4000)
 * ```
 */
export function tupled<A>(docs: Array<Doc<A>>): Doc<A> {
  return group(
    encloseSep_(
      docs,
      flatAlt_(char("( "), lparen),
      flatAlt_(char(" )"), rparen),
      char(", ")
    )
  )
}

// -------------------------------------------------------------------------------------
// reactive/conditional combinators
// -------------------------------------------------------------------------------------

/**
 * The `width` combinator makes the column width of a document available to
 * the document while rendering.
 *
 * ```typescript
 * import { pipe } from '@effect-ts/core/Function'
 * import * as RA from '@effect-ts/core/Array'
 *
 * import type { Doc } from '@effect-ts/printer/Core/Doc'
 * import * as D from '@effect-ts/printer/Core/Doc'
 * import * as R from '@effect-ts/printer/Core/Render'
 *
 * const annotate = <A>(doc: Doc<A>): Doc<A> =>
 *   pipe(
 *     D.brackets(doc),
 *     D.width((w) => D.text(` <- width: ${w}`))
 *   )
 *
 * const docs = [
 *   D.text('---'),
 *   D.text('------'),
 *   pipe(D.text('---'), D.indent(3)),
 *   D.vsep([D.text('---'), pipe(D.text('---'), D.indent(4))])
 * ]
 *
 * const doc = D.align(D.vsep(pipe(docs, RA.map(annotate))))
 *
 * console.log(R.render(doc))
 * // [---] <- width: 5
 * // [------] <- width: 8
 * // [   ---] <- width: 8
 * // [---
 * //     ---] <- width: 8
 * ```
 *
 * @dataFirst width_
 */
export function width<A>(react: (width: number) => Doc<A>) {
  return <B>(doc: Doc<B>): Doc<A | B> => width_(doc, react)
}

export function width_<A, B>(
  doc: Doc<B>,
  react: (width: number) => Doc<A>
): Doc<A | B> {
  return column((colStart) =>
    cat_(
      doc,
      column((colEnd) => react(colEnd - colStart))
    )
  )
}

// -------------------------------------------------------------------------------------
// general combinators
// -------------------------------------------------------------------------------------

/**
 * The `punctuate` combinator appends the `punctuator` document to all by the last
 * document in a list of documents. The separators are places after the document
 * entries, which can be observed if the result is oriented vertically.
 *
 * ```typescript
 * import { pipe } from '@effect-ts/core/Function'
 *
 * import * as D from '@effect-ts/printer/Core/Doc'
 * import * as R from '@effect-ts/printer/Core/Render'
 *
 * const docs = pipe(
 *   D.words<never>('lorem ipsum dolor sit amet'),
 *   D.punctuate(D.comma)
 * )
 *
 * console.log(R.render(D.hsep(docs)))
 * // lorem, ipsum, dolor, sit, amet
 *
 * // The separators are put at the end of the entries, which can be better
 * // visualzied if the documents are rendered vertically
 * console.log(R.render(D.vsep(docs)))
 * // lorem,
 * // ipsum,
 * // dolor,
 * // sit,
 * // amet
 * ```
 *
 * @dataFirst punctuate_
 */
export function punctuate<A>(punctuator: Doc<A>) {
  return <B>(docs: Array<Doc<B>>): Array<Doc<A | B>> => punctuate_(docs, punctuator)
}

export function punctuate_<A, B>(
  docs: Array<Doc<B>>,
  punctuator: Doc<A>
): Array<Doc<A | B>> {
  return A.mapWithIndex_(docs, (i, x) =>
    docs.length - 1 === i ? x : cat_(x, punctuator)
  )
}

/**
 * The `enclose` combinator encloses a document `x` in between `left` and `right`
 * documents using `Cat`.
 *
 * ```typescript
 * import { pipe } from '@effect-ts/core/Function'
 *
 * import * as D from '@effect-ts/printer/Core/Doc'
 * import * as R from '@effect-ts/printer/Core/Render'
 *
 * const doc = pipe(D.char('-'), D.enclose(D.char('A'), D.char('Z')))
 *
 * console.log(R.render(doc))
 * // A-Z
 * ```
 *
 * @dataFirst enclose_
 */
export function enclose<A, B>(left: Doc<A>, right: Doc<B>) {
  return <C>(doc: Doc<C>): Doc<A | B | C> => enclose_(doc, left, right)
}

export function enclose_<A, B, C>(
  doc: Doc<C>,
  left: Doc<A>,
  right: Doc<B>
): Doc<A | B | C> {
  return cat_(left, cat_(doc, right))
}

/**
 * The `surround` combinator surrounds a document `x` in between `left` and `right`
 * documents using `Cat`.
 *
 *
 * ```typescript
 * import { pipe } from '@effect-ts/core/Function'
 *
 * import * as D from '@effect-ts/printer/Core/Doc'
 * import * as R from '@effect-ts/printer/Core/Render'
 *
 * // The `surround` combinator is just a reordering of the arguments to `enclose`,
 * // but allows for useful definitions such as:
 * const doc = pipe(
 *   D.words<never>('prettyprinter-ts lib Doc'),
 *   D.concatWith(D.surround(D.slash))
 * )
 *
 * console.log(R.render(doc))
 * // @effect-ts/printer/Core/Doc
 * ```
 */
export function surround<A>(doc: Doc<A>) {
  return (left: Doc<A>, right: Doc<A>): Doc<A> => cat_(left, cat_(doc, right))
}

/**
 * Encloses the input document in parentheses (`()`).
 */
export function parens<A>(doc: Doc<A>): Doc<A> {
  return enclose_(doc, lparen, rparen)
}

/**
 * Encloses the input document in angle brackets (`<>`).
 */
export function angles<A>(doc: Doc<A>): Doc<A> {
  return enclose_(doc, langle, rangle)
}

/**
 * Encloses the input document in brackets (`[]`).
 */
export function brackets<A>(doc: Doc<A>): Doc<A> {
  return enclose_(doc, lbracket, rbracket)
}

/**
 * Encloses the input document in braces (`{}`).
 *
 * @category primitive combinators
 * @since 0.0.1
 */
export function braces<A>(doc: Doc<A>): Doc<A> {
  return enclose_(doc, lbrace, rbrace)
}

/**
 * Encloses the input document in single quotes (`''`).
 *
 * @category primitive combinators
 * @since 0.0.1
 */
export function squotes<A>(doc: Doc<A>): Doc<A> {
  return enclose_(doc, squote, squote)
}

/**
 * Encloses the input document in double quotes (`""`).
 *
 * @category primitive combinators
 * @since 0.0.1
 */
export function dquotes<A>(doc: Doc<A>): Doc<A> {
  return enclose_(doc, dquote, dquote)
}

/**
 * The `spaces` combinator lays out a document containing `n` spaces. Negative values
 * for `n` count as `0` spaces.
 *
 * ```typescript
 * import * as D from '@effect-ts/printer/Core/Doc'
 * import * as R from '@effect-ts/printer/Core/Render'
 *
 * const doc = D.brackets(D.dquotes(D.spaces(5)))
 *
 * console.log(R.render(doc))
 * // ["     "]
 * ```
 */
export function spaces(n: number): Doc<never> {
  if (n <= 0) return empty
  if (n === 1) return char(" ")
  return text(textSpaces(n))
}

/**
 * Splits a string of words into individual `Text` documents using the
 * specified `char` to split on (defaults to `' '`).
 *
 * ```typescript
 * import * as D from '@effect-ts/printer/Core/Doc'
 * import * as R from '@effect-ts/printer/Core/Render'
 *
 * const doc = D.tupled(D.words('Lorem ipsum dolor'))
 *
 * console.log(R.render(doc))
 * // (lorem, ipsum, dolor)
 * ```
 */
export function words(s: string, char = " "): Array<Doc<never>> {
  return A.map_(s.split(char), string)
}

/**
 * Splits a string of words into individual `Text` documents using the
 * specified `char` to split on (defaults to `' '`). In addition, a
 * `softLine` is inserted in between each word so that if the text
 * exceeds the available width it will be broken into multiple lines.
 *
 * ```typescript
 * import { pipe } from '@effect-ts/core/Function'
 *
 * import * as D from '@effect-ts/printer/Core/Doc'
 * import * as R from '@effect-ts/printer/Core/Render'
 *
 * const doc = D.reflow(
 *   'Lorem ipsum dolor sit amet, consectetur adipisicing elit, ' +
 *     'sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.'
 * )
 *
 * console.log(pipe(doc, R.renderWidth(32)))
 * // Lorem ipsum dolor sit amet,
 * // consectetur adipisicing elit,
 * // sed do eiusmod tempor incididunt
 * // ut labore et dolore magna
 * // aliqua.
 * ```
 */
export function reflow(s: string, char = " "): Doc<never> {
  return fillSep(words(s, char))
}

// -------------------------------------------------------------------------------------
// instances
// -------------------------------------------------------------------------------------

export const DocURI = "@effect-ts/pretty/DocURI"

export type DocURI = typeof DocURI

declare module "@effect-ts/core/Prelude/HKT" {
  export interface URItoKind<FC, TC, K, Q, W, X, I, S, R, E, A> {
    readonly [DocURI]: Doc<A>
  }
}

export function getAssociative<A>(): Associative<Doc<A>> {
  return Assoc.makeAssociative(cat_)
}

export function getIdentity<A>(): Identity<Doc<A>> {
  return Ident.makeIdentity<Doc<A>>(empty, cat_)
}

export const Covariant = P.instance<P.Covariant<[URI<DocURI>]>>({
  map
})

// -------------------------------------------------------------------------------------
// utils
// -------------------------------------------------------------------------------------

/**
 * Constructs a string containing `n` space characters.
 */
export function textSpaces(n: number) {
  let s = " "
  for (let i = 1; i < n; i++) {
    s = s += " "
  }
  return s
}
