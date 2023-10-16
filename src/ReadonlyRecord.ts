/**
 * This module provides utility functions for working with records in TypeScript.
 *
 * @since 2.0.0
 */

import type { Either } from "./Either"
import * as E from "./Either"
import * as Equal from "./Equal"
import type { Equivalence } from "./Equivalence"
import { dual, identity } from "./Function"
import type { TypeLambda } from "./HKT"
import * as Option from "./Option"

// -------------------------------------------------------------------------------------
// models
// -------------------------------------------------------------------------------------

/**
 * @category models
 * @since 2.0.0
 */
export interface ReadonlyRecord<A> {
  readonly [x: string]: A
}

/**
 * @category type lambdas
 * @since 2.0.0
 */
export interface ReadonlyRecordTypeLambda extends TypeLambda {
  readonly type: ReadonlyRecord<this["Target"]>
}

// -------------------------------------------------------------------------------------
// constructors
// -------------------------------------------------------------------------------------

/**
 * Creates a new, empty record.
 *
 * @category constructors
 * @since 2.0.0
 */
export const empty = <A>(): Record<string, A> => ({})

// -------------------------------------------------------------------------------------
// guards
// -------------------------------------------------------------------------------------

/**
 * Determine if a `Record` is empty.
 *
 * @param self - `Record` to test for emptiness.
 *
 * @example
 * import { isEmptyRecord } from "effect/ReadonlyRecord"
 *
 * assert.deepStrictEqual(isEmptyRecord({}), true);
 * assert.deepStrictEqual(isEmptyRecord({ a: 3 }), false);
 *
 * @category guards
 * @since 2.0.0
 */
export const isEmptyRecord = <A>(self: Record<string, A>): self is Record<string, never> => {
  for (const k in self) {
    if (has(self, k)) {
      return false
    }
  }
  return true
}

/**
 * Determine if a `ReadonlyRecord` is empty.
 *
 * @param self - `ReadonlyRecord` to test for emptiness.
 *
 * @example
 * import { isEmptyReadonlyRecord } from "effect/ReadonlyRecord"
 *
 * assert.deepStrictEqual(isEmptyReadonlyRecord({}), true);
 * assert.deepStrictEqual(isEmptyReadonlyRecord({ a: 3 }), false);
 *
 * @category guards
 * @since 2.0.0
 */
export const isEmptyReadonlyRecord: <A>(self: ReadonlyRecord<A>) => self is ReadonlyRecord<never> = isEmptyRecord

// -------------------------------------------------------------------------------------
// conversions
// -------------------------------------------------------------------------------------

/**
 * Takes an iterable and a projection function and returns a record.
 * The projection function maps each value of the iterable to a tuple of a key and a value, which is then added to the resulting record.
 *
 * @param self - An iterable of values to be mapped to a record.
 * @param f - A projection function that maps values of the iterable to a tuple of a key and a value.
 *
 * @example
 * import { fromIterable } from "effect/ReadonlyRecord"
 *
 * const input = [1, 2, 3, 4]
 *
 * assert.deepStrictEqual(
 *   fromIterable(input, a => [String(a), a * 2]),
 *   { '1': 2, '2': 4, '3': 6, '4': 8 }
 * )
 *
 * @category conversions
 * @since 2.0.0
 */
export const fromIterable: {
  <A, B>(f: (a: A) => readonly [string, B]): (self: Iterable<A>) => Record<string, B>
  <A, B>(self: Iterable<A>, f: (a: A) => readonly [string, B]): Record<string, B>
} = dual(2, <A, B>(self: Iterable<A>, f: (a: A) => readonly [string, B]): Record<string, B> => {
  const out: Record<string, B> = {}
  for (const a of self) {
    const [k, b] = f(a)
    out[k] = b
  }
  return out
})

