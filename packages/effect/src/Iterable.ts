/**
 * This module provides utility functions for working with Iterables in TypeScript.
 *
 * @since 2.0.0
 */

import type { NonEmptyArray } from "./Array.js"
import type { Either } from "./Either.js"
import * as E from "./Either.js"
import * as Equal from "./Equal.js"
import { dual, identity } from "./Function.js"
import type { NonEmptyIterable } from "./NonEmptyIterable.js"
import type { Option } from "./Option.js"
import * as O from "./Option.js"
import { isBoolean } from "./Predicate.js"
import type * as Record from "./Record.js"
import * as Tuple from "./Tuple.js"
import type { NoInfer } from "./Types.js"


export declare namespace Iterable {

  type Infer<S extends Iterable<any>> = S extends Iterable<infer A> ? A
      : never

  type With<S extends Iterable<any>, A> = S extends NonEmptyIterable<any> ? NonEmptyIterable<A>
      : Iterable<A>

  type OrNonEmpty<
    S extends Iterable<any>,
    T extends Iterable<any>,
    A
  > = S extends NonEmptyIterable<any> ? NonEmptyIterable<A>
    : T extends NonEmptyIterable<any> ? NonEmptyIterable<A>
    : Iterable<A>

  type AndNonEmpty<
    S extends Iterable<any>,
    T extends Iterable<any>,
    A
  > = S extends NonEmptyIterable<any> ? T extends NonEmptyIterable<any> ? NonEmptyIterable<A>
    : Iterable<A>
    : Iterable<A>

  export type Flatten<T extends Iterable<Iterable<any>>> = T extends
    NonEmptyIterable<NonEmptyIterable<infer A>> ? NonEmptyIterable<A>
    : T extends Iterable<Iterable<infer A>> ? Iterable<A>
    : never
}

/**
 * Return a `Iterable` with element `i` initialized with `f(i)`.
 *
 * If the `length` is not specified, the `Iterable` will be infinite.
 *
 * **Note**. `length` is normalized to an integer >= 1.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { makeBy } from "effect/Iterable"
 *
 * assert.deepStrictEqual(Array.from(makeBy(n => n * 2, { length: 5 })), [0, 2, 4, 6, 8])
 * ```
 *
 * @category constructors
 * @since 2.0.0
 */
export const makeBy = <A>(f: (i: number) => A, options?: {
  readonly length?: number
}): NonEmptyIterable<A> => {
  const max = options?.length !== undefined ? Math.max(1, Math.floor(options.length)) : Infinity
  return {
    [Symbol.iterator]() {
      let i = 0
      return {
        next(): IteratorResult<A> {
          if (i < max) {
            return { value: f(i++), done: false }
          }
          return { done: true, value: undefined }
        }
      }
    }
  } as NonEmptyIterable<A>
}

/**
 * Return a `Iterable` containing a range of integers, including both endpoints.
 *
 * If `end` is omitted, the range will not have an upper bound.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { range } from "effect/Iterable"
 *
 * assert.deepStrictEqual(Array.from(range(1, 3)), [1, 2, 3])
 * ```
 *
 * @category constructors
 * @since 2.0.0
 */
export const range = (start: number, end?: number): NonEmptyIterable<number> => {
  if (end === undefined) {
    return makeBy((i) => start + i)
  }
  return makeBy((i) => start + i, {
    length: start <= end ? end - start + 1 : 1
  })
}

/**
 * Return a `Iterable` containing a value repeated the specified number of times.
 *
 * **Note**. `n` is normalized to an integer >= 1.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { replicate } from "effect/Iterable"
 *
 * assert.deepStrictEqual(Array.from(replicate("a", 3)), ["a", "a", "a"])
 * ```
 *
 * @category constructors
 * @since 2.0.0
 */
export const replicate: {
  (n: number): <A>(a: A) => NonEmptyIterable<A>
  <A>(a: A, n: number): NonEmptyIterable<A>
} = dual(2, <A>(a: A, n: number): Iterable<A> => makeBy(() => a, { length: n }))

/**
 * Takes a record and returns an Iterable of tuples containing its keys and values.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { fromRecord } from "effect/Iterable"
 *
 * const x = { a: 1, b: 2, c: 3 }
 * assert.deepStrictEqual(Array.from(fromRecord(x)), [["a", 1], ["b", 2], ["c", 3]])
 * ```
 *
 * @category conversions
 * @since 2.0.0
 */
