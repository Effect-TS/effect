/**
 * # Number
 *
 * Operations on JavaScript numbers, representing an approximation of **real
 * numbers** (`ℝ`).
 *
 * ## What Problem Does It Solve?
 *
 * The `Number` module solves the problem of working with JavaScript's native
 * number type in a **functional**, **type-safe manner**. It provides a
 * comprehensive set of operations that handle edge cases (like division by
 * zero), maintain type safety, and support both data-first and data-last
 * programming styles.
 *
 * ## When to Use
 *
 * Use the `Number` module when you need:
 *
 * - Type-safe arithmetic operations with proper error handling
 * - Mathematical operations beyond JavaScript's built-in operators
 * - Functional programming patterns for number manipulation
 * - Consistent handling of edge cases (division by zero, NaN, etc.)
 * - Composable operations that work well in pipelines
 *
 * JavaScript's native `number` type (IEEE-754 double-precision) allows modeling
 * of:
 *
 * - Continuous quantities with fractional parts
 * - Measurements with arbitrary precision
 * - Mathematical concepts requiring irrational values (π, e, √2, etc.)
 * - Scientific calculations with floating-point operations
 *
 * ## Advanced Features
 *
 * The Number module provides:
 *
 * - **Safe operations** that handle edge cases by returning `Option` types
 * - **Unsafe operations** that throw specific errors for invalid operations
 * - **Collection operations** for working with groups of numbers
 * - **Comparison utilities** with a rich set of predicates
 * - **Mathematical functions** for common numerical operations
 * - **Parsing utilities** for safely converting strings to numbers
 *
 * ## Operations Reference
 *
 * | Category     | Operation                                  | Description                                             | Domain                         | Co-domain             |
 * | ------------ | ------------------------------------------ | ------------------------------------------------------- | ------------------------------ | --------------------- |
 * | constructors | {@link module:Number.parse}                | Safely parses a string to a number                      | `string`                       | `Option<number>`      |
 * |              |                                            |                                                         |                                |                       |
 * | math         | {@link module:Number.sum}                  | Adds two numbers                                        | `number`, `number`             | `number`              |
 * | math         | {@link module:Number.sumAll}               | Sums all numbers in a collection                        | `Iterable<number>`             | `number`              |
 * | math         | {@link module:Number.subtract}             | Subtracts one number from another                       | `number`, `number`             | `number`              |
 * | math         | {@link module:Number.multiply}             | Multiplies two numbers                                  | `number`, `number`             | `number`              |
 * | math         | {@link module:Number.multiplyAll}          | Multiplies all numbers in a collection                  | `Iterable<number>`             | `number`              |
 * | math         | {@link module:Number.divide}               | Safely divides handling division by zero                | `number`, `number`             | `Option<number>`      |
 * | math         | {@link module:Number.unsafeDivide}         | Divides but may throw an exception for division by zero | `number`, `number`             | `number`              |
 * | math         | {@link module:Number.remainder}            | Calculates remainder of division                        | `number`, `number`             | `number`              |
 * | math         | {@link module:Number.increment}            | Adds 1 to a number                                      | `number`                       | `number`              |
 * | math         | {@link module:Number.decrement}            | Subtracts 1 from a number                               | `number`                       | `number`              |
 * | math         | {@link module:Number.sign}                 | Determines the sign of a number                         | `number`                       | `Ordering`            |
 * | math         | {@link module:Number.nextPow2}             | Finds the next power of 2                               | `number`                       | `number`              |
 * | math         | {@link module:Number.round}                | Rounds a number with specified precision                | `number`, `number`             | `number`              |
 * |              |                                            |                                                         |                                |                       |
 * | predicates   | {@link module:Number.between}              | Checks if a number is in a range                        | `number`, `{minimum, maximum}` | `boolean`             |
 * | predicates   | {@link module:Number.lessThan}             | Checks if one number is less than another               | `number`, `number`             | `boolean`             |
 * | predicates   | {@link module:Number.lessThanOrEqualTo}    | Checks if one number is less than or equal              | `number`, `number`             | `boolean`             |
 * | predicates   | {@link module:Number.greaterThan}          | Checks if one number is greater than another            | `number`, `number`             | `boolean`             |
 * | predicates   | {@link module:Number.greaterThanOrEqualTo} | Checks if one number is greater or equal                | `number`, `number`             | `boolean`             |
 * |              |                                            |                                                         |                                |                       |
 * | guards       | {@link module:Number.isNumber}             | Type guard for JavaScript numbers                       | `unknown`                      | `boolean`             |
 * |              |                                            |                                                         |                                |                       |
 * | comparison   | {@link module:Number.min}                  | Returns the minimum of two numbers                      | `number`, `number`             | `number`              |
 * | comparison   | {@link module:Number.max}                  | Returns the maximum of two numbers                      | `number`, `number`             | `number`              |
 * | comparison   | {@link module:Number.clamp}                | Restricts a number to a range                           | `number`, `{minimum, maximum}` | `number`              |
 * |              |                                            |                                                         |                                |                       |
 * | instances    | {@link module:Number.Equivalence}          | Equivalence instance for numbers                        |                                | `Equivalence<number>` |
 * | instances    | {@link module:Number.Order}                | Order instance for numbers                              |                                | `Order<number>`       |
 * |              |                                            |                                                         |                                |                       |
 * | errors       | {@link module:Number.DivisionByZeroError}  | Error thrown by unsafeDivide                            |                                |                       |
 *
 * ## Composition Patterns and Type Safety
 *
 * When building function pipelines, understanding how types flow through
 * operations is critical:
 *
 * ### Composing with type-preserving operations
 *
 * Most operations in this module are type-preserving (`number → number`),
 * making them easily composable in pipelines:
 *
 * ```ts
 * import { pipe } from "effect"
 * import * as RealNumber from "effect/Number"
 *
 * const result = pipe(
 *   10,
 *   RealNumber.increment, // number → number
 *   RealNumber.multiply(2), // number → number
 *   RealNumber.round(1) // number → number
 * ) // Result: number (21)
 * ```
 *
 * ### Working with Option results
 *
 * Operations that might fail (like division by zero) return Option types and
 * require Option combinators:
 *
 * ```ts
 * import { pipe, Option } from "effect"
 * import * as RealNumber from "effect/Number"
 *
 * const result = pipe(
 *   10,
 *   RealNumber.divide(0), // number → Option<number>
 *   Option.getOrElse(() => 0) // Option<number> → number
 * ) // Result: number (0)
 * ```
 *
 * ### Error handling with unsafe operations
 *
 * Unsafe operations throw specific errors that can be caught:
 *
 * ```ts
 * import { pipe } from "effect"
 * import * as RealNumber from "effect/Number"
 *
 * try {
 *   const result = RealNumber.unsafeDivide(10, 0) // Throws DivisionByZeroError
 *   // do something with result ...
 * } catch (e) {
 *   if (e instanceof RealNumber.DivisionByZeroError) {
 *     console.error("Division by zero occurred")
 *   }
 * }
 * ```
 *
 * ### Composition best practices
 *
 * - Chain type-preserving operations for maximum composability
 * - Use Option combinators when working with potentially failing operations
 * - Consider using Effect for operations that might fail with specific errors
 * - Remember that all operations maintain JavaScript's floating-point precision
 *   limitations
 *
 * ## Mathematical Properties
 *
 * From an analysis perspective, the JavaScript `number` approximates a field
 * where:
 *
 * - Addition and multiplication are closed operations with identities (0 and 1)
 * - Every value has an additive inverse (negation)
 * - Every non-zero value has a multiplicative inverse (reciprocal)
 * - Standard field axioms hold within floating-point limitations
 *
 * In the type hierarchy:
 *
 * - {@link module:NaturalNumber} is a proper subset of `number` (`ℕ₀ ⊂ ℝ`)
 * - {@link module:Integer} is a proper subset of `number` (`ℤ ⊂ ℝ`)
 *
 * @module Number
 * @since 2.0.0
 */

