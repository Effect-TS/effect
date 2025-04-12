/**
 * @since 2.0.0
 */

export {
  /**
   * @since 2.0.0
   */
  absurd,
  /**
   * @since 2.0.0
   */
  flow,
  /**
   * @since 2.0.0
   */
  hole,
  /**
   * @since 2.0.0
   */
  identity,
  /**
   * @since 2.0.0
   */
  pipe,
  /**
   * @since 2.0.0
   */
  unsafeCoerce
} from "./Function.js"

/**
 * @since 3.10.0
 */
export * as Arbitrary from "./Arbitrary.js"

/**
 * This module provides utility functions for working with arrays in TypeScript.
 *
 * @since 2.0.0
 */
export * as Array from "./Array.js"

/**
 * This module provides utility functions and type class instances for working with the `BigDecimal` type in TypeScript.
 * It includes functions for basic arithmetic operations, as well as type class instances for `Equivalence` and `Order`.
 *
 * A `BigDecimal` allows storing any real number to arbitrary precision; which avoids common floating point errors
 * (such as 0.1 + 0.2 ≠ 0.3) at the cost of complexity.
 *
 * Internally, `BigDecimal` uses a `BigInt` object, paired with a 64-bit integer which determines the position of the
 * decimal point. Therefore, the precision *is not* actually arbitrary, but limited to 2<sup>63</sup> decimal places.
 *
 * It is not recommended to convert a floating point number to a decimal directly, as the floating point representation
 * may be unexpected.
 *
 * @since 2.0.0
 */
export * as BigDecimal from "./BigDecimal.js"

/**
 * This module provides utility functions and type class instances for working with the `bigint` type in TypeScript.
 * It includes functions for basic arithmetic operations, as well as type class instances for
 * `Equivalence` and `Order`.
 *
 * @since 2.0.0
 */
export * as BigInt from "./BigInt.js"

/**
 * This module provides utility functions and type class instances for working with the `boolean` type in TypeScript.
 * It includes functions for basic boolean operations, as well as type class instances for
 * `Equivalence` and `Order`.
 *
 * @since 2.0.0
 */
export * as Boolean from "./Boolean.js"

/**
 * This module provides types and utility functions to create and work with branded types,
 * which are TypeScript types with an added type tag to prevent accidental usage of a value in the wrong context.
 *
 * The `refined` and `nominal` functions are both used to create branded types in TypeScript.
 * The main difference between them is that `refined` allows for validation of the data, while `nominal` does not.
 *
 * The `nominal` function is used to create a new branded type that has the same underlying type as the input, but with a different name.
 * This is useful when you want to distinguish between two values of the same type that have different meanings.
 * The `nominal` function does not perform any validation of the input data.
 *
 * On the other hand, the `refined` function is used to create a new branded type that has the same underlying type as the input,
 * but with a different name, and it also allows for validation of the input data.
 * The `refined` function takes a predicate that is used to validate the input data.
 * If the input data fails the validation, a `BrandErrors` is returned, which provides information about the specific validation failure.
 *
 * @since 2.0.0
 */
export * as Brand from "./Brand.js"

/**
 * @since 2.0.0
 */
export * as Cache from "./Cache.js"

/**
 * The `Effect<A, E, R>` type is polymorphic in values of type `E` and we can
 * work with any error type that we want. However, there is a lot of information
 * that is not inside an arbitrary `E` value. So as a result, an `Effect` needs
 * somewhere to store things like unexpected errors or defects, stack and
 * execution traces, causes of fiber interruptions, and so forth.
 *
 * Effect-TS is very strict about preserving the full information related to a
 * failure. It captures all type of errors into the `Cause` data type. `Effect`
 * uses the `Cause<E>` data type to store the full story of failure. So its
 * error model is lossless. It doesn't throw information related to the failure
 * result. So we can figure out exactly what happened during the operation of
 * our effects.
 *
 * It is important to note that `Cause` is an underlying data type representing
 * errors occuring within an `Effect` workflow. Thus, we don't usually deal with
 * `Cause`s directly. Even though it is not a data type that we deal with very
 * often, the `Cause` of a failing `Effect` workflow can be accessed at any
 * time, which gives us total access to all parallel and sequential errors in
 * occurring within our codebase.
 *
 * @since 2.0.0
 */
export * as Cause from "./Cause.js"

/**
 * @since 2.0.0
 */
export * as Channel from "./Channel.js"

/**
 * @since 2.0.0
 */
export * as ChildExecutorDecision from "./ChildExecutorDecision.js"

/**
 * @since 2.0.0
 */
export * as Chunk from "./Chunk.js"

/**
 * @since 2.0.0
 */
export * as Clock from "./Clock.js"

/**
 * @since 2.0.0
 */
export * as Config from "./Config.js"

/**
 * @since 2.0.0
 */
export * as ConfigError from "./ConfigError.js"

/**
 * @since 2.0.0
 */
export * as ConfigProvider from "./ConfigProvider.js"

/**
 * @since 2.0.0
 */
export * as ConfigProviderPathPatch from "./ConfigProviderPathPatch.js"

/**
 * @since 2.0.0
 */
export * as Console from "./Console.js"

/**
 * This module provides a data structure called `Context` that can be used for dependency injection in effectful
 * programs. It is essentially a table mapping `Tag`s to their implementations (called `Service`s), and can be used to
 * manage dependencies in a type-safe way. The `Context` data structure is essentially a way of providing access to a set
 * of related services that can be passed around as a single unit. This module provides functions to create, modify, and
 * query the contents of a `Context`, as well as a number of utility types for working with tags and services.
 *
 * @since 2.0.0
 */
export * as Context from "./Context.js"

/**
 * @since 2.0.0
 */
export * as Cron from "./Cron.js"

/**
 * @since 2.0.0
 */
export * as Data from "./Data.js"

/**
 * @since 3.6.0
 */
export * as DateTime from "./DateTime.js"

/**
 * @since 2.0.0
 */
export * as DefaultServices from "./DefaultServices.js"

/**
 * @since 2.0.0
 */
export * as Deferred from "./Deferred.js"

/**
 * @since 2.0.0
 */
export * as Differ from "./Differ.js"

/**
 * @since 2.0.0
 */
export * as Duration from "./Duration.js"

/**
 * @since 2.0.0
 */
export * as Effect from "./Effect.js"

/**
 * @since 2.0.0
 */
export * as Effectable from "./Effectable.js"

/**
 * @since 2.0.0
 */
export * as Either from "./Either.js"

/**
 * This module provides encoding & decoding functionality for:
 *
 * - base64 (RFC4648)
 * - base64 (URL)
 * - hex
 *
 * @since 2.0.0
 */
export * as Encoding from "./Encoding.js"

/**
 * @since 2.0.0
 */
export * as Equal from "./Equal.js"

/**
 * This module provides an implementation of the `Equivalence` type class, which defines a binary relation
 * that is reflexive, symmetric, and transitive. In other words, it defines a notion of equivalence between values of a certain type.
 * These properties are also known in mathematics as an "equivalence relation".
 *
 * @since 2.0.0
 */
export * as Equivalence from "./Equivalence.js"

/**
 * @since 2.0.0
 */
export * as ExecutionStrategy from "./ExecutionStrategy.js"

/**
 * @since 2.0.0
 */
export * as Exit from "./Exit.js"

/**
 * @since 3.10.0
 */
export * as FastCheck from "./FastCheck.js"

/**
 * @since 2.0.0
 */
export * as Fiber from "./Fiber.js"

/**
 * @since 2.0.0
 */
export * as FiberHandle from "./FiberHandle.js"

/**
 * @since 2.0.0
 */
export * as FiberId from "./FiberId.js"

/**
 * @since 2.0.0
 */
export * as FiberMap from "./FiberMap.js"

/**
 * @since 2.0.0
 */
export * as FiberRef from "./FiberRef.js"

/**
 * @since 2.0.0
 */
export * as FiberRefs from "./FiberRefs.js"

/**
 * @since 2.0.0
 */
export * as FiberRefsPatch from "./FiberRefsPatch.js"

