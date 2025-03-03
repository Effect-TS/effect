/**
 * The abstract data type `Doc<A>` represents prettified documents that have
 * been annotated with data of type `A`.
 *
 * More specifically, a value of type `Doc` represents a non-empty set of
 * possible layouts for a given document. The layout algorithms select one of
 * these possibilities, taking into account variables such as the width of the
 * document.
 *
 * The annotation is an arbitrary piece of data associated with (part of) a
 * document. Annotations may be used by rendering algorithms to display
 * documents differently by providing information such as:
 * - color information (e.g., when rendering to the terminal)
 * - mouseover text (e.g., when rendering to rich HTML)
 * - whether to show something or not (to allow simple or detailed versions)
 *
 * @since 1.0.0
 */

import type * as covariant from "@effect/typeclass/Covariant"
import type * as invariant from "@effect/typeclass/Invariant"
import type { Monoid } from "@effect/typeclass/Monoid"
import type { Semigroup } from "@effect/typeclass/Semigroup"
import type { Equal } from "effect/Equal"
import type { TypeLambda } from "effect/HKT"
import type { Pipeable } from "effect/Pipeable"
import type { DocStream } from "./DocStream.js"
import type { Flatten } from "./Flatten.js"
import * as internal from "./internal/doc.js"
import * as InternalRender from "./internal/render.js"
import type { AvailablePerLine, PageWidth } from "./PageWidth.js"

// -----------------------------------------------------------------------------
// Models
// -----------------------------------------------------------------------------

/**
 * @since 1.0.0
 * @category symbol
 */
export const DocTypeId: unique symbol = internal.DocTypeId as DocTypeId

/**
 * @since 1.0.0
 * @category symbol
 */
export type DocTypeId = typeof DocTypeId

/**
 * Represents a prettified document that has been annotated with data of type
 * `A`.
 *
 * @since 1.0.0
 * @category model
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
 * @since 1.0.0
 */
export declare namespace Doc {
  /**
   * @since 1.0.0
   * @category model
   */
  export interface Variance<A> extends Equal, Pipeable {
    readonly [DocTypeId]: {
      readonly _A: () => A
    }
  }

  /**
   * @since 1.0.0
   */
  export type TypeLambda = DocTypeLambda

  /**
   * @since 1.0.0
   * @category model
   */
  export type RenderConfig = Compact | Pretty | Smart
  /**
   * @since 1.0.0
   * @category model
   */
  export interface Compact {
    readonly style: "compact"
  }

  /**
   * @since 1.0.0
   * @category model
   */
  export interface Pretty {
    readonly style: "pretty"
    readonly options?: Partial<Omit<AvailablePerLine, "_tag">>
  }

  /**
   * @since 1.0.0
   * @category model
   */
  export interface Smart {
    readonly style: "smart"
    readonly options?: Partial<Omit<AvailablePerLine, "_tag">>
  }
}

/**
 * @since 1.0.0
 * @category model
 */
export interface DocTypeLambda extends TypeLambda {
  readonly type: Doc<this["Target"]>
}

/**
 * Represents a document that cannot be rendered. Generally occurs when
 * flattening a line. The layout algorithms will reject this document and choose
 * a more suitable rendering.
 *
 * @since 1.0.0
 * @category model
 */
export interface Fail<A> extends Doc.Variance<A> {
  readonly _tag: "Fail"
}

/**
 * Represents the empty document.
 *
 * Conceptually, the `Empty` document can be thought of as the unit of `Cat`.
 *
 * @since 1.0.0
 * @category model
 */
export interface Empty<A> extends Doc.Variance<A> {
  readonly _tag: "Empty"
}

/**
 * Represents a document containing a single character.
 *
 * **Invariants**
 * - Cannot be the newline (`"\n"`) character
 *
 * @since 1.0.0
 * @category model
 */
export interface Char<A> extends Doc.Variance<A> {
  readonly _tag: "Char"
  readonly char: string
}

/**
 * Represents a document containing a string of text.
 *
 * **Invariants**
 * - Text cannot be less than two characters long
 * - Text cannot contain a newline (`"\n"`) character
 *
 * @since 1.0.0
 * @category model
 */
export interface Text<A> extends Doc.Variance<A> {
  readonly _tag: "Text"
  readonly text: string
}

/**
 * Represents a document that contains a hard line break.
 *
 * @since 1.0.0
 * @category model
 */
export interface Line<A> extends Doc.Variance<A> {
  readonly _tag: "Line"
}

/**
 * Represents a flattened alternative of two documents. The layout algorithms
 * will choose the first document, but when flattened (via `group`) the second
 * document will be preferreinternal.
 *
 * The layout algorithms operate under the assumption that the first alternative
 * is less wide than the flattened second alternative.
 *
 * @since 1.0.0
 * @category model
 */
export interface FlatAlt<A> extends Doc.Variance<A> {
  readonly _tag: "FlatAlt"
  readonly left: Doc<A>
  readonly right: Doc<A>
}

/**
 * Represents the concatenation of two documents.
 *
 * @since 1.0.0
 * @category model
 */
export interface Cat<A> extends Doc.Variance<A> {
  readonly _tag: "Cat"
  readonly left: Doc<A>
  readonly right: Doc<A>
}

/**
 * Represents a document that is indented by a certain number of columns.
 *
 * @since 1.0.0
 * @category model
 */
export interface Nest<A> extends Doc.Variance<A> {
  readonly _tag: "Nest"
  readonly indent: number
  readonly doc: Doc<A>
}

/**
 * Represents the union of two documents. Used to implement layout alternatives
 * for `group`.
 *
 * **Invariants**
 * - The first lines of the first document should be longer than the first lines
 *   of the second document so that the layout algorithm can pick the document
 *   with the best fit.
 *
 * @since 1.0.0
 * @category model
 */
export interface Union<A> extends Doc.Variance<A> {
  readonly _tag: "Union"
  readonly left: Doc<A>
  readonly right: Doc<A>
}

/**
 * Represents a document that reacts to the current cursor position.
 *
 * @since 1.0.0
 * @category model
 */
export interface Column<A> extends Doc.Variance<A> {
  readonly _tag: "Column"
  readonly react: (position: number) => Doc<A>
}

/**
 * Represents a document that reacts to the current page width.
 *
 * @since 1.0.0
 * @category model
 */
export interface WithPageWidth<A> extends Doc.Variance<A> {
  readonly _tag: "WithPageWidth"
  readonly react: (pageWidth: PageWidth) => Doc<A>
}

/**
 * Represents a document that reacts to the current page width.
 *
 * @since 1.0.0
 * @category model
 */
export interface WithPageWidth<A> extends Doc.Variance<A> {
  readonly _tag: "WithPageWidth"
  readonly react: (pageWidth: PageWidth) => Doc<A>
}

/**
 * Represents a document that reacts to the current nesting level.
 *
 * @since 1.0.0
 * @category model
 */
export interface Nesting<A> extends Doc.Variance<A> {
  readonly _tag: "Nesting"
  readonly react: (level: number) => Doc<A>
}

/**
 * Represents a document with an associated annotation.
 *
 * @since 1.0.0
 * @category model
 */
export interface Annotated<A> extends Doc.Variance<A> {
  readonly _tag: "Annotated"
  readonly annotation: A
  readonly doc: Doc<A>
}

// -----------------------------------------------------------------------------
// Refinements
// -----------------------------------------------------------------------------

/**
 * Returns `true` if the specified value is a `Doc`, `false` otherwise.
 *
 * @since 1.0.0
 * @category refinements
 */
export const isDoc: (u: unknown) => u is Doc<unknown> = internal.isDoc

/**
 * Returns `true` if the specified `Doc` is a `Fail`, `false` otherwise.
 *
 * @since 1.0.0
 * @category refinements
 */
export const isFail: <A>(self: Doc<A>) => self is Fail<A> = internal.isFail

/**
 * Returns `true` if the specified `Doc` is an `Empty`, `false` otherwise.
 *
 * @since 1.0.0
 * @category refinements
 */
export const isEmpty: <A>(self: Doc<A>) => self is Empty<A> = internal.isEmpty

/**
 * Returns `true` if the specified `Doc` is a `Char`, `false` otherwise.
 *
 * @since 1.0.0
 * @category refinements
 */