import * as equivalence from "./Equivalence.js"
import { dual } from "./Function.js"
import * as internal from "./internal/number.js"
import * as option from "./internal/option.js"
import type { Option } from "./Option.js"
import * as order from "./Order.js"
import type { Ordering } from "./Ordering.js"
import * as predicate from "./Predicate.js"

/**
 * Type guard that tests if a value is a member of the set of JavaScript
 * numbers, which approximates the mathematical set of `real numbers` (`ℝ`).
 *
 * @remarks
 * This function performs both:
 *
 * 1. A runtime check to determine if the value is a JavaScript number
 * 2. A TypeScript type refinement that narrows the type to `number` when used in
 *    conditionals
 *
 * For the predicate function `f: unknown → boolean` defined by:
 *
 * - `f(x) = true` when x is a JavaScript number
 * - `f(x) = false` otherwise
 * - **Domain**: All JavaScript values (`unknown`)
 * - **Codomain**: `boolean`, indicating membership in the number type
 *
 * Note that this function returns true for all JavaScript number values,
 * including:
 *
 * - Regular numbers (integers and floating-point): `1`, `-2`, `3.14`, etc.
 * - Special numeric values: `Infinity`, `-Infinity`, `NaN`
 *
 * @memberof Number
 * @since 2.0.0
 * @category Guards
 * @example
 *
 * ```ts
 * import * as assert from "node:assert"
 * import * as RealNumber from "effect/Number"
 *
 * // Regular numbers
 * assert.deepStrictEqual(RealNumber.isNumber(2), true)
 * assert.deepStrictEqual(RealNumber.isNumber(-3.14), true)
 * assert.deepStrictEqual(RealNumber.isNumber(0), true)
 *
 * // Special numeric values
 * assert.deepStrictEqual(RealNumber.isNumber(Infinity), true)
 * assert.deepStrictEqual(RealNumber.isNumber(NaN), true)
 *
 * // Non-number values
 * assert.deepStrictEqual(RealNumber.isNumber("2"), false)
 * assert.deepStrictEqual(RealNumber.isNumber(true), false)
 * assert.deepStrictEqual(RealNumber.isNumber(null), false)
 * assert.deepStrictEqual(RealNumber.isNumber(undefined), false)
 * assert.deepStrictEqual(RealNumber.isNumber({}), false)
 * assert.deepStrictEqual(RealNumber.isNumber([]), false)
 *
 * // Using as a type guard in conditionals
 * function processValue(value: unknown): string {
 *   if (RealNumber.isNumber(value)) {
 *     // TypeScript now knows 'value' is a number
 *     return `Numeric value: ${value.toFixed(2)}`
 *   }
 *   return "Not a number"
 * }
 *
 * assert.strictEqual(processValue(42), "Numeric value: 42.00")
 * assert.strictEqual(processValue("hello"), "Not a number")
 *
 * // Filtering for numbers in an array
 * const mixed = [1, "two", 3, false, 5]
 * const onlyNumbers = mixed.filter(RealNumber.isNumber)
 * assert.deepStrictEqual(onlyNumbers, [1, 3, 5])
 * ```
 *
 * @param input - The value to test for membership in the set of JavaScript
 *   numbers
 * @returns `true` if the input is a JavaScript number, `false` otherwise
 */
export const isNumber: (input: unknown) => input is number = predicate.isNumber

/**
 * Returns the additive inverse of a number, effectively negating it.
 *
 * @memberof Number
 * @since 3.14.6
 * @example
 *
 * ```ts
 * import * as assert from "node:assert/strict"
 * import { pipe } from "effect"
 * import * as RealNumber from "effect/Number"
 *
 * assert.equal(
 *   RealNumber.negate(5), //
 *   -5
 * )
 *
 * assert.equal(
 *   RealNumber.negate(-5), //
 *   5
 * )
 *
 * assert.equal(
 *   RealNumber.negate(0), //
 *   0
 * )
 * ```
 *
 * @param n - The number value to be negated.
 * @returns The negated number value.
 */
export const negate: {
  (n: number): number
} = internal.negate