/**
 * @since 2.0.0
 */
export * as FiberSet from "./FiberSet.js"

/**
 * @since 2.0.0
 */
export * as FiberStatus from "./FiberStatus.js"

/**
 * @since 2.0.0
 */
export * as Function from "./Function.js"

/**
 * The `GlobalValue` module ensures that a single instance of a value is created globally,
 * even when modules are imported multiple times (e.g., due to mixing CommonJS and ESM builds)
 * or during hot-reloading in development environments like Next.js or Remix.
 *
 * It achieves this by using a versioned global store, identified by a unique `Symbol` tied to
 * the current version of the `effect` library. The store holds values that are keyed by an identifier,
 * allowing the reuse of previously computed instances across imports or reloads.
 *
 * This pattern is particularly useful in scenarios where frequent reloading can cause services or
 * single-instance objects to be recreated unnecessarily, such as in development environments with hot-reloading.
 *
 * @since 2.0.0
 */
export * as GlobalValue from "./GlobalValue.js"

/**
 * @since 2.0.0
 */
export * as GroupBy from "./GroupBy.js"

/**
 * @since 2.0.0
 */
export * as HKT from "./HKT.js"

/**
 * @since 2.0.0
 */
export * as Hash from "./Hash.js"

/**
 * @since 2.0.0
 */
export * as HashMap from "./HashMap.js"

/**
 * # HashSet
 *
 * An immutable `HashSet` provides a collection of unique values with efficient
 * lookup, insertion and removal. Once created, a `HashSet` cannot be modified;
 * any operation that would alter the set instead returns a new `HashSet` with
 * the changes. This immutability offers benefits like predictable state
 * management and easier reasoning about your code.
 *
 * ## What Problem Does It Solve?
 *
 * `HashSet` solves the problem of maintaining an unsorted collection where each
 * value appears exactly once, with fast operations for checking membership and
 * adding/removing values.
 *
 * ## When to Use
 *
 * Use `HashSet` when you need:
 *
 * - A collection with no duplicate values
 * - Efficient membership testing (**`O(1)`** average complexity)
 * - Set operations like union, intersection, and difference
 * - An immutable data structure that preserves functional programming patterns
 *
 * ## Advanced Features
 *
 * HashSet provides operations for:
 *
 * - Transforming sets with map and flatMap
 * - Filtering elements with filter
 * - Combining sets with union, intersection and difference
 * - Performance optimizations via mutable operations in controlled contexts
 *
 * ## Performance Characteristics
 *
 * - **Lookup** operations ({@link module:HashSet.has}): **`O(1)`** average time
 *   complexity
 * - **Insertion** operations ({@link module:HashSet.add}): **`O(1)`** average time
 *   complexity
 * - **Removal** operations ({@link module:HashSet.remove}): **`O(1)`** average
 *   time complexity
 * - **Set** operations ({@link module:HashSet.union},
 *   {@link module:HashSet.intersection}): **`O(n)`** where n is the size of the
 *   smaller set
 * - **Iteration**: **`O(n)`** where n is the size of the set
 *
 * The HashSet data structure implements the following traits:
 *
 * - {@link Iterable}: allows iterating over the values in the set
 * - {@link Equal}: allows comparing two sets for value-based equality
 * - {@link Pipeable}: allows chaining operations with the pipe operator
 * - {@link Inspectable}: allows inspecting the contents of the set
 *
 * ## Operations Reference
 *
 * | Category     | Operation                           | Description                                 | Complexity |
 * | ------------ | ----------------------------------- | ------------------------------------------- | ---------- |
 * | constructors | {@link module:HashSet.empty}        | Creates an empty HashSet                    | O(1)       |
 * | constructors | {@link module:HashSet.fromIterable} | Creates a HashSet from an iterable          | O(n)       |
 * | constructors | {@link module:HashSet.make}         | Creates a HashSet from multiple values      | O(n)       |
 * |              |                                     |                                             |            |
 * | elements     | {@link module:HashSet.has}          | Checks if a value exists in the set         | O(1) avg   |
 * | elements     | {@link module:HashSet.some}         | Checks if any element satisfies a predicate | O(n)       |
 * | elements     | {@link module:HashSet.every}        | Checks if all elements satisfy a predicate  | O(n)       |
 * | elements     | {@link module:HashSet.isSubset}     | Checks if a set is a subset of another      | O(n)       |
 * |              |                                     |                                             |            |
 * | getters      | {@link module:HashSet.values}       | Gets an iterator of all values              | O(1)       |
 * | getters      | {@link module:HashSet.toValues}     | Gets an array of all values                 | O(n)       |
 * | getters      | {@link module:HashSet.size}         | Gets the number of elements                 | O(1)       |
 * |              |                                     |                                             |            |
 * | mutations    | {@link module:HashSet.add}          | Adds a value to the set                     | O(1) avg   |
 * | mutations    | {@link module:HashSet.remove}       | Removes a value from the set                | O(1) avg   |
 * | mutations    | {@link module:HashSet.toggle}       | Toggles a value's presence                  | O(1) avg   |
 * |              |                                     |                                             |            |
 * | operations   | {@link module:HashSet.difference}   | Computes set difference (A - B)             | O(n)       |
 * | operations   | {@link module:HashSet.intersection} | Computes set intersection (A ∩ B)           | O(n)       |
 * | operations   | {@link module:HashSet.union}        | Computes set union (A ∪ B)                  | O(n)       |
 * |              |                                     |                                             |            |
 * | mapping      | {@link module:HashSet.map}          | Transforms each element                     | O(n)       |
 * |              |                                     |                                             |            |
 * | sequencing   | {@link module:HashSet.flatMap}      | Transforms and flattens elements            | O(n)       |
 * |              |                                     |                                             |            |
 * | traversing   | {@link module:HashSet.forEach}      | Applies a function to each element          | O(n)       |
 * |              |                                     |                                             |            |
 * | folding      | {@link module:HashSet.reduce}       | Reduces the set to a single value           | O(n)       |
 * |              |                                     |                                             |            |
 * | filtering    | {@link module:HashSet.filter}       | Keeps elements that satisfy a predicate     | O(n)       |
 * |              |                                     |                                             |            |
 * | partitioning | {@link module:HashSet.partition}    | Splits into two sets by a predicate         | O(n)       |
 *
 * ## Notes
 *
 * ### Composability with the Effect Ecosystem:
 *
 * This `HashSet` is designed to work seamlessly within the Effect ecosystem. It
 * implements the {@link Iterable}, {@link Equal}, {@link Pipeable}, and
 * {@link Inspectable} traits from Effect. This ensures compatibility with other
 * Effect data structures and functionalities. For example, you can easily use
 * Effect's `pipe` method to chain operations on the `HashSet`.
 *
 * **Equality of Elements with Effect's {@link Equal `Equal`} Trait:**
 *
 * This `HashSet` relies on Effect's {@link Equal} trait to determine the
 * uniqueness of elements within the set. The way equality is checked depends on
 * the type of the elements:
 *
 * - **Primitive Values:** For primitive JavaScript values like strings, numbers,
 *   booleans, `null`, and `undefined`, equality is determined by their value
 *   (similar to the `===` operator).
 * - **Objects and Custom Types:** For objects and other custom types, equality is
 *   determined by whether those types implement the {@link Equal} interface
 *   themselves. If an element type implements `Equal`, the `HashSet` will
 *   delegate to that implementation to perform the equality check. This allows
 *   you to define custom logic for determining when two instances of your
 *   objects should be considered equal based on their properties, rather than
 *   just their object identity.
 *
 * ```ts
 * import { Equal, Hash, HashSet } from "effect"
 *
 * class Person implements Equal.Equal {
 *   constructor(
 *     readonly id: number, // Unique identifier
 *     readonly name: string,
 *     readonly age: number
 *   ) {}
 *
 *   // Define equality based on id, name, and age
 *   [Equal.symbol](that: Equal.Equal): boolean {
 *     if (that instanceof Person) {
 *       return (
 *         Equal.equals(this.id, that.id) &&
 *         Equal.equals(this.name, that.name) &&
 *         Equal.equals(this.age, that.age)
 *       )
 *     }
 *     return false
 *   }
 *
 *   // Generate a hash code based on the unique id
 *   [Hash.symbol](): number {
 *     return Hash.hash(this.id)
 *   }
 * }
 *
 * // Creating a HashSet with objects that implement the Equal interface
 * const set = HashSet.empty().pipe(
 *   HashSet.add(new Person(1, "Alice", 30)),
 *   HashSet.add(new Person(1, "Alice", 30))
 * )
 *
 * // HashSet recognizes them as equal, so only one element is stored
 * console.log(HashSet.size(set))
 * // Output: 1
 * ```
 *
 * **Simplifying Equality and Hashing with `Data` and `Schema`:**
 *
 * Effect's {@link Data} and {@link Schema `Schema.Data`} modules offer powerful
 * ways to automatically handle the implementation of both the {@link Equal} and
 * {@link Hash} traits for your custom data structures.
 *
 * - **`Data` Module:** By using constructors like `Data.struct`, `Data.tuple`,
 *   `Data.array`, or `Data.case` to define your data types, Effect
 *   automatically generates the necessary implementations for value-based
 *   equality and consistent hashing. This significantly reduces boilerplate and
 *   ensures correctness.
 *
 * ```ts
 * import { HashSet, Data, Equal } from "effect"
 * import assert from "node:assert/strict"
 *
 * // Data.* implements the `Equal` traits for us
 * const person1 = Data.struct({ id: 1, name: "Alice", age: 30 })
 * const person2 = Data.struct({ id: 1, name: "Alice", age: 30 })
 *
 * assert(Equal.equals(person1, person2))
 *
 * const set = HashSet.empty().pipe(
 *   HashSet.add(person1),
 *   HashSet.add(person2)
 * )
 *
 * // HashSet recognizes them as equal, so only one element is stored
 * console.log(HashSet.size(set)) // Output: 1
 * ```
 *
 * - **`Schema` Module:** When defining data schemas using the {@link Schema}
 *   module, you can use `Schema.Data` to automatically include the `Equal` and
 *   `Hash` traits in the decoded objects. This is particularly important when
 *   working with `HashSet`. **For decoded objects to be correctly recognized as
 *   equal within a `HashSet`, ensure that the schema for those objects is
 *   defined using `Schema.Data`.**
 *
 * ```ts
 * import { Equal, HashSet, Schema } from "effect"
 * import assert from "node:assert/strict"
 *
 * // Schema.Data implements the `Equal` traits for us
 * const PersonSchema = Schema.Data(
 *   Schema.Struct({
 *     id: Schema.Number,
 *     name: Schema.String,
 *     age: Schema.Number
 *   })
 * )
 *
 * const Person = Schema.decode(PersonSchema)
 *
 * const person1 = Person({ id: 1, name: "Alice", age: 30 })
 * const person2 = Person({ id: 1, name: "Alice", age: 30 })
 *
 * assert(Equal.equals(person1, person2)) // Output: true
 *
 * const set = HashSet.empty().pipe(
 *   HashSet.add(person1),
 *   HashSet.add(person2)
 * )
 *
 * // HashSet thanks to Schema.Data implementation of the `Equal` trait, recognizes the two Person as equal, so only one element is stored
 * console.log(HashSet.size(set)) // Output: 1
 * ```
 *
 * ### Interoperability with the JavaScript Runtime:
 *
 * To interoperate with the regular JavaScript runtime, Effect's `HashSet`
 * provides methods to access its elements in formats readily usable by
 * JavaScript APIs: {@link values `HashSet.values`},
 * {@link toValues `HashSet.toValues`}
 *
 * ```ts
 * import { HashSet } from "effect"
 *
 * const hashSet: HashSet.HashSet<number> = HashSet.make(1, 2, 3)
 *
 * // Using HashSet.values to convert HashSet.HashSet<A> to IterableIterator<A>
 * const iterable: IterableIterator<number> = HashSet.values(hashSet)
 *
 * console.log(...iterable) // Logs:  1 2 3
 *
 * // Using HashSet.toValues to convert HashSet.HashSet<A> to Array<A>
 * const array: Array<number> = HashSet.toValues(hashSet)
 *
 * console.log(array) // Logs: [ 1, 2, 3 ]
 * ```
 *
 * Be mindful of performance implications (both time and space complexity) when
 * frequently converting between Effect's immutable HashSet and mutable
 * JavaScript data structures, especially for large collections.
 *
 * @module HashSet
 * @since 2.0.0
 */
