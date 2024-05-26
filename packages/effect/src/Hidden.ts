/**
 * @since 3.1.3
 */
import type * as Equal from "./Equal.js"
import * as Equivalence from "./Equivalence.js"
import * as hidden_ from "./internal/hidden.js"
import type { Pipeable } from "./Pipeable.js"
import type { Covariant } from "./Types.js"

/**
 * @since 3.1.3
 * @category symbols
 */
export const HiddenTypeId: unique symbol = hidden_.HiddenTypeId

/**
 * @since 3.1.3
 * @category symbols
 */
export type HiddenTypeId = typeof HiddenTypeId

/**
 * @since 3.1.3
 * @category models
 */
export interface Hidden<out A> extends Hidden.Variance<A>, Equal.Equal, Pipeable {
}

/**
 * @since 3.1.3
 */
export declare namespace Hidden {
  /**
   * @since 3.1.3
   * @category models
   */
  export interface Variance<out A> {
    readonly [HiddenTypeId]: {
      readonly _A: Covariant<A>
    }
  }

  /**
   * @since 3.1.3
   * @category type-level
   */
  export type Value<T extends Hidden<any>> = [T] extends [Hidden<infer _A>] ? _A : never
}

/**
 * @since 3.1.3
 * @category refinements
 */
export const isHidden: (u: unknown) => u is Hidden<unknown> = hidden_.isHidden

/**
 * @since 3.1.3
 * @category constructors
 */
export const make: <A>(value: A) => Hidden<A> = hidden_.make

/**
 * @since 3.1.3
 * @category getters
 */
export const value: <A>(self: Hidden<A>) => A = hidden_.value

/**
 * @since 3.1.3
 * @category unsafe
 */
export const unsafeWipe: <A>(self: Hidden<A>) => boolean = hidden_.unsafeWipe

/**
 * @category equivalence
 * @since 3.1.3
 */
export const getEquivalence = <A>(isEquivalent: Equivalence.Equivalence<A>): Equivalence.Equivalence<Hidden<A>> =>
  Equivalence.make((x, y) => x === y || (isEquivalent(value(x), value(y))))