export const fromRecord = <K extends string, A>(self: Readonly<Record<K, A>>): Iterable<[K, A]> => ({
  *[Symbol.iterator]() {
    for (const key in self) {
      if (Object.prototype.hasOwnProperty.call(self, key)) {
        yield [key, self[key]]
      }
    }
  }
})

/**
 * Prepend an element to the front of an `Iterable`, creating a new `Iterable`.
 *
 * @category concatenating
 * @since 2.0.0
 */
export const prepend: {
  <B>(head: B): <A>(self: Iterable<A>) => NonEmptyIterable<A | B>
  <A, B>(self: Iterable<A>, head: B): NonEmptyIterable<A | B>
} = dual(2, <A, B>(self: Iterable<A>, head: B): Iterable<A | B> => prependAll(self, [head]))

/**
 * Prepends the specified prefix iterable to the beginning of the specified iterable.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { Iterable } from "effect"
 *
 * assert.deepStrictEqual(
 *   Array.from(Iterable.prependAll([1, 2], ["a", "b"])),
 *   ["a", "b", 1, 2]
 * )
 * ```
 *
 * @category concatenating
 * @since 2.0.0
 */
export const prependAll: {
  <S extends Iterable<any>, T extends Iterable<any>>(
    that: T
  ): (self: S) => Iterable.OrNonEmpty<S, T, Iterable.Infer<S> | Iterable.Infer<T>>
  <A, B>(self: NonEmptyIterable<A>, that: Iterable<B>): NonEmptyIterable<A | B>
  <A, B>(self: Iterable<A>, that: NonEmptyIterable<B>): NonEmptyIterable<A | B>
  <A, B>(self: Iterable<A>, that: Iterable<B>): Iterable<A | B>
} = dual(
  2,
  <A, B>(self: Iterable<A>, that: Iterable<B>): Iterable<A | B> => appendAll(that, self)
)

/**
 * Append an element to the end of an `Iterable`, creating a new `Iterable`.
 *
 * @category concatenating
 * @since 2.0.0
 */
export const append: {
  <B>(last: B): <A>(self: Iterable<A>) => NonEmptyIterable<A | B>
  <A, B>(self: Iterable<A>, last: B): NonEmptyIterable<A | B>
} = dual(2, <A, B>(self: Iterable<A>, last: B): Iterable<A | B> => appendAll(self, [last]))

/**
 * Concatenates two iterables, combining their elements.
 *
 * @category concatenating
 * @since 2.0.0
 */
export const appendAll: {
  <S extends Iterable<any>, T extends Iterable<any>>(
    that: T
  ): (self: S) => Iterable.OrNonEmpty<S, T, Iterable.Infer<S> | Iterable.Infer<T>>
  <A, B>(self: NonEmptyIterable<A>, that: Iterable<B>): NonEmptyIterable<A | B>
  <A, B>(self: Iterable<A>, that: NonEmptyIterable<B>): NonEmptyIterable<A | B>
  <A, B>(self: Iterable<A>, that: Iterable<B>): Iterable<A | B>
} = dual(
  2,
  <A, B>(self: Iterable<A>, that: Iterable<B>): Iterable<A | B> => ({
    [Symbol.iterator]() {
      const iterA = self[Symbol.iterator]()
      let doneA = false
      let iterB: Iterator<B>
      return {
        next() {
          if (!doneA) {
            const r = iterA.next()
            if (r.done) {
              doneA = true
              iterB = that[Symbol.iterator]()
              return iterB.next()
            }
            return r
          }
          return iterB.next()
        }
      }
    }
  })
)

/**
 * Reduce an `Iterable` from the left, keeping all intermediate results instead of only the final result.
 *
 * @category folding
 * @since 2.0.0
 */
export const scan: {
  <B, A>(b: B, f: (b: B, a: A) => B): (self: Iterable<A>) => NonEmptyIterable<B>
  <A, B>(self: Iterable<A>, b: B, f: (b: B, a: A) => B): NonEmptyIterable<B>
} = dual(3, <A, B>(self: Iterable<A>, b: B, f: (b: B, a: A) => B): NonEmptyIterable<B> => ({
  [Symbol.iterator]() {
    let acc = b
    let iterator: Iterator<A> | undefined
    function next() {
      if (iterator === undefined) {
        iterator = self[Symbol.iterator]()
        return { done: false, value: acc }
      }
      const result = iterator.next()
      if (result.done) {
        return result
      }
      acc = f(acc, result.value)
      return { done: false, value: acc }
    }
    return { next }
  }
}) as NonEmptyIterable<B>)