/**
 * Builds a record from an iterable of key-value pairs.
 *
 * If there are conflicting keys when using `fromEntries`, the last occurrence of the key/value pair will overwrite the
 * previous ones. So the resulting record will only have the value of the last occurrence of each key.
 *
 * @param self - The iterable of key-value pairs.
 *
 * @example
 * import { fromEntries } from "effect/ReadonlyRecord"
 *
 * const input: Array<[string, number]> = [["a", 1], ["b", 2]]
 *
 * assert.deepStrictEqual(fromEntries(input), { a: 1, b: 2 })
 *
 * @category conversions
 * @since 2.0.0
 */
export const fromEntries: <A>(self: Iterable<readonly [string, A]>) => Record<string, A> = fromIterable(identity)

/**
 * Transforms the values of a `ReadonlyRecord` into an `Array` with a custom mapping function.
 *
 * @param self - The `ReadonlyRecord` to transform.
 * @param f - The custom mapping function to apply to each key/value of the `ReadonlyRecord`.
 *
 * @example
 * import { collect } from "effect/ReadonlyRecord"
 *
 * const x = { a: 1, b: 2, c: 3 }
 * assert.deepStrictEqual(collect(x, (key, n) => [key, n]), [["a", 1], ["b", 2], ["c", 3]])
 *
 * @category conversions
 * @since 2.0.0
 */
export const collect: {
  <K extends string, A, B>(f: (key: K, a: A) => B): (self: Record<K, A>) => Array<B>
  <K extends string, A, B>(self: Record<K, A>, f: (key: K, a: A) => B): Array<B>
} = dual(
  2,
  <A, B>(self: ReadonlyRecord<A>, f: (key: string, a: A) => B): Array<B> => {
    const out: Array<B> = []
    for (const key of Object.keys(self)) {
      out.push(f(key, self[key]))
    }
    return out
  }
)

/**
 * Takes a record and returns an array of tuples containing its keys and values.
 *
 * @param self - The record to transform.
 *
 * @example
 * import { toEntries } from "effect/ReadonlyRecord"
 *
 * const x = { a: 1, b: 2, c: 3 }
 * assert.deepStrictEqual(toEntries(x), [["a", 1], ["b", 2], ["c", 3]])
 *
 * @category conversions
 * @since 2.0.0
 */
export const toEntries: <K extends string, A>(self: Record<K, A>) => Array<[K, A]> = collect((
  key,
  value
) => [key, value])

/**
 * Takes a record and returns an array of tuples containing its keys and values.
 *
 * Alias of {@link toEntries}.
 *
 * @param self - The record to transform.
 *
 * @example
 * import { toArray } from "effect/ReadonlyRecord"
 *
 * const x = { a: 1, b: 2, c: 3 }
 * assert.deepStrictEqual(toArray(x), [["a", 1], ["b", 2], ["c", 3]])
 *
 * @category conversions
 * @since 2.0.0
 */
export const toArray: <K extends string, A>(self: Record<K, A>) => Array<[K, A]> = toEntries

// -------------------------------------------------------------------------------------
// utils
// -------------------------------------------------------------------------------------

/**
 * Returns the number of key/value pairs in a `ReadonlyRecord`.
 *
 * @param self - A `ReadonlyRecord` to calculate the number of key/value pairs in.
 *
 * @example
 * import { size } from "effect/ReadonlyRecord";
 *
 * assert.deepStrictEqual(size({ a: "a", b: 1, c: true }), 3);
 *
 * @since 2.0.0
 */
export const size = <A>(self: ReadonlyRecord<A>): number => Object.keys(self).length

/**
 * Check if a given `key` exists in a `ReadonlyRecord`.
 *
 * @param self - the `ReadonlyRecord` to look in.
 * @param key - the key to look for in the `ReadonlyRecord`.
 *
 * @example
 * import { has } from "effect/ReadonlyRecord"
 *
 * assert.deepStrictEqual(has({ a: 1, b: 2 }, "a"), true);
 * assert.deepStrictEqual(has({ a: 1, b: 2 }, "c"), false);
 *
 * @since 2.0.0
 */
