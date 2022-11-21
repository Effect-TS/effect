/**
 * @since 1.0.0
 */

import * as DS from "@effect/printer/internal/DocStream"
import type { TypeLambda } from "@fp-ts/core/HKT"
import type { Covariant as _Functor } from "@fp-ts/core/typeclass/Covariant"
import type { Monoid } from "@fp-ts/core/typeclass/Monoid"
import type { Option } from "@fp-ts/data/Option"

// -----------------------------------------------------------------------------
// Models
// -----------------------------------------------------------------------------

const TypeId: unique symbol = DS.DocStreamTypeId as TypeId

/**
 * @category symbol
 * @since 1.0.0
 */
export type TypeId = typeof TypeId

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
 * @category model
 * @since 1.0.0
 * @tsplus type effect/printer/DocStream
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
  export type TypeLambda = DocStreamTypeLambda
}

/**
 * @category model
 * @since 1.0.0
 * @tsplus type effect/printer/DocStream.Ops
 */
export interface DocStreamOps {
  $: DocStreamAspects
}
/**
 * @category instances
 * @since 1.0.0
 */
export const DocStream: DocStreamOps = {
  $: {}
}

/**
 * @category model
 * @since 1.0.0
 */
export interface DocStreamTypeLambda extends TypeLambda {
  readonly type: DocStream<this["Target"]>
}

/**
 * @category model
 * @since 1.0.0
 *
 * @tsplus type effect/printer/DocStream.Aspects
 */
export interface DocStreamAspects {}

/**
 * Represents a `Doc` that failed to be laid out.
 *
 * @category model
 * @since 1.0.0
 */
export interface FailedStream<A> {
  readonly _tag: "FailedStream"
  readonly _id: TypeId
  readonly _A: (_: never) => A
}

/**
 * Represents the an empty `Doc`.
 *
 * @category model
 * @since 1.0.0
 */
export interface EmptyStream<A> {
  readonly _tag: "EmptyStream"
  readonly _id: TypeId
  readonly _A: (_: never) => A
}

/**
 * Represents a `Doc` containing a single character.
 *
 * @category model
 * @since 1.0.0
 */
export interface CharStream<A> {
  readonly _tag: "CharStream"
  readonly _id: TypeId
  readonly _A: (_: never) => A
  readonly char: string
  readonly stream: DocStream<A>
}

/**
 * Represents a `Doc` containing a string of text.
 *
 * @category model
 * @since 1.0.0
 */
export interface TextStream<A> {
  readonly _tag: "TextStream"
  readonly _id: TypeId
  readonly _A: (_: never) => A
  readonly text: string
  readonly stream: DocStream<A>
}

/**
 * Represents a `Doc` containing a single line. The `indentation`
 * represents the indentation level for the subsequent line in the
 * `Doc`.
 *
 * @category model
 * @since 1.0.0
 */
export interface LineStream<A> {
  readonly _tag: "LineStream"
  readonly _id: TypeId
  readonly _A: (_: never) => A
  readonly indentation: number
  readonly stream: DocStream<A>
}

/**
 * Represents the addition of an annotation of type `A` to a `Doc`.
 *
 * @category model
 * @since 1.0.0
 */
export interface PushAnnotationStream<A> {
  readonly _tag: "PushAnnotationStream"
  readonly _id: TypeId
  readonly _A: (_: never) => A
  readonly annotation: A
  readonly stream: DocStream<A>
}

/**
 * Represents the removal of a previously pushed annotation from a `Doc`.
 *
 * @category model
 * @since 1.0.0
 */
export interface PopAnnotationStream<A> {
  readonly _tag: "PopAnnotationStream"
  readonly _id: TypeId
  readonly _A: (_: never) => A
  readonly stream: DocStream<A>
}

// -----------------------------------------------------------------------------
// Refinements
// -----------------------------------------------------------------------------

