/**
 * This module provides utility functions for working with arrays in TypeScript.
 *
 * @since 2.0.0
 */

import type { Either } from "./Either.js"
import * as E from "./Either.js"
import * as Equal from "./Equal.js"
import * as Equivalence from "./Equivalence.js"
import type { LazyArg } from "./Function.js"
import { dual, identity } from "./Function.js"
import type { TypeLambda } from "./HKT.js"
import * as readonlyArray from "./internal/array.js"
import * as EffectIterable from "./Iterable.js"
import type { Option } from "./Option.js"
import * as O from "./Option.js"
import * as Order from "./Order.js"
import type { Predicate, Refinement } from "./Predicate.js"
import { isBoolean } from "./Predicate.js"
import * as Record from "./Record.js"
import * as Tuple from "./Tuple.js"
import type { NoInfer } from "./Types.js"

/**
 * @category type lambdas
 * @since 2.0.0
 */
export interface ReadonlyArrayTypeLambda extends TypeLambda {
  readonly type: ReadonlyArray<this["Target"]>
}

/**
 * @category models
 * @since 2.0.0
 */
export type NonEmptyReadonlyArray<A> = readonly [A, ...Array<A>]

/**
 * @category models
 * @since 2.0.0
 */
export type NonEmptyArray<A> = [A, ...Array<A>]

/**
 * Builds a `NonEmptyArray` from an non-empty collection of elements.
 *
 * @category constructors
 * @since 2.0.0
 */
export const make = <Elements extends NonEmptyArray<any>>(
  ...elements: Elements
): NonEmptyArray<Elements[number]> => elements

/**
 * Creates a new `Array` of the specified length.
 *
 * @category constructors
 * @since 2.0.0
 */
export const allocate = <A = never>(n: number): Array<A | undefined> => new Array(n)

/**
 * Return a `NonEmptyArray` of length `n` with element `i` initialized with `f(i)`.
 *
 * **Note**. `n` is normalized to an integer >= 1.
 *
 * @example
 * import { makeBy } from "effect/Array"
 *
 * assert.deepStrictEqual(makeBy(5, n => n * 2), [0, 2, 4, 6, 8])
 *
 * @category constructors
 * @since 2.0.0
 */
export const makeBy = <A>(n: number, f: (i: number) => A): NonEmptyArray<A> => {
  const max = Math.max(1, Math.floor(n))
  const out = new Array(max)
  for (let i = 0; i < max; i++) {
    out[i] = f(i)
  }
  return out as NonEmptyArray<A>
}

/**
 * Return a `NonEmptyArray` containing a range of integers, including both endpoints.
 *
 * @example
 * import { range } from "effect/Array"
 *
 * assert.deepStrictEqual(range(1, 3), [1, 2, 3])
 *
 * @category constructors
 * @since 2.0.0
 */
export const range = (start: number, end: number): NonEmptyArray<number> =>
  start <= end ? makeBy(end - start + 1, (i) => start + i) : [start]

/**
 * Return a `NonEmptyArray` containing a value repeated the specified number of times.
 *
 * **Note**. `n` is normalized to an integer >= 1.
 *
 * @example
 * import { replicate } from "effect/Array"
 *
 * assert.deepStrictEqual(replicate("a", 3), ["a", "a", "a"])
 *
 * @category constructors
 * @since 2.0.0
 */
export const replicate: {
  (n: number): <A>(a: A) => NonEmptyArray<A>
  <A>(a: A, n: number): NonEmptyArray<A>
} = dual(2, <A>(a: A, n: number): NonEmptyArray<A> => makeBy(n, () => a))

/**
 * Creates a new `Array` from an iterable collection of values.
 *
 * @category constructors
 * @since 2.0.0
 */
export const fromIterable = <A>(collection: Iterable<A>): Array<A> =>
  Array.isArray(collection) ? collection : Array.from(collection)

/**
 * Takes a record and returns an array of tuples containing its keys and values.
 *
 * @param self - The record to transform.
 *
 * @example
 * import { fromRecord } from "effect/Array"
 *
 * const x = { a: 1, b: 2, c: 3 }
 * assert.deepStrictEqual(fromRecord(x), [["a", 1], ["b", 2], ["c", 3]])
 *
 * @category conversions
 * @since 2.0.0
 */
export const fromRecord: <K extends string, A>(self: Readonly<Record<K, A>>) => Array<[K, A]> = Record.toEntries

/**
 * @category conversions
 * @since 2.0.0
 */
export const fromOption: <A>(self: Option<A>) => Array<A> = O.toArray

/**
 * @category pattern matching
 * @since 2.0.0
 */
export const match: {
  <B, A, C = B>(
    options: {
      readonly onEmpty: LazyArg<B>
      readonly onNonEmpty: (self: NonEmptyReadonlyArray<A>) => C
    }
  ): (self: ReadonlyArray<A>) => B | C
  <A, B, C = B>(
    self: ReadonlyArray<A>,
    options: {
      readonly onEmpty: LazyArg<B>
      readonly onNonEmpty: (self: NonEmptyReadonlyArray<A>) => C
    }
  ): B | C
} = dual(2, <A, B, C = B>(
  self: ReadonlyArray<A>,
  { onEmpty, onNonEmpty }: {
    readonly onEmpty: LazyArg<B>
    readonly onNonEmpty: (self: NonEmptyReadonlyArray<A>) => C
  }
): B | C => isNonEmptyReadonlyArray(self) ? onNonEmpty(self) : onEmpty())

/**
 * @category pattern matching
 * @since 2.0.0
 */
export const matchLeft: {
  <B, A, C = B>(
    options: {
      readonly onEmpty: LazyArg<B>
      readonly onNonEmpty: (head: A, tail: Array<A>) => C
    }
  ): (self: ReadonlyArray<A>) => B | C
  <A, B, C = B>(
    self: ReadonlyArray<A>,
    options: {
      readonly onEmpty: LazyArg<B>
      readonly onNonEmpty: (head: A, tail: Array<A>) => C
    }
  ): B | C
} = dual(2, <A, B, C = B>(
  self: ReadonlyArray<A>,
  { onEmpty, onNonEmpty }: {
    readonly onEmpty: LazyArg<B>
    readonly onNonEmpty: (head: A, tail: Array<A>) => C
  }
): B | C => isNonEmptyReadonlyArray(self) ? onNonEmpty(headNonEmpty(self), tailNonEmpty(self)) : onEmpty())

/**
 * @category pattern matching
 * @since 2.0.0
 */
export const matchRight: {
  <B, A, C = B>(
    options: {
      readonly onEmpty: LazyArg<B>
      readonly onNonEmpty: (init: Array<A>, last: A) => C
    }
  ): (self: ReadonlyArray<A>) => B | C
  <A, B, C = B>(
    self: ReadonlyArray<A>,
    options: {
      readonly onEmpty: LazyArg<B>
      readonly onNonEmpty: (init: Array<A>, last: A) => C
    }
  ): B | C
} = dual(2, <A, B, C = B>(
  self: ReadonlyArray<A>,
  { onEmpty, onNonEmpty }: {
    readonly onEmpty: LazyArg<B>
    readonly onNonEmpty: (init: Array<A>, last: A) => C
  }
): B | C =>
  isNonEmptyReadonlyArray(self) ?
    onNonEmpty(initNonEmpty(self), lastNonEmpty(self)) :
    onEmpty())

/**
 * Prepend an element to the front of an `Iterable`, creating a new `NonEmptyArray`.
 *
 * @category concatenating
 * @since 2.0.0
 */
export const prepend: {
  <B>(head: B): <A>(self: Iterable<A>) => NonEmptyArray<A | B>
  <A, B>(self: Iterable<A>, head: B): NonEmptyArray<A | B>
} = dual(2, <A, B>(self: Iterable<A>, head: B): NonEmptyArray<A | B> => [head, ...self])

/**
 * Prepends the specified prefix array (or iterable) to the beginning of the specified array (or iterable).
 * If either array is non-empty, the result is also a non-empty array.
 *
 * @example
 * import { Array } from "effect"
 *
 * assert.deepStrictEqual(
 *   Array.prependAll([1, 2], ["a", "b"]),
 *   ["a", "b", 1, 2]
 * )
 *
 * @category concatenating
 * @since 2.0.0
 */
export const prependAll: {
  <S extends ReadonlyArray<any> | Iterable<any>, T extends ReadonlyArray<any> | Iterable<any>>(
    that: T
  ): (self: S) => ReadonlyArray.OrNonEmpty<S, T, ReadonlyArray.Infer<S> | ReadonlyArray.Infer<T>>
  <A, B>(self: Iterable<A>, that: NonEmptyReadonlyArray<B>): NonEmptyArray<A | B>
  <A, B>(self: NonEmptyReadonlyArray<A>, that: Iterable<B>): NonEmptyArray<A | B>
  <A, B>(self: Iterable<A>, that: Iterable<B>): Array<A | B>
} = dual(
  2,
  <A>(self: Iterable<A>, that: Iterable<A>): Array<A> => fromIterable(that).concat(fromIterable(self))
)

/**
 * Append an element to the end of an `Iterable`, creating a new `NonEmptyArray`.
 *
 * @category concatenating
 * @since 2.0.0
 */
export const append: {
  <B>(last: B): <A>(self: Iterable<A>) => NonEmptyArray<A | B>
  <A, B>(self: Iterable<A>, last: B): NonEmptyArray<A | B>
} = dual(2, <A, B>(self: Iterable<A>, last: B): Array<A | B> => [...self, last])

/**
 * Concatenates two arrays (or iterables), combining their elements.
 * If either array is non-empty, the result is also a non-empty array.
 *
 * @category concatenating
 * @since 2.0.0
 */
