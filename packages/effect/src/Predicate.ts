/**
 * This module provides a collection of functions for working with predicates and refinements.
 *
 * A `Predicate<A>` is a function that takes a value of type `A` and returns a boolean.
 * It is used to check if a value satisfies a certain condition.
 *
 * A `Refinement<A, B>` is a special type of predicate that not only checks a condition
 * but also provides a type guard, allowing TypeScript to narrow the type of the input
 * value from `A` to a more specific type `B` within a conditional block.
 *
 * The module includes:
 * - Basic predicates and refinements for common types (e.g., `isString`, `isNumber`).
 * - Combinators to create new predicates from existing ones (e.g., `and`, `or`, `not`).
 * - Advanced combinators for working with data structures (e.g., `tuple`, `struct`).
 * - Type-level utilities for inspecting predicate and refinement types.
 *
 * @since 2.0.0
 */
import { dual, isFunction as isFunction_ } from "./Function.js"
import type { TypeLambda } from "./HKT.js"
import type { TupleOf, TupleOfAtLeast } from "./Types.js"

/**
 * Represents a function that takes a value of type `A` and returns `true` if the value
 * satisfies some condition, `false` otherwise.
 *
 * @example
 * ```ts
 * import { Predicate } from "effect"
 * import * as assert from "node:assert"
 *
 * const isEven: Predicate.Predicate<number> = (n) => n % 2 === 0
 *
 * assert.strictEqual(isEven(2), true)
 * assert.strictEqual(isEven(3), false)
 * ```
 *
 * @category models
 * @since 2.0.0
 */
export interface Predicate<in A> {
  (a: A): boolean
}

/**
 * A `TypeLambda` for `Predicate`. This is used to support higher-kinded types
 * and allows `Predicate` to be used in generic contexts within the `effect` ecosystem.
 *
 * @category type lambdas
 * @since 2.0.0
 */
export interface PredicateTypeLambda extends TypeLambda {
  readonly type: Predicate<this["Target"]>
}

/**
 * Represents a function that serves as a type guard.
 *
 * A `Refinement<A, B>` is a function that takes a value of type `A` and returns a
 * type predicate `a is B`, where `B` is a subtype of `A`. If the function returns
 * `true`, TypeScript will narrow the type of the input variable to `B`.
 *
 * @example
 * ```ts
 * import { Predicate } from "effect"
 * import * as assert from "node:assert"
 *
 * const isString: Predicate.Refinement<unknown, string> = (u): u is string => typeof u === "string"
 *
 * const value: unknown = "hello"
 *
 * if (isString(value)) {
 *   // value is now known to be a string
 *   assert.strictEqual(value.toUpperCase(), "HELLO")
 * }
 * ```
 *
 * @category models
 * @since 2.0.0
 */
export interface Refinement<in A, out B extends A> {
  (a: A): a is B
}

/**
 * A namespace for type-level utilities for `Predicate`.
 *
 * @since 3.6.0
 * @category type-level
 */
export declare namespace Predicate {
  /**
   * Extracts the input type `A` from a `Predicate<A>`.
   *
   * @example
   * ```ts
   * import { type Predicate } from "effect"
   *
   * type T = Predicate.Predicate.In<Predicate.Predicate<string>> // T is string
   * ```
   *
   * @since 3.6.0
   * @category type-level
   */
  export type In<T extends Any> = [T] extends [Predicate<infer _A>] ? _A : never
  /**
   * A type representing any `Predicate`.
   *
   * @since 3.6.0
   * @category type-level
   */
  export type Any = Predicate<never>
}

/**
 * A namespace for type-level utilities for `Refinement`.
 *
 * @since 3.6.0
 * @category type-level
 */
export declare namespace Refinement {
  /**
   * Extracts the input type `A` from a `Refinement<A, B>`.
   *
   * @example
   * ```ts
   * import { type Predicate } from "effect"
   *
   * type IsString = Predicate.Refinement<unknown, string>
   * type T = Predicate.Refinement.In<IsString> // T is unknown
   * ```
   *
   * @since 3.6.0
   * @category type-level
   */
  export type In<T extends Any> = [T] extends [Refinement<infer _A, infer _>] ? _A : never
  /**
   * Extracts the output (refined) type `B` from a `Refinement<A, B>`.
   *
   * @example
   * ```ts
   * import { type Predicate } from "effect"
   *
   * type IsString = Predicate.Refinement<unknown, string>
   * type T = Predicate.Refinement.Out<IsString> // T is string
   * ```
   *
   * @since 3.6.0
   * @category type-level
   */
  export type Out<T extends Any> = [T] extends [Refinement<infer _, infer _B>] ? _B : never
  /**
   * A type representing any `Refinement`.
   *
   * @since 3.6.0
   * @category type-level
   */
  export type Any = Refinement<any, any>
}

/**
 * Transforms a `Predicate<A>` into a `Predicate<B>` by applying a function `(b: B) => A`
 * to the input before passing it to the predicate. This is also known as "contramap" or
 * "pre-composition".
 *
 * @example
 * ```ts
 * import { Predicate, Number } from "effect"
 * import * as assert from "node:assert"
 *
 * // A predicate on numbers
 * const isPositive: Predicate.Predicate<number> = Number.greaterThan(0)
 *
 * // A function from `string` to `number`
 * const stringLength = (s: string): number => s.length
 *
 * // Create a new predicate on strings by mapping the input
 * const hasPositiveLength = Predicate.mapInput(isPositive, stringLength)
 *
 * assert.strictEqual(hasPositiveLength("hello"), true)
 * assert.strictEqual(hasPositiveLength(""), false)
 * ```
 *
 * @category combinators
 * @since 2.0.0
 */