/**
 * Determine if an `Iterable` is empty
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { isEmpty } from "effect/Iterable"
 *
 * assert.deepStrictEqual(isEmpty([]), true);
 * assert.deepStrictEqual(isEmpty([1, 2, 3]), false);
 * ```
 *
 * @category guards
 * @since 2.0.0
 */
export const isEmpty = <A>(self: Iterable<A>): self is Iterable<never> => {
  const iterator = self[Symbol.iterator]()
  return iterator.next().done === true
}

/**
 * Return the number of elements in a `Iterable`.
 *
 * @category getters
 * @since 2.0.0
 */
export const size = <A>(self: Iterable<A>): number => {
  const iterator = self[Symbol.iterator]()
  let count = 0
  while (!iterator.next().done) {
    count++
  }
  return count
}

/**
 * Get the first element of a `Iterable`, or `None` if the `Iterable` is empty.
 *
 * @category getters
 * @since 2.0.0
 */
export const head = <A>(self: Iterable<A>): Option<A> => {
  const iterator = self[Symbol.iterator]()
  const result = iterator.next()
  return result.done ? O.none() : O.some(result.value)
}

/**
 * Get the first element of a `Iterable`, or throw an error if the `Iterable` is empty.
 *
 * @category getters
 * @since 3.3.0
 */
export const unsafeHead = <A>(self: Iterable<A>): A => {
  const iterator = self[Symbol.iterator]()
  const result = iterator.next()
  if (result.done) throw new Error("unsafeHead: empty iterable")
  return result.value
}

/**
 * Keep only a max number of elements from the start of an `Iterable`, creating a new `Iterable`.
 *
 * **Note**. `n` is normalized to a non negative integer.
 *
 * @category getters
 * @since 2.0.0
 */
export const take: {
  (n: number): <A>(self: Iterable<A>) => Iterable<A>
  <A>(self: Iterable<A>, n: number): Iterable<A>
} = dual(2, <A>(self: Iterable<A>, n: number): Iterable<A> => ({
  [Symbol.iterator]() {
    let i = 0
    const iterator = self[Symbol.iterator]()
    return {
      next() {
        if (i < n) {
          i++
          return iterator.next()
        }
        return { done: true, value: undefined }
      }
    }
  }
}))

/**
 * Calculate the longest initial Iterable for which all element satisfy the specified predicate, creating a new `Iterable`.
 *
 * @category getters
 * @since 2.0.0
 */
export const takeWhile: {
  <A, B extends A>(refinement: (a: NoInfer<A>, i: number) => a is B): (self: Iterable<A>) => Iterable<B>
  <A>(predicate: (a: NoInfer<A>, i: number) => boolean): (self: Iterable<A>) => Iterable<A>
  <A, B extends A>(self: Iterable<A>, refinement: (a: A, i: number) => a is B): Iterable<B>
  <A>(self: Iterable<A>, predicate: (a: A, i: number) => boolean): Iterable<A>
} = dual(2, <A>(self: Iterable<A>, predicate: (a: A, i: number) => boolean): Iterable<A> => ({
  [Symbol.iterator]() {
    const iterator = self[Symbol.iterator]()
    let i = 0
    return {
      next() {
        const result = iterator.next()
        if (result.done || !predicate(result.value, i++)) {
          return { done: true, value: undefined }
        }
        return result
      }
    }
  }
}))

/**
 * Drop a max number of elements from the start of an `Iterable`
 *
 * **Note**. `n` is normalized to a non negative integer.
 *
 * @category getters
 * @since 2.0.0
 */
export const drop: {
  (n: number): <A>(self: Iterable<A>) => Iterable<A>
  <A>(self: Iterable<A>, n: number): Iterable<A>
} = dual(2, <A>(self: Iterable<A>, n: number): Iterable<A> => ({
  [Symbol.iterator]() {
    const iterator = self[Symbol.iterator]()
    let i = 0
    return {
      next() {
        while (i < n) {
          const result = iterator.next()
          if (result.done) {
            return { done: true, value: undefined }
          }
          i++
        }
        return iterator.next()
      }
    }
  }
}))

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
} = dual(
  2,
  <A>(self: Iterable<A>, f: ((a: A, i: number) => boolean) | ((a: A, i: number) => Option<A>)): Option<A> => {
    let i = 0
    for (const a of self) {
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
      i++
    }
    return O.none()
  }
)

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
    let i = 0
    let last: Option<A> = O.none()
    for (const a of self) {
      const o = f(a, i)
      if (isBoolean(o)) {
        if (o) {
          last = O.some(a)
        }
      } else {
        if (O.isSome(o)) {
          last = o
        }
      }
      i++
    }
    return last
  }
)