/**
 * Returns `true` if the specified value is a `DocStream`, `false` otherwise.
 *
 * @category refinements
 * @since 1.0.0
 * @tsplus static effect/printer/DocStream.Ops isDocStream
 */
export const isDocStream: (u: unknown) => u is DocStream<unknown> = DS.isDocStream

/**
 * Returns `true` if the specified `DocStream` is a `FailedStream`, `false` otherwise.
 *
 * @category refinements
 * @since 1.0.0
 * @tsplus fluent effect/printer/DocStream isFailedStream
 */
export const isFailedStream: <A>(self: DocStream<A>) => self is FailedStream<A> = DS.isFailedStream

/**
 * Returns `true` if the specified `DocStream` is a `EmptyStream`, `false` otherwise.
 *
 * @category refinements
 * @since 1.0.0
 * @tsplus fluent effect/printer/DocStream isEmptyStream
 */
export const isEmptyStream: <A>(self: DocStream<A>) => self is EmptyStream<A> = DS.isEmptyStream

/**
 * Returns `true` if the specified `DocStream` is a `CharStream`, `false` otherwise.
 *
 * @category refinements
 * @since 1.0.0
 * @tsplus fluent effect/printer/DocStream isCharStream
 */
export const isCharStream: <A>(self: DocStream<A>) => self is CharStream<A> = DS.isCharStream

/**
 * Returns `true` if the specified `DocStream` is a `TextStream`, `false` otherwise.
 *
 * @category refinements
 * @since 1.0.0
 * @tsplus fluent effect/printer/DocStream isTextStream
 */
export const isTextStream: <A>(self: DocStream<A>) => self is TextStream<A> = DS.isTextStream

/**
 * Returns `true` if the specified `DocStream` is a `LineStream`, `false` otherwise.
 *
 * @category refinements
 * @since 1.0.0
 * @tsplus fluent effect/printer/DocStream isLineStream
 */
export const isLineStream: <A>(self: DocStream<A>) => self is LineStream<A> = DS.isLineStream

/**
 * Returns `true` if the specified `DocStream` is a `PushAnnotationStream`, `false` otherwise.
 *
 * @category refinements
 * @since 1.0.0
 * @tsplus fluent effect/printer/DocStream isPushAnnotationStream
 */
export const isPushAnnotationStream: <A>(
  self: DocStream<A>
) => self is PushAnnotationStream<A> = DS.isPushAnnotationStream

/**
 * Returns `true` if the specified `DocStream` is a `PopAnnotationStream`, `false` otherwise.
 *
 * @category refinements
 * @since 1.0.0
 * @tsplus fluent effect/printer/DocStream isPopAnnotationStream
 */
export const isPopAnnotationStream: <A>(
  self: DocStream<A>
) => self is PopAnnotationStream<A> = DS.isPopAnnotationStream

// -----------------------------------------------------------------------------
// Constructors
// -----------------------------------------------------------------------------

/**
 * @category constructors
 * @since 1.0.0
 * @tsplus static effect/printer/DocStream.Ops failed
 */
export const failed: DocStream<never> = DS.failed

/**
 * @category constructors
 * @since 1.0.0
 * @tsplus static effect/printer/DocStream.Ops empty
 */
export const empty: DocStream<never> = DS.empty

/**
 * @category constructors
 * @since 1.0.0
 * @tsplus static effect/printer/DocStream.Ops char
 * @tsplus static effect/printer/DocStream.Aspects char
 * @tsplus pipeable effect/printer/DocStream char
 */
export const char: (char: string) => <A>(self: DocStream<A>) => DocStream<A> = DS.char

/**
 * @category constructors
 * @since 1.0.0
 * @tsplus static effect/printer/DocStream.Ops text
 * @tsplus static effect/printer/DocStream.Aspects text
 * @tsplus pipeable effect/printer/DocStream text
 */
export const text: (text: string) => <A>(stream: DocStream<A>) => DocStream<A> = DS.text