export const mapInput: {
  <B, A>(f: (b: B) => A): (self: Predicate<A>) => Predicate<B>
  <A, B>(self: Predicate<A>, f: (b: B) => A): Predicate<B>
} = dual(2, <A, B>(self: Predicate<A>, f: (b: B) => A): Predicate<B> => (b) => self(f(b)))

/**
 * A refinement that checks if a `ReadonlyArray<T>` is a tuple with exactly `N` elements.
 * If the check is successful, the type is narrowed to `TupleOf<N, T>`.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { isTupleOf } from "effect/Predicate"
 *
 * const isTupleOf3 = isTupleOf(3)
 *
 * assert.strictEqual(isTupleOf3([1, 2, 3]), true);
 * assert.strictEqual(isTupleOf3([1, 2]), false);
 *
 * const arr: number[] = [1, 2, 3];
 * if (isTupleOf(arr, 3)) {
 *   // The type of arr is now [number, number, number]
 *   const [a, b, c] = arr;
 *   assert.deepStrictEqual([a, b, c], [1, 2, 3])
 * }
 * ```
 *
 * @category guards
 * @since 3.3.0
 */
export const isTupleOf: {
  <N extends number>(n: N): <T>(self: ReadonlyArray<T>) => self is TupleOf<N, T>
  <T, N extends number>(self: ReadonlyArray<T>, n: N): self is TupleOf<N, T>
} = dual(2, <T, N extends number>(self: ReadonlyArray<T>, n: N): self is TupleOf<N, T> => self.length === n)

/**
 * A refinement that checks if a `ReadonlyArray<T>` is a tuple with at least `N` elements.
 * If the check is successful, the type is narrowed to `TupleOfAtLeast<N, T>`.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { isTupleOfAtLeast } from "effect/Predicate"
 *
 * const isTupleOfAtLeast3 = isTupleOfAtLeast(3)
 *
 * assert.strictEqual(isTupleOfAtLeast3([1, 2, 3]), true);
 * assert.strictEqual(isTupleOfAtLeast3([1, 2, 3, 4]), true);
 * assert.strictEqual(isTupleOfAtLeast3([1, 2]), false);
 *
 * const arr: number[] = [1, 2, 3, 4];
 * if (isTupleOfAtLeast(arr, 3)) {
 *   // The type of arr is now [number, number, number, ...number[]]
 *   const [a, b, c] = arr;
 *   assert.deepStrictEqual([a, b, c], [1, 2, 3])
 * }
 * ```
 *
 * @category guards
 * @since 3.3.0
 */
export const isTupleOfAtLeast: {
  <N extends number>(n: N): <T>(self: ReadonlyArray<T>) => self is TupleOfAtLeast<N, T>
  <T, N extends number>(self: ReadonlyArray<T>, n: N): self is TupleOfAtLeast<N, T>
} = dual(2, <T, N extends number>(self: ReadonlyArray<T>, n: N): self is TupleOfAtLeast<N, T> => self.length >= n)

/**
 * A predicate that checks if a value is "truthy" in JavaScript.
 * Fails for `false`, `0`, `-0`, `0n`, `""`, `null`, `undefined`, and `NaN`.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { isTruthy } from "effect/Predicate"
 *
 * assert.strictEqual(isTruthy(1), true)
 * assert.strictEqual(isTruthy("hello"), true)
 * assert.strictEqual(isTruthy({}), true)
 *
 * assert.strictEqual(isTruthy(0), false)
 * assert.strictEqual(isTruthy(""), false)
 * assert.strictEqual(isTruthy(null), false)
 * assert.strictEqual(isTruthy(undefined), false)
 * ```
 *
 * @category guards
 * @since 2.0.0
 */
export const isTruthy = (input: unknown) => !!input

/**
 * A refinement that checks if a value is a `Set`.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { isSet } from "effect/Predicate"
 *
 * assert.strictEqual(isSet(new Set([1, 2])), true)
 * assert.strictEqual(isSet(new Set()), true)
 *
 * assert.strictEqual(isSet({}), false)
 * assert.strictEqual(isSet([1, 2]), false)
 * ```
 *
 * @category guards
 * @since 2.0.0
 */
export const isSet = (input: unknown): input is Set<unknown> => input instanceof Set

/**
 * A refinement that checks if a value is a `Map`.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { isMap } from "effect/Predicate"
 *
 * assert.strictEqual(isMap(new Map()), true)
 *
 * assert.strictEqual(isMap({}), false)
 * assert.strictEqual(isMap(new Set()), false)
 * ```
 *
 * @category guards
 * @since 2.0.0
 */
export const isMap = (input: unknown): input is Map<unknown, unknown> => input instanceof Map

