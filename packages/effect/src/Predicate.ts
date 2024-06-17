/**
 * @since 2.0.0
 */
import { dual, isFunction as isFunction_ } from "./Function.js"
import type { TypeLambda } from "./HKT.js"
import type { TupleOf, TupleOfAtLeast } from "./Types.js"

/**
 * @category models
 * @since 2.0.0
 */
export interface Predicate<in A> {
  (a: A): boolean
}

/**
 * @category type lambdas
 * @since 2.0.0
 */
export interface PredicateTypeLambda extends TypeLambda {
  readonly type: Predicate<this["Target"]>
}

/**
 * @category models
 * @since 2.0.0
 */
export interface Refinement<in A, out B extends A> {
  (a: A): a is B
}

/**
 * Given a `Predicate<A>` returns a `Predicate<B>`
 *
 * @param self - the `Predicate<A>` to be transformed to `Predicate<B>`.
 * @param f - a function to transform `B` to `A`.
 *
 * @example
 * import { Predicate, Number } from "effect"
 *
 * const minLength3 = Predicate.mapInput(Number.greaterThan(2), (s: string) => s.length)
 *
 * assert.deepStrictEqual(minLength3("a"), false)
 * assert.deepStrictEqual(minLength3("aa"), false)
 * assert.deepStrictEqual(minLength3("aaa"), true)
 * assert.deepStrictEqual(minLength3("aaaa"), true)
 *
 * @category combinators
 * @since 2.0.0
 */
export const mapInput: {
  <B, A>(f: (b: B) => A): (self: Predicate<A>) => Predicate<B>
  <A, B>(self: Predicate<A>, f: (b: B) => A): Predicate<B>
} = dual(2, <A, B>(self: Predicate<A>, f: (b: B) => A): Predicate<B> => (b) => self(f(b)))

/**
 * Determine if an `Array` is a tuple with exactly `N` elements, narrowing down the type to `TupleOf`.
 *
 * An `Array` is considered to be a `TupleOf` if its length is exactly `N`.
 *
 * @param self - The `Array` to check.
 * @param n - The exact number of elements that the `Array` should have to be considered a `TupleOf`.
 *
 * @example
 * import { isTupleOf } from "effect/Predicate"
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
export const isTupleOf: {
  <N extends number>(n: N): <T>(self: ReadonlyArray<T>) => self is TupleOf<N, T>
  <T, N extends number>(self: ReadonlyArray<T>, n: N): self is TupleOf<N, T>
} = dual(2, <T, N extends number>(self: ReadonlyArray<T>, n: N): self is TupleOf<N, T> => self.length === n)

/**
 * Determine if an `Array` is a tuple with at least `N` elements, narrowing down the type to `TupleOfAtLeast`.
 *
 * An `Array` is considered to be a `TupleOfAtLeast` if its length is at least `N`.
 *
 * @param self - The `Array` to check.
 * @param n - The minimum number of elements that the `Array` should have to be considered a `TupleOfAtLeast`.
 *
 * @example
 * import { isTupleOfAtLeast } from "effect/Predicate"
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
export const isTupleOfAtLeast: {
  <N extends number>(n: N): <T>(self: ReadonlyArray<T>) => self is TupleOfAtLeast<N, T>
  <T, N extends number>(self: ReadonlyArray<T>, n: N): self is TupleOfAtLeast<N, T>
} = dual(2, <T, N extends number>(self: ReadonlyArray<T>, n: N): self is TupleOfAtLeast<N, T> => self.length >= n)

/**
 * Tests if a value is `truthy`.
 *
 * @param input - The value to test.
 *
 * @example
 * import { isTruthy } from "effect/Predicate"
 *
 * assert.deepStrictEqual(isTruthy(1), true)
 * assert.deepStrictEqual(isTruthy(0), false)
 * assert.deepStrictEqual(isTruthy(""), false)
 *
 * @category guards
 * @since 2.0.0
 */
export const isTruthy = (input: unknown) => !!input