export * as HashSet from "./HashSet.js"

/**
 * @since 2.0.0
 */
export * as Inspectable from "./Inspectable.js"

/**
 * # Integer
 *
 * ## Mathematical Domain Representation
 *
 * `Integer` represents the set of whole numbers (`ℤ = {..., -2, -1, 0, 1, 2,
 * ...}`), extending natural numbers to include negative values.
 *
 * In mathematics, integers form a ring structure with operations of addition
 * and multiplication. They have additive inverses (negatives) but not
 * multiplicative inverses (reciprocals).
 *
 * The integers exhibit key mathematical properties:
 *
 * - **Discreteness**: There is a distinct successor and predecessor for each
 *   integer
 * - **Total ordering**: For any two integers, one is greater than, equal to, or
 *   less than the other
 * - **Euclidean property**: For any integers `a` and `b` where `b ≠ 0`, there
 *   exist unique `q`, `r` such that `a = bq + r` where `0 ≤ r < |b|`
 * - **Closure** under addition, subtraction, and multiplication (but not
 *   division)
 *
 * ## Constraints Imposed
 *
 * By modeling values as `Integer`, you accept the following constraints:
 *
 * - **Integrity**: Values must be whole numbers (no fractional components)
 * - **Domain preservation**: Division operations might leave the domain and must
 *   be handled specially
 * - **Bounded range**: JavaScript integers are limited to safe integer range
 *   (-(2^53-1) to (2^53-1))
 *
 * ## Derived Guarantees and Business Value
 *
 * These constraints unlock powerful guarantees that directly translate to
 * business value:
 *
 * | Mathematical Guarantee | Business Value                                       | Usage Example                              |
 * | ---------------------- | ---------------------------------------------------- | ------------------------------------------ |
 * | Exact arithmetic       | No floating-point errors for whole number operations | Financial calculations, inventory tracking |
 * | Bidirectional values   | Can represent increases and decreases equally        | Account balances, temperature changes      |
 * | Ring structure         | Predictable behavior for arithmetic operations       | Coordinate systems, relative positioning   |
 * | Discrete steps         | Clear predecessor/successor relationships            | Versioning, sequential identifiers         |
 * | Deterministic ordering | Consistent sorting and comparison                    | Ranked items, priority systems             |
 *
 * ## Domain Modeling Applications
 *
 * `Integer` excels at modeling domains where quantities need to be whole
 * numbers but can be positive or negative:
 *
 * ```ts
 * import { pipe } from "effect"
 * import * as Integer from "effect/Integer"
 * import * as N from "effect/NaturalNumber"
 *
 * // Banking transaction system example
 * type Transaction = {
 *   id: string
 *   description: string
 *   amountInCents: Integer.Integer // Whole cents, positive or negative
 * }
 *
 * type Account = {
 *   id: string
 *   balanceInCents: Integer.Integer // Can be positive (credit) or negative (debit)
 *   transactions: Array<Transaction>
 * }
 *
 * // Apply a transaction to an account
 * export const applyTransaction = (
 *   account: Account,
 *   transaction: Transaction
 * ): Account => ({
 *   ...account,
 *   balanceInCents: Integer.sum(
 *     account.balanceInCents,
 *     transaction.amountInCents
 *   ),
 *   transactions: [...account.transactions, transaction]
 * })
 *
 * // Determine account status based on balance
 * export const getAccountStatus = (
 *   account: Account
 * ): "overdrawn" | "at-risk" | "good" | "excellent" =>
 *   pipe(account.balanceInCents, Integer.sign, (status) => {
 *     if (status === -1) return "overdrawn"
 *     if (Integer.lessThan(account.balanceInCents, N.of(10000)))
 *       return "at-risk"
 *     if (Integer.lessThan(account.balanceInCents, N.of(100000)))
 *       return "good"
 *     return "excellent"
 *   })
 * ```
 *
 * ## When to Use Integer
 *
 * Use the `Integer` module when you need:
 *
 * - Strict whole-number arithmetic with no fractional components
 * - To model quantities that can be negative but must be whole numbers
 * - Precise control over numeric type flow in function composition
 * - Mathematical operations that preserve integer properties
 * - Operations that intelligently return more specific types when appropriate
 *
 * ## Choosing the Right Numeric Type
 *
 * | If your domain concept...         | Then use...                  | Examples                       |
 * | --------------------------------- | ---------------------------- | ------------------------------ |
 * | Cannot be negative, must be whole | {@link module:NaturalNumber} | Inventory, age, count, index   |
 * | Can be negative, must be whole    | {@link module:Integer}       | Temperature, position, balance |
 * | Can be fractional                 | {@link module:Number}        | Prices, rates, measurements    |
 * | Needs arbitrary precision         | {@link BigInt}               | Cryptography, financial totals |
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
 *   Integer.sum(Integer.of(10)), // Integer → Integer
 *   Integer.multiply(Integer.of(2)), // Integer → Integer
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
 * import { Option, pipe } from "effect"
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
 *   Integer.divideToNumber(NaturalNumber.of(3)), // Integer → Option<number>
 *   Option.map(
 *     // Cannot use Integer operations here!
 *     RealNumber.multiply(2) // number → number
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
 * import { Option, pipe } from "effect"
 * import * as Integer from "effect/Integer"
 *
 * const result = pipe(
 *   Integer.of(10),
 *   Integer.divideSafe(Integer.of(3)), // Integer → Option<Integer>
 *   Option.map(Integer.increment), // Option<Integer> → Option<Integer>
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
 * @module Integer
 * @since 3.14.6
 */