/**
 * A refinement that checks if a value is a `string`.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { isString } from "effect/Predicate"
 *
 * assert.strictEqual(isString("hello"), true)
 * assert.strictEqual(isString(""), true)
 *
 * assert.strictEqual(isString(123), false)
 * assert.strictEqual(isString(null), false)
 * ```
 *
 * @category guards
 * @since 2.0.0
 */
export const isString = (input: unknown): input is string => typeof input === "string"

/**
 * A refinement that checks if a value is a `number`.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { isNumber } from "effect/Predicate"
 *
 * assert.strictEqual(isNumber(123), true)
 * assert.strictEqual(isNumber(0), true)
 * assert.strictEqual(isNumber(-1.5), true)
 * assert.strictEqual(isNumber(NaN), true)
 *
 * assert.strictEqual(isNumber("123"), false)
 * ```
 *
 * @category guards
 * @since 2.0.0
 */
export const isNumber = (input: unknown): input is number => typeof input === "number"

/**
 * A refinement that checks if a value is a `boolean`.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { isBoolean } from "effect/Predicate"
 *
 * assert.strictEqual(isBoolean(true), true)
 * assert.strictEqual(isBoolean(false), true)
 *
 * assert.strictEqual(isBoolean("true"), false)
 * assert.strictEqual(isBoolean(0), false)
 * ```
 *
 * @category guards
 * @since 2.0.0
 */
export const isBoolean = (input: unknown): input is boolean => typeof input === "boolean"

/**
 * A refinement that checks if a value is a `bigint`.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { isBigInt } from "effect/Predicate"
 *
 * assert.strictEqual(isBigInt(1n), true)
 *
 * assert.strictEqual(isBigInt(1), false)
 * assert.strictEqual(isBigInt("1"), false)
 * ```
 *
 * @category guards
 * @since 2.0.0
 */
export const isBigInt = (input: unknown): input is bigint => typeof input === "bigint"

/**
 * A refinement that checks if a value is a `symbol`.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { isSymbol } from "effect/Predicate"
 *
 * assert.strictEqual(isSymbol(Symbol.for("a")), true)
 *
 * assert.strictEqual(isSymbol("a"), false)
 * ```
 *
 * @category guards
 * @since 2.0.0
 */
export const isSymbol = (input: unknown): input is symbol => typeof input === "symbol"

// TODO: make public
/**
 * A refinement that checks if a value is a valid `PropertyKey` (a `string`, `number`, or `symbol`).
 * @internal
 */
export const isPropertyKey = (u: unknown): u is PropertyKey => isString(u) || isNumber(u) || isSymbol(u)

/**
 * A refinement that checks if a value is a `Function`.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { isFunction } from "effect/Predicate"
 *
 * assert.strictEqual(isFunction(() => {}), true)
 * assert.strictEqual(isFunction(isFunction), true)
 *
 * assert.strictEqual(isFunction("function"), false)
 * ```
 *
 * @category guards
 * @since 2.0.0
 */
export const isFunction: (input: unknown) => input is Function = isFunction_

/**
 * A refinement that checks if a value is `undefined`.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { isUndefined } from "effect/Predicate"
 *
 * assert.strictEqual(isUndefined(undefined), true)
 *
 * assert.strictEqual(isUndefined(null), false)
 * assert.strictEqual(isUndefined("undefined"), false)
 * ```
 *
 * @category guards
 * @since 2.0.0
 */
export const isUndefined = (input: unknown): input is undefined => input === undefined

/**
 * A refinement that checks if a value is not `undefined`.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { isNotUndefined } from "effect/Predicate"
 *
 * assert.strictEqual(isNotUndefined(null), true)
 * assert.strictEqual(isNotUndefined("value"), true)
 *
 * assert.strictEqual(isNotUndefined(undefined), false)
 * ```
 *
 * @category guards
 * @since 2.0.0
 */
export const isNotUndefined = <A>(input: A): input is Exclude<A, undefined> => input !== undefined

/**
 * A refinement that checks if a value is `null`.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { isNull } from "effect/Predicate"
 *
 * assert.strictEqual(isNull(null), true)
 *
 * assert.strictEqual(isNull(undefined), false)
 * assert.strictEqual(isNull("null"), false)
 * ```
 *
 * @category guards
 * @since 2.0.0
 */
export const isNull = (input: unknown): input is null => input === null

/**
 * A refinement that checks if a value is not `null`.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { isNotNull } from "effect/Predicate"
 *
 * assert.strictEqual(isNotNull(undefined), true)
 * assert.strictEqual(isNotNull("value"), true)
 *
 * assert.strictEqual(isNotNull(null), false)
 * ```
 *
 * @category guards
 * @since 2.0.0
 */
export const isNotNull = <A>(input: A): input is Exclude<A, null> => input !== null

/**
 * A refinement that always returns `false`. The type is narrowed to `never`.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { isNever } from "effect/Predicate"
 *
 * assert.strictEqual(isNever(1), false)
 * assert.strictEqual(isNever(null), false)
 * assert.strictEqual(isNever({}), false)
 * ```
 *
 * @category guards
 * @since 2.0.0
 */
export const isNever: (input: unknown) => input is never = (_: unknown): _ is never => false