/**
 * Tests if a value is a `Set`.
 *
 * @param input - The value to test.
 *
 * @example
 * import { isSet } from "effect/Predicate"
 *
 * assert.deepStrictEqual(isSet(new Set([1, 2])), true)
 * assert.deepStrictEqual(isSet(new Set()), true)
 * assert.deepStrictEqual(isSet({}), false)
 * assert.deepStrictEqual(isSet(null), false)
 * assert.deepStrictEqual(isSet(undefined), false)
 *
 * @category guards
 * @since 2.0.0
 */
export const isSet = (input: unknown): input is Set<unknown> => input instanceof Set

/**
 * Tests if a value is a `Map`.
 *
 * @param input - The value to test.
 *
 * @example
 * import { isMap } from "effect/Predicate"
 *
 * assert.deepStrictEqual(isMap(new Map()), true)
 * assert.deepStrictEqual(isMap({}), false)
 * assert.deepStrictEqual(isMap(null), false)
 * assert.deepStrictEqual(isMap(undefined), false)
 *
 * @category guards
 * @since 2.0.0
 */
export const isMap = (input: unknown): input is Map<unknown, unknown> => input instanceof Map

/**
 * Tests if a value is a `string`.
 *
 * @param input - The value to test.
 *
 * @example
 * import { isString } from "effect/Predicate"
 *
 * assert.deepStrictEqual(isString("a"), true)
 *
 * assert.deepStrictEqual(isString(1), false)
 *
 * @category guards
 * @since 2.0.0
 */
export const isString = (input: unknown): input is string => typeof input === "string"

/**
 * Tests if a value is a `number`.
 *
 * @param input - The value to test.
 *
 * @example
 * import { isNumber } from "effect/Predicate"
 *
 * assert.deepStrictEqual(isNumber(2), true)
 *
 * assert.deepStrictEqual(isNumber("2"), false)
 *
 * @category guards
 * @since 2.0.0
 */
export const isNumber = (input: unknown): input is number => typeof input === "number"

/**
 * Tests if a value is a `boolean`.
 *
 * @param input - The value to test.
 *
 * @example
 * import { isBoolean } from "effect/Predicate"
 *
 * assert.deepStrictEqual(isBoolean(true), true)
 *
 * assert.deepStrictEqual(isBoolean("true"), false)
 *
 * @category guards
 * @since 2.0.0
 */
export const isBoolean = (input: unknown): input is boolean => typeof input === "boolean"

/**
 * Tests if a value is a `bigint`.
 *
 * @param input - The value to test.
 *
 * @example
 * import { isBigInt } from "effect/Predicate"
 *
 * assert.deepStrictEqual(isBigInt(1n), true)
 *
 * assert.deepStrictEqual(isBigInt(1), false)
 *
 * @category guards
 * @since 2.0.0
 */
export const isBigInt = (input: unknown): input is bigint => typeof input === "bigint"

/**
 * Tests if a value is a `symbol`.
 *
 * @param input - The value to test.
 *
 * @example
 * import { isSymbol } from "effect/Predicate"
 *
 * assert.deepStrictEqual(isSymbol(Symbol.for("a")), true)
 *
 * assert.deepStrictEqual(isSymbol("a"), false)
 *
 * @category guards
 * @since 2.0.0
 */
export const isSymbol = (input: unknown): input is symbol => typeof input === "symbol"

/**
 * Tests if a value is a `function`.
 *
 * @param input - The value to test.
 *
 * @example
 * import { isFunction } from "effect/Predicate"
 *
 * assert.deepStrictEqual(isFunction(isFunction), true)
 *
 * assert.deepStrictEqual(isFunction("function"), false)
 *
 * @category guards
 * @since 2.0.0
 */
export const isFunction: (input: unknown) => input is Function = isFunction_

/**
 * Tests if a value is `undefined`.
 *
 * @param input - The value to test.
 *
 * @example
 * import { isUndefined } from "effect/Predicate"
 *
 * assert.deepStrictEqual(isUndefined(undefined), true)
 *
 * assert.deepStrictEqual(isUndefined(null), false)
 * assert.deepStrictEqual(isUndefined("undefined"), false)
 *
 * @category guards
 * @since 2.0.0
 */
