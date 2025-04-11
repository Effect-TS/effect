/**
 * # Integer
 *
 * **Operations on integers** (`ℤ`), **representing whole numbers** `{..., -2,
 * -1, 0, 1, 2, ...}`.
 *
 * ## What Problem Does It Solve?
 *
 * The `Integer` module solves the problem of working with whole numbers in a
 * **type-safe**, **functional** manner. It ensures operations maintain integer
 * constraints (no fractional components) while providing a rich set of
 * mathematical operations with proper error handling and type refinements.
 *
 * ## When to Use
 *
 * Use the `Integer` module when you need:
 *
 * - Strict whole-number arithmetic with no fractional components
 * - To model quantities that can be negative but must be whole numbers
 * - Precise control over numeric type flow in function composition
 * - Mathematical operations that preserve integer properties
 * - Operations that intelligently return more specific types when appropriate
 *
 * Integers extend natural numbers by including negative values, enabling
 * modeling of:
 *
 * - Signed quantities (positive, zero, and negative values)
 * - Differences between natural numbers
 * - Positions relative to an origin point
 * - Direction along with magnitude
 *
 * ## Advanced Features
 *
 * The Integer module provides:
 *
 * - **Type refinement** with runtime validation ensuring no fractional components
 * - **Mathematical operations** that preserve integer properties
 * - **Type-narrowing operations** that return more specific types when
 *   appropriate
 * - **Option-returning operations** for potentially invalid operations
 * - **Comparison predicates** for rich relational operations
 * - **Type-class instances** for functional programming patterns
 *
 * ## Operations Reference
 *
 * | Category   | Operation                                   | Description                                     | Domain                          | Co-domain              |
 * | ---------- | ------------------------------------------- | ----------------------------------------------- | ------------------------------- | ---------------------- |
 * | math       | {@link module:Integer.sign}                 | Determines the sign of an integer               | `Integer`                       | `Ordering`             |
 * | math       | {@link module:Integer.abs}                  | Returns absolute value as a NaturalNumber       | `Integer`                       | `NaturalNumber`        |
 * | math       | {@link module:Integer.negate}               | Returns the additive inverse                    | `Integer`                       | `Integer`              |
 * | math       | {@link module:Integer.add}                  | Adds two integers                               | `Integer`, `Integer`            | `Integer`              |
 * | math       | {@link module:Integer.subtract}             | Subtracts one integer from another              | `Integer`, `Integer`            | `Integer`              |
 * | math       | {@link module:Integer.multiply}             | Multiplies two integers                         | `Integer`, `Integer`            | `Integer`              |
 * | math       | {@link module:Integer.square}               | Computes square (returns NaturalNumber)         | `Integer`                       | `NaturalNumber`        |
 * | math       | {@link module:Integer.cube}                 | Computes cube (preserves sign)                  | `Integer`                       | `Integer`              |
 * | math       | {@link module:Integer.pow}                  | Integer exponentiation                          | `Integer`, `Integer`            | `Integer`              |
 * | math       | {@link module:Integer.divideToNumber}       | Divides yielding possibly non-integer result    | `Integer`, `Integer`            | `number`               |
 * | math       | {@link module:Integer.divideSafe}           | Safely divides returning Option for non-integer | `Integer`, `Integer`            | `Option<Integer>`      |
 * |            |                                             |                                                 |                                 |                        |
 * | predicates | {@link module:Integer.between}              | Checks if integer is in a range                 | `Integer`, `{minimum, maximum}` | `boolean`              |
 * | predicates | {@link module:Integer.lessThan}             | Checks if one integer is less than another      | `Integer`, `Integer`            | `boolean`              |
 * | predicates | {@link module:Integer.lessThanOrEqualTo}    | Checks if one integer is less than or equal     | `Integer`, `Integer`            | `boolean`              |
 * | predicates | {@link module:Integer.greaterThan}          | Checks if one integer is greater than another   | `Integer`, `Integer`            | `boolean`              |
 * | predicates | {@link module:Integer.greaterThanOrEqualTo} | Checks if one integer is greater or equal       | `Integer`, `Integer`            | `boolean`              |
 * |            |                                             |                                                 |                                 |                        |
 * | comparison | {@link module:Integer.min}                  | Returns the minimum of two integers             | `Integer`, `Integer`            | `Integer`              |
 * | comparison | {@link module:Integer.max}                  | Returns the maximum of two integers             | `Integer`, `Integer`            | `Integer`              |
 * | comparison | {@link module:Integer.clamp}                | Restricts an integer to a range                 | `Integer`, `{minimum, maximum}` | `Integer`              |
 * |            |                                             |                                                 |                                 |                        |
 * | instances  | {@link module:Integer.Equivalence}          | Equivalence instance for integers               |                                 | `Equivalence<Integer>` |
 * | instances  | {@link module:Integer.Order}                | Order instance for integers                     |                                 | `Order<Integer>`       |
 *
 * ## Composition Patterns and Type Safety
 *
 * When building function pipelines, understanding how types flow through
 * operations is critical:
 *
 * ### Composing with type-preserving operations
 *
 * Operations where domain and co-domain match (Integer → Integer) can be freely
 * chained:
 *
 * ```ts
 * import { pipe } from "effect"
 * import * as Integer from "effect/Integer"
 *
 * const result = pipe(
 *   Integer.of(-5),
 *   Integer.add(10), // Integer → Integer
 *   Integer.multiply(2), // Integer → Integer
 *   Integer.negate // Integer → Integer
 * ) // Result: Integer (-10)
 * ```
 *
 * ### Handling type transitions
 *
 * When an operation changes the type, subsequent operations must be compatible
 * with the new type:
 *
 * ```ts
 * import { pipe, Option } from "effect"
 * import * as Integer from "effect/Integer"
 * import * as NaturalNumber from "effect/NaturalNumber"
 * import * as RealNumber from "effect/Number"
 *
 * // Type narrowing: Integer → NaturalNumber
 * const positiveResult = pipe(
 *   Integer.of(-5),
 *   Integer.abs, // Integer → NaturalNumber
 *   NaturalNumber.increment // NaturalNumber → NaturalNumber
 *   // Cannot use Integer.negate here! (negate requires Integer)
 * ) // Result: NaturalNumber (6)
 *
 * // Type widening: Integer → number
 * const fractionResult = pipe(
 *   Integer.of(10),
 *   Integer.divideToNumber(3), // Integer → Option<number>
 *   Option.map(
 *     // Cannot use Integer operations here!
 *     (n: number) => RealNumber.multiply(2, n) // number → number
 *   )
 * ) // Result: Some(6.666...)
 * ```
 *
 * ### Working with Option results
 *
 * Operations returning Option types require Option combinators for further
 * processing:
 *
 * ```ts
 * import { pipe, Option } from "effect"
 * import * as Integer from "effect/Integer"
 *
 * const result = pipe(
 *   Integer.of(10),
 *   Integer.divideSafe(3), // Integer → Option<Integer>
 *   Option.map(Integer.add(1)), // Option<Integer> → Option<Integer>
 *   Option.getOrElse(() => Integer.zero)
 * ) // Result: Integer.of(0)
 * ```
 *
 * ### Composition best practices
 *
 * - Chain type-preserving operations for maximum composability
 * - Handle type transitions explicitly - don't mix operations from different
 *   domains
 * - Use Option combinators when working with potentially failing operations
 * - Be aware when operations narrow to NaturalNumber or widen to number
 *
 * ## Mathematical Properties
 *
 * From an algebraic perspective, `Integer` forms a ring under:
 *
 * - Addition with identity 0 and inverses (negation)
 * - Multiplication with identity 1
 * - Standard associative, commutative, and distributive properties
 *
 * Mathematically, `ℤ` is characterized by:
 *
 * - Discreteness: There is a distinct successor and predecessor for each integer
 * - Total ordering: For any two integers, one is greater than, equal to, or less
 *   than the other
 * - Euclidean property: For any integers `a` and `b` where `b ≠ 0`, there exist
 *   unique `q`, `r` such that `a = bq + r` where `0 ≤ r < |b|`
 *
 * In the type system hierarchy:
 *
 * - {@link module:NaturalNumber} is a proper subset of `Integer` (`ℕ₀ ⊂ ℤ`)
 * - `Integer` is a proper subset of JavaScript's native {@link module:Number} (`ℤ
 *   ⊂ ℝ`)
 *
 * @module Integer
 * @since 3.14.6
 */

import type * as Brand from "./Brand.js"
import type * as Either from "./Either.js"
import * as _Equivalence from "./Equivalence.js"
import { dual, flow } from "./Function.js"
import * as internal from "./internal/number.js"
import * as NaturalNumber from "./NaturalNumber.js"
import * as _Option from "./Option.js"
import * as _Order from "./Order.js"
import type { Ordering } from "./Ordering.js"
import * as _Predicate from "./Predicate.js"
import * as _Schema from "./Schema.js"

/**
 * A type representing the set of integers (`ℤ = {..., -2, -1, 0, 1, 2, ...}`).
 *
 * The `Integer` type is a branded subset of JavaScript's number type that
 * enforces integer values at compile-time through TypeScript's type system.
 * This provides both mathematical correctness and type safety by preventing
 * operations that would expect integers from accidentally receiving fractional
 * numbers.
 *
 * @remarks
 * **Mathematical properties of the integer set (ℤ)**:
 *
 * - Closure under addition: `∀a,b ∈ ℤ`, `a + b ∈ ℤ`
 * - Closure under subtraction: `∀a,b ∈ ℤ`, `a - b ∈ ℤ`
 * - Closure under multiplication: `∀a,b ∈ ℤ`, `a × b ∈ ℤ`
 * - Non-closure under division: `∃a,b ∈ ℤ` such that `a ÷ b ∉ ℤ`
 *
 * @memberof Integer
 * @since 3.14.6
 * @category Type
 * @example
 *
 * ```ts
 * import * as Integer from "effect/Integer"
 *
 * // Type safety through compile-time checking
 * function onlyInts(int: Integer.Integer): void {
 *   // Operations that require integers
 * }
 *
 * onlyInts(Integer.of(1)) // OK: 1 is an integer
 * onlyInts(Integer.of(-42)) // OK: -42 is an integer
 *
 * // @ts-expect-error - This will not compile because 1.5 is not branded integer
 * onlyInts(1.5)
 *
 * // Using predicates for runtime validation
 * const numbers = [1, 2.5, 3, 4.7, 5]
 * const onlyIntegers = numbers.filter(Integer.isInteger).map(Integer.of)
 * // onlyIntegers: Integer.Integer[] = [1, 3, 5]
 * ```
 *
 * @experimental
 */
export type Integer = internal.Integer

/**
 * Constructs a value in the set of integers (ℤ) and brands it as an `Integer`
 * type.
 *
 * This function:
 *
 * 1. Validates at runtime that the input number is an integer (a member of ℤ)
 * 2. Associates the TypeScript type brand `Integer` with the value for
 *    compile-time type safety
 *
 * The function performs strict validation to ensure mathematical correctness.
 * **It throws an error if the provided value is not a member of the integer set
 * `ℤ = {..., -2, -1, 0, 1, 2, ...}`**.
 *
 * @memberof Integer
 * @since 3.14.6
 * @category Constructors
 * @example
 *
 * ```ts
 * import * as Integer from "effect/Integer"
 * import assert from "node:assert/strict"
 *
 * // Successful cases (members of ℤ)
 * const positiveInt = Integer.of(42) // OK: 42 ∈ ℤ
 * const negativeInt = Integer.of(-7) // OK: -7 ∈ ℤ
 * const zero = Integer.of(0) // OK: 0 ∈ ℤ
 *
 * // Runtime validation prevents non-integers
 * const notAnInteger = 1.5 // 1.5 ∉ ℤ
 *
 * assert.throws(() => {
 *   Integer.of(notAnInteger) // Throws error: "Expected 1.5 to be an integer"
 * })
 *
 * // Type safety in use
 * function requiresInteger(i: Integer.Integer): Integer.Integer {
 *   return Integer.sum(i, Integer.of(1)) // Safe integer operation
 * }
 *
 * const result = requiresInteger(Integer.of(5)) // OK
 *
 * // @ts-expect-error - Type checking prevents passing non-Integer values
 * requiresInteger(10) // Type error: '10' is not assignable to parameter of type 'Integer'
 * ```
 *
 * @param n - The number to be validated and lifted into the set of Integers.
 * @returns The input value branded with the `Integer` type.
 * @throws {Brand.BrandErrors} When the input is not an integer (i.e., when n ∉
 *   ℤ).
 * @experimental
 */