/**
 * Takes two `Iterable`s and returns an `Iterable` of corresponding pairs.
 *
 * @category zipping
 * @since 2.0.0
 */
export const zip: {
  <B>(that: NonEmptyIterable<B>): <A>(self: NonEmptyIterable<A>) => NonEmptyIterable<[A, B]>
  <B>(that: Iterable<B>): <A>(self: Iterable<A>) => Iterable<[A, B]>
  <A, B>(self: NonEmptyIterable<A>, that: NonEmptyIterable<B>): NonEmptyIterable<[A, B]>
  <A, B>(self: Iterable<A>, that: Iterable<B>): Iterable<[A, B]>
} = dual(
  2,
  <A, B>(self: Iterable<A>, that: Iterable<B>): Iterable<[A, B]> => zipWith(self, that, Tuple.make)
)

/**
 * Apply a function to pairs of elements at the same index in two `Iterable`s, collecting the results. If one
 * input `Iterable` is short, excess elements of the longer `Iterable` are discarded.
 *
 * @category zipping
 * @since 2.0.0
 */
export const zipWith: {
  <B, A, C>(that: NonEmptyIterable<B>, f: (a: A, b: B) => C): (self: NonEmptyIterable<A>) => NonEmptyIterable<C>
  <B, A, C>(that: Iterable<B>, f: (a: A, b: B) => C): (self: Iterable<A>) => Iterable<C>
  <A, B, C>(self: NonEmptyIterable<A>, that: NonEmptyIterable<B>, f: (a: A, b: B) => C): NonEmptyIterable<C>
  <A, B, C>(self: Iterable<A>, that: Iterable<B>, f: (a: A, b: B) => C): Iterable<C>
} = dual(3, <B, A, C>(self: Iterable<A>, that: Iterable<B>, f: (a: A, b: B) => C): Iterable<C> => ({
  [Symbol.iterator]() {
    const selfIterator = self[Symbol.iterator]()
    const thatIterator = that[Symbol.iterator]()
    return {
      next() {
        const selfResult = selfIterator.next()
        const thatResult = thatIterator.next()
        if (selfResult.done || thatResult.done) {
          return { done: true, value: undefined }
        }
        return { done: false, value: f(selfResult.value, thatResult.value) }
      }
    }
  }
}))

/**
 * Places an element in between members of an `Iterable`.
 * If the input is a non-empty array, the result is also a non-empty array.
 *
 * @since 2.0.0
 */
export const intersperse: {
  <B>(
    middle: B
  ): <S extends Iterable<any>>(self: S) => Iterable.With<S, Iterable.Infer<S> | B>
  <A, B>(self: NonEmptyIterable<A>, middle: B): NonEmptyIterable<A | B>
  <A, B>(self: Iterable<A>, middle: B): Iterable<A | B>
} = dual(2, <A, B>(self: Iterable<A>, middle: B): Iterable<A | B> => ({
  [Symbol.iterator]() {
    const iterator = self[Symbol.iterator]()
    let next = iterator.next()
    let emitted = false
    return {
      next() {
        if (next.done) {
          return next
        } else if (emitted) {
          emitted = false
          return { done: false, value: middle }
        }
        emitted = true
        const result = next
        next = iterator.next()
        return result
      }
    }
  }
}))

/**
 * Returns a function that checks if an `Iterable` contains a given value using a provided `isEquivalent` function.
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
 * Returns a function that checks if a `Iterable` contains a given value using the default `Equivalence`.
 *
 * @category elements
 * @since 2.0.0
 */
export const contains: {
  <A>(a: A): (self: Iterable<A>) => boolean
  <A>(self: Iterable<A>, a: A): boolean
} = containsWith(_equivalence)

/**
 * Splits an `Iterable` into length-`n` pieces. The last piece will be shorter if `n` does not evenly divide the length of
 * the `Iterable`.
 *
 * @category splitting
 * @since 2.0.0
 */