export const has: {
  (key: string): <A>(self: ReadonlyRecord<A>) => boolean
  <A>(self: ReadonlyRecord<A>, key: string): boolean
} = dual(
  2,
  <A>(self: ReadonlyRecord<A>, key: string): boolean => Object.prototype.hasOwnProperty.call(self, key)
)

/**
 * Retrieve a value at a particular key from a `ReadonlyRecord`, returning it wrapped in an `Option`.
 *
 * @param self - The `ReadonlyRecord` to retrieve value from.
 * @param key - Key to retrieve from `ReadonlyRecord`.
 *
 * @example
 * import { get } from "effect/ReadonlyRecord"
 * import { some, none } from "effect/Option"
 *
 * const person = { name: "John Doe", age: 35 }
 *
 * assert.deepStrictEqual(get(person, "name"), some("John Doe"))
 * assert.deepStrictEqual(get(person, "email"), none())
 *
 * @since 2.0.0
 */
export const get: {
  (key: string): <A>(self: ReadonlyRecord<A>) => Option.Option<A>
  <A>(self: ReadonlyRecord<A>, key: string): Option.Option<A>
} = dual(
  2,
  <A>(self: ReadonlyRecord<A>, key: string): Option.Option<A> => has(self, key) ? Option.some(self[key]) : Option.none()
)

/**
 * Apply a function to the element at the specified key, creating a new record,
 * or return `None` if the key doesn't exist.
 *
 * @param self - The `ReadonlyRecord` to be updated.
 * @param key - The key of the element to modify.
 * @param f - The function to apply to the element.
 *
 * @example
 * import { modifyOption } from "effect/ReadonlyRecord"
 * import { some, none } from "effect/Option"
 *
 * const f = (x: number) => x * 2
 *
 * assert.deepStrictEqual(
 *  modifyOption({ a: 3 }, 'a', f),
 *  some({ a: 6 })
 * )
 * assert.deepStrictEqual(
 *  modifyOption({ a: 3 }, 'b', f),
 *  none()
 * )
 *
 * @since 2.0.0
 */
export const modifyOption: {
  <A, B>(key: string, f: (a: A) => B): (self: ReadonlyRecord<A>) => Option.Option<Record<string, A | B>>
  <A, B>(self: ReadonlyRecord<A>, key: string, f: (a: A) => B): Option.Option<Record<string, A | B>>
} = dual(
  3,
  <A, B>(self: ReadonlyRecord<A>, key: string, f: (a: A) => B): Option.Option<Record<string, A | B>> => {
    if (!has(self, key)) {
      return Option.none()
    }
    const out: Record<string, A | B> = { ...self }
    out[key] = f(self[key])
    return Option.some(out)
  }
)

/**
 * Replaces a value in the record with the new value passed as parameter.
 *
 * @param self - The `ReadonlyRecord` to be updated.
 * @param key - The key to search for in the record.
 * @param b - The new value to replace the existing value with.
 *
 * @example
 * import { replaceOption } from "effect/ReadonlyRecord"
 * import { some, none } from "effect/Option"
 *
 * assert.deepStrictEqual(
 *   replaceOption({ a: 1, b: 2, c: 3 }, 'a', 10),
 *   some({ a: 10, b: 2, c: 3 })
 * )
 * assert.deepStrictEqual(replaceOption({}, 'a', 10), none())
 *
 * @since 2.0.0
 */
export const replaceOption: {
  <B>(key: string, b: B): <A>(self: ReadonlyRecord<A>) => Option.Option<Record<string, B | A>>
  <A, B>(self: ReadonlyRecord<A>, key: string, b: B): Option.Option<Record<string, A | B>>
} = dual(
  3,
  <A, B>(self: ReadonlyRecord<A>, key: string, b: B): Option.Option<Record<string, A | B>> =>
    modifyOption(self, key, () => b)
)

