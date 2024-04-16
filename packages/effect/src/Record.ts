/**
 * This module provides utility functions for working with records in TypeScript.
 *
 * @since 2.0.0
 */

import type { Either } from "./Either.js"
import * as E from "./Either.js"
import * as Equal from "./Equal.js"
import type { Equivalence } from "./Equivalence.js"
import { dual, identity } from "./Function.js"
import type { TypeLambda } from "./HKT.js"
import * as Option from "./Option.js"

/**
 * @category models
 * @since 2.0.0
 */
export type ReadonlyRecord<in out K extends string | symbol, out A> = {
  readonly [P in K]: A
}

/**
 * @since 2.0.0
 */
export declare namespace ReadonlyRecord {
  type IsFiniteString<T extends string> = T extends "" ? true :
    [T] extends [`${infer Head}${infer Rest}`]
      ? string extends Head ? false : `${number}` extends Head ? false : Rest extends "" ? true : IsFiniteString<Rest>
    : false

  /**
   * @since 2.0.0
   */
  export type NonLiteralKey<K extends string | symbol> = K extends string ? IsFiniteString<K> extends true ? string : K
    : symbol

  /**
   * @since 2.0.0
   */
  export type IntersectKeys<K1 extends string, K2 extends string> = [string] extends [K1 | K2] ?
    NonLiteralKey<K1> & NonLiteralKey<K2>
    : K1 & K2
}

/**
 * @category type lambdas
 * @since 2.0.0
 */
export interface ReadonlyRecordTypeLambda<K extends string = string> extends TypeLambda {
  readonly type: ReadonlyRecord<K, this["Target"]>
}

/**
 * Creates a new, empty record.
 *
 * @category constructors
 * @since 2.0.0
 */
export const empty = <K extends string | symbol = never, V = never>(): Record<
  ReadonlyRecord.NonLiteralKey<K>,
  V
> => ({} as any)

/**
 * Determine if a record is empty.
 *
 * @param self - record to test for emptiness.
 *
 * @example
 * import { isEmptyRecord } from "effect/Record"
 *
 * assert.deepStrictEqual(isEmptyRecord({}), true);
 * assert.deepStrictEqual(isEmptyRecord({ a: 3 }), false);
 *
 * @category guards
 * @since 2.0.0
 */
export const isEmptyRecord = <K extends string, A>(self: Record<K, A>): self is Record<K, never> =>
  keys(self).length === 0

/**
 * Determine if a record is empty.
 *
 * @param self - record to test for emptiness.
 *
 * @example
 * import { isEmptyReadonlyRecord } from "effect/Record"
 *
 * assert.deepStrictEqual(isEmptyReadonlyRecord({}), true);
 * assert.deepStrictEqual(isEmptyReadonlyRecord({ a: 3 }), false);
 *
 * @category guards
 * @since 2.0.0
 */
export const isEmptyReadonlyRecord: <K extends string, A>(
  self: ReadonlyRecord<K, A>
) => self is ReadonlyRecord<K, never> = isEmptyRecord

/**
 * Takes an iterable and a projection function and returns a record.
 * The projection function maps each value of the iterable to a tuple of a key and a value, which is then added to the resulting record.
 *
 * @param self - An iterable of values to be mapped to a record.
 * @param f - A projection function that maps values of the iterable to a tuple of a key and a value.
 *
 * @example
 * import { fromIterableWith } from "effect/Record"
 *
 * const input = [1, 2, 3, 4]
 *
 * assert.deepStrictEqual(
 *   fromIterableWith(input, a => [String(a), a * 2]),
 *   { '1': 2, '2': 4, '3': 6, '4': 8 }
 * )
 *
 * @category constructors
 * @since 2.0.0
 */
export const fromIterableWith: {
  <A, K extends string | symbol, B>(
    f: (a: A) => readonly [K, B]
  ): (self: Iterable<A>) => Record<ReadonlyRecord.NonLiteralKey<K>, B>
  <A, K extends string | symbol, B>(
    self: Iterable<A>,
    f: (a: A) => readonly [K, B]
  ): Record<ReadonlyRecord.NonLiteralKey<K>, B>
} = dual(
  2,
  <A, K extends string, B>(
    self: Iterable<A>,
    f: (a: A) => readonly [K, B]
  ): Record<ReadonlyRecord.NonLiteralKey<K>, B> => {
    const out: Record<string, B> = empty()
    for (const a of self) {
      const [k, b] = f(a)
      out[k] = b
    }
    return out
  }
)

/**
 * Creates a new record from an iterable, utilizing the provided function to determine the key for each element.
 *
 * @param items - An iterable containing elements.
 * @param f - A function that extracts the key for each element.
 *
 * @example
 * import { fromIterableBy } from "effect/Record"
 *
 * const users = [
 *   { id: "2", name: "name2" },
 *   { id: "1", name: "name1" }
 * ]
 *
 * assert.deepStrictEqual(
 *   fromIterableBy(users, user => user.id),
 *   {
 *     "2": { id: "2", name: "name2" },
 *     "1": { id: "1", name: "name1" }
 *   }
 * )
 *
 * @category constructors
 * @since 2.0.0
 */