export const chunksOf: {
  (n: number): <S extends Iterable<any>>(self: S) => Iterable.With<S, NonEmptyArray<Iterable.Infer<S>>>
  <A>(self: NonEmptyIterable<A>, n: number): NonEmptyIterable<NonEmptyArray<A>>
  <A>(self: Iterable<A>, n: number): Iterable<NonEmptyArray<A>>
} = dual(2, <A>(self: Iterable<A>, n: number): Iterable<NonEmptyArray<A>> => {
  const safeN = Math.max(1, Math.floor(n))
  return ({
    [Symbol.iterator]() {
      let iterator: Iterator<A> | undefined = self[Symbol.iterator]()
      return {
        next() {
          if (iterator === undefined) {
            return { done: true, value: undefined }
          }

          const chunk: Array<A> = []
          for (let i = 0; i < safeN; i++) {
            const result = iterator.next()
            if (result.done) {
              iterator = undefined
              return chunk.length === 0 ? { done: true, value: undefined } : { done: false, value: chunk as NonEmptyArray<A> }
            }
            chunk.push(result.value)
          }

          return { done: false, value: chunk as NonEmptyArray<A> }
        }
      }
    }
  })
})

/**
 * Group equal, consecutive elements of an `Iterable` into `NonEmptyArray`s using the provided `isEquivalent` function.
 *
 * @category grouping
 * @since 2.0.0
 */
export const groupWith: {
  <S extends Iterable<any>>(
    isEquivalent: (self: Iterable.Infer<S>, that: Iterable.Infer<S>) => boolean
  ): (self: S) => Iterable.With<S, NonEmptyArray<Iterable.Infer<S>>>
  <A>(self: NonEmptyIterable<A>, isEquivalent: (self: A, that: A) => boolean): NonEmptyIterable<NonEmptyArray<A>>
  <A>(self: Iterable<A>, isEquivalent: (self: A, that: A) => boolean): Iterable<NonEmptyArray<A>>
} = dual(
  2,
  <A>(self: Iterable<A>, isEquivalent: (self: A, that: A) => boolean): Iterable<NonEmptyArray<A>> => ({
    [Symbol.iterator]() {
      const iterator = self[Symbol.iterator]()
      let nextResult: IteratorResult<A> | undefined
      return {
        next() {
          let result: IteratorResult<A>
          if (nextResult !== undefined) {
            if (nextResult.done) {
              return { done: true, value: undefined }
            }
            result = nextResult
            nextResult = undefined
          } else {
            result = iterator.next()
            if (result.done) {
              return { done: true, value: undefined }
            }
          }
          const chunk: NonEmptyArray<A> = [result.value]

          while (true) {
            const next = iterator.next()
            if (next.done || !isEquivalent(result.value, next.value)) {
              nextResult = next
              return { done: false, value: chunk }
            }
            chunk.push(next.value)
          }
        }
      }
    }
  })
)

/**
 * Group equal, consecutive elements of an `Iterable` into `NonEmptyArray`s.
 *
 * @category grouping
 * @since 2.0.0
 */
export const group: {
  <A>(self: NonEmptyIterable<A>): NonEmptyIterable<NonEmptyArray<A>>
  <A>(self: Iterable<A>): Iterable<NonEmptyArray<A>>
} = groupWith(
  Equal.equivalence()
) as any

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

const constEmpty: Iterable<never> = {
  [Symbol.iterator]() {
    return constEmptyIterator
  }
}
const constEmptyIterator: Iterator<never> = {
  next() {
    return { done: true, value: undefined }
  }
}

/**
 * @category constructors
 * @since 2.0.0
 */
export const empty = <A = never>(): Iterable<A> => constEmpty

/**
 * Constructs a new `Iterable<A>` from the specified value.
 *
 * @category constructors
 * @since 2.0.0
 */
export const of = <A>(a: A): NonEmptyIterable<A> => [a] as any

/**
 * @category mapping
 * @since 2.0.0
 */
export const map: {
  <S extends Iterable<any>, B>(
    f: (a: Iterable.Infer<S>, i: number) => B
  ): (self: S) => Iterable.With<S, B>
  <A, B>(self: NonEmptyIterable<A>, f: (a: NoInfer<A>, i: number) => B): NonEmptyIterable<B>
  <A, B>(self: Iterable<A>, f: (a: NoInfer<A>, i: number) => B): Iterable<B>
} = dual(2, <A, B>(self: Iterable<A>, f: (a: A, i: number) => B): Iterable<B> => ({
  [Symbol.iterator]() {
    const iterator = self[Symbol.iterator]()
    let i = 0
    return {
      next() {
        const result = iterator.next()
        if (result.done) {
          return { done: true, value: undefined }
        }
        return { done: false, value: f(result.value, i++) }
      }
    }
  }
}))