export const isChar: <A>(self: Doc<A>) => self is Char<A> = internal.isChar

/**
 * Returns `true` if the specified `Doc` is a `Text`, `false` otherwise.
 *
 * @since 1.0.0
 * @category refinements
 */
export const isText: <A>(self: Doc<A>) => self is Text<A> = internal.isText

/**
 * Returns `true` if the specified `Doc` is a `Line`, `false` otherwise.
 *
 * @since 1.0.0
 * @category refinements
 */
export const isLine: <A>(self: Doc<A>) => self is Line<A> = internal.isLine

/**
 * Returns `true` if the specified `Doc` is a `FlatAlt`, `false` otherwise.
 *
 * @since 1.0.0
 * @category refinements
 */
export const isFlatAlt: <A>(self: Doc<A>) => self is FlatAlt<A> = internal.isFlatAlt

/**
 * Returns `true` if the specified `Doc` is a `Cat`, `false` otherwise.
 *
 * @since 1.0.0
 * @category refinements
 */
export const isCat: <A>(self: Doc<A>) => self is Cat<A> = internal.isCat

/**
 * Returns `true` if the specified `Doc` is a `Nest`, `false` otherwise.
 *
 * @since 1.0.0
 * @category refinements
 */
export const isNest: <A>(self: Doc<A>) => self is Nest<A> = internal.isNest

/**
 * Returns `true` if the specified `Doc` is a `Union`, `false` otherwise.
 *
 * @since 1.0.0
 * @category refinements
 */
export const isUnion: <A>(self: Doc<A>) => self is Union<A> = internal.isUnion

/**
 * Returns `true` if the specified `Doc` is a `Column`, `false` otherwise.
 *
 * @since 1.0.0
 * @category refinements
 */
export const isColumn: <A>(self: Doc<A>) => self is Column<A> = internal.isColumn

/**
 * Returns `true` if the specified `Doc` is a `WithPageWidth`, `false` otherwise.
 *
 * @since 1.0.0
 * @category refinements
 */
export const isWithPageWidth = internal.isWithPageWidth

/**
 * Returns `true` if the specified `Doc` is a `Nesting`, `false` otherwise.
 *
 * @since 1.0.0
 * @category refinements
 */
export const isNesting: <A>(self: Doc<A>) => self is Nesting<A> = internal.isNesting

/**
 * Returns `true` if the specified `Doc` is a `Annotated`, `false` otherwise.
 *
 * @since 1.0.0
 * @category refinements
 */
export const isAnnotated: <A>(self: Doc<A>) => self is Annotated<A> = internal.isAnnotated

// -----------------------------------------------------------------------------
// Constructors
// -----------------------------------------------------------------------------

/**
 * A document containing a single character.
 *
 * **Invariants**
 * - Cannot be the newline (`"\n"`) character
 *
 * @since 1.0.0
 * @category constructors
 */
export const char: (char: string) => Doc<never> = internal.char

/**
 * A document containing a string of text.
 *
 * **Invariants**
 * - Text cannot be less than two characters long
 * - Text cannot contain a newline (`"\n"`) character
 *
 * @since 1.0.0
 * @category constructors
 */
export const text: (text: string) => Doc<never> = internal.text

/**
 * Constructs a document containing a string of text.
 *
 * **Note**: newline characters (`\n`) contained in the provided string will be
 * disregarded (i.e. not rendered) in the output document.
 *
 * @since 1.0.0
 * @category constructors
 */
export const string: (str: string) => Doc<never> = internal.string

// -----------------------------------------------------------------------------
// Primitives
// -----------------------------------------------------------------------------

/**
 * The `empty` document behaves like a document containing the empty string
 * (`""`), so it has a height of `1`.
 *
 * This may lead to surprising behavior if the empty document is expected to
 * bear no weight inside certain layout functions, such as`vcat`, where it will
 * render an empty line of output.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import * as Doc from "@effect/printer/Doc"
 * import * as String from "effect/String"
 *
 * const doc = Doc.vsep([
 *   Doc.text("hello"),
 *   // `parentheses` for visibility purposes only
 *   Doc.parenthesized(Doc.empty),
 *   Doc.text("world")
 * ])
 *
 * const expected = `|hello
 *                   |()
 *                   |world`
 *
 * assert.strictEqual(
 *   Doc.render(doc, { style: "pretty" }),
 *   String.stripMargin(expected)
 * )
 * ```
 *
 * @since 1.0.0
 * @category primitives
 */
export const empty: Doc<never> = internal.empty

/**
 * The `fail` document is a document that cannot be rendered.
 *
 * Generally occurs when flattening a line. The layout algorithms will reject
 * this document and choose a more suitable rendering.
 *
 * @since 1.0.0
 * @category primitives
 */
export const fail: Doc<never> = internal.fail

/**
 * The `line` document advances to the next line and indents to the current
 * nesting level. However, `line` will behave like `space` if the line break is
 * undone by `group`.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import * as Doc from "@effect/printer/Doc"
 * import * as String from "effect/String"
 *
 * const doc: Doc.Doc<never> = Doc.hcat([
 *   Doc.text("lorem ipsum"),
 *   Doc.line,
 *   Doc.text("dolor sit amet")
 * ])
 *
 * assert.strictEqual(
 *   Doc.render(doc, { style: "pretty" }),
 *   String.stripMargin(
 *     `|lorem ipsum
 *      |dolor sit amet`
 *   )
 * )
 * assert.strictEqual(
 *   Doc.render(Doc.group(doc), { style: "pretty" }),
 *   "lorem ipsum dolor sit amet"
 * )
 * ```
 *
 * @since 1.0.0
 * @category primitives
 */
export const line: Doc<never> = internal.line

/**
 * The `lineBreak` document is like `line` but behaves like `empty` if the line
 * break is undone by `group` (instead of `space`).
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import * as Doc from "@effect/printer/Doc"
 * import * as String from "effect/String"
 *
 * const doc: Doc.Doc<never> = Doc.hcat([
 *   Doc.text("lorem ipsum"),
 *   Doc.lineBreak,
 *   Doc.text("dolor sit amet")
 * ])
 *
 * assert.strictEqual(
 *   Doc.render(doc, { style: "pretty" }),
 *   String.stripMargin(
 *     `|lorem ipsum
 *      |dolor sit amet`
 *   )
 * )
 * assert.strictEqual(
 *   Doc.render(Doc.group(doc), { style: "pretty" }),
 *   "lorem ipsumdolor sit amet"
 * )
 * ```
 *
 * @since 1.0.0
 * @category primitives
 */
export const lineBreak: Doc<never> = internal.lineBreak

/**
 * The `softLine` document behaves like `space` if the resulting output fits
 * onto the page, otherwise it behaves like `line`.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import * as Doc from "@effect/printer/Doc"
 * import * as String from "effect/String"
 *
 * const doc: Doc.Doc<never> = Doc.hcat([
 *   Doc.text("lorem ipsum"),
 *   Doc.softLine,
 *   Doc.text("dolor sit amet")
 * ])
 *
 * // Here we have enough space to put everything onto one line
 * assert.strictEqual(
 *   Doc.render(doc, {
 *     style: "pretty",
 *     options: { lineWidth: 80 }
 *   }),
 *   "lorem ipsum dolor sit amet"
 * )
 *
 * // If the page width is narrowed to `10`, the layout algorithm will
 * // introduce a line break
 * assert.strictEqual(
 *   Doc.render(Doc.group(doc), {
 *     style: "pretty",
 *     options: { lineWidth: 10 }
 *   }),
 *   String.stripMargin(
 *     `|lorem ipsum
 *      |dolor sit amet`
 *   )
 * )
 * ```
 *
 * @since 1.0.0
 * @category primitives
 */
export const softLine: Doc<never> = internal.softLine

