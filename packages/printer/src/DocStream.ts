/**
 * @since 1.0.0
 */

import type * as covariant from "@effect/typeclass/Covariant"
import type * as invariant from "@effect/typeclass/Invariant"
import type * as monoid from "@effect/typeclass/Monoid"
import type { Equal } from "effect/Equal"
import type { TypeLambda } from "effect/HKT"
import type { Option } from "effect/Option"
import * as internal from "./internal/docStream.js"

// -----------------------------------------------------------------------------
// Models
// -----------------------------------------------------------------------------

/**
 * @since 1.0.0
 * @category symbol
 */
export const DocStreamTypeId: unique symbol = internal.DocStreamTypeId as DocStreamTypeId

/**
 * @since 1.0.0
 * @category symbol
 */
export type DocStreamTypeId = typeof DocStreamTypeId

/**
 * Represents a document that has been laid out and can be processed used by the
 * rendering algorithms.
 *
 * A simplified view is that a `Doc` is equivalent to an array of `DocStream`,
 * and the layout algorithms simply pick a `DocStream` based upon which instance
 * best fits the layout constraints. Therefore, a `DocStream` has all complexity
 * contained in a `Doc` resolved, making it very easy to convert to other
 * formats, such as plaintext or terminal output.
 *
 * @since 1.0.0
 * @category model
 */
export type DocStream<A> =
  | FailedStream<A>
  | EmptyStream<A>
  | CharStream<A>
  | TextStream<A>
  | LineStream<A>
  | PushAnnotationStream<A>
  | PopAnnotationStream<A>

/**
 * @since 1.0.0
 */
export declare namespace DocStream {
  /**
   * @since 1.0.0
   * @category model
   */
  export interface Variance<A> extends Equal {
    readonly [DocStreamTypeId]: {
      readonly _A: (_: never) => A
    }
  }

  /**
   * @since 1.0.0
   * @category model
   */
  export type TypeLambda = DocStreamTypeLambda
}

/**
 * @since 1.0.0
 * @category model
 */
export interface DocStreamTypeLambda extends TypeLambda {
  readonly type: DocStream<this["Target"]>
}

/**
 * Represents a `Doc` that failed to be laid out.
 *
 * @since 1.0.0
 * @category model
 */
export interface FailedStream<A> extends DocStream.Variance<A> {
  readonly _tag: "FailedStream"
}

/**
 * Represents the an empty `Doc`.
 *
 * @since 1.0.0
 * @category model
 */
export interface EmptyStream<A> extends DocStream.Variance<A> {
  readonly _tag: "EmptyStream"
}

/**
 * Represents a `Doc` containing a single character.
 *
 * @since 1.0.0
 * @category model
 */
export interface CharStream<A> extends DocStream.Variance<A> {
  readonly _tag: "CharStream"
  readonly char: string
  readonly stream: DocStream<A>
}

/**
 * Represents a `Doc` containing a string of text.
 *
 * @since 1.0.0
 * @category model
 */
export interface TextStream<A> extends DocStream.Variance<A> {
  readonly _tag: "TextStream"
  readonly text: string
  readonly stream: DocStream<A>
}

/**
 * Represents a `Doc` containing a single line. The `indentation`
 * represents the indentation level for the subsequent line in the
 * `Doc`.
 *
 * @since 1.0.0
 * @category model
 */
export interface LineStream<A> extends DocStream.Variance<A> {
  readonly _tag: "LineStream"
  readonly indentation: number
  readonly stream: DocStream<A>
}

/**
 * Represents the addition of an annotation of type `A` to a `Doc`.
 *
 * @since 1.0.0
 * @category model
 */
export interface PushAnnotationStream<A> extends DocStream.Variance<A> {
  readonly _tag: "PushAnnotationStream"
  readonly annotation: A
  readonly stream: DocStream<A>
}

/**
 * Represents the removal of a previously pushed annotation from a `Doc`.
 *
 * @since 1.0.0
 * @category model
 */
export interface PopAnnotationStream<A> extends DocStream.Variance<A> {
  readonly _tag: "PopAnnotationStream"
  readonly stream: DocStream<A>
}

// -----------------------------------------------------------------------------
// Refinements
// -----------------------------------------------------------------------------

/**
 * Returns `true` if the specified value is a `DocStream`, `false` otherwise.
 *
 * @since 1.0.0
 * @category refinements
 */
export const isDocStream: (u: unknown) => u is DocStream<unknown> = internal.isDocStream

/**
 * Returns `true` if the specified `DocStream` is a `FailedStream`, `false` otherwise.
 *
 * @since 1.0.0
 * @category refinements
 */
export const isFailedStream: <A>(self: DocStream<A>) => self is FailedStream<A> = internal.isFailedStream

/**
 * Returns `true` if the specified `DocStream` is a `EmptyStream`, `false` otherwise.
 *
 * @since 1.0.0
 * @category refinements
 */
export const isEmptyStream: <A>(self: DocStream<A>) => self is EmptyStream<A> = internal.isEmptyStream

/**
 * Returns `true` if the specified `DocStream` is a `CharStream`, `false` otherwise.
 *
 * @since 1.0.0
 * @category refinements
 */
export const isCharStream: <A>(self: DocStream<A>) => self is CharStream<A> = internal.isCharStream

/**
 * Returns `true` if the specified `DocStream` is a `TextStream`, `false` otherwise.
 *
 * @since 1.0.0
 * @category refinements
 */
export const isTextStream: <A>(self: DocStream<A>) => self is TextStream<A> = internal.isTextStream

