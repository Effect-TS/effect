/**
 * @since 1.0.0
 */

import * as DT from "@effect/printer/internal/DocTree"
import type { TypeLambda } from "@fp-ts/core/HKT"
import type { Covariant as _Functor } from "@fp-ts/core/typeclass/Covariant"
import type { Monoid } from "@fp-ts/core/typeclass/Monoid"
import type { Semigroup } from "@fp-ts/core/typeclass/Semigroup"
import type { Chunk } from "@fp-ts/data/Chunk"

// -----------------------------------------------------------------------------
// Models
// -----------------------------------------------------------------------------

const TypeId: unique symbol = DT.DocTreeTypeId as TypeId

/**
 * @category symbol
 * @since 1.0.0
 */
export type TypeId = typeof TypeId

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
 * @category model
 * @since 1.0.0
 * @tsplus type effect/printer/DocTree
 */
export type DocTree<A> =
  | EmptyTree<A>
  | CharTree<A>
  | TextTree<A>
  | LineTree<A>
  | AnnotationTree<A>
  | ConcatTree<A>

export declare namespace DocTree {
  export type TypeLambda = DocTreeTypeLambda
}

/**
 * @category model
 * @since 1.0.0
 * @tsplus type effect/printer/DocTree.Ops
 */
export interface DocTreeOps {
  $: DocTreeAspects
}
/**
 * @category instances
 * @since 1.0.0
 */
export const DocTree: DocTreeOps = {
  $: {}
}

export interface DocTreeTypeLambda extends TypeLambda {
  readonly type: DocTree<this["Target"]>
}

/**
 * @category model
 * @since 1.0.0
 * @tsplus type effect/printer/DocTree.Aspects
 */
export interface DocTreeAspects {}

/**
 * @category model
 * @since 1.0.0
 */
export interface EmptyTree<A> {
  readonly _tag: "EmptyTree"
  readonly _id: TypeId
  readonly _A: (_: never) => A
}

/**
 * @category model
 * @since 1.0.0
 */
export interface CharTree<A> {
  readonly _tag: "CharTree"
  readonly _id: TypeId
  readonly _A: (_: never) => A
  readonly char: string
}

/**
 * @category model
 * @since 1.0.0
 */
export interface TextTree<A> {
  readonly _tag: "TextTree"
  readonly _id: TypeId
  readonly _A: (_: never) => A
  readonly text: string
}

/**
 * @category model
 * @since 1.0.0
 */
export interface LineTree<A> {
  readonly _tag: "LineTree"
  readonly _id: TypeId
  readonly _A: (_: never) => A
  readonly indentation: number
}

/**
 * @category model
 * @since 1.0.0
 */
export interface AnnotationTree<A> {
  readonly _tag: "AnnotationTree"
  readonly _id: TypeId
  readonly _A: (_: never) => A
  readonly annotation: A
  readonly tree: DocTree<A>
}

/**
 * @category model
 * @since 1.0.0
 */
export interface ConcatTree<A> {
  readonly _tag: "ConcatTree"
  readonly _id: TypeId
  readonly _A: (_: never) => A
  readonly trees: Chunk<DocTree<A>>
}

// -----------------------------------------------------------------------------
// Refinements
// -----------------------------------------------------------------------------

/**
 * Returns `true` if the specified value is a `DocTree`, `false` otherwise.
 *
 * @category refinements
 * @since 1.0.0
 * @tsplus static effect/printer/DocTree.Ops isDocTree
 */
export const isDocTree: (u: unknown) => u is DocTree<unknown> = DT.isDocTree

/**
 * Returns `true` if the specified `DocTree` is an `EmptyTree`, `false` otherwise.
 *
 * @category refinements
 * @since 1.0.0
 * @tsplus fluent effect/printer/DocTree isEmptyTree
 */
export const isEmptyTree: <A>(self: DocTree<A>) => self is EmptyTree<A> = DT.isEmptyTree

/**
 * Returns `true` if the specified `DocTree` is an `CharTree`, `false` otherwise.
 *
 * @category refinements
 * @since 1.0.0
 * @tsplus fluent effect/printer/DocTree isCharTree
 */
export const isCharTree: <A>(self: DocTree<A>) => self is CharTree<A> = DT.isCharTree

/**
 * Returns `true` if the specified `DocTree` is an `TextTree`, `false` otherwise.
 *
 * @category refinements
 * @since 1.0.0
 * @tsplus fluent effect/printer/DocTree isTextTree
 */
export const isTextTree: <A>(self: DocTree<A>) => self is DT.TextTree<A> = DT.isTextTree

/**
 * Returns `true` if the specified `DocTree` is an `LineTree`, `false` otherwise.
 *
 * @category refinements
 * @since 1.0.0
 * @tsplus fluent effect/printer/DocTree isLineTree
 */
export const isLineTree: <A>(self: DocTree<A>) => self is DT.LineTree<A> = DT.isLineTree

/**
 * Returns `true` if the specified `DocTree` is an `AnnotationTree`, `false` otherwise.
 *
 * @category refinements
 * @since 1.0.0
 * @tsplus fluent effect/printer/DocTree isAnnotationTree
 */
export const isAnnotationTree: <A>(self: DocTree<A>) => self is DT.AnnotationTree<A> = DT.isAnnotationTree

/**
 * Returns `true` if the specified `DocTree` is an `ConcatTree`, `false` otherwise.
 *
 * @category refinements
 * @since 1.0.0
 * @tsplus fluent effect/printer/DocTree isConcatTree
 */