export const appendAll: {
  <S extends ReadonlyArray<any> | Iterable<any>, T extends ReadonlyArray<any> | Iterable<any>>(
    that: T
  ): (self: S) => ReadonlyArray.OrNonEmpty<S, T, ReadonlyArray.Infer<S> | ReadonlyArray.Infer<T>>
  <A, B>(self: Iterable<A>, that: NonEmptyReadonlyArray<B>): NonEmptyArray<A | B>
  <A, B>(self: NonEmptyReadonlyArray<A>, that: Iterable<B>): NonEmptyArray<A | B>
  <A, B>(self: Iterable<A>, that: Iterable<B>): Array<A | B>
} = dual(
  2,
  <A>(self: Iterable<A>, that: Iterable<A>): Array<A> => fromIterable(self).concat(fromIterable(that))
)

/**
 * Reduce an `Iterable` from the left, keeping all intermediate results instead of only the final result.
 *
 * @category folding
 * @since 2.0.0
 */
export const scan: {
  <B, A>(b: B, f: (b: B, a: A) => B): (self: Iterable<A>) => NonEmptyArray<B>
  <A, B>(self: Iterable<A>, b: B, f: (b: B, a: A) => B): NonEmptyArray<B>
} = dual(3, <A, B>(self: Iterable<A>, b: B, f: (b: B, a: A) => B): NonEmptyArray<B> => {
  const out: NonEmptyArray<B> = [b]
  let i = 0
  for (const a of self) {
    out[i + 1] = f(out[i], a)
    i++
  }
  return out
})

/**
 * Reduce an `Iterable` from the right, keeping all intermediate results instead of only the final result.
 *
 * @category folding
 * @since 2.0.0
 */
export const scanRight: {
  <B, A>(b: B, f: (b: B, a: A) => B): (self: Iterable<A>) => NonEmptyArray<B>
  <A, B>(self: Iterable<A>, b: B, f: (b: B, a: A) => B): NonEmptyArray<B>
} = dual(3, <A, B>(self: Iterable<A>, b: B, f: (b: B, a: A) => B): NonEmptyArray<B> => {
  const input = fromIterable(self)
  const out: NonEmptyArray<B> = new Array(input.length + 1) as any
  out[input.length] = b
  for (let i = input.length - 1; i >= 0; i--) {
    out[i] = f(out[i + 1], input[i])
  }
  return out
})

/**
 * Determine if `unknown` is an Array.
 *
 * @param self - The value to check.
 *
 * @example
 * import { isArray } from "effect/Array"
 *
 * assert.deepStrictEqual(isArray(null), false);
 * assert.deepStrictEqual(isArray([1, 2, 3]), true);
 *
 * @category guards
 * @since 2.0.0
 */
export const isArray: {
  (self: unknown): self is Array<unknown>
  <T>(self: T): self is Extract<T, ReadonlyArray<any>>
} = Array.isArray

/**
 * Determine if an `Array` is empty narrowing down the type to `[]`.
 *
 * @param self - The `Array` to check.
 *
 * @example
 * import { isEmptyArray } from "effect/Array"
 *
 * assert.deepStrictEqual(isEmptyArray([]), true);
 * assert.deepStrictEqual(isEmptyArray([1, 2, 3]), false);
 *
 * @category guards
 * @since 2.0.0
 */
export const isEmptyArray = <A>(self: Array<A>): self is [] => self.length === 0

/**
 * Determine if a `ReadonlyArray` is empty narrowing down the type to `readonly []`.
 *
 * @param self - The `ReadonlyArray` to check.
 *
 * @example
 * import { isEmptyReadonlyArray } from "effect/Array"
 *
 * assert.deepStrictEqual(isEmptyReadonlyArray([]), true);
 * assert.deepStrictEqual(isEmptyReadonlyArray([1, 2, 3]), false);
 *
 * @category guards
 * @since 2.0.0
 */
export const isEmptyReadonlyArray: <A>(self: ReadonlyArray<A>) => self is readonly [] = isEmptyArray as any

/**
 * Determine if an `Array` is non empty narrowing down the type to `NonEmptyArray`.
 *
 * An `Array` is considered to be a `NonEmptyArray` if it contains at least one element.
 *
 * @param self - The `Array` to check.
 *
 * @example
 * import { isNonEmptyArray } from "effect/Array"
 *
 * assert.deepStrictEqual(isNonEmptyArray([]), false);
 * assert.deepStrictEqual(isNonEmptyArray([1, 2, 3]), true);
 *
 * @category guards
 * @since 2.0.0
 */
export const isNonEmptyArray: <A>(self: Array<A>) => self is NonEmptyArray<A> = readonlyArray.isNonEmptyArray

/**
 * Determine if a `ReadonlyArray` is non empty narrowing down the type to `NonEmptyReadonlyArray`.
 *
 * A `ReadonlyArray` is considered to be a `NonEmptyReadonlyArray` if it contains at least one element.
 *
 * @param self - The `ReadonlyArray` to check.
 *
 * @example
 * import { isNonEmptyReadonlyArray } from "effect/Array"
 *
 * assert.deepStrictEqual(isNonEmptyReadonlyArray([]), false);
 * assert.deepStrictEqual(isNonEmptyReadonlyArray([1, 2, 3]), true);
 *
 * @category guards
 * @since 2.0.0
 */
export const isNonEmptyReadonlyArray: <A>(self: ReadonlyArray<A>) => self is NonEmptyReadonlyArray<A> =
  readonlyArray.isNonEmptyArray

/**
 * Return the number of elements in a `ReadonlyArray`.
 *
 * @category getters
 * @since 2.0.0
 */
export const length = <A>(self: ReadonlyArray<A>): number => self.length

const isOutOfBound = <A>(i: number, as: ReadonlyArray<A>): boolean => i < 0 || i >= as.length

const clamp = <A>(i: number, as: ReadonlyArray<A>): number => Math.floor(Math.min(Math.max(0, i), as.length))

/**
 * This function provides a safe way to read a value at a particular index from a `ReadonlyArray`.
 *
 * @category getters
 * @since 2.0.0
 */
export const get: {
  (index: number): <A>(self: ReadonlyArray<A>) => Option<A>
  <A>(self: ReadonlyArray<A>, index: number): Option<A>
} = dual(2, <A>(self: ReadonlyArray<A>, index: number): Option<A> => {
  const i = Math.floor(index)
  return isOutOfBound(i, self) ? O.none() : O.some(self[i])
})

/**
 * Gets an element unsafely, will throw on out of bounds.
 *
 * @since 2.0.0
 * @category unsafe
 */
export const unsafeGet: {
  (index: number): <A>(self: ReadonlyArray<A>) => A
  <A>(self: ReadonlyArray<A>, index: number): A
} = dual(2, <A>(self: ReadonlyArray<A>, index: number): A => {
  const i = Math.floor(index)
  if (isOutOfBound(i, self)) {
    throw new Error(`Index ${i} out of bounds`)
  }
  return self[i]
})

/**
 * Return a tuple containing the first element, and a new `Array` of the remaining elements, if any.
 *
 * @category splitting
 * @since 2.0.0
 */
export const unprepend = <A>(
  self: NonEmptyReadonlyArray<A>
): [firstElement: A, remainingElements: Array<A>] => [headNonEmpty(self), tailNonEmpty(self)]

/**
 * Return a tuple containing a copy of the `NonEmptyReadonlyArray` without its last element, and that last element.
 *
 * @category splitting
 * @since 2.0.0
 */
export const unappend = <A>(
  self: NonEmptyReadonlyArray<A>
): [arrayWithoutLastElement: Array<A>, lastElement: A] => [initNonEmpty(self), lastNonEmpty(self)]

/**
 * Get the first element of a `ReadonlyArray`, or `None` if the `ReadonlyArray` is empty.
 *
 * @category getters
 * @since 2.0.0
 */
export const head: <A>(self: ReadonlyArray<A>) => Option<A> = get(0)

/**
 * @category getters
 * @since 2.0.0
 */
export const headNonEmpty: <A>(self: NonEmptyReadonlyArray<A>) => A = unsafeGet(0)

/**
 * Get the last element in a `ReadonlyArray`, or `None` if the `ReadonlyArray` is empty.
 *
 * @category getters
 * @since 2.0.0
 */
export const last = <A>(self: ReadonlyArray<A>): Option<A> =>
  isNonEmptyReadonlyArray(self) ? O.some(lastNonEmpty(self)) : O.none()

/**
 * @category getters
 * @since 2.0.0
 */
export const lastNonEmpty = <A>(self: NonEmptyReadonlyArray<A>): A => self[self.length - 1]

/**
 * Get all but the first element of an `Iterable`, creating a new `Array`, or `None` if the `Iterable` is empty.
 *
 * @category getters
 * @since 2.0.0
 */
export const tail = <A>(self: Iterable<A>): Option<Array<A>> => {
  const input = fromIterable(self)
  return isNonEmptyReadonlyArray(input) ? O.some(tailNonEmpty(input)) : O.none()
}

/**
 * @category getters
 * @since 2.0.0
 */
export const tailNonEmpty = <A>(self: NonEmptyReadonlyArray<A>): Array<A> => self.slice(1)

/**
 * Get all but the last element of an `Iterable`, creating a new `Array`, or `None` if the `Iterable` is empty.
 *
 * @category getters
 * @since 2.0.0
 */
export const init = <A>(self: Iterable<A>): Option<Array<A>> => {
  const input = fromIterable(self)
  return isNonEmptyReadonlyArray(input) ? O.some(initNonEmpty(input)) : O.none()
}

/**
 * Get all but the last element of a non empty array, creating a new array.
 *
 * @category getters
 * @since 2.0.0
 */
export const initNonEmpty = <A>(self: NonEmptyReadonlyArray<A>): Array<A> => self.slice(0, -1)

/**
 * Keep only a max number of elements from the start of an `Iterable`, creating a new `Array`.
 *
 * **Note**. `n` is normalized to a non negative integer.
 *
 * @category getters
 * @since 2.0.0
 */
export const take: {
  (n: number): <A>(self: Iterable<A>) => Array<A>
  <A>(self: Iterable<A>, n: number): Array<A>
} = dual(2, <A>(self: Iterable<A>, n: number): Array<A> => {
  const input = fromIterable(self)
  return input.slice(0, clamp(n, input))
})

