/**
 * @since 3.3.0
 */
import type * as Equal from "./Equal.js"
import * as Equivalence from "./Equivalence.js"
import * as redacted_ from "./internal/redacted.js"
import type { Pipeable } from "./Pipeable.js"
import type { Covariant } from "./Types.js"

/**
 * @since 3.3.0
 * @category symbols
 */
export const RedactedTypeId: unique symbol = redacted_.RedactedTypeId

/**
 * @since 3.3.0
 * @category symbols
 */
export type RedactedTypeId = typeof RedactedTypeId

/**
 * @since 3.3.0
 * @category models
 */
export interface Redacted<out A = string> extends Redacted.Variance<A>, Equal.Equal, Pipeable {
}

/**
 * @since 3.3.0
 */
export declare namespace Redacted {
  /**
   * @since 3.3.0
   * @category models
   */
  export interface Variance<out A> {
    readonly [RedactedTypeId]: {
      readonly _A: Covariant<A>
    }
  }

  /**
   * @since 3.3.0
   * @category type-level
   */
  export type Value<T extends Redacted<any>> = [T] extends [Redacted<infer _A>] ? _A : never
}

/**
 * @since 3.3.0
 * @category refinements
 */
export const isRedacted: (u: unknown) => u is Redacted<unknown> = redacted_.isRedacted

/**
 * @since 3.3.0
 * @category constructors
 */
export const make: <A>(value: A) => Redacted<A> = redacted_.make

/**
 * @since 3.3.0
 * @category getters
 */
export const value: <A>(self: Redacted<A>) => A = redacted_.value

/**
 * @since 3.3.0
 * @category unsafe
 */
export const unsafeWipe: <A>(self: Redacted<A>) => boolean = redacted_.unsafeWipe

/**
 * @category equivalence
 * @since 3.3.0
 */
export const getEquivalence = <A>(isEquivalent: Equivalence.Equivalence<A>): Equivalence.Equivalence<Redacted<A>> =>
  Equivalence.make((x, y) => x === y || (isEquivalent(value(x), value(y))))