export * as Integer from "./Integer.js"

/**
 * This module provides utility functions for working with Iterables in TypeScript.
 *
 * @since 2.0.0
 */
export * as Iterable from "./Iterable.js"

/**
 * @since 3.10.0
 */
export * as JSONSchema from "./JSONSchema.js"

/**
 * @since 2.0.0
 */
export * as KeyedPool from "./KeyedPool.js"

/**
 * A `Layer<ROut, E, RIn>` describes how to build one or more services in your
 * application. Services can be injected into effects via
 * `Effect.provideService`. Effects can require services via `Effect.service`.
 *
 * Layer can be thought of as recipes for producing bundles of services, given
 * their dependencies (other services).
 *
 * Construction of services can be effectful and utilize resources that must be
 * acquired and safely released when the services are done being utilized.
 *
 * By default layers are shared, meaning that if the same layer is used twice
 * the layer will only be allocated a single time.
 *
 * Because of their excellent composition properties, layers are the idiomatic
 * way in Effect-TS to create services that depend on other services.
 *
 * @since 2.0.0
 */
export * as Layer from "./Layer.js"

/**
 * @since 3.14.0
 * @experimental
 */
export * as LayerMap from "./LayerMap.js"

/**
 * A data type for immutable linked lists representing ordered collections of elements of type `A`.
 *
 * This data type is optimal for last-in-first-out (LIFO), stack-like access patterns. If you need another access pattern, for example, random access or FIFO, consider using a collection more suited to this than `List`.
 *
 * **Performance**
 *
 * - Time: `List` has `O(1)` prepend and head/tail access. Most other operations are `O(n)` on the number of elements in the list. This includes the index-based lookup of elements, `length`, `append` and `reverse`.
 * - Space: `List` implements structural sharing of the tail list. This means that many operations are either zero- or constant-memory cost.
 *
 * @since 2.0.0
 */
export * as List from "./List.js"

/**
 * @since 2.0.0
 */
export * as LogLevel from "./LogLevel.js"

/**
 * @since 2.0.0
 */
export * as LogSpan from "./LogSpan.js"

/**
 * @since 2.0.0
 */
export * as Logger from "./Logger.js"

/**
 * @since 3.8.0
 * @experimental
 */
export * as Mailbox from "./Mailbox.js"

/**
 * @since 2.0.0
 */
export * as ManagedRuntime from "./ManagedRuntime.js"

/**
 * The `effect/match` module provides a type-safe pattern matching system for
 * TypeScript. Inspired by functional programming, it simplifies conditional
 * logic by replacing verbose if/else or switch statements with a structured and
 * expressive API.
 *
 * This module supports matching against types, values, and discriminated unions
 * while enforcing exhaustiveness checking to ensure all cases are handled.
 *
 * Although pattern matching is not yet a native JavaScript feature,
 * `effect/match` offers a reliable implementation that is available today.
 *
 * **How Pattern Matching Works**
 *
 * Pattern matching follows a structured process:
 *
 * - **Creating a matcher**: Define a `Matcher` that operates on either a
 *   specific `Match.type` or `Match.value`.
 *
 * - **Defining patterns**: Use combinators such as `Match.when`, `Match.not`,
 *   and `Match.tag` to specify matching conditions.
 *
 * - **Completing the match**: Apply a finalizer such as `Match.exhaustive`,
 *   `Match.orElse`, or `Match.option` to determine how unmatched cases should
 *   be handled.
 *
 * @since 1.0.0
 */
export * as Match from "./Match.js"

/**
 * @since 2.0.0
 */
export * as MergeDecision from "./MergeDecision.js"

/**
 * @since 2.0.0
 */
export * as MergeState from "./MergeState.js"

/**
 * @since 2.0.0
 */
export * as MergeStrategy from "./MergeStrategy.js"

/**
 * @since 2.0.0
 */
export * as Metric from "./Metric.js"

/**
 * @since 2.0.0
 */
export * as MetricBoundaries from "./MetricBoundaries.js"

/**
 * @since 2.0.0
 */
export * as MetricHook from "./MetricHook.js"

/**
 * @since 2.0.0
 */
export * as MetricKey from "./MetricKey.js"

/**
 * @since 2.0.0
 */
export * as MetricKeyType from "./MetricKeyType.js"

/**
 * @since 2.0.0
 */
export * as MetricLabel from "./MetricLabel.js"

/**
 * @since 2.0.0
 */
export * as MetricPair from "./MetricPair.js"

/**
 * @since 2.0.0
 */
export * as MetricPolling from "./MetricPolling.js"

/**
 * @since 2.0.0
 */
export * as MetricRegistry from "./MetricRegistry.js"

/**
 * @since 2.0.0
 */
export * as MetricState from "./MetricState.js"

/**
 * A lightweight alternative to the `Effect` data type, with a subset of the functionality.
 *
 * @since 3.4.0
 * @experimental
 */
export * as Micro from "./Micro.js"

/**
 * @since 2.0.0
 *
 * Enables low level framework authors to run on their own isolated effect version
 */
export * as ModuleVersion from "./ModuleVersion.js"

/**
 * @since 2.0.0
 */
export * as MutableHashMap from "./MutableHashMap.js"