/**
 * Performs addition in the set of JavaScript numbers, approximating addition in
 * the mathematical set of real numbers (ℝ).
 *
 * @remarks
 * For the binary operation `(+): ℝ × ℝ → ℝ` defined by standard addition, this
 * function implements the addition of two JavaScript numbers with the following
 * mathematical properties (subject to floating-point precision limitations):
 *
 * - **Closure**: For all `a, b ∈ ℝ`, `a + b ∈ ℝ`
 * - **Associativity**: For all `a, b, c ∈ ℝ`, `(a + b) + c = a + (b + c)`
 * - **Commutativity**: For all `a, b ∈ ℝ`, `a + b = b + a`
 * - **Identity element**: There exists `0 ∈ ℝ` such that for all `a ∈ ℝ`, `a + 0
 *   = 0 + a = a`
 * - **Inverse elements**: For every `a ∈ ℝ`, there exists `−a ∈ ℝ` such that `a +
 *   (−a) = (−a) + a = 0`
 *
 * Note: JavaScript's floating-point arithmetic follows IEEE 754 standards and
 * may introduce precision errors when working with decimal values.
 * @memberof Number
 * @since 2.0.0
 * @category Math
 * @example
 *
 * ```ts
 * import * as assert from "node:assert/strict"
 * import { pipe } from "effect"
 * import * as RealNumber from "effect/Number"
 *
 * // Data-first style (direct application)
 * assert.deepStrictEqual(RealNumber.sum(2, 3), 5)
 * assert.deepStrictEqual(RealNumber.sum(-10, 5), -5)
 * assert.deepStrictEqual(RealNumber.sum(0.1, 0.2), 0.30000000000000004) // Note: floating-point precision limitation
 *
 * // Data-last style (pipeable)
 * assert.deepStrictEqual(
 *   pipe(
 *     10,
 *     RealNumber.sum(5) // 10 + 5 = 15
 *   ),
 *   15
 * )
 *
 * // Chaining multiple additions
 * assert.deepStrictEqual(
 *   pipe(
 *     1,
 *     RealNumber.sum(2), // 1 + 2 = 3
 *     RealNumber.sum(3), // 3 + 3 = 6
 *     RealNumber.sum(4) // 6 + 4 = 10
 *   ),
 *   10
 * )
 *
 * // Identity property: a + 0 = a
 * assert.deepStrictEqual(RealNumber.sum(42, 0), 42)
 *
 * // Commutative property: a + b = b + a
 * assert.deepStrictEqual(RealNumber.sum(5, 3), RealNumber.sum(3, 5))
 * ```
 */
export const sum: {
  /**
   * Returns a function that adds a specified number to its argument.
   *
   * @param that - The number to add to the input of the resulting function
   * @returns A function that takes a number and returns the sum of that number
   *   and `that`
   */
  (that: number): (self: number) => number

  /**
   * Adds two numbers together.
   *
   * @param self - The first addend
   * @param that - The second addend
   * @returns The sum of the two numbers
   */
  (self: number, that: number): number
} = dual(2, internal.sum)

/**
 * Computes the sum of all elements in an iterable collection of numbers.
 *
 * @remarks
 * This function implements the mathematical concept of a `finite sum`: `∑(a₁,
 * a₂, ..., aₙ) = a₁ + a₂ + ... + aₙ`
 *
 * Properties of this operation:
 *
 * - For an **empty collection**, **returns** 0 (**the additive identity
 *   element**)
 * - Inherits the **associative** and **commutative** properties of addition
 * - The result is the same regardless of the order in which elements are summed
 * - The operation maintains closure in the set of real numbers
 *
 * @memberof Number
 * @since 2.0.0
 * @category Math
 * @example
 *
 * ```ts
 * import * as assert from "node:assert/strict"
 * import * as RealNumber from "effect/Number"
 *
 * // Basic sums
 * assert.deepStrictEqual(RealNumber.sumAll([2, 3, 4]), 9) // 2 + 3 + 4 = 9
 * assert.deepStrictEqual(RealNumber.sumAll([1.1, 2.2, 3.3]), 6.6) // 1.1 + 2.2 + 3.3 = 6.6
 *
 * // Empty collection returns the additive identity (0)
 * assert.deepStrictEqual(RealNumber.sumAll([]), 0)
 *
 * // Single element collection
 * assert.deepStrictEqual(RealNumber.sumAll([42]), 42)
 *
 * // Sums with negative numbers
 * assert.deepStrictEqual(RealNumber.sumAll([2, -3, 4]), 3) // 2 + (-3) + 4 = 3
 * assert.deepStrictEqual(RealNumber.sumAll([-2, -3, -4]), -9) // (-2) + (-3) + (-4) = -9
 *
 * // Works with any iterable
 * assert.deepStrictEqual(RealNumber.sumAll(new Set([2, 3, 4])), 9)
 *
 * // Using with generated sequences
 * function* range(start: number, end: number) {
 *   for (let i = start; i <= end; i++) yield i
 * }
 *
 * // Compute sum of first 5 natural numbers: 1 + 2 + 3 + 4 + 5 = 15
 * assert.deepStrictEqual(RealNumber.sumAll(range(1, 5)), 15)
 *
 * // Floating point precision example
 * assert.deepStrictEqual(
 *   RealNumber.sumAll([0.1, 0.2]),
 *   0.30000000000000004 // Note IEEE 754 precision limitation
 * )
 * ```
 *
 * @param collection - An `iterable` containing the `numbers` to sum
 * @returns The sum of all numbers in the collection, or 0 if the collection is
 *   empty
 */
export const sumAll: {
  (collection: Iterable<number>): number
} = internal.sumAll<number>