/**
 * The `softLineBreak` document is similar to `softLine`, but behaves like
 * `empty` if the resulting output does not fit onto the page (instead of
 * `space`).
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import * as Doc from "@effect/printer/Doc"
 * import * as String from "effect/String"
 *
 * const doc: Doc.Doc<never> = Doc.hcat([
 *   Doc.text("ThisText"),
 *   Doc.softLineBreak,
 *   Doc.text("IsWayTooLong")
 * ])
 *
 * // With enough space, we get direct concatenation of documents:
 * assert.strictEqual(
 *   Doc.render(doc, {
 *     style: "pretty",
 *     options: { lineWidth: 80 }
 *   }),
 *   "ThisTextIsWayTooLong"
 * )
 *
 * // If the page width is narrowed to `10`, the layout algorithm will
 * // introduce a line break
 * assert.strictEqual(
 *   Doc.render(Doc.group(doc), {
 *     style: "pretty",
 *     options: { lineWidth: 10 }
 *   }),
 *   String.stripMargin(
 *     `|ThisText
 *      |IsWayTooLong`
 *   )
 * )
 * ```
 *
 * @since 1.0.0
 * @category primitives
 */
export const softLineBreak: Doc<never> = internal.softLineBreak

/**
 * The `hardLine` document is always laid out as a line break, regardless of
 * space or whether or not the document was `group`"ed.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import * as Doc from "@effect/printer/Doc"
 * import * as String from "effect/String"
 *
 * const doc: Doc.Doc<never> = Doc.hcat([
 *   Doc.text("lorem ipsum"),
 *   Doc.hardLine,
 *   Doc.text("dolor sit amet")
 * ])
 *
 * // Even with enough space, a line break is introduced
 * assert.strictEqual(
 *   Doc.render(doc, {
 *     style: "pretty",
 *     options: { lineWidth: 1000 }
 *   }),
 *   String.stripMargin(
 *     `|lorem ipsum
 *      |dolor sit amet`
 *   )
 * )
 * ```
 *
 * @since 1.0.0
 * @category primitives
 */
export const hardLine: Doc<never> = internal.hardLine

/**
 * A document containing a single `\` character.
 *
 * @since 1.0.0
 * @category primitives
 */
export const backslash: Doc<never> = internal.backslash

/**
 * A document containing a single `:` character.
 *
 * @since 1.0.0
 * @category primitives
 */
export const colon: Doc<never> = internal.colon

/**
 * A document containing a single `,` character.
 *
 * @since 1.0.0
 * @category primitives
 */
export const comma: Doc<never> = internal.comma

/**
 * A document containing a single `.` character.
 *
 * @since 1.0.0
 * @category primitives
 */
export const dot: Doc<never> = internal.dot

/**
 * A document containing a single `"` character.
 *
 * @since 1.0.0
 * @category primitives
 */
export const dquote: Doc<never> = internal.dquote

/**
 * A document containing a single `=` character.
 *
 * @since 1.0.0
 * @category primitives
 */
export const equalSign: Doc<never> = internal.equalSign

/**
 * A document containing a single `<` character.
 *
 * @since 1.0.0
 * @category primitives
 */
export const langle: Doc<never> = internal.langle

/**
 * A document containing a single `{` character.
 *
 * @since 1.0.0
 * @category primitives
 */
export const lbrace: Doc<never> = internal.lbrace

/**
 * A document containing a single `[` character.
 *
 * @since 1.0.0
 * @category primitives
 */
export const lbracket: Doc<never> = internal.lbracket

/**
 * A document containing a single `(` character.
 *
 * @since 1.0.0
 * @category primitives
 */
export const lparen: Doc<never> = internal.lparen

/**
 * A document containing a single `>` character.
 *
 * @since 1.0.0
 * @category primitives
 */
export const rangle: Doc<never> = internal.rangle

/**
 * A document containing a single `}` character.
 *
 * @since 1.0.0
 * @category primitives
 */
export const rbrace: Doc<never> = internal.rbrace

/**
 * A document containing a single `]` character.
 *
 * @since 1.0.0
 * @category primitives
 */
export const rbracket: Doc<never> = internal.rbracket

/**
 * A document containing a single `)` character.
 *
 * @since 1.0.0
 * @category primitives
 */
export const rparen: Doc<never> = internal.rparen

/**
 * A document containing a single `;` character.
 *
 * @since 1.0.0
 * @category primitives
 */
export const semi: Doc<never> = internal.semi

/**
 * A document containing a single `/` character.
 *
 * @since 1.0.0
 * @category primitives
 */
export const slash: Doc<never> = internal.slash

/**
 * A document containing a single `"` character.
 *
 * @since 1.0.0
 * @category primitives
 */
export const squote: Doc<never> = internal.squote

/**
 * A document containing a single ` ` character.
 *
 * @since 1.0.0
 * @category primitives
 */
export const space: Doc<never> = internal.space

/**
 * A document containing a single `|` character.
 *
 * @since 1.0.0
 * @category primitives
 */
export const vbar: Doc<never> = internal.vbar

// -----------------------------------------------------------------------------
// Concatenation
// -----------------------------------------------------------------------------

/**
 * The `cat` combinator lays out two documents separated by nothing.
 *
 * @since 1.0.0
 * @category concatenation
 */
export const cat: {
  <B>(that: Doc<B>): <A>(self: Doc<A>) => Doc<B | A>
  <A, B>(self: Doc<A>, that: Doc<B>): Doc<A | B>
} = internal.cat

/**
 * The `cats` combinator will attempt to lay out a collection of documents
 * separated by nothing. If the output does not fit the page, then the documents
 * will be separated by newlines. This is what differentiates it from `vcat`,
 * which always lays out documents beneath one another.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import * as Doc from "@effect/printer/Doc"
 * import * as String from "effect/String"
 *
 * const doc: Doc.Doc<never> = Doc.hsep([
 *   Doc.text("Docs:"),
 *   Doc.cats(Doc.words("lorem ipsum dolor"))
 * ])
 *
 * assert.strictEqual(
 *   Doc.render(doc, { style: "pretty" }),
 *   "Docs: loremipsumdolor"
 * )
 *
 * // If the document exceeds the width of the page, the documents are rendered
 * // one above another
 * assert.strictEqual(
 *   Doc.render(doc, {
 *     style: "pretty",
 *     options: { lineWidth: 10 }
 *   }),
 *   String.stripMargin(
 *     `|Docs: lorem
 *      |ipsum
 *      |dolor`
 *   )
 * )
 * ```
 *
 * @since 1.0.0
 * @category concatenation
 */
export const cats: <A>(docs: Iterable<Doc<A>>) => Doc<A> = internal.cats

/**
 * The `catWithLine` combinator concatenates two documents by placing a `line`
 * document between them.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import * as Doc from "@effect/printer/Doc"
 * import { pipe } from "effect/Function"
 * import * as String from "effect/String"
 *
 * const doc: Doc.Doc<never> = pipe(
 *   Doc.char("a"),
 *   Doc.catWithLine(Doc.char("b"))
 * )
 *
 * assert.strictEqual(
 *   Doc.render(doc, { style: "pretty" }),
 *   String.stripMargin(
 *     `|a
 *      |b`
 *   )
 * )
 * ```
 *
 * @since 1.0.0
 * @category concatenation
 */
export const catWithLine: {
  <B>(that: Doc<B>): <A>(self: Doc<A>) => Doc<B | A>
  <A, B>(self: Doc<A>, that: Doc<B>): Doc<A | B>
} = internal.catWithLine

/**
 * The `catWithLineBreak` combinator concatenates two documents by placing a
 * `lineBreak` document between them.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import * as Doc from "@effect/printer/Doc"
 * import { pipe } from "effect/Function"
 * import * as String from "effect/String"
 *
 * const doc: Doc.Doc<never> = pipe(
 *   Doc.char("a"),
 *   Doc.catWithLineBreak(Doc.char("b"))
 * )
 *
 * assert.strictEqual(
 *   Doc.render(doc, { style: "pretty" }),
 *   String.stripMargin(
 *     `|a
 *      |b`
 *   )
 * )
 *
 * assert.strictEqual(
 *   Doc.render(Doc.group(doc), { style: "pretty" }),
 *   "ab"
 * )
 * ```
 *
 * @since 1.0.0
 * @category concatenation
 */
export const catWithLineBreak: {
  <B>(that: Doc<B>): <A>(self: Doc<A>) => Doc<B | A>
  <A, B>(self: Doc<A>, that: Doc<B>): Doc<A | B>
} = internal.catWithLineBreak