export const of: {
  (n: number): Integer
} = (n) => internal.IntegerConstructor(n)

/**
 * Safely attempts to construct a value in the set of integers (ℤ) from a
 * number, returning an `Option` that contains the Integer if the input is a
 * member of ℤ.
 *
 * For the function `f: ℝ → Option<ℤ>` defined by:
 *
 * - `f(n) = Some(n)` when `n ∈ ℤ`
 * - `f(n) = None` when `n ∉ ℤ`
 * - **Domain**: The set of real numbers (ℝ, represented by JavaScript's number
 *   type)
 * - **Codomain**: Option<ℤ> (an option of integers)
 *
 * @remarks
 * This function provides a safe alternative to {@link module:Integer.of} by
 * performing a non-throwing validation that the input number is an integer. It
 * returns:
 *
 * - `Some(n)` when the input is a member of the integer set `ℤ = {..., -2, -1, 0,
 *   1, 2, ...}`
 * - `None` when the input is not an integer (including `NaN`, `Infinity`, and
 *   fractional numbers)
 *
 * @memberof Integer
 * @since 3.14.6
 * @category Constructors
 * @example
 *
 * ```ts
 * import { Option, pipe } from "effect"
 * import * as I from "effect/Integer"
 * import * as RealNumber from "effect/Number"
 * import * as assert from "node:assert/strict"
 *
 * // Members of ℤ return Some<Integer>
 * assert.deepStrictEqual(I.option(42), Option.some(I.of(42)))
 * assert.deepStrictEqual(I.option(0), Option.some(I.zero))
 * assert.deepStrictEqual(I.option(-7), Option.some(I.of(-7)))
 *
 * // Non-integers (not in ℤ) return None
 * assert.deepStrictEqual(I.option(3.14), Option.none())
 * assert.deepStrictEqual(I.option(NaN), Option.none())
 * assert.deepStrictEqual(I.option(Infinity), Option.none())
 *
 * // Safe operations on values of unknown integer status
 * const safelyDouble = (n: number): Option.Option<I.Integer> =>
 *   pipe(
 *     I.option(n),
 *     Option.map((int) => I.multiply(int, I.of(2)))
 *   )
 *
 * assert.deepStrictEqual(safelyDouble(5), Option.some(I.of(10)))
 * assert.deepStrictEqual(safelyDouble(5.5), Option.none())
 *
 * // Handling integer membership testing with Option.match
 * const classifyNumber = (n: number): string =>
 *   pipe(
 *     I.option(n),
 *     Option.match({
 *       onNone: () => `${n} is not in the set of integers (ℤ)`,
 *       onSome: (int) => `${int} is a member of the integer set (ℤ)`
 *     })
 *   )
 *
 * assert.equal(classifyNumber(42), "42 is a member of the integer set (ℤ)")
 * assert.equal(
 *   classifyNumber(4.2),
 *   "4.2 is not in the set of integers (ℤ)"
 * )
 *
 * // Converting from string inputs safely
 * const parseIntegerSafely = (s: string): Option.Option<I.Integer> =>
 *   pipe(s, RealNumber.parse, Option.flatMap(I.option))
 *
 * assert.deepStrictEqual(parseIntegerSafely("42"), Option.some(I.of(42)))
 * assert.deepStrictEqual(parseIntegerSafely("3.14"), Option.none())
 * assert.deepStrictEqual(parseIntegerSafely("not a number"), Option.none())
 * ```
 *
 * @param n - The number to be validated as a member of the integer set ℤ
 * @returns An `Option` containing the integer if valid (i.e., `n ∈ ℤ`), `None`
 *   otherwise
 * @experimental
 */
export const option: (n: number) => _Option.Option<Integer> = internal.IntegerConstructor.option

/**
 * Validates whether a number is a member of the integer set (ℤ), returning
 * either an `Integer` or detailed error information.
 *
 * For the function `f: ℝ → Either<BrandErrors, ℤ>` defined by:
 *
 * - `f(n) = Right(n)` when `n ∈ ℤ`
 * - `f(n) = Left(errors)` when `n ∉ ℤ`
 * - **Domain**: The set of real numbers (`ℝ`, represented by JavaScript's number
 *   type)
 * - **Codomain**: `Either<BrandErrors, ℤ>` (either brand errors or `integers`)
 *
 * @remarks
 * This function is similar to {@link module:Integer.option} but provides
 * detailed error information when the input is not a valid integer. It
 * returns:
 *
 * - `Right(n)` when the input is a member of the integer set `ℤ = {..., -2, -1,
 *   0, 1, 2, ...}`
 * - `Left(errors)` when the input is not an integer, with specific validation
 *   error messages
 *
 * This constructor is particularly useful in validation scenarios where you
 * need to collect and report detailed error information.
 * @memberof Integer
 * @since 3.14.6
 * @category Constructors
 * @example
 *
 * ```ts
 * import { type Brand, Either, Option, pipe } from "effect"
 * import * as I from "effect/Integer"
 * import * as assert from "node:assert/strict"
 *
 * // Members of ℤ return Right<Integer>
 * assert.deepStrictEqual(I.either(42), Either.right(I.of(42)))
 * assert.deepStrictEqual(I.either(0), Either.right(I.zero))
 * assert.deepStrictEqual(I.either(-7), Either.right(I.of(-7)))
 *
 * // Non-integers (not in ℤ) return Left<BrandErrors>
 * assert.equal(Either.isLeft(I.either(3.14)), true)
 * assert.equal(Either.isLeft(I.either(Number.NaN)), true)
 * assert.equal(Either.isLeft(I.either(Infinity)), true)
 *
 * // Extracting error information for invalid inputs
 * const Pi = 3.14
 * const floatResult = I.either(Pi)
 * if (Either.isLeft(floatResult)) {
 *   assert.deepEqual(
 *     pipe(
 *       Either.getLeft(floatResult),
 *       // Error messages detail the validation failure
 *       Option.map(([{ message }]) => message)
 *     ),
 *     Option.some(`Expected (${Pi}) to be an integer`)
 *   )
 * }
 *
 * // Mapping over valid integers with Either
 * const doubleIfValid = (
 *   n: number
 * ): Either.Either<I.Integer, Brand.Brand.BrandErrors> =>
 *   pipe(
 *     I.either(n),
 *     Either.map((int) => I.multiply(int, I.of(2)))
 *   )
 *
 * assert.deepStrictEqual(doubleIfValid(5), Either.right(I.of(10)))
 * assert.equal(Either.isLeft(doubleIfValid(5.5)), true)
 *
 * // Handling both cases with Either.match
 * const classifyNumber = (n: number): string =>
 *   pipe(
 *     I.either(n),
 *     Either.match({
 *       onLeft: ([{ message }]) => `Validation error: ${message}`,
 *       onRight: (int) => `${int} is a valid member of ℤ`
 *     })
 *   )
 *
 * assert.equal(classifyNumber(42), "42 is a valid member of ℤ")
 * assert.equal(
 *   classifyNumber(3.14),
 *   "Validation error: Expected (3.14) to be an integer"
 * )
 *
 * // For form validation and user input processing
 * const processUserInput = (input: string): string =>
 *   pipe(
 *     Number.parseFloat(input),
 *     I.either,
 *     Either.match({
 *       onLeft: ([{ message }]) => `Invalid input: ${message}`,
 *       onRight: (int) => `You entered the integer ${int}`
 *     })
 *   )
 *
 * assert.equal(processUserInput("42"), "You entered the integer 42")
 * assert.equal(
 *   processUserInput("3.14"),
 *   "Invalid input: Expected (3.14) to be an integer"
 * )
 * assert.equal(
 *   processUserInput("not a number"),
 *   "Invalid input: Expected (NaN) to be an integer"
 * )
 * ```
 *
 * @param n - The number to be validated as a member of the integer set ℤ
 * @returns An `Either` containing the integer on the right if valid (i.e., `n ∈
 *   ℤ`), or validation errors on the left otherwise
 * @experimental
 */
export const either: (
  n: number
) => Either.Either<Integer, Brand.Brand.BrandErrors> = internal.IntegerConstructor.either

/**
 * A Schema for Integer values.
 *
 * This Schema allows for seamless integration between the Integer module and
 * the Schema module, enabling validation, parsing, and composition of Integer
 * values within the Schema ecosystem.
 *
 * @remarks
 * The Integer.Schema serves as a bridge between the "pure" world of the Integer
 * module and the Schema module, allowing you to leverage all the benefits that
 * Schema provides such as:
 *
 * - Validation and parsing of input data
 * - Composition with other schemas
 * - Integration with Schema combinators
 * - Type-safe transformations
 *
 * Under the hood, it uses `Schema.fromBrand` with the Integer brand constructor
 * to create a schema that validates that values are valid integers.
 * @since 3.14.6
 * @category Constructors
 * @example
 *
 * ```ts
 * import { pipe, flow, Schema, Option } from "effect"
 * import * as Integer from "effect/Integer"
 *
 * // Decode a number to an Integer
 * const result = Schema.decodeUnknownSync(Integer.Schema)(42)
 * // result: Right<Integer>
 *
 * // Combine with other Schema operations
 * const isInteger = Schema.is(Integer.Schema)
 * isInteger(42) // true
 * isInteger(3.14) // false
 *
 * // Use in a pipeline with Integer operations
 * const process = flow(
 *   Schema.decodeUnknownOption(Integer.Schema),
 *   Option.flatMap((n) =>
 *     pipe(
 *       n,
 *       Integer.multiply(Integer.of(2)),
 *       Integer.sum(Integer.of(10)),
 *       Integer.divideSafe(Integer.of(5))
 *     )
 *   )
 * )
 *
 * process(5) // Some(4) - ((5 * 2) + 10) / 5 = 20 / 5 = 4
 * process(3.14) // None - not an integer
 * ```
 */
export const Schema: _Schema.Schema<Integer, number> = _Schema.Number.pipe(
  _Schema.fromBrand(internal.IntegerConstructor)
)

/**
 * Constant of `Integer<0>`
 *
 * @memberof Integer
 * @since 3.14.6
 * @category Constants
 * @experimental
 */
export const zero: Integer = internal.zero

/**
 * Constant of `Integer<1>`
 *
 * @memberof Integer
 * @since 3.14.6
 * @category Constants
 * @experimental
 */
export const one: Integer = internal.one