/**
 * Applies a function to each element in an Iterable and returns a new Iterable containing the concatenated mapped elements.
 *
 * @category sequencing
 * @since 2.0.0
 */
export const flatMap: {
  <S extends Iterable<any>, T extends Iterable<any>>(
    f: (a: Iterable.Infer<S>, i: number) => T
  ): (self: S) => Iterable.AndNonEmpty<S, T, Iterable.Infer<T>>
  <A, B>(self: NonEmptyIterable<A>, f: (a: NoInfer<A>, i: number) => NonEmptyIterable<B>): NonEmptyIterable<B>
  <A, B>(self: Iterable<A>, f: (a: NoInfer<A>, i: number) => Iterable<B>): Iterable<B>
} = dual(
  2,
  <A, B>(self: Iterable<A>, f: (a: A, i: number) => Iterable<B>): Iterable<B> => flatten(map(self, f))
)

/**
 * Flattens an Iterable of Iterables into a single Iterable
 *
 * @category sequencing
 * @since 2.0.0
 */
export const flatten = <S extends Iterable<Iterable<any>>>(self: S): Iterable.Flatten<S> => ({
  [Symbol.iterator]() {
    const outerIterator = self[Symbol.iterator]()
    let innerIterator: Iterator<Iterable.Infer<Iterable.Infer<S>>> | undefined
    function next() {
      if (innerIterator === undefined) {
        const next = outerIterator.next()
        if (next.done) {
          return next
        }
        innerIterator = next.value[Symbol.iterator]()
      }
      const result = innerIterator.next()
      if (result.done) {
        innerIterator = undefined
        return next()
      }
      return result
    }
    return { next }
  }
}) as any

/**
 * @category filtering
 * @since 2.0.0
 */
export const filterMap: {
  <A, B>(f: (a: A, i: number) => Option<B>): (self: Iterable<A>) => Iterable<B>
  <A, B>(self: Iterable<A>, f: (a: A, i: number) => Option<B>): Iterable<B>
} = dual(
  2,
  <A, B>(self: Iterable<A>, f: (a: A, i: number) => Option<B>): Iterable<B> => ({
    [Symbol.iterator]() {
      const iterator = self[Symbol.iterator]()
      let i = 0
      return {
        next() {
          let result = iterator.next()
          while (!result.done) {
            const b = f(result.value, i++)
            if (O.isSome(b)) {
              return { done: false, value: b.value }
            }
            result = iterator.next()
          }
          return { done: true, value: undefined }
        }
      }
    }
  })
)

/**
 * Transforms all elements of the `Iterable` for as long as the specified function returns some value
 *
 * @category filtering
 * @since 2.0.0
 */
export const filterMapWhile: {
  <A, B>(f: (a: A, i: number) => Option<B>): (self: Iterable<A>) => Iterable<B>
  <A, B>(self: Iterable<A>, f: (a: A, i: number) => Option<B>): Iterable<B>
} = dual(2, <A, B>(self: Iterable<A>, f: (a: A, i: number) => Option<B>) => ({
  [Symbol.iterator]() {
    const iterator = self[Symbol.iterator]()
    let i = 0
    return {
      next() {
        const result = iterator.next()
        if (result.done) {
          return { done: true, value: undefined }
        }
        const b = f(result.value, i++)
        if (O.isSome(b)) {
          return { done: false, value: b.value }
        }
        return { done: true, value: undefined }
      }
    }
  }
}))

/**
 * Retrieves the `Some` values from an `Iterable` of `Option`s.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { Iterable, Option } from "effect"
 *
 * assert.deepStrictEqual(
 *   Array.from(Iterable.getSomes([Option.some(1), Option.none(), Option.some(2)])),
 *   [1, 2]
 * )
 * ```
 *
 * @category filtering
 * @since 2.0.0
 */
export const getSomes: <A>(self: Iterable<Option<A>>) => Iterable<A> = filterMap(identity)

