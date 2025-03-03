/**
 * @since 1.0.0
 */
import type * as covariant from "@effect/typeclass/Covariant"
import type * as invariant from "@effect/typeclass/Invariant"
import type * as monoid from "@effect/typeclass/Monoid"
import type * as semigroup from "@effect/typeclass/Semigroup"
import type { Equal } from "effect/Equal"
import type { TypeLambda } from "effect/HKT"
import type * as DocStream from "./DocStream.js"
import * as internal from "./internal/docTree.js"

// -----------------------------------------------------------------------------
// Models
// -----------------------------------------------------------------------------

/**
 * @since 1.0.0
 * @category symbol
 */
export const DocTreeTypeId: unique symbol = internal.DocTreeTypeId as DocTreeTypeId

/**
 * @since 1.0.0
 * @category symbol
 */
export type DocTreeTypeId = typeof DocTreeTypeId

/**
 * Represents a document that has been laid out into a tree-like structure.
 *
 * A `DocStream` is a linked list of different annotated cons cells (i.e.
 * `TextStream` and then some further `DocStream`, `LineStream` and then some
 * further `DocStream`, etc.). The `DocStream` format is quite suitable as a
 * target for a layout engine, but is not suitable for rendering to a more
 * structured format, such as HTML, where we do not want to perform a lookahead
 * until the end of some pre-defined markup. These formats would benefit more
 * from a tree-like structure that explicitly marks its contents as annotated.
 * A `DocTree` is therefore much more suitable for this use case.
 *
 * @since 1.0.0
 * @category model
 */
export type DocTree<A> =
  | EmptyTree<A>
  | CharTree<A>
  | TextTree<A>
  | LineTree<A>
  | AnnotationTree<A>
  | ConcatTree<A>

/**
 * @since 1.0.0
 */
export declare namespace DocTree {
  /**
   * @since 1.0.0
   */
  export interface Variance<A> extends Equal {
    readonly [DocTreeTypeId]: {
      readonly _A: (_: never) => A
    }
  }

  /**
   * @since 1.0.0
   */
  export type TypeLambda = DocTreeTypeLambda
}

/**
 * @since 1.0.0
 * @category model
 */
export interface DocTreeTypeLambda extends TypeLambda {
  readonly type: DocTree<this["Target"]>
}

/**
 * @since 1.0.0
 * @category model
 */
export interface EmptyTree<A> extends DocTree.Variance<A> {
  readonly _tag: "EmptyTree"
}

/**
 * @since 1.0.0
 * @category model
 */
export interface CharTree<A> extends DocTree.Variance<A> {
  readonly _tag: "CharTree"
  readonly char: string
}

/**
 * @since 1.0.0
 * @category model
 */
export interface TextTree<A> extends DocTree.Variance<A> {
  readonly _tag: "TextTree"
  readonly text: string
}

/**
 * @since 1.0.0
 * @category model
 */
export interface LineTree<A> extends DocTree.Variance<A> {
  readonly _tag: "LineTree"
  readonly indentation: number
}

/**
 * @since 1.0.0
 * @category model
 */
export interface AnnotationTree<A> extends DocTree.Variance<A> {
  readonly _tag: "AnnotationTree"
  readonly annotation: A
  readonly tree: DocTree<A>
}

/**
 * @since 1.0.0
 * @category model
 */
export interface ConcatTree<A> extends DocTree.Variance<A> {
  readonly _tag: "ConcatTree"
  readonly trees: ReadonlyArray<DocTree<A>>
}

// -----------------------------------------------------------------------------
// Refinements
// -----------------------------------------------------------------------------

/**
 * Returns `true` if the specified value is a `DocTree`, `false` otherwise.
 *
 * @since 1.0.0
 * @category refinements
 */
export const isDocTree: (u: unknown) => u is DocTree<unknown> = internal.isDocTree

/**
 * Returns `true` if the specified `DocTree` is an `EmptyTree`, `false` otherwise.
 *
 * @since 1.0.0
 * @category refinements
 */
export const isEmptyTree: <A>(self: DocTree<A>) => self is EmptyTree<A> = internal.isEmptyTree

/**
 * Returns `true` if the specified `DocTree` is an `CharTree`, `false` otherwise.
 *
 * @since 1.0.0
 * @category refinements
 */
export const isCharTree: <A>(self: DocTree<A>) => self is CharTree<A> = internal.isCharTree

/**
 * Returns `true` if the specified `DocTree` is an `TextTree`, `false` otherwise.
 *
 * @since 1.0.0
 * @category refinements
 */
export const isTextTree: <A>(self: DocTree<A>) => self is TextTree<A> = internal.isTextTree

/**
 * Returns `true` if the specified `DocTree` is an `LineTree`, `false` otherwise.
 *
 * @since 1.0.0
 * @category refinements
 */
export const isLineTree: <A>(self: DocTree<A>) => self is LineTree<A> = internal.isLineTree

/**
 * Returns `true` if the specified `DocTree` is an `AnnotationTree`, `false` otherwise.
 *
 * @since 1.0.0
 * @category refinements
 */
export const isAnnotationTree: <A>(self: DocTree<A>) => self is AnnotationTree<A> = internal.isAnnotationTree

/**
 * Returns `true` if the specified `DocTree` is an `ConcatTree`, `false` otherwise.
 *
 * @since 1.0.0
 * @category refinements
 */
export const isConcatTree: <A>(self: DocTree<A>) => self is ConcatTree<A> = internal.isConcatTree