/**
 * Type guard to test if a value is a member of the integer set (ℤ).
 *
 * This function performs both:
 *
 * 1. A runtime check to verify the value is a number that belongs to ℤ
 * 2. A TypeScript type refinement that narrows the type to `Integer` when used in
 *    conditionals
 *
 * In mathematical terms, this predicate tests whether a value is a member of
 * the set `ℤ = {..., -2, -1, 0, 1, 2, ...}` by checking if it's a number with
 * no fractional part.
 *
 * @memberof Integer
 * @since 3.14.6
 * @category Guards
 * @example
 *
 * ```ts
 * import assert from "node:assert/strict"
 * import * as Integer from "effect/Integer"
 *
 * // Testing various values
 * assert.equal(Integer.isInteger(1), true) // 1 ∈ ℤ
 * assert.equal(Integer.isInteger(-42), true) // -42 ∈ ℤ
 * assert.equal(Integer.isInteger(0), true) // 0 ∈ ℤ
 * assert.equal(Integer.isInteger(1.5), false) // 1.5 ∉ ℤ
 * assert.equal(Integer.isInteger(NaN), false) // NaN ∉ ℤ
 * assert.equal(Integer.isInteger(Infinity), false) // Infinity ∉ ℤ
 * assert.equal(Integer.isInteger("123"), false) // Strings ∉ ℤ
 * assert.equal(Integer.isInteger(true), false) // Booleans ∉ ℤ
 * assert.equal(Integer.isInteger(null), false) // null ∉ ℤ
 *
 * // Type refinement behavior
 * function processValue(value: unknown): string {
 *   if (Integer.isInteger(value)) {
 *     // In this branch, TypeScript knows that value is an Integer
 *     const doubled: Integer.Integer = Integer.multiply(
 *       value,
 *       Integer.of(2)
 *     )
 *     return `Integer: ${doubled}`
 *   }
 *   return "Not an integer"
 * }
 *
 * assert.equal(processValue(5), "Integer: 10")
 * assert.equal(processValue(3.14), "Not an integer")
 *
 * // IMPORTANT TypeScript BEHAVIOR NOTE:
 * const definitelyAFloat = 1.5
 * let anInt: Integer.Integer
 *
 * if (Integer.isInteger(definitelyAFloat)) {
 *   // TypeScript allows this assignment because the type guard has refined
 *   // 'definitelyAFloat' to an Integer within this branch.
 *   // However, this code branch is unreachable at runtime since 1.5 is not an integer!
 *   anInt = definitelyAFloat
 * }
 *
 * // Filtering collections for integers
 * const mixedNumbers = [1, 2.5, 3, 4.7, 5]
 * const onlyIntegers = mixedNumbers.filter(Integer.isInteger)
 * assert.deepEqual(onlyIntegers, [1, 3, 5])
 * ```
 *
 * @param input - The value to test for membership in the integer set ℤ
 * @returns `true` if the value is a number with no fractional part (i.e., a
 *   member of ℤ), `false` otherwise.
 * @experimental
 */
export const isInteger: _Predicate.Refinement<unknown, Integer> = (input) =>
  _Predicate.isNumber(input) && internal.IntegerConstructor.is(input)

/**
 * Computes the absolute value of an integer, returning a natural number.
 *
 * @remarks
 * The absolute value function maps each integer to its distance from zero,
 * removing any negative sign. Mathematically, this function implements:
 *
 * - `|n| = n` if `n ≥ 0`
 * - `|n| = -n` if `n < 0`
 *
 * **Key mathematical properties**:
 *
 * - **Non-negativity**: `|n| ≥ 0` for all `n ∈ ℤ`
 * - **Symmetry**: `|-n| = |n|` for all `n ∈ ℤ`
 * - **Triangle inequality**: `|n + m| ≤ |n| + |m|` for all `n, m ∈ ℤ`
 * - **Multiplicative**: `|n × m| = |n| × |m|` for all `n, m ∈ ℤ`
 *
 * Since the absolute value of any integer is always non-negative, the return
 * type is {@link module:NaturalNumber.NaturalNumber} rather than `Integer`,
 * providing stronger type guarantees about the result.
 *
 * Note that since `ℕ₀ ⊂ ℤ` (natural numbers are a subset of integers), the
 * `NaturalNumber` **result can still be passed to any function expecting an
 * Integer**. This enables seamless chaining with other Integer operations while
 * maintaining the additional type information when desired.
 * @memberof Integer
 * @since 3.14.6
 * @category Math
 * @example
 *
 * ```ts
 * import { pipe } from "effect"
 * import * as I from "effect/Integer"
 * import * as N from "effect/NaturalNumber"
 * import * as assert from "node:assert/strict"
 *
 * // Basic usage
 * assert.equal(I.abs(I.of(5)), N.of(5))
 * assert.equal(I.abs(I.of(-5)), N.of(5))
 * assert.equal(I.abs(I.of(0)), N.of(0))
 *
 * // Verify mathematical properties
 * const a = I.of(-7)
 * const b = I.of(3)
 *
 * // Symmetry
 * assert.equal(I.abs(I.of(-a)), I.abs(a))
 *
 * // Multiplicative property
 * const absProduct: N.NaturalNumber = I.abs(
 *   I.multiply(a, b) // -21
 * ) // 21
 * const productOfAbs: N.NaturalNumber = N.multiply(
 *   I.abs(a), // 7
 *   I.abs(b) // 3
 * ) // 21
 * assert.equal(absProduct, productOfAbs)
 *
 * // Using with other Integer operations
 * const _magnitude = I.abs(
 *   I.subtract(I.of(-10), I.of(5)) // -5
 * ) // 5 as NaturalNumber
 *
 * // Chaining with other Integer operations (NaturalNumber can be used as an Integer)
 * assert.equal(
 *   pipe(
 *     I.of(-42),
 *     I.abs, // Returns NaturalNumber 42
 *     I.multiply(I.of(2)) // Works because NaturalNumber can be used as an Integer
 *   ),
 *   84
 * )
 *
 * // Working with potentially negative values
 * function getDistance(a: I.Integer, b: I.Integer): N.NaturalNumber {
 *   return pipe(I.subtract(b, a), I.abs)
 * }
 *
 * assert.deepStrictEqual(getDistance(I.of(10), I.of(15)), N.of(5)) // 15 - 10 = 5
 * assert.deepStrictEqual(getDistance(I.of(15), I.of(10)), N.of(5)) // 10 - 15 = -5, abs(-5) = 5
 * ```
 *
 * @param n - The integer whose absolute value is to be computed
 * @returns The absolute value of n as a natural number
 */
export const abs: {
  (n: Integer): NaturalNumber.NaturalNumber
} = flow(Math.abs, NaturalNumber.of)

/**
 * Returns the additive inverse of an integer, effectively negating it.
 *
 * @memberof Integer
 * @since 3.14.6
 * @example
 *
 * ```ts
 * import * as assert from "node:assert/strict"
 * import { pipe } from "effect"
 * import * as Integer from "effect/Integer"
 *
 * assert.equal(
 *   Integer.negate(Integer.of(5)), //
 *   Integer.of(-5)
 * )
 *
 * assert.equal(
 *   Integer.negate(Integer.of(-5)), //
 *   Integer.of(5)
 * )
 *
 * assert.equal(
 *   Integer.negate(Integer.of(0)), //
 *   Integer.of(0)
 * )
 * ```
 *
 * @param n - The integer value to be negated.
 * @returns The negated integer value.
 */
export const negate: {
  (n: Integer): Integer
} = internal.negate<Integer>

/**
 * Performs addition in the set of integers (ℤ), preserving closure within the
 * integer domain.
 *
 * @remarks
 * For the binary operation `(+): ℤ × ℤ → ℤ` defined by standard addition, this
 * function implements the mathematical notion of addition on integers with the
 * following properties:
 *
 * - **Closure**: For all `a, b ∈ ℤ`, `a + b ∈ ℤ`
 * - **Associativity**: For all `a, b, c ∈ ℤ`, `(a + b) + c = a + (b + c)`
 * - **Commutativity**: For all `a, b ∈ ℤ`, `a + b = b + a`
 * - **Identity element**: There exists `0 ∈ ℤ` such that for all `a ∈ ℤ`, `a + 0
 *   = 0 + a = a`
 * - **Inverse elements**: For every `a ∈ ℤ`, there exists `−a ∈ ℤ` such that `a +
 *   (−a) = (−a) + a = 0`
 *
 * The addition operation maintains type safety through the Integer branded
 * type.
 * @memberof Integer
 * @since 3.14.6
 * @category Math
 * @experimental
 */
export const sum: {
  /**
   * Returns a function that adds a specified integer to its argument.
   *
   * **Data-last API** (a.k.a. pipeable)
   *
   * @example
   *
   * ```ts
   * import * as assert from "node:assert/strict"
   * import { pipe } from "effect"
   * import * as Integer from "effect/Integer"
   *
   * assert.equal(
   *   pipe(
   *     Integer.of(10),
   *     Integer.sum(Integer.of(-10)), // 10 + (-10) = 0
   *     Integer.sum(Integer.zero), // 0 + 0 = 0
   *     Integer.sum(Integer.of(1)) // 0 + 1 = 1
   *   ),
   *   1
   * )
   *
   * // Addition with negative integers
   * assert.equal(
   *   pipe(
   *     Integer.of(-5),
   *     Integer.sum(Integer.of(-3)) // (-5) + (-3) = -8
   *   ),
   *   -8
   * )
   *
   * // Demonstrating commutativity: a + b = b + a
   * const a = Integer.of(7)
   * const b = Integer.of(3)
   * assert.equal(pipe(a, Integer.sum(b)), pipe(b, Integer.sum(a)))
   * ```
   *
   * @param that - The integer to add to the input of the resulting function
   * @returns A function that takes an integer and returns the sum of that
   *   integer and `that`
   */
  (that: Integer): (self: Integer) => Integer

  /**
   * Adds two integers together.
   *
   * **Data-first API**
   *
   * @example
   *
   * ```ts
   * import * as assert from "node:assert/strict"
   * import * as Integer from "effect/Integer"
   *
   * assert.equal(
   *   Integer.sum(Integer.of(10), Integer.of(-10)), // 10 + (-10) = 0
   *   Integer.zero
   * )
   *
   * // Addition with positive integers
   * assert.equal(
   *   Integer.sum(Integer.of(25), Integer.of(17)), // 25 + 17 = 42
   *   42
   * )
   *
   * // Addition with mixed signs
   * assert.equal(
   *   Integer.sum(Integer.of(30), Integer.of(-12)), // 30 + (-12) = 18
   *   18
   * )
   *
   * // Identity property: a + 0 = a
   * const a = Integer.of(42)
   * assert.equal(Integer.sum(a, Integer.zero), a)
   *
   * // Demonstrating associativity: (a + b) + c = a + (b + c)
   * const b = Integer.of(5)
   * const c = Integer.of(3)
   * assert.equal(
   *   Integer.sum(Integer.sum(a, b), c),
   *   Integer.sum(a, Integer.sum(b, c))
   * )
   * ```
   *
   * @param self - The first integer addend
   * @param that - The second integer addend
   * @returns The sum of the two integers, which is also an integer (closure
   *   property of ℤ)
   */
  (self: Integer, that: Integer): Integer
} = dual(2, internal.sum<Integer>)

/**
 * Takes an `Iterable` of `Integer`s and returns their sum as a single
 * `Integer`.
 *
 * @memberof Integer
 * @since 3.14.6
 * @category Math
 * @example
 *
 * ```ts
 * import * as assert from "node:assert/strict"
 * import { HashSet } from "effect"
 * import * as Integer from "effect/Integer"
 *
 * assert.equal(
 *   Integer.sumAll(
 *     HashSet.make(Integer.of(-2), Integer.of(-3), Integer.of(4))
 *   ), //
 *   Integer.of(-1)
 * )
 * ```
 *
 * @param collection - An `Iterable<Integer>` to reduce to a sum.
 * @returns The sum of the `Integer`s in the `Iterable`.
 * @experimental
 */
export const sumAll: {
  (collection: Iterable<Integer>): Integer
} = internal.sumAll<Integer>

/**
 * Performs subtraction in the set of integers (ℤ), preserving closure within
 * the integer domain.
 *
 * @remarks
 * For the binary operation `(-): ℤ × ℤ → ℤ` defined by standard subtraction,
 * this function implements the mathematical notion of subtraction on integers
 * with the following properties:
 *
 * - **Closure**: For all `a, b ∈ ℤ`, `a - b ∈ ℤ`
 * - **Relation to addition**: For all `a, b ∈ ℤ`, `a - b = a + (-b)` where (-b)
 *   is the additive inverse of b
 * - **Non-commutativity**: In general, `a - b ≠ b - a` (unless `a = b`)
 * - **Right identity element**: For all `a ∈ ℤ`, `a - 0 = a`
 * - **Self-annihilation**: For all `a ∈ ℤ`, `a - a = 0`
 * - **Inverse relation**: For all `a, b ∈ ℤ`, `a - b = -(b - a)`
 *
 * The subtraction operation maintains type safety through the Integer branded
 * type.
 * @memberof Integer
 * @since 3.14.6
 * @category Math
 * @experimental
 */
