// tracing: off

import type { Array } from "@effect-ts/core/Array"
import * as A from "@effect-ts/core/Array"
import type { Associative } from "@effect-ts/core/Associative"
import * as Assoc from "@effect-ts/core/Associative"
import { constant, identity, pipe } from "@effect-ts/core/Function"
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
export const char = (char: string): Doc<never> => new Char(char, identity)

/**
 * A document containing a string of text.
 *
 * **Invariants**
 * - Text cannot be less than two characters long
 * - Text cannot contain a newline (`"\n"`) character
 */
export const text = (text: string): Doc<never> => new Text(text, identity)

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
export const flatAlt = <A, B>(left: Doc<A>, right: Doc<B>): Doc<A | B> =>
  new FlatAlt<A | B>(left, right)

export const union = <A, B>(left: Doc<A>, right: Doc<B>): Doc<A | B> =>
  new Union<A | B>(left, right)

export const cat = <A, B>(left: Doc<A>, right: Doc<B>): Doc<A | B> =>
  new Cat<A | B>(left, right)

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
export const line: Doc<never> = flatAlt(line_, char(" "))

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
export const lineBreak: Doc<never> = flatAlt(line_, empty)

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
export const softLine: Doc<never> = union(char(" "), line_)

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
export const softLineBreak: Doc<never> = union(empty, line_)

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
 */
export const nest = (indent: number) => <A>(doc: Doc<A>): Doc<A> =>
  indent === 0 ? doc : new Nest(indent, doc)

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
export const column = <A>(react: (position: number) => Doc<A>): Doc<A> =>
  new Column(react)

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
export const nesting = <A>(react: (level: number) => Doc<A>): Doc<A> =>
  new Nesting(react)

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
export const withPageWidth = <A>(react: (pageWidth: PageWidth) => Doc<A>): Doc<A> =>
  new WithPageWidth(react)

/**
 * Adds an annotation to a `Doc`. The annotation can then be used by the rendering
 * algorithm to, for example, add color to certain parts of the output.
 *
 * **Note** This function is relevant only for custom formats with their own annotations,
 * and is not relevant for basic pretty printing.
 */
export const annotate = <A>(annotation: A, doc: Doc<A>): Doc<A> =>
  new Annotated(annotation, doc)

// -------------------------------------------------------------------------------------
// destructors
// -------------------------------------------------------------------------------------

export const match = <A, R>(patterns: {
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
}): ((doc: Doc<A>) => R) => {
  const f = (x: Doc<A>): R => {
    switch (x._tag) {
      case "Fail":
        return patterns.Fail()
      case "Empty":
        return patterns.Empty()
      case "Char":
        return patterns.Char(x.char)
      case "Text":
        return patterns.Text(x.text)
      case "Line":
        return patterns.Line()
      case "FlatAlt":
        return patterns.FlatAlt(x.left, x.right)
      case "Cat":
        return patterns.Cat(x.left, x.right)
      case "Nest":
        return patterns.Nest(x.indent, x.doc)
      case "Union":
        return patterns.Union(x.left, x.right)
      case "Column":
        return patterns.Column(x.react)
      case "WithPageWidth":
        return patterns.WithPageWidth(x.react)
      case "Nesting":
        return patterns.Nesting(x.react)
      case "Annotated":
        return patterns.Annotated(x.annotation, x.doc)
    }
  }
  return f
}

// -------------------------------------------------------------------------------------
// operations
// -------------------------------------------------------------------------------------

export const isFail = <A>(doc: Doc<A>): doc is Fail<A> => doc._tag === "Fail"

export const isEmpty = <A>(doc: Doc<A>): doc is Empty<A> => doc._tag === "Empty"

export const isChar = <A>(doc: Doc<A>): doc is Char<A> => doc._tag === "Char"

export const isText = <A>(doc: Doc<A>): doc is Text<A> => doc._tag === "Text"

export const isLine = <A>(doc: Doc<A>): doc is Line<A> => doc._tag === "Line"

export const isFlatAlt = <A>(doc: Doc<A>): doc is FlatAlt<A> => doc._tag === "FlatAlt"

export const isCat = <A>(doc: Doc<A>): doc is Cat<A> => doc._tag === "Cat"

export const isNest = <A>(doc: Doc<A>): doc is Nest<A> => doc._tag === "Nest"

export const isUnion = <A>(doc: Doc<A>): doc is Union<A> => doc._tag === "Union"

export const isColumn = <A>(doc: Doc<A>): doc is Column<A> => doc._tag === "Column"

export const isWithPageWidth = <A>(doc: Doc<A>): doc is WithPageWidth<A> =>
  doc._tag === "WithPageWidth"