export const isUndefined = (input: unknown): input is undefined => input === undefined

/**
 * Tests if a value is not `undefined`.
 *
 * @param input - The value to test.
 *
 * @example
 * import { isNotUndefined } from "effect/Predicate"
 *
 * assert.deepStrictEqual(isNotUndefined(null), true)
 * assert.deepStrictEqual(isNotUndefined("undefined"), true)
 *
 * assert.deepStrictEqual(isNotUndefined(undefined), false)
 *
 * @category guards
 * @since 2.0.0
 */
export const isNotUndefined = <A>(input: A): input is Exclude<A, undefined> => input !== undefined

/**
 * Tests if a value is `null`.
 *
 * @param input - The value to test.
 *
 * @example
 * import { isNull } from "effect/Predicate"
 *
 * assert.deepStrictEqual(isNull(null), true)
 *
 * assert.deepStrictEqual(isNull(undefined), false)
 * assert.deepStrictEqual(isNull("null"), false)
 *
 * @category guards
 * @since 2.0.0
 */
export const isNull = (input: unknown): input is null => input === null

/**
 * Tests if a value is not `null`.
 *
 * @param input - The value to test.
 *
 * @example
 * import { isNotNull } from "effect/Predicate"
 *
 * assert.deepStrictEqual(isNotNull(undefined), true)
 * assert.deepStrictEqual(isNotNull("null"), true)
 *
 * assert.deepStrictEqual(isNotNull(null), false)
 *
 * @category guards
 * @since 2.0.0
 */
export const isNotNull = <A>(input: A): input is Exclude<A, null> => input !== null

/**
 * A guard that always fails.
 *
 * @param _ - The value to test.
 *
 * @example
 * import { isNever } from "effect/Predicate"
 *
 * assert.deepStrictEqual(isNever(null), false)
 * assert.deepStrictEqual(isNever(undefined), false)
 * assert.deepStrictEqual(isNever({}), false)
 * assert.deepStrictEqual(isNever([]), false)
 *
 * @category guards
 * @since 2.0.0
 */
export const isNever: (input: unknown) => input is never = (_: unknown): _ is never => false

/**
 * A guard that always succeeds.
 *
 * @param _ - The value to test.
 *
 * @example
 * import { isUnknown } from "effect/Predicate"
 *
 * assert.deepStrictEqual(isUnknown(null), true)
 * assert.deepStrictEqual(isUnknown(undefined), true)
 *
 * assert.deepStrictEqual(isUnknown({}), true)
 * assert.deepStrictEqual(isUnknown([]), true)
 *
 * @category guards
 * @since 2.0.0
 */
export const isUnknown: (input: unknown) => input is unknown = (_): _ is unknown => true

const isRecordOrArray = (input: unknown) => typeof input === "object" && input !== null

/**
 * Tests if a value is an `object`.
 *
 * @param input - The value to test.
 *
 * @example
 * import { isObject } from "effect/Predicate"
 *
 * assert.deepStrictEqual(isObject({}), true)
 * assert.deepStrictEqual(isObject([]), true)
 *
 * assert.deepStrictEqual(isObject(null), false)
 * assert.deepStrictEqual(isObject(undefined), false)
 *
 * @category guards
 * @since 2.0.0
 */
export const isObject = (input: unknown): input is object => isRecordOrArray(input) || isFunction(input)

/**
 * Checks whether a value is an `object` containing a specified property key.
 *
 * @param property - The field to check within the object.
 * @param self - The value to examine.
 *
 * @category guards
 * @since 2.0.0
 */
export const hasProperty: {
  <P extends PropertyKey>(property: P): (self: unknown) => self is { [K in P]: unknown }
  <P extends PropertyKey>(self: unknown, property: P): self is { [K in P]: unknown }
} = dual(
  2,
  <P extends PropertyKey>(self: unknown, property: P): self is { [K in P]: unknown } =>
    isObject(self) && (property in self)
)