// -----------------------------------------------------------------------------
// Constructors
// -----------------------------------------------------------------------------

/**
 * @since 1.0.0
 * @category constructors
 */
export const empty: DocTree<never> = internal.empty

/**
 * @since 1.0.0
 * @category constructors
 */
export const char: <A>(char: string) => DocTree<A> = internal.char

/**
 * @since 1.0.0
 * @category constructors
 */
export const text: <A>(text: string) => DocTree<A> = internal.text

/**
 * @since 1.0.0
 * @category constructors
 */
export const line: <A>(indentation: number) => DocTree<A> = internal.line

/**
 * Annotate the specified `DocTree` with an annotation of type `A`.
 *
 * @since 1.0.0
 * @category constructors
 */
export const annotation: {
  <A>(annotation: A): <B>(self: DocTree<B>) => DocTree<A | B>
  <A, B>(self: DocTree<A>, annotation: B): DocTree<A | B>
} = internal.annotation

/**
 * Horizontally concatenates multiple `DocTree`s.
 *
 * @since 1.0.0
 * @category constructors
 */
export const concat: <A>(trees: ReadonlyArray<DocTree<A>>) => DocTree<A> = internal.concat

// -----------------------------------------------------------------------------
// Annotations
// -----------------------------------------------------------------------------

/**
 * Change the annotation of a document to a different annotation, or none at
 * all.
 *
 * @since 1.0.0
 * @category annotations
 */
export const alterAnnotations: {
  <A, B>(f: (a: A) => Iterable<B>): (self: DocTree<A>) => DocTree<B>
  <A, B>(self: DocTree<A>, f: (a: A) => Iterable<B>): DocTree<B>
} = internal.alterAnnotations

/**
 * Change the annotation of a `DocTree`.
 *
 * @since 1.0.0
 * @category annotations
 */
export const reAnnotate: {
  <A, B>(f: (a: A) => B): (self: DocTree<A>) => DocTree<B>
  <A, B>(self: DocTree<A>, f: (a: A) => B): DocTree<B>
} = internal.reAnnotate

/**
 * Remove all annotations from a `DocTree`.
 *
 * @since 1.0.0
 * @category annotations
 */
export const unAnnotate: <A>(self: DocTree<A>) => DocTree<never> = internal.unAnnotate

// -----------------------------------------------------------------------------
// Folding
// -----------------------------------------------------------------------------

/**
 * @since 1.0.0
 * @category folding
 */
export const foldMap: {
  <A, M>(M: monoid.Monoid<M>, f: (a: A) => M): (self: DocTree<A>) => M
  <A, M>(self: DocTree<A>, M: monoid.Monoid<M>, f: (a: A) => M): M
} = internal.foldMap

// -----------------------------------------------------------------------------
// Instances
// -----------------------------------------------------------------------------

/**
 * The simplest possible tree-based renderer.
 *
 * For example, here is a document annotated with `void` and thee behavior is
 * to surround annotated regions with »>>>« and »<<<«.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import * as Doc from "@effect/printer/Doc"
 * import * as DocTree from "@effect/printer/DocTree"
 * import * as Layout from "@effect/printer/Layout"
 * import { identity, pipe } from "effect/Function"
 * import * as String from "@effect/typeclass/data/String"
 *
 * const doc: Doc.Doc<void> = Doc.hsep([
 *   Doc.text("hello"),
 *   pipe(
 *     Doc.text("world"),
 *     Doc.annotate(undefined),
 *     Doc.cat(Doc.char("!"))
 *   )
 * ])
 *
 * const tree = DocTree.treeForm(Layout.pretty(Layout.defaultOptions)(doc))
 *
 * const rendered = pipe(
 *   tree,
 *   DocTree.renderSimplyDecorated(String.Monoid, identity, (_, x) => `>>>${x}<<<`)
 * )
 *
 * assert.strictEqual(
 *   rendered,
 *   "hello >>>world<<<!"
 * )
 * ```
 *
 * @since 1.0.0
 * @category rendering
 */
export const renderSimplyDecorated: {
  <A, M>(
    M: monoid.Monoid<M>,
    renderText: (text: string) => M,
    renderAnnotation: (annotation: A, out: M) => M
  ): (self: DocTree<A>) => M
  <A, M>(
    self: DocTree<A>,
    M: monoid.Monoid<M>,
    renderText: (text: string) => M,
    renderAnnotation: (annotation: A, out: M) => M
  ): M
} = internal.renderSimplyDecorated

// -----------------------------------------------------------------------------
// Conversions
// -----------------------------------------------------------------------------

/**
 * Converts a `DocStream<A>` into a `DocTree<A>`.
 *
 * @since 1.0.0
 * @category conversions
 */
export const treeForm: <A>(stream: DocStream.DocStream<A>) => DocTree<A> = internal.treeForm

// -----------------------------------------------------------------------------
// Instances
// -----------------------------------------------------------------------------

/**
 * @since 1.0.0
 * @category instances
 */
export const getSemigroup: <A>(_: void) => semigroup.Semigroup<DocTree<A>> = internal.getSemigroup

/**
 * @since 1.0.0
 * @category instances
 */
export const getMonoid: <A>(_: void) => monoid.Monoid<DocTree<A>> = internal.getMonoid

/**
 * @since 1.0.0
 * @category instances
 */
export const Covariant: covariant.Covariant<DocTree.TypeLambda> = internal.Covariant

/**
 * @since 1.0.0
 * @category instances
 */
export const Invariant: invariant.Invariant<DocTree.TypeLambda> = internal.Invariant