/**
 * # MutableHashSet
 *
 * A mutable `MutableHashSet` provides a collection of unique values with
 * efficient lookup, insertion and removal. Unlike its immutable sibling
 * {@link module:HashSet}, a `MutableHashSet` can be modified in-place;
 * operations like add, remove, and clear directly modify the original set
 * rather than creating a new one. This mutability offers benefits like improved
 * performance in scenarios where you need to build or modify a set
 * incrementally.
 *
 * ## What Problem Does It Solve?
 *
 * `MutableHashSet` solves the problem of maintaining an unsorted collection
 * where each value appears exactly once, with fast operations for checking
 * membership and adding/removing values, in contexts where mutability is
 * preferred for performance or implementation simplicity.
 *
 * ## When to Use
 *
 * Use `MutableHashSet` when you need:
 *
 * - A collection with no duplicate values
 * - Efficient membership testing (**`O(1)`** average complexity)
 * - In-place modifications for better performance
 * - A set that will be built or modified incrementally
 * - Local mutability in otherwise immutable code
 *
 * ## Advanced Features
 *
 * MutableHashSet provides operations for:
 *
 * - Adding and removing elements with direct mutation
 * - Checking for element existence
 * - Clearing all elements at once
 * - Converting to/from other collection types
 *
 * ## Performance Characteristics
 *
 * - **Lookup** operations ({@link module:MutableHashSet.has}): **`O(1)`** average
 *   time complexity
 * - **Insertion** operations ({@link module:MutableHashSet.add}): **`O(1)`**
 *   average time complexity
 * - **Removal** operations ({@link module:MutableHashSet.remove}): **`O(1)`**
 *   average time complexity
 * - **Iteration**: **`O(n)`** where n is the size of the set
 *
 * The MutableHashSet data structure implements the following traits:
 *
 * - {@link Iterable}: allows iterating over the values in the set
 * - {@link Pipeable}: allows chaining operations with the pipe operator
 * - {@link Inspectable}: allows inspecting the contents of the set
 *
 * ## Operations Reference
 *
 * | Category     | Operation                                  | Description                         | Complexity |
 * | ------------ | ------------------------------------------ | ----------------------------------- | ---------- |
 * | constructors | {@link module:MutableHashSet.empty}        | Creates an empty MutableHashSet     | O(1)       |
 * | constructors | {@link module:MutableHashSet.fromIterable} | Creates a set from an iterable      | O(n)       |
 * | constructors | {@link module:MutableHashSet.make}         | Creates a set from multiple values  | O(n)       |
 * |              |                                            |                                     |            |
 * | elements     | {@link module:MutableHashSet.has}          | Checks if a value exists in the set | O(1) avg   |
 * | elements     | {@link module:MutableHashSet.add}          | Adds a value to the set             | O(1) avg   |
 * | elements     | {@link module:MutableHashSet.remove}       | Removes a value from the set        | O(1) avg   |
 * | elements     | {@link module:MutableHashSet.size}         | Gets the number of elements         | O(1)       |
 * | elements     | {@link module:MutableHashSet.clear}        | Removes all values from the set     | O(1)       |
 *
 * ## Notes
 *
 * ### Mutability Considerations:
 *
 * Unlike most data structures in the Effect ecosystem, `MutableHashSet` is
 * mutable. This means that operations like `add`, `remove`, and `clear` modify
 * the original set rather than creating a new one. This can lead to more
 * efficient code in some scenarios, but requires careful handling to avoid
 * unexpected side effects.
 *
 * ### When to Choose `MutableHashSet` vs {@link module:HashSet}:
 *
 * - Use `MutableHashSet` when you need to build or modify a set incrementally and
 *   performance is a priority
 * - Use `HashSet` when you want immutability guarantees and functional
 *   programming patterns
 * - Consider using {@link module:HashSet}'s bounded mutation context (via
 *   {@link module:HashSet.beginMutation}, {@link module:HashSet.endMutation}, and
 *   {@link module:HashSet.mutate} methods) when you need temporary mutability
 *   within an otherwise immutable context - this approach might be sufficient
 *   for many use cases without requiring a separate `MutableHashSet`
 * - `MutableHashSet` is often useful for local operations where the mutability is
 *   contained and doesn't leak into the broader application
 *
 * @module MutableHashSet
 * @since 2.0.0
 */
export * as MutableHashSet from "./MutableHashSet.js"

/**
 * @since 2.0.0
 */
export * as MutableList from "./MutableList.js"

/**
 * @since 2.0.0
 */
export * as MutableQueue from "./MutableQueue.js"

/**
 * @since 2.0.0
 */
export * as MutableRef from "./MutableRef.js"