/**
 * Retrieves the `Left` values from an `Iterable` of `Either`s.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { Iterable, Either } from "effect"
 *
 * assert.deepStrictEqual(
 *   Array.from(Iterable.getLefts([Either.right(1), Either.left("err"), Either.right(2)])),
 *   ["err"]
 * )
 * ```
 *
 * @category filtering
 * @since 2.0.0
 */
export const getLefts = <R, L>(self: Iterable<Either<R, L>>): Iterable<L> => filterMap(self, E.getLeft)

/**
 * Retrieves the `Right` values from an `Iterable` of `Either`s.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { Iterable, Either } from "effect"
 *
 * assert.deepStrictEqual(
 *   Array.from(Iterable.getRights([Either.right(1), Either.left("err"), Either.right(2)])),
 *   [1, 2]
 * )
 * ```
 *
 * @category filtering
 * @since 2.0.0
 */
export const getRights = <R, L>(self: Iterable<Either<R, L>>): Iterable<R> => filterMap(self, E.getRight)

/**
 * @category filtering
 * @since 2.0.0
 */
export const filter: {
  <A, B extends A>(refinement: (a: NoInfer<A>, i: number) => a is B): (self: Iterable<A>) => Iterable<B>
  <A>(predicate: (a: NoInfer<A>, i: number) => boolean): (self: Iterable<A>) => Iterable<A>
  <A, B extends A>(self: Iterable<A>, refinement: (a: A, i: number) => a is B): Iterable<B>
  <A>(self: Iterable<A>, predicate: (a: A, i: number) => boolean): Iterable<A>
} = dual(
  2,
  <A>(self: Iterable<A>, predicate: (a: A, i: number) => boolean): Iterable<A> => ({
    [Symbol.iterator]() {
      const iterator = self[Symbol.iterator]()
      let i = 0
      return {
        next() {
          let result = iterator.next()
          while (!result.done) {
            if (predicate(result.value, i++)) {
              return { done: false, value: result.value }
            }
            result = iterator.next()
          }
          return { done: true, value: undefined }
        }
      }
    }
  })
)

/**
 * @category sequencing
 * @since 2.0.0
 */
export const flatMapNullable: {
  <A, B>(f: (a: A) => B | null | undefined): (self: Iterable<A>) => Iterable<NonNullable<B>>
  <A, B>(self: Iterable<A>, f: (a: A) => B | null | undefined): Iterable<NonNullable<B>>
} = dual(
  2,
  <A, B>(self: Iterable<A>, f: (a: A) => B | null | undefined): Iterable<NonNullable<B>> =>
    filterMap(self, (a) => {
      const b = f(a)
      return b == null ? O.none() : O.some(b)
    })
)

/**
 * Check if a predicate holds true for some `Iterable` element.
 *
 * @category elements
 * @since 2.0.0
 */
export const some: {
  <A>(predicate: (a: A, i: number) => boolean): (self: Iterable<A>) => boolean
  <A>(self: Iterable<A>, predicate: (a: A, i: number) => boolean): boolean
} = dual(
  2,
  <A>(self: Iterable<A>, predicate: (a: A, i: number) => boolean): boolean => {
    let i = 0
    for (const a of self) {
      if (predicate(a, i++)) {
        return true
      }
    }
    return false
  }
)

/**
 * @category constructors
 * @since 2.0.0
 */
export const unfold = <B, A>(b: B, f: (b: B) => Option<readonly [A, B]>): Iterable<A> => ({
  [Symbol.iterator]() {
    let next = b
    return {
      next() {
        const o = f(next)
        if (O.isNone(o)) {
          return { done: true, value: undefined }
        }
        const [a, b] = o.value
        next = b
        return { done: false, value: a }
      }
    }
  }
})

/**
 * Iterate over the `Iterable` applying `f`.
 *
 * @since 2.0.0
 */
export const forEach: {
  <A>(f: (a: A, i: number) => void): (self: Iterable<A>) => void
  <A>(self: Iterable<A>, f: (a: A, i: number) => void): void
} = dual(2, <A>(self: Iterable<A>, f: (a: A, i: number) => void): void => {
  let i = 0
  for (const a of self) {
    f(a, i++)
  }
})

/**
 * @category folding
 * @since 2.0.0
 */
export const reduce: {
  <B, A>(b: B, f: (b: B, a: A, i: number) => B): (self: Iterable<A>) => B
  <A, B>(self: Iterable<A>, b: B, f: (b: B, a: A, i: number) => B): B
} = dual(3, <A, B>(self: Iterable<A>, b: B, f: (b: B, a: A, i: number) => B): B => {
  if (Array.isArray(self)) {
    return self.reduce(f, b)
  }
  let i = 0
  let result = b
  for (const n of self) {
    result = f(result, n, i++)
  }
  return result
})