export const subtract: {
  /**
   * Returns a function that subtracts a specified `subtrahend` from a given
   * `minuend`.
   *
   * **Data-last API** (a.k.a. pipeable)
   *
   * @example
   *
   * ```ts
   * import * as assert from "node:assert/strict"
   * import { pipe } from "effect"
   * import * as Integer from "effect/Integer"
   *
   * // Basic subtraction
   * assert.equal(
   *   pipe(Integer.of(10), Integer.subtract(Integer.of(7))), // 10 - 7 = 3
   *   3
   * )
   *
   * // Subtraction resulting in zero
   * assert.equal(
   *   pipe(Integer.of(10), Integer.subtract(Integer.of(10))), // 10 - 10 = 0
   *   Integer.zero
   * )
   *
   * // Subtraction resulting in a negative number
   * assert.equal(
   *   pipe(Integer.of(5), Integer.subtract(Integer.of(8))), // 5 - 8 = -3
   *   -3
   * )
   *
   * // Chaining multiple operations
   * assert.equal(
   *   pipe(
   *     Integer.of(20),
   *     Integer.subtract(Integer.of(5)), // 20 - 5 = 15
   *     Integer.subtract(Integer.of(10)), // 15 - 10 = 5
   *     Integer.subtract(Integer.of(-3)) // 5 - (-3) = 5 + 3 = 8
   *   ),
   *   8
   * )
   * ```
   *
   * @param subtrahend - The integer to subtract from the `minuend` when the
   *   resultant function is invoked.
   * @returns A function that takes a `minuend` and returns the `difference` of
   *   subtracting the `subtrahend` from it.
   */
  (subtrahend: Integer): (minuend: Integer) => Integer

  /**
   * Subtracts the `subtrahend` from the `minuend` and returns the difference.
   *
   * **Data-first API**
   *
   * @example
   *
   * ```ts
   * import * as assert from "node:assert/strict"
   * import * as Integer from "effect/Integer"
   *
   * // Basic subtraction
   * assert.equal(
   *   Integer.subtract(Integer.of(10), Integer.of(7)), // 10 - 7 = 3
   *   3
   * )
   *
   * // Subtraction resulting in zero (self-annihilation property)
   * assert.equal(
   *   Integer.subtract(Integer.of(10), Integer.of(10)), // 10 - 10 = 0
   *   Integer.zero
   * )
   *
   * // Subtraction with negatives
   * assert.equal(
   *   Integer.subtract(Integer.of(-5), Integer.of(-8)), // (-5) - (-8) = -5 + 8 = 3
   *   3
   * )
   *
   * // Demonstrating right identity: a - 0 = a
   * const a = Integer.of(42)
   * assert.equal(Integer.subtract(a, Integer.zero), a)
   *
   * // Demonstrating non-commutativity: a - b ≠ b - a
   * const b = Integer.of(30)
   * const c = Integer.of(20)
   * assert.notEqual(
   *   Integer.subtract(b, c), // 30 - 20 = 10
   *   Integer.subtract(c, b) // 20 - 30 = -10
   * )
   *
   * // Demonstrating inverse relation: a - b = -(b - a)
   * assert.equal(Integer.subtract(b, c), -Integer.subtract(c, b))
   * ```
   *
   * @param minuend - The integer from which another integer is to be
   *   subtracted.
   * @param subtrahend - The integer to subtract from the minuend.
   * @returns The difference of subtracting the subtrahend from the minuend,
   *   which is also an integer (closure property of ℤ).
   */
  (minuend: Integer, subtrahend: Integer): Integer
} = dual(2, internal.subtract<Integer>)

/**
 * Performs multiplication in the set of integers (ℤ), preserving closure within
 * the integer domain.
 *
 * @remarks
 * For the binary operation `(×): ℤ × ℤ → ℤ` defined by standard multiplication,
 * this function implements the mathematical notion of multiplication on
 * integers with the following properties:
 *
 * - **Closure**: For all `a, b ∈ ℤ`, `a × b ∈ ℤ`
 * - **Associativity**: For all `a, b, c ∈ ℤ`, `(a × b) × c = a × (b × c)`
 * - **Commutativity**: For all `a, b ∈ ℤ`, `a × b = b × a`
 * - **Distributivity over addition**: For all `a, b, c ∈ ℤ`, `a × (b + c) = (a ×
 *   b) + (a × c)`
 * - **Identity element**: There exists `1 ∈ ℤ` such that for all `a ∈ ℤ`, `a × 1
 *   = 1 × a = a`
 * - **Zero property**: For all `a ∈ ℤ`, `a × 0 = 0 × a = 0`
 * - **Sign rules**:
 *
 *   - Positive × Positive = Positive
 *   - Negative × Negative = Positive
 *   - Positive × Negative = Negative
 *   - Negative × Positive = Negative
 *
 * The multiplication operation maintains type safety through the Integer
 * branded type.
 * @memberof Integer
 * @since 3.14.6
 * @category Math
 * @experimental
 */
export const multiply: {
  /**
   * Returns a function that multiplies a specified `multiplicand` with a given
   * `multiplier`.
   *
   * **Data-last API** (a.k.a. pipeable)
   *
   * @example
   *
   * ```ts
   * import assert from "node:assert/strict"
   * import { pipe } from "effect"
   * import * as Integer from "effect/Integer"
   *
   * // Basic multiplication
   * assert.equal(
   *   pipe(
   *     Integer.of(2),
   *     Integer.multiply(Integer.of(3)) // 2 × 3 = 6
   *   ),
   *   6
   * )
   *
   * // Multiplication with negative numbers
   * assert.equal(
   *   pipe(
   *     Integer.of(-5),
   *     Integer.multiply(Integer.of(4)) // (-5) × 4 = -20
   *   ),
   *   -20
   * )
   *
   * // Multiplication by zero (annihilation property)
   * assert.equal(
   *   pipe(
   *     Integer.of(42),
   *     Integer.multiply(Integer.zero) // 42 × 0 = 0
   *   ),
   *   0
   * )
   *
   * // Chaining multiple operations
   * assert.equal(
   *   pipe(
   *     Integer.of(3),
   *     Integer.multiply(Integer.of(4)), // 3 × 4 = 12
   *     Integer.multiply(Integer.of(-2)) // 12 × (-2) = -24
   *   ),
   *   -24
   * )
   * ```
   *
   * @param multiplicand - The integer to multiply with the `multiplier` when
   *   the resultant function is invoked.
   * @returns A function that takes a `multiplier` and returns the `product` of
   *   multiplying the `multiplier` with the `multiplicand`.
   */
  (multiplicand: Integer): (multiplier: Integer) => Integer

  /**
   * Multiplies two integers and returns the resulting `product`.
   *
   * **Data-first API**
   *
   * @example
   *
   * ```ts
   * import assert from "node:assert/strict"
   * import * as Integer from "effect/Integer"
   *
   * // Basic multiplication
   * assert.equal(
   *   Integer.multiply(Integer.of(10), Integer.of(-10)), // 10 × (-10) = -100
   *   -100
   * )
   *
   * // Multiplication with two negative numbers
   * assert.equal(
   *   Integer.multiply(Integer.of(-7), Integer.of(-6)), // (-7) × (-6) = 42
   *   42
   * )
   *
   * // Identity property: a × 1 = a
   * const a = Integer.of(42)
   * assert.equal(Integer.multiply(a, Integer.of(1)), a)
   *
   * // Zero property: a × 0 = 0
   * assert.equal(
   *   Integer.multiply(Integer.of(123), Integer.zero),
   *   Integer.zero
   * )
   *
   * // Demonstrating commutativity: a × b = b × a
   * const b = Integer.of(6)
   * const c = Integer.of(7)
   * assert.equal(
   *   Integer.multiply(b, c), // 6 × 7 = 42
   *   Integer.multiply(c, b) // 7 × 6 = 42
   * )
   *
   * // Demonstrating associativity: (a × b) × c = a × (b × c)
   * const d = Integer.of(2)
   * assert.equal(
   *   Integer.multiply(Integer.multiply(b, c), d),
   *   Integer.multiply(b, Integer.multiply(c, d))
   * )
   * ```
   *
   * @param multiplier - The first integer to multiply.
   * @param multiplicand - The second integer to multiply.
   * @returns The `product` of the multiplier and the multiplicand, which is
   *   also an integer (closure property of ℤ).
   */
  (multiplier: Integer, multiplicand: Integer): Integer
} = dual(2, internal.multiply<Integer>)

/**
 * Takes an `Iterable` of `Integer`s and returns their multiplication as a
 * single `Integer`.
 *
 * @memberof Integer
 * @since 3.14.6
 * @category Math
 * @example
 *
 * ```ts
 * import * as assert from "node:assert/strict"
 * import { HashSet } from "effect"
 * import * as Integer from "effect/Integer"
 *
 * assert.equal(
 *   Integer.multiplyAll(
 *     HashSet.make(Integer.of(-2), Integer.of(-3), Integer.of(4))
 *   ), //
 *   Integer.of(24)
 * )
 * ```
 *
 * @param collection - An `Iterable<Integer>` to reduce to a product.
 * @returns The product of the `Integer`s in the `Iterable`.
 * @experimental
 */
export const multiplyAll: {
  (collection: Iterable<Integer>): Integer
} = internal.multiplyAll<Integer>

/**
 * Computes the power of an integer raised to a natural number exponent.
 *
 * For any integer base `b` and natural number exponent `n`, this function
 * computes `b^n`, which represents `b` multiplied by itself `n` times. When `n
 * = 0`, the result is `1` by convention.
 *
 * @remarks
 * **Mathematical properties of exponentiation**:
 *
 * - **Zero exponent**: `b^0 = 1` for any `b ≠ 0` (and by convention, `0^0 = 1`)
 * - **Unit exponent**: `b^1 = b` for any integer `b`
 * - **Negative base, even exponent**: produces a **positive result**
 * - **Negative base, odd exponent**: preserves the negative sign
 * - **Exponent addition**: `b^(m+n) = b^m × b^n`
 * - **Exponent multiplication**: `(b^m)^n = b^(m×n)`
 * - **Product of bases**: `(a×b)^n = a^n × b^n`
 *
 * The domain of this function is restricted to "natural number exponents" to
 * ensure the result always remains an integer. Negative exponents would produce
 * fractional results that fall outside the integer domain.
 * @memberof Integer
 * @since 3.14.6
 * @category Math
 * @example
 *
 * ```ts
 * import { pipe } from "effect"
 * import * as I from "effect/Integer"
 * import * as N from "effect/NaturalNumber"
 * import * as assert from "node:assert/strict"
 *
 * // Basic usage
 * assert.equal(I.pow(I.of(2), N.of(3)), 8) // 2³ = 8
 * assert.equal(I.pow(I.of(3), N.of(4)), 81) // 3⁴ = 81
 *
 * // Zero exponent case
 * assert.equal(I.pow(I.of(5), N.of(0)), 1) // 5⁰ = 1
 * assert.equal(I.pow(I.of(0), N.of(0)), 1) // 0⁰ = 1 (by convention)
 *
 * // Negative base with even/odd exponents
 * assert.equal(I.pow(I.of(-2), N.of(2)), 4) // (-2)² = 4
 * assert.equal(I.pow(I.of(-2), N.of(3)), -8) // (-2)³ = -8
 *
 * // Data-last style (pipeable)
 * assert.equal(
 *   pipe(
 *     I.of(3),
 *     I.pow(N.of(2)) // 3² = 9
 *   ),
 *   9
 * )
 *
 * // Chaining operations
 * const result = pipe(
 *   I.of(2),
 *   I.pow(N.of(3)), // 2³ = 8
 *   I.multiply(I.of(2)), // 8 * 2 = 16
 *   I.pow(N.of(2)) // 16² = 256
 * )
 * assert.equal(result, 256)
 *
 * // Verify mathematical properties
 * const a = I.of(2)
 * const m = N.of(3)
 * const n = N.of(2)
 *
 * // Exponent addition: a^(m+n) = a^m × a^n
 * const sumExponent = I.pow(a, N.sum(m, n)) // 2^(3+2) = 2^5 = 32
 * const productPowers = I.multiply(
 *   I.pow(a, m), // 2^3 = 8
 *   I.pow(a, n) // 2^2 = 4
 * ) // 8 * 4 = 32
 * assert.equal(sumExponent, productPowers)
 * ```
 *
 * @see {@link module:Integer.square} - Specialized function for computing the square (`n²`)
 * @see {@link module:Integer.cube} - Specialized function for computing the cube (`n³`)
 */
