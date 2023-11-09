/**
 * @since 2.0.0
 */
import type { LazyArg } from "./Function.js"
import { dual } from "./Function.js"

/**
 * @category model
 * @since 2.0.0
 */
export type Ordering = -1 | 0 | 1

/**
 * Inverts the ordering of the input `Ordering`.
 *
 * @param o - The input `Ordering`.
 *
 * @example
 * import { reverse } from "effect/Ordering"
 *
 * assert.deepStrictEqual(reverse(1), -1)
 * assert.deepStrictEqual(reverse(-1), 1)
 * assert.deepStrictEqual(reverse(0), 0)
 *
 * @since 2.0.0
 */
export const reverse = (o: Ordering): Ordering => (o === -1 ? 1 : o === 1 ? -1 : 0)

/**
 * Depending on the `Ordering` parameter given to it, returns a value produced by one of the 3 functions provided as parameters.
 *
 * @param self - The `Ordering` parameter to match against.
 * @param onLessThan - A function that will be called if the `Ordering` parameter is `-1`.
 * @param onEqual - A function that will be called if the `Ordering` parameter is `0`.
 * @param onGreaterThan - A function that will be called if the `Ordering` parameter is `1`.
 *
 * @example
 * import { match } from "effect/Ordering"
 * import { constant } from "effect/Function"
 *
 * const toMessage = match({
 *   onLessThan: constant('less than'),
 *   onEqual: constant('equal'),
 *   onGreaterThan: constant('greater than')
 * })
 *
 * assert.deepStrictEqual(toMessage(-1), "less than")
 * assert.deepStrictEqual(toMessage(0), "equal")
 * assert.deepStrictEqual(toMessage(1), "greater than")
 *
 * @category pattern matching
 * @since 2.0.0
 */
export const match: {
  <A, B, C = B>(
    options: {
      readonly onLessThan: LazyArg<A>
      readonly onEqual: LazyArg<B>
      readonly onGreaterThan: LazyArg<C>
    }
  ): (self: Ordering) => A | B | C
  <A, B, C = B>(
    o: Ordering,
    options: {
      readonly onLessThan: LazyArg<A>
      readonly onEqual: LazyArg<B>
      readonly onGreaterThan: LazyArg<C>
    }
  ): A | B | C
} = dual(2, <A, B, C = B>(
  self: Ordering,
  { onEqual, onGreaterThan, onLessThan }: {
    readonly onLessThan: LazyArg<A>
    readonly onEqual: LazyArg<B>
    readonly onGreaterThan: LazyArg<C>
  }
): A | B | C => self === -1 ? onLessThan() : self === 0 ? onEqual() : onGreaterThan())

/**
 * @category combining
 * @since 2.0.0
 */
export const combine: {
  (that: Ordering): (self: Ordering) => Ordering
  (self: Ordering, that: Ordering): Ordering
} = dual(2, (self: Ordering, that: Ordering): Ordering => self !== 0 ? self : that)

/**
 * @category combining
 * @since 2.0.0
 */
export const combineMany: {
  (collection: Iterable<Ordering>): (self: Ordering) => Ordering
  (self: Ordering, collection: Iterable<Ordering>): Ordering
} = dual(2, (self: Ordering, collection: Iterable<Ordering>): Ordering => {
  let ordering = self
  if (ordering !== 0) {
    return ordering
  }
  for (ordering of collection) {
    if (ordering !== 0) {
      return ordering
    }
  }
  return ordering
})

/**
 * @category combining
 * @since 2.0.0
 */
export const combineAll = (collection: Iterable<Ordering>): Ordering => combineMany(0, collection)