/**
 * Removes a key from a `ReadonlyRecord` and returns a new `Record`
 *
 * @param self - the `ReadonlyRecord` to remove the key from.
 * @param key - the key to remove from the `ReadonlyRecord`.
 *
 * @example
 * import { remove } from "effect/ReadonlyRecord"
 *
 * assert.deepStrictEqual(remove({ a: 1, b: 2 }, "a"), { b: 2 })
 *
 * @since 2.0.0
 */
export const remove: {
  (key: string): <A>(self: ReadonlyRecord<A>) => Record<string, A>
  <A>(self: ReadonlyRecord<A>, key: string): Record<string, A>
} = dual(2, <A>(self: ReadonlyRecord<A>, key: string): Record<string, A> => {
  const out = { ...self }
  delete out[key]
  return out
})

/**
 * Retrieves the value of the property with the given `key` from a `ReadonlyRecord` and returns an `Option`
 * of a tuple with the value and the `ReadonlyRecord` with the removed property.
 * If the key is not present, returns `O.none`.
 *
 * @param self - The input `ReadonlyRecord`.
 * @param key - The key of the property to retrieve.
 *
 * @example
 * import { pop } from "effect/ReadonlyRecord"
 * import { some, none } from 'effect/Option'
 *
 * assert.deepStrictEqual(pop({ a: 1, b: 2 }, "a"), some([1, { b: 2 }]))
 * assert.deepStrictEqual(pop({ a: 1, b: 2 }, "c"), none())
 *
 * @category record
 * @since 2.0.0
 */
export const pop: {
  (key: string): <A>(self: ReadonlyRecord<A>) => Option.Option<readonly [A, ReadonlyRecord<A>]>
  <A>(self: ReadonlyRecord<A>, key: string): Option.Option<readonly [A, ReadonlyRecord<A>]>
} = dual(2, <A>(
  self: ReadonlyRecord<A>,
  key: string
): Option.Option<readonly [A, ReadonlyRecord<A>]> =>
  has(self, key) ? Option.some([self[key], remove(self, key)]) : Option.none())

/**
 * Maps a `ReadonlyRecord` into another `Record` by applying a transformation function to each of its values.
 *
 * @param self - The `ReadonlyRecord` to be mapped.
 * @param f - A transformation function that will be applied to each of the values in the `ReadonlyRecord`.
 *
 * @example
 * import { map } from "effect/ReadonlyRecord"
 *
 * const f = (n: number) => `-${n}`
 *
 * assert.deepStrictEqual(map({ a: 3, b: 5 }, f), { a: "-3", b: "-5" })
 *
 * const g = (n: number, key: string) => `${key.toUpperCase()}-${n}`
 *
 * assert.deepStrictEqual(map({ a: 3, b: 5 }, g), { a: "A-3", b: "B-5" })
 *
 * @since 2.0.0
 */
export const map: {
  <K extends string, A, B>(f: (a: A, key: K) => B): (self: Record<K, A>) => Record<K, B>
  <K extends string, A, B>(self: Record<K, A>, f: (a: A, key: K) => B): Record<K, B>
} = dual(
  2,
  <A, B>(self: ReadonlyRecord<A>, f: (a: A, key: string) => B): Record<string, B> => {
    const out: Record<string, B> = {}
    for (const key of Object.keys(self)) {
      out[key] = f(self[key], key)
    }
    return out
  }
)

/**
 * Transforms a `ReadonlyRecord` into a `Record` by applying the function `f` to each key and value in the original `ReadonlyRecord`.
 * If the function returns `Some`, the key-value pair is included in the output `Record`.
 *
 * @param self - The input `ReadonlyRecord`.
 * @param f - The transformation function.
 *
 * @example
 * import { filterMap } from "effect/ReadonlyRecord"
 * import { some, none } from 'effect/Option'
 *
 * const x = { a: 1, b: 2, c: 3 }
 * const f = (a: number, key: string) => a > 2 ? some(a * 2) : none()
 * assert.deepStrictEqual(filterMap(x, f), { c: 6 })
 *
 * @since 2.0.0
 */