export const isNesting = <A>(doc: Doc<A>): doc is Nesting<A> => doc._tag === "Nesting"

export const isAnnotated = <A>(doc: Doc<A>): doc is Annotated<A> =>
  doc._tag === "Annotated"

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
 * `alterAnnotationsS` from the `SimpleDocStream` module.
 */
export const alterAnnotations = <A, B>(
  f: (a: A) => Array<B>
): ((doc: Doc<A>) => Doc<B>) => {
  const go = (x: Doc<A>): IO.IO<Doc<B>> =>
    IO.gen(function* (_) {
      switch (x._tag) {
        case "Cat":
          return cat(yield* _(go(x.left)), yield* _(go(x.right)))
        case "FlatAlt":
          return flatAlt(yield* _(go(x.left)), yield* _(go(x.right)))
        case "Union":
          return union(yield* _(go(x.left)), yield* _(go(x.right)))
        case "Nest":
          return nest(x.indent)(yield* _(go(x.doc)))
        case "Column":
          return column((position) => IO.run(go(x.react(position))))
        case "WithPageWidth":
          return withPageWidth((pageWidth) => IO.run(go(x.react(pageWidth))))
        case "Nesting":
          return nesting((level) => IO.run(go(x.react(level))))
        case "Annotated":
          return A.reduceRight_(f(x.annotation), yield* _(go(x.doc)), annotate)
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
  return (_) => IO.run(go(_))
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
 */
export const reAnnotate: <A, B>(f: (a: A) => B) => (doc: Doc<A>) => Doc<B> = (f) =>
  alterAnnotations((_) => A.single(f(_)))

export const map: <A, B>(f: (a: A) => B) => (fa: Doc<A>) => Doc<B> = (f) =>
  reAnnotate(f)

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
 */
export const concatWith: <A>(
  f: (x: Doc<A>, y: Doc<A>) => Doc<A>
) => (docs: Array<Doc<A>>) => Doc<A> = (f) =>
  A.foldRight(
    () => empty,
    (init, last) => pipe(init, A.reduceRight(last, f))
  )

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
export const appendWithSpace: <A>(x: Doc<A>, y: Doc<A>) => Doc<A> = (x, y) =>
  cat(x, cat(space, y))

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
export const appendWithLine: <A>(x: Doc<A>, y: Doc<A>) => Doc<A> = (x, y) =>
  cat(x, cat(line, y))

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
export const appendWithLineBreak: <A>(x: Doc<A>, y: Doc<A>) => Doc<A> = (x, y) =>
  cat(x, cat(lineBreak, y))

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
export const appendWithSoftLine: <A>(x: Doc<A>, y: Doc<A>) => Doc<A> = (x, y) =>
  cat(x, cat(softLine, y))

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
export const appendWithSoftLineBreak: <A>(x: Doc<A>, y: Doc<A>) => Doc<A> = (x, y) =>
  cat(x, cat(softLineBreak, y))

// -------------------------------------------------------------------------------------
// alternative combinators
// -------------------------------------------------------------------------------------

/**
 * Flattens a document but does not report changes.
 */
const flatten = <A>(doc: Doc<A>): Doc<A> => {
  const go = (x: Doc<A>): IO.IO<Doc<A>> =>
    IO.gen(function* (_) {
      switch (x._tag) {
        case "Line":
          return fail
        case "Cat":
          return cat(yield* _(go(x.left)), yield* _(go(x.right)))
        case "FlatAlt":
          return yield* _(go(x.right))
        case "Union":
          return yield* _(go(x.left))
        case "Nest":
          return nest(x.indent)(yield* _(go(x.doc)))
        case "Column":
          return column((position) => IO.run(go(x.react(position))))
        case "WithPageWidth":
          return withPageWidth((pageWidth) => IO.run(go(x.react(pageWidth))))
        case "Nesting":
          return nesting((level) => IO.run(go(x.react(level))))
        case "Annotated": {
          const doc = yield* _(go(x.doc))
          return annotate(x.annotation, doc)
        }
        default:
          return x
      }
    })
  return pipe(go(doc), IO.run)
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
  const go = (x: Doc<A>): IO.IO<Flatten<Doc<A>>> =>
    IO.gen(function* (_) {
      switch (x._tag) {
        case "FlatAlt":
          return F.flattened(flatten(x.right))
        case "Cat": {
          const left = yield* _(go(x.left))
          const right = yield* _(go(x.right))

          if (F.isNeverFlat(left) || F.isNeverFlat(right)) {
            return F.neverFlat
          }
          if (F.isFlattened(left) && F.isFlattened(right)) {
            return F.flattened(cat(left.value, right.value))
          }
          if (F.isFlattened(left) && F.isAlreadyFlat(right)) {
            return F.flattened(cat(left.value, x.right))
          }
          if (F.isAlreadyFlat(left) && F.isFlattened(right)) {
            return F.flattened(cat(x.left, right.value))
          }
          if (F.isAlreadyFlat(left) && F.isAlreadyFlat(right)) {
            return F.alreadyFlat
          }

          throw new Error("bug, it seems we didn't manage a branch")
        }
        case "Nest":
          return pipe(yield* _(go(x.doc)), F.map(nest(x.indent)))
        case "Union":
          return F.flattened(x.left)
        case "Column":
          return F.flattened(column((y) => flatten(x.react(y))))
        case "WithPageWidth":
          return F.flattened(withPageWidth((y) => flatten(x.react(y))))
        case "Nesting":
          return F.flattened(nesting((y) => flatten(x.react(y))))
        case "Annotated":
          return pipe(
            yield* _(go(x.doc)),
            F.map((d) => annotate(x.annotation, d))
          )
        default:
          return F.alreadyFlat
      }
    })
  return pipe(go(doc), IO.run)
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
    pipe(
      changesUponFlattening(a),
      F.match({
        Flattened: (b) => union(b, a),
        AlreadyFlat: () => a,
        NeverFlat: () => a
      })
    )
  return pipe(
    doc,
    match({
      Fail: () => group_(doc),
      Empty: () => group_(doc),
      Char: () => group_(doc),
      Text: () => group_(doc),
      Line: () => group_(doc),
      FlatAlt: (a, b) =>
        pipe(
          changesUponFlattening(b),
          F.match({
            Flattened: (b_) => union(b_, a),
            AlreadyFlat: () => union(b, a),
            NeverFlat: () => a
          })
        ),
      Cat: () => group_(doc),
      Nest: () => group_(doc),
      Union: () => doc,
      Column: () => group_(doc),
      WithPageWidth: () => group_(doc),
      Nesting: () => group_(doc),
      Annotated: () => group_(doc)
    })
  )
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
export const hsep: <A>(docs: Array<Doc<A>>) => Doc<A> = concatWith(appendWithSpace)

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
export const vsep: <A>(docs: Array<Doc<A>>) => Doc<A> = concatWith(appendWithLine)

/**
 * The `fillSep` combinator concatenates all documents in a list horizontally by placing
 * a `space` between each pair of documents as long as they fit the page. Once the page
 * width is exceeded, a `line` is inserted and the process is repeated for all documents
 * in the list. **Note** that the use of `line` means that if `group`ed, the documents
 * will be separated with a `space` instead of newlines. See `fillCat` if you do not want
 * a `space`.
 */
export const fillSep: <A>(docs: Array<Doc<A>>) => Doc<A> = concatWith(
  appendWithSoftLine
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
export const hcat: <A>(docs: Array<Doc<A>>) => Doc<A> = concatWith(cat)

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
export const vcat: <A>(docs: Array<Doc<A>>) => Doc<A> = concatWith(appendWithLineBreak)

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
  appendWithSoftLineBreak
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
export const cats: <A>(docs: Array<Doc<A>>) => Doc<A> = (_) => group(vcat(_))

/**
 * Tupled variant of cats
 */
export const catsT: <Docs extends Array<Doc<any>>>(
  ...docs: Docs
) => Doc<_A<Docs[number]>> = (..._) => cats(_)

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
 */
export const fill: (width: number) => <A>(doc: Doc<A>) => Doc<A> = (lw) => (x) =>
  pipe(
    x,
    width((w) => spaces(lw - w))
  )

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
 */
export const fillBreak: (width: number) => <A>(doc: Doc<A>) => Doc<A> = (lw) => (x) =>
  pipe(
    x,
    width((w) => (w > lw ? nest(lw)(lineBreak) : spaces(lw - w)))
  )

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
export const align = <A>(doc: Doc<A>): Doc<A> =>
  column((k) => nesting((i) => nest(k - i)(doc)))

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
 */
export const hang = (indent: number): (<A>(doc: Doc<A>) => Doc<A>) => (_) =>
  align(nest(indent)(_))

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
 */
export const indent = (indent: number) => <A>(doc: Doc<A>): Doc<A> =>
  pipe(cat(spaces(indent), doc), hang(indent))

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
 */
export const encloseSep = <A, B, C>(left: Doc<A>, right: Doc<B>, sep: Doc<C>) => <D>(
  docs: Array<Doc<D>>
): Doc<A | B | C | D> => {
  if (docs.length === 0) return cat(left, right)
  if (docs.length === 1) return cat(left, cat(docs[0]!, right))
  const xs = pipe(
    pipe(A.cons_(A.replicate(sep)(docs.length - 1), left as Doc<A | C>)),
    A.zipWith(docs, cat)
  )
  return cat(cats(xs), right)
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
export const list = <A>(docs: Array<Doc<A>>): Doc<A> =>
  pipe(
    docs,
    encloseSep(
      flatAlt(char("[ "), lbracket),
      flatAlt(char(" ]"), rbracket),
      char(", ")
    ),
    group
  )

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
export const tupled = <A>(docs: Array<Doc<A>>): Doc<A> =>
  pipe(
    docs,
    encloseSep(flatAlt(char("( "), lparen), flatAlt(char(" )"), rparen), char(", ")),
    group
  )

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
 */
export const width = <A>(react: (width: number) => Doc<A>) => <B>(
  doc: Doc<B>
): Doc<A | B> =>
  column((colStart) =>
    cat(
      doc,
      column((colEnd) => react(colEnd - colStart))
    )
  )

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
 */
export const punctuate = <A>(punctuator: Doc<A>) => (
  docs: Array<Doc<A>>
): Array<Doc<A>> =>
  pipe(
    docs,
    A.mapWithIndex((i, x) => (docs.length - 1 === i ? x : cat(x, punctuator)))
  )

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
 */
export const enclose = <A>(left: Doc<A>, right: Doc<A>) => (doc: Doc<A>): Doc<A> =>
  cat(left, cat(doc, right))

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
export const surround = <A>(doc: Doc<A>) => (left: Doc<A>, right: Doc<A>): Doc<A> =>
  cat(left, cat(doc, right))

/**
 * Encloses the input document in parentheses (`()`).
 */
export const parens = <A>(doc: Doc<A>): Doc<A> => pipe(doc, enclose<A>(lparen, rparen))

/**
 * Encloses the input document in angle brackets (`<>`).
 */
export const angles = <A>(doc: Doc<A>): Doc<A> => pipe(doc, enclose<A>(langle, rangle))

/**
 * Encloses the input document in brackets (`[]`).
 */
export const brackets = <A>(doc: Doc<A>): Doc<A> =>
  pipe(doc, enclose<A>(lbracket, rbracket))

/**
 * Encloses the input document in braces (`{}`).
 *
 * @category primitive combinators
 * @since 0.0.1
 */
export const braces = <A>(doc: Doc<A>): Doc<A> => pipe(doc, enclose<A>(lbrace, rbrace))

/**
 * Encloses the input document in single quotes (`''`).
 *
 * @category primitive combinators
 * @since 0.0.1
 */
export const squotes = <A>(doc: Doc<A>): Doc<A> => pipe(doc, enclose<A>(squote, squote))

/**
 * Encloses the input document in double quotes (`""`).
 *
 * @category primitive combinators
 * @since 0.0.1
 */
export const dquotes = <A>(doc: Doc<A>): Doc<A> => pipe(doc, enclose<A>(dquote, dquote))

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
export const spaces = (n: number): Doc<never> => {
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
export const words = (s: string, char = " "): Array<Doc<never>> =>
  pipe(s.split(char), A.map<string, Doc<never>>(text))

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
export const reflow = (s: string, char = " "): Doc<never> =>
  pipe(words(s, char), fillSep)

// -------------------------------------------------------------------------------------
// instances
// -------------------------------------------------------------------------------------

export const DocURI = "@effect-ts/pretty/DocURI"

export type DocURI = typeof DocURI

declare module "@effect-ts/core/Prelude/HKT" {
  /* eslint-disable @typescript-eslint/no-unused-vars */
  export interface URItoKind<FC, TC, K, Q, W, X, I, S, R, E, A> {
    readonly [DocURI]: Doc<A>
  }
  /* eslint-enable @typescript-eslint/no-unused-vars */
}

export const getAssociative = <A>(): Associative<Doc<A>> => Assoc.makeAssociative(cat)

export const getIdentity = <A>(): Identity<Doc<A>> =>
  Ident.makeIdentity<Doc<A>>(empty, cat)

export const Covariant = P.instance<P.Covariant<[URI<DocURI>]>>({
  map
})

// -------------------------------------------------------------------------------------
// utils
// -------------------------------------------------------------------------------------

/**
 * Constructs a string containing `n` space characters.
 */
export const textSpaces: (n: number) => string = (_) =>
  Ident.fold(Ident.string)(A.replicate(" ")(_))