export const pow: {
  /**
   * Returns a function that raises its input to the specified exponent.
   *
   * @param exponent - The natural number exponent
   * @returns A function that takes a base integer and returns it raised to the
   *   exponent
   */
  (exponent: NaturalNumber.NaturalNumber): (base: Integer) => Integer

  /**
   * Raises the base integer to the specified natural number exponent.
   *
   * @param base - The integer base
   * @param exponent - The natural number exponent
   * @returns The result of base raised to the exponent power
   */
  (base: Integer, exponent: NaturalNumber.NaturalNumber): Integer
} = dual(2, internal.pow)

/**
 * Computes the square of an integer (`n²`), returning a natural number.
 *
 * @remarks
 * For any integer `n`, the square function computes `n²`, which is equivalent
 * to `n × n`. Since squaring always produces a non-negative result regardless
 * of the input's sign, the return type is `NaturalNumber` rather than
 * `Integer`.
 *
 * **Mathematical properties**:
 *
 * - Non-negativity: `n² ≥ 0` for all `n ∈ ℤ`
 * - Symmetry: `(-n)² = n²` for all `n ∈ ℤ`
 * - Identity for 0 and 1: `0² = 0`, `1² = 1`
 * - Monotonicity: If `|a| < |b|`, then `a² < b²` for `a, b ∈ ℤ`
 *
 * The square function is implemented as a specialized case of the
 * {@link module:Integer.pow} function with an exponent of 2.
 * @memberof Integer
 * @since 3.14.6
 * @category Math
 * @example
 *
 * ```ts
 * import { pipe } from "effect"
 * import * as I from "effect/Integer"
 * import * as N from "effect/NaturalNumber"
 * import * as assert from "node:assert/strict"
 *
 * // Basic usage
 * assert.equal(I.square(I.of(5)), N.of(25))
 * assert.equal(I.square(I.of(-5)), N.of(25))
 * assert.equal(I.square(I.of(0)), N.of(0))
 *
 * // Demonstrating symmetry property: (-n)² = n²
 * const n = I.of(7)
 * assert.equal(I.square(n), I.square(I.of(-n)))
 *
 * // Using square with other operations
 * const x = I.of(4)
 * const y = I.of(3)
 *
 * // Computing the hypotenuse using the Pythagorean theorem
 * const hypotenuseSquared = N.sum(
 *   I.square(x), // 16
 *   I.square(y) // 9
 * ) // 25
 * assert.equal(hypotenuseSquared, N.of(25))
 *
 * // Compare with direct power function usage
 * assert.deepStrictEqual(
 *   pipe(I.of(4), I.square),
 *   N.of(pipe(I.of(4), I.pow(N.of(2))))
 * )
 * ```
 *
 * @param n - The integer to square
 * @returns The square of `n` as a natural number
 * @see {@link module:Integer.pow} - General power function for any natural number exponent
 * @see {@link module:Integer.cube} - Function to compute the cube (`n³`)
 */
export const square: (n: Integer) => NaturalNumber.NaturalNumber = internal.square

/**
 * Computes the cube of an integer (`n³`).
 *
 * For any integer `n`, the cube function computes `n³`, which is equivalent to
 * `n × n × n`. Unlike squaring, **cubing preserves the sign of the original
 * number**:
 *
 * - **Positive** integers produce **positive** cubes
 * - **Negative** integers produce **negative** cubes
 * - **Zero** produces zero
 *
 * @remarks
 * **Mathematical properties**:
 *
 * - **Sign preservation**: `sgn(n³) = sgn(n)` for all `n ∈ ℤ`
 * - **Identity for 0 and 1**: `0³ = 0`, `1³ = 1`
 * - **Odd function**: `(-n)³ = -(n³)` for all `n ∈ ℤ`
 * - **Monotonicity**: If `a < b`, then `a³ < b³` for `a, b ∈ ℤ`
 *
 * The cube function is implemented as a specialized case of the
 * {@link module:Integer.pow} function with an exponent of `3`.
 * @memberof Integer
 * @since 3.14.6
 * @category Math
 * @example
 *
 * ```ts
 * import * as assert from "node:assert/strict"
 * import { pipe } from "effect"
 * import * as I from "effect/Integer"
 * import * as N from "effect/NaturalNumber"
 *
 * // Basic usage with positive integers
 * assert.equal(I.cube(I.of(2)), 8)
 * assert.equal(I.cube(I.of(3)), 27)
 * assert.equal(I.cube(I.of(0)), 0)
 *
 * // Sign preservation with negative integers
 * assert.equal(I.cube(I.of(-2)), -8)
 * assert.equal(I.cube(I.of(-3)), -27)
 *
 * // Demonstrating odd function property: (-n)³ = -(n³)
 * const n = I.of(4)
 * assert.equal(I.cube(I.of(-n)), -I.cube(n))
 *
 * // Calculating the volume of a cube with side length 5
 * const sideLength = I.of(5)
 * const volume = I.cube(sideLength)
 * assert.equal(volume, 125)
 *
 * // Compare with direct power function usage
 * assert.equal(I.cube(I.of(4)), pipe(I.of(4), I.pow(N.of(3))))
 * ```
 *
 * @param n - The integer to cube
 * @returns The cube of n
 * @see {@link module:Integer.pow} - General power function for any natural number exponent
 * @see {@link module:Integer.square} - Function to compute the square (`n²`)
 */
export const cube: (n: Integer) => Integer = internal.cube

/**
 * Divides one integer by another, mapping from the domain of `Integers` to the
 * codomain of `real numbers` (represented as JavaScript's number type) to
 * accommodate possible fractional results.
 *
 * For the division function `f: ℤ × ℤ → Option<ℝ>` defined by:
 *
 * - `f(a, b) = Some(a / b)` when `b ≠ 0`
 * - `f(a, 0) = None` (division by zero is undefined)
 * - **Domain**: The set of ordered pairs of integers (`ℤ × ℤ`)
 * - **Codomain**: `Option<ℝ>` (an option of real numbers)
 *
 * **Syntax**
 *
 * ```ts
 * import * as assert from "node:assert/strict"
 * import { Option, pipe } from "effect"
 * import * as Integer from "effect/Integer"
 *
 * assert.deepStrictEqual(
 *   // data-last api
 *   pipe(Integer.of(-5), Integer.divideToNumber(Integer.of(-2))),
 *   // data-first api
 *   Integer.divideToNumber(Integer.of(-5), Integer.of(-2)) //   Option.some(2.5)
 * )
 * ```
 *
 * @remarks
 * Division is not a closed operation within the set of integers (`ℤ = {..., -2,
 * -1, 0, 1, 2, ...}`). When division doesn't yield a whole number, the result
 * is a fractional number outside ℤ. This function widens to JavaScript's number
 * type (representing ℝ) to accommodate all possible results, and returns an
 * Option to handle the undefined case of division by zero.
 *
 * **Mathematical properties of division on integers**:
 *
 * - **Non-closure in ℤ**: The image of f is not contained within ℤ
 * - **Partiality**: Division by zero is undefined (represented as None)
 * - **Non-commutativity**: `f(a, b) ≠ f(b, a)` (unless `a = b = ±1`)
 * - **Non-associativity**: `f(f(a, b), c) ≠ f(a, f(b, c))` when all are defined
 * - **Right identity** elements: `f(a, ±1) = Some(±a)` for all `a ∈ ℤ`
 * - **No left identity** element: There is no `e ∈ ℤ` such that `f(e, a) =
 *   Some(a)` for all `a ∈ ℤ`
 * - Sign properties:
 *
 *   - `f(a, b) = f(-a, -b)` for all `a, b ∈ ℤ, b ≠ 0`
 *   - `f(-a, b) = f(a, -b) = -f(a, b)` for all `a, b ∈ ℤ, b ≠ 0`
 *
 * @memberof Integer
 * @since 3.14.6
 * @category Math
 * @experimental
 */
export const divideToNumber: {
  /**
   * Returns a function that divides a given `dividend` by a specified
   * `divisor`, mapping to the real number domain.
   *
   * **Data-last API** (a.k.a. pipeable)
   *
   * @example
   *
   * ```ts
   * import * as assert from "node:assert/strict"
   * import { Option, pipe } from "effect"
   * import * as Integer from "effect/Integer"
   *
   * // Division resulting in a whole number
   * assert.deepStrictEqual(
   *   pipe(Integer.of(6), Integer.divideToNumber(Integer.of(2))),
   *   Option.some(3)
   * )
   *
   * // Division mapping to a fractional number
   * assert.deepStrictEqual(
   *   pipe(Integer.of(5), Integer.divideToNumber(Integer.of(2))),
   *   Option.some(2.5)
   * )
   *
   * // Division with negative integers
   * assert.deepStrictEqual(
   *   pipe(Integer.of(6), Integer.divideToNumber(Integer.of(-3))),
   *   Option.some(-2)
   * )
   *
   * // Division by zero returns None
   * assert.deepStrictEqual(
   *   pipe(Integer.of(5), Integer.divideToNumber(Integer.zero)),
   *   Option.none()
   * )
   * ```
   *
   * @param divisor - The number by which the dividend will be divided.
   * @returns A function that takes a `dividend` and returns an `Option<number>`
   *   representing the result of the division. Returns `None` if division by
   *   zero is attempted; Otherwise, returns `Some<number>` with the result.
   */
  (divisor: Integer): (dividend: Integer) => _Option.Option<number>

  /**
   * Divides the `dividend` by the `divisor` and returns an `Option` containing
   * the `quotient`, mapping from integers to the real number domain.
   *
   * **Data-first API**
   *
   * @example
   *
   * ```ts
   * import * as assert from "node:assert/strict"
   * import { Option } from "effect"
   * import * as Integer from "effect/Integer"
   *
   * // Division resulting in a whole number
   * assert.deepStrictEqual(
   *   Integer.divideToNumber(Integer.of(6), Integer.of(-2)),
   *   Option.some(-3)
   * )
   *
   * // Division mapping to a fractional number
   * assert.deepStrictEqual(
   *   Integer.divideToNumber(Integer.of(5), Integer.of(2)),
   *   Option.some(2.5)
   * )
   *
   * // Division by zero returns None
   * assert.deepStrictEqual(
   *   Integer.divideToNumber(Integer.of(5), Integer.zero),
   *   Option.none()
   * )
   *
   * // Division with zero as dividend
   * assert.deepStrictEqual(
   *   Integer.divideToNumber(Integer.zero, Integer.of(5)),
   *   Option.some(0)
   * )
   * ```
   *
   * @param dividend - The Integer to be divided.
   * @param divisor - The Integer by which the dividend is divided.
   * @returns An `Option` containing the quotient of the division if valid,
   *   otherwise `None`.
   */
  (dividend: Integer, divisor: Integer): _Option.Option<number>
} = dual(2, internal.divide<Integer, number>)