/**
 * A refinement that always returns `true`. The type is narrowed to `unknown`.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { isUnknown } from "effect/Predicate"
 *
 * assert.strictEqual(isUnknown(1), true)
 * assert.strictEqual(isUnknown(null), true)
 * assert.strictEqual(isUnknown({}), true)
 * ```
 *
 * @category guards
 * @since 2.0.0
 */
export const isUnknown: (input: unknown) => input is unknown = (_): _ is unknown => true

/**
 * Checks if the input is an object or an array.
 * @internal
 */
export const isRecordOrArray = (input: unknown): input is { [x: PropertyKey]: unknown } =>
  typeof input === "object" && input !== null

/**
 * A refinement that checks if a value is an `object`. Note that in JavaScript,
 * arrays and functions are also considered objects.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { isObject } from "effect/Predicate"
 *
 * assert.strictEqual(isObject({}), true)
 * assert.strictEqual(isObject([]), true)
 * assert.strictEqual(isObject(() => {}), true)
 *
 * assert.strictEqual(isObject(null), false)
 * assert.strictEqual(isObject("hello"), false)
 * ```
 *
 * @category guards
 * @since 2.0.0
 * @see isRecord to check for plain objects (excluding arrays and functions).
 */
export const isObject = (input: unknown): input is object => isRecordOrArray(input) || isFunction(input)

/**
 * A refinement that checks if a value is an object-like value and has a specific property key.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { hasProperty } from "effect/Predicate"
 *
 * assert.strictEqual(hasProperty({ a: 1 }, "a"), true)
 * assert.strictEqual(hasProperty({ a: 1 }, "b"), false)
 *
 * const value: unknown = { name: "Alice" };
 * if (hasProperty(value, "name")) {
 *   // The type of `value` is narrowed to `{ name: unknown }`
 *   // and we can safely access `value.name`
 *   console.log(value.name)
 * }
 * ```
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
 * A refinement that checks if a value is an object with a `_tag` property
 * that matches the given tag. This is a powerful tool for working with
 * discriminated union types.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { isTagged } from "effect/Predicate"
 *
 * type Shape = { _tag: "circle"; radius: number } | { _tag: "square"; side: number }
 *
 * const isCircle = isTagged("circle")
 *
 * const shape1: Shape = { _tag: "circle", radius: 10 }
 * const shape2: Shape = { _tag: "square", side: 5 }
 *
 * assert.strictEqual(isCircle(shape1), true)
 * assert.strictEqual(isCircle(shape2), false)
 *
 * if (isCircle(shape1)) {
 *   // shape1 is now narrowed to { _tag: "circle"; radius: number }
 *   assert.strictEqual(shape1.radius, 10)
 * }
 * ```
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
 * A refinement that checks if a value is either `null` or `undefined`.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { isNullable } from "effect/Predicate"
 *
 * assert.strictEqual(isNullable(null), true)
 * assert.strictEqual(isNullable(undefined), true)
 *
 * assert.strictEqual(isNullable(0), false)
 * assert.strictEqual(isNullable(""), false)
 * ```
 *
 * @category guards
 * @since 2.0.0
 * @see isNotNullable
 */
export const isNullable = <A>(input: A): input is Extract<A, null | undefined> => input === null || input === undefined

/**
 * A refinement that checks if a value is neither `null` nor `undefined`.
 * The type is narrowed to `NonNullable<A>`.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { isNotNullable } from "effect/Predicate"
 *
 * assert.strictEqual(isNotNullable(0), true)
 * assert.strictEqual(isNotNullable("hello"), true)
 *
 * assert.strictEqual(isNotNullable(null), false)
 * assert.strictEqual(isNotNullable(undefined), false)
 * ```
 *
 * @category guards
 * @since 2.0.0
 * @see isNullable
 */
export const isNotNullable = <A>(input: A): input is NonNullable<A> => input !== null && input !== undefined

/**
 * A refinement that checks if a value is an instance of `Error`.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { isError } from "effect/Predicate"
 *
 * assert.strictEqual(isError(new Error("boom")), true)
 * assert.strictEqual(isError(new TypeError("boom")), true)
 *
 * assert.strictEqual(isError({ message: "boom" }), false)
 * assert.strictEqual(isError("boom"), false)
 * ```
 *
 * @category guards
 * @since 2.0.0
 */
export const isError = (input: unknown): input is Error => input instanceof Error

/**
 * A refinement that checks if a value is a `Uint8Array`.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { isUint8Array } from "effect/Predicate"
 *
 * assert.strictEqual(isUint8Array(new Uint8Array()), true)
 *
 * assert.strictEqual(isUint8Array(new Uint16Array()), false)
 * assert.strictEqual(isUint8Array([1, 2, 3]), false)
 * ```
 *
 * @category guards
 * @since 2.0.0
 */
export const isUint8Array = (input: unknown): input is Uint8Array => input instanceof Uint8Array

/**
 * A refinement that checks if a value is a `Date` object.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { isDate } from "effect/Predicate"
 *
 * assert.strictEqual(isDate(new Date()), true)
 *
 * assert.strictEqual(isDate(Date.now()), false) // `Date.now()` returns a number
 * assert.strictEqual(isDate("2023-01-01"), false)
 * ```
 *
 * @category guards
 * @since 2.0.0
 */
export const isDate = (input: unknown): input is Date => input instanceof Date