/**
 * Tests if a value is an `object` with a property `_tag` that matches the given tag.
 *
 * @param input - The value to test.
 * @param tag - The tag to test for.
 *
 * @example
 * import { isTagged } from "effect/Predicate"
 *
 * assert.deepStrictEqual(isTagged(1, "a"), false)
 * assert.deepStrictEqual(isTagged(null, "a"), false)
 * assert.deepStrictEqual(isTagged({}, "a"), false)
 * assert.deepStrictEqual(isTagged({ a: "a" }, "a"), false)
 * assert.deepStrictEqual(isTagged({ _tag: "a" }, "a"), true)
 * assert.deepStrictEqual(isTagged("a")({ _tag: "a" }), true)
 *
 * @category guards
 * @since 2.0.0
 */
export const isTagged: {
  <K extends string>(tag: K): (self: unknown) => self is { _tag: K }
  <K extends string>(self: unknown, tag: K): self is { _tag: K }
} = dual(
  2,
  <K extends string>(self: unknown, tag: K): self is { _tag: K } => hasProperty(self, "_tag") && self["_tag"] === tag
)

/**
 * A guard that succeeds when the input is `null` or `undefined`.
 *
 * @param input - The value to test.
 *
 * @example
 * import { isNullable } from "effect/Predicate"
 *
 * assert.deepStrictEqual(isNullable(null), true)
 * assert.deepStrictEqual(isNullable(undefined), true)
 *
 * assert.deepStrictEqual(isNullable({}), false)
 * assert.deepStrictEqual(isNullable([]), false)
 *
 * @category guards
 * @since 2.0.0
 */
export const isNullable = <A>(input: A): input is Extract<A, null | undefined> => input === null || input === undefined

/**
 * A guard that succeeds when the input is not `null` or `undefined`.
 *
 * @param input - The value to test.
 *
 * @example
 * import { isNotNullable } from "effect/Predicate"
 *
 * assert.deepStrictEqual(isNotNullable({}), true)
 * assert.deepStrictEqual(isNotNullable([]), true)
 *
 * assert.deepStrictEqual(isNotNullable(null), false)
 * assert.deepStrictEqual(isNotNullable(undefined), false)
 *
 * @category guards
 * @since 2.0.0
 */
export const isNotNullable = <A>(input: A): input is NonNullable<A> => input !== null && input !== undefined

/**
 * A guard that succeeds when the input is an `Error`.
 *
 * @param input - The value to test.
 *
 * @example
 * import { isError } from "effect/Predicate"
 *
 * assert.deepStrictEqual(isError(new Error()), true)
 *
 * assert.deepStrictEqual(isError(null), false)
 * assert.deepStrictEqual(isError({}), false)
 *
 * @category guards
 * @since 2.0.0
 */
export const isError = (input: unknown): input is Error => input instanceof Error

/**
 * A guard that succeeds when the input is a `Uint8Array`.
 *
 * @param input - The value to test.
 *
 * @example
 * import { isUint8Array } from "effect/Predicate"
 *
 * assert.deepStrictEqual(isUint8Array(new Uint8Array()), true)
 *
 * assert.deepStrictEqual(isUint8Array(null), false)
 * assert.deepStrictEqual(isUint8Array({}), false)
 *
 * @category guards
 * @since 2.0.0
 */
export const isUint8Array = (input: unknown): input is Uint8Array => input instanceof Uint8Array

/**
 * A guard that succeeds when the input is a `Date`.
 *
 * @param input - The value to test.
 *
 * @example
 * import { isDate } from "effect/Predicate"
 *
 * assert.deepStrictEqual(isDate(new Date()), true)
 *
 * assert.deepStrictEqual(isDate(null), false)
 * assert.deepStrictEqual(isDate({}), false)
 *
 * @category guards
 * @since 2.0.0
 */
export const isDate = (input: unknown): input is Date => input instanceof Date

/**
 * A guard that succeeds when the input is an `Iterable`.
 *
 * @param input - The value to test.
 *
 * @example
 * import { isIterable } from "effect/Predicate"
 *
 * assert.deepStrictEqual(isIterable([]), true)
 * assert.deepStrictEqual(isIterable(new Set()), true)
 *
 * assert.deepStrictEqual(isIterable(null), false)
 * assert.deepStrictEqual(isIterable({}), false)
 *
 * @category guards
 * @since 2.0.0
 */