export const filterMap: {
  <K extends string, A, B>(f: (a: A, key: K) => Option.Option<B>): (self: Record<K, A>) => Record<string, B>
  <K extends string, A, B>(self: Record<K, A>, f: (a: A, key: K) => Option.Option<B>): Record<string, B>
} = dual(2, <A, B>(
  self: Record<string, A>,
  f: (a: A, key: string) => Option.Option<B>
): Record<string, B> => {
  const out: Record<string, B> = {}
  for (const key of Object.keys(self)) {
    const o = f(self[key], key)
    if (Option.isSome(o)) {
      out[key] = o.value
    }
  }
  return out
})

/**
 * Selects properties from a record whose values match the given predicate.
 *
 * @param self - The `ReadonlyRecord` to filter.
 * @param predicate - A function that returns a `boolean` value to determine if the entry should be included in the new record.
 *
 * @example
 * import { filter } from "effect/ReadonlyRecord"
 *
 * const x = { a: 1, b: 2, c: 3, d: 4 }
 * assert.deepStrictEqual(filter(x, (n) => n > 2), { c: 3, d: 4 })
 *
 * @category filtering
 * @since 2.0.0
 */
export const filter: {
  <K extends string, C extends A, B extends A, A = C>(
    refinement: (a: A, key: K) => a is B
  ): (self: Record<K, C>) => Record<string, B>
  <K extends string, B extends A, A = B>(
    predicate: (a: A, key: K) => boolean
  ): (self: Record<K, B>) => Record<string, B>
  <K extends string, C extends A, B extends A, A = C>(
    self: Record<K, C>,
    refinement: (a: A, key: K) => a is B
  ): Record<string, B>
  <K extends string, B extends A, A = B>(
    self: Record<K, B>,
    predicate: (a: A, key: K) => boolean
  ): Record<string, B>
} = dual(
  2,
  <B extends A, A = B>(
    self: Record<string, B>,
    predicate: (a: A, key: string) => boolean
  ): Record<string, B> => {
    const out: Record<string, B> = {}
    for (const key of Object.keys(self)) {
      if (predicate(self[key], key)) {
        out[key] = self[key]
      }
    }
    return out
  }
)

/**
 * Given a `ReadonlyRecord` with `Option` values, returns a `Record` with only the `Some` values, with the same keys.
 *
 * @param self - A `ReadonlyRecord` with `Option` values.
 *
 * @example
 * import { compact } from "effect/ReadonlyRecord"
 * import { some, none } from 'effect/Option'
 *
 * assert.deepStrictEqual(
 *   compact({ a: some(1), b: none(), c: some(2) }),
 *   { a: 1, c: 2 }
 * )
 *
 * @category filtering
 * @since 2.0.0
 */
export const compact: <A>(self: ReadonlyRecord<Option.Option<A>>) => Record<string, A> = filterMap(
  identity
)

/**
 * Partitions the elements of a `ReadonlyRecord` into two groups: those that match a predicate, and those that don't.
 *
 * @param self - The `ReadonlyRecord` to partition.
 * @param f - The predicate function to apply to each element.
 *
 * @example
 * import { partitionMap } from "effect/ReadonlyRecord"
 * import { left, right } from 'effect/Either'
 *
 * const x = { a: 1, b: 2, c: 3 }
 * const f = (n: number) => (n % 2 === 0 ? right(n) : left(n))
 * assert.deepStrictEqual(partitionMap(x, f), [{ a: 1, c: 3 }, { b: 2}])
 *
 * @category filtering
 * @since 2.0.0
 */
export const partitionMap: {
  <K extends string, A, B, C>(
    f: (a: A, key: K) => Either<B, C>
  ): (self: Record<K, A>) => [Record<string, B>, Record<string, C>]
  <K extends string, A, B, C>(
    self: Record<K, A>,
    f: (a: A, key: K) => Either<B, C>
  ): [Record<string, B>, Record<string, C>]
} = dual(
  2,
  <A, B, C>(
    self: Record<string, A>,
    f: (a: A, key: string) => Either<B, C>
  ): [Record<string, B>, Record<string, C>] => {
    const left: Record<string, B> = {}
    const right: Record<string, C> = {}
    for (const key of Object.keys(self)) {
      const e = f(self[key], key)
      if (E.isLeft(e)) {
        left[key] = e.left
      } else {
        right[key] = e.right
      }
    }
    return [left, right]
  }
)