/**
 * A refinement that checks if a value is an `Iterable`.
 * Many built-in types are iterable, such as `Array`, `string`, `Map`, and `Set`.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { isIterable } from "effect/Predicate"
 *
 * assert.strictEqual(isIterable([]), true)
 * assert.strictEqual(isIterable("hello"), true)
 * assert.strictEqual(isIterable(new Set()), true)
 *
 * assert.strictEqual(isIterable({}), false)
 * assert.strictEqual(isIterable(123), false)
 * ```
 *
 * @category guards
 * @since 2.0.0
 */
export const isIterable = (input: unknown): input is Iterable<unknown> =>
  typeof input === "string" || hasProperty(input, Symbol.iterator)

/**
 * A refinement that checks if a value is a record (i.e., a plain object).
 * This check returns `false` for arrays, `null`, and functions.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { isRecord } from "effect/Predicate"
 *
 * assert.strictEqual(isRecord({}), true)
 * assert.strictEqual(isRecord({ a: 1 }), true)
 *
 * assert.strictEqual(isRecord([]), false)
 * assert.strictEqual(isRecord(new Date()), false)
 * assert.strictEqual(isRecord(null), false)
 * assert.strictEqual(isRecord(() => null), false)
 * ```
 *
 * @category guards
 * @since 2.0.0
 * @see isObject
 */
export const isRecord = (input: unknown): input is { [x: string | symbol]: unknown } =>
  isRecordOrArray(input) && !Array.isArray(input)

/**
 * A refinement that checks if a value is a readonly record (i.e., a plain object).
 * This check returns `false` for arrays, `null`, and functions.
 *
 * This is an alias for `isRecord`.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { isReadonlyRecord } from "effect/Predicate"
 *
 * assert.strictEqual(isReadonlyRecord({}), true)
 * assert.strictEqual(isReadonlyRecord({ a: 1 }), true)
 *
 * assert.strictEqual(isReadonlyRecord([]), false)
 * assert.strictEqual(isReadonlyRecord(null), false)
 * ```
 *
 * @category guards
 * @since 2.0.0
 */
export const isReadonlyRecord: (
  input: unknown
) => input is { readonly [x: string | symbol]: unknown } = isRecord

/**
 * A refinement that checks if a value is a `Promise`. It performs a duck-typing check
 * for `.then` and `.catch` methods.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { isPromise } from "effect/Predicate"
 *
 * assert.strictEqual(isPromise(Promise.resolve(1)), true)
 * assert.strictEqual(isPromise(new Promise(() => {})), true)
 *
 * assert.strictEqual(isPromise({ then() {} }), false) // Missing .catch
 * assert.strictEqual(isPromise({}), false)
 * ```
 *
 * @category guards
 * @since 2.0.0
 * @see isPromiseLike
 */
export const isPromise = (
  input: unknown
): input is Promise<unknown> =>
  hasProperty(input, "then") && "catch" in input && isFunction(input.then) && isFunction(input.catch)

/**
 * A refinement that checks if a value is `PromiseLike`. It performs a duck-typing
 * check for a `.then` method.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { isPromiseLike } from "effect/Predicate"
 *
 * assert.strictEqual(isPromiseLike(Promise.resolve(1)), true)
 * assert.strictEqual(isPromiseLike({ then: () => {} }), true)
 *
 * assert.strictEqual(isPromiseLike({}), false)
 * ```
 *
 * @category guards
 * @since 2.0.0
 * @see isPromise
 */
export const isPromiseLike = (
  input: unknown
): input is PromiseLike<unknown> => hasProperty(input, "then") && isFunction(input.then)

/**
 * A refinement that checks if a value is a `RegExp`.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { Predicate } from "effect"
 *
 * assert.strictEqual(Predicate.isRegExp(/a/), true)
 * assert.strictEqual(Predicate.isRegExp(new RegExp("a")), true)
 *
 * assert.strictEqual(Predicate.isRegExp("/a/"), false)
 * ```
 *
 * @category guards
 * @since 3.9.0
 */
export const isRegExp = (input: unknown): input is RegExp => input instanceof RegExp

/**
 * Composes a `Refinement` with another `Refinement` or `Predicate`.
 *
 * This can be used to chain checks. The first refinement is applied, and if it
 * passes, the second check is applied to the same value, potentially refining
 * the type further.
 *
 * @example
 * ```ts
 * import { Predicate } from "effect"
 * import * as assert from "node:assert"
 *
 * const isString = (u: unknown): u is string => typeof u === "string"
 * const minLength = (n: number) => (s: string): boolean => s.length >= n
 *
 * // Create a refinement that checks for a string with a minimum length of 3
 * const isLongString = Predicate.compose(isString, minLength(3))
 *
 * let value: unknown = "hello"
 *
 * assert.strictEqual(isLongString(value), true)
 * if (isLongString(value)) {
 *   // value is narrowed to string
 *   assert.strictEqual(value.toUpperCase(), "HELLO")
 * }
 * assert.strictEqual(isLongString("hi"), false)
 * ```
 *
 * @since 2.0.0
 */
