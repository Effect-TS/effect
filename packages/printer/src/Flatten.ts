/**
 * @since 1.0.0
 */

import type { Covariant as _Functor } from "@effect/typeclass/Covariant"
import type { Equal } from "effect/Equal"
import type { TypeLambda } from "effect/HKT"
import * as internal from "./internal/flatten.js"

/**
 * @since 1.0.0
 * @category symbol
 */
export const FlattenTypeId: unique symbol = internal.FlattenTypeId as FlattenTypeId

/**
 * @since 1.0.0
 * @category symbol
 */
export type FlattenTypeId = typeof FlattenTypeId

/**
 * Because certain documents do not change after removal of newlines, etc, there
 * is no point in creating a `Union` of the flattened and unflattened versions.
 * All this leads to is the introduction of two possible branches for a layout
 * algorithm to take, resulting in potentially exponential behavior on deeply
 * nested examples.
 *
 * @since 1.0.0
 * @category model
 */
export type Flatten<A> = Flattened<A> | AlreadyFlat<A> | NeverFlat<A>

/**
 * @since 1.0.0
 */
export declare namespace Flatten {
  /**
   * @since 1.0.0
   * @category model
   */
  export interface Variance<A> extends Equal {
    readonly [FlattenTypeId]: {
      readonly _A: (_: never) => A
    }
  }

  /**
   * @since 1.0.0
   */
  export type TypeLambda = FlattenTypeLambda
}

/**
 * @since 1.0.0
 * @category model
 */
export interface FlattenTypeLambda extends TypeLambda {
  readonly type: Flatten<this["Target"]>
}

/**
 * Represents a `FlattenResult` where `A` is likely flatter than the input.
 *
 * @since 1.0.0
 * @category model
 */
export interface Flattened<A> extends Flatten.Variance<A> {
  readonly _tag: "Flattened"
  readonly value: A
}

/**
 * Represents a `FlattenResult` where the input was already flat.
 *
 * @since 1.0.0
 * @category model
 */
export interface AlreadyFlat<A> extends Flatten.Variance<A> {
  readonly _tag: "AlreadyFlat"
}

/**
 * Represents a `FlattenResult` where the input cannot be flattened.
 *
 * @since 1.0.0
 * @category model
 */
export interface NeverFlat<A> extends Flatten.Variance<A> {
  readonly _tag: "NeverFlat"
}

// -----------------------------------------------------------------------------
// Refinements
// -----------------------------------------------------------------------------

/**
 * Returns `true` if the specified value is a `Flatten`, `false` otherwise.
 *
 * @since 1.0.0
 * @category refinements
 */
export const isFlatten: (u: unknown) => u is Flatten<unknown> = internal.isFlatten

/**
 * Returns `true` if the specified `Flatten` is a `Flattened`, `false` otherwise.
 *
 * @since 1.0.0
 * @category refinements
 */
export const isFlattened: <A>(a: Flatten<A>) => a is Flattened<A> = internal.isFlattened

/**
 * Returns `true` if the specified `Flatten` is an `AlreadyFlat`, `false` otherwise.
 *
 * @since 1.0.0
 * @category refinements
 */
export const isAlreadyFlat: <A>(a: Flatten<A>) => a is AlreadyFlat<A> = internal.isAlreadyFlat

/**
 * Returns `true` if the specified `Flatten` is a `NeverFlat`, `false` otherwise.
 *
 * @since 1.0.0
 * @category refinements
 */
export const isNeverFlat: <A>(a: Flatten<A>) => a is NeverFlat<A> = internal.isNeverFlat

// -----------------------------------------------------------------------------
// Constructors
// -----------------------------------------------------------------------------

/**
 * @since 1.0.0
 * @category constructors
 */
export const flattened: <A>(value: A) => Flatten<A> = internal.flattened

/**
 * @since 1.0.0
 * @category constructors
 */
export const alreadyFlat: Flatten<never> = internal.alreadyFlat

/**
 * @since 1.0.0
 * @category constructors
 */
export const neverFlat: Flatten<never> = internal.neverFlat

// -----------------------------------------------------------------------------
// Combinators
// -----------------------------------------------------------------------------

/**
 * @since 1.0.0
 * @category mapping
 */
export const map: {
  <A, B>(f: (a: A) => B): (self: Flatten<A>) => Flatten<B>
  <A, B>(self: Flatten<A>, f: (a: A) => B): Flatten<B>
} = internal.map
