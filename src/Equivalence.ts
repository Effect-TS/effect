/**
 * This module provides an implementation of the `Equivalence` type class, which defines a binary relation
 * that is reflexive, symmetric, and transitive. In other words, it defines a notion of equivalence between values of a certain type.
 * These properties are also known in mathematics as an "equivalence relation".
 *
 * @since 2.0.0
 */

/**
 * @since 2.0.0
 * @internal
 */
export * from "./impl/Equivalence.js"
/**
 * @since 2.0.0
 * @internal
 */
export * from "./internal/Jumpers/Equivalence.js"

/**
 * @since 2.0.0
 */
export declare namespace Equivalence {
  // eslint-disable-next-line import/no-cycle
  // @ts-expect-error
  export type * from "./impl/Equivalence.js"
}
/**
 * @category type class
 * @since 2.0.0
 */
export interface Equivalence<A> {
  (self: A, that: A): boolean
}