/**
 * Performs subtraction in the set of JavaScript numbers, approximating
 * subtraction in the mathematical set of real numbers (ℝ).
 *
 * @remarks
 * For the binary operation `(-): ℝ × ℝ → ℝ` defined by standard subtraction,
 * this function implements the subtraction of two JavaScript numbers with the
 * following mathematical properties (subject to floating-point precision
 * limitations):
 *
 * - **Closure**: For all `a, b ∈ ℝ`, `a - b ∈ ℝ`
 * - **Relation to addition**: For all `a, b ∈ ℝ`, `a - b = a + (-b)` where (-b)
 *   is the additive inverse of b
 * - **Non-commutativity**: In general, `a - b ≠ b - a` (unless `a = b`)
 * - **Right identity element**: For all `a ∈ ℝ`, `a - 0 = a`
 * - **Self-annihilation**: For all `a ∈ ℝ`, `a - a = 0`
 * - **Inverse relation**: For all `a, b ∈ ℝ`, `a - b = -(b - a)`
 *
 * Note: JavaScript's floating-point arithmetic follows IEEE 754 standards and
 * may introduce precision errors when working with decimal values.
 * @memberof Number
 * @since 2.0.0
 * @category Math
 * @example
 *
 * ```ts
 * import * as assert from "node:assert/strict"
 * import { pipe } from "effect"
 * import * as RealNumber from "effect/Number"
 *
 * // Data-first style (direct application)
 * assert.deepStrictEqual(RealNumber.subtract(2, 3), -1) // 2 - 3 = -1
 * assert.deepStrictEqual(RealNumber.subtract(10, 5), 5) // 10 - 5 = 5
 * assert.deepStrictEqual(
 *   RealNumber.subtract(0.3, 0.1),
 *   0.19999999999999998
 * ) // Note: floating-point precision limitation
 *
 * // Data-last style (pipeable)
 * assert.deepStrictEqual(
 *   pipe(
 *     10,
 *     RealNumber.subtract(5) // 10 - 5 = 5
 *   ),
 *   5
 * )
 *
 * // Chaining multiple subtractions
 * assert.deepStrictEqual(
 *   pipe(
 *     20,
 *     RealNumber.subtract(5), // 20 - 5 = 15
 *     RealNumber.subtract(3), // 15 - 3 = 12
 *     RealNumber.subtract(2) // 12 - 2 = 10
 *   ),
 *   10
 * )
 *
 * // Right identity property: a - 0 = a
 * assert.deepStrictEqual(RealNumber.subtract(42, 0), 42)
 *
 * // Self-annihilation property: a - a = 0
 * assert.deepStrictEqual(RealNumber.subtract(42, 42), 0)
 *
 * // Non-commutative property: a - b ≠ b - a
 * assert.deepStrictEqual(RealNumber.subtract(5, 3), 2) // 5 - 3 = 2
 * assert.deepStrictEqual(RealNumber.subtract(3, 5), -2) // 3 - 5 = -2
 *
 * // Inverse relation: a - b = -(b - a)
 * assert.deepStrictEqual(
 *   RealNumber.subtract(5, 3),
 *   -RealNumber.subtract(3, 5)
 * )
 * ```
 */
export const subtract: {
  /**
   * Returns a function that subtracts a specified number from its argument.
   *
   * @param subtrahend - The number to subtract from the input of the resulting
   *   function
   * @returns A function that takes a minuend and returns the difference of
   *   subtracting the subtrahend from it
   */
  (subtrahend: number): (minuend: number) => number

  /**
   * Subtracts the subtrahend from the minuend and returns the difference.
   *
   * @param minuend - The number from which another number is to be subtracted
   * @param subtrahend - The number to subtract from the minuend
   * @returns The difference of the minuend minus the subtrahend
   */
  (minuend: number, subtrahend: number): number
} = dual(2, internal.subtract)

/**
 * Performs **multiplication** in the set of JavaScript numbers, approximating
 * multiplication in the mathematical set of real numbers (`ℝ`).
 *
 * @remarks
 * For the binary operation `(×): ℝ × ℝ → ℝ` defined by standard multiplication,
 * this function implements the multiplication of two JavaScript numbers with
 * the following mathematical properties (subject to floating-point precision
 * limitations):
 *
 * - **Closure**: For all `a, b ∈ ℝ`, `a × b ∈ ℝ`
 * - **Associativity**: For all `a, b, c ∈ ℝ`, `(a × b) × c = a × (b × c)`
 * - **Commutativity**: For all `a, b ∈ ℝ`, `a × b = b × a`
 * - **Distributivity over addition**: For all `a, b, c ∈ ℝ`, `a × (b + c) = (a ×
 *   b) + (a × c)`
 * - **Identity element**: There exists `1 ∈ ℝ` such that for all `a ∈ ℝ`, `a × 1
 *   = 1 × a = a`
 * - **Zero property**: For all `a ∈ ℝ`, `a × 0 = 0 × a = 0`
 * - **Sign rules**:
 *
 *   - Positive × Positive = Positive
 *   - Negative × Negative = Positive
 *   - Positive × Negative = Negative
 *   - Negative × Positive = Negative
 *
 * Note: JavaScript's floating-point arithmetic follows IEEE 754 standards and
 * may introduce precision errors when working with decimal values.
 * @memberof Number
 * @since 2.0.0
 * @category Math
 * @example
 *
 * ```ts
 * import * as assert from "node:assert/strict"
 * import { pipe } from "effect"
 * import * as RealNumber from "effect/Number"
 *
 * // Data-first style (direct application)
 * assert.deepStrictEqual(RealNumber.multiply(2, 3), 6) // 2 × 3 = 6
 * assert.deepStrictEqual(RealNumber.multiply(-4, 5), -20) // (-4) × 5 = -20
 * assert.deepStrictEqual(RealNumber.multiply(-3, -2), 6) // (-3) × (-2) = 6
 * assert.deepStrictEqual(
 *   RealNumber.multiply(0.1, 0.2),
 *   0.020000000000000004
 * ) // Note: floating-point precision limitation
 *
 * // Data-last style (pipeable)
 * assert.deepStrictEqual(
 *   pipe(
 *     10,
 *     RealNumber.multiply(5) // 10 × 5 = 50
 *   ),
 *   50
 * )
 *
 * // Chaining multiple multiplications
 * assert.deepStrictEqual(
 *   pipe(
 *     2,
 *     RealNumber.multiply(3), // 2 × 3 = 6
 *     RealNumber.multiply(4), // 6 × 4 = 24
 *     RealNumber.multiply(0.5) // 24 × 0.5 = 12
 *   ),
 *   12
 * )
 *
 * // Identity property: a × 1 = a
 * assert.deepStrictEqual(RealNumber.multiply(42, 1), 42)
 *
 * // Zero property: a × 0 = 0
 * assert.deepStrictEqual(RealNumber.multiply(42, 0), 0)
 *
 * // Commutative property: a × b = b × a
 * assert.deepStrictEqual(
 *   RealNumber.multiply(5, 3),
 *   RealNumber.multiply(3, 5)
 * )
 *
 * // Associative property: (a × b) × c = a × (b × c)
 * const a = 2,
 *   b = 3,
 *   c = 4
 * assert.deepStrictEqual(
 *   RealNumber.multiply(RealNumber.multiply(a, b), c),
 *   RealNumber.multiply(a, RealNumber.multiply(b, c))
 * )
 * ```
 */