export const isIterable = (input: unknown): input is Iterable<unknown> => hasProperty(input, Symbol.iterator)

/**
 * A guard that succeeds when the input is a record.
 *
 * @param input - The value to test.
 *
 * @example
 * import { isRecord } from "effect/Predicate"
 *
 * assert.deepStrictEqual(isRecord({}), true)
 * assert.deepStrictEqual(isRecord({ a: 1 }), true)
 *
 * assert.deepStrictEqual(isRecord([]), false)
 * assert.deepStrictEqual(isRecord([1, 2, 3]), false)
 * assert.deepStrictEqual(isRecord(null), false)
 * assert.deepStrictEqual(isRecord(undefined), false)
 * assert.deepStrictEqual(isRecord(() => null), false)
 *
 * @category guards
 * @since 2.0.0
 */
export const isRecord = (input: unknown): input is { [x: string | symbol]: unknown } =>
  isRecordOrArray(input) && !Array.isArray(input)

/**
 * A guard that succeeds when the input is a readonly record.
 *
 * @param input - The value to test.
 *
 * @example
 * import { isReadonlyRecord } from "effect/Predicate"
 *
 * assert.deepStrictEqual(isReadonlyRecord({}), true)
 * assert.deepStrictEqual(isReadonlyRecord({ a: 1 }), true)
 *
 * assert.deepStrictEqual(isReadonlyRecord([]), false)
 * assert.deepStrictEqual(isReadonlyRecord([1, 2, 3]), false)
 * assert.deepStrictEqual(isReadonlyRecord(null), false)
 * assert.deepStrictEqual(isReadonlyRecord(undefined), false)
 *
 * @category guards
 * @since 2.0.0
 */
export const isReadonlyRecord: (
  input: unknown
) => input is { readonly [x: string | symbol]: unknown } = isRecord

/**
 * A guard that succeeds when the input is a Promise.
 *
 * @param input - The value to test.
 *
 * @example
 * import { isPromise } from "effect/Predicate"
 *
 * assert.deepStrictEqual(isPromise({}), false)
 * assert.deepStrictEqual(isPromise(Promise.resolve("hello")), true)
 *
 * @category guards
 * @since 2.0.0
 */
export const isPromise = (
  input: unknown
): input is Promise<unknown> =>
  hasProperty(input, "then") && "catch" in input && isFunction(input.then) && isFunction(input.catch)

/**
 * @category guards
 * @since 2.0.0
 */
export const isPromiseLike = (
  input: unknown
): input is PromiseLike<unknown> => hasProperty(input, "then") && isFunction(input.then)

/**
 * @since 2.0.0
 */
export const compose: {
  <A, B extends A, C extends B>(bc: Refinement<B, C>): (ab: Refinement<A, B>) => Refinement<A, C>
  <A, B extends A>(bc: Predicate<NoInfer<B>>): (ab: Refinement<A, B>) => Refinement<A, B>
  <A, B extends A, C extends B>(ab: Refinement<A, B>, bc: Refinement<B, C>): Refinement<A, C>
  <A, B extends A>(ab: Refinement<A, B>, bc: Predicate<NoInfer<B>>): Refinement<A, B>
} = dual(
  2,
  <A, B extends A, C extends B>(ab: Refinement<A, B>, bc: Refinement<B, C>): Refinement<A, C> => (a): a is C =>
    ab(a) && bc(a)
)

/**
 * @category combining
 * @since 2.0.0
 */
export const product =
  <A, B>(self: Predicate<A>, that: Predicate<B>): Predicate<readonly [A, B]> /* readonly because contravariant */ =>
  ([a, b]) => self(a) && that(b)

/**
 * @category combining
 * @since 2.0.0
 */
export const all = <A>(
  collection: Iterable<Predicate<A>>
): Predicate<ReadonlyArray<A>> => {
  return (as) => {
    let collectionIndex = 0
    for (const p of collection) {
      if (collectionIndex >= as.length) {
        break
      }
      if (p(as[collectionIndex]) === false) {
        return false
      }
      collectionIndex++
    }
    return true
  }
}