export const isConcatTree: <A>(self: DocTree<A>) => self is DT.ConcatTree<A> = DT.isConcatTree

// -----------------------------------------------------------------------------
// Constructors
// -----------------------------------------------------------------------------

/**
 * @category constructors
 * @since 1.0.0
 * @tsplus static effect/printer/DocTree.Ops empty
 */
export const empty: DocTree<never> = DT.empty

/**
 * @category constructors
 * @since 1.0.0
 * @tsplus static effect/printer/DocTree.Ops char
 */
export const char: <A>(char: string) => DocTree<A> = DT.char

/**
 * @category constructors
 * @since 1.0.0
 * @tsplus static effect/printer/DocTree.Ops text
 */
export const text: <A>(text: string) => DocTree<A> = DT.text

/**
 * @category constructors
 * @since 1.0.0
 * @tsplus static effect/printer/DocTree.Ops line
 */
export const line: <A>(indentation: number) => DocTree<A> = DT.line

/**
 * Annotate the specified `DocTree` with an annotation of type `A`.
 *
 * @category constructors
 * @since 1.0.0
 * @tsplus static effect/printer/DocTree.Ops annotation
 */
export const annotation: <A>(annotation: A) => (self: DocTree<A>) => DocTree<A> = DT.annotation

/**
 * Horizontally concatenates multiple `DocTree`s.
 *
 * @category constructors
 * @since 1.0.0
 * @tsplus static effect/printer/DocTree.Ops concat
 */
export const concat: <A>(trees: Chunk<DocTree<A>>) => DocTree<A> = DT.concat

// -----------------------------------------------------------------------------
// Annotations
// -----------------------------------------------------------------------------

/**
 * Change the annotation of a document to a different annotation, or none at
 * all.
 *
 * @category annotations
 * @since 1.0.0
 * @tsplus static effect/printer/DocTree.Aspects alterAnnotations
 * @tsplus pipeable effect/printer/DocTree alterAnnotations
 */
export const alterAnnotations: <A, B>(
  f: (a: A) => Iterable<B>
) => (
  self: DocTree<A>
) => DocTree<B> = DT.alterAnnotations

/**
 * Change the annotation of a `DocTree`.
 *
 * @category annotations
 * @since 1.0.0
 * @tsplus static effect/printer/DocTree.Aspects map
 * @tsplus pipeable effect/printer/DocTree map
 * @tsplus static effect/printer/DocTree.Aspects reAnnotate
 * @tsplus pipeable effect/printer/DocTree reAnnotate
 */
export const reAnnotate: <A, B>(f: (a: A) => B) => (self: DocTree<A>) => DocTree<B> = DT.reAnnotate

/**
 * Remove all annotations from a `DocTree`.
 *
 * @category annotations
 * @since 1.0.0
 * @tsplus static effect/printer/DocTree.Aspects unAnnotate
 * @tsplus getter effect/printer/DocTree unAnnotate
 */
export const unAnnotate: <A>(self: DocTree<A>) => DocTree<never> = DT.unAnnotate

// -----------------------------------------------------------------------------
// Folding
// -----------------------------------------------------------------------------

/**
 * @category folding
 * @since 1.0.0
 * @tsplus static effect/printer/DocTree.Aspects foldMap
 * @tsplus pipeable effect/printer/DocTree foldMap
 */
export const foldMap: <A, M>(
  I: Monoid<M>,
  f: (a: A) => M
) => (
  self: DocTree<A>
) => M = DT.foldMap

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
 * import * as Doc from "@effect/printer/Doc"
 * import * as DocTree from "@effect/printer/DocTree"
 * import * as Layout from "@effect/printer/Layout"
 * import { identity, pipe } from "@fp-ts/data/Function"
 * import * as String from "@fp-ts/data/String"
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
 * const tree = DocTree.treeForm(Layout.pretty(Layout.defaultLayoutOptions)(doc))
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
 *
 * @category rendering
 * @since 1.0.0
 * @tsplus static effect/printer/DocTree.Aspects renderSimplyDecorated
 * @tsplus pipeable effect/printer/DocTree renderSimplyDecorated
 */
export const renderSimplyDecorated: <A, M>(
  M: Monoid<M>,
  renderText: (text: string) => M,
  renderAnnotation: (annotation: A, out: M) => M
) => (self: DocTree<A>) => M = DT.renderSimplyDecorated

// -----------------------------------------------------------------------------
// Conversions
// -----------------------------------------------------------------------------

/**
 * Converts a `DocStream<A>` into a `DocTree<A>`.
 *
 * @category conversions
 * @since 1.0.0
 * @tsplus static effect/printer/DocStream.Aspects treeForm
 * @tsplus getter effect/printer/DocStream treeForm
 */
export const treeForm: <A>(stream: DocStream<A>) => DocTree<A> = DT.treeForm

// -----------------------------------------------------------------------------
// Instances
// -----------------------------------------------------------------------------

/**
 * @category instances
 * @since 1.0.0
 * @tsplus static effect/printer/DocTree.Ops getSemigroup
 */
export const getSemigroup: <A>() => Semigroup<DocTree<A>> = DT.getSemigroup

/**
 * @category instances
 * @since 1.0.0
 * @tsplus static effect/printer/DocTree.Ops getMonoid
 */
export const getMonoid: <A>() => Monoid<DocTree<A>> = DT.getMonoid

/**
 * @category instances
 * @since 1.0.0
 * @tsplus static effect/printer/DocTree.Ops Covariant
 */
export const Functor: _Functor<DocTree.TypeLambda> = DT.Functor