export const multiply: {
  /**
   * Returns a function that multiplies a specified number with its argument.
   *
   * @param multiplicand - The number to multiply with the input of the
   *   resulting function
   * @returns A function that takes a multiplier and returns the product of that
   *   multiplier and the multiplicand
   */
  (multiplicand: number): (multiplier: number) => number

  /**
   * Multiplies two numbers together.
   *
   * @param multiplier - The first factor
   * @param multiplicand - The second factor
   * @returns The product of the two numbers
   */
  (multiplier: number, multiplicand: number): number
} = dual(2, internal.multiply)

/**
 * Computes the product of all elements in an iterable collection of numbers.
 *
 * @remarks
 * Properties of this operation:
 *
 * - For an empty collection, returns 1 (the multiplicative identity element)
 * - Inherits the associative and commutative properties of multiplication
 * - The result is the same regardless of the order in which elements are
 *   multiplied
 * - If any element is 0, the result is 0 (absorption property)
 * - The operation maintains closure in the set of real numbers
 *
 * @memberof Number
 * @since 2.0.0
 * @category Math
 * @example
 *
 * ```ts
 * import * as assert from "node:assert/strict"
 * import * as RealNumber from "effect/Number"
 *
 * // Basic products
 * assert.deepStrictEqual(RealNumber.multiplyAll([2, 3, 4]), 24) // 2 × 3 × 4 = 24
 * assert.deepStrictEqual(RealNumber.multiplyAll([1.5, 2, 3]), 9) // 1.5 × 2 × 3 = 9
 *
 * // Empty collection returns the multiplicative identity (1)
 * assert.deepStrictEqual(RealNumber.multiplyAll([]), 1)
 *
 * // Single element collection
 * assert.deepStrictEqual(RealNumber.multiplyAll([42]), 42)
 *
 * // Products with negative numbers
 * assert.deepStrictEqual(RealNumber.multiplyAll([2, -3, 4]), -24) // 2 × (-3) × 4 = -24
 * assert.deepStrictEqual(RealNumber.multiplyAll([-2, -3]), 6) // (-2) × (-3) = 6
 *
 * // Zero property - if any element is zero, product is zero
 * assert.deepStrictEqual(RealNumber.multiplyAll([2, 0, 3]), 0)
 *
 * // Works with any iterable
 * assert.deepStrictEqual(RealNumber.multiplyAll(new Set([2, 3, 4])), 24)
 *
 * // Using with generated sequences
 * function* range(start: number, end: number) {
 *   for (let i = start; i <= end; i++) yield i
 * }
 *
 * // Compute factorial: 5! = 5 × 4 × 3 × 2 × 1 = 120
 * assert.deepStrictEqual(RealNumber.multiplyAll(range(1, 5)), 120)
 * ```
 *
 * @param collection - An `iterable` containing the `numbers` to multiply
 * @returns The product of all numbers in the collection, or 1 if the collection
 *   is empty
 */
export const multiplyAll: {
  (collection: Iterable<number>): number
} = internal.multiplyAll<number>