/**
 * @category combining
 * @since 2.0.0
 */
export const productMany = <A>(
  self: Predicate<A>,
  collection: Iterable<Predicate<A>>
): Predicate<readonly [A, ...Array<A>]> /* readonly because contravariant */ => {
  const rest = all(collection)
  return ([head, ...tail]) => self(head) === false ? false : rest(tail)
}

/**
 * Similar to `Promise.all` but operates on `Predicate`s.
 *
 * ```
 * [Predicate<A>, Predicate<B>, ...] -> Predicate<[A, B, ...]>
 * ```
 *
 * @since 2.0.0
 */
export const tuple = <T extends ReadonlyArray<Predicate<any>>>(
  ...elements: T
): Predicate<Readonly<{ [I in keyof T]: [T[I]] extends [Predicate<infer A>] ? A : never }>> => all(elements) as any

/**
 * @since 2.0.0
 */
export const struct = <R extends Record<string, Predicate<any>>>(
  fields: R
): Predicate<{ readonly [K in keyof R]: [R[K]] extends [Predicate<infer A>] ? A : never }> => {
  const keys = Object.keys(fields)
  return (a) => {
    for (const key of keys) {
      if (!fields[key](a[key])) {
        return false
      }
    }
    return true
  }
}

/**
 * Negates the result of a given predicate.
 *
 * @param self - A predicate.
 *
 * @example
 * import { Predicate, Number } from "effect"
 *
 * const isPositive = Predicate.not(Number.lessThan(0))
 *
 * assert.deepStrictEqual(isPositive(-1), false)
 * assert.deepStrictEqual(isPositive(0), true)
 * assert.deepStrictEqual(isPositive(1), true)
 *
 * @category combinators
 * @since 2.0.0
 */
export const not = <A>(self: Predicate<A>): Predicate<A> => (a) => !self(a)

/**
 * Combines two predicates into a new predicate that returns `true` if at least one of the predicates returns `true`.
 *
 * @param self - A predicate.
 * @param that - A predicate.
 *
 * @example
 * import { Predicate, Number } from "effect"
 *
 * const nonZero = Predicate.or(Number.lessThan(0), Number.greaterThan(0))
 *
 * assert.deepStrictEqual(nonZero(-1), true)
 * assert.deepStrictEqual(nonZero(0), false)
 * assert.deepStrictEqual(nonZero(1), true)
 *
 * @category combinators
 * @since 2.0.0
 */
export const or: {
  <A>(that: Predicate<A>): (self: Predicate<A>) => Predicate<A>
  <A>(self: Predicate<A>, that: Predicate<A>): Predicate<A>
} = dual(2, <A>(self: Predicate<A>, that: Predicate<A>): Predicate<A> => (a) => self(a) || that(a))

/**
 * Combines two predicates into a new predicate that returns `true` if both of the predicates returns `true`.
 *
 * @param self - A predicate.
 * @param that - A predicate.
 *
 * @example
 * import { Predicate } from "effect"
 *
 * const minLength = (n: number) => (s: string) => s.length >= n
 * const maxLength = (n: number) => (s: string) => s.length <= n
 *
 * const length = (n: number) => Predicate.and(minLength(n), maxLength(n))
 *
 * assert.deepStrictEqual(length(2)("aa"), true)
 * assert.deepStrictEqual(length(2)("a"), false)
 * assert.deepStrictEqual(length(2)("aaa"), false)
 *
 * @category combinators
 * @since 2.0.0
 */
export const and: {
  <A, C extends A>(that: Refinement<A, C>): <B extends A>(self: Refinement<A, B>) => Refinement<A, B & C>
  <A, B extends A, C extends A>(self: Refinement<A, B>, that: Refinement<A, C>): Refinement<A, B & C>
  <A>(that: Predicate<A>): (self: Predicate<A>) => Predicate<A>
  <A>(self: Predicate<A>, that: Predicate<A>): Predicate<A>
} = dual(2, <A>(self: Predicate<A>, that: Predicate<A>): Predicate<A> => (a) => self(a) && that(a))