export const fromIterableBy = <A, K extends string | symbol>(
  items: Iterable<A>,
  f: (a: A) => K
): Record<ReadonlyRecord.NonLiteralKey<K>, A> => fromIterableWith(items, (a) => [f(a), a])

/**
 * Builds a record from an iterable of key-value pairs.
 *
 * If there are conflicting keys when using `fromEntries`, the last occurrence of the key/value pair will overwrite the
 * previous ones. So the resulting record will only have the value of the last occurrence of each key.
 *
 * @param self - The iterable of key-value pairs.
 *
 * @example
 * import { fromEntries } from "effect/Record"
 *
 * const input: Array<[string, number]> = [["a", 1], ["b", 2]]
 *
 * assert.deepStrictEqual(fromEntries(input), { a: 1, b: 2 })
 *
 * @since 2.0.0
 * @category constructors
 */
export const fromEntries: <Entry extends readonly [string | symbol, any]>(
  entries: Iterable<Entry>
) => Record<ReadonlyRecord.NonLiteralKey<Entry[0]>, Entry[1]> = Object.fromEntries

/**
 * Transforms the values of a record into an `Array` with a custom mapping function.
 *
 * @param self - The record to transform.
 * @param f - The custom mapping function to apply to each key/value of the record.
 *
 * @example
 * import { collect } from "effect/Record"
 *
 * const x = { a: 1, b: 2, c: 3 }
 * assert.deepStrictEqual(collect(x, (key, n) => [key, n]), [["a", 1], ["b", 2], ["c", 3]])
 *
 * @category conversions
 * @since 2.0.0
 */