export const compose: {
  <A, B extends A, C extends B, D extends C>(bc: Refinement<C, D>): (ab: Refinement<A, B>) => Refinement<A, D>
  <A, B extends A>(bc: Predicate<NoInfer<B>>): (ab: Refinement<A, B>) => Refinement<A, B>
  <A, B extends A, C extends B, D extends C>(ab: Refinement<A, B>, bc: Refinement<C, D>): Refinement<A, D>
  <A, B extends A>(ab: Refinement<A, B>, bc: Predicate<NoInfer<B>>): Refinement<A, B>
} = dual(
  2,
  <A, B extends A, C extends B, D extends C>(ab: Refinement<A, B>, bc: Refinement<C, D>): Refinement<A, D> =>
  (a): a is D => ab(a) && bc(a as C)
)

/**
 * Combines two predicates to test a tuple of two values. The first predicate tests the
 * first element of the tuple, and the second predicate tests the second element.
 *
 * @category combining
 * @since 2.0.0
 */
export const product =
  <A, B>(self: Predicate<A>, that: Predicate<B>): Predicate<readonly [A, B]> /* readonly because contravariant */ =>
  ([a, b]) => self(a) && that(b)

/**
 * Takes an iterable of predicates and returns a new predicate that tests an array of values.
 * The new predicate returns `true` if each predicate at a given index is satisfied by the
 * value at the same index in the array. The check stops at the length of the shorter of
 * the two iterables (predicates or values).
 *
 * @category combining
 * @since 2.0.0
 * @see tuple for a more powerful, variadic version.
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
 * Combines a predicate for a single value and an iterable of predicates for the rest of an array.
 * Useful for checking the head and tail of an array separately.
 *
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
 * Combines an array of predicates into a single predicate that tests an array of values.
 * This function is highly type-aware and will produce a `Refinement` if any of the provided
 * predicates are `Refinement`s, allowing for powerful type-narrowing of tuples.
 *
 * - If all predicates are `Predicate<T>`, the result is `Predicate<[T, T, ...]>`.
 * - If any predicate is a `Refinement<A, B>`, the result is a `Refinement` that narrows
 *   the input tuple type to a more specific tuple type.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { Predicate } from "effect"
 *
 * const isString = (u: unknown): u is string => typeof u === "string"
 * const isNumber = (u: unknown): u is number => typeof u === "number"
 *
 * // Create a refinement for a [string, number] tuple
 * const isStringNumberTuple = Predicate.tuple(isString, isNumber)
 *
 * const value: [unknown, unknown] = ["hello", 123]
 * if (isStringNumberTuple(value)) {
 *   // value is narrowed to [string, number]
 *   const [s, n] = value
 *   assert.strictEqual(s.toUpperCase(), "HELLO")
 *   assert.strictEqual(n.toFixed(2), "123.00")
 * }
 * assert.strictEqual(isStringNumberTuple(["hello", "123"]), false)
 * ```
 *
 * @since 2.0.0
 */
export const tuple: {
  <T extends ReadonlyArray<Predicate.Any>>(
    ...elements: T
  ): [Extract<T[number], Refinement.Any>] extends [never] ? Predicate<{ readonly [I in keyof T]: Predicate.In<T[I]> }>
    : Refinement<
      { readonly [I in keyof T]: T[I] extends Refinement.Any ? Refinement.In<T[I]> : Predicate.In<T[I]> },
      { readonly [I in keyof T]: T[I] extends Refinement.Any ? Refinement.Out<T[I]> : Predicate.In<T[I]> }
    >
} = (...elements: ReadonlyArray<Predicate.Any>) => all(elements) as any

/**
 * Combines a record of predicates into a single predicate that tests a record of values.
 * This function is highly type-aware and will produce a `Refinement` if any of the provided
 * predicates are `Refinement`s, allowing for powerful type-narrowing of structs.
 *
 * - If all predicates are `Predicate<T>`, the result is `Predicate<{ k: T, ... }>`.
 * - If any predicate is a `Refinement<A, B>`, the result is a `Refinement` that narrows
 *   the input record type to a more specific record type.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { Predicate } from "effect"
 *
 * const isString = (u: unknown): u is string => typeof u === "string"
 * const isNumber = (u: unknown): u is number => typeof u === "number"
 *
 * const personPredicate = Predicate.struct({
 *   name: isString,
 *   age: isNumber
 * })
 *
 * const value: { name: unknown; age: unknown } = { name: "Alice", age: 30 }
 * if (personPredicate(value)) {
 *   // value is narrowed to { name: string; age: number }
 *   assert.strictEqual(value.name.toUpperCase(), "ALICE")
 *   assert.strictEqual(value.age.toFixed(0), "30")
 * }
 * assert.strictEqual(personPredicate({ name: "Bob", age: "40" }), false)
 * ```
 *
 * @since 2.0.0
 */
export const struct: {
  <R extends Record<string, Predicate.Any>>(
    fields: R
  ): [Extract<R[keyof R], Refinement.Any>] extends [never] ?
    Predicate<{ readonly [K in keyof R]: Predicate.In<R[K]> }> :
    Refinement<
      { readonly [K in keyof R]: R[K] extends Refinement.Any ? Refinement.In<R[K]> : Predicate.In<R[K]> },
      { readonly [K in keyof R]: R[K] extends Refinement.Any ? Refinement.Out<R[K]> : Predicate.In<R[K]> }
    >
} = (<R extends Record<string, Predicate.Any>>(fields: R) => {
  const keys = Object.keys(fields)
  return (a: Record<string, unknown>) => {
    for (const key of keys) {
      if (!fields[key](a[key] as never)) {
        return false
      }
    }
    return true
  }
}) as any