/**
 * # NaturalNumber
 *
 * ## Mathematical Domain Representation
 *
 * `NaturalNumber` represents the set of non-negative integers (`ℕ₀ = {0, 1, 2,
 * 3, ...}`).
 *
 * In mathematics, _natural numbers_ arise from counting and ordering
 * operations. They form a commutative semiring with operations of addition and
 * multiplication, with identities 0 and 1 respectively.
 *
 * The natural numbers exhibit key mathematical properties:
 *
 * - **Well-ordering**: Every non-empty subset has a smallest element
 * - **Discreteness**: Each natural number has a unique successor
 * - **Closure** under addition and multiplication (but not subtraction or
 *   division)
 *
 * ## Constraints Imposed
 *
 * By modeling values as `NaturalNumber`, you accept the following constraints:
 *
 * - **Non-negativity**: Values cannot be less than zero
 * - **Integrity**: Values must be whole numbers (no fractions)
 * - **Domain preservation**: Some operations (subtraction, division) might leave
 *   the domain and must be handled specially
 *
 * ## Derived Guarantees and Business Value
 *
 * These constraints unlock powerful guarantees that directly translate to
 * business value:
 *
 * | Mathematical Guarantee     | Business Value                                                 | Usage Example                              |
 * | -------------------------- | -------------------------------------------------------------- | ------------------------------------------ |
 * | Non-negativity             | Impossible to represent invalid states like negative inventory | Inventory systems, resource counts         |
 * | Well-ordering              | Always have a minimum value in any collection                  | Auction minimums, service prioritization   |
 * | Closure under addition     | Combining quantities preserves invariants                      | Merging inventory from multiple warehouses |
 * | Array indexing safety      | No out-of-bounds errors when used as indices                   | Collection access, pagination              |
 * | Cardinality representation | Accurately model "how many" concepts                           | User counts, event tracking                |
 *
 * ## Domain Modeling Applications
 *
 * `NaturalNumber` excels at modeling domains where quantities cannot logically
 * be negative:
 *
 * ```ts
 * import { Option, pipe } from "effect"
 * import * as NaturalNumber from "effect/NaturalNumber"
 *
 * // E-commerce inventory management example
 * type Product = {
 *   id: string
 *   name: string
 *   stock: NaturalNumber.NaturalNumber // Cannot be negative by construction
 * }
 *
 * // Safe inventory reduction that handles insufficient stock
 * const removeFromInventory = (
 *   product: Product,
 *   quantity: NaturalNumber.NaturalNumber
 * ): Option.Option<Product> =>
 *   pipe(
 *     product.stock,
 *     NaturalNumber.subtractSafe(quantity),
 *     Option.map((remaining) => ({ ...product, stock: remaining }))
 *   )
 *
 * // Type system enforces handling the insufficient stock case
 * const processOrder = (
 *   product: Product,
 *   quantity: NaturalNumber.NaturalNumber
 * ) =>
 *   pipe(
 *     removeFromInventory(product, quantity),
 *     Option.match({
 *       onNone: () => "Insufficient stock",
 *       onSome: (updated) => `Order processed, remaining: ${updated.stock}`
 *     })
 *   )
 * ```
 *
 * ### Health tracking application example:
 *
 * ```ts
 * import { flow, Option, pipe } from "effect"
 * import * as N from "effect/NaturalNumber"
 *
 * // Activity tracking with guaranteed non-negative durations
 * type FitnessActivity = {
 *   type: "run" | "swim" | "cycle"
 *   duration: N.NaturalNumber // Minutes spent (always non-negative)
 *   caloriesBurned: N.NaturalNumber // Always non-negative
 * }
 *
 * // Safely combine two activities of the same type
 * const combineActivities = (
 *   a1: FitnessActivity,
 *   a2: FitnessActivity
 * ): Option.Option<FitnessActivity> =>
 *   a1.type === a2.type
 *     ? Option.some({
 *         type: a1.type,
 *         // Addition within NaturalNumber is guaranteed to stay in the domain
 *         duration: N.sum(a1.duration, a2.duration),
 *         caloriesBurned: N.sum(a1.caloriesBurned, a2.caloriesBurned)
 *       })
 *     : Option.none()
 *
 * // Calculate calories per minute with safe division
 * const caloriesPerMinute = (activity: FitnessActivity): N.NaturalNumber =>
 *   pipe(
 *     activity.caloriesBurned,
 *     N.divideToNumber(activity.duration),
 *     Option.flatMap(flow(Math.round, N.option)),
 *     Option.getOrElse(() => N.zero)
 *   )
 * ```
 *
 * ## When to Use NaturalNumber
 *
 * Use the `NaturalNumber` module when you need:
 *
 * - To represent quantities that cannot logically be negative
 * - To work with array indices and collection sizes
 * - To handle counting or cardinality scenarios
 * - To perform exponentiation and combinatorial operations safely
 * - To ensure non-negativity invariants are preserved in your domain
 *
 * ## Choosing the Right Numeric Type
 *
 * | If your domain concept...         | Then use...                  | Examples                       |
 * | --------------------------------- | ---------------------------- | ------------------------------ |
 * | Cannot be negative, must be whole | {@link module:NaturalNumber} | Inventory, age, count, index   |
 * | Can be negative, must be whole    | {@link module:Integer}       | Temperature, position, balance |
 * | Can be fractional                 | {@link module:Number}        | Prices, rates, measurements    |
 * | Needs arbitrary precision         | {@link BigInt}               | Cryptography, financial totals |
 *
 * ## Operations Reference
 *
 * | Category       | Operation                                         | Description                                                                       | Domain                                | Co-domain                           |
 * | -------------- | ------------------------------------------------- | --------------------------------------------------------------------------------- | ------------------------------------- | ----------------------------------- |
 * | **creation**   | {@link module:NaturalNumber.of}                   | Creates a `NaturalNumber` from a number, throwing on invalid input                | `number`                              | `NaturalNumber`                     |
 * | **creation**   | {@link module:NaturalNumber.option}               | Creates an `Option<NaturalNumber>`, returning `None` on invalid input             | `number`                              | `Option<NaturalNumber>`             |
 * | **creation**   | {@link module:NaturalNumber.either}               | Creates an `Either<BrandError, NaturalNumber>`, returning `Left` on invalid input | `number`                              | `Either<BrandError, NaturalNumber>` |
 * | **creation**   | {@link module:NaturalNumber.Schema}               | Creates a `Schema<NaturalNumber>`, for parsing and validation                     |                                       | `Schema<NaturalNumber>`             |
 * | **constants**  | {@link module:NaturalNumber.zero}                 | Constant representing the natural number zero                                     |                                       | `NaturalNumber`                     |
 * | **constants**  | {@link module:NaturalNumber.one}                  | Constant representing the natural number one                                      |                                       | `NaturalNumber`                     |
 * |                |                                                   |                                                                                   |                                       |                                     |
 * | **math**       | {@link module:NaturalNumber.sum}                  | Adds two natural numbers                                                          | `NaturalNumber`, `NaturalNumber`      | `NaturalNumber`                     |
 * | **math**       | {@link module:NaturalNumber.sumAll}               | Adds all numbers in a collection                                                  | `Iterable<NaturalNumber>`             | `NaturalNumber`                     |
 * | **math**       | {@link module:NaturalNumber.multiply}             | Multiplies two natural numbers                                                    | `NaturalNumber`, `NaturalNumber`      | `NaturalNumber`                     |
 * | **math**       | {@link module:NaturalNumber.multiplyAll}          | Multiplies all numbers in a collection                                            | `Iterable<NaturalNumber>`             | `NaturalNumber`                     |
 * | **math**       | {@link module:NaturalNumber.pow}                  | Computes power with natural number exponent                                       | `NaturalNumber`, `NaturalNumber`      | `NaturalNumber`                     |
 * | **math**       | {@link module:NaturalNumber.square}               | Computes the square of a natural number                                           | `NaturalNumber`                       | `NaturalNumber`                     |
 * | **math**       | {@link module:NaturalNumber.cube}                 | Computes the cube of a natural number                                             | `NaturalNumber`                       | `NaturalNumber`                     |
 * | **math**       | {@link module:NaturalNumber.divideToNumber}       | Divides yielding possibly fractional result                                       | `NaturalNumber`, `NaturalNumber`      | `number`                            |
 * | **math**       | {@link module:NaturalNumber.divideSafe}           | Safely divides returning Option for non-natural                                   | `NaturalNumber`, `NaturalNumber`      | `Option<NaturalNumber>`             |
 * | **math**       | {@link module:NaturalNumber.increment}            | Adds one to a natural number                                                      | `NaturalNumber`                       | `NaturalNumber`                     |
 * | **math**       | {@link module:NaturalNumber.decrementToInteger}   | Decrements, widening to Integer type                                              | `NaturalNumber`                       | `Integer`                           |
 * | **math**       | {@link module:NaturalNumber.decrementSafe}        | Safely decrements, returning None for zero                                        | `NaturalNumber`                       | `Option<NaturalNumber>`             |
 * | **math**       | {@link module:NaturalNumber.subtractToInteger}    | Subtracts, widening to Integer type                                               | `NaturalNumber`, `NaturalNumber`      | `Integer`                           |
 * | **math**       | {@link module:NaturalNumber.subtractSafe}         | Safely subtracts, returning None when negative                                    | `NaturalNumber`, `NaturalNumber`      | `Option<NaturalNumber>`             |
 * | **math**       | {@link module:NaturalNumber.negate}               | Negates a natural number, returning an Integer                                    | `NaturalNumber`                       | `Integer`                           |
 * |                |                                                   |                                                                                   |                                       |                                     |
 * | **predicates** | {@link module:NaturalNumber.isNaturalNumber}      | Type guard for `NaturalNumber`                                                    | `unknown`                             | `boolean`                           |
 * | **predicates** | {@link module:NaturalNumber.between}              | Checks if number is in a range                                                    | `NaturalNumber`, `{minimum, maximum}` | `boolean`                           |
 * | **predicates** | {@link module:NaturalNumber.lessThan}             | Checks if one natural number is less than another                                 | `NaturalNumber`, `NaturalNumber`      | `boolean`                           |
 * | **predicates** | {@link module:NaturalNumber.lessThanOrEqualTo}    | Checks if one natural number is less or equal                                     | `NaturalNumber`, `NaturalNumber`      | `boolean`                           |
 * | **predicates** | {@link module:NaturalNumber.greaterThan}          | Checks if one natural number is greater                                           | `NaturalNumber`, `NaturalNumber`      | `boolean`                           |
 * | **predicates** | {@link module:NaturalNumber.greaterThanOrEqualTo} | Checks if one natural number is greater or equal                                  | `NaturalNumber`, `NaturalNumber`      | `boolean`                           |
 * |                |                                                   |                                                                                   |                                       |                                     |
 * | **comparison** | {@link module:NaturalNumber.min}                  | Returns the minimum of two natural numbers                                        | `NaturalNumber`, `NaturalNumber`      | `NaturalNumber`                     |
 * | **comparison** | {@link module:NaturalNumber.max}                  | Returns the maximum of two natural numbers                                        | `NaturalNumber`, `NaturalNumber`      | `NaturalNumber`                     |
 * | **comparison** | {@link module:NaturalNumber.clamp}                | Restricts a natural number to a range                                             | `NaturalNumber`, `{minimum, maximum}` | `NaturalNumber`                     |
 * |                |                                                   |                                                                                   |                                       |                                     |
 * | **instances**  | {@link module:NaturalNumber.Equivalence}          | Equivalence instance for natural numbers                                          |                                       | `Equivalence<NaturalNumber>`        |
 * | **instances**  | {@link module:NaturalNumber.Order}                | Order instance for natural numbers                                                |                                       | `Order<NaturalNumber>`              |
 *
 * ## Composition Patterns and Type Safety
 *
 * When building function pipelines, understanding how types flow through
 * operations is critical:
 *
 * ### Composing with type-preserving operations
 *
 * Operations where domain and co-domain match (NaturalNumber → NaturalNumber)
 * can be freely chained:
 *
 * ```ts
 * import { pipe } from "effect"
 * import * as NaturalNumber from "effect/NaturalNumber"
 *
 * const result = pipe(
 *   NaturalNumber.of(5),
 *   NaturalNumber.increment, // NaturalNumber → NaturalNumber
 *   NaturalNumber.multiply(NaturalNumber.of(2)), // NaturalNumber → NaturalNumber
 *   NaturalNumber.square // NaturalNumber → NaturalNumber
 * ) // Result: NaturalNumber (144)
 * ```
 *
 * ### Handling type transitions
 *
 * When an operation changes the type, subsequent operations must be compatible
 * with the new type:
 *
 * ```ts
 * import { pipe, flow, Option } from "effect"
 * import * as NaturalNumber from "effect/NaturalNumber"
 * import * as Integer from "effect/Integer"
 * import * as RealNumber from "effect/Number"
 *
 * // Type widening: NaturalNumber → Integer
 * const integerResult = pipe(
 *   NaturalNumber.of(0),
 *   NaturalNumber.decrementToInteger, // NaturalNumber → Integer
 *   Integer.negate // Integer → Integer
 *   // Cannot use NaturalNumber operations here!
 * ) // Result: Integer (1)
 *
 * // Type widening: NaturalNumber → number
 * const fractionResult = pipe(
 *   NaturalNumber.of(10),
 *   NaturalNumber.divideToNumber(NaturalNumber.of(3)), // NaturalNumber → Option<number>
 *   Option.map(
 *     // Cannot use NaturalNumber operations here!
 *     RealNumber.multiply(2) // number → number
 *   )
 * ) // Result: Option<number> (6.666...)
 * ```
 *
 * ### Working with Option results
 *
 * Operations that might violate the natural number domain return Option types:
 *
 * ```ts
 * import { pipe, flow, Option } from "effect"
 * import * as NaturalNumber from "effect/NaturalNumber"
 *
 * // Handle possibly negative results
 * const program = flow(
 *   NaturalNumber.subtractSafe(NaturalNumber.of(10)), // NaturalNumber → Option<NaturalNumber>
 *   Option.map(NaturalNumber.increment), // Option<NaturalNumber> → Option<NaturalNumber>
 *   Option.getOrElse(() => NaturalNumber.zero) // Option<NaturalNumber> → NaturalNumber
 * ) // program: NaturalNumber -> NaturalNumber
 *
 * // Handle zero decrement
 * const decrementResult = pipe(
 *   NaturalNumber.zero,
 *   NaturalNumber.decrementSafe, // NaturalNumber → Option<NaturalNumber>
 *   Option.getOrElse(() => NaturalNumber.zero) // Option<NaturalNumber> → NaturalNumber
 * ) // Result: NaturalNumber (0)
 * ```
 *
 * ### Composition best practices
 *
 * - Chain type-preserving operations for maximum composability
 * - Handle domain violations with Option-returning operations
 * - Use type-widening operations deliberately when needed
 * - Remember that once you leave the NaturalNumber domain, you cannot return
 *   without validation
 *
 * @module NaturalNumber
 * @since 3.14.6
 */