/**
 * The `catWithSoftLine` combinator concatenates two documents by placing a
 * `softLine` document between them.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import * as Doc from "@effect/printer/Doc"
 * import { pipe } from "effect/Function"
 * import * as String from "effect/String"
 *
 * const doc: Doc.Doc<never> = pipe(
 *   Doc.char("a"),
 *   Doc.catWithSoftLine(Doc.char("b"))
 * )
 *
 * assert.strictEqual(
 *   Doc.render(doc, { style: "pretty" }),
 *   "a b"
 * )
 *
 * assert.strictEqual(
 *   Doc.render(doc, {
 *     style: "pretty",
 *     options: { lineWidth: 1 }
 *   }),
 *   String.stripMargin(
 *     `|a
 *      |b`
 *   )
 * )
 * ```
 *
 * @since 1.0.0
 * @category concatenation
 */
export const catWithSoftLine: {
  <B>(that: Doc<B>): <A>(self: Doc<A>) => Doc<B | A>
  <A, B>(self: Doc<A>, that: Doc<B>): Doc<A | B>
} = internal.catWithSoftLine

/**
 * The `catWithSoftLineBreak` combinator concatenates two documents by
 * placing a `softLineBreak` document between them.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import * as Doc from "@effect/printer/Doc"
 * import { pipe } from "effect/Function"
 * import * as String from "effect/String"
 *
 * const doc: Doc.Doc<never> = pipe(
 *   Doc.char("a"),
 *   Doc.catWithSoftLineBreak(Doc.char("b"))
 * )
 *
 * assert.strictEqual(
 *   Doc.render(doc, { style: "pretty" }),
 *   "ab"
 * )
 *
 * assert.strictEqual(
 *   Doc.render(doc, {
 *     style: "pretty",
 *     options: { lineWidth: 1 }
 *   }),
 *   String.stripMargin(
 *     `|a
 *      |b`
 *   )
 * )
 * ```
 *
 * @since 1.0.0
 * @category concatenation
 */
export const catWithSoftLineBreak: {
  <B>(that: Doc<B>): <A>(self: Doc<A>) => Doc<B | A>
  <A, B>(self: Doc<A>, that: Doc<B>): Doc<A | B>
} = internal.catWithSoftLineBreak

/**
 * The `catWithSpace` combinator concatenates two documents by placing a
 * `space` document between them.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import * as Doc from "@effect/printer/Doc"
 * import { pipe } from "effect/Function"
 *
 * const doc: Doc.Doc<never> = pipe(
 *   Doc.char("a"),
 *   Doc.catWithSpace(Doc.char("b"))
 * )
 *
 * assert.strictEqual(
 *   Doc.render(doc, { style: "pretty" }),
 *   "a b"
 * )
 * ```
 *
 * @since 1.0.0
 * @category concatenation
 */
export const catWithSpace: {
  <B>(that: Doc<B>): <A>(self: Doc<A>) => Doc<B | A>
  <A, B>(self: Doc<A>, that: Doc<B>): Doc<A | B>
} = internal.catWithSpace

/**
 * The `concatWith` combinator concatenates all documents in a collection
 * element-wise with the specified binary function.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import * as Doc from "@effect/printer/Doc"
 * import { pipe } from "effect/Function"
 *
 * const doc: Doc.Doc<never> = pipe(
 *   [Doc.char("a"), Doc.char("b")],
 *   Doc.concatWith((x, y) => Doc.catWithSpace(y)(x))
 * )
 *
 * assert.strictEqual(
 *   Doc.render(doc, { style: "pretty" }),
 *   "a b"
 * )
 * ```
 *
 * @since 1.0.0
 * @category concatenation
 */
export const concatWith: {
  <A>(f: (left: Doc<A>, right: Doc<A>) => Doc<A>): (docs: Iterable<Doc<A>>) => Doc<A>
  <A>(docs: Iterable<Doc<A>>, f: (left: Doc<A>, right: Doc<A>) => Doc<A>): Doc<A>
} = internal.concatWith

/**
 * The `vcat` combinator concatenates all documents in a collection vertically.
 * If the output is grouped then the line breaks are removed.
 *
 * In other words `vcat` is like `vsep`, with newlines removed instead of
 * replaced by spaces.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import * as Doc from "@effect/printer/Doc"
 * import * as String from "effect/String"
 *
 * const doc: Doc.Doc<never> = Doc.vcat(Doc.words("lorem ipsum dolor"))
 *
 * assert.strictEqual(
 *   Doc.render(doc, { style: "pretty" }),
 *   String.stripMargin(
 *     `|lorem
 *      |ipsum
 *      |dolor`
 *   )
 * )
 * ```
 *
 * @since 1.0.0
 * @category concatenation
 */
export const vcat: <A>(docs: Iterable<Doc<A>>) => Doc<A> = internal.vcat

/**
 * The `hcat` combinator concatenates all documents in a collection horizontally
 * without any spacing.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import * as Doc from "@effect/printer/Doc"
 * import * as String from "effect/String"
 *
 * const doc: Doc.Doc<never> = Doc.hcat(Doc.words("lorem ipsum dolor"))
 *
 * assert.strictEqual(
 *   Doc.render(doc, { style: "pretty" }),
 *   "loremipsumdolor"
 * )
 * ```
 *
 * @since 1.0.0
 * @category concatenation
 */
export const hcat: <A>(docs: Iterable<Doc<A>>) => Doc<A> = internal.hcat

/**
 * The `fillCat` combinator concatenates all documents in a collection
 * horizontally by placing a `empty` between each pair of documents as long as
 * they fit the page. Once the page width is exceeded, a `lineBreak` is inserted
 * and the process is repeated for all documents in the collection.
 *
 * **Note**: the use of `lineBreak` means that if `group`ed, the documents will
 * be separated with `empty` instead of newlines. See `fillSep` if you want a
 * `space` instead.
 *
 * @since 1.0.0
 * @category concatenation
 */
export const fillCat: <A>(docs: Iterable<Doc<A>>) => Doc<A> = internal.fillCat

// -----------------------------------------------------------------------------
// Separation
// -----------------------------------------------------------------------------

/**
 * The `hsep` combinator concatenates all documents in a collection horizontally
 * by placing a `space` between each pair of documents.
 *
 * For automatic line breaks, consider using `fillSep`.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import * as Doc from "@effect/printer/Doc"
 *
 * const doc: Doc.Doc<never> = Doc.hsep(Doc.words("lorem ipsum dolor sit amet"))
 *
 * assert.strictEqual(
 *   Doc.render(doc, {
 *     style: "pretty",
 *     options: { lineWidth: 80 }
 *   }),
 *   "lorem ipsum dolor sit amet"
 * )
 *
 * // The `hsep` combinator will not introduce line breaks on its own, even when
 * // the page is too narrow
 * assert.strictEqual(
 *   Doc.render(doc, {
 *     style: "pretty",
 *     options: { lineWidth: 5 }
 *   }),
 *   "lorem ipsum dolor sit amet"
 * )
 * ```
 *
 * @since 1.0.0
 * @category separation
 */
export const hsep: <A>(docs: Iterable<Doc<A>>) => Doc<A> = internal.hsep

/**
 * The `vsep` combinator concatenates all documents in a collection vertically.
 * If a `group` undoes the line breaks inserted by `vsep`, the documents are
 * separated with a space instead.
 *
 * When a `vsep` is `group`ed, the documents are separated with a `space` if the
 * layoutfits the page, otherwise nothing is done. See the `sep` convenience
 * function for this use case.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import * as Doc from "@effect/printer/Doc"
 * import * as String from "effect/String"
 *
 * const unaligned = Doc.hsep([
 *   Doc.text("prefix"),
 *   Doc.vsep(Doc.words("text to lay out"))
 * ])
 *
 * assert.strictEqual(
 *   Doc.render(unaligned, { style: "pretty" }),
 *   String.stripMargin(
 *     `|prefix text
 *      |to
 *      |lay
 *      |out`
 *   )
 * )
 *
 * // The `align` function can be used to align the documents under their first
 * // element
 * const aligned = Doc.hsep([
 *   Doc.text("prefix"),
 *   Doc.align(Doc.vsep(Doc.words("text to lay out")))
 * ])
 *
 * assert.strictEqual(
 *   Doc.render(aligned, { style: "pretty" }),
 *   String.stripMargin(
 *     `|prefix text
 *      |       to
 *      |       lay
 *      |       out`
 *   )
 * )
 * ```
 *
 * @since 1.0.0
 * @category separation
 */