/**
 * Returns a new predicate that is the logical negation of the given predicate.
 *
 * **Note**: If the input is a `Refinement`, the resulting predicate will be a
 * simple `Predicate`, as TypeScript cannot infer the negative type.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { Predicate, Number } from "effect"
 *
 * const isNonPositive = Predicate.not(Number.greaterThan(0))
 *
 * assert.strictEqual(isNonPositive(-1), true)
 * assert.strictEqual(isNonPositive(0), true)
 * assert.strictEqual(isNonPositive(1), false)
 * ```
 *
 * @category combinators
 * @since 2.0.0
 */
export const not = <A>(self: Predicate<A>): Predicate<A> => (a) => !self(a)

/**
 * Combines two predicates with a logical "OR". The resulting predicate returns `true`
 * if at least one of the predicates returns `true`.
 *
 * If both predicates are `Refinement`s, the resulting predicate is a `Refinement` to the
 * union of their target types (`B | C`).
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { Predicate } from "effect"
 *
 * const isString = (u: unknown): u is string => typeof u === "string"
 * const isNumber = (u: unknown): u is number => typeof u === "number"
 *
 * const isStringOrNumber = Predicate.or(isString, isNumber)
 *
 * assert.strictEqual(isStringOrNumber("hello"), true)
 * assert.strictEqual(isStringOrNumber(123), true)
 * assert.strictEqual(isStringOrNumber(null), false)
 *
 * const value: unknown = "world"
 * if (isStringOrNumber(value)) {
 *   // value is narrowed to string | number
 *   console.log(value)
 * }
 * ```
 *
 * @category combinators
 * @since 2.0.0
 */
export const or: {
  <A, C extends A>(that: Refinement<A, C>): <B extends A>(self: Refinement<A, B>) => Refinement<A, B | C>
  <A, B extends A, C extends A>(self: Refinement<A, B>, that: Refinement<A, C>): Refinement<A, B | C>
  <A>(that: Predicate<A>): (self: Predicate<A>) => Predicate<A>
  <A>(self: Predicate<A>, that: Predicate<A>): Predicate<A>
} = dual(2, <A>(self: Predicate<A>, that: Predicate<A>): Predicate<A> => (a) => self(a) || that(a))

/**
 * Combines two predicates with a logical "AND". The resulting predicate returns `true`
 * only if both of the predicates return `true`.
 *
 * If both predicates are `Refinement`s, the resulting predicate is a `Refinement` to the
 * intersection of their target types (`B & C`).
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { Predicate } from "effect"
 *
 * type Person = { name: string }
 * type Employee = { id: number }
 *
 * const hasName = (u: unknown): u is Person => Predicate.hasProperty(u, "name") && typeof (u as any).name === "string"
 * const hasId = (u: unknown): u is Employee => Predicate.hasProperty(u, "id") && typeof (u as any).id === "number"
 *
 * const isPersonAndEmployee = Predicate.and(hasName, hasId)
 *
 * const val: unknown = { name: "Alice", id: 123 }
 * if (isPersonAndEmployee(val)) {
 *   // val is narrowed to Person & Employee
 *   assert.strictEqual(val.name, "Alice")
 *   assert.strictEqual(val.id, 123)
 * }
 *
 * assert.strictEqual(isPersonAndEmployee({ name: "Bob" }), false) // Missing id
 * assert.strictEqual(isPersonAndEmployee({ id: 456 }), false) // Missing name
 * ```
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
 * Combines two predicates with a logical "XOR" (exclusive OR). The resulting predicate
 * returns `true` if one of the predicates returns `true`, but not both.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { Predicate } from "effect"
 *
 * const isPositive = (n: number) => n > 0
 * const isEven = (n: number) => n % 2 === 0
 *
 * const isPositiveXorEven = Predicate.xor(isPositive, isEven)
 *
 * assert.strictEqual(isPositiveXorEven(4), false)  // both true -> false
 * assert.strictEqual(isPositiveXorEven(3), true)   // one true -> true
 * assert.strictEqual(isPositiveXorEven(-2), true)  // one true -> true
 * assert.strictEqual(isPositiveXorEven(-1), false) // both false -> false
 * ```
 *
 * @category combinators
 * @since 2.0.0
 */
export const xor: {
  <A>(that: Predicate<A>): (self: Predicate<A>) => Predicate<A>
  <A>(self: Predicate<A>, that: Predicate<A>): Predicate<A>
} = dual(2, <A>(self: Predicate<A>, that: Predicate<A>): Predicate<A> => (a) => self(a) !== that(a))

/**
 * Combines two predicates with a logical "EQV" (equivalence). The resulting predicate
 * returns `true` if both predicates return the same boolean value (both `true` or both `false`).
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { Predicate } from "effect"
 *
 * const isPositive = (n: number) => n > 0
 * const isEven = (n: number) => n % 2 === 0
 *
 * const isPositiveEqvEven = Predicate.eqv(isPositive, isEven)
 *
 * assert.strictEqual(isPositiveEqvEven(4), true)   // both true -> true
 * assert.strictEqual(isPositiveEqvEven(3), false)  // different -> false
 * assert.strictEqual(isPositiveEqvEven(-2), false) // different -> false
 * assert.strictEqual(isPositiveEqvEven(-1), true)  // both false -> true
 * ```
 *
 * @category combinators
 * @since 2.0.0
 */