/**
 * Implements **division as a partial function on integers** that ensures the
 * closure property, that results remain within the set of integers (`ℤ`), by
 * returning None when the result would fall outside ℤ.
 *
 * For the division function `f: ℤ × ℤ → Option<ℤ>` defined by:
 *
 * - `f(a, b) = Some(a / b)` when `b ≠ 0` and `a` is _exactly divisible_ by `b`
 * - `f(a, b) = None` when `b = 0` or `a` is _not exactly divisible_ by `b`
 * - **Domain**: The set of ordered pairs of integers (`ℤ × ℤ`)
 * - **Codomain**: `Option<ℤ>` (an option of integers)
 *
 * @remarks
 * Unlike {@link module:Integer.divideToNumber}, this operation preserves closure
 * within the integers domain by returning `None` when the result would be
 * fractional or when division is undefined. This creates a partial function
 * that is only defined when the divisor is non-zero and the dividend is exactly
 * divisible by the divisor.
 *
 * **Mathematical properties of safe division on integers**:
 *
 * - **Closure in `ℤ`**: When defined (Some case), the result is always in ℤ
 * - **Partiality**: The function is undefined (None) when divisor = 0 or when
 *   division would yield a fraction
 * - **Non-commutativity**: `f(a, b) ≠ f(b, a)` (unless `a = b = 0` or `a = b =
 *   ±1`)
 * - **Non-associativity**: `f(f(a, b), c) ≠ f(a, f(b, c))` when both sides are
 *   defined
 * - **Right identity elements**: `f(a, ±1) = Some(±a)` for all `a ∈ ℤ`
 * - **Divisibility property**: `f(a, b) = Some(q)` if and only if `a = b × q` for
 *   some `q ∈ ℤ`
 * - **Quotient uniqueness**: If `f(a, b) = Some(q)`, then `q` is the unique
 *   integer such that `a = b × q`
 * - **Sign properties**:
 *
 *   - `f(a, b) = f(-a, -b)` for all `a, b ∈ ℤ`, `b ≠ 0` (same signs yield positive)
 *   - `f(-a, b) = f(a, -b) = -f(a, b)` for all `a, b ∈ ℤ`, `b ≠ 0` (different signs
 *       yield negative)
 *
 * @memberof Integer
 * @since 3.14.6
 * @category Math
 * @experimental
 */
export const divideSafe: {
  /**
   * Returns a function that safely divides a given `dividend` by a specified
   * `divisor`, ensuring the result remains within the integers domain.
   *
   * **Data-last API** (a.k.a. pipeable)
   *
   * @example
   *
   * ```ts
   * import * as assert from "node:assert/strict"
   * import { pipe, Option } from "effect"
   * import * as Integer from "effect/Integer"
   *
   * // When dividend is exactly divisible by divisor, returns Some(result)
   * assert.deepStrictEqual(
   *   pipe(Integer.of(10), Integer.divideSafe(Integer.of(2))),
   *   Option.some(Integer.of(5))
   * )
   *
   * // When division would result in a fraction, returns None
   * assert.deepStrictEqual(
   *   pipe(Integer.of(5), Integer.divideSafe(Integer.of(2))),
   *   Option.none()
   * )
   *
   * // When dividing by zero, returns None
   * assert.deepStrictEqual(
   *   pipe(Integer.of(10), Integer.divideSafe(Integer.zero)),
   *   Option.none()
   * )
   *
   * // With negative numbers (both negative)
   * assert.deepStrictEqual(
   *   pipe(Integer.of(-6), Integer.divideSafe(Integer.of(-2))),
   *   Option.some(Integer.of(3))
   * )
   *
   * // With negative numbers (one negative)
   * assert.deepStrictEqual(
   *   pipe(Integer.of(-6), Integer.divideSafe(Integer.of(3))),
   *   Option.some(Integer.of(-2))
   * )
   *
   * // Can be used in pipelines with Option functions
   * assert.deepStrictEqual(
   *   pipe(
   *     Integer.of(12),
   *     Integer.divideSafe(Integer.of(-4)),
   *     Option.flatMap((n) => Integer.divideSafe(n, Integer.of(3))),
   *     Option.map((n) => Integer.add(n, Integer.of(2)))
   *   ),
   *   Option.some(Integer.of(1)) // 12/(-4) = -3, then -3/3 = -1, then -1+2 = 1
   * )
   * ```
   *
   * @param divisor - The `Integer` to divide the `dividend` by when the
   *   resultant function is invoked.
   * @returns A function that takes a `dividend` and returns an Option
   *   containing the integer quotient if the divisor is non-zero and the
   *   division yields an integer, or None otherwise.
   */
  (divisor: Integer): (dividend: Integer) => _Option.Option<Integer>

  /**
   * Safely divides the `dividend` by the `divisor`, returning an Option that
   * contains the result only if it remains within the integers domain.
   *
   * **Data-first API**
   *
   * @example
   *
   * ```ts
   * import * as assert from "node:assert/strict"
   * import { Option } from "effect"
   * import * as Integer from "effect/Integer"
   *
   * // When dividend is exactly divisible by divisor, returns Some(result)
   * assert.deepStrictEqual(
   *   Integer.divideSafe(Integer.of(6), Integer.of(3)),
   *   Option.some(Integer.of(2))
   * )
   *
   * // When division would result in a fraction, returns None
   * assert.deepStrictEqual(
   *   Integer.divideSafe(Integer.of(5), Integer.of(2)),
   *   Option.none()
   * )
   *
   * // When dividing by zero, returns None
   * assert.deepStrictEqual(
   *   Integer.divideSafe(Integer.of(10), Integer.zero),
   *   Option.none()
   * )
   *
   * // Division with zero as dividend and non-zero divisor
   * assert.deepStrictEqual(
   *   Integer.divideSafe(Integer.zero, Integer.of(5)),
   *   Option.some(Integer.zero),
   *   "Zero divided by any non-zero integer equals zero"
   * )
   *
   * // Division when both operands are zero
   * assert.deepStrictEqual(
   *   Integer.divideSafe(Integer.zero, Integer.zero),
   *   Option.none(),
   *   "Division by zero is undefined, even when the dividend is also zero"
   * )
   *
   * // Negative numbers (negative dividend)
   * assert.deepStrictEqual(
   *   Integer.divideSafe(Integer.of(-8), Integer.of(4)),
   *   Option.some(Integer.of(-2)),
   *   "Negative divided by positive gives negative"
   * )
   *
   * // Negative numbers (negative divisor)
   * assert.deepStrictEqual(
   *   Integer.divideSafe(Integer.of(8), Integer.of(-4)),
   *   Option.some(Integer.of(-2)),
   *   "Positive divided by negative gives negative"
   * )
   *
   * // Negative numbers (both negative)
   * assert.deepStrictEqual(
   *   Integer.divideSafe(Integer.of(-8), Integer.of(-4)),
   *   Option.some(Integer.of(2)),
   *   "Negative divided by negative gives positive"
   * )
   * ```
   *
   * @param dividend - The `Integer` to be divided.
   * @param divisor - The `Integer` to divide by.
   * @returns An Option containing the integer quotient if the divisor is
   *   non-zero and the division yields an integer, or None if the divisor is
   *   zero or the division would result in a fraction.
   */
  (dividend: Integer, divisor: Integer): _Option.Option<Integer>
} = dual(2, (dividend: Integer, divisor: Integer) => {
  if (divisor === zero) {
    return _Option.none()
  }
  if (dividend % divisor !== 0) {
    return _Option.none()
  }
  return option(dividend / divisor)
})

/**
 * Implements the `successor` operation on `integers`, adding one to the
 * provided integer.
 *
 * @remarks
 * This function represents the mathematical successor function `S: ℤ → ℤ`
 * defined by `S(n) = n + 1` for all `n ∈ ℤ`. It is equivalent to adding the
 * multiplicative identity element (1) to any integer.
 *
 * Properties of the increment operation:
 *
 * - **Closure in ℤ**: For all `n ∈ ℤ`, `S(n) = n + 1 ∈ ℤ`
 * - **Injectivity**: For all `a, b ∈ ℤ`, if `S(a) = S(b)`, then `a = b`
 * - **Non-surjectivity in ℕ**: When restricted to ℕ, there is no `n ∈ ℕ` such
 *   that `S(n) = 0`
 * - **Relation to addition**: `S(n) = n + 1` for all `n ∈ ℤ`
 *
 * @memberof Integer
 * @since 3.14.6
 * @category Math
 * @example
 *
 * ```ts
 * import { pipe } from "effect"
 * import * as I from "effect/Integer"
 * import * as assert from "node:assert/strict"
 *
 * // Basic increment operation
 * assert.strictEqual(I.increment(I.of(1)), I.of(2))
 * assert.strictEqual(I.increment(I.zero), I.of(1))
 *
 * // Incrementing negative numbers
 * assert.strictEqual(I.increment(I.of(-1)), I.zero)
 * assert.strictEqual(I.increment(I.of(-42)), I.of(-41))
 *
 * // Chaining multiple increments (creating n + 4)
 * assert.strictEqual(
 *   pipe(
 *     I.one,
 *     I.increment, // 1 + 1 = 2
 *     I.increment, // 2 + 1 = 3
 *     I.increment, // 3 + 1 = 4
 *     I.increment // 4 + 1 = 5
 *   ),
 *   I.of(5)
 * )
 *
 * // Equivalent to adding one
 * const n = I.of(37)
 * assert.strictEqual(I.increment(n), I.sum(n, I.one))
 * ```
 *
 * @param n - The integer value to be incremented.
 * @returns The successor of n (n + 1) as an `Integer`.
 * @experimental
 */
export const increment: (n: Integer) => Integer = internal.increment

/**
 * Implements the predecessor operation on integers, subtracting one from the
 * provided integer.
 *
 * @remarks
 * This function represents the mathematical predecessor function `P: ℤ → ℤ`
 * defined by `P(n) = n - 1` for all `n ∈ ℤ`. It is the inverse of the successor
 * (increment) operation and is equivalent to subtracting the multiplicative
 * identity element (1) from any integer.
 *
 * **Properties of the decrement operation**:
 *
 * - **Closure in ℤ**: For all `n ∈ ℤ`, `P(n) = n - 1 ∈ ℤ`
 * - **Injectivity**: For all `a, b ∈ ℤ`, if `P(a) = P(b)`, then `a = b`
 * - **Non-surjectivity in ℕ**: When restricted to ℕ, there is no `n ∈ ℕ` such
 *   that `P(0) ∈ ℕ`
 * - **Relation to subtraction**: `P(n) = n - 1` for all `n ∈ ℤ`
 * - **Inverse of increment**: `P(S(n)) = S(P(n)) = n` for all `n ∈ ℤ`
 *
 * @memberof Integer
 * @since 3.14.6
 * @category Math
 * @example
 *
 * ```ts
 * import * as assert from "node:assert/strict"
 * import { pipe } from "effect"
 * import * as Integer from "effect/Integer"
 *
 * // Basic decrement operation
 * assert.strictEqual(Integer.decrement(Integer.of(5)), Integer.of(4))
 * assert.strictEqual(Integer.decrement(Integer.zero), Integer.of(-1))
 *
 * // Decrementing negative numbers
 * assert.strictEqual(Integer.decrement(Integer.of(-100)), Integer.of(-101))
 *
 * // Chaining multiple decrements (creating n - 4)
 * assert.strictEqual(
 *   pipe(
 *     Integer.of(100),
 *     Integer.decrement, // 100 - 1 = 99
 *     Integer.decrement, // 99 - 1 = 98
 *     Integer.decrement, // 98 - 1 = 97
 *     Integer.decrement // 97 - 1 = 96
 *   ),
 *   Integer.of(96)
 * )
 *
 * // Decrementing through zero
 * assert.strictEqual(
 *   pipe(
 *     Integer.of(1),
 *     Integer.decrement, // 1 - 1 = 0
 *     Integer.decrement // 0 - 1 = -1
 *   ),
 *   Integer.of(-1)
 * )
 *
 * // Equivalent to subtracting one
 * const n = Integer.of(42)
 * assert.strictEqual(
 *   Integer.decrement(n),
 *   Integer.subtract(n, Integer.of(1))
 * )
 *
 * // Inverse relationship with increment
 * assert.strictEqual(Integer.decrement(Integer.increment(n)), n)
 * ```
 *
 * @param n - The integer value to be decremented.
 * @returns The predecessor of n (n - 1) as an `Integer`.
 * @experimental
 */