/**
 * Partitions a `ReadonlyRecord` of `Either` values into two separate records,
 * one with the `Left` values and one with the `Right` values.
 *
 * @param self - the `ReadonlyRecord` to partition.
 *
 * @example
 * import { separate } from "effect/ReadonlyRecord"
 * import { left, right } from 'effect/Either'
 *
 * assert.deepStrictEqual(
 *   separate({ a: left("e"), b: right(1) }),
 *   [{ a: "e" }, { b: 1 }]
 * )
 *
 * @category filtering
 * @since 2.0.0
 */
export const separate: <A, B>(
  self: ReadonlyRecord<Either<A, B>>
) => [Record<string, A>, Record<string, B>] = partitionMap(identity)

/**
 * Partitions a `ReadonlyRecord` into two separate `Record`s based on the result of a predicate function.
 *
 * @param self - The input `ReadonlyRecord` to partition.
 * @param predicate - The partitioning function to determine the partitioning of each value of the `ReadonlyRecord`.
 *
 * @example
 * import { partition } from "effect/ReadonlyRecord"
 *
 * assert.deepStrictEqual(
 *   partition({ a: 1, b: 3 }, (n) => n > 2),
 *   [{ a: 1 }, { b: 3 }]
 * )
 *
 * @category filtering
 * @since 2.0.0
 */
export const partition: {
  <K extends string, C extends A, B extends A, A = C>(refinement: (a: A, key: K) => a is B): (
    self: Record<K, C>
  ) => [Record<string, C>, Record<string, B>]
  <K extends string, B extends A, A = B>(
    predicate: (a: A, key: K) => boolean
  ): (self: Record<K, B>) => [Record<string, B>, Record<string, B>]
  <K extends string, C extends A, B extends A, A = C>(
    self: Record<K, C>,
    refinement: (a: A, key: K) => a is B
  ): [Record<string, C>, Record<string, B>]
  <K extends string, B extends A, A = B>(
    self: Record<K, B>,
    predicate: (a: A, key: K) => boolean
  ): [Record<string, B>, Record<string, B>]
} = dual(
  2,
  <B extends A, A = B>(
    self: Record<string, B>,
    predicate: (a: A, key: string) => boolean
  ): [Record<string, B>, Record<string, B>] => {
    const left: Record<string, B> = {}
    const right: Record<string, B> = {}
    for (const key of Object.keys(self)) {
      if (predicate(self[key], key)) {
        right[key] = self[key]
      } else {
        left[key] = self[key]
      }
    }
    return [left, right]
  }
)

/**
 * @since 2.0.0
 */
export const keys = <A>(self: ReadonlyRecord<A>): Array<string> => Object.keys(self)

/**
 * Insert or replace a key/value pair in a `ReadonlyRecord`.
 *
 * @example
 * import { upsert } from "effect/ReadonlyRecord"
 *
 * assert.deepStrictEqual(upsert("a", 5)({ a: 1, b: 2 }), { a: 5, b: 2 });
 * assert.deepStrictEqual(upsert("c", 5)({ a: 1, b: 2 }), { a: 1, b: 2, c: 5 });
 *
 * @since 2.0.0
 */
export const upsert: {
  <A>(self: ReadonlyRecord<A>, key: string, a: A): Record<string, A>
  <A>(key: string, a: A): (self: ReadonlyRecord<A>) => Record<string, A>
} = dual(3, <A>(self: ReadonlyRecord<A>, key: string, a: A): Record<string, A> => {
  if (has(self, key) && self[key] === a) {
    return self
  }
  const out = { ...self }
  out[key] = a
  return out
})