export const eqv: {
  <A>(that: Predicate<A>): (self: Predicate<A>) => Predicate<A>
  <A>(self: Predicate<A>, that: Predicate<A>): Predicate<A>
} = dual(2, <A>(self: Predicate<A>, that: Predicate<A>): Predicate<A> => (a) => self(a) === that(a))

/**
 * Creates a predicate that represents a logical "if-then" rule.
 *
 * Think of it as a conditional promise: **"If `antecedent` holds true, then I promise `consequent` will also be true."**
 *
 * This function is invaluable for defining complex validation logic where one condition dictates another.
 *
 * ### How It Works
 *
 * The rule only fails (returns `false`) when the "if" part is `true`, but the "then" part is `false`.
 * In all other cases, the promise is considered kept, and the result is `true`.
 *
 * This includes the concept of **"vacuous truth"**: if the "if" part is `false`, the rule doesn't apply,
 * so the promise isn't broken, and the result is `true`. (e.g., "If it rains, I'll bring an umbrella."
 * If it doesn't rain, you haven't broken your promise, no matter what).
 *
 * ### Key Details
 *
 * - **Logical Equivalence**: `implies(p, q)` is the same as `not(p).or(q)`, or simply `!p || q`
 *   in plain JavaScript. This can be a helpful way to reason about its behavior.
 *
 * - **Type-Safety Warning**: This function always returns a `Predicate`, never a type-narrowing
 *   `Refinement`. A `true` result doesn't guarantee the `consequent` passed (it could be `true`
 *   simply because the `antecedent` was `false`), so it cannot be used to safely narrow a type.
 *
 * @example
 * ```ts
 * // Rule: A user can only be an admin if they also belong to the "staff" group.
 * import * as assert from "node:assert"
 * import { Predicate } from "effect"
 *
 * type User = {
 *   isStaff: boolean
 *   isAdmin: boolean
 * }
 *
 * const isValidUserPermission = Predicate.implies(
 *   // antecedent: "if" the user is an admin...
 *   (user: User) => user.isAdmin,
 *   // consequent: "then" they must be staff.
 *   (user: User) => user.isStaff
 * )
 *
 * // A non-admin who is not staff. Rule doesn't apply (antecedent is false).
 * assert.strictEqual(isValidUserPermission({ isStaff: false, isAdmin: false }), true)
 *
 * // A staff member who is not an admin. Rule doesn't apply (antecedent is false).
 * assert.strictEqual(isValidUserPermission({ isStaff: true, isAdmin: false }), true)
 *
 * // An admin who is also staff. The rule was followed.
 * assert.strictEqual(isValidUserPermission({ isStaff: true, isAdmin: true }), true)
 *
 * // An admin who is NOT staff. The rule was broken!
 * assert.strictEqual(isValidUserPermission({ isStaff: false, isAdmin: true }), false)
 * ```
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
 * Combines two predicates with a logical "NOR" (negated OR). The resulting predicate
 * returns `true` only if both predicates return `false`.
 * This is equivalent to `not(or(p, q))`.
 *
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
 * Combines two predicates with a logical "NAND" (negated AND). The resulting predicate
 * returns `true` if at least one of the predicates returns `false`.
 * This is equivalent to `not(and(p, q))`.
 *
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
 * Takes an iterable of predicates and returns a new predicate. The new predicate
 * returns `true` if all predicates in the collection return `true` for a given value.
 *
 * This is like `Array.prototype.every` but for a collection of predicates.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { Predicate } from "effect"
 *
 * const isPositive = (n: number) => n > 0
 * const isEven = (n: number) => n % 2 === 0
 *
 * const isPositiveAndEven = Predicate.every([isPositive, isEven])
 *
 * assert.strictEqual(isPositiveAndEven(4), true)
 * assert.strictEqual(isPositiveAndEven(3), false)
 * assert.strictEqual(isPositiveAndEven(-2), false)
 * ```
 *
 * @category elements
 * @since 2.0.0
 * @see some
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
 * Takes an iterable of predicates and returns a new predicate. The new predicate
 * returns `true` if at least one predicate in the collection returns `true` for a given value.
 *
 * This is like `Array.prototype.some` but for a collection of predicates.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { Predicate } from "effect"
 *
 * const isNegative = (n: number) => n < 0
 * const isOdd = (n: number) => n % 2 !== 0
 *
 * const isNegativeOrOdd = Predicate.some([isNegative, isOdd])
 *
 * assert.strictEqual(isNegativeOrOdd(-2), true) // isNegative is true
 * assert.strictEqual(isNegativeOrOdd(3), true)  // isOdd is true
 * assert.strictEqual(isNegativeOrOdd(4), false) // both are false
 * ```
 *
 * @category elements
 * @since 2.0.0
 * @see every
 */
export const some = <A>(collection: Iterable<Predicate<A>>): Predicate<A> => (a) => {
  for (const p of collection) {
    if (p(a)) {
      return true
    }
  }
  return false
}