/**
 * Keep only a max number of elements from the end of an `Iterable`, creating a new `Array`.
 *
 * **Note**. `n` is normalized to a non negative integer.
 *
 * @category getters
 * @since 2.0.0
 */
export const takeRight: {
  (n: number): <A>(self: Iterable<A>) => Array<A>
  <A>(self: Iterable<A>, n: number): Array<A>
} = dual(2, <A>(self: Iterable<A>, n: number): Array<A> => {
  const input = fromIterable(self)
  const i = clamp(n, input)
  return i === 0 ? [] : input.slice(-i)
})

/**
 * Calculate the longest initial subarray for which all element satisfy the specified predicate, creating a new `Array`.
 *
 * @category getters
 * @since 2.0.0
 */
export const takeWhile: {
  <A, B extends A>(refinement: (a: NoInfer<A>, i: number) => a is B): (self: Iterable<A>) => Array<B>
  <A>(predicate: (a: NoInfer<A>, i: number) => boolean): (self: Iterable<A>) => Array<A>
  <A, B extends A>(self: Iterable<A>, refinement: (a: A, i: number) => a is B): Array<B>
  <A>(self: Iterable<A>, predicate: (a: A, i: number) => boolean): Array<A>
} = dual(2, <A>(self: Iterable<A>, predicate: (a: A, i: number) => boolean): Array<A> => {
  let i = 0
  const out: Array<A> = []
  for (const a of self) {
    if (!predicate(a, i)) {
      break
    }
    out.push(a)
    i++
  }
  return out
})

const spanIndex = <A>(self: Iterable<A>, predicate: (a: A, i: number) => boolean): number => {
  let i = 0
  for (const a of self) {
    if (!predicate(a, i)) {
      break
    }
    i++
  }
  return i
}

/**
 * Split an `Iterable` into two parts:
 *
 * 1. the longest initial subarray for which all elements satisfy the specified predicate
 * 2. the remaining elements
 *
 * @category splitting
 * @since 2.0.0
 */
export const span: {
  <A, B extends A>(
    refinement: (a: NoInfer<A>, i: number) => a is B
  ): (self: Iterable<A>) => [init: Array<B>, rest: Array<Exclude<A, B>>]
  <A>(predicate: (a: NoInfer<A>, i: number) => boolean): (self: Iterable<A>) => [init: Array<A>, rest: Array<A>]
  <A, B extends A>(
    self: Iterable<A>,
    refinement: (a: A, i: number) => a is B
  ): [init: Array<B>, rest: Array<Exclude<A, B>>]
  <A>(self: Iterable<A>, predicate: (a: A, i: number) => boolean): [init: Array<A>, rest: Array<A>]
} = dual(
  2,
  <A>(self: Iterable<A>, predicate: (a: A, i: number) => boolean): [init: Array<A>, rest: Array<A>] =>
    splitAt(self, spanIndex(self, predicate))
)

/**
 * Drop a max number of elements from the start of an `Iterable`, creating a new `Array`.
 *
 * **Note**. `n` is normalized to a non negative integer.
 *
 * @category getters
 * @since 2.0.0
 */
export const drop: {
  (n: number): <A>(self: Iterable<A>) => Array<A>
  <A>(self: Iterable<A>, n: number): Array<A>
} = dual(2, <A>(self: Iterable<A>, n: number): Array<A> => {
  const input = fromIterable(self)
  return input.slice(clamp(n, input), input.length)
})

/**
 * Drop a max number of elements from the end of an `Iterable`, creating a new `Array`.
 *
 * **Note**. `n` is normalized to a non negative integer.
 *
 * @category getters
 * @since 2.0.0
 */
export const dropRight: {
  (n: number): <A>(self: Iterable<A>) => Array<A>
  <A>(self: Iterable<A>, n: number): Array<A>
} = dual(2, <A>(self: Iterable<A>, n: number): Array<A> => {
  const input = fromIterable(self)
  return input.slice(0, input.length - clamp(n, input))
})

/**
 * Remove the longest initial subarray for which all element satisfy the specified predicate, creating a new `Array`.
 *
 * @category getters
 * @since 2.0.0
 */
export const dropWhile: {
  <A>(predicate: (a: NoInfer<A>, i: number) => boolean): (self: Iterable<A>) => Array<A>
  <A>(self: Iterable<A>, predicate: (a: A, i: number) => boolean): Array<A>
} = dual(
  2,
  <A>(self: Iterable<A>, predicate: (a: A, i: number) => boolean): Array<A> =>
    fromIterable(self).slice(spanIndex(self, predicate))
)

/**
 * Return the first index for which a predicate holds.
 *
 * @category elements
 * @since 2.0.0
 */
export const findFirstIndex: {
  <A>(predicate: (a: NoInfer<A>, i: number) => boolean): (self: Iterable<A>) => Option<number>
  <A>(self: Iterable<A>, predicate: (a: A, i: number) => boolean): Option<number>
} = dual(2, <A>(self: Iterable<A>, predicate: (a: A, i: number) => boolean): Option<number> => {
  let i = 0
  for (const a of self) {
    if (predicate(a, i)) {
      return O.some(i)
    }
    i++
  }
  return O.none()
})

/**
 * Return the last index for which a predicate holds.
 *
 * @category elements
 * @since 2.0.0
 */
export const findLastIndex: {
  <A>(predicate: (a: NoInfer<A>, i: number) => boolean): (self: Iterable<A>) => Option<number>
  <A>(self: Iterable<A>, predicate: (a: A, i: number) => boolean): Option<number>
} = dual(2, <A>(self: Iterable<A>, predicate: (a: A, i: number) => boolean): Option<number> => {
  const input = fromIterable(self)
  for (let i = input.length - 1; i >= 0; i--) {
    if (predicate(input[i], i)) {
      return O.some(i)
    }
  }
  return O.none()
})

/**
 * Returns the first element that satisfies the specified
 * predicate, or `None` if no such element exists.
 *
 * @category elements
 * @since 2.0.0
 */
export const findFirst: {
  <A, B>(f: (a: NoInfer<A>, i: number) => Option<B>): (self: Iterable<A>) => Option<B>
  <A, B extends A>(refinement: (a: NoInfer<A>, i: number) => a is B): (self: Iterable<A>) => Option<B>
  <A>(predicate: (a: NoInfer<A>, i: number) => boolean): (self: Iterable<A>) => Option<A>
  <A, B>(self: Iterable<A>, f: (a: A, i: number) => Option<B>): Option<B>
  <A, B extends A>(self: Iterable<A>, refinement: (a: A, i: number) => a is B): Option<B>
  <A>(self: Iterable<A>, predicate: (a: A, i: number) => boolean): Option<A>
} = EffectIterable.findFirst

/**
 * Find the last element for which a predicate holds.
 *
 * @category elements
 * @since 2.0.0
 */
export const findLast: {
  <A, B>(f: (a: NoInfer<A>, i: number) => Option<B>): (self: Iterable<A>) => Option<B>
  <A, B extends A>(refinement: (a: NoInfer<A>, i: number) => a is B): (self: Iterable<A>) => Option<B>
  <A>(predicate: (a: NoInfer<A>, i: number) => boolean): (self: Iterable<A>) => Option<A>
  <A, B>(self: Iterable<A>, f: (a: A, i: number) => Option<B>): Option<B>
  <A, B extends A>(self: Iterable<A>, refinement: (a: A, i: number) => a is B): Option<B>
  <A>(self: Iterable<A>, predicate: (a: A, i: number) => boolean): Option<A>
} = dual(
  2,
  <A>(self: Iterable<A>, f: ((a: A, i: number) => boolean) | ((a: A, i: number) => Option<A>)): Option<A> => {
    const input = fromIterable(self)
    for (let i = input.length - 1; i >= 0; i--) {
      const a = input[i]
      const o = f(a, i)
      if (isBoolean(o)) {
        if (o) {
          return O.some(a)
        }
      } else {
        if (O.isSome(o)) {
          return o
        }
      }
    }
    return O.none()
  }
)

/**
 * Insert an element at the specified index, creating a new `NonEmptyArray`,
 * or return `None` if the index is out of bounds.
 *
 * @since 2.0.0
 */
export const insertAt: {
  <B>(i: number, b: B): <A>(self: Iterable<A>) => Option<NonEmptyArray<A | B>>
  <A, B>(self: Iterable<A>, i: number, b: B): Option<NonEmptyArray<A | B>>
} = dual(3, <A, B>(self: Iterable<A>, i: number, b: B): Option<NonEmptyArray<A | B>> => {
  const out: Array<A | B> = Array.from(self)
  //             v--- `= self.length` is ok, it means inserting in last position
  if (i < 0 || i > out.length) {
    return O.none()
  }
  out.splice(i, 0, b)
  return O.some(out) as any
})

/**
 * Change the element at the specified index, creating a new `Array`,
 * or return a copy of the input if the index is out of bounds.
 *
 * @since 2.0.0
 */
export const replace: {
  <B>(i: number, b: B): <A>(self: Iterable<A>) => Array<A | B>
  <A, B>(self: Iterable<A>, i: number, b: B): Array<A | B>
} = dual(3, <A, B>(self: Iterable<A>, i: number, b: B): Array<A | B> => modify(self, i, () => b))

/**
 * @since 2.0.0
 */
export const replaceOption: {
  <B>(i: number, b: B): <A>(self: Iterable<A>) => Option<Array<A | B>>
  <A, B>(self: Iterable<A>, i: number, b: B): Option<Array<A | B>>
} = dual(
  3,
  <A, B>(self: Iterable<A>, i: number, b: B): Option<Array<A | B>> => modifyOption(self, i, () => b)
)

/**
 * Apply a function to the element at the specified index, creating a new `Array`,
 * or return a copy of the input if the index is out of bounds.
 *
 * @since 2.0.0
 */