export const vsep: <A>(docs: Iterable<Doc<A>>) => Doc<A> = internal.vsep

/**
 * The `fillSep` combinator concatenates all documents in a collection
 * horizontally by placing a `space` between each pair of documents as long as
 * they fit the page. Once the page width is exceeded, a `line` is inserted and
 * the process is repeated for all documents in the collection.
 *
 * **Note**: the use of `line` means that if `group`ed, the documents will be
 * separated with a `space` instead of newlines. See `fillCat` if you do not
 * want a `space`.
 *
 * @since 1.0.0
 * @category separation
 */
export const fillSep: <A>(docs: Iterable<Doc<A>>) => Doc<A> = internal.fillSep

/**
 * The `seps` combinator will attempt to lay out a collection of documents
 * separated by `space`s. If the output does not fit the page, then the
 * documents will be separated by newlines. This is what differentiates it from
 * `vsep`, which always lays out documents beneath one another.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import * as Doc from "@effect/printer/Doc"
 * import * as String from "effect/String"
 *
 * const doc: Doc.Doc<never> = Doc.hsep([
 *   Doc.text("prefix"),
 *   Doc.seps(Doc.words("text to lay out"))
 * ])
 *
 * assert.strictEqual(
 *   Doc.render(doc, { style: "pretty" }),
 *   "prefix text to lay out"
 * )
 *
 * // If the page width is too narrow, documents are separated by newlines
 * assert.strictEqual(
 *   Doc.render(doc, {
 *     style: "pretty",
 *     options: { lineWidth: 20 }
 *   }),
 *   String.stripMargin(
 *     `|prefix text
 *      |to
 *      |lay
 *      |out`
 *   )
 * )
 * ```
 *
 * @since 1.0.0
 * @category separation
 */
export const seps: <A>(docs: Iterable<Doc<A>>) => Doc<A> = internal.seps

// -----------------------------------------------------------------------------
// Alternative Layouts
// -----------------------------------------------------------------------------

/**
 * The `flatAlt` document will render `left` by default. However, when
 * `group`ed, `y` will be preferred with `left` as the fallback for cases where
 * `y` does not fit onto the page.
 *
 * **NOTE**:
 * Users should be careful to ensure that `left` is less wide than `right`.
 * Otherwise, if `right` ends up not fitting the page, then the layout
 * algorithms will fall back to an even wider layout.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import * as Doc from "@effect/printer/Doc"
 * import { pipe } from "effect/Function"
 * import * as String from "effect/String"
 *
 * const open = pipe(Doc.empty, Doc.flatAlt(Doc.text("{ ")))
 * const close = pipe(Doc.empty, Doc.flatAlt(Doc.text(" }")))
 * const separator = pipe(Doc.empty, Doc.flatAlt(Doc.text("; ")))
 *
 * const prettyDo = <A>(documents: Array<Doc.Doc<A>>): Doc.Doc<A> => {
 *   return pipe(
 *     Doc.hsep([
 *       Doc.text("do"),
 *       pipe(
 *         documents,
 *         Doc.encloseSep(open, close, separator),
 *         Doc.align
 *       )
 *     ]),
 *     Doc.group
 *   )
 * }
 *
 * const statements = [
 *   Doc.text("name:_ <- getArgs"),
 *   Doc.text("let greet = \"Hello, \" <> name"),
 *   Doc.text("putStrLn greet")
 * ]
 *
 * // If it fits, then the content is put onto a single line with the `{;}` style
 * assert.strictEqual(
 *   pipe(
 *     prettyDo(statements),
 *     Doc.render({
 *       style: "pretty",
 *       options: { lineWidth: 80 }
 *     })
 *   ),
 *   "do { name:_ <- getArgs; let greet = \"Hello, \" <> name; putStrLn greet }"
 * )
 *
 * // When there is not enough space, the content is broken up onto multiple lines
 * assert.strictEqual(
 *   pipe(
 *     prettyDo(statements),
 *     Doc.render({
 *       style: "pretty",
 *       options: { lineWidth: 10 }
 *     })
 *   ),
 *   String.stripMargin(
 *     `|do name:_ <- getArgs
 *      |   let greet = "Hello, " <> name
 *      |   putStrLn greet`
 *   )
 * )
 * ```
 *
 * @since 1.0.0
 * @category alternative layouts
 */
export const flatAlt: {
  <B>(that: Doc<B>): <A>(self: Doc<A>) => Doc<B | A>
  <A, B>(self: Doc<A>, that: Doc<B>): Doc<A | B>
} = internal.flatAlt

/**
 * @since 1.0.0
 * @category alternative layouts
 */
export const union: {
  <B>(that: Doc<B>): <A>(self: Doc<A>) => Doc<B | A>
  <A, B>(self: Doc<A>, that: Doc<B>): Doc<A | B>
} = internal.union

/**
 * The `group` combinator attempts to lay out a document onto a single line by
 * removing the contained line breaks. If the result does not fit the page, or
 * if a `hardLine` prevents flattening the document, `x` is laid out without
 * any changes.
 *
 * The `group` function is key to layouts that adapt to available space nicely.
 *
 * @since 1.0.0
 * @category alternative layouts
 */
export const group: <A>(self: Doc<A>) => Doc<A> = internal.group

// -----------------------------------------------------------------------------
// Reactive Layouts
// -----------------------------------------------------------------------------

/**
 * Lays out a document depending upon the column at which the document starts.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import * as Doc from "@effect/printer/Doc"
 * import * as String from "effect/String"
 *
 * // Example 1:
 * const example1 = Doc.column((l) =>
 *   Doc.hsep([Doc.text("Columns are"), Doc.text(`${l}-based`)])
 * )
 *
 * assert.strictEqual(
 *   Doc.render(example1, { style: "pretty" }),
 *   "Columns are 0-based"
 * )
 *
 * // Example 2:
 * const doc = Doc.hsep([
 *   Doc.text("prefix"),
 *   Doc.column((l) => Doc.text(`| <- column ${l}`))
 * ])
 *
 * const example2 = Doc.vsep([0, 4, 8].map((n) => Doc.indent(n)(doc)))
 *
 * assert.strictEqual(
 *   Doc.render(example2, { style: "pretty" }),
 *   String.stripMargin(
 *     `|prefix | <- column 7
 *      |    prefix | <- column 11
 *      |        prefix | <- column 15`
 *   )
 * )
 * ```
 *
 * @since 1.0.0
 * @category reactive layouts
 */
export const column: <A>(react: (position: number) => Doc<A>) => Doc<A> = internal.column

/**
 * Lays out a document depending upon the current nesting level (i.e., the
 * current indentation of the document).
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import * as Doc from "@effect/printer/Doc"
 * import * as String from "effect/String"
 *
 * const doc = Doc.hsep([
 *   Doc.text("prefix"),
 *   Doc.nesting((l) => Doc.squareBracketed(Doc.text(`Nested: ${l}`)))
 * ])
 *
 * const example = Doc.vsep([0, 4, 8].map((n) => Doc.indent(n)(doc)))
 *
 * assert.strictEqual(
 *   Doc.render(example, { style: "pretty" }),
 *   String.stripMargin(
 *     `|prefix [Nested: 0]
 *      |    prefix [Nested: 4]
 *      |        prefix [Nested: 8]`
 *   )
 * )
 * ```
 *
 * @since 1.0.0
 * @category reactive layouts
 */
export const nesting: <A>(react: (level: number) => Doc<A>) => Doc<A> = internal.nesting

/**
 * The `width` combinator makes the column width of a document available to the
 * document while rendering.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import * as Doc from "@effect/printer/Doc"
 * import { pipe } from "effect/Function"
 * import * as String from "effect/String"
 *
 * const annotate = <A>(doc: Doc.Doc<A>): Doc.Doc<A> =>
 *   pipe(
 *     Doc.squareBracketed(doc),
 *     Doc.width((w) => Doc.text(` <- width: ${w}`))
 *   )
 *
 * const docs = [
 *   Doc.text("---"),
 *   Doc.text("------"),
 *   Doc.indent(Doc.text("---"), 3),
 *   Doc.vsep([Doc.text("---"), Doc.indent(Doc.text("---"), 4)])
 * ]
 *
 * const doc = Doc.align(Doc.vsep(docs.map(annotate)))
 *
 * assert.strictEqual(
 *   Doc.render(doc, { style: "pretty" }),
 *   String.stripMargin(
 *     `|[---] <- width: 5
 *      |[------] <- width: 8
 *      |[   ---] <- width: 8
 *      |[---
 *      |    ---] <- width: 8`
 *   )
 * )
 * ```
 *
 * @since 1.0.0
 * @category reactive layouts
 */