export const decrement: (n: Integer) => Integer = internal.decrement

/**
 * Type class instance of `Equivalence` for `Integer`.
 *
 * @memberof Integer
 * @since 3.14.6
 * @category Instances
 * @example
 *
 * ```ts
 * import * as assert from "node:assert/strict"
 * import * as Integer from "effect/Integer"
 *
 * assert.equal(Integer.Equivalence(Integer.of(1), Integer.of(1)), true)
 * assert.equal(Integer.Equivalence(Integer.of(1), Integer.of(2)), false)
 * ```
 *
 * @experimental
 */
export const Equivalence: _Equivalence.Equivalence<Integer> = _Equivalence.number

/**
 * Type class instance of `Order` for `Integer`.
 *
 * @memberof Integer
 * @since 3.14.6
 * @category Instances
 * @example
 *
 * ```ts
 * import * as assert from "node:assert/strict"
 * import * as Integer from "effect/Integer"
 *
 * assert.equal(Integer.Order(Integer.of(-1), Integer.of(2)), -1)
 *
 * assert.equal(Integer.Order(Integer.of(2), Integer.of(2)), 0)
 *
 * assert.equal(Integer.Order(Integer.of(2), Integer.of(-1)), 1)
 * ```
 *
 * @param self - The first `Integer` to compare.
 * @param that - The second `Integer` to compare.
 * @returns -1 if `self` is less than `that`, 0 if they are equal, and 1 if
 * @experimental
 */
export const Order: _Order.Order<Integer> = _Order.number

/**
 * Returns `true` if the first argument is less than the second, otherwise
 * `false`.
 *
 * @memberof Integer
 * @since 3.14.6
 * @category Predicates
 * @example
 *
 * ```ts
 * import * as assert from "node:assert"
 * import { pipe } from "effect"
 * import * as Integer from "effect/Integer"
 *
 * assert.deepStrictEqual(
 *   Integer.lessThan(Integer.of(2), Integer.of(3)),
 *   true
 * )
 *
 * assert.deepStrictEqual(
 *   pipe(Integer.of(3), Integer.lessThan(Integer.of(3))),
 *   false
 * )
 * ```
 *
 * @experimental
 */
export const lessThan: {
  /**
   * @example
   *
   * ```ts
   * import * as assert from "node:assert"
   * import { pipe } from "effect"
   * import * as Integer from "effect/Integer"
   *
   * assert.deepStrictEqual(
   *   pipe(
   *     Integer.of(2), //
   *     Integer.lessThan(Integer.of(3))
   *   ),
   *   true
   * )
   *
   * assert.deepStrictEqual(
   *   pipe(
   *     Integer.of(3), //
   *     Integer.lessThan(Integer.of(3))
   *   ),
   *   false
   * )
   *
   * assert.deepStrictEqual(
   *   pipe(
   *     Integer.of(4), //
   *     Integer.lessThan(Integer.of(3))
   *   ),
   *   false
   * )
   * ```
   */
  (that: Integer): (self: Integer) => boolean

  /**
   * @example
   *
   * ```ts
   * import * as assert from "node:assert"
   * import * as Integer from "effect/Integer"
   *
   * assert.deepStrictEqual(
   *   Integer.lessThan(Integer.of(2), Integer.of(3)),
   *   true
   * )
   *
   * assert.deepStrictEqual(
   *   Integer.lessThan(Integer.of(3), Integer.of(3)),
   *   false
   * )
   *
   * assert.deepStrictEqual(
   *   Integer.lessThan(Integer.of(4), Integer.of(3)),
   *   false
   * )
   * ```
   */
  (self: Integer, that: Integer): boolean
} = _Order.lessThan(Order)

/**
 * Returns a function that checks if a given `Integer` is less than or equal to
 * the provided one.
 *
 * **Syntax**
 *
 * ```ts
 * import * as assert from "node:assert/strict"
 * import { pipe } from "effect"
 * import * as Integer from "effect/Integer"
 *
 * assert.equal(
 *   pipe(
 *     // data-last api
 *     Integer.of(2),
 *     Integer.lessThanOrEqualTo(Integer.of(3))
 *   ),
 *   // data-first api
 *   Integer.lessThanOrEqualTo(Integer.of(2), Integer.of(3))
 * )
 * ```
 *
 * @memberof Integer
 * @since 3.14.6
 * @category Predicates
 * @experimental
 */
export const lessThanOrEqualTo: {
  /**
   * @example
   *
   * ```ts
   * import * as assert from "node:assert/strict"
   * import { pipe } from "effect"
   * import * as Integer from "effect/Integer"
   *
   * assert.deepStrictEqual(
   *   pipe(
   *     Integer.of(3), //
   *     Integer.lessThanOrEqualTo(Integer.of(2))
   *   ),
   *   true
   * )
   *
   * assert.deepStrictEqual(
   *   pipe(
   *     Integer.of(3), //
   *     Integer.lessThanOrEqualTo(Integer.of(3))
   *   ),
   *   true
   * )
   *
   * assert.deepStrictEqual(
   *   pipe(
   *     Integer.of(3), //
   *     Integer.lessThanOrEqualTo(Integer.of(4))
   *   ),
   *   false
   * )
   * ```
   *
   * @param that - The `Integer` to compare with the `self` when the resultant
   *   function is invoked.
   * @returns A function that takes a `self` and returns `true` if `self` is
   *   less than or equal to `that`, otherwise `false`.
   */
  (that: Integer): (self: Integer) => boolean

  /**
   * @example
   *
   * ```ts
   * import * as assert from "node:assert/strict"
   * import * as Integer from "effect/Integer"
   *
   * assert.deepStrictEqual(
   *   Integer.lessThanOrEqualTo(Integer.of(2), Integer.of(3)),
   *   true
   * )
   *
   * assert.deepStrictEqual(
   *   Integer.lessThanOrEqualTo(Integer.of(3), Integer.of(3)),
   *   true
   * )
   *
   * assert.deepStrictEqual(
   *   Integer.lessThanOrEqualTo(Integer.of(4), Integer.of(3)),
   *   false
   * )
   * ```
   *
   * @param self - The first `Integer` to compare.
   * @param that - The second `Integer` to compare.
   * @returns `true` if `self` is less than or equal to `that`, otherwise
   *   `false`.
   */
  (self: Integer, that: Integer): boolean
} = _Order.lessThanOrEqualTo(Order)

/**
 * Returns `true` if the first `Integer` is greater than the second `Integer`,
 * otherwise `false`.
 *
 * **Syntax**
 *
 * ```ts
 * import { pipe } from "effect"
 * import * as assert from "node:assert/strict"
 * import * as Integer from "effect/Integer"
 *
 * assert.equal(
 *   pipe(
 *     // data-last api
 *     Integer.of(3),
 *     Integer.greaterThan(Integer.of(2))
 *   ),
 *   // data-first api
 *   Integer.greaterThan(Integer.of(3), Integer.of(2))
 * )
 * ```
 *
 * @memberof Integer
 * @since 3.14.6
 * @category Predicates
 * @experimental
 */
export const greaterThan: {
  /**
   * @example
   *
   * ```ts
   * import * as assert from "node:assert/strict"
   * import { pipe } from "effect"
   * import * as Integer from "effect/Integer"
   *
   * assert.equal(
   *   pipe(Integer.of(4), Integer.greaterThan(Integer.of(-2))),
   *   true
   * )
   *
   * assert.equal(
   *   pipe(Integer.of(-2), Integer.greaterThan(Integer.of(-2))),
   *   false
   * )
   *
   * assert.equal(
   *   pipe(Integer.of(-2), Integer.greaterThan(Integer.of(3))),
   *   false
   * )
   * ```
   *
   * @param that - The `Integer` to compare with the `self` when the resultant
   *   function is invoked.
   * @returns A function that takes a `self` and returns `true` if `self` is
   *   greater than `that`, otherwise `false`.
   */
  (that: Integer): (self: Integer) => boolean

  /**
   * @example
   *
   * ```ts
   * import * as assert from "node:assert/strict"
   * import * as Integer from "effect/Integer"
   *
   * assert.equal(Integer.greaterThan(Integer.of(4), Integer.of(-2)), true)
   *
   * assert.equal(
   *   Integer.greaterThan(Integer.of(-2), Integer.of(-2)),
   *   false
   * )
   *
   * assert.equal(Integer.greaterThan(Integer.of(-2), Integer.of(3)), false)
   * ```
   *
   * @param self - The first `Integer` value to compare.
   * @param that - The second `Integer` value to compare.
   * @returns A `boolean` indicating whether `self` was greater than `that`.
   */
  (self: Integer, that: Integer): boolean
} = _Order.greaterThan(Order)

/**
 * Returns a function that checks if a given `Integer` is greater than or equal
 * to the provided one.
 *
 * **Syntax**
 *
 * ```ts
 * import * as assert from "node:assert/strict"
 * import { pipe } from "effect"
 * import * as Integer from "effect/Integer"
 *
 * assert.equal(
 *   pipe(
 *     // data-last api
 *     Integer.of(3),
 *     Integer.greaterThanOrEqualTo(Integer.of(2))
 *   ),
 *   // data-first api
 *   Integer.greaterThanOrEqualTo(Integer.of(3), Integer.of(2))
 * )
 * ```
 *
 * @memberof Integer
 * @since 3.14.6
 * @category Predicates
 * @experimental
 */
export const greaterThanOrEqualTo: {
  /**
   * @example
   *
   * ```ts
   * import * as assert from "node:assert/strict"
   * import { pipe } from "effect"
   * import * as Integer from "effect/Integer"
   *
   * assert.equal(
   *   pipe(
   *     Integer.of(-2), //
   *     Integer.greaterThanOrEqualTo(Integer.of(3))
   *   ),
   *   false
   * )
   *
   * assert.equal(
   *   pipe(
   *     Integer.zero, //
   *     Integer.greaterThanOrEqualTo(Integer.of(-Integer.zero))
   *   ),
   *   true
   * )
   *
   * assert.equal(
   *   pipe(Integer.of(4), Integer.greaterThanOrEqualTo(Integer.of(-2))),
   *   true
   * )
   * ```
   *
   * @param that - The `Integer` to compare with the `self` when the resultant
   *   function is invoked.
   * @returns A function that takes a `self` and returns `true` if `self` is
   *   greater than or equal to `that`, otherwise `false`.
   */
  (that: Integer): (self: Integer) => boolean

  /**
   * @example
   *
   * ```ts
   * import * as assert from "node:assert/strict"
   * import * as Integer from "effect/Integer"
   *
   * assert.equal(
   *   Integer.greaterThanOrEqualTo(Integer.of(-2), Integer.of(3)),
   *   false
   * )
   *
   * assert.equal(
   *   Integer.greaterThanOrEqualTo(
   *     Integer.zero,
   *     Integer.of(-Integer.zero)
   *   ),
   *   true
   * )
   *
   * assert.equal(
   *   Integer.greaterThanOrEqualTo(Integer.of(4), Integer.of(-2)),
   *   true
   * )
   * ```
   *
   * @param self - The first `Integer` to compare.
   * @param that - The second `Integer` to compare.
   * @returns `true` if `self` is greater than or equal to `that`, otherwise
   *   `false`.
   */
  (self: Integer, that: Integer): boolean
} = _Order.greaterThanOrEqualTo(Order)