/**
 * Performs division in the set of JavaScript numbers, approximating division in
 * the mathematical set of real numbers (`ℝ`), returning the result wrapped in
 * an `Option` to handle division by zero.
 *
 * @remarks
 * For the partial binary operation `(÷): ℝ × (ℝ \ {0}) → ℝ` defined by standard
 * division, this function implements the division of two JavaScript numbers
 * with the following mathematical properties (subject to floating-point
 * precision limitations):
 *
 * - **Partial operation**: Division is defined for all `a, b ∈ ℝ` where `b ≠ 0`
 * - **Division by zero**: For any `a ∈ ℝ`, `a ÷ 0` is undefined (returns
 *   Option.none())
 * - **Relation to multiplication**: For all `a, b ∈ ℝ` where `b ≠ 0, a ÷ b = a ×
 *   (1/b)`
 * - **Non-commutativity**: In general, `a ÷ b ≠ b ÷ a` (unless `a = b = 1`)
 * - **Division by one**: For all `a ∈ ℝ`, `a ÷ 1 = a`
 * - **Self-division**: For all `a ∈ ℝ` where `a ≠ 0`, `a ÷ a = 1`
 * - **Sign rules**:
 *
 *   - Positive ÷ Positive = Positive
 *   - Negative ÷ Negative = Positive
 *   - Positive ÷ Negative = Negative
 *   - Negative ÷ Positive = Negative
 *
 * Note: JavaScript's floating-point arithmetic follows IEEE 754 standards and
 * may introduce precision errors when working with decimal values.
 * @memberof Number
 * @since 2.0.0
 * @category Math
 * @example
 *
 * ```ts
 * import * as assert from "node:assert/strict"
 * import { pipe } from "effect"
 * import * as RealNumber from "effect/Number"
 * import * as Option from "effect/Option"
 *
 * // Data-first style (direct application)
 * assert.deepStrictEqual(RealNumber.divide(6, 3), Option.some(2)) // 6 ÷ 3 = 2
 * assert.deepStrictEqual(RealNumber.divide(-8, 4), Option.some(-2)) // (-8) ÷ 4 = -2
 * assert.deepStrictEqual(RealNumber.divide(-10, -5), Option.some(2)) // (-10) ÷ (-5) = 2
 * assert.deepStrictEqual(
 *   RealNumber.divide(1, 3),
 *   Option.some(0.3333333333333333)
 * ) // Note: floating-point approximation
 *
 * // Handling division by zero
 * assert.deepStrictEqual(RealNumber.divide(6, 0), Option.none()) // 6 ÷ 0 is undefined
 *
 * // Data-last style (pipeable)
 * assert.deepStrictEqual(
 *   pipe(
 *     10,
 *     RealNumber.divide(2) // 10 ÷ 2 = 5
 *   ),
 *   Option.some(5)
 * )
 *
 * // Chaining multiple divisions using Option combinators
 * assert.deepStrictEqual(
 *   pipe(
 *     Option.some(24),
 *     Option.flatMap((n) => RealNumber.divide(n, 2)), // 24 ÷ 2 = 12
 *     Option.flatMap((n) => RealNumber.divide(n, 3)), // 12 ÷ 3 = 4
 *     Option.flatMap((n) => RealNumber.divide(n, 2)) // 4 ÷ 2 = 2
 *   ),
 *   Option.some(2)
 * )
 *
 * // Division-by-one property: a ÷ 1 = a
 * assert.deepStrictEqual(RealNumber.divide(42, 1), Option.some(42))
 *
 * // Self-division property: a ÷ a = 1 (for a ≠ 0)
 * assert.deepStrictEqual(RealNumber.divide(42, 42), Option.some(1))
 *
 * // Non-commutative property: a ÷ b ≠ b ÷ a
 * assert.notDeepStrictEqual(
 *   RealNumber.divide(6, 3), // 6 ÷ 3 = 2
 *   RealNumber.divide(3, 6) // 3 ÷ 6 = 0.5
 * )
 * ```
 *
 * @see {@link module:Integer.divideToNumber} - Division operation in the Integer domain returning a Number
 * @see {@link module:Integer.divideSafe} - Safe division operation in the Integer domain
 * @see {@link module:NaturalNumber.divideSafe} - Safe division operation in the Natural Number domain
 * @see {@link module:NaturalNumber.divideToNumber} - Division operation in the Natural Number domain returning a Number
 */
export const divide: {
  /**
   * Returns a function that divides its input by a specified divisor.
   *
   * @param divisor - The number to divide by
   * @returns A function that takes a dividend and returns the quotient wrapped
   *   in an Option (Option.none() if divisor is 0)
   */
  (divisor: number): (dividend: number) => Option<number>

  /**
   * Divides the dividend by the divisor and returns the quotient wrapped in an
   * Option.
   *
   * @param dividend - The number to be divided
   * @param divisor - The number to divide by
   * @returns Some(quotient) if the divisor is not 0, None otherwise
   */
  (dividend: number, divisor: number): Option<number>
} = dual(2, internal.divide)

/**
 * Represents errors that can occur during division operations.
 *
 * @memberof Number
 * @since 3.14.6
 * @category Errors
 * @experimental
 */
export const DivisionByZeroError = internal.DivisionByZeroError

/**
 * Performs division in the set of JavaScript numbers, but throws an exception
 * when dividing by zero.
 *
 * Unlike {@link module:Number.divide} which returns an Option, this function
 * directly returns a number but may throw an exception.
 *
 * @remarks
 * For the partial binary operation `(÷): ℝ × (ℝ \ {0}) → ℝ` defined by standard
 * division, this function implements the division of two JavaScript numbers
 * with the following mathematical properties (subject to floating-point
 * precision limitations):
 *
 * - **Partial operation**: Division is defined for all `a, b ∈ ℝ` where `b ≠ 0`
 * - **Division by zero**: For any `a ∈ ℝ`, `a ÷ 0` is undefined and throws
 *   {@link module:Number.DivisionByZeroError}
 * - **Relation to multiplication**: For all `a, b ∈ ℝ` where `b ≠ 0`, `a ÷ b = a
 *   × (1/b)`
 * - **Non-commutativity**: In general, `a ÷ b ≠ b ÷ a` (unless `a = b = 1`)
 * - **Division by one**: For all `a ∈ ℝ`, `a ÷ 1 = a`
 * - **Self-division**: For all `a ∈ ℝ` where `a ≠ 0`, `a ÷ a = 1`
 * - **Sign rules**:
 *
 *   - Positive ÷ Positive = Positive
 *   - Negative ÷ Negative = Positive
 *   - Positive ÷ Negative = Negative
 *   - Negative ÷ Positive = Negative
 *
 * **When to use**: This function is appropriate in contexts where:
 *
 * - Division by zero is considered a programming error that should halt execution
 * - You've already validated that the divisor is non-zero
 * - You're implementing code where exceptions are the preferred error handling
 *   mechanism
 *
 * **Safety considerations**:
 *
 * - For safer division that handles division by zero without throwing, use
 *   {@link divide}
 * - In performance-critical code paths, pre-validating the divisor and using this
 *   function may be more efficient than using the Option-returning variant
 *
 * @memberof Number
 * @since 2.0.0
 * @category Math
 * @example
 *
 * ```ts
 * import * as assert from "node:assert/strict"
 * import { pipe } from "effect"
 * import * as RealNumber from "effect/Number"
 *
 * // Data-first style (direct application)
 * assert.deepStrictEqual(RealNumber.unsafeDivide(6, 3), 2) // 6 ÷ 3 = 2
 * assert.deepStrictEqual(RealNumber.unsafeDivide(-8, 4), -2) // (-8) ÷ 4 = -2
 * assert.deepStrictEqual(RealNumber.unsafeDivide(-10, -5), 2) // (-10) ÷ (-5) = 2
 * assert.deepStrictEqual(RealNumber.unsafeDivide(1, 3), 0.3333333333333333)
 *
 * // Data-last style (pipeable)
 * assert.deepStrictEqual(
 *   pipe(
 *     10,
 *     RealNumber.unsafeDivide(2) // 10 ÷ 2 = 5
 *   ),
 *   5
 * )
 *
 * // Chaining multiple divisions
 * assert.deepStrictEqual(
 *   pipe(
 *     24,
 *     RealNumber.unsafeDivide(2), // 24 ÷ 2 = 12
 *     RealNumber.unsafeDivide(3), // 12 ÷ 3 = 4
 *     RealNumber.unsafeDivide(2) // 4 ÷ 2 = 2
 *   ),
 *   2
 * )
 *
 * // Error handling with try/catch
 * try {
 *   RealNumber.unsafeDivide(6, 0) // Throws DivisionByZeroError
 *   console.log("This will not execute")
 * } catch (e) {
 *   assert.ok(e instanceof RealNumber.DivisionByZeroError)
 *   console.log("Caught division by zero error")
 * }
 *
 * // Compare with safe division
 * const safeResult = RealNumber.divide(6, 3) // Option.some(2)
 * const unsafeResult = RealNumber.unsafeDivide(6, 3) // 2 directly
 * ```
 *
 * @throws - An {@link module:Number.DivisionByZeroError} if the divisor is zero.
 * @see {@link module:Number.divide} - Safe division returning an Option
 */