export const modify: {
  <A, B>(i: number, f: (a: A) => B): (self: Iterable<A>) => Array<A | B>
  <A, B>(self: Iterable<A>, i: number, f: (a: A) => B): Array<A | B>
} = dual(
  3,
  <A, B>(self: Iterable<A>, i: number, f: (a: A) => B): Array<A | B> =>
    O.getOrElse(modifyOption(self, i, f), () => Array.from(self))
)

/**
 * Apply a function to the element at the specified index, creating a new `Array`,
 * or return `None` if the index is out of bounds.
 *
 * @since 2.0.0
 */
export const modifyOption: {
  <A, B>(i: number, f: (a: A) => B): (self: Iterable<A>) => Option<Array<A | B>>
  <A, B>(self: Iterable<A>, i: number, f: (a: A) => B): Option<Array<A | B>>
} = dual(3, <A, B>(self: Iterable<A>, i: number, f: (a: A) => B): Option<Array<A | B>> => {
  const out = Array.from(self)
  if (isOutOfBound(i, out)) {
    return O.none()
  }
  const next = f(out[i])
  // @ts-expect-error
  out[i] = next
  return O.some(out)
})

/**
 * Delete the element at the specified index, creating a new `Array`,
 * or return a copy of the input if the index is out of bounds.
 *
 * @since 2.0.0
 */
export const remove: {
  (i: number): <A>(self: Iterable<A>) => Array<A>
  <A>(self: Iterable<A>, i: number): Array<A>
} = dual(2, <A>(self: Iterable<A>, i: number): Array<A> => {
  const out = Array.from(self)
  if (isOutOfBound(i, out)) {
    return out
  }
  out.splice(i, 1)
  return out
})

/**
 * Reverse an `Iterable`, creating a new `Array`.
 *
 * @category elements
 * @since 2.0.0
 */
export const reverse = <S extends Iterable<any> | NonEmptyReadonlyArray<any>>(
  self: S
): S extends NonEmptyReadonlyArray<infer A> ? NonEmptyArray<A> : S extends Iterable<infer A> ? Array<A> : never =>
  Array.from(self).reverse() as any

/**
 * Create a new array with elements sorted in increasing order based on the specified comparator.
 * If the input is a `NonEmptyReadonlyArray`, the output will also be a `NonEmptyReadonlyArray`.
 *
 * @category sorting
 * @since 2.0.0
 */
export const sort: {
  <B>(
    O: Order.Order<B>
  ): <A extends B, S extends ReadonlyArray<A> | Iterable<A>>(self: S) => ReadonlyArray.With<S, ReadonlyArray.Infer<S>>
  <A extends B, B>(self: NonEmptyReadonlyArray<A>, O: Order.Order<B>): NonEmptyArray<A>
  <A extends B, B>(self: Iterable<A>, O: Order.Order<B>): Array<A>
} = dual(2, <A extends B, B>(self: Iterable<A>, O: Order.Order<B>): Array<A> => {
  const out = Array.from(self)
  out.sort(O)
  return out
})

/**
 * @since 2.0.0
 * @category elements
 */
export const sortWith: {
  <S extends Iterable<any> | NonEmptyReadonlyArray<any>, B>(
    f: (a: ReadonlyArray.Infer<S>) => B,
    order: Order.Order<B>
  ): (self: S) => ReadonlyArray.With<S, ReadonlyArray.Infer<S>>
  <A, B>(self: NonEmptyReadonlyArray<A>, f: (a: A) => B, O: Order.Order<B>): NonEmptyArray<A>
  <A, B>(self: Iterable<A>, f: (a: A) => B, order: Order.Order<B>): Array<A>
} = dual(
  3,
  <A, B>(self: Iterable<A>, f: (a: A) => B, order: Order.Order<B>): Array<A> => sort(self, Order.mapInput(order, f))
)

/**
 * Sort the elements of an `Iterable` in increasing order, where elements are compared
 * using first `orders[0]`, then `orders[1]`, etc...
 *
 * @category sorting
 * @since 2.0.0
 */
export const sortBy = <S extends Iterable<any> | NonEmptyReadonlyArray<any>>(
  ...orders: ReadonlyArray<Order.Order<ReadonlyArray.Infer<S>>>
) => {
  const sortByAll = sort(Order.combineAll(orders))
  return (
    self: S
  ): S extends NonEmptyReadonlyArray<infer A> ? NonEmptyArray<A> : S extends Iterable<infer A> ? Array<A> : never => {
    const input = fromIterable(self)
    if (isNonEmptyReadonlyArray(input)) {
      return sortByAll(input) as any
    }
    return [] as any
  }
}

/**
 * Takes two `Iterable`s and returns an `Array` of corresponding pairs.
 * If one input `Iterable` is short, excess elements of the
 * longer `Iterable` are discarded.
 *
 * @category zipping
 * @since 2.0.0
 */
export const zip: {
  <B>(that: NonEmptyReadonlyArray<B>): <A>(self: NonEmptyReadonlyArray<A>) => NonEmptyArray<[A, B]>
  <B>(that: Iterable<B>): <A>(self: Iterable<A>) => Array<[A, B]>
  <A, B>(self: NonEmptyReadonlyArray<A>, that: NonEmptyReadonlyArray<B>): NonEmptyArray<[A, B]>
  <A, B>(self: Iterable<A>, that: Iterable<B>): Array<[A, B]>
} = dual(
  2,
  <A, B>(self: Iterable<A>, that: Iterable<B>): Array<[A, B]> => zipWith(self, that, Tuple.make)
)

/**
 * Apply a function to pairs of elements at the same index in two `Iterable`s, collecting the results in a new `Array`. If one
 * input `Iterable` is short, excess elements of the longer `Iterable` are discarded.
 *
 * @category zipping
 * @since 2.0.0
 */
export const zipWith: {
  <B, A, C>(that: NonEmptyReadonlyArray<B>, f: (a: A, b: B) => C): (self: NonEmptyReadonlyArray<A>) => NonEmptyArray<C>
  <B, A, C>(that: Iterable<B>, f: (a: A, b: B) => C): (self: Iterable<A>) => Array<C>
  <A, B, C>(self: NonEmptyReadonlyArray<A>, that: NonEmptyReadonlyArray<B>, f: (a: A, b: B) => C): NonEmptyArray<C>
  <B, A, C>(self: Iterable<A>, that: Iterable<B>, f: (a: A, b: B) => C): Array<C>
} = dual(3, <B, A, C>(self: Iterable<A>, that: Iterable<B>, f: (a: A, b: B) => C): Array<C> => {
  const as = fromIterable(self)
  const bs = fromIterable(that)
  if (isNonEmptyReadonlyArray(as) && isNonEmptyReadonlyArray(bs)) {
    const out: NonEmptyArray<C> = [f(headNonEmpty(as), headNonEmpty(bs))]
    const len = Math.min(as.length, bs.length)
    for (let i = 1; i < len; i++) {
      out[i] = f(as[i], bs[i])
    }
    return out
  }
  return []
})

/**
 * This function is the inverse of `zip`. Takes an `Iterable` of pairs and return two corresponding `Array`s.
 *
 * @since 2.0.0
 */
export const unzip: <S extends Iterable<readonly [any, any]> | NonEmptyReadonlyArray<readonly [any, any]>>(
  self: S
) => S extends NonEmptyReadonlyArray<readonly [infer A, infer B]> ? [NonEmptyArray<A>, NonEmptyArray<B>]
  : S extends Iterable<readonly [infer A, infer B]> ? [Array<A>, Array<B>]
  : never = (<A, B>(self: Iterable<readonly [A, B]>): [Array<A>, Array<B>] => {
    const input = fromIterable(self)
    if (isNonEmptyReadonlyArray(input)) {
      const fa: NonEmptyArray<A> = [input[0][0]]
      const fb: NonEmptyArray<B> = [input[0][1]]
      for (let i = 1; i < input.length; i++) {
        fa[i] = input[i][0]
        fb[i] = input[i][1]
      }
      return [fa, fb]
    }
    return [[], []]
  }) as any

/**
 * Places an element in between members of an `Iterable`.
 * If the input is a non-empty array, the result is also a non-empty array.
 *
 * @since 2.0.0
 */
export const intersperse: {
  <B>(
    middle: B
  ): <S extends ReadonlyArray<any> | Iterable<any>>(self: S) => ReadonlyArray.With<S, ReadonlyArray.Infer<S> | B>
  <A, B>(self: NonEmptyReadonlyArray<A>, middle: B): NonEmptyArray<A | B>
  <A, B>(self: Iterable<A>, middle: B): Array<A | B>
} = dual(2, <A, B>(self: Iterable<A>, middle: B): Array<A | B> => {
  const input = fromIterable(self)
  if (isNonEmptyReadonlyArray(input)) {
    const out: NonEmptyArray<A | B> = [headNonEmpty(input)]
    const tail = tailNonEmpty(input)
    for (let i = 0; i < tail.length; i++) {
      if (i < tail.length) {
        out.push(middle)
      }
      out.push(tail[i])
    }
    return out
  }
  return []
})

/**
 * Apply a function to the head, creating a new `NonEmptyReadonlyArray`.
 *
 * @since 2.0.0
 */
export const modifyNonEmptyHead: {
  <A, B>(f: (a: A) => B): (self: NonEmptyReadonlyArray<A>) => NonEmptyArray<A | B>
  <A, B>(self: NonEmptyReadonlyArray<A>, f: (a: A) => B): NonEmptyArray<A | B>
} = dual(
  2,
  <A, B>(
    self: NonEmptyReadonlyArray<A>,
    f: (a: A) => B
  ): NonEmptyArray<A | B> => [f(headNonEmpty(self)), ...tailNonEmpty(self)]
)

/**
 * Change the head, creating a new `NonEmptyReadonlyArray`.
 *
 * @since 2.0.0
 */