export * as NaturalNumber from "./NaturalNumber.js"

/**
 * @since 2.0.0
 */
export * as NonEmptyIterable from "./NonEmptyIterable.js"

/**
 * # Number
 *
 * ## Mathematical Domain Representation
 *
 * `Number` represents JavaScript's approximation of real numbers (`ℝ`),
 * supporting both integer and fractional values.
 *
 * In mathematics, the real numbers form a continuous, ordered field that
 * includes rational numbers, irrational numbers, and transcendental numbers.
 * JavaScript's `number` type (IEEE-754 double-precision) approximates this
 * mathematical domain with finite precision.
 *
 * Real numbers exhibit key mathematical properties:
 *
 * - **Continuity**: Between any two real numbers, there exists another real
 *   number
 * - **Completeness**: There are no "gaps" in the real number line
 * - **Field structure**: Closed under addition, subtraction, multiplication, and
 *   division (except by zero)
 * - **Total ordering**: For any two real numbers, one is greater than, equal to,
 *   or less than the other
 *
 * ## Constraints Imposed
 *
 * By modeling values as JavaScript `number`, you accept the following
 * constraints:
 *
 * - **Limited precision**: Only ~15-17 significant decimal digits of precision
 * - **Bounded range**: Values between ±1.7976931348623157e+308
 * - **Special values**: Includes NaN, Infinity, and -Infinity
 * - **IEEE-754 quirks**: Subject to floating-point arithmetic limitations (e.g.,
 *   0.1 + 0.2 ≠ 0.3 exactly)
 *
 * ## Derived Guarantees and Business Value
 *
 * Despite its constraints, `number` provides valuable guarantees for many
 * domains:
 *
 * | Mathematical Guarantee    | Business Value                                 | Usage Example                      |
 * | ------------------------- | ---------------------------------------------- | ---------------------------------- |
 * | Continuous values         | Representation of measurements and quantities  | Scientific data, physical measures |
 * | Fractional representation | Accurate modeling of non-discrete quantities   | Financial calculations, ratios     |
 * | Decimal arithmetic        | Standard arithmetic operations on measurements | Engineering calculations           |
 * | Transcendental functions  | Support for complex mathematical operations    | Statistical analysis, physics      |
 * | Floating-point standards  | Consistent behavior across systems             | Cross-platform applications        |
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
 * - To represent continuous quantities with fractional parts
 * - To handle measurements with decimal precision
 * - To model mathematical concepts requiring irrational values
 *
 * ## Choosing the Right Numeric Type
 *
 * | If your domain concept...         | Then use...                  | Examples                       |
 * | --------------------------------- | ---------------------------- | ------------------------------ |
 * | Cannot be negative, must be whole | {@link module:NaturalNumber} | Inventory, age, count, index   |
 * | Can be negative, must be whole    | {@link module:Integer}       | Temperature, position, balance |
 * | Can be fractional                 | {@link module:Number}        | Prices, rates, measurements    |
 * | Needs arbitrary precision         | {@link BigInt}               | Cryptography, financial totals |
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
 * @module Number
 * @since 2.0.0
 */
export * as Number from "./Number.js"

/**
 * @since 2.0.0
 */
export * as Option from "./Option.js"

/**
 * This module provides an implementation of the `Order` type class which is used to define a total ordering on some type `A`.
 * An order is defined by a relation `<=`, which obeys the following laws:
 *
 * - either `x <= y` or `y <= x` (totality)
 * - if `x <= y` and `y <= x`, then `x == y` (antisymmetry)
 * - if `x <= y` and `y <= z`, then `x <= z` (transitivity)
 *
 * The truth table for compare is defined as follows:
 *
 * | `x <= y` | `x >= y` | Ordering |                       |
 * | -------- | -------- | -------- | --------------------- |
 * | `true`   | `true`   | `0`      | corresponds to x == y |
 * | `true`   | `false`  | `< 0`    | corresponds to x < y  |
 * | `false`  | `true`   | `> 0`    | corresponds to x > y  |
 *
 * @since 2.0.0
 */
export * as Order from "./Order.js"

/**
 * @since 2.0.0
 */
export * as Ordering from "./Ordering.js"

/**
 * @since 3.10.0
 */
export * as ParseResult from "./ParseResult.js"

/**
 * @since 2.0.0
 */
export * as Pipeable from "./Pipeable.js"

/**
 * @since 2.0.0
 */
export * as Pool from "./Pool.js"

/**
 * @since 2.0.0
 */
export * as Predicate from "./Predicate.js"

/**
 * @since 3.10.0
 */
export * as Pretty from "./Pretty.js"

/**
 * @since 2.0.0
 */
export * as PrimaryKey from "./PrimaryKey.js"

/**
 * @since 2.0.0
 */
export * as PubSub from "./PubSub.js"

/**
 * @since 2.0.0
 */
export * as Queue from "./Queue.js"

/**
 * @since 2.0.0
 */
export * as Random from "./Random.js"

/**
 * Limits the number of calls to a resource to a maximum amount in some interval.
 *
 * @since 2.0.0
 */
export * as RateLimiter from "./RateLimiter.js"

/**
 * @since 3.5.0
 */
export * as RcMap from "./RcMap.js"

/**
 * @since 3.5.0
 */
export * as RcRef from "./RcRef.js"

/**
 * @since 2.0.0
 */
export * as Readable from "./Readable.js"