export const unsafeDivide: {
  /**
   * Returns a function that divides its input by a specified divisor.
   *
   * @param divisor - The number to divide by
   * @returns A function that takes a dividend and returns the quotient
   * @throws - An {@link module:Number.DivisionByZeroError} if the divisor is
   *   zero
   */
  (divisor: number): (dividend: number) => number

  /**
   * Divides the dividend by the divisor and returns the quotient.
   *
   * @param dividend - The number to be divided
   * @param divisor - The number to divide by
   * @returns The quotient of the division
   * @throws - An {@link module:Number.DivisionByZeroError} if the divisor is
   *   zero
   */
  (dividend: number, divisor: number): number
} = dual(2, internal.unsafeDivide)

/**
 * Returns the result of adding `1` to a given number.
 *
 * @memberof Number
 * @since 2.0.0
 * @category Math
 * @example
 *
 * ```ts
 * import * as assert from "node:assert/strict"
 * import { increment } from "effect/Number"
 *
 * assert.deepStrictEqual(increment(2), 3)
 * ```
 */
export const increment: (n: number) => number = internal.increment

/**
 * Decrements a number by `1`.
 *
 * @memberof Number
 * @since 2.0.0
 * @category Math
 * @example
 *
 * ```ts
 * import * as assert from "node:assert/strict"
 * import { decrement } from "effect/Number"
 *
 * assert.deepStrictEqual(decrement(3), 2)
 * ```
 */
export const decrement: (n: number) => number = internal.decrement

/**
 * @memberof Number
 * @since 2.0.0
 * @category Instances
 */
export const Equivalence: equivalence.Equivalence<number> = equivalence.number

/**
 * @memberof Number
 * @since 2.0.0
 * @category Instances
 */
export const Order: order.Order<number> = order.number

/**
 * Returns `true` if the first argument is less than the second, otherwise
 * `false`.
 *
 * @memberof Number
 * @since 2.0.0
 * @category Predicates
 * @example
 *
 * ```ts
 * import * as assert from "node:assert/strict"
 * import { lessThan } from "effect/Number"
 *
 * assert.deepStrictEqual(lessThan(2, 3), true)
 * assert.deepStrictEqual(lessThan(3, 3), false)
 * assert.deepStrictEqual(lessThan(4, 3), false)
 * ```
 */
export const lessThan: {
  (that: number): (self: number) => boolean
  (self: number, that: number): boolean
} = order.lessThan(Order)

/**
 * Returns a function that checks if a given `number` is less than or equal to
 * the provided one.
 *
 * @memberof Number
 * @since 2.0.0
 * @category Predicates
 * @example
 *
 * ```ts
 * import * as assert from "node:assert/strict"
 * import { lessThanOrEqualTo } from "effect/Number"
 *
 * assert.deepStrictEqual(lessThanOrEqualTo(2, 3), true)
 * assert.deepStrictEqual(lessThanOrEqualTo(3, 3), true)
 * assert.deepStrictEqual(lessThanOrEqualTo(4, 3), false)
 * ```
 */
export const lessThanOrEqualTo: {
  (that: number): (self: number) => boolean
  (self: number, that: number): boolean
} = order.lessThanOrEqualTo(Order)

/**
 * Returns `true` if the first argument is greater than the second, otherwise
 * `false`.
 *
 * @memberof Number
 * @since 2.0.0
 * @category Predicates
 * @example
 *
 * ```ts
 * import * as assert from "node:assert/strict"
 * import { greaterThan } from "effect/Number"
 *
 * assert.deepStrictEqual(greaterThan(2, 3), false)
 * assert.deepStrictEqual(greaterThan(3, 3), false)
 * assert.deepStrictEqual(greaterThan(4, 3), true)
 * ```
 */
export const greaterThan: {
  (that: number): (self: number) => boolean
  (self: number, that: number): boolean
} = order.greaterThan(Order)

/**
 * Returns a function that checks if a given `number` is greater than or equal
 * to the provided one.
 *
 * @memberof Number
 * @since 2.0.0
 * @category Predicates
 * @example
 *
 * ```ts
 * import * as assert from "node:assert/strict"
 * import { greaterThanOrEqualTo } from "effect/Number"
 *
 * assert.deepStrictEqual(greaterThanOrEqualTo(2, 3), false)
 * assert.deepStrictEqual(greaterThanOrEqualTo(3, 3), true)
 * assert.deepStrictEqual(greaterThanOrEqualTo(4, 3), true)
 * ```
 */
export const greaterThanOrEqualTo: {
  (that: number): (self: number) => boolean
  (self: number, that: number): boolean
} = order.greaterThanOrEqualTo(Order)