export const width: {
  <A, B>(react: (width: number) => Doc<B>): (self: Doc<A>) => Doc<A | B>
  <A, B>(self: Doc<A>, react: (width: number) => Doc<B>): Doc<A | B>
} = internal.width

/**
 * Lays out a document according to the document"s`PageWidth`.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import * as Doc from "@effect/printer/Doc"
 * import * as String from "effect/String"
 *
 * const doc = Doc.hsep([
 *   Doc.text("prefix"),
 *   Doc.pageWidth((pageWidth) => {
 *     switch (pageWidth._tag) {
 *       case "AvailablePerLine": {
 *         const { lineWidth, ribbonFraction } = pageWidth
 *         return Doc.squareBracketed(
 *           Doc.text(`Width: ${lineWidth}, Ribbon Fraction: ${ribbonFraction}`)
 *         )
 *       }
 *       case "Unbounded": {
 *         return Doc.empty
 *       }
 *     }
 *   })
 * ])
 *
 * const example = Doc.vsep([0, 4, 8].map((n) => Doc.indent(n)(doc)))
 *
 * assert.strictEqual(
 *   Doc.render(example, {
 *     style: "pretty",
 *     options: { lineWidth: 32 }
 *   }),
 *   String.stripMargin(
 *     `|prefix [Width: 32, Ribbon Fraction: 1]
 *      |    prefix [Width: 32, Ribbon Fraction: 1]
 *      |        prefix [Width: 32, Ribbon Fraction: 1]`
 *   )
 * )
 * ```
 *
 * @since 1.0.0
 * @category constructors
 */
export const pageWidth: <A>(react: (pageWidth: PageWidth) => Doc<A>) => Doc<A> = internal.pageWidth

// -----------------------------------------------------------------------------
// Alignment
// -----------------------------------------------------------------------------

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
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import * as Doc from "@effect/printer/Doc"
 * import { pipe } from "effect/Function"
 * import * as String from "effect/String"
 *
 * const doc = Doc.vsep([
 *   pipe(Doc.vsep(Doc.words("lorem ipsum dolor")), Doc.nest(4)),
 *   Doc.text("sit"),
 *   Doc.text("amet")
 * ])
 *
 * assert.strictEqual(
 *   Doc.render(doc, { style: "pretty" }),
 *   String.stripMargin(
 *     `|lorem
 *      |    ipsum
 *      |    dolor
 *      |sit
 *      |amet`
 *   )
 * )
 * ```
 *
 * @since 1.0.0
 * @category alignment
 */
export const nest: {
  (indent: number): <A>(self: Doc<A>) => Doc<A>
  <A>(self: Doc<A>, indent: number): Doc<A>
} = internal.nest

/**
 * The `align` combinator lays out a document with the nesting level set to the
 * current column.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import * as Doc from "@effect/printer/Doc"
 * import * as String from "effect/String"
 *
 * // As an example, the documents below will be placed one above the other
 * // regardless of the current nesting level
 *
 * // Without `align`ment, the second line is simply placed below everything
 * // that has been laid out so far
 * const unaligned = Doc.hsep([
 *   Doc.text("lorem"),
 *   Doc.vsep([Doc.text("ipsum"), Doc.text("dolor")])
 * ])
 *
 * assert.strictEqual(
 *   Doc.render(unaligned, { style: "pretty" }),
 *   String.stripMargin(
 *     `|lorem ipsum
 *      |dolor`
 *   )
 * )
 *
 * // With `align`ment, the `vsep`ed documents all start at the same column
 * const aligned = Doc.hsep([
 *   Doc.text("lorem"),
 *   Doc.align(Doc.vsep([Doc.text("ipsum"), Doc.text("dolor")]))
 * ])
 *
 * assert.strictEqual(
 *   Doc.render(aligned, { style: "pretty" }),
 *   String.stripMargin(
 *     `|lorem ipsum
 *      |      dolor`
 *   )
 * )
 * ```
 *
 * @since 1.0.0
 * @category alignment
 */
export const align: <A>(self: Doc<A>) => Doc<A> = internal.align

/**
 * The `hang` combinator lays out a document with the nesting level set to
 * the *current column* plus the specified `indent`. Negative values for
 * `indent` are allowed and decrease the nesting level accordingly.
 *
 * This differs from the `nest` combinator, which is based on the *current
 * nesting level* plus the specified `indent`. When you"re not sure, try the
 * more efficient combinator (`nest`) first.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import * as Doc from "@effect/printer/Doc"
 * import { pipe } from "effect/Function"
 * import * as String from "effect/String"
 *
 * const doc = Doc.hsep([
 *   Doc.text("prefix"),
 *   pipe(Doc.reflow("Indenting these words with hang"), Doc.hang(4))
 * ])
 *
 * assert.strictEqual(
 *   Doc.render(doc, {
 *     style: "pretty",
 *     options: { lineWidth: 24 }
 *   }),
 *   String.stripMargin(
 *     `|prefix Indenting these
 *      |           words with
 *      |           hang`
 *   )
 * )
 * ```
 *
 * @since 1.0.0
 * @category alignment
 */
export const hang: {
  (indent: number): <A>(self: Doc<A>) => Doc<A>
  <A>(self: Doc<A>, indent: number): Doc<A>
} = internal.hang

/**
 * The `indent` combinator indents a document by the specified `indent`
 * beginning from the current cursor position.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import * as Doc from "@effect/printer/Doc"
 * import { pipe } from "effect/Function"
 * import * as String from "effect/String"
 *
 * const doc = Doc.hcat([
 *   Doc.text("prefix"),
 *   pipe(Doc.reflow("The indent function indents these words!"), Doc.indent(4))
 * ])
 *
 * assert.strictEqual(
 *   Doc.render(doc, {
 *     style: "pretty",
 *     options: { lineWidth: 24 }
 *   }),
 *   String.stripMargin(
 *     `|prefix    The indent
 *      |          function
 *      |          indents these
 *      |          words!`
 *   )
 * )
 * ```
 *
 * @since 1.0.0
 * @category alignment
 */
export const indent: {
  (indent: number): <A>(self: Doc<A>) => Doc<A>
  <A>(self: Doc<A>, indent: number): Doc<A>
} = internal.indent

/**
 * The `encloseSep` combinator concatenates a collection of documents,
 * separating each document in the collection using the specified `sep`
 * document. After concatenation, the resulting document is enclosed by the
 * specified `left` and `right` documents.
 *
 * To place the `sep` document at the end of each entry, see the `punctuate`
 * combinator.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import * as Doc from "@effect/printer/Doc"
 * import { pipe } from "effect/Function"
 * import * as String from "effect/String"
 *
 * const doc = Doc.hsep([
 *   Doc.text("list"),
 *   Doc.align(
 *     pipe(
 *       ["1", "20", "300", "4000"].map(
 *         (n) => n.length === 1 ? Doc.char(n) : Doc.text(n)
 *       ),
 *       Doc.encloseSep(Doc.lbracket, Doc.rbracket, Doc.comma)
 *     )
 *   )
 * ])
 *
 * // The documents are laid out horizontally if the document fits the page
 * assert.strictEqual(
 *   Doc.render(doc, { style: "pretty" }),
 *   "list [1,20,300,4000]"
 * )
 *
 * // Otherwise they are laid out vertically, with separators put in the front
 * assert.strictEqual(
 *   Doc.render(doc, {
 *     style: "pretty",
 *     options: { lineWidth: 10 }
 *   }),
 *   String.stripMargin(
 *     `|list [1
 *      |     ,20
 *      |     ,300
 *      |     ,4000]`
 *   )
 * )
 * ```
 *
 * @since 1.0.0
 * @category alignment
 */