/**
 * @category constructors
 * @since 1.0.0
 * @tsplus static effect/printer/DocStream.Ops line
 * @tsplus static effect/printer/DocStream.Aspects line
 * @tsplus pipeable effect/printer/DocStream line
 */
export const line: (indentation: number) => <A>(stream: DocStream<A>) => DocStream<A> = DS.line

/**
 * @category constructors
 * @since 1.0.0
 * @tsplus static effect/printer/DocStream.Ops pushAnnotation
 * @tsplus static effect/printer/DocStream.Aspects pushAnnotation
 * @tsplus pipeable effect/printer/DocStream pushAnnotation
 */
export const pushAnnotation: <B>(
  annotation: B
) => <A>(
  stream: DocStream<B>
) => DocStream<A | B> = DS.pushAnnotation

/**
 * @category constructors
 * @since 1.0.0
 * @tsplus static effect/printer/DocStream.Ops popAnnotation
 */
export const popAnnotation: <A>(stream: DocStream<A>) => DocStream<A> = DS.popAnnotation

// -----------------------------------------------------------------------------
// Annotations
// -----------------------------------------------------------------------------

/**
 * Changes the annotation of a document to a different annotation, or to
 * none at all.
 *
 * @category annotations
 * @since 1.0.0
 * @tsplus static effect/printer/DocStream.Aspects alterAnnotations
 * @tsplus pipeable effect/printer/DocStream alterAnnotations
 */
export const alterAnnotations: <A, B>(
  f: (a: A) => Option<B>
) => (
  self: DocStream<A>
) => DocStream<B> = DS.alterAnnotations

/**
 * Modify the annotations of a document.
 *
 * @category annotations
 * @since 1.0.0
 * @tsplus static effect/printer/DocStream.Aspects map
 * @tsplus pipeable effect/printer/DocStream map
 * @tsplus static effect/printer/DocStream.Aspects reAnnotate
 * @tsplus pipeable effect/printer/DocStream reAnnotate
 */
export const reAnnotate: <A, B>(
  f: (a: A) => B
) => (
  self: DocStream<A>
) => DocStream<B> = DS.reAnnotate

/**
 * Remove all annotations from a document.
 *
 * @category annotations
 * @since 1.0.0
 * @tsplus static effect/printer/DocStream.Ops unAnnotate
 * @tsplus getter effect/printer/DocStream unAnnotate
 */
export const unAnnotate: <A>(self: DocStream<A>) => DocStream<never> = DS.unAnnotate

// -----------------------------------------------------------------------------
// Annotations
// -----------------------------------------------------------------------------

/**
 * @category folding
 * @since 1.0.0
 * @tsplus static effect/printer/DocStream.Aspects foldMap
 * @tsplus pipeable effect/printer/DocStream foldMap
 */
export const foldMap: <A, M>(M: Monoid<M>, f: (a: A) => M) => (self: DocStream<A>) => M = DS.foldMap

/**
 * @category folding
 * @since 1.0.0
 * @tsplus static effect/printer/DocStream.Aspects match
 * @tsplus pipeable effect/printer/DocStream match
 */
export const match: <A, R>(patterns: {
  readonly FailedStream: () => R
  readonly EmptyStream: () => R
  readonly CharStream: (char: string, stream: DocStream<A>) => R
  readonly TextStream: (text: string, stream: DocStream<A>) => R
  readonly LineStream: (indentation: number, stream: DocStream<A>) => R
  readonly PushAnnotationStream: (annotation: A, stream: DocStream<A>) => R
  readonly PopAnnotationStream: (stream: DocStream<A>) => R
}) => (self: DocStream<A>) => R = DS.match

/**
 * @category instances
 * @since 1.0.0
 * @tsplus static effect/printer/DocStream.Ops Functor
 */
export const Functor: _Functor<DocStream.TypeLambda> = DS.Functor