/**
 * Checks if a `Integer` is between a minimum and maximum value (inclusive).
 *
 * **Syntax**
 *
 * ```ts
 * import * as assert from "node:assert/strict"
 * import { pipe } from "effect"
 * import * as Integer from "effect/Integer"
 *
 * assert.equal(
 *   // data-last api
 *   pipe(
 *     Integer.of(3),
 *     Integer.between({ minimum: Integer.of(0), maximum: Integer.of(5) })
 *   ),
 *   // data-first api
 *   Integer.between(Integer.of(3), {
 *     minimum: Integer.of(0),
 *     maximum: Integer.of(5)
 *   })
 * )
 * ```
 *
 * @memberof Integer
 * @since 3.14.6
 * @category Predicates
 * @experimental
 */
export const between: {
  /**
   * @example
   *
   * ```ts
   * import * as assert from "node:assert/strict"
   * import { pipe } from "effect"
   * import * as Integer from "effect/Integer"
   *
   * assert.equal(
   *   pipe(
   *     Integer.of(-1),
   *     Integer.between({ minimum: Integer.of(0), maximum: Integer.of(5) })
   *   ),
   *   false
   * )
   *
   * assert.equal(
   *   pipe(
   *     Integer.of(0),
   *     Integer.between({ minimum: Integer.of(0), maximum: Integer.of(5) })
   *   ),
   *   true
   * )
   *
   * assert.equal(
   *   pipe(
   *     Integer.of(3),
   *     Integer.between({ minimum: Integer.of(0), maximum: Integer.of(5) })
   *   ),
   *   true
   * )
   *
   * assert.equal(
   *   pipe(
   *     Integer.of(5),
   *     Integer.between({ minimum: Integer.of(0), maximum: Integer.of(5) })
   *   ),
   *   true
   * )
   *
   * assert.equal(
   *   pipe(
   *     Integer.of(6),
   *     Integer.between({ minimum: Integer.of(0), maximum: Integer.of(5) })
   *   ),
   *   false
   * )
   * ```
   *
   * @param options
   * @param options.minimum - The minimum inclusive `Integer`.
   * @param options.maximum - The maximum inclusive `Integer`.
   * @returns A function that takes a `self` and returns `true` if `self` is
   *   between the `minimum` and `maximum` values (inclusive), otherwise
   *   `false`.
   */
  (options: { minimum: Integer; maximum: Integer }): (self: Integer) => boolean

  /**
   * @example
   *
   * ```ts
   * import * as assert from "node:assert/strict"
   * import * as Integer from "effect/Integer"
   *
   * assert.equal(
   *   Integer.between(Integer.of(-1), {
   *     minimum: Integer.of(0),
   *     maximum: Integer.of(5)
   *   }),
   *   false
   * )
   *
   * assert.equal(
   *   Integer.between(Integer.of(0), {
   *     minimum: Integer.of(0),
   *     maximum: Integer.of(5)
   *   }),
   *   true
   * )
   *
   * assert.equal(
   *   Integer.between(Integer.of(3), {
   *     minimum: Integer.of(0),
   *     maximum: Integer.of(5)
   *   }),
   *   true
   * )
   *
   * assert.equal(
   *   Integer.between(Integer.of(5), {
   *     minimum: Integer.of(0),
   *     maximum: Integer.of(5)
   *   }),
   *   true
   * )
   *
   * assert.equal(
   *   Integer.between(Integer.of(6), {
   *     minimum: Integer.of(0),
   *     maximum: Integer.of(5)
   *   }),
   *   false
   * )
   * ```
   *
   * @param self - The `Integer` to check.
   * @param options
   * @param options.minimum - The minimum inclusive `Integer`.
   * @param options.maximum - The maximum inclusive `Integer`.
   * @returns `true` if the `Integer` is between the `minimum` and `maximum`
   *   values (inclusive), otherwise `false`.
   */
  (
    self: Integer,
    options: {
      minimum: Integer
      maximum: Integer
    }
  ): boolean
} = _Order.between(Order)

/**
 * Restricts the given `Integer` to be within the range specified by the
 * `minimum` and `maximum` values.
 *
 * - If the `Integer` is less than the `minimum` value, the function returns the
 *   `minimum` value.
 * - If the `Integer` is greater than the `maximum` value, the function returns
 *   the `maximum` value.
 * - Otherwise, it returns the original `Integer`.
 *
 * **Syntax**
 *
 * ```ts
 * import * as assert from "node:assert/strict"
 * import { pipe } from "effect"
 * import * as Integer from "effect/Integer"
 *
 * assert.equal(
 *   // data-last api
 *   pipe(
 *     Integer.of(3),
 *     Integer.clamp({ minimum: Integer.of(0), maximum: Integer.of(5) })
 *   ),
 *   // data-first api
 *   Integer.clamp(Integer.of(3), {
 *     minimum: Integer.of(0),
 *     maximum: Integer.of(5)
 *   })
 * )
 * ```
 *
 * @memberof Integer
 * @since 3.14.6
 * @experimental
 */
export const clamp: {
  /**
   * @example
   *
   * ```ts
   * import * as assert from "node:assert/strict"
   * import { pipe } from "effect"
   * import * as Integer from "effect/Integer"
   *
   * const clampBetweenZeroAndFive: (
   *   n: Integer.Integer
   * ) => Integer.Integer = Integer.clamp({
   *   minimum: Integer.of(0),
   *   maximum: Integer.of(5)
   * })
   *
   * assert.equal(
   *   pipe(
   *     Integer.of(3), //
   *     Integer.clamp({ minimum: Integer.of(0), maximum: Integer.of(5) })
   *   ),
   *   3
   * )
   *
   * assert.equal(pipe(Integer.of(-1), clampBetweenZeroAndFive), 0)
   *
   * assert.equal(pipe(Integer.of(6), clampBetweenZeroAndFive), 5)
   * ```
   *
   * @param options
   * @param options.minimum - The minimum inclusive `Integer`.
   * @param options.maximum - The maximum inclusive `Integer`.
   * @returns A function that takes a `self` and returns the clamped `Integer`
   *   value.
   */
  (options: { minimum: Integer; maximum: Integer }): (self: Integer) => Integer

  /**
   * @example
   *
   * ```ts
   * import * as assert from "node:assert/strict"
   * import * as Integer from "effect/Integer"
   *
   * const options = { minimum: Integer.of(1), maximum: Integer.of(5) }
   *
   * assert.equal(Integer.clamp(Integer.of(3), options), 3)
   *
   * assert.equal(Integer.clamp(Integer.of(0), options), 1)
   *
   * assert.equal(Integer.clamp(Integer.of(6), options), 5)
   * ```
   *
   * @param self - The `Integer` to be clamped.
   * @param options
   * @param options.minimum - The minimum inclusive `Integer`.
   * @param options.maximum - The maximum inclusive `Integer`.
   * @returns The clamped `Integer` value.
   */
  (
    self: Integer,
    options: {
      minimum: Integer
      maximum: Integer
    }
  ): Integer
} = _Order.clamp(Order)

/**
 * Returns the minimum between two `Integer`s.
 *
 * `Integer.min` is a `commutative` operation; this means that the order in
 * which the arguments are provided does not affect the result.
 *
 * **Syntax**
 *
 * ```ts
 * import * as assert from "node:assert/strict"
 * import { pipe } from "effect"
 * import * as Integer from "effect/Integer"
 *
 * const three = Integer.of(3)
 * const five = Integer.of(5)
 *
 * assert.equal(
 *   // data-last api
 *   pipe(three, Integer.min(five)),
 *   // data-first api
 *   Integer.min(three, five) // returns three
 * )
 * ```
 *
 * @memberof Integer
 * @since 3.14.6
 * @experimental
 */
export const min: {
  /**
   * @example
   *
   * ```ts
   * import * as assert from "node:assert/strict"
   * import { pipe } from "effect"
   * import * as Integer from "effect/Integer"
   *
   * const three = Integer.of(3)
   * const two = Integer.of(2)
   *
   * assert.equal(
   *   pipe(three, Integer.min(two)), // returns 2
   *   pipe(two, Integer.min(three)), // returns 2
   *   "the min operation is commutative"
   * )
   * ```
   *
   * @param that - The `Integer` to compare with the `self` when the resultant
   *   function is invoked.
   * @returns A function that takes a `self` and returns the minimum of the two
   *   `Integer`s (`self` | `that`).
   */
  (that: Integer): (self: Integer) => Integer

  /**
   * @example
   *
   * ```ts
   * import * as Integer from "effect/Integer"
   * import * as assert from "node:assert/strict"
   *
   * const three = Integer.of(3)
   * const five = Integer.of(5)
   *
   * assert.equal(
   *   Integer.min(three, five), // returns 3
   *   Integer.min(five, three), // returns 3
   *   "the min operation is commutative"
   * )
   * ```
   *
   * @param self - The first `Integer` to compare.
   * @param that - The second `Integer` to compare.
   * @returns The minimum of the two `Integer`s (`self` | `that`).
   */
  (self: Integer, that: Integer): Integer
} = _Order.min(Order)

/**
 * Returns the maximum between two `Integer`s.
 *
 * **Syntax**
 *
 * ```ts
 * import * as assert from "node:assert/strict"
 * import { pipe } from "effect"
 * import * as Integer from "effect/Integer"
 *
 * const negativeTwo = Integer.of(-2)
 * const three = Integer.of(3)
 *
 * assert.equal(
 *   // data-last api
 *   Integer.max(negativeTwo, three), // returns 3
 *   // data-first api
 *   pipe(negativeTwo, Integer.max(three)) // returns 3
 * )
 * ```
 *
 * @memberof Integer
 * @since 3.14.6
 * @experimental
 */
export const max: {
  /**
   * @example
   *
   * ```ts
   * import * as assert from "node:assert/strict"
   * import { pipe } from "effect"
   * import * as Integer from "effect/Integer"
   *
   * const negativeTwo = Integer.of(-2)
   * const three = Integer.of(3)
   *
   * assert.equal(
   *   pipe(
   *     negativeTwo,
   *     Integer.max(three) // returns 3
   *   ),
   *   pipe(
   *     three,
   *     Integer.max(negativeTwo) // returns 3
   *   ),
   *   "the max operation is commutative"
   * )
   * ```
   *
   * @param that - The `Integer` to compare with the `self` when the resultant
   *   function is invoked.
   * @returns A function that takes a `self` and returns the maximum of the two
   *   `Integer`s (`self` | `that`).
   */
  (that: Integer): (self: Integer) => Integer

  /**
   * @example
   *
   * ```ts
   * import * as assert from "node:assert/strict"
   * import * as Integer from "effect/Integer"
   *
   * assert.equal(
   *   Integer.max(Integer.of(-2), Integer.of(3)), // returns 3
   *   Integer.max(Integer.of(3), Integer.of(-2)), // returns 3
   *   "the max operation is commutative"
   * )
   * ```
   *
   * @param self - The first `Integer` to compare.
   * @param that - The second `Integer` to compare.
   * @returns The maximum of the two `Integer`s (`self` | `that`).
   */
  (self: Integer, that: Integer): Integer
} = _Order.max(Order)

/**
 * Determines the sign of a given `Integer`.
 *
 * @memberof Integer
 * @since 3.14.6
 * @category Math
 * @example
 *
 * ```ts
 * import * as assert from "node:assert/strict"
 * import * as Integer from "effect/Integer"
 *
 * assert.equal(Integer.sign(Integer.of(-10)), -1)
 * assert.equal(Integer.sign(Integer.of(0)), 0)
 * assert.equal(Integer.sign(Integer.of(10)), 1)
 * ```
 *
 * @param n - The `Integer` to determine the sign of.
 * @returns -1 if `n` is negative, 0 if `n` is zero, and 1 if `n` is positive.
 * @experimental
 */
export const sign: (n: Integer) => Ordering = (n) => Order(n, zero)