export const encloseSep: {
  <A, B, C>(
    left: Doc<A>,
    right: Doc<B>,
    sep: Doc<C>
  ): <D>(docs: Iterable<Doc<D>>) => Doc<A | B | C | D>
  <A, B, C, D>(docs: Iterable<Doc<D>>, left: Doc<A>, right: Doc<B>, sep: Doc<C>): Doc<A | B | C | D>
} = internal.encloseSep

/**
 * A Haskell-inspired variant of `encloseSep` that uses a comma as the separator
 * and braces as the enclosure for a collection of documents.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import * as Doc from "@effect/printer/Doc"
 *
 * const doc = Doc.list(
 *   ["1", "20", "300", "4000"].map(
 *     (n) => (n.length === 1 ? Doc.char(n) : Doc.text(n))
 *   )
 * )
 *
 * assert.strictEqual(
 *   Doc.render(doc, { style: "pretty" }),
 *   "[1, 20, 300, 4000]"
 * )
 * ```
 *
 * @since 1.0.0
 * @category alignment
 */
export const list: <A>(docs: Iterable<Doc<A>>) => Doc<A> = internal.list

/**
 * A Haskell-inspired variant of `encloseSep` that uses a comma as the separator
 * and parentheses as the enclosure for a collection of documents.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import * as Doc from "@effect/printer/Doc"
 *
 * const doc = Doc.tupled(
 *   ["1", "20", "300", "4000"].map(
 *     (n) => (n.length === 1 ? Doc.char(n) : Doc.text(n))
 *   )
 * )
 *
 * assert.strictEqual(
 *   Doc.render(doc, { style: "pretty" }),
 *   "(1, 20, 300, 4000)"
 * )
 * ```
 *
 * @since 1.0.0
 * @category alignment
 */
export const tupled: <A>(docs: Iterable<Doc<A>>) => Doc<A> = internal.tupled

// -----------------------------------------------------------------------------
// Filling
// -----------------------------------------------------------------------------

/**
 * The `fill` combinator first lays out the document `x` and then appends
 * `space`s until the width of the document is equal to the specified `width`.
 * If the width of `x` is already larger than the specified `width`, nothing is
 * appended.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import * as Doc from "@effect/printer/Doc"
 * import { pipe } from "effect/Function"
 * import * as String from "effect/String"
 *
 * type Signature = [name: string, type: string]
 *
 * const signatures: Array<Signature> = [
 *   ["empty", "Doc"],
 *   ["nest", "Int -> Doc -> Doc"],
 *   ["fillSep", "[Doc] -> Doc"]
 * ]
 *
 * const prettySignature = <A>([name, type]: Signature): Doc.Doc<A> =>
 *   Doc.hsep([
 *     pipe(Doc.text(name), Doc.fill(5)),
 *     Doc.text("::"),
 *     Doc.text(type)
 *   ])
 *
 * const doc = Doc.hsep([
 *   Doc.text("let"),
 *   Doc.align(Doc.vcat(signatures.map(prettySignature)))
 * ])
 *
 * assert.strictEqual(
 *   Doc.render(doc, { style: "pretty" }),
 *   String.stripMargin(
 *     `|let empty :: Doc
 *      |    nest  :: Int -> Doc -> Doc
 *      |    fillSep :: [Doc] -> Doc`
 *   )
 * )
 * ```
 *
 * @since 1.0.0
 * @category filling
 */
export const fill: {
  (w: number): <A>(self: Doc<A>) => Doc<A>
  <A>(self: Doc<A>, w: number): Doc<A>
} = internal.fill

/**
 * The `fillBreak` combinator first lays out the document `x` and then appends
 * `space`s until the width of the document is equal to the specified `width`.
 * If the width of `x` is already larger than the specified `width`, the nesting
 * level is increased by the specified `width` and a `line` is appended.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import * as Doc from "@effect/printer/Doc"
 * import { pipe } from "effect/Function"
 * import * as String from "effect/String"
 *
 * type Signature = [name: string, type: string]
 *
 * const signatures: Array<Signature> = [
 *   ["empty", "Doc"],
 *   ["nest", "Int -> Doc -> Doc"],
 *   ["fillSep", "[Doc] -> Doc"]
 * ]
 *
 * const prettySignature = <A>([name, type]: Signature): Doc.Doc<A> =>
 *   Doc.hsep([
 *     pipe(Doc.text(name), Doc.fillBreak(5)),
 *     Doc.text("::"),
 *     Doc.text(type)
 *   ])
 *
 * const doc = Doc.hsep([
 *   Doc.text("let"),
 *   Doc.align(Doc.vcat(signatures.map(prettySignature)))
 * ])
 *
 * assert.strictEqual(
 *   Doc.render(doc, { style: "pretty" }),
 *   String.stripMargin(
 *     `|let empty :: Doc
 *      |    nest  :: Int -> Doc -> Doc
 *      |    fillSep
 *      |          :: [Doc] -> Doc`
 *   )
 * )
 * ```
 *
 * @since 1.0.0
 * @category filling
 */
export const fillBreak: {
  (w: number): <A>(self: Doc<A>) => Doc<A>
  <A>(self: Doc<A>, w: number): Doc<A>
} = internal.fillBreak

// -----------------------------------------------------------------------------
// Flattening
// -----------------------------------------------------------------------------

/**
 * Flattens a document but does not report changes.
 *
 * @since 1.0.0
 * @category flattening
 */
export const flatten: <A>(self: Doc<A>) => Doc<A> = internal.flatten

/**
 * Select the first element of each `Union` and discard the first element of
 * each `FlatAlt` to produce a "flattened" version of the input document.
 *
 * The result is `Flattened` if the element might change depending on the chosen
 * layout algorithm (i.e., the resulting document contains sub-documents that
 * may be rendered differently).
 *
 * The result is `AlreadyFlat` if the document is static (i.e., the resulting
 * document contains only a plain `Empty` node).
 *
 * `NeverFlat` is returned when the document cannot be flattened because it
 * contains either a hard `Line` or a `Fail`.
 *
 * @since 1.0.0
 * @category flattening
 */
export const changesUponFlattening: <A>(self: Doc<A>) => Flatten<Doc<A>> = internal.changesUponFlattening

// -----------------------------------------------------------------------------
// Annotations
// -----------------------------------------------------------------------------

/**
 * Adds an annotation to a `Doc`. The annotation can then be used by the rendering
 * algorithm to, for example, add color to certain parts of the output.
 *
 * **Note** This function is relevant only for custom formats with their own annotations,
 * and is not relevant for basic pretty printing.
 *
 * @since 1.0.0
 * @category annotations
 */
export const annotate: {
  <A>(annotation: A): (self: Doc<A>) => Doc<A>
  <A>(self: Doc<A>, annotation: A): Doc<A>
} = internal.annotate

/**
 * Change the annotations of a document. Individual annotations can be removed,
 * changed, or replaced by multiple ones.
 *
 * This is a general function that combines `unAnnotate` and `reAnnotate`, and
 * is useful for mapping semantic annotations (such as »this is a keyword«) to
 * display annotations (such as »this is red and underlined«) because some
 * backends may not care about certain annotations while others may.
 *
 * Annotations earlier in the new list will be applied earlier, so returning
 * `[Bold, Green]` will result in a bold document that contains green text, and
 * not vice versa.
 *
 * Since this traverses the entire document tree, including the parts that are
 * not rendered (due to other layouts having better fit), it is preferable to
 * reannotate a document **after** producing the layout by using
 * `alterAnnotations` from the `SimpleDocStream` module.
 *
 * @since 1.0.0
 * @category annotations
 */
export const alterAnnotations: {
  <A, B>(f: (a: A) => Iterable<B>): (self: Doc<A>) => Doc<B>
  <A, B>(self: Doc<A>, f: (a: A) => Iterable<B>): Doc<B>
} = internal.alterAnnotations

/**
 * Changes the annotation of a document. Useful for modifying documents embedded
 * with one form of annotation with a more general annotation.
 *
 * **Note** that with each invocation, the entire document tree is traversed.
 * If possible, it is preferable to reannotate a document after producing the
 * layout using `reAnnotateS`.
 *
 * @since 1.0.0
 * @category annotations
 */
export const reAnnotate: {
  <A, B>(f: (a: A) => B): (self: Doc<A>) => Doc<B>
  <A, B>(self: Doc<A>, f: (a: A) => B): Doc<B>
} = internal.reAnnotate