export const collect: {
  <K extends string, A, B>(f: (key: K, a: A) => B): (self: ReadonlyRecord<K, A>) => Array<B>
  <K extends string, A, B>(self: ReadonlyRecord<K, A>, f: (key: K, a: A) => B): Array<B>
} = dual(
  2,
  <K extends string, A, B>(self: ReadonlyRecord<K, A>, f: (key: K, a: A) => B): Array<B> => {
    const out: Array<B> = []
    for (const key of keys(self)) {
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
 * import { toEntries } from "effect/Record"
 *
 * const x = { a: 1, b: 2, c: 3 }
 * assert.deepStrictEqual(toEntries(x), [["a", 1], ["b", 2], ["c", 3]])
 *
 * @category conversions
 * @since 2.0.0
 */
export const toEntries: <K extends string, A>(self: ReadonlyRecord<K, A>) => Array<[K, A]> = collect((
  key,
  value
) => [key, value])

/**
 * Returns the number of key/value pairs in a record.
 *
 * @param self - A record to calculate the number of key/value pairs in.
 *
 * @example
 * import { size } from "effect/Record";
 *
 * assert.deepStrictEqual(size({ a: "a", b: 1, c: true }), 3);
 *
 * @since 2.0.0
 */
export const size = <K extends string, A>(self: ReadonlyRecord<K, A>): number => keys(self).length

/**
 * Check if a given `key` exists in a record.
 *
 * @param self - the record to look in.
 * @param key - the key to look for in the record.
 *
 * @example
 * import { empty, has } from "effect/Record"
 *
 * assert.deepStrictEqual(has({ a: 1, b: 2 }, "a"), true);
 * assert.deepStrictEqual(has(empty<string>(), "c"), false);
 *
 * @since 2.0.0
 */
export const has: {
  <K extends string | symbol>(
    key: NoInfer<K>
  ): <A>(self: ReadonlyRecord<K, A>) => boolean
  <K extends string | symbol, A>(
    self: ReadonlyRecord<K, A>,
    key: NoInfer<K>
  ): boolean
} = dual(
  2,
  <K extends string | symbol, A>(
    self: ReadonlyRecord<K, A>,
    key: NoInfer<K>
  ): boolean => Object.prototype.hasOwnProperty.call(self, key)
)

/**
 * Retrieve a value at a particular key from a record, returning it wrapped in an `Option`.
 *
 * @param self - The record to retrieve value from.
 * @param key - Key to retrieve from record.
 *
 * @example
 * import { get } from "effect/Record"
 * import { some, none } from "effect/Option"
 *
 * const person: Record<string, unknown> = { name: "John Doe", age: 35 }
 *
 * assert.deepStrictEqual(get(person, "name"), some("John Doe"))
 * assert.deepStrictEqual(get(person, "email"), none())
 *
 * @since 2.0.0
 */
export const get: {
  <K extends string | symbol>(key: NoInfer<K>): <A>(self: ReadonlyRecord<K, A>) => Option.Option<A>
  <K extends string | symbol, A>(self: ReadonlyRecord<K, A>, key: NoInfer<K>): Option.Option<A>
} = dual(
  2,
  <K extends string | symbol, A>(self: ReadonlyRecord<K, A>, key: NoInfer<K>): Option.Option<A> =>
    has(self, key) ? Option.some(self[key]) : Option.none()
)

/**
 * Apply a function to the element at the specified key, creating a new record.
 * If the key does not exist, the record is returned unchanged.
 *
 * @param self - The record to be updated.
 * @param key - The key of the element to modify.
 * @param f - The function to apply to the element.
 *
 * @example
 * import { modify } from "effect/Record"
 * import { some, none } from "effect/Option"
 *
 * const f = (x: number) => x * 2
 *
 * assert.deepStrictEqual(
 *  modify({ a: 3 }, 'a', f),
 *  { a: 6 }
 * )
 * assert.deepStrictEqual(
 *  modify({ a: 3 } as Record<string, number>, 'b', f),
 *  { a: 3 }
 * )
 *
 * @since 2.0.0
 */
export const modify: {
  <K extends string | symbol, A, B>(
    key: NoInfer<K>,
    f: (a: A) => B
  ): (self: ReadonlyRecord<K, A>) => Record<K, A | B>
  <K extends string | symbol, A, B>(self: ReadonlyRecord<K, A>, key: NoInfer<K>, f: (a: A) => B): Record<K, A | B>
} = dual(
  3,
  <K extends string | symbol, A, B>(self: ReadonlyRecord<K, A>, key: NoInfer<K>, f: (a: A) => B): Record<K, A | B> => {
    if (!has(self, key)) {
      return { ...self }
    }
    return { ...self, [key]: f(self[key]) }
  }
)

/**
 * Apply a function to the element at the specified key, creating a new record,
 * or return `None` if the key doesn't exist.
 *
 * @param self - The record to be updated.
 * @param key - The key of the element to modify.
 * @param f - The function to apply to the element.
 *
 * @example
 * import { modifyOption } from "effect/Record"
 * import { some, none } from "effect/Option"
 *
 * const f = (x: number) => x * 2
 *
 * assert.deepStrictEqual(
 *  modifyOption({ a: 3 }, 'a', f),
 *  some({ a: 6 })
 * )
 * assert.deepStrictEqual(
 *  modifyOption({ a: 3 } as Record<string, number>, 'b', f),
 *  none()
 * )
 *
 * @since 2.0.0
 */
export const modifyOption: {
  <K extends string | symbol, A, B>(
    key: NoInfer<K>,
    f: (a: A) => B
  ): (self: ReadonlyRecord<K, A>) => Option.Option<Record<K, A | B>>
  <K extends string | symbol, A, B>(
    self: ReadonlyRecord<K, A>,
    key: NoInfer<K>,
    f: (a: A) => B
  ): Option.Option<Record<K, A | B>>
} = dual(
  3,
  <K extends string | symbol, A, B>(
    self: ReadonlyRecord<K, A>,
    key: NoInfer<K>,
    f: (a: A) => B
  ): Option.Option<Record<K, A | B>> => {
    if (!has(self, key)) {
      return Option.none()
    }
    return Option.some({ ...self, [key]: f(self[key]) })
  }
)

/**
 * Replaces a value in the record with the new value passed as parameter.
 *
 * @param self - The record to be updated.
 * @param key - The key to search for in the record.
 * @param b - The new value to replace the existing value with.
 *
 * @example
 * import { empty, replaceOption } from "effect/Record"
 * import { some, none } from "effect/Option"
 *
 * assert.deepStrictEqual(
 *   replaceOption({ a: 1, b: 2, c: 3 }, 'a', 10),
 *   some({ a: 10, b: 2, c: 3 })
 * )
 * assert.deepStrictEqual(replaceOption(empty<string>(), 'a', 10), none())
 *
 * @since 2.0.0
 */
export const replaceOption: {
  <K extends string | symbol, B>(
    key: NoInfer<K>,
    b: B
  ): <A>(self: ReadonlyRecord<K, A>) => Option.Option<Record<K, A | B>>
  <K extends string | symbol, A, B>(
    self: ReadonlyRecord<K, A>,
    key: NoInfer<K>,
    b: B
  ): Option.Option<Record<K, A | B>>
} = dual(
  3,
  <K extends string | symbol, A, B>(
    self: ReadonlyRecord<K, A>,
    key: NoInfer<K>,
    b: B
  ): Option.Option<Record<K, A | B>> => modifyOption(self, key, () => b)
)

/**
 * If the given key exists in the record, returns a new record with the key removed,
 * otherwise returns a copy of the original record.
 *
 * @param self - the record to remove the key from.
 * @param key - the key to remove from the record.
 *
 * @example
 * import { remove } from "effect/Record"
 *
 * assert.deepStrictEqual(remove({ a: 1, b: 2 }, "a"), { b: 2 })
 *
 * @since 2.0.0
 */
export const remove: {
  <K extends string | symbol, X extends K>(key: X): <A>(self: ReadonlyRecord<K, A>) => Record<Exclude<K, X>, A>
  <K extends string | symbol, A, X extends K>(self: ReadonlyRecord<K, A>, key: X): Record<Exclude<K, X>, A>
} = dual(
  2,
  <K extends string | symbol, A, X extends K>(self: ReadonlyRecord<K, A>, key: X): Record<Exclude<K, X>, A> => {
    if (!has(self, key)) {
      return { ...self }
    }
    const out = { ...self }
    delete out[key]
    return out
  }
)

/**
 * Retrieves the value of the property with the given `key` from a record and returns an `Option`
 * of a tuple with the value and the record with the removed property.
 * If the key is not present, returns `O.none`.
 *
 * @param self - The input record.
 * @param key - The key of the property to retrieve.
 *
 * @example
 * import { pop } from "effect/Record"
 * import { some, none } from 'effect/Option'
 *
 * assert.deepStrictEqual(pop({ a: 1, b: 2 }, "a"), some([1, { b: 2 }]))
 * assert.deepStrictEqual(pop({ a: 1, b: 2 } as Record<string, number>, "c"), none())
 *
 * @category record
 * @since 2.0.0
 */
export const pop: {
  <K extends string | symbol, X extends K>(
    key: X
  ): <A>(self: ReadonlyRecord<K, A>) => Option.Option<[A, Record<Exclude<K, X>, A>]>
  <K extends string | symbol, A, X extends K>(
    self: ReadonlyRecord<K, A>,
    key: X
  ): Option.Option<[A, Record<Exclude<K, X>, A>]>
} = dual(2, <K extends string | symbol, A, X extends K>(
  self: ReadonlyRecord<K, A>,
  key: X
): Option.Option<[A, Record<Exclude<K, X>, A>]> =>
  has(self, key) ? Option.some([self[key], remove(self, key)]) : Option.none())

/**
 * Maps a record into another record by applying a transformation function to each of its values.
 *
 * @param self - The record to be mapped.
 * @param f - A transformation function that will be applied to each of the values in the record.
 *
 * @example
 * import { map } from "effect/Record"
 *
 * const f = (n: number) => `-${n}`
 *
 * assert.deepStrictEqual(map({ a: 3, b: 5 }, f), { a: "-3", b: "-5" })
 *
 * const g = (n: number, key: string) => `${key.toUpperCase()}-${n}`
 *
 * assert.deepStrictEqual(map({ a: 3, b: 5 }, g), { a: "A-3", b: "B-5" })
 *
 * @category mapping
 * @since 2.0.0
 */
export const map: {
  <K extends string, A, B>(f: (a: A, key: NoInfer<K>) => B): (self: ReadonlyRecord<K, A>) => Record<K, B>
  <K extends string, A, B>(self: ReadonlyRecord<K, A>, f: (a: A, key: NoInfer<K>) => B): Record<K, B>
} = dual(
  2,
  <K extends string, A, B>(self: ReadonlyRecord<K, A>, f: (a: A, key: NoInfer<K>) => B): Record<K, B> => {
    const out: Record<K, B> = { ...self } as any
    for (const key of keys(self)) {
      out[key] = f(self[key], key)
    }
    return out
  }
)

/**
 * Maps the keys of a `ReadonlyRecord` while preserving the corresponding values.
 *
 * @example
 * import { mapKeys } from "effect/Record"
 *
 * assert.deepStrictEqual(mapKeys({ a: 3, b: 5 }, (key) => key.toUpperCase()), { A: 3, B: 5 })
 *
 * @category mapping
 * @since 2.0.0
 */
export const mapKeys: {
  <K extends string, A, K2 extends string>(
    f: (key: K, a: A) => K2
  ): (self: ReadonlyRecord<K, A>) => Record<K2, A>
  <K extends string, A, K2 extends string>(
    self: ReadonlyRecord<K, A>,
    f: (key: K, a: A) => K2
  ): Record<K2, A>
} = dual(
  2,
  <K extends string, A, K2 extends string>(
    self: ReadonlyRecord<K, A>,
    f: (key: K, a: A) => K2
  ): Record<K2, A> => {
    const out: Record<K2, A> = {} as any
    for (const key of keys(self)) {
      const a = self[key]
      out[f(key, a)] = a
    }
    return out
  }
)

/**
 * Maps entries of a `ReadonlyRecord` using the provided function, allowing modification of both keys and corresponding values.
 *
 * @example
 * import { mapEntries } from "effect/Record"
 *
 * assert.deepStrictEqual(mapEntries({ a: 3, b: 5 }, (a, key) => [key.toUpperCase(), a + 1]), { A: 4, B: 6 })
 *
 * @category mapping
 * @since 2.0.0
 */
export const mapEntries: {
  <K extends string, A, K2 extends string, B>(
    f: (a: A, key: K) => readonly [K2, B]
  ): (self: ReadonlyRecord<K, A>) => Record<K2, B>
  <K extends string, A, K2 extends string, B>(
    self: ReadonlyRecord<K, A>,
    f: (a: A, key: K) => [K2, B]
  ): Record<K2, B>
} = dual(
  2,
  <K extends string, A, K2 extends string, B>(
    self: ReadonlyRecord<K, A>,
    f: (a: A, key: K) => [K2, B]
  ): Record<K2, B> => {
    const out = <Record<K2, B>> {}
    for (const key of keys(self)) {
      const [k, b] = f(self[key], key)
      out[k] = b
    }
    return out
  }
)

/**
 * Transforms a record into a record by applying the function `f` to each key and value in the original record.
 * If the function returns `Some`, the key-value pair is included in the output record.
 *
 * @param self - The input record.
 * @param f - The transformation function.
 *
 * @example
 * import { filterMap } from "effect/Record"
 * import { some, none } from 'effect/Option'
 *
 * const x = { a: 1, b: 2, c: 3 }
 * const f = (a: number, key: string) => a > 2 ? some(a * 2) : none()
 * assert.deepStrictEqual(filterMap(x, f), { c: 6 })
 *
 * @since 2.0.0
 */
export const filterMap: {
  <K extends string, A, B>(
    f: (a: A, key: K) => Option.Option<B>
  ): (self: ReadonlyRecord<K, A>) => Record<ReadonlyRecord.NonLiteralKey<K>, B>
  <K extends string, A, B>(
    self: ReadonlyRecord<K, A>,
    f: (a: A, key: K) => Option.Option<B>
  ): Record<ReadonlyRecord.NonLiteralKey<K>, B>
} = dual(
  2,
  <K extends string, A, B>(
    self: ReadonlyRecord<K, A>,
    f: (a: A, key: K) => Option.Option<B>
  ): Record<ReadonlyRecord.NonLiteralKey<K>, B> => {
    const out: Record<string, B> = empty()
    for (const key of keys(self)) {
      const o = f(self[key], key)
      if (Option.isSome(o)) {
        out[key] = o.value
      }
    }
    return out
  }
)

/**
 * Selects properties from a record whose values match the given predicate.
 *
 * @param self - The record to filter.
 * @param predicate - A function that returns a `boolean` value to determine if the entry should be included in the new record.
 *
 * @example
 * import { filter } from "effect/Record"
 *
 * const x = { a: 1, b: 2, c: 3, d: 4 }
 * assert.deepStrictEqual(filter(x, (n) => n > 2), { c: 3, d: 4 })
 *
 * @category filtering
 * @since 2.0.0
 */
export const filter: {
  <K extends string, A, B extends A>(
    refinement: (a: NoInfer<A>, key: K) => a is B
  ): (self: ReadonlyRecord<K, A>) => Record<ReadonlyRecord.NonLiteralKey<K>, B>
  <K extends string, A>(
    predicate: (A: NoInfer<A>, key: K) => boolean
  ): (self: ReadonlyRecord<K, A>) => Record<ReadonlyRecord.NonLiteralKey<K>, A>
  <K extends string, A, B extends A>(
    self: ReadonlyRecord<K, A>,
    refinement: (a: A, key: K) => a is B
  ): Record<ReadonlyRecord.NonLiteralKey<K>, B>
  <K extends string, A>(
    self: ReadonlyRecord<K, A>,
    predicate: (a: A, key: K) => boolean
  ): Record<ReadonlyRecord.NonLiteralKey<K>, A>
} = dual(
  2,
  <K extends string, A>(
    self: ReadonlyRecord<K, A>,
    predicate: (a: A, key: K) => boolean
  ): Record<ReadonlyRecord.NonLiteralKey<K>, A> => {
    const out: Record<string, A> = empty()
    for (const key of keys(self)) {
      if (predicate(self[key], key)) {
        out[key] = self[key]
      }
    }
    return out
  }
)

/**
 * Given a record with `Option` values, returns a new record containing only the `Some` values, preserving the original keys.
 *
 * @param self - A record with `Option` values.
 *
 * @example
 * import { getSomes } from "effect/Record"
 * import { some, none } from "effect/Option"
 *
 * assert.deepStrictEqual(
 *   getSomes({ a: some(1), b: none(), c: some(2) }),
 *   { a: 1, c: 2 }
 * )
 *
 * @category filtering
 * @since 2.0.0
 */
export const getSomes: <K extends string, A>(
  self: ReadonlyRecord<K, Option.Option<A>>
) => Record<ReadonlyRecord.NonLiteralKey<K>, A> = filterMap(
  identity
)

/**
 * Given a record with `Either` values, returns a new record containing only the `Left` values, preserving the original keys.
 *
 * @example
 * import { getLefts } from "effect/Record"
 * import { right, left } from "effect/Either"
 *
 * assert.deepStrictEqual(
 *   getLefts({ a: right(1), b: left("err"), c: right(2) }),
 *   { b: "err" }
 * )
 *
 * @category filtering
 * @since 2.0.0
 */
export const getLefts = <K extends string, R, L>(
  self: ReadonlyRecord<K, Either<R, L>>
): Record<ReadonlyRecord.NonLiteralKey<K>, L> => {
  const out: Record<string, L> = empty()
  for (const key of keys(self)) {
    const value = self[key]
    if (E.isLeft(value)) {
      out[key] = value.left
    }
  }

  return out
}

/**
 * Given a record with `Either` values, returns a new record containing only the `Right` values, preserving the original keys.
 *
 * @example
 * import { getRights } from "effect/Record"
 * import { right, left } from "effect/Either"
 *
 * assert.deepStrictEqual(
 *   getRights({ a: right(1), b: left("err"), c: right(2) }),
 *   { a: 1, c: 2 }
 * )
 *
 * @category filtering
 * @since 2.0.0
 */
export const getRights = <K extends string, R, L>(
  self: ReadonlyRecord<K, Either<R, L>>
): Record<string, R> => {
  const out: Record<string, R> = empty()
  for (const key of keys(self)) {
    const value = self[key]
    if (E.isRight(value)) {
      out[key] = value.right
    }
  }

  return out
}

/**
 * Partitions the elements of a record into two groups: those that match a predicate, and those that don't.
 *
 * @param self - The record to partition.
 * @param f - The predicate function to apply to each element.
 *
 * @example
 * import { partitionMap } from "effect/Record"
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
    f: (a: A, key: K) => Either<C, B>
  ): (
    self: ReadonlyRecord<K, A>
  ) => [left: Record<ReadonlyRecord.NonLiteralKey<K>, B>, right: Record<ReadonlyRecord.NonLiteralKey<K>, C>]
  <K extends string, A, B, C>(
    self: ReadonlyRecord<K, A>,
    f: (a: A, key: K) => Either<C, B>
  ): [left: Record<ReadonlyRecord.NonLiteralKey<K>, B>, right: Record<ReadonlyRecord.NonLiteralKey<K>, C>]
} = dual(
  2,
  <K extends string, A, B, C>(
    self: ReadonlyRecord<K, A>,
    f: (a: A, key: K) => Either<C, B>
  ): [left: Record<ReadonlyRecord.NonLiteralKey<K>, B>, right: Record<ReadonlyRecord.NonLiteralKey<K>, C>] => {
    const left: Record<string, B> = empty()
    const right: Record<string, C> = empty()
    for (const key of keys(self)) {
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
 * Partitions a record of `Either` values into two separate records,
 * one with the `Left` values and one with the `Right` values.
 *
 * @param self - the record to partition.
 *
 * @example
 * import { separate } from "effect/Record"
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
export const separate: <K extends string, A, B>(
  self: ReadonlyRecord<K, Either<B, A>>
) => [Record<ReadonlyRecord.NonLiteralKey<K>, A>, Record<ReadonlyRecord.NonLiteralKey<K>, B>] = partitionMap(identity)

/**
 * Partitions a record into two separate records based on the result of a predicate function.
 *
 * @param self - The input record to partition.
 * @param predicate - The partitioning function to determine the partitioning of each value of the record.
 *
 * @example
 * import { partition } from "effect/Record"
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
  <K extends string, A, B extends A>(refinement: (a: NoInfer<A>, key: K) => a is B): (
    self: ReadonlyRecord<K, A>
  ) => [
    excluded: Record<ReadonlyRecord.NonLiteralKey<K>, Exclude<A, B>>,
    satisfying: Record<ReadonlyRecord.NonLiteralKey<K>, B>
  ]
  <K extends string, A>(
    predicate: (a: NoInfer<A>, key: K) => boolean
  ): (
    self: ReadonlyRecord<K, A>
  ) => [excluded: Record<ReadonlyRecord.NonLiteralKey<K>, A>, satisfying: Record<ReadonlyRecord.NonLiteralKey<K>, A>]
  <K extends string, A, B extends A>(
    self: ReadonlyRecord<K, A>,
    refinement: (a: A, key: K) => a is B
  ): [
    excluded: Record<ReadonlyRecord.NonLiteralKey<K>, Exclude<A, B>>,
    satisfying: Record<ReadonlyRecord.NonLiteralKey<K>, B>
  ]
  <K extends string, A>(
    self: ReadonlyRecord<K, A>,
    predicate: (a: A, key: K) => boolean
  ): [excluded: Record<ReadonlyRecord.NonLiteralKey<K>, A>, satisfying: Record<ReadonlyRecord.NonLiteralKey<K>, A>]
} = dual(
  2,
  <K extends string, A>(
    self: ReadonlyRecord<K, A>,
    predicate: (a: A, key: K) => boolean
  ): [excluded: Record<ReadonlyRecord.NonLiteralKey<K>, A>, satisfying: Record<ReadonlyRecord.NonLiteralKey<K>, A>] => {
    const left: Record<string, A> = empty()
    const right: Record<string, A> = empty()
    for (const key of keys(self)) {
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
 * Retrieve the keys of a given record as an array.
 *
 * @param self - The object for which you want to get the keys.
 *
 * @since 2.0.0
 */
export const keys = <K extends string, A>(self: ReadonlyRecord<K, A>): Array<K> => Object.keys(self) as Array<K>

/**
 * Retrieve the values of a given record as an array.
 *
 * @param self - The object for which you want to get the values.
 *
 * @since 2.0.0
 */
export const values = <K extends string, A>(self: ReadonlyRecord<K, A>): Array<A> => collect(self, (_, a) => a)

/**
 * Add a new key-value pair or update an existing key's value in a record.
 *
 * @param self - The record to which you want to add or update a key-value pair.
 * @param key - The key you want to add or update.
 * @param values - The value you want to associate with the key.
 *
 * @example
 * import { set } from "effect/Record"
 *
 * assert.deepStrictEqual(set("a", 5)({ a: 1, b: 2 }), { a: 5, b: 2 });
 * assert.deepStrictEqual(set("c", 5)({ a: 1, b: 2 }), { a: 1, b: 2, c: 5 });
 *
 * @since 2.0.0
 */
export const set: {
  <K extends string | symbol, K1 extends K | ((string | symbol) & {}), B>(
    key: K1,
    value: B
  ): <A>(self: ReadonlyRecord<K, A>) => Record<K | K1, A | B>
  <K extends string | symbol, A, K1 extends K | ((string | symbol) & {}), B>(
    self: ReadonlyRecord<K, A>,
    key: K1,
    value: B
  ): Record<K | K1, A | B>
} = dual(
  3,
  <K extends string | symbol, A, K1 extends K | ((string | symbol) & {}), B>(
    self: ReadonlyRecord<K, A>,
    key: K1,
    value: B
  ): Record<K | K1, A | B> => {
    return { ...self, [key]: value } as any
  }
)

/**
 * Replace a key's value in a record and return the updated record.
 * If the key does not exist in the record, a copy of the original record is returned.
 *
 * @param self - The original record.
 * @param key - The key to replace.
 * @param value - The new value to associate with the key.
 *
 * @example
 * import { replace } from "effect/Record"
 * import { some, none } from "effect/Option"
 *
 * assert.deepStrictEqual(replace("a", 3)({ a: 1, b: 2 }), { a: 3, b: 2 });
 * assert.deepStrictEqual(replace("c", 3)({ a: 1, b: 2 }), { a: 1, b: 2 });
 *
 * @since 2.0.0
 */
export const replace: {
  <K extends string | symbol, B>(key: NoInfer<K>, value: B): <A>(self: ReadonlyRecord<K, A>) => Record<K, A | B>
  <K extends string | symbol, A, B>(self: ReadonlyRecord<K, A>, key: NoInfer<K>, value: B): Record<K, A | B>
} = dual(
  3,
  <K extends string | symbol, A, B>(self: ReadonlyRecord<K, A>, key: NoInfer<K>, value: B): Record<K, A | B> => {
    if (has(self, key)) {
      return { ...self, [key]: value }
    }
    return { ...self }
  }
)

/**
 * Check if all the keys and values in one record are also found in another record.
 *
 * @param self - The first record to check.
 * @param that - The second record to compare against.
 * @param equivalence - A function to compare values.
 *
 * @since 2.0.0
 */
export const isSubrecordBy = <A>(equivalence: Equivalence<A>): {
  <K extends string>(that: ReadonlyRecord<K, A>): (self: ReadonlyRecord<K, A>) => boolean
  <K extends string>(self: ReadonlyRecord<K, A>, that: ReadonlyRecord<K, A>): boolean
} =>
  dual(2, <K extends string>(self: ReadonlyRecord<K, A>, that: ReadonlyRecord<K, A>): boolean => {
    for (const key of keys(self)) {
      if (!has(that, key) || !equivalence(self[key], that[key])) {
        return false
      }
    }
    return true
  })

/**
 * Check if one record is a subrecord of another, meaning it contains all the keys and values found in the second record.
 * This comparison uses default equality checks (`Equal.equivalence()`).
 *
 * @param self - The first record to check.
 * @param that - The second record to compare against.
 *
 * @since 2.0.0
 */
export const isSubrecord: {
  <K extends string, A>(that: ReadonlyRecord<K, A>): (self: ReadonlyRecord<K, A>) => boolean
  <K extends string, A>(self: ReadonlyRecord<K, A>, that: ReadonlyRecord<K, A>): boolean
} = isSubrecordBy(Equal.equivalence())

/**
 * Reduce a record to a single value by combining its entries with a specified function.
 *
 * @param self - The record to reduce.
 * @param zero - The initial value of the accumulator.
 * @param f - The function to combine entries (accumulator, value, key).
 *
 * @category folding
 * @since 2.0.0
 */
export const reduce: {
  <Z, V, K extends string>(
    zero: Z,
    f: (accumulator: Z, value: V, key: K) => Z
  ): (self: ReadonlyRecord<K, V>) => Z
  <K extends string, V, Z>(self: ReadonlyRecord<K, V>, zero: Z, f: (accumulator: Z, value: V, key: K) => Z): Z
} = dual(
  3,
  <K extends string, V, Z>(
    self: ReadonlyRecord<K, V>,
    zero: Z,
    f: (accumulator: Z, value: V, key: K) => Z
  ): Z => {
    let out: Z = zero
    for (const key of keys(self)) {
      out = f(out, self[key], key)
    }
    return out
  }
)

/**
 * Check if all entries in a record meet a specific condition.
 *
 * @param self - The record to check.
 * @param predicate - The condition to test entries (value, key).
 *
 * @since 2.0.0
 */
export const every: {
  <A, K extends string, B extends A>(
    refinement: (value: A, key: K) => value is B
  ): (self: ReadonlyRecord<K, A>) => self is ReadonlyRecord<K, B>
  <A, K extends string>(predicate: (value: A, key: K) => boolean): (self: ReadonlyRecord<K, A>) => boolean
  <A, K extends string, B extends A>(
    self: ReadonlyRecord<K, A>,
    refinement: (value: A, key: K) => value is B
  ): self is ReadonlyRecord<K, B>
  <K extends string, A>(self: ReadonlyRecord<K, A>, predicate: (value: A, key: K) => boolean): boolean
} = dual(
  2,
  <A, K extends string, B extends A>(
    self: ReadonlyRecord<K, A>,
    refinement: (value: A, key: K) => value is B
  ): self is ReadonlyRecord<K, B> => {
    for (const key of keys(self)) {
      if (!refinement(self[key], key)) {
        return false
      }
    }
    return true
  }
)

/**
 * Check if any entry in a record meets a specific condition.
 *
 * @param self - The record to check.
 * @param predicate - The condition to test entries (value, key).
 *
 * @since 2.0.0
 */
export const some: {
  <A, K extends string>(predicate: (value: A, key: K) => boolean): (self: ReadonlyRecord<K, A>) => boolean
  <K extends string, A>(self: ReadonlyRecord<K, A>, predicate: (value: A, key: K) => boolean): boolean
} = dual(
  2,
  <K extends string, A>(self: ReadonlyRecord<K, A>, predicate: (value: A, key: K) => boolean): boolean => {
    for (const key of keys(self)) {
      if (predicate(self[key], key)) {
        return true
      }
    }
    return false
  }
)

/**
 * Merge two records, preserving entries that exist in either of the records.
 *
 * @param self - The first record.
 * @param that - The second record to combine with the first.
 * @param combine - A function to specify how to merge entries with the same key.
 *
 * @since 2.0.0
 */
export const union: {
  <K1 extends string, A, B, C>(
    that: ReadonlyRecord<K1, B>,
    combine: (selfValue: A, thatValue: B) => C
  ): <K0 extends string>(self: ReadonlyRecord<K0, A>) => Record<K0 | K1, A | B | C>
  <K0 extends string, A, K1 extends string, B, C>(
    self: ReadonlyRecord<K0, A>,
    that: ReadonlyRecord<K1, B>,
    combine: (selfValue: A, thatValue: B) => C
  ): Record<K0 | K1, A | B | C>
} = dual(
  3,
  <K0 extends string, A, K1 extends string, B, C>(
    self: ReadonlyRecord<K0, A>,
    that: ReadonlyRecord<K1, B>,
    combine: (selfValue: A, thatValue: B) => C
  ): Record<K0 | K1, A | B | C> => {
    if (isEmptyRecord(self)) {
      return { ...that } as any
    }
    if (isEmptyRecord(that)) {
      return { ...self } as any
    }
    const out: Record<string, A | B | C> = empty()
    for (const key of keys(self)) {
      if (has(that, key as any)) {
        out[key] = combine(self[key], that[key as unknown as K1])
      } else {
        out[key] = self[key]
      }
    }
    for (const key of keys(that)) {
      if (!has(out, key)) {
        out[key] = that[key]
      }
    }
    return out
  }
)

/**
 * Merge two records, retaining only the entries that exist in both records.
 *
 * @param self - The first record.
 * @param that - The second record to merge with the first.
 * @param combine - A function to specify how to merge entries with the same key.
 *
 * @since 2.0.0
 */
export const intersection: {
  <K1 extends string, A, B, C>(
    that: ReadonlyRecord<K1, B>,
    combine: (selfValue: A, thatValue: B) => C
  ): <K0 extends string>(self: ReadonlyRecord<K0, A>) => Record<ReadonlyRecord.IntersectKeys<K0, K1>, C>
  <K0 extends string, A, K1 extends string, B, C>(
    self: ReadonlyRecord<K0, A>,
    that: ReadonlyRecord<K1, B>,
    combine: (selfValue: A, thatValue: B) => C
  ): Record<ReadonlyRecord.IntersectKeys<K0, K1>, C>
} = dual(
  3,
  <K0 extends string, A, K1 extends string, B, C>(
    self: ReadonlyRecord<K0, A>,
    that: ReadonlyRecord<K1, B>,
    combine: (selfValue: A, thatValue: B) => C
  ): Record<ReadonlyRecord.IntersectKeys<K0, K1>, C> => {
    const out: Record<string, C> = empty()
    if (isEmptyRecord(self) || isEmptyRecord(that)) {
      return out
    }
    for (const key of keys(self)) {
      if (has(that, key as any)) {
        out[key] = combine(self[key], that[key as unknown as K1])
      }
    }
    return out
  }
)

/**
 * Merge two records, preserving only the entries that are unique to each record.
 *
 * @param self - The first record.
 * @param that - The second record to compare with the first.
 *
 * @since 2.0.0
 */
export const difference: {
  <K1 extends string, B>(
    that: ReadonlyRecord<K1, B>
  ): <K0 extends string, A>(self: ReadonlyRecord<K0, A>) => Record<K0 | K1, A | B>
  <K0 extends string, A, K1 extends string, B>(
    self: ReadonlyRecord<K0, A>,
    that: ReadonlyRecord<K1, B>
  ): Record<K0 | K1, A | B>
} = dual(2, <K0 extends string, A, K1 extends string, B>(
  self: ReadonlyRecord<K0, A>,
  that: ReadonlyRecord<K1, B>
): Record<K0 | K1, A | B> => {
  if (isEmptyRecord(self)) {
    return { ...that } as any
  }
  if (isEmptyRecord(that)) {
    return { ...self } as any
  }
  const out = <Record<K0 | K1, A | B>> {}
  for (const key of keys(self)) {
    if (!has(that, key as any)) {
      out[key] = self[key]
    }
  }
  for (const key of keys(that)) {
    if (!has(self, key as any)) {
      out[key] = that[key]
    }
  }
  return out
})

/**
 * Create an `Equivalence` for records using the provided `Equivalence` for values.
 *
 * @param equivalence - An `Equivalence` for the values contained in the records.
 *
 * @category instances
 * @since 2.0.0
 */
export const getEquivalence = <K extends string, A>(
  equivalence: Equivalence<A>
): Equivalence<ReadonlyRecord<K, A>> => {
  const is = isSubrecordBy(equivalence)
  return (self, that) => is(self, that) && is(that, self)
}

/**
 * Create a non-empty record from a single element.
 *
 * @param key - The key for the element.
 * @param value - The value associated with the key.
 *
 * @category constructors
 * @since 2.0.0
 */
export const singleton = <K extends string | symbol, A>(key: K, value: A): Record<K, A> => ({
  [key]: value
} as any)
