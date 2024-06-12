/**
 * This module provides utility functions for working with tuples in TypeScript.
 *
 * @since 2.0.0
 */
import * as Equivalence from "./Equivalence.js"
import { dual } from "./Function.js"
import type { TypeLambda } from "./HKT.js"
import * as order from "./Order.js"

/**
 * @category type lambdas
 * @since 2.0.0
 */
export interface TupleTypeLambda extends TypeLambda {
  readonly type: [this["Out1"], this["Target"]]
}

/**
 * Constructs a new tuple from the provided values.
 *
 * @param elements - The list of elements to create the tuple from.
 *
 * @example
 * import { make } from "effect/Tuple"
 *
 * assert.deepStrictEqual(make(1, 'hello', true), [1, 'hello', true])
 *
 * @category constructors
 * @since 2.0.0
 */
export const make = <A extends ReadonlyArray<any>>(...elements: A): A => elements

/**
 * Return the first element of a tuple.
 *
 * @param self - A tuple of length `2`.
 *
 * @example
 * import { getFirst } from "effect/Tuple"
 *
 * assert.deepStrictEqual(getFirst(["hello", 42]), "hello")
 *
 * @category getters
 * @since 2.0.0
 */
export const getFirst = <L, R>(self: readonly [L, R]): L => self[0]

/**
 * Return the second element of a tuple.
 *
 * @param self - A tuple of length `2`.
 *
 * @example
 * import { getSecond } from "effect/Tuple"
 *
 * assert.deepStrictEqual(getSecond(["hello", 42]), 42)
 *
 * @category getters
 * @since 2.0.0
 */
export const getSecond = <L, R>(self: readonly [L, R]): R => self[1]

/**
 * Transforms both elements of a tuple using the given functions.
 *
 * @param self - A tuple of length `2`.
 * @param f - The function to transform the first element of the tuple.
 * @param g - The function to transform the second element of the tuple.
 *
 * @example
 * import { mapBoth } from "effect/Tuple"
 *
 * assert.deepStrictEqual(
 *   mapBoth(["hello", 42], { onFirst: s => s.toUpperCase(), onSecond: n => n.toString() }),
 *   ["HELLO", "42"]
 * )
 *
 * @category mapping
 * @since 2.0.0
 */
export const mapBoth: {
  <L1, L2, R1, R2>(options: {
    readonly onFirst: (e: L1) => L2
    readonly onSecond: (a: R1) => R2
  }): (self: readonly [L1, R1]) => [L2, R2]
  <L1, R1, L2, R2>(self: readonly [L1, R1], options: {
    readonly onFirst: (e: L1) => L2
    readonly onSecond: (a: R1) => R2
  }): [L2, R2]
} = dual(
  2,
  <L1, R1, L2, R2>(
    self: readonly [L1, R1],
    { onFirst, onSecond }: {
      readonly onFirst: (e: L1) => L2
      readonly onSecond: (a: R1) => R2
    }
  ): [L2, R2] => [onFirst(self[0]), onSecond(self[1])]
)

/**
 * Transforms the first component of a tuple using a given function.
 *
 * @param self - A tuple of length `2`.
 * @param f - The function to transform the first element of the tuple.
 *
 * @example
 * import { mapFirst } from "effect/Tuple"
 *
 * assert.deepStrictEqual(
 *   mapFirst(["hello", 42], s => s.toUpperCase()),
 *   ["HELLO", 42]
 * )
 *
 * @category mapping
 * @since 2.0.0
 */
export const mapFirst: {
  <L1, L2>(f: (left: L1) => L2): <R>(self: readonly [L1, R]) => [L2, R]
  <L1, R, L2>(self: readonly [L1, R], f: (left: L1) => L2): [L2, R]
} = dual(2, <L1, R, L2>(self: readonly [L1, R], f: (left: L1) => L2): [L2, R] => [f(self[0]), self[1]])

/**
 * Transforms the second component of a tuple using a given function.
 *
 * @param self - A tuple of length `2`.
 * @param f - The function to transform the second element of the tuple.
 *
 * @example
 * import { mapSecond } from "effect/Tuple"
 *
 * assert.deepStrictEqual(
 *   mapSecond(["hello", 42], n => n.toString()),
 *   ["hello", "42"]
 * )
 *
 * @category mapping
 * @since 2.0.0
 */
export const mapSecond: {
  <R1, R2>(f: (right: R1) => R2): <L>(self: readonly [L, R1]) => [L, R2]
  <L, R1, R2>(self: readonly [L, R1], f: (right: R1) => R2): [L, R2]
} = dual(2, <L, R1, R2>(self: readonly [L, R1], f: (right: R1) => R2): [L, R2] => [self[0], f(self[1])])