/**
 * Removes all annotations from a document.
 *
 * **Note**: with each invocation, the entire document tree is traversed.
 * If possible, it is preferable to unannotate a document after producing the
 * layout using `unAnnotateS`.
 *
 * @since 1.0.0
 * @category annotations
 */
export const unAnnotate: <A>(self: Doc<A>) => Doc<never> = internal.unAnnotate

// -----------------------------------------------------------------------------
// Folding
// -----------------------------------------------------------------------------

/**
 * @since 1.0.0
 * @category folding
 */
export const match: {
  <A, R>(
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
  ): (self: Doc<A>) => R
  <A, R>(
    self: Doc<A>,
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
  ): R
} = internal.match

// -----------------------------------------------------------------------------
// Instances
// -----------------------------------------------------------------------------

/**
 * @since 1.0.0
 * @category rendering
 */
export const render: {
  (config: Doc.RenderConfig): <A>(self: Doc<A>) => string
  <A>(self: Doc<A>, config: Doc.RenderConfig): string
} = InternalRender.render

/**
 * @since 1.0.0
 * @category rendering
 */
export const renderStream: <A>(
  self: DocStream<A>
) => string = InternalRender.renderStream

// -----------------------------------------------------------------------------
// Instances
// -----------------------------------------------------------------------------

/**
 * @since 1.0.0
 * @category combinators
 */
export const map: {
  <A, B>(f: (a: A) => B): (self: Doc<A>) => Doc<B>
  <A, B>(self: Doc<A>, f: (a: A) => B): Doc<B>
} = internal.map

/**
 * @since 1.0.0
 * @category instances
 */
export const getSemigroup: <A>(_: void) => Semigroup<Doc<A>> = internal.getSemigroup

/**
 * @since 1.0.0
 * @category instances
 */
export const getMonoid: <A>(_: void) => Monoid<Doc<A>> = internal.getMonoid

/**
 * @since 1.0.0
 * @category instances
 */
export const Covariant: covariant.Covariant<Doc.TypeLambda> = internal.Covariant

/**
 * @since 1.0.0
 * @category instances
 */
export const Invariant: invariant.Invariant<Doc.TypeLambda> = internal.Invariant

// -----------------------------------------------------------------------------
// Utilities
// -----------------------------------------------------------------------------

/**
 * The `surround` combinator encloses a document in between `left` and `right`
 * documents.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import * as Doc from "@effect/printer/Doc"
 * import { pipe } from "effect/Function"
 *
 * const doc = pipe(
 *   Doc.char("-"),
 *   Doc.surround(Doc.char("A"), Doc.char("Z"))
 * )
 *
 * assert.strictEqual(
 *   Doc.render(doc, { style: "pretty" }),
 *   "A-Z"
 * )
 * ```
 *
 * @since 1.0.0
 * @category utilities
 */
export const surround: {
  <A, B, C>(left: Doc<A>, right: Doc<B>): (self: Doc<C>) => Doc<A | B | C>
  <A, B, C>(self: Doc<C>, left: Doc<A>, right: Doc<B>): Doc<A | B | C>
} = internal.surround

/**
 * Encloses the input document in single quotes (`""`).
 *
 * @since 1.0.0
 * @category utilities
 */
export const singleQuoted: <A>(self: Doc<A>) => Doc<A> = internal.singleQuoted

/**
 * Encloses the input document in double quotes (`""`).
 *
 * @since 1.0.0
 * @category utilities
 */
export const doubleQuoted: <A>(self: Doc<A>) => Doc<A> = internal.doubleQuoted

/**
 * Encloses the input document in parentheses (`()`).
 *
 * @since 1.0.0
 * @category utilities
 */
export const parenthesized: <A>(self: Doc<A>) => Doc<A> = internal.parenthesized

/**
 * Encloses the input document in angle brackets (`<>`).
 *
 * @since 1.0.0
 * @category utilities
 */
export const angleBracketed: <A>(self: Doc<A>) => Doc<A> = internal.angleBracketed

/**
 * Encloses the input document in square brackets (`[]`).
 *
 * @since 1.0.0
 * @category utilities
 */
export const squareBracketed: <A>(self: Doc<A>) => Doc<A> = internal.squareBracketed

/**
 * Encloses the input document in curly braces (`{}`).
 *
 * @since 1.0.0
 * @category utilities
 */
export const curlyBraced: <A>(self: Doc<A>) => Doc<A> = internal.curlyBraced

/**
 * The `spaces` combinator lays out a document containing `n` spaces. Negative
 * values for `n` count as `0` spaces.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import * as Doc from "@effect/printer/Doc"
 *
 * const doc = Doc.squareBracketed(Doc.doubleQuoted(Doc.spaces(5)))
 *
 * assert.strictEqual(
 *   Doc.render(doc, { style: "pretty" }),
 *   "[\"     \"]"
 * )
 * ```
 *
 * @since 1.0.0
 * @category utilities
 */
export const spaces: (n: number) => Doc<never> = internal.spaces

/**
 * @since 1.0.0
 * @category utilities
 */
export const textSpaces: (n: number) => string = internal.textSpaces

/**
 * Splits a string of words into individual `Text` documents using the
 * specified `char` to split on (defaults to `" "`).
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import * as Doc from "@effect/printer/Doc"
 *
 * const doc = Doc.tupled(Doc.words("lorem ipsum dolor"))
 *
 * assert.strictEqual(
 *   Doc.render(doc, { style: "pretty" }),
 *   "(lorem, ipsum, dolor)"
 * )
 * ```
 *
 * @since 1.0.0
 * @category utilities
 */
export const words: (s: string, char?: string) => ReadonlyArray<Doc<never>> = internal.words

/**
 * Splits a string of words into individual `Text` documents using the specified
 * `char` to split on (defaults to `" "`). In addition, a `softLine` is inserted
 * in between each word so that if the text exceeds the available width it will
 * be broken into multiple lines.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import * as Doc from "@effect/printer/Doc"
 * import * as String from "effect/String"
 *
 * const doc = Doc.reflow(
 *   "Lorem ipsum dolor sit amet, consectetur adipisicing elit, " +
 *     "sed do eiusmod tempor incididunt ut labore et dolore magna aliqua."
 * )
 *
 * assert.strictEqual(
 *   Doc.render(doc, {
 *     style: "pretty",
 *     options: { lineWidth: 32 }
 *   }),
 *   String.stripMargin(
 *     `|Lorem ipsum dolor sit amet,
 *      |consectetur adipisicing elit,
 *      |sed do eiusmod tempor incididunt
 *      |ut labore et dolore magna
 *      |aliqua.`
 *   )
 * )
 * ```
 *
 * @since 1.0.0
 * @category utilities
 */
export const reflow: (s: string, char?: string) => Doc<never> = internal.reflow

/**
 * The `punctuate` combinator appends the `punctuator` document to all but the
 * last document in a collection of documents. The separators are places after
 * the document entries, which can be observed if the result is oriented
 * vertically.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import * as Doc from "@effect/printer/Doc"
 * import { pipe } from "effect/Function"
 * import * as String from "effect/String"
 *
 * const docs = pipe(
 *   Doc.words("lorem ipsum dolor sit amet"),
 *   Doc.punctuate(Doc.comma)
 * )
 *
 * assert.strictEqual(
 *   Doc.render(Doc.hsep(docs), { style: "pretty" }),
 *   "lorem, ipsum, dolor, sit, amet"
 * )
 *
 * // The separators are put at the end of the entries, which can be better
 * // visualzied if the documents are rendered vertically
 * assert.strictEqual(
 *   Doc.render(Doc.vsep(docs), { style: "pretty" }),
 *   String.stripMargin(
 *     `|lorem,
 *      |ipsum,
 *      |dolor,
 *      |sit,
 *      |amet`
 *   )
 * )
 * ```
 *
 * @since 1.0.0
 * @category utilities
 */
export const punctuate: {
  <A, B>(punctuator: Doc<A>): (docs: Iterable<Doc<B>>) => ReadonlyArray<Doc<A | B>>
  <A, B>(docs: Iterable<Doc<B>>, punctuator: Doc<A>): ReadonlyArray<Doc<A | B>>
} = internal.punctuate