export const setNonEmptyHead: {
  <B>(b: B): <A>(self: NonEmptyReadonlyArray<A>) => NonEmptyArray<A | B>
  <A, B>(self: NonEmptyReadonlyArray<A>, b: B): NonEmptyArray<A | B>
} = dual(
  2,
  <A, B>(self: NonEmptyReadonlyArray<A>, b: B): NonEmptyArray<A | B> => modifyNonEmptyHead(self, () => b)
)

/**
 * Apply a function to the last element, creating a new `NonEmptyReadonlyArray`.
 *
 * @since 2.0.0
 */
export const modifyNonEmptyLast: {
  <A, B>(f: (a: A) => B): (self: NonEmptyReadonlyArray<A>) => NonEmptyArray<A | B>
  <A, B>(self: NonEmptyReadonlyArray<A>, f: (a: A) => B): NonEmptyArray<A | B>
} = dual(
  2,
  <A, B>(self: NonEmptyReadonlyArray<A>, f: (a: A) => B): NonEmptyArray<A | B> =>
    append(initNonEmpty(self), f(lastNonEmpty(self)))
)

/**
 * Change the last element, creating a new `NonEmptyReadonlyArray`.
 *
 * @since 2.0.0
 */
export const setNonEmptyLast: {
  <B>(b: B): <A>(self: NonEmptyReadonlyArray<A>) => NonEmptyArray<A | B>
  <A, B>(self: NonEmptyReadonlyArray<A>, b: B): NonEmptyArray<A | B>
} = dual(
  2,
  <A, B>(self: NonEmptyReadonlyArray<A>, b: B): NonEmptyArray<A | B> => modifyNonEmptyLast(self, () => b)
)

/**
 * Rotate an `Iterable` by `n` steps.
 * If the input is a non-empty array, the result is also a non-empty array.
 *
 * @since 2.0.0
 */
export const rotate: {
  (n: number): <S extends ReadonlyArray<any> | Iterable<any>>(self: S) => ReadonlyArray.With<S, ReadonlyArray.Infer<S>>
  <A>(self: NonEmptyReadonlyArray<A>, n: number): NonEmptyArray<A>
  <A>(self: Iterable<A>, n: number): Array<A>
} = dual(2, <A>(self: Iterable<A>, n: number): Array<A> => {
  const input = fromIterable(self)
  if (isNonEmptyReadonlyArray(input)) {
    const len = input.length
    const m = Math.round(n) % len
    if (isOutOfBound(Math.abs(m), input) || m === 0) {
      return copy(input)
    }
    if (m < 0) {
      const [f, s] = splitNonEmptyAt(input, -m)
      return appendAll(s, f)
    } else {
      return rotate(self, m - len)
    }
  }
  return []
})

/**
 * Returns a function that checks if a `ReadonlyArray` contains a given value using a provided `isEquivalent` function.
 *
 * @category elements
 * @since 2.0.0
 */
export const containsWith = <A>(isEquivalent: (self: A, that: A) => boolean): {
  (a: A): (self: Iterable<A>) => boolean
  (self: Iterable<A>, a: A): boolean
} =>
  dual(2, (self: Iterable<A>, a: A): boolean => {
    for (const i of self) {
      if (isEquivalent(a, i)) {
        return true
      }
    }
    return false
  })

const _equivalence = Equal.equivalence()

/**
 * Returns a function that checks if a `ReadonlyArray` contains a given value using the default `Equivalence`.
 *
 * @category elements
 * @since 2.0.0
 */
export const contains: {
  <A>(a: A): (self: Iterable<A>) => boolean
  <A>(self: Iterable<A>, a: A): boolean
} = containsWith(_equivalence)

/**
 * A useful recursion pattern for processing an `Iterable` to produce a new `Array`, often used for "chopping" up the input
 * `Iterable`. Typically chop is called with some function that will consume an initial prefix of the `Iterable` and produce a
 * value and the rest of the `Array`.
 *
 * @since 2.0.0
 */
export const chop: {
  <S extends ReadonlyArray<any> | Iterable<any>, B>(
    f: (as: NonEmptyReadonlyArray<ReadonlyArray.Infer<S>>) => readonly [B, ReadonlyArray<ReadonlyArray.Infer<S>>]
  ): (self: S) => ReadonlyArray.With<S, ReadonlyArray.Infer<S>>
  <A, B>(
    self: NonEmptyReadonlyArray<A>,
    f: (as: NonEmptyReadonlyArray<A>) => readonly [B, ReadonlyArray<A>]
  ): NonEmptyArray<B>
  <A, B>(
    self: Iterable<A>,
    f: (as: NonEmptyReadonlyArray<A>) => readonly [B, ReadonlyArray<A>]
  ): Array<B>
} = dual(2, <A, B>(
  self: Iterable<A>,
  f: (as: NonEmptyReadonlyArray<A>) => readonly [B, ReadonlyArray<A>]
): Array<B> => {
  const input = fromIterable(self)
  if (isNonEmptyReadonlyArray(input)) {
    const [b, rest] = f(input)
    const out: NonEmptyArray<B> = [b]
    let next: ReadonlyArray<A> = rest
    while (readonlyArray.isNonEmptyArray(next)) {
      const [b, rest] = f(next)
      out.push(b)
      next = rest
    }
    return out
  }
  return []
})

/**
 * Splits an `Iterable` into two segments, with the first segment containing a maximum of `n` elements.
 * The value of `n` can be `0`.
 *
 * @category splitting
 * @since 2.0.0
 */
export const splitAt: {
  (n: number): <A>(self: Iterable<A>) => [beforeIndex: Array<A>, fromIndex: Array<A>]
  <A>(self: Iterable<A>, n: number): [beforeIndex: Array<A>, fromIndex: Array<A>]
} = dual(2, <A>(self: Iterable<A>, n: number): [Array<A>, Array<A>] => {
  const input = Array.from(self)
  const _n = Math.floor(n)
  if (isNonEmptyReadonlyArray(input)) {
    if (_n >= 1) {
      return splitNonEmptyAt(input, _n)
    }
    return [[], input]
  }
  return [input, []]
})

/**
 * Splits a `NonEmptyReadonlyArray` into two segments, with the first segment containing a maximum of `n` elements.
 * The value of `n` must be `>= 1`.
 *
 * @category splitting
 * @since 2.0.0
 */
export const splitNonEmptyAt: {
  (n: number): <A>(self: NonEmptyReadonlyArray<A>) => [beforeIndex: NonEmptyArray<A>, fromIndex: Array<A>]
  <A>(self: NonEmptyReadonlyArray<A>, n: number): [beforeIndex: NonEmptyArray<A>, fromIndex: Array<A>]
} = dual(2, <A>(self: NonEmptyReadonlyArray<A>, n: number): [NonEmptyArray<A>, Array<A>] => {
  const _n = Math.max(1, Math.floor(n))
  return _n >= self.length ?
    [copy(self), []] :
    [prepend(self.slice(1, _n), headNonEmpty(self)), self.slice(_n)]
})

/**
 * Splits this iterable into `n` equally sized arrays.
 *
 * @since 2.0.0
 * @category splitting
 */
export const split: {
  (n: number): <A>(self: Iterable<A>) => Array<Array<A>>
  <A>(self: Iterable<A>, n: number): Array<Array<A>>
} = dual(2, <A>(self: Iterable<A>, n: number) => {
  const input = fromIterable(self)
  return chunksOf(input, Math.ceil(input.length / Math.floor(n)))
})

/**
 * Splits this iterable on the first element that matches this predicate.
 * Returns a tuple containing two arrays: the first one is before the match, and the second one is from the match onward.
 *
 * @category splitting
 * @since 2.0.0
 */
export const splitWhere: {
  <A>(
    predicate: (a: NoInfer<A>, i: number) => boolean
  ): (self: Iterable<A>) => [beforeMatch: Array<A>, fromMatch: Array<A>]
  <A>(self: Iterable<A>, predicate: (a: A, i: number) => boolean): [beforeMatch: Array<A>, fromMatch: Array<A>]
} = dual(
  2,
  <A>(self: Iterable<A>, predicate: (a: A, i: number) => boolean): [beforeMatch: Array<A>, fromMatch: Array<A>] =>
    span(self, (a: A, i: number) => !predicate(a, i))
)

/**
 * @since 2.0.0
 */
export const copy: {
  <A>(self: NonEmptyReadonlyArray<A>): NonEmptyArray<A>
  <A>(self: ReadonlyArray<A>): Array<A>
} = (<A>(self: ReadonlyArray<A>): Array<A> => self.slice()) as any

/**
 * Splits an `Iterable` into length-`n` pieces. The last piece will be shorter if `n` does not evenly divide the length of
 * the `Iterable`. Note that `chunksOf(n)([])` is `[]`, not `[[]]`. This is intentional, and is consistent with a recursive
 * definition of `chunksOf`; it satisfies the property that
 *
 * ```ts
 * chunksOf(n)(xs).concat(chunksOf(n)(ys)) == chunksOf(n)(xs.concat(ys)))
 * ```
 *
 * whenever `n` evenly divides the length of `self`.
 *
 * @category splitting
 * @since 2.0.0
 */
export const chunksOf: {
  (
    n: number
  ): <S extends ReadonlyArray<any> | Iterable<any>>(
    self: S
  ) => ReadonlyArray.With<S, NonEmptyArray<ReadonlyArray.Infer<S>>>
  <A>(self: NonEmptyReadonlyArray<A>, n: number): NonEmptyArray<NonEmptyArray<A>>
  <A>(self: Iterable<A>, n: number): Array<NonEmptyArray<A>>
} = dual(2, <A>(self: Iterable<A>, n: number): Array<NonEmptyArray<A>> => {
  const input = fromIterable(self)
  if (isNonEmptyReadonlyArray(input)) {
    return chop(input, splitNonEmptyAt(n))
  }
  return []
})

/**
 * Group equal, consecutive elements of a `NonEmptyReadonlyArray` into `NonEmptyArray`s using the provided `isEquivalent` function.
 *
 * @category grouping
 * @since 2.0.0
 */