/**
 * @category combinators
 * @since 2.0.0
 */
export const xor: {
  <A>(that: Predicate<A>): (self: Predicate<A>) => Predicate<A>
  <A>(self: Predicate<A>, that: Predicate<A>): Predicate<A>
} = dual(2, <A>(self: Predicate<A>, that: Predicate<A>): Predicate<A> => (a) => self(a) !== that(a))

/**
 * @category combinators
 * @since 2.0.0
 */
export const eqv: {
  <A>(that: Predicate<A>): (self: Predicate<A>) => Predicate<A>
  <A>(self: Predicate<A>, that: Predicate<A>): Predicate<A>
} = dual(2, <A>(self: Predicate<A>, that: Predicate<A>): Predicate<A> => (a) => self(a) === that(a))

/**
 * Represents the logical implication combinator for predicates. In formal
 * logic, the implication operator `->` denotes that if the first proposition
 * (antecedent) is true, then the second proposition (consequent) must also be
 * true. In simpler terms, `p implies q` can be interpreted as "if p then q". If
 * the first predicate holds, then the second predicate must hold
 * for the given context.
 *
 * In practical terms within TypeScript, `p implies q` is equivalent to `!p || (p && q)`.
 *
 * Note that if the antecedent is `false`, the result is `true` by default
 * because the outcome of the consequent cannot be determined.
 *
 * This function is useful in situations where you need to enforce rules or
 * constraints that are contingent on certain conditions.
 * It proves especially helpful in defining property tests.
 *
 * The example below illustrates the transitive property of order using the
 * `implies` function. In simple terms, if `a <= b` and `b <= c`, then `a <= c`
 * must be true.
 *
 * @example
 * import { Predicate } from "effect"
 *
 * type Triple = {
 *   readonly a: number
 *   readonly b: number
 *   readonly c: number
 * }
 *
 * const transitivity = Predicate.implies(
 *   // antecedent
 *   (input: Triple) => input.a <= input.b && input.b <= input.c,
 *   // consequent
 *   (input: Triple) => input.a <= input.c
 * )
 *
 * assert.equal(transitivity({ a: 1, b: 2, c: 3 }), true)
 * // antecedent is `false`, so the result is `true`
 * assert.equal(transitivity({ a: 1, b: 0, c: 0 }), true)
 *
 * @category combinators
 * @since 2.0.0
 */
export const implies: {
  <A>(consequent: Predicate<A>): (antecedent: Predicate<A>) => Predicate<A>
  <A>(antecedent: Predicate<A>, consequent: Predicate<A>): Predicate<A>
} = dual(
  2,
  <A>(antecedent: Predicate<A>, consequent: Predicate<A>): Predicate<A> => (a) => antecedent(a) ? consequent(a) : true
)

/**
 * @category combinators
 * @since 2.0.0
 */
export const nor: {
  <A>(that: Predicate<A>): (self: Predicate<A>) => Predicate<A>
  <A>(self: Predicate<A>, that: Predicate<A>): Predicate<A>
} = dual(
  2,
  <A>(self: Predicate<A>, that: Predicate<A>): Predicate<A> => (a) => !(self(a) || that(a))
)

/**
 * @category combinators
 * @since 2.0.0
 */
export const nand: {
  <A>(that: Predicate<A>): (self: Predicate<A>) => Predicate<A>
  <A>(self: Predicate<A>, that: Predicate<A>): Predicate<A>
} = dual(
  2,
  <A>(self: Predicate<A>, that: Predicate<A>): Predicate<A> => (a) => !(self(a) && that(a))
)

/**
 * @category elements
 * @since 2.0.0
 */
export const every = <A>(collection: Iterable<Predicate<A>>): Predicate<A> => (a: A) => {
  for (const p of collection) {
    if (!p(a)) {
      return false
    }
  }
  return true
}

/**
 * @category elements
 * @since 2.0.0
 */
export const some = <A>(collection: Iterable<Predicate<A>>): Predicate<A> => (a) => {
  for (const p of collection) {
    if (p(a)) {
      return true
    }
  }
  return false
}