/**
 * Swaps the two elements of a tuple.
 *
 * @param self - A tuple of length `2`.
 *
 * @example
 * import { swap } from "effect/Tuple"
 *
 * assert.deepStrictEqual(swap(["hello", 42]), [42, "hello"])
 *
 * @since 2.0.0
 */
export const swap = <L, R>(self: readonly [L, R]): [R, L] => [self[1], self[0]]

/**
 * Given a tuple of `Equivalence`s returns a new `Equivalence` that compares values of a tuple
 * by applying each `Equivalence` to the corresponding element of the tuple.
 *
 * @category combinators
 * @since 2.0.0
 */
export const getEquivalence: <T extends ReadonlyArray<Equivalence.Equivalence<any>>>(
  ...isEquivalents: T
) => Equivalence.Equivalence<
  Readonly<{ [I in keyof T]: [T[I]] extends [Equivalence.Equivalence<infer A>] ? A : never }>
> = Equivalence.tuple

/**
 * This function creates and returns a new `Order` for a tuple of values based on the given `Order`s for each element in the tuple.
 * The returned `Order` compares two tuples of the same type by applying the corresponding `Order` to each element in the tuple.
 * It is useful when you need to compare two tuples of the same type and you have a specific way of comparing each element
 * of the tuple.
 *
 * @category combinators
 * @since 2.0.0
 */
export const getOrder: <T extends ReadonlyArray<order.Order<any>>>(
  ...elements: T
) => order.Order<{ [I in keyof T]: [T[I]] extends [order.Order<infer A>] ? A : never }> = order.tuple

/**
 * Appends an element to the end of a tuple.
 *
 * @category concatenating
 * @since 2.0.0
 */
export const appendElement: {
  <B>(that: B): <A extends ReadonlyArray<unknown>>(self: A) => [...A, B]
  <A extends ReadonlyArray<unknown>, B>(self: A, that: B): [...A, B]
} = dual(2, <A extends ReadonlyArray<unknown>, B>(self: A, that: B): [...A, B] => [...self, that])

/**
 * Retrieves the element at a specified index from a tuple.
 *
 * @param self - A tuple from which to retrieve the element.
 * @param index - The index of the element to retrieve.
 *
 * @example
 * import { Tuple } from "effect"
 *
 * assert.deepStrictEqual(Tuple.at([1, 'hello', true], 1), 'hello')
 *
 * @category getters
 * @since 3.4.0
 */
export const at: {
  <N extends number>(index: N): <A extends ReadonlyArray<unknown>>(self: A) => A[N]
  <A extends ReadonlyArray<unknown>, N extends number>(self: A, index: N): A[N]
} = dual(2, <A extends ReadonlyArray<unknown>, N extends number>(self: A, index: N): A[N] => self[index])

export {
  /**
   * Determine if an `Array` is a tuple with exactly `N` elements, narrowing down the type to `TupleOf`.
   *
   * An `Array` is considered to be a `TupleOf` if its length is exactly `N`.
   *
   * @param self - The `Array` to check.
   * @param n - The exact number of elements that the `Array` should have to be considered a `TupleOf`.
   *
   * @example
   * import { isTupleOf } from "effect/Tuple"
   *
   * assert.deepStrictEqual(isTupleOf([1, 2, 3], 3), true);
   * assert.deepStrictEqual(isTupleOf([1, 2, 3], 2), false);
   * assert.deepStrictEqual(isTupleOf([1, 2, 3], 4), false);
   *
   * const arr: number[] = [1, 2, 3];
   * if (isTupleOf(arr, 3)) {
   *   console.log(arr);
   *   // ^? [number, number, number]
   * }
   *
   * @category guards
   * @since 3.3.0
   */
  isTupleOf,
  /**
   * Determine if an `Array` is a tuple with at least `N` elements, narrowing down the type to `TupleOfAtLeast`.
   *
   * An `Array` is considered to be a `TupleOfAtLeast` if its length is at least `N`.
   *
   * @param self - The `Array` to check.
   * @param n - The minimum number of elements that the `Array` should have to be considered a `TupleOfAtLeast`.
   *
   * @example
   * import { isTupleOfAtLeast } from "effect/Tuple"
   *
   * assert.deepStrictEqual(isTupleOfAtLeast([1, 2, 3], 3), true);
   * assert.deepStrictEqual(isTupleOfAtLeast([1, 2, 3], 2), true);
   * assert.deepStrictEqual(isTupleOfAtLeast([1, 2, 3], 4), false);
   *
   * const arr: number[] = [1, 2, 3, 4];
   * if (isTupleOfAtLeast(arr, 3)) {
   *   console.log(arr);
   *   // ^? [number, number, number, ...number[]]
   * }
   *
   * @category guards
   * @since 3.3.0
   */
  isTupleOfAtLeast
} from "./Predicate.js"