export const groupWith: {
  <A>(isEquivalent: (self: A, that: A) => boolean): (self: NonEmptyReadonlyArray<A>) => NonEmptyArray<NonEmptyArray<A>>
  <A>(self: NonEmptyReadonlyArray<A>, isEquivalent: (self: A, that: A) => boolean): NonEmptyArray<NonEmptyArray<A>>
} = dual(
  2,
  <A>(self: NonEmptyReadonlyArray<A>, isEquivalent: (self: A, that: A) => boolean): NonEmptyArray<NonEmptyArray<A>> =>
    chop(self, (as) => {
      const h = headNonEmpty(as)
      const out: NonEmptyArray<A> = [h]
      let i = 1
      for (; i < as.length; i++) {
        const a = as[i]
        if (isEquivalent(a, h)) {
          out.push(a)
        } else {
          break
        }
      }
      return [out, as.slice(i)]
    })
)

/**
 * Group equal, consecutive elements of a `NonEmptyReadonlyArray` into `NonEmptyArray`s.
 *
 * @category grouping
 * @since 2.0.0
 */
export const group: <A>(self: NonEmptyReadonlyArray<A>) => NonEmptyArray<NonEmptyArray<A>> = groupWith(
  Equal.equivalence()
)

/**
 * Splits an `Iterable` into sub-non-empty-arrays stored in an object, based on the result of calling a `string`-returning
 * function on each element, and grouping the results according to values returned
 *
 * @category grouping
 * @since 2.0.0
 */
export const groupBy: {
  <A, K extends string | symbol>(
    f: (a: A) => K
  ): (self: Iterable<A>) => Record<Record.ReadonlyRecord.NonLiteralKey<K>, NonEmptyArray<A>>
  <A, K extends string | symbol>(
    self: Iterable<A>,
    f: (a: A) => K
  ): Record<Record.ReadonlyRecord.NonLiteralKey<K>, NonEmptyArray<A>>
} = dual(2, <A, K extends string | symbol>(
  self: Iterable<A>,
  f: (a: A) => K
): Record<Record.ReadonlyRecord.NonLiteralKey<K>, NonEmptyArray<A>> => {
  const out: Record<string | symbol, NonEmptyArray<A>> = {}
  for (const a of self) {
    const k = f(a)
    if (Object.prototype.hasOwnProperty.call(out, k)) {
      out[k].push(a)
    } else {
      out[k] = [a]
    }
  }
  return out
})

/**
 * @since 2.0.0
 */
export const unionWith: {
  <S extends ReadonlyArray<any> | Iterable<any>, T extends ReadonlyArray<any> | Iterable<any>>(
    that: T,
    isEquivalent: (self: ReadonlyArray.Infer<S>, that: ReadonlyArray.Infer<T>) => boolean
  ): (self: S) => ReadonlyArray.OrNonEmpty<S, T, ReadonlyArray.Infer<S> | ReadonlyArray.Infer<T>>
  <A, B>(
    self: NonEmptyReadonlyArray<A>,
    that: Iterable<B>,
    isEquivalent: (self: A, that: B) => boolean
  ): NonEmptyArray<A | B>
  <A, B>(
    self: Iterable<A>,
    that: NonEmptyReadonlyArray<B>,
    isEquivalent: (self: A, that: B) => boolean
  ): NonEmptyArray<A | B>
  <A, B>(self: Iterable<A>, that: Iterable<B>, isEquivalent: (self: A, that: B) => boolean): Array<A | B>
} = dual(3, <A>(self: Iterable<A>, that: Iterable<A>, isEquivalent: (self: A, that: A) => boolean): Array<A> => {
  const a = fromIterable(self)
  const b = fromIterable(that)
  if (isNonEmptyReadonlyArray(a)) {
    if (isNonEmptyReadonlyArray(b)) {
      const dedupe = dedupeWith(isEquivalent)
      return dedupe(appendAll(a, b))
    }
    return a
  }
  return b
})

/**
 * @since 2.0.0
 */
export const union: {
  <T extends ReadonlyArray<any> | Iterable<any>>(
    that: T
  ): <S extends ReadonlyArray<any> | Iterable<any>>(
    self: S
  ) => ReadonlyArray.OrNonEmpty<S, T, ReadonlyArray.Infer<S> | ReadonlyArray.Infer<T>>
  <A, B>(self: NonEmptyReadonlyArray<A>, that: ReadonlyArray<B>): NonEmptyArray<A | B>
  <A, B>(self: ReadonlyArray<A>, that: NonEmptyReadonlyArray<B>): NonEmptyArray<A | B>
  <A, B>(self: Iterable<A>, that: Iterable<B>): Array<A | B>
} = dual(2, <A, B>(self: Iterable<A>, that: Iterable<B>): Array<A | B> => unionWith(self, that, _equivalence))

/**
 * Creates an `Array` of unique values that are included in all given `Iterable`s using the provided `isEquivalent` function.
 * The order and references of result values are determined by the first `Iterable`.
 *
 * @since 2.0.0
 */
export const intersectionWith = <A>(isEquivalent: (self: A, that: A) => boolean): {
  (that: Iterable<A>): (self: Iterable<A>) => Array<A>
  (self: Iterable<A>, that: Iterable<A>): Array<A>
} => {
  const has = containsWith(isEquivalent)
  return dual(
    2,
    (self: Iterable<A>, that: Iterable<A>): Array<A> => fromIterable(self).filter((a) => has(that, a))
  )
}

/**
 * Creates an `Array` of unique values that are included in all given `Iterable`s.
 * The order and references of result values are determined by the first `Iterable`.
 *
 * @since 2.0.0
 */
export const intersection: {
  <B>(that: Iterable<B>): <A>(self: Iterable<A>) => Array<A & B>
  <A, B>(self: Iterable<A>, that: Iterable<B>): Array<A & B>
} = intersectionWith(_equivalence)

/**
 * Creates a `Array` of values not included in the other given `Iterable` using the provided `isEquivalent` function.
 * The order and references of result values are determined by the first `Iterable`.
 *
 * @since 2.0.0
 */
export const differenceWith = <A>(isEquivalent: (self: A, that: A) => boolean): {
  (that: Iterable<A>): (self: Iterable<A>) => Array<A>
  (self: Iterable<A>, that: Iterable<A>): Array<A>
} => {
  const has = containsWith(isEquivalent)
  return dual(
    2,
    (self: Iterable<A>, that: Iterable<A>): Array<A> => fromIterable(self).filter((a) => !has(that, a))
  )
}

/**
 * Creates a `Array` of values not included in the other given `Iterable`.
 * The order and references of result values are determined by the first `Iterable`.
 *
 * @since 2.0.0
 */
export const difference: {
  <A>(that: Iterable<A>): (self: Iterable<A>) => Array<A>
  <A>(self: Iterable<A>, that: Iterable<A>): Array<A>
} = differenceWith(_equivalence)

/**
 * @category constructors
 * @since 2.0.0
 */
export const empty: <A = never>() => Array<A> = () => []

/**
 * Constructs a new `NonEmptyArray<A>` from the specified value.
 *
 * @category constructors
 * @since 2.0.0
 */
export const of = <A>(a: A): NonEmptyArray<A> => [a]

/**
 * @since 2.0.0
 */
export declare namespace ReadonlyArray {
  /**
   * @since 2.0.0
   */
  export type Infer<S extends ReadonlyArray<any> | Iterable<any>> = S extends ReadonlyArray<infer A> ? A
    : S extends Iterable<infer A> ? A
    : never

  /**
   * @since 2.0.0
   */
  export type With<S extends ReadonlyArray<any> | Iterable<any>, A> = S extends NonEmptyReadonlyArray<any> ?
    NonEmptyArray<A>
    : Array<A>

  /**
   * @since 2.0.0
   */
  export type OrNonEmpty<
    S extends ReadonlyArray<any> | Iterable<any>,
    T extends ReadonlyArray<any> | Iterable<any>,
    A
  > = S extends NonEmptyReadonlyArray<any> ? NonEmptyArray<A>
    : T extends NonEmptyReadonlyArray<any> ? NonEmptyArray<A>
    : Array<A>

  /**
   * @since 2.0.0
   */
  export type AndNonEmpty<
    S extends ReadonlyArray<any> | Iterable<any>,
    T extends ReadonlyArray<any> | Iterable<any>,
    A
  > = S extends NonEmptyReadonlyArray<any> ? T extends NonEmptyReadonlyArray<any> ? NonEmptyArray<A>
    : Array<A>
    : Array<A>

  /**
   * @since 2.0.0
   */
  export type Flatten<T extends ReadonlyArray<ReadonlyArray<any>>> = T extends
    NonEmptyReadonlyArray<NonEmptyReadonlyArray<infer A>> ? NonEmptyArray<A>
    : T extends ReadonlyArray<ReadonlyArray<infer A>> ? Array<A>
    : never
}

/**
 * @category mapping
 * @since 2.0.0
 */
export const map: {
  <S extends ReadonlyArray<any>, B>(
    f: (a: ReadonlyArray.Infer<S>, i: number) => B
  ): (self: S) => ReadonlyArray.With<S, B>
  <S extends ReadonlyArray<any>, B>(self: S, f: (a: ReadonlyArray.Infer<S>, i: number) => B): ReadonlyArray.With<S, B>
} = dual(2, <A, B>(self: ReadonlyArray<A>, f: (a: A, i: number) => B): Array<B> => self.map(f))

/**
 * Applies a function to each element in an array and returns a new array containing the concatenated mapped elements.
 *
 * @category sequencing
 * @since 2.0.0
 */
