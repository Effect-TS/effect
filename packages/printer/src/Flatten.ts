/**
 * @since 1.0.0
 */

import * as F from "@effect/printer/internal/Flatten"
import type { TypeLambda } from "@fp-ts/core/HKT"
import type { Covariant as _Functor } from "@fp-ts/core/typeclass/Covariant"

// -----------------------------------------------------------------------------
// Models
// -----------------------------------------------------------------------------

const TypeId: unique symbol = F.FlattenTypeId as TypeId

/**
 * @category symbol
 * @since 1.0.0
 */
export type TypeId = typeof TypeId

/**
 * Because certain documents do not change after removal of newlines, etc, there
 * is no point in creating a `Union` of the flattened and unflattened versions.
 * All this leads to is the introduction of two possible branches for a layout
 * algorithm to take, resulting in potentially exponential behavior on deeply
 * nested examples.
 *
 * @category model
 * @since 1.0.0
 * @tsplus type effect/printer/Flatten
 */
export type Flatten<A> = Flattened<A> | AlreadyFlat<A> | NeverFlat<A>

/**
 * @since 1.0.0
 */
export declare namespace Flatten {
  export type TypeLambda = FlattenTypeLambda
}

/**
 * @category model
 * @since 1.0.0
 * @tsplus type effect/printer/Flatten.Ops
 */
export interface FlattenOps {
  $: FlattenAspects
}
/**
 * @category instances
 * @since 1.0.0
 */
export const Flatten: FlattenOps = {
  $: {}
}

/**
 * @category model
 * @since 1.0.0
 */
export interface FlattenTypeLambda extends TypeLambda {
  readonly type: Flatten<this["Target"]>
}

/**
 * @category model
 * @since 1.0.0
 * @tsplus type effect/printer/Flatten.Aspects
 */
export interface FlattenAspects {}

/**
 * Represents a `FlattenResult` where `A` is likely flatter than the input.
 *
 * @category model
 * @since 1.0.0
 */
export interface Flattened<A> {
  readonly _tag: "Flattened"
  readonly _id: TypeId
  readonly _A: (_: never) => A
  readonly value: A
}

/**
 * Represents a `FlattenResult` where the input was already flat.
 *
 * @category model
 * @since 1.0.0
 */
export interface AlreadyFlat<A> {
  readonly _tag: "AlreadyFlat"
  readonly _id: TypeId
  readonly _A: (_: never) => A
}

/**
 * Represents a `FlattenResult` where the input cannot be flattened.
 *
 * @category model
 * @since 1.0.0
 */
export interface NeverFlat<A> {
  readonly _tag: "NeverFlat"
  readonly _id: TypeId
  readonly _A: (_: never) => A
}

// -----------------------------------------------------------------------------
// Refinements
// -----------------------------------------------------------------------------

/**
 * Returns `true` if the specified value is a `Flatten`, `false` otherwise.
 *
 * @category refinements
 * @since 1.0.0
 * @tsplus static effect/printer/Flatten.Ops isFlatten
 */
export const isFlatten: (u: unknown) => u is Flatten<unknown> = F.isFlatten

/**
 * Returns `true` if the specified `Flatten` is a `Flattened`, `false` otherwise.
 *
 * @category refinements
 * @since 1.0.0
 * @tsplus fluent effect/printer/Flatten isFlattened
 */
export const isFlattened: <A>(a: Flatten<A>) => a is Flattened<A> = F.isFlattened

/**
 * Returns `true` if the specified `Flatten` is an `AlreadyFlat`, `false` otherwise.
 *
 * @category refinements
 * @since 1.0.0
 * @tsplus fluent effect/printer/Flatten isAlreadyFlat
 */
export const isAlreadyFlat: <A>(a: Flatten<A>) => a is AlreadyFlat<A> = F.isAlreadyFlat

/**
 * Returns `true` if the specified `Flatten` is a `NeverFlat`, `false` otherwise.
 *
 * @category refinements
 * @since 1.0.0
 * @tsplus fluent effect/printer/Flatten isNeverFlat
 */
export const isNeverFlat: <A>(a: Flatten<A>) => a is NeverFlat<A> = F.isNeverFlat

// -----------------------------------------------------------------------------
// Constructors
// -----------------------------------------------------------------------------

/**
 * @category constructors
 * @since 1.0.0
 * @tsplus static effect/printer/Flatten.Ops Flattened
 */
export const flattened: <A>(value: A) => Flatten<A> = F.flattened

/**
 * @category constructors
 * @since 1.0.0
 * @tsplus static effect/printer/Flatten.Ops AlreadyFlat
 */
export const alreadyFlat: Flatten<never> = F.alreadyFlat

/**
 * @category constructors
 * @since 1.0.0
 * @tsplus static effect/printer/Flatten.Ops NeverFlat
 */
export const neverFlat: Flatten<never> = F.neverFlat

// -----------------------------------------------------------------------------
// Combinators
// -----------------------------------------------------------------------------

/**
 * @category mapping
 * @since 1.0.0
 * @tsplus static effect/printer/Flatten.Aspects map
 * @tsplus pipeable effect/printer/Flatten map
 */
export const map: <A, B>(f: (a: A) => B) => (self: Flatten<A>) => Flatten<B> = F.map

/**
 * @category folding
 * @since 1.0.0
 * @tsplus static effect/printer/Flatten.Aspects match
 * @tsplus pipeable effect/printer/Flatten match
 */
export const match: <A, R>(patterns: {
  readonly Flattened: (value: A) => R
  readonly AlreadyFlat: () => R
  readonly NeverFlat: () => R
}) => (flatten: Flatten<A>) => R = F.match

// -----------------------------------------------------------------------------
// Instances
// -----------------------------------------------------------------------------

/**
 * @category instances
 * @since 1.0.0
 * @tsplus static effect/printer/Flatten.Ops Functor
 */
export const Functor: _Functor<Flatten.TypeLambda> = F.Functor