/**
 * Checks if a `number` is between a `minimum` and `maximum` value (inclusive).
 *
 * @memberof Number
 * @since 2.0.0
 * @category Predicates
 * @example
 *
 * ```ts
 * import * as assert from "node:assert/strict"
 * import { Number } from "effect"
 *
 * const between = Number.between({ minimum: 0, maximum: 5 })
 *
 * assert.deepStrictEqual(between(3), true)
 * assert.deepStrictEqual(between(-1), false)
 * assert.deepStrictEqual(between(6), false)
 * ```
 */
export const between: {
  (options: { minimum: number; maximum: number }): (self: number) => boolean
  (
    self: number,
    options: {
      minimum: number
      maximum: number
    }
  ): boolean
} = order.between(Order)

/**
 * Restricts the given `number` to be within the range specified by the
 * `minimum` and `maximum` values.
 *
 * - If the `number` is less than the `minimum` value, the function returns the
 *   `minimum` value.
 * - If the `number` is greater than the `maximum` value, the function returns the
 *   `maximum` value.
 * - Otherwise, it returns the original `number`.
 *
 * @memberof Number
 * @since 2.0.0
 * @example
 *
 * ```ts
 * import * as assert from "node:assert/strict"
 * import { Number } from "effect"
 *
 * const clamp = Number.clamp({ minimum: 1, maximum: 5 })
 *
 * assert.equal(clamp(3), 3)
 * assert.equal(clamp(0), 1)
 * assert.equal(clamp(6), 5)
 * ```
 */
export const clamp: {
  (options: { minimum: number; maximum: number }): (self: number) => number
  (
    self: number,
    options: {
      minimum: number
      maximum: number
    }
  ): number
} = order.clamp(Order)

/**
 * Returns the minimum between two `number`s.
 *
 * @memberof Number
 * @since 2.0.0
 * @example
 *
 * ```ts
 * import * as assert from "node:assert/strict"
 * import { min } from "effect/Number"
 *
 * assert.deepStrictEqual(min(2, 3), 2)
 * ```
 */
export const min: {
  (that: number): (self: number) => number
  (self: number, that: number): number
} = order.min(Order)

/**
 * Returns the maximum between two `number`s.
 *
 * @memberof Number
 * @since 2.0.0
 * @example
 *
 * ```ts
 * import * as assert from "node:assert/strict"
 * import { max } from "effect/Number"
 *
 * assert.deepStrictEqual(max(2, 3), 3)
 * ```
 */
export const max: {
  (that: number): (self: number) => number
  (self: number, that: number): number
} = order.max(Order)

/**
 * Determines the sign of a given `number`.
 *
 * @memberof Number
 * @since 2.0.0
 * @category Math
 * @example
 *
 * ```ts
 * import * as assert from "node:assert/strict"
 * import { sign } from "effect/Number"
 *
 * assert.deepStrictEqual(sign(-5), -1)
 * assert.deepStrictEqual(sign(0), 0)
 * assert.deepStrictEqual(sign(5), 1)
 * ```
 */
export const sign = (n: number): Ordering => Order(n, 0)

/**
 * Returns the remainder left over when one operand is divided by a second
 * operand.
 *
 * It always takes the sign of the dividend.
 *
 * @memberof Number
 * @since 2.0.0
 * @category Math
 * @example
 *
 * ```ts
 * import * as assert from "node:assert/strict"
 * import { remainder } from "effect/Number"
 *
 * assert.deepStrictEqual(remainder(2, 2), 0)
 * assert.deepStrictEqual(remainder(3, 2), 1)
 * assert.deepStrictEqual(remainder(-4, 2), -0)
 * ```
 */
export const remainder: {
  (divisor: number): (dividend: number) => number
  (dividend: number, divisor: number): number
} = dual(2, internal.remainder)

/**
 * Returns the next power of 2 greater than or equal to the given number.
 *
 * - For `positive` inputs, returns the smallest power of 2 that is >= the input
 * - For `zero`, returns 2
 * - For `negative` inputs, returns NaN (as logarithms of negative numbers are
 *   undefined)
 * - For `NaN` input, returns NaN
 * - For `Infinity`, returns Infinity
 *
 * @memberof Number
 * @since 2.0.0
 * @category Math
 * @example
 *
 * ```ts
 * import * as assert from "node:assert/strict"
 * import { nextPow2 } from "effect/Number"
 *
 * assert.deepStrictEqual(nextPow2(5), 8)
 * assert.deepStrictEqual(nextPow2(17), 32)
 * assert.deepStrictEqual(nextPow2(0), 2)
 * assert.deepStrictEqual(Number.isNaN(nextPow2(-1)), true) // Negative inputs result in NaN
 * ```
 */
export const nextPow2 = (n: number): number => {
  const nextPow = Math.ceil(Math.log(n) / Math.log(2))
  return Math.max(Math.pow(2, nextPow), 2)
}

/**
 * Tries to parse a `number` from a `string` using the `Number()` function. The
 * following special string values are supported: "NaN", "Infinity",
 * "-Infinity".
 *
 * @memberof Number
 * @since 2.0.0
 * @category Constructors
 */
export const parse: {
  (s: "NaN" | "Infinity" | "-Infinity" | (string & {})): Option<number>
} = (s) => {
  if (s === "NaN") {
    return option.some(NaN)
  }
  if (s === "Infinity") {
    return option.some(Infinity)
  }
  if (s === "-Infinity") {
    return option.some(-Infinity)
  }
  if (s.trim() === "") {
    return option.none
  }
  const n = Number(s)
  return Number.isNaN(n) ? option.none : option.some(n)
}

/**
 * Returns the number rounded with the given precision.
 *
 * @memberof Number
 * @since 3.8.0
 * @category Math
 * @example
 *
 * ```ts
 * import * as assert from "node:assert/strict"
 * import { round } from "effect/Number"
 *
 * assert.deepStrictEqual(round(1.1234, 2), 1.12)
 * assert.deepStrictEqual(round(1.567, 2), 1.57)
 * ```
 */
export const round: {
  (precision: number): (self: number) => number
  (self: number, precision: number): number
} = dual(2, (self: number, precision: number): number => {
  const factor = Math.pow(10, precision)
  return Math.round(self * factor) / factor
})