export const flatMap: {
  <S extends ReadonlyArray<any>, T extends ReadonlyArray<any>>(
    f: (a: ReadonlyArray.Infer<S>, i: number) => T
  ): (self: S) => ReadonlyArray.AndNonEmpty<S, T, ReadonlyArray.Infer<T>>
  <A, B>(self: NonEmptyReadonlyArray<A>, f: (a: A, i: number) => NonEmptyReadonlyArray<B>): NonEmptyArray<B>
  <A, B>(self: ReadonlyArray<A>, f: (a: A, i: number) => ReadonlyArray<B>): Array<B>
} = dual(
  2,
  <A, B>(self: ReadonlyArray<A>, f: (a: A, i: number) => ReadonlyArray<B>): Array<B> => {
    if (isEmptyReadonlyArray(self)) {
      return []
    }
    const out: Array<B> = []
    for (let i = 0; i < self.length; i++) {
      const inner = f(self[i], i)
      for (let j = 0; j < inner.length; j++) {
        out.push(inner[j])
      }
    }
    return out
  }
)

/**
 * Flattens an array of arrays into a single array by concatenating all arrays.
 *
 * @category sequencing
 * @since 2.0.0
 */
export const flatten: <S extends ReadonlyArray<ReadonlyArray<any>>>(self: S) => ReadonlyArray.Flatten<S> = flatMap(
  identity
) as any

/**
 * @category filtering
 * @since 2.0.0
 */
export const filterMap: {
  <A, B>(f: (a: A, i: number) => Option<B>): (self: Iterable<A>) => Array<B>
  <A, B>(self: Iterable<A>, f: (a: A, i: number) => Option<B>): Array<B>
} = dual(
  2,
  <A, B>(self: Iterable<A>, f: (a: A, i: number) => Option<B>): Array<B> => {
    const as = fromIterable(self)
    const out: Array<B> = []
    for (let i = 0; i < as.length; i++) {
      const o = f(as[i], i)
      if (O.isSome(o)) {
        out.push(o.value)
      }
    }
    return out
  }
)

/**
 * Transforms all elements of the `readonlyArray` for as long as the specified function returns some value
 *
 * @category filtering
 * @since 2.0.0
 */
export const filterMapWhile: {
  <A, B>(f: (a: A, i: number) => Option<B>): (self: Iterable<A>) => Array<B>
  <A, B>(self: Iterable<A>, f: (a: A, i: number) => Option<B>): Array<B>
} = dual(2, <A, B>(self: Iterable<A>, f: (a: A, i: number) => Option<B>) => {
  let i = 0
  const out: Array<B> = []
  for (const a of self) {
    const b = f(a, i)
    if (O.isSome(b)) {
      out.push(b.value)
    } else {
      break
    }
    i++
  }
  return out
})

/**
 * @category filtering
 * @since 2.0.0
 */
export const partitionMap: {
  <A, B, C>(f: (a: A, i: number) => Either<C, B>): (self: Iterable<A>) => [left: Array<B>, right: Array<C>]
  <A, B, C>(self: Iterable<A>, f: (a: A, i: number) => Either<C, B>): [left: Array<B>, right: Array<C>]
} = dual(
  2,
  <A, B, C>(self: Iterable<A>, f: (a: A, i: number) => Either<C, B>): [left: Array<B>, right: Array<C>] => {
    const left: Array<B> = []
    const right: Array<C> = []
    const as = fromIterable(self)
    for (let i = 0; i < as.length; i++) {
      const e = f(as[i], i)
      if (E.isLeft(e)) {
        left.push(e.left)
      } else {
        right.push(e.right)
      }
    }
    return [left, right]
  }
)

/**
 * Retrieves the `Some` values from an `Iterable` of `Option`s, collecting them into an array.
 *
 * @example
 * import { Array, Option } from "effect"
 *
 * assert.deepStrictEqual(
 *   Array.getSomes([Option.some(1), Option.none(), Option.some(2)]),
 *   [1, 2]
 * )
 *
 * @category filtering
 * @since 2.0.0
 */
export const getSomes: <A>(self: Iterable<Option<A>>) => Array<A> = filterMap(identity)

/**
 * Retrieves the `Left` values from an `Iterable` of `Either`s, collecting them into an array.
 *
 * @example
 * import { Array, Either } from "effect"
 *
 * assert.deepStrictEqual(
 *   Array.getLefts([Either.right(1), Either.left("err"), Either.right(2)]),
 *   ["err"]
 * )
 *
 * @category filtering
 * @since 2.0.0
 */
export const getLefts = <R, L>(self: Iterable<Either<R, L>>): Array<L> => {
  const out: Array<L> = []
  for (const a of self) {
    if (E.isLeft(a)) {
      out.push(a.left)
    }
  }

  return out
}

/**
 * Retrieves the `Right` values from an `Iterable` of `Either`s, collecting them into an array.
 *
 * @example
 * import { Array, Either } from "effect"
 *
 * assert.deepStrictEqual(
 *   Array.getRights([Either.right(1), Either.left("err"), Either.right(2)]),
 *   [1, 2]
 * )
 *
 * @category filtering
 * @since 2.0.0
 */
export const getRights = <R, L>(self: Iterable<Either<R, L>>): Array<R> => {
  const out: Array<R> = []
  for (const a of self) {
    if (E.isRight(a)) {
      out.push(a.right)
    }
  }

  return out
}

/**
 * @category filtering
 * @since 2.0.0
 */
export const filter: {
  <A, B extends A>(refinement: (a: NoInfer<A>, i: number) => a is B): (self: Iterable<A>) => Array<B>
  <A>(predicate: (a: NoInfer<A>, i: number) => boolean): (self: Iterable<A>) => Array<A>
  <A, B extends A>(self: Iterable<A>, refinement: (a: A, i: number) => a is B): Array<B>
  <A>(self: Iterable<A>, predicate: (a: A, i: number) => boolean): Array<A>
} = dual(
  2,
  <A>(self: Iterable<A>, predicate: (a: A, i: number) => boolean): Array<A> => {
    const as = fromIterable(self)
    const out: Array<A> = []
    for (let i = 0; i < as.length; i++) {
      if (predicate(as[i], i)) {
        out.push(as[i])
      }
    }
    return out
  }
)

/**
 * Separate elements based on a predicate that also exposes the index of the element.
 *
 * @category filtering
 * @since 2.0.0
 */
export const partition: {
  <A, B extends A>(refinement: (a: NoInfer<A>, i: number) => a is B): (
    self: Iterable<A>
  ) => [excluded: Array<Exclude<A, B>>, satisfying: Array<B>]
  <A>(
    predicate: (a: NoInfer<A>, i: number) => boolean
  ): (self: Iterable<A>) => [excluded: Array<A>, satisfying: Array<A>]
  <A, B extends A>(
    self: Iterable<A>,
    refinement: (a: A, i: number) => a is B
  ): [excluded: Array<Exclude<A, B>>, satisfying: Array<B>]
  <A>(self: Iterable<A>, predicate: (a: A, i: number) => boolean): [excluded: Array<A>, satisfying: Array<A>]
} = dual(
  2,
  <A>(self: Iterable<A>, predicate: (a: A, i: number) => boolean): [excluded: Array<A>, satisfying: Array<A>] => {
    const left: Array<A> = []
    const right: Array<A> = []
    const as = fromIterable(self)
    for (let i = 0; i < as.length; i++) {
      if (predicate(as[i], i)) {
        right.push(as[i])
      } else {
        left.push(as[i])
      }
    }
    return [left, right]
  }
)

/**
 * @category filtering
 * @since 2.0.0
 */
export const separate: <R, L>(self: Iterable<Either<R, L>>) => [Array<L>, Array<R>] = partitionMap(
  identity
)

/**
 * @category folding
 * @since 2.0.0
 */
export const reduce: {
  <B, A>(b: B, f: (b: B, a: A, i: number) => B): (self: Iterable<A>) => B
  <A, B>(self: Iterable<A>, b: B, f: (b: B, a: A, i: number) => B): B
} = dual(
  3,
  <B, A>(self: Iterable<A>, b: B, f: (b: B, a: A, i: number) => B): B =>
    fromIterable(self).reduce((b, a, i) => f(b, a, i), b)
)

/**
 * @category folding
 * @since 2.0.0
 */
export const reduceRight: {
  <B, A>(b: B, f: (b: B, a: A, i: number) => B): (self: Iterable<A>) => B
  <A, B>(self: Iterable<A>, b: B, f: (b: B, a: A, i: number) => B): B
} = dual(
  3,
  <A, B>(self: Iterable<A>, b: B, f: (b: B, a: A, i: number) => B): B =>
    fromIterable(self).reduceRight((b, a, i) => f(b, a, i), b)
)

/**
 * @category lifting
 * @since 2.0.0
 */
export const liftPredicate: { // Note: I intentionally avoid using the NoInfer pattern here.
  <A, B extends A>(refinement: Refinement<A, B>): (a: A) => Array<B>
  <A>(predicate: Predicate<A>): <B extends A>(b: B) => Array<B>
} = <A>(predicate: Predicate<A>) => <B extends A>(b: B): Array<B> => predicate(b) ? [b] : []

/**
 * @category lifting
 * @since 2.0.0
 */
export const liftOption = <A extends Array<unknown>, B>(
  f: (...a: A) => Option<B>
) =>
(...a: A): Array<B> => fromOption(f(...a))

/**
 * @category conversions
 * @since 2.0.0
 */
export const fromNullable = <A>(a: A): Array<NonNullable<A>> => a == null ? empty() : [a as NonNullable<A>]

/**
 * @category lifting
 * @since 2.0.0
 */
export const liftNullable = <A extends Array<unknown>, B>(
  f: (...a: A) => B | null | undefined
): (...a: A) => Array<NonNullable<B>> =>
(...a) => fromNullable(f(...a))

/**
 * @category sequencing
 * @since 2.0.0
 */
export const flatMapNullable: {
  <A, B>(f: (a: A) => B | null | undefined): (self: ReadonlyArray<A>) => Array<NonNullable<B>>
  <A, B>(self: ReadonlyArray<A>, f: (a: A) => B | null | undefined): Array<NonNullable<B>>
} = dual(
  2,
  <A, B>(self: ReadonlyArray<A>, f: (a: A) => B | null | undefined): Array<NonNullable<B>> =>
    isNonEmptyReadonlyArray(self) ? fromNullable(f(headNonEmpty(self))) : empty()
)