/**
 * This module provides utility functions for working with records in TypeScript.
 *
 * @since 2.0.0
 */
export * as Record from "./Record.js"

/**
 * @since 2.0.0
 */
export * as RedBlackTree from "./RedBlackTree.js"

/**
 * The Redacted module provides functionality for handling sensitive information
 * securely within your application. By using the `Redacted` data type, you can
 * ensure that sensitive values are not accidentally exposed in logs or error
 * messages.
 *
 * @since 3.3.0
 */
export * as Redacted from "./Redacted.js"

/**
 * @since 2.0.0
 */
export * as Ref from "./Ref.js"

/**
 * This module provides utility functions for working with RegExp in TypeScript.
 *
 * @since 2.0.0
 */
export * as RegExp from "./RegExp.js"

/**
 * @since 2.0.0
 */
export * as Reloadable from "./Reloadable.js"

/**
 * @since 2.0.0
 */
export * as Request from "./Request.js"

/**
 * @since 2.0.0
 */
export * as RequestBlock from "./RequestBlock.js"

/**
 * @since 2.0.0
 */
export * as RequestResolver from "./RequestResolver.js"

/**
 * @since 2.0.0
 */
export * as Resource from "./Resource.js"

/**
 * @since 2.0.0
 */
export * as Runtime from "./Runtime.js"

/**
 * @since 2.0.0
 */
export * as RuntimeFlags from "./RuntimeFlags.js"

/**
 * @since 2.0.0
 */
export * as RuntimeFlagsPatch from "./RuntimeFlagsPatch.js"

/**
 * @since 2.0.0
 */
export * as STM from "./STM.js"

/**
 * @since 2.0.0
 */
export * as Schedule from "./Schedule.js"

/**
 * @since 2.0.0
 */
export * as ScheduleDecision from "./ScheduleDecision.js"

/**
 * @since 2.0.0
 */
export * as ScheduleInterval from "./ScheduleInterval.js"

/**
 * @since 2.0.0
 */
export * as ScheduleIntervals from "./ScheduleIntervals.js"

/**
 * @since 2.0.0
 */
export * as Scheduler from "./Scheduler.js"

/**
 * @since 3.10.0
 */
export * as Schema from "./Schema.js"

/**
 * @since 3.10.0
 */
export * as SchemaAST from "./SchemaAST.js"

/**
 * @since 2.0.0
 */
export * as Scope from "./Scope.js"

/**
 * @since 2.0.0
 */
export * as ScopedCache from "./ScopedCache.js"

/**
 * @since 2.0.0
 */
export * as ScopedRef from "./ScopedRef.js"

/**
 * @since 2.0.0
 * @deprecated
 */
export * as Secret from "./Secret.js"

/**
 * @since 2.0.0
 */
export * as SingleProducerAsyncInput from "./SingleProducerAsyncInput.js"

/**
 * @since 2.0.0
 */
export * as Sink from "./Sink.js"

/**
 * @since 2.0.0
 */
export * as SortedMap from "./SortedMap.js"

/**
 * @since 2.0.0
 */
export * as SortedSet from "./SortedSet.js"

/**
 * @since 2.0.0
 */
export * as Stream from "./Stream.js"

/**
 * @since 2.0.0
 */
export * as StreamEmit from "./StreamEmit.js"

/**
 * @since 2.0.0
 */
export * as StreamHaltStrategy from "./StreamHaltStrategy.js"

/**
 * @since 2.0.0
 */
export * as Streamable from "./Streamable.js"

/**
 * This module provides utility functions and type class instances for working with the `string` type in TypeScript.
 * It includes functions for basic string manipulation, as well as type class instances for
 * `Equivalence` and `Order`.
 *
 * @since 2.0.0
 */
export * as String from "./String.js"

/**
 * This module provides utility functions for working with structs in TypeScript.
 *
 * @since 2.0.0
 */
export * as Struct from "./Struct.js"

/**
 * @since 2.0.0
 */
export * as Subscribable from "./Subscribable.js"

/**
 * @since 2.0.0
 */
export * as SubscriptionRef from "./SubscriptionRef.js"

/**
 * A `Supervisor<T>` is allowed to supervise the launching and termination of
 * fibers, producing some visible value of type `T` from the supervision.
 *
 * @since 2.0.0
 */
export * as Supervisor from "./Supervisor.js"

/**
 * @since 2.0.0
 */
export * as Symbol from "./Symbol.js"

/**
 * @since 2.0.0
 */
export * as SynchronizedRef from "./SynchronizedRef.js"

/**
 * @since 2.0.0
 */
export * as TArray from "./TArray.js"

/**
 * @since 2.0.0
 */
export * as TDeferred from "./TDeferred.js"

/**
 * @since 2.0.0
 */
export * as TMap from "./TMap.js"

/**
 * @since 2.0.0
 */
export * as TPriorityQueue from "./TPriorityQueue.js"

/**
 * @since 2.0.0
 */
export * as TPubSub from "./TPubSub.js"

/**
 * @since 2.0.0
 */
export * as TQueue from "./TQueue.js"

/**
 * @since 2.0.0
 */
export * as TRandom from "./TRandom.js"

/**
 * @since 2.0.0
 */
export * as TReentrantLock from "./TReentrantLock.js"

/**
 * @since 2.0.0
 */
export * as TRef from "./TRef.js"

/**
 * @since 2.0.0
 */
export * as TSemaphore from "./TSemaphore.js"

/**
 * @since 2.0.0
 */
export * as TSet from "./TSet.js"

/**
 * @since 3.10.0
 */
export * as TSubscriptionRef from "./TSubscriptionRef.js"

/**
 * @since 2.0.0
 */
export * as Take from "./Take.js"

/**
 * @since 2.0.0
 */
export * as TestAnnotation from "./TestAnnotation.js"

/**
 * @since 2.0.0
 */
export * as TestAnnotationMap from "./TestAnnotationMap.js"

/**
 * @since 2.0.0
 */
export * as TestAnnotations from "./TestAnnotations.js"

/**
 * @since 2.0.0
 */
export * as TestClock from "./TestClock.js"

/**
 * @since 2.0.0
 */
export * as TestConfig from "./TestConfig.js"

/**
 * @since 2.0.0
 */
export * as TestContext from "./TestContext.js"

/**
 * @since 2.0.0
 */
export * as TestLive from "./TestLive.js"

/**
 * @since 2.0.0
 */
export * as TestServices from "./TestServices.js"

/**
 * @since 2.0.0
 */
export * as TestSized from "./TestSized.js"

/**
 * @since 2.0.0
 */
export * as Tracer from "./Tracer.js"

/**
 * A `Trie` is used for locating specific `string` keys from within a set.
 *
 * It works similar to `HashMap`, but with keys required to be `string`.
 * This constraint unlocks some performance optimizations and new methods to get string prefixes (e.g. `keysWithPrefix`, `longestPrefixOf`).
 *
 * Prefix search is also the main feature that makes a `Trie` more suited than `HashMap` for certain usecases.
 *
 * A `Trie` is often used to store a dictionary (list of words) that can be searched
 * in a manner that allows for efficient generation of completion lists
 * (e.g. predict the rest of a word a user is typing).
 *
 * A `Trie` has O(n) lookup time where `n` is the size of the key,
 * or even less than `n` on search misses.
 *
 * @since 2.0.0
 */
export * as Trie from "./Trie.js"

/**
 * This module provides utility functions for working with tuples in TypeScript.
 *
 * @since 2.0.0
 */
export * as Tuple from "./Tuple.js"

/**
 * A collection of types that are commonly used types.
 *
 * @since 2.0.0
 */
export * as Types from "./Types.js"

/**
 * @since 2.0.0
 */
export * as Unify from "./Unify.js"

/**
 * @since 2.0.0
 */
export * as UpstreamPullRequest from "./UpstreamPullRequest.js"

/**
 * @since 2.0.0
 */
export * as UpstreamPullStrategy from "./UpstreamPullStrategy.js"

/**
 * @since 2.0.0
 */
export * as Utils from "./Utils.js"