/**
 * Deduplicates adjacent elements that are identical using the provided `isEquivalent` function.
 *
 * @since 2.0.0
 */
export const dedupeAdjacentWith: {
  <S extends Iterable<any>>(
    isEquivalent: (self: Iterable.Infer<S>, that: Iterable.Infer<S>) => boolean
  ): (self: S) => Iterable.With<S, Iterable.Infer<S>>
  <A>(self: NonEmptyIterable<A>, isEquivalent: (self: A, that: A) => boolean): NonEmptyIterable<A>
  <A>(self: Iterable<A>, isEquivalent: (self: A, that: A) => boolean): Iterable<A>
} = dual(2, <A>(self: Iterable<A>, isEquivalent: (self: A, that: A) => boolean): Iterable<A> => ({
  [Symbol.iterator]() {
    const iterator = self[Symbol.iterator]()
    let first = true
    let last: A
    function next(): IteratorResult<A> {
      const result = iterator.next()
      if (result.done) {
        return { done: true, value: undefined }
      }
      if (first) {
        first = false
        last = result.value
        return result
      }
      const current = result.value
      if (isEquivalent(last, current)) {
        return next()
      }
      last = current
      return result
    }
    return { next }
  }
}))

/**
 * Deduplicates adjacent elements that are identical.
 *
 * @since 2.0.0
 */
export const dedupe = <S extends Iterable<any>>(
  self: S
): S extends NonEmptyIterable<infer A> ? NonEmptyIterable<A> : S extends Iterable<infer A> ? Iterable<A> : never =>
  dedupeAdjacentWith(self, Equal.equivalence()) as any

/**
 * Zips this Iterable crosswise with the specified Iterable using the specified combiner.
 *
 * @since 2.0.0
 * @category elements
 */
export const cartesianWith: {
  <S extends Iterable<any>, T extends Iterable<any>, C>(
    that: T, f: (a: Iterable.Infer<S>, b: Iterable.Infer<T>) => C
  ): (self: S) => Iterable.AndNonEmpty<S, T, C>
  <A, B, C>(self: NonEmptyIterable<A>, that: NonEmptyIterable<B>, f: (a: A, b: B) => C): NonEmptyIterable<C>
  <A, B, C>(self: Iterable<A>, that: Iterable<B>, f: (a: A, b: B) => C): Iterable<C>
} = dual(
  3,
  <A, B, C>(self: Iterable<A>, that: Iterable<B>, f: (a: A, b: B) => C): Iterable<C> =>
    flatMap(self, (a) => map(that, (b) => f(a, b)))
)

/**
 * Zips this Iterable crosswise with the specified Iterable.
 *
 * @since 2.0.0
 * @category elements
 */
export const cartesian: {
  <S extends Iterable<any>, T extends Iterable<any>, C>(
    that: T
  ): (self: S) => Iterable.AndNonEmpty<S, T, [Iterable.Infer<S>, Iterable.Infer<T>]>
  <A, B>(self: NonEmptyIterable<A>, that: NonEmptyIterable<B>): NonEmptyIterable<[A, B]>
  <A, B>(self: Iterable<A>, that: Iterable<B>): Iterable<[A, B]>
} = dual(
  2,
  <A, B>(self: Iterable<A>, that: Iterable<B>): Iterable<[A, B]> => cartesianWith(self, that, (a, b) => [a, b])
)

/**
 * Counts all the element of the given iterable that pass the given predicate
 *
 * **Example**
 *
 * ```ts
 * import { Iterable } from "effect"
 *
 * const result = Iterable.countBy([1, 2, 3, 4, 5], n => n % 2 === 0)
 * console.log(result) // 2
 * ```
 *
 * @category folding
 * @since 3.16.0
 */
export const countBy: {
  <A>(predicate: (a: NoInfer<A>, i: number) => boolean): (self: Iterable<A>) => number
  <A>(self: Iterable<A>, predicate: (a: A, i: number) => boolean): number
} = dual(
  2,
  <A>(
    self: Iterable<A>,
    f: (a: A, i: number) => boolean
  ): number => {
    let count = 0
    let i = 0
    for (const a of self) {
      if (f(a, i)) {
        count++
      }
      i++
    }
    return count
  }
)