/**
 * Replace a key/value pair in a `ReadonlyRecord`.
 *
 * @returns If the specified key exists it returns an `Option` containing a new `Record`
 * with the entry updated, otherwise it returns `None`
 *
 * @example
 * import { update } from "effect/ReadonlyRecord"
 * import { some, none } from "effect/Option"
 *
 * assert.deepStrictEqual(update("a", 3)({ a: 1, b: 2 }), { a: 3, b: 2 });
 * assert.deepStrictEqual(update("c", 3)({ a: 1, b: 2 }), { a: 1, b: 2 });
 *
 * @since 2.0.0
 */
export const update: {
  <A>(self: ReadonlyRecord<A>, key: string, a: A): Record<string, A>
  <A>(key: string, a: A): (self: ReadonlyRecord<A>) => Record<string, A>
} = dual(3, <A>(self: ReadonlyRecord<A>, key: string, a: A): Record<string, A> => {
  const out = { ...self }
  if (has(self, key)) {
    out[key] = a
  }
  return out
})

/**
 * Test whether one `ReadonlyRecord` contains all of the keys and values
 * contained in another `ReadonlyRecord`.
 *
 * @since 2.0.0
 */
export const isSubrecordBy = <A>(equivalence: Equivalence<A>): {
  (that: ReadonlyRecord<A>): (self: ReadonlyRecord<A>) => boolean
  (self: ReadonlyRecord<A>, that: ReadonlyRecord<A>): boolean
} =>
  dual(2, (self: ReadonlyRecord<A>, that: ReadonlyRecord<A>): boolean => {
    for (const key in self) {
      if (!has(that, key) || !equivalence(self[key], that[key])) {
        return false
      }
    }
    return true
  })

/**
 * Test whether one `ReadonlyRecord` contains all of the keys and values
 * contained in another `ReadonlyRecord` using `Equal.equivalence` as `Equivalence`.
 *
 * @since 2.0.0
 */
export const isSubrecord: {
  <A>(that: ReadonlyRecord<A>): (self: ReadonlyRecord<A>) => boolean
  <A>(self: ReadonlyRecord<A>, that: ReadonlyRecord<A>): boolean
} = isSubrecordBy(Equal.equivalence())

/**
 * Reduces the specified state over the entries of the `Record`.
 *
 * @category folding
 * @since 2.0.0
 */
export const reduce: {
  <Z, V, K extends string>(zero: Z, f: (accumulator: Z, value: V, key: K) => Z): (self: Record<K, V>) => Z
  <K extends string, V, Z>(self: Record<K, V>, zero: Z, f: (accumulator: Z, value: V, key: K) => Z): Z
} = dual(3, <V, Z>(self: Record<string, V>, zero: Z, f: (accumulator: Z, value: V, key: string) => Z): Z => {
  let out: Z = zero
  for (const key in self) {
    out = f(out, self[key], key)
  }
  return out
})

/**
 * Test if every entry in a `Record` satisfies the predicate.
 *
 * @since 2.0.0
 */
export const every: {
  <A, K extends string>(predicate: (value: A, key: K) => boolean): (self: Record<K, A>) => boolean
  <K extends string, A>(self: Record<K, A>, predicate: (value: A, key: K) => boolean): boolean
} = dual(2, <K extends string, A>(self: Record<K, A>, predicate: (value: A, key: K) => boolean): boolean => {
  for (const key in self) {
    if (!predicate(self[key], key)) {
      return false
    }
  }
  return true
})

/**
 * Test if at least one entry in a `Record` satisfies the predicate.
 *
 * @since 2.0.0
 */
export const some: {
  <A, K extends string>(predicate: (value: A, key: K) => boolean): (self: Record<K, A>) => boolean
  <K extends string, A>(self: Record<K, A>, predicate: (value: A, key: K) => boolean): boolean
} = dual(2, <K extends string, A>(self: Record<K, A>, predicate: (value: A, key: K) => boolean): boolean => {
  for (const key in self) {
    if (predicate(self[key], key)) {
      return true
    }
  }
  return false
})