/**
 * @category lifting
 * @since 2.0.0
 */
export const liftEither = <A extends Array<unknown>, E, B>(
  f: (...a: A) => Either<B, E>
) =>
(...a: A): Array<B> => {
  const e = f(...a)
  return E.isLeft(e) ? [] : [e.right]
}

/**
 * Check if a predicate holds true for every `ReadonlyArray` element.
 *
 * @category elements
 * @since 2.0.0
 */
export const every: {
  <A, B extends A>(
    refinement: (a: NoInfer<A>, i: number) => a is B
  ): (self: ReadonlyArray<A>) => self is ReadonlyArray<B>
  <A>(predicate: (a: NoInfer<A>, i: number) => boolean): (self: ReadonlyArray<A>) => boolean
  <A, B extends A>(self: ReadonlyArray<A>, refinement: (a: A, i: number) => a is B): self is ReadonlyArray<B>
  <A>(self: ReadonlyArray<A>, predicate: (a: A, i: number) => boolean): boolean
} = dual(
  2,
  <A, B extends A>(self: ReadonlyArray<A>, refinement: (a: A, i: number) => a is B): self is ReadonlyArray<B> =>
    self.every(refinement)
)

/**
 * Check if a predicate holds true for some `ReadonlyArray` element.
 *
 * @category elements
 * @since 2.0.0
 */
export const some: {
  <A>(
    predicate: (a: NoInfer<A>, i: number) => boolean
  ): (self: ReadonlyArray<A>) => self is NonEmptyReadonlyArray<A>
  <A>(self: ReadonlyArray<A>, predicate: (a: A, i: number) => boolean): self is NonEmptyReadonlyArray<A>
} = dual(
  2,
  <A>(self: ReadonlyArray<A>, predicate: (a: A, i: number) => boolean): self is NonEmptyReadonlyArray<A> =>
    self.some(predicate)
)

/**
 * @since 2.0.0
 */
export const extend: {
  <A, B>(f: (as: ReadonlyArray<A>) => B): (self: ReadonlyArray<A>) => Array<B>
  <A, B>(self: ReadonlyArray<A>, f: (as: ReadonlyArray<A>) => B): Array<B>
} = dual(
  2,
  <A, B>(self: ReadonlyArray<A>, f: (as: ReadonlyArray<A>) => B): Array<B> => self.map((_, i, as) => f(as.slice(i)))
)

/**
 * @since 2.0.0
 */
export const min: {
  <A>(O: Order.Order<A>): (self: NonEmptyReadonlyArray<A>) => A
  <A>(self: NonEmptyReadonlyArray<A>, O: Order.Order<A>): A
} = dual(2, <A>(self: NonEmptyReadonlyArray<A>, O: Order.Order<A>): A => self.reduce(Order.min(O)))

/**
 * @since 2.0.0
 */
export const max: {
  <A>(O: Order.Order<A>): (self: NonEmptyReadonlyArray<A>) => A
  <A>(self: NonEmptyReadonlyArray<A>, O: Order.Order<A>): A
} = dual(2, <A>(self: NonEmptyReadonlyArray<A>, O: Order.Order<A>): A => self.reduce(Order.max(O)))

/**
 * @category constructors
 * @since 2.0.0
 */
export const unfold = <B, A>(b: B, f: (b: B) => Option<readonly [A, B]>): Array<A> => {
  const out: Array<A> = []
  let next: B = b
  let o: Option<readonly [A, B]>
  while (O.isSome(o = f(next))) {
    const [a, b] = o.value
    out.push(a)
    next = b
  }
  return out
}

/**
 * This function creates and returns a new `Order` for an array of values based on a given `Order` for the elements of the array.
 * The returned `Order` compares two arrays by applying the given `Order` to each element in the arrays.
 * If all elements are equal, the arrays are then compared based on their length.
 * It is useful when you need to compare two arrays of the same type and you have a specific way of comparing each element of the array.
 *
 * @category instances
 * @since 2.0.0
 */
export const getOrder: <A>(O: Order.Order<A>) => Order.Order<ReadonlyArray<A>> = Order.array

/**
 * @category instances
 * @since 2.0.0
 */
export const getEquivalence: <A>(
  isEquivalent: Equivalence.Equivalence<A>
) => Equivalence.Equivalence<ReadonlyArray<A>> = Equivalence.array

/**
 * Iterate over the `Iterable` applying `f`.
 *
 * @since 2.0.0
 */
export const forEach: {
  <A>(f: (a: A, i: number) => void): (self: Iterable<A>) => void
  <A>(self: Iterable<A>, f: (a: A, i: number) => void): void
} = dual(2, <A>(self: Iterable<A>, f: (a: A, i: number) => void): void => fromIterable(self).forEach((a, i) => f(a, i)))

/**
 * Remove duplicates from an `Iterable` using the provided `isEquivalent` function,
 * preserving the order of the first occurrence of each element.
 *
 * @since 2.0.0
 */
export const dedupeWith: {
  <S extends ReadonlyArray<any> | Iterable<any>>(
    isEquivalent: (self: ReadonlyArray.Infer<S>, that: ReadonlyArray.Infer<S>) => boolean
  ): (self: S) => ReadonlyArray.With<S, ReadonlyArray.Infer<S>>
  <A>(self: NonEmptyReadonlyArray<A>, isEquivalent: (self: A, that: A) => boolean): NonEmptyArray<A>
  <A>(self: Iterable<A>, isEquivalent: (self: A, that: A) => boolean): Array<A>
} = dual(
  2,
  <A>(self: Iterable<A>, isEquivalent: (self: A, that: A) => boolean): Array<A> => {
    const input = fromIterable(self)
    if (isNonEmptyReadonlyArray(input)) {
      const out: NonEmptyArray<A> = [headNonEmpty(input)]
      const rest = tailNonEmpty(input)
      for (const r of rest) {
        if (out.every((a) => !isEquivalent(r, a))) {
          out.push(r)
        }
      }
      return out
    }
    return []
  }
)

/**
 * Remove duplicates from an `Iterable`, preserving the order of the first occurrence of each element.
 * The equivalence used to compare elements is provided by `Equal.equivalence()` from the `Equal` module.
 *
 * @since 2.0.0
 */
export const dedupe = <S extends Iterable<any> | NonEmptyReadonlyArray<any>>(
  self: S
): S extends NonEmptyReadonlyArray<infer A> ? NonEmptyArray<A> : S extends Iterable<infer A> ? Array<A> : never =>
  dedupeWith(self, Equal.equivalence()) as any

/**
 * Deduplicates adjacent elements that are identical using the provided `isEquivalent` function.
 *
 * @since 2.0.0
 */
export const dedupeAdjacentWith: {
  <A>(isEquivalent: (self: A, that: A) => boolean): (self: Iterable<A>) => Array<A>
  <A>(self: Iterable<A>, isEquivalent: (self: A, that: A) => boolean): Array<A>
} = dual(2, <A>(self: Iterable<A>, isEquivalent: (self: A, that: A) => boolean): Array<A> => {
  const out: Array<A> = []
  let lastA: O.Option<A> = O.none()
  for (const a of self) {
    if (O.isNone(lastA) || !isEquivalent(a, lastA.value)) {
      out.push(a)
      lastA = O.some(a)
    }
  }
  return out
})

/**
 * Deduplicates adjacent elements that are identical.
 *
 * @since 2.0.0
 */
export const dedupeAdjacent: <A>(self: Iterable<A>) => Array<A> = dedupeAdjacentWith(Equal.equivalence())

/**
 * Joins the elements together with "sep" in the middle.
 *
 * @since 2.0.0
 * @category folding
 */
export const join: {
  (sep: string): (self: Iterable<string>) => string
  (self: Iterable<string>, sep: string): string
} = dual(2, (self: Iterable<string>, sep: string): string => fromIterable(self).join(sep))

/**
 * Statefully maps over the chunk, producing new elements of type `B`.
 *
 * @since 2.0.0
 * @category folding
 */
export const mapAccum: {
  <S, A, B>(
    s: S,
    f: (s: S, a: A, i: number) => readonly [S, B]
  ): (self: Iterable<A>) => [state: S, mappedArray: Array<B>]
  <S, A, B>(self: Iterable<A>, s: S, f: (s: S, a: A, i: number) => readonly [S, B]): [state: S, mappedArray: Array<B>]
} = dual(
  3,
  <S, A, B>(self: Iterable<A>, s: S, f: (s: S, a: A, i: number) => [S, B]): [state: S, mappedArray: Array<B>] => {
    let i = 0
    let s1 = s
    const out: Array<B> = []
    for (const a of self) {
      const r = f(s1, a, i)
      s1 = r[0]
      out.push(r[1])
      i++
    }
    return [s1, out]
  }
)

/**
 * Zips this chunk crosswise with the specified chunk using the specified combiner.
 *
 * @since 2.0.0
 * @category elements
 */
export const cartesianWith: {
  <A, B, C>(that: ReadonlyArray<B>, f: (a: A, b: B) => C): (self: ReadonlyArray<A>) => Array<C>
  <A, B, C>(self: ReadonlyArray<A>, that: ReadonlyArray<B>, f: (a: A, b: B) => C): Array<C>
} = dual(
  3,
  <A, B, C>(self: ReadonlyArray<A>, that: ReadonlyArray<B>, f: (a: A, b: B) => C): Array<C> =>
    flatMap(self, (a) => map(that, (b) => f(a, b)))
)

/**
 * Zips this chunk crosswise with the specified chunk.
 *
 * @since 2.0.0
 * @category elements
 */
export const cartesian: {
  <B>(that: ReadonlyArray<B>): <A>(self: ReadonlyArray<A>) => Array<[A, B]>
  <A, B>(self: ReadonlyArray<A>, that: ReadonlyArray<B>): Array<[A, B]>
} = dual(
  2,
  <A, B>(self: ReadonlyArray<A>, that: ReadonlyArray<B>): Array<[A, B]> => cartesianWith(self, that, (a, b) => [a, b])
)