/**
 * Returns `true` if the specified `DocStream` is a `LineStream`, `false` otherwise.
 *
 * @since 1.0.0
 * @category refinements
 */
export const isLineStream: <A>(self: DocStream<A>) => self is LineStream<A> = internal.isLineStream

/**
 * Returns `true` if the specified `DocStream` is a `PushAnnotationStream`, `false` otherwise.
 *
 * @since 1.0.0
 * @category refinements
 */
export const isPushAnnotationStream: <A>(
  self: DocStream<A>
) => self is PushAnnotationStream<A> = internal.isPushAnnotationStream

/**
 * Returns `true` if the specified `DocStream` is a `PopAnnotationStream`, `false` otherwise.
 *
 * @since 1.0.0
 * @category refinements
 */
export const isPopAnnotationStream: <A>(
  self: DocStream<A>
) => self is PopAnnotationStream<A> = internal.isPopAnnotationStream

// -----------------------------------------------------------------------------
// Constructors
// -----------------------------------------------------------------------------

/**
 * @since 1.0.0
 * @category constructors
 */
export const failed: DocStream<never> = internal.failed

/**
 * @since 1.0.0
 * @category constructors
 */
export const empty: DocStream<never> = internal.empty

/**
 * @since 1.0.0
 * @category constructors
 */
export const char: {
  (char: string): <A>(self: DocStream<A>) => DocStream<A>
  <A>(self: DocStream<A>, char: string): DocStream<A>
} = internal.char

/**
 * @since 1.0.0
 * @category constructors
 */
export const text: {
  (text: string): <A>(self: DocStream<A>) => DocStream<A>
  <A>(self: DocStream<A>, text: string): DocStream<A>
} = internal.text

/**
 * @since 1.0.0
 * @category constructors
 */
export const line: {
  (indentation: number): <A>(self: DocStream<A>) => DocStream<A>
  <A>(self: DocStream<A>, indentation: number): DocStream<A>
} = internal.line

/**
 * @since 1.0.0
 * @category constructors
 */
export const pushAnnotation: {
  <B>(annotation: B): <A>(self: DocStream<A>) => DocStream<B | A>
  <A, B>(self: DocStream<A>, annotation: B): DocStream<A | B>
} = internal.pushAnnotation

/**
 * @since 1.0.0
 * @category constructors
 */
export const popAnnotation: <A>(stream: DocStream<A>) => DocStream<A> = internal.popAnnotation

// -----------------------------------------------------------------------------
// Annotations
// -----------------------------------------------------------------------------

/**
 * Changes the annotation of a document to a different annotation, or to
 * none at all.
 *
 * @since 1.0.0
 * @category annotations
 */
export const alterAnnotations: {
  <A, B>(f: (a: A) => Option<B>): (self: DocStream<A>) => DocStream<B>
  <A, B>(self: DocStream<A>, f: (a: A) => Option<B>): DocStream<B>
} = internal.alterAnnotations

/**
 * Modify the annotations of a document.
 *
 * @since 1.0.0
 * @category annotations
 */
export const reAnnotate: {
  <A, B>(f: (a: A) => B): (self: DocStream<A>) => DocStream<B>
  <A, B>(self: DocStream<A>, f: (a: A) => B): DocStream<B>
} = internal.reAnnotate

/**
 * Remove all annotations from a document.
 *
 * @since 1.0.0
 * @category annotations
 */
export const unAnnotate: <A>(self: DocStream<A>) => DocStream<never> = internal.unAnnotate

// -----------------------------------------------------------------------------
// Annotations
// -----------------------------------------------------------------------------

/**
 * @since 1.0.0
 * @category folding
 */
export const foldMap: {
  <A, M>(M: monoid.Monoid<M>, f: (a: A) => M): (self: DocStream<A>) => M
  <A, M>(self: DocStream<A>, M: monoid.Monoid<M>, f: (a: A) => M): M
} = internal.foldMap

/**
 * @since 1.0.0
 * @category folding
 */
export const match: {
  <A, R>(
    patterns: {
      readonly FailedStream: () => R
      readonly EmptyStream: () => R
      readonly CharStream: (char: string, stream: DocStream<A>) => R
      readonly TextStream: (text: string, stream: DocStream<A>) => R
      readonly LineStream: (indentation: number, stream: DocStream<A>) => R
      readonly PushAnnotationStream: (annotation: A, stream: DocStream<A>) => R
      readonly PopAnnotationStream: (stream: DocStream<A>) => R
    }
  ): (self: DocStream<A>) => R
  <A, R>(
    self: DocStream<A>,
    patterns: {
      readonly FailedStream: () => R
      readonly EmptyStream: () => R
      readonly CharStream: (char: string, stream: DocStream<A>) => R
      readonly TextStream: (text: string, stream: DocStream<A>) => R
      readonly LineStream: (indentation: number, stream: DocStream<A>) => R
      readonly PushAnnotationStream: (annotation: A, stream: DocStream<A>) => R
      readonly PopAnnotationStream: (stream: DocStream<A>) => R
    }
  ): R
} = internal.match

/**
 * @since 1.0.0
 * @category mapping
 */
export const map: {
  <A, B>(f: (a: A) => B): (self: DocStream<A>) => DocStream<B>
  <A, B>(self: DocStream<A>, f: (a: A) => B): DocStream<B>
} = internal.map

/**
 * @since 1.0.0
 * @category instances
 */
export const Functor: covariant.Covariant<DocStreamTypeLambda> = internal.Covariant

/**
 * @since 1.0.0
 * @category instances
 */
export const Invariant: invariant.Invariant<DocStreamTypeLambda> = internal.Invariant
