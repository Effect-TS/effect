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
 * - **Lookup** operations ({@linkcode HashSet.has}): **`O(1)`** average time
 *   complexity
 * - **Insertion** operations ({@linkcode HashSet.add}): **`O(1)`** average time
 *   complexity
 * - **Removal** operations ({@linkcode HashSet.remove}): **`O(1)`** average time
 *   complexity
 * - **Set** operations ({@linkcode HashSet.union},
 *   {@linkcode HashSet.intersection}): **`O(n)`** where n is the size of the
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
 * | Category     | Operation                        | Description                                 | Complexity |
 * | ------------ | -------------------------------- | ------------------------------------------- | ---------- |
 * | constructors | {@linkcode HashSet.empty}        | Creates an empty HashSet                    | O(1)       |
 * | constructors | {@linkcode HashSet.fromIterable} | Creates a HashSet from an iterable          | O(n)       |
 * | constructors | {@linkcode HashSet.make}         | Creates a HashSet from multiple values      | O(n)       |
 * |              |                                  |                                             |            |
 * | elements     | {@linkcode HashSet.has}          | Checks if a value exists in the set         | O(1) avg   |
 * | elements     | {@linkcode HashSet.some}         | Checks if any element satisfies a predicate | O(n)       |
 * | elements     | {@linkcode HashSet.every}        | Checks if all elements satisfy a predicate  | O(n)       |
 * | elements     | {@linkcode HashSet.isSubset}     | Checks if a set is a subset of another      | O(n)       |
 * |              |                                  |                                             |            |
 * | getters      | {@linkcode HashSet.values}       | Gets an iterator of all values              | O(1)       |
 * | getters      | {@linkcode HashSet.toValues}     | Gets an array of all values                 | O(n)       |
 * | getters      | {@linkcode HashSet.size}         | Gets the number of elements                 | O(1)       |
 * |              |                                  |                                             |            |
 * | mutations    | {@linkcode HashSet.add}          | Adds a value to the set                     | O(1) avg   |
 * | mutations    | {@linkcode HashSet.remove}       | Removes a value from the set                | O(1) avg   |
 * | mutations    | {@linkcode HashSet.toggle}       | Toggles a value's presence                  | O(1) avg   |
 * |              |                                  |                                             |            |
 * | operations   | {@linkcode HashSet.difference}   | Computes set difference (A - B)             | O(n)       |
 * | operations   | {@linkcode HashSet.intersection} | Computes set intersection (A ∩ B)           | O(n)       |
 * | operations   | {@linkcode HashSet.union}        | Computes set union (A ∪ B)                  | O(n)       |
 * |              |                                  |                                             |            |
 * | mapping      | {@linkcode HashSet.map}          | Transforms each element                     | O(n)       |
 * |              |                                  |                                             |            |
 * | sequencing   | {@linkcode HashSet.flatMap}      | Transforms and flattens elements            | O(n)       |
 * |              |                                  |                                             |            |
 * | traversing   | {@linkcode HashSet.forEach}      | Applies a function to each element          | O(n)       |
 * |              |                                  |                                             |            |
 * | folding      | {@linkcode HashSet.reduce}       | Reduces the set to a single value           | O(n)       |
 * |              |                                  |                                             |            |
 * | filtering    | {@linkcode HashSet.filter}       | Keeps elements that satisfy a predicate     | O(n)       |
 * |              |                                  |                                             |            |
 * | partitioning | {@linkcode HashSet.partition}    | Splits into two sets by a predicate         | O(n)       |
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

import type { Equal } from "./Equal.js"
import type { Inspectable } from "./Inspectable.js"
import * as HS from "./internal/hashSet.js"
import type { Pipeable } from "./Pipeable.js"
import type { Predicate, Refinement } from "./Predicate.js"
import type { NoInfer } from "./Types.js"

const TypeId: unique symbol = HS.HashSetTypeId as TypeId

/**
 * @since 2.0.0
 * @category symbol
 */
export type TypeId = typeof TypeId

/**
 * @memberof HashSet
 * @since 2.0.0
 * @category models
 * @example **Syntax**
 *
 * ```ts
 * import { HashSet } from "effect"
 *
 * let numberSet: HashSet.HashSet<number>
 * ```
 *
 * @interface
 */
export interface HashSet<out A> extends Iterable<A>, Equal, Pipeable, Inspectable {
  readonly [TypeId]: TypeId
}

/**
 * @memberof HashSet
 * @since 2.0.0
 * @category refinements
 */
export const isHashSet: {
  /**
   * Type guard function to determine if a given iterable is a `HashSet`.
   *
   * This overload preserves the type of the iterable's elements.
   *
   * @example
   *
   * ```ts
   * import { HashSet } from "effect"
   *
   * const numberIterable: Iterable<1 | 2 | 3> = [1, 2, 3]
   *
   * if (
   *   // if passed an Iterable<A> the type guard that preserves the type parameter <A>
   *   HashSet.isHashSet(numberIterable)
   * ) {
   *   const HashSet: HashSet.HashSet<1 | 2 | 3> = numberIterable
   * }
   * ```
   *
   * @param u - The iterable input to be checked.
   * @returns A boolean indicating whether the provided iterable is a `HashSet`.
   */
  <A>(u: Iterable<A>): u is HashSet<A>

  /**
   * Type guard function that checks if the provided value is a `HashSet` of
   * unknown type.
   *
   * @example
   *
   * ```ts
   * import { HashSet } from "effect"
   * import assert from "node:assert/strict"
   *
   * // Check if a value is a HashSet
   * const set = HashSet.make(1, 2, 3)
   *
   * assert.equal(HashSet.isHashSet(set), true) // true
   * assert.equal(HashSet.isHashSet(HashSet.empty()), true)
   *
   * // Works with any type
   * assert.equal(HashSet.isHashSet(null), false) // false
   * assert.equal(HashSet.isHashSet({}), false) // false
   * assert.equal(HashSet.isHashSet([1, 2, 3]), false) // false
   * ```
   *
   * @param u - The value to check.
   * @returns A boolean indicating whether the value is a `HashSet<unknown>`.
   */
  (u: unknown): u is HashSet<unknown>
} = HS.isHashSet

/**
 * Creates an empty `HashSet`.
 *
 * Time complexity: **`O(1)`**
 *
 * @memberof HashSet
 * @since 2.0.0
 * @category constructors
 * @example
 *
 * ```ts
 * import { HashSet, pipe } from "effect"
 *
 * console.log(
 *   pipe(
 *     // Provide a type argument to create a HashSet of a specific type
 *     HashSet.empty<number>(),
 *     HashSet.add(1),
 *     HashSet.add(1), // Notice the duplicate
 *     HashSet.add(2),
 *     HashSet.toValues
 *   )
 * ) // Output: [1, 2]
 * ```
 *
 * @see Other `HashSet` constructors are {@link make} {@link fromIterable}
 */
export const empty: <A = never>() => HashSet<A> = HS.empty

/**
 * Creates a new `HashSet` from an iterable collection of values.
 *
 * Time complexity: **`O(n)`** where n is the number of elements in the iterable
 *
 * @memberof HashSet
 * @since 2.0.0
 * @category constructors
 * @example Creating a HashSet from an {@link Array}
 *
 * ```ts
 * import { HashSet, pipe } from "effect"
 *
 * console.log(
 *   pipe(
 *     [1, 2, 3, 4, 5, 1, 2, 3], // Array<number> is an Iterable<number>;  Note the duplicates.
 *     HashSet.fromIterable,
 *     HashSet.toValues
 *   )
 * ) // Output: [1, 2, 3, 4, 5]
 * ```
 *
 * @example Creating a HashSet from a {@link Set}
 *
 * ```ts
 * import { HashSet, pipe } from "effect"
 *
 * console.log(
 *   pipe(
 *     new Set(["apple", "banana", "orange", "apple"]), // Set<string> is an Iterable<string>
 *     HashSet.fromIterable,
 *     HashSet.toValues
 *   )
 * ) // Output: ["apple", "banana", "orange"]
 * ```
 *
 * @example Creating a HashSet from a {@link Generator}
 *
 * ```ts
 * import { HashSet } from "effect"
 *
 * // Generator functions return iterables
 * function* fibonacci(n: number): Generator<number, void, unknown> {
 *   let [a, b] = [0, 1]
 *   for (let i = 0; i < n; i++) {
 *     yield a
 *     ;[a, b] = [b, a + b]
 *   }
 * }
 *
 * // Create a HashSet from the first 10 Fibonacci numbers
 * const fibonacciSet = HashSet.fromIterable(fibonacci(10))
 *
 * console.log(HashSet.toValues(fibonacciSet))
 * // Outputs: [0, 1, 2, 3, 5, 8, 13, 21, 34] but in unsorted order
 * ```
 *
 * @example Creating a HashSet from another {@link HashSet}
 *
 * ```ts
 * import { HashSet, pipe } from "effect"
 *
 * console.log(
 *   pipe(
 *     // since HashSet implements the Iterable interface, we can use it to create a new HashSet
 *     HashSet.make(1, 2, 3, 4),
 *     HashSet.fromIterable,
 *     HashSet.toValues // turns the HashSet back into an array
 *   )
 * ) // Output: [1, 2, 3, 4]
 * ```
 *
 * @example Creating a HashSet from other Effect's data structures like
 * {@link Chunk}
 *
 * ```ts
 * import { Chunk, HashSet, pipe } from "effect"
 *
 * console.log(
 *   pipe(
 *     Chunk.make(1, 2, 3, 4), // Iterable<number>
 *     HashSet.fromIterable,
 *     HashSet.toValues // turns the HashSet back into an array
 *   )
 * ) // Outputs: [1, 2, 3, 4]
 * ```
 *
 * @see Other `HashSet` constructors are {@link empty} {@link make}
 */
export const fromIterable: <A>(elements: Iterable<A>) => HashSet<A> = HS.fromIterable

/**
 * Construct a new `HashSet` from a variable number of values.
 *
 * Time complexity: **`O(n)`** where n is the number of elements
 *
 * @memberof HashSet
 * @since 2.0.0
 * @category constructors
 * @example
 *
 * ```ts
 * import { Equal, Hash, HashSet, pipe } from "effect"
 * import assert from "node:assert/strict"
 *
 * class Character implements Equal.Equal {
 *   readonly name: string
 *   readonly trait: string
 *
 *   constructor(name: string, trait: string) {
 *     this.name = name
 *     this.trait = trait
 *   }
 *
 *   // Define equality based on name, and trait
 *   [Equal.symbol](that: Equal.Equal): boolean {
 *     if (that instanceof Character) {
 *       return (
 *         Equal.equals(this.name, that.name) &&
 *         Equal.equals(this.trait, that.trait)
 *       )
 *     }
 *     return false
 *   }
 *
 *   // Generate a hash code based on the sum of the character's name and trait
 *   [Hash.symbol](): number {
 *     return Hash.hash(this.name + this.trait)
 *   }
 *
 *   static readonly of = (name: string, trait: string): Character => {
 *     return new Character(name, trait)
 *   }
 * }
 *
 * assert.strictEqual(
 *   Equal.equals(
 *     HashSet.make(
 *       Character.of("Alice", "Curious"),
 *       Character.of("Alice", "Curious"),
 *       Character.of("White Rabbit", "Always late"),
 *       Character.of("Mad Hatter", "Tea enthusiast")
 *     ),
 *     // Is the same as adding each character to an empty set
 *     pipe(
 *       HashSet.empty(),
 *       HashSet.add(Character.of("Alice", "Curious")),
 *       HashSet.add(Character.of("Alice", "Curious")), // Alice tried to attend twice!
 *       HashSet.add(Character.of("White Rabbit", "Always late")),
 *       HashSet.add(Character.of("Mad Hatter", "Tea enthusiast"))
 *     )
 *   ),
 *   true,
 *   "`HashSet.make` and `HashSet.empty() + HashSet.add()` should be equal"
 * )
 *
 * assert.strictEqual(
 *   Equal.equals(
 *     HashSet.make(
 *       Character.of("Alice", "Curious"),
 *       Character.of("Alice", "Curious"),
 *       Character.of("White Rabbit", "Always late"),
 *       Character.of("Mad Hatter", "Tea enthusiast")
 *     ),
 *     HashSet.fromIterable([
 *       Character.of("Alice", "Curious"),
 *       Character.of("Alice", "Curious"),
 *       Character.of("White Rabbit", "Always late"),
 *       Character.of("Mad Hatter", "Tea enthusiast")
 *     ])
 *   ),
 *   true,
 *   "`HashSet.make` and `HashSet.fromIterable` should be equal"
 * )
 * ```
 *
 * @see Other `HashSet` constructors are {@linkcode fromIterable} {@linkcode empty}
 */
export const make: <As extends ReadonlyArray<any>>(...elements: As) => HashSet<As[number]> = HS.make

/**
 * Checks if the specified value exists in the `HashSet`.
 *
 * Time complexity: **`O(1)`** average
 *
 * @memberof HashSet
 * @since 2.0.0
 * @category elements
 * @example **syntax**
 *
 * ```ts
 * import { HashSet, pipe } from "effect"
 *
 * // with `data-last`, a.k.a. `pipeable` API
 * pipe(HashSet.make(0, 1, 2), HashSet.has(3)) // false
 *
 * // or piped with the pipe function
 * HashSet.make(0, 1, 2).pipe(HashSet.has(3)) // false
 *
 * // or with `data-first` API
 * HashSet.has(HashSet.make(0, 1, 2), 3) // false
 * ```
 *
 * @returns A `boolean` signaling the presence of the value in the HashSet
 * @see Other `HashSet` elements are {@link some} {@link every} {@link isSubset}
 */
export const has: {
  /**
   * @example {@link has} `data-last` a.k.a. `pipeable` API
   *
   * ```ts
   * import * as assert from "node:assert/strict"
   * import { HashSet, pipe } from "effect"
   *
   * const set = HashSet.make(0, 1, 2)
   *
   * assert.equal(pipe(set, HashSet.has(0)), true)
   * assert.equal(pipe(set, HashSet.has(1)), true)
   * assert.equal(pipe(set, HashSet.has(2)), true)
   * assert.equal(pipe(set, HashSet.has(3)), false)
   * ```
   */
  <A>(value: A): (self: HashSet<A>) => boolean

  /**
   * @example {@link has} `data-first` API
   *
   * ```ts
   * import * as assert from "node:assert/strict"
   * import { HashSet, pipe } from "effect"
   *
   * const set = HashSet.make(0, 1, 2)
   *
   * assert.equal(HashSet.has(set, 0), true)
   * assert.equal(HashSet.has(set, 1), true)
   * assert.equal(HashSet.has(set, 2), true)
   * assert.equal(HashSet.has(set, 3), false)
   * ```
   */
  <A>(self: HashSet<A>, value: A): boolean
} = HS.has

/**
 * Check if a predicate holds true for some `HashSet` element.
 *
 * Time complexity: **`O(n)`** where n is the number of elements in the set
 *
 * @memberof HashSet
 * @since 2.0.0
 * @category elements
 * @example **syntax**
 *
 * ```ts
 * import { HashSet, pipe } from "effect"
 *
 * const set: HashSet.HashSet<number> = HashSet.make(0, 1, 2)
 *
 * // with `data-last`, a.k.a. `pipeable` API
 * pipe(
 *   set,
 *   HashSet.some((n) => n > 0)
 * ) // true
 *
 * // or piped with the pipe function
 * set.pipe(HashSet.some((n) => n > 0)) // true
 *
 * // or with `data-first` API
 * HashSet.some(set, (n) => n > 0) // true
 * ```
 *
 * @see Other `HashSet` elements are {@link has} {@link every} {@link isSubset}
 */
export const some: {
  /**
   * @example {@link some} `data-last` a.k.a. `pipeable` API
   *
   * ```ts
   * import * as assert from "node:assert/strict"
   * import { HashSet, pipe } from "effect"
   *
   * const set = HashSet.make(0, 1, 2)
   *
   * assert.equal(
   *   pipe(
   *     set,
   *     HashSet.some((n) => n > 0)
   *   ),
   *   true
   * )
   *
   * assert.equal(
   *   pipe(
   *     set,
   *     HashSet.some((n) => n > 2)
   *   ),
   *   false
   * )
   * ```
   */
  <A>(f: Predicate<A>): (self: HashSet<A>) => boolean

  /**
   * @example {@link some} `data-first` API
   *
   * ```ts
   * import * as assert from "node:assert/strict"
   * import { HashSet } from "effect"
   *
   * const set = HashSet.make(0, 1, 2)
   *
   * assert.equal(
   *   HashSet.some(set, (n) => n > 0),
   *   true
   * )
   *
   * assert.equal(
   *   HashSet.some(set, (n) => n > 2),
   *   false
   * )
   * ```
   */
  <A>(self: HashSet<A>, f: Predicate<A>): boolean
} = HS.some

/**
 * Check if a predicate holds true for every `HashSet` element.
 *
 * Time complexity is **`O(n)`** as it needs to traverse the whole HashSet
 * collection
 *
 * @memberof HashSet
 * @since 2.0.0
 * @category elements
 * @example **syntax** with {@link Refinement}
 *
 * ```ts
 * import { HashSet, pipe, Predicate } from "effect"
 *
 * const numberOrString = HashSet.make(1, "1", "one", "uno")
 *
 * // with `data-last`, a.k.a. `pipeable` API and `Refinement`
 * pipe(
 *   numberOrString, // HashSet.HashSet<number | string>
 *   HashSet.every(Predicate.isString)
 * ) // HashSet.HashSet<string>
 *
 * // or piped with the pipe function and  `Refinement`
 * numberOrString // HashSet.HashSet<number | string>
 *   .pipe(HashSet.every(Predicate.isString)) // HashSet.HashSet<string>
 *
 * // or with `data-first` API and `Refinement`
 * HashSet.every(
 *   numberOrString, // HashSet.HashSet<number | string>
 *   Predicate.isString
 * ) // HashSet.HashSet<string>
 * ```
 *
 * @example **syntax** with {@link Predicate}
 *
 * ```ts
 * import { HashSet, pipe } from "effect"
 *
 * const set = HashSet.make(1, 2, 3)
 *
 * // with `data-last`, a.k.a. `pipeable` API
 * pipe(
 *   set,
 *   HashSet.every((n) => n >= 0)
 * ) // true
 *
 * // or piped with the pipe function
 * set.pipe(HashSet.every((n) => n >= 0)) // true
 *
 * // or with `data-first` API
 * HashSet.every(set, (n) => n >= 0) // true
 * ```
 *
 * @returns A boolean once it has evaluated that whole collection fulfill the
 *   Predicate function
 * @see Other `HashSet` elements are {@link has} {@link some} {@link isSubset}
 */
export const every: {
  /**
   * @example
   *
   * ```ts
   * import * as assert from "node:assert/strict"
   * import { Effect, HashSet, pipe, Predicate } from "effect"
   *
   * const numberOrString: HashSet.HashSet<number | string> = HashSet.make(
   *   1,
   *   "1",
   *   "one",
   *   "uno"
   * )
   *
   * assert.equal(
   *   pipe(
   *     numberOrString, // HashSet.HashSet<number | string>
   *     HashSet.every(Predicate.isString)
   *   ), // HashSet.HashSet<string>
   *   false
   * )
   * ```
   */
  <A, B extends A>(
    refinement: Refinement<NoInfer<A>, B>
  ): (self: HashSet<A>) => self is HashSet<B>

  /**
   * @example
   *
   * ```ts
   * import * as assert from "node:assert/strict"
   * import { HashSet, pipe } from "effect"
   *
   * const set = HashSet.make(0, 1, 2)
   *
   * assert.equal(
   *   pipe(
   *     set,
   *     HashSet.every((n) => n >= 0)
   *   ),
   *   true
   * )
   * ```
   */
  <A>(predicate: Predicate<A>): (self: HashSet<A>) => boolean

  /**
   * @example
   *
   * ```ts
   * import * as assert from "node:assert/strict"
   * import { Effect, HashSet, pipe, Predicate } from "effect"
   *
   * const numberOrString: HashSet.HashSet<number | string> = HashSet.make(
   *   1,
   *   "1",
   *   "one",
   *   "uno"
   * )
   *
   * assert.equal(
   *   HashSet.every(
   *     numberOrString, // HashSet.HashSet<number | string>
   *     Predicate.isString
   *   ), // HashSet.HashSet<string>
   *   false
   * )
   * ```
   */
  <A, B extends A>(
    self: HashSet<A>,
    refinement: Refinement<A, B>
  ): self is HashSet<B>

  /**
   * @example
   *
   * ```ts
   * import * as assert from "node:assert/strict"
   * import { HashSet } from "effect"
   *
   * const set = HashSet.make(0, 1, 2)
   *
   * assert.equal(
   *   HashSet.every(set, (n) => n >= 0),
   *   true
   * )
   * ```
   */
  <A>(self: HashSet<A>, predicate: Predicate<A>): boolean
} = HS.every

/**
 * Returns `true` if and only if every element in the this `HashSet` is an
 * element of the second set,
 *
 * **NOTE**: the hash and equal of both sets must be the same.
 *
 * Time complexity analysis is of **`O(n)`**
 *
 * @memberof HashSet
 * @since 2.0.0
 * @category elements
 * @example **Syntax**
 *
 * ```ts
 * import { HashSet, pipe } from "effect"
 *
 * const set1 = HashSet.make(0, 1)
 * const set2 = HashSet.make(1, 2)
 * const set3 = HashSet.make(0, 1, 2)
 *
 * // with `data-last`, a.k.a. `pipeable` API
 * pipe(set1, HashSet.isSubset(set2)) // false
 * pipe(set1, HashSet.isSubset(set3)) // true
 *
 * // or piped with the pipe function
 * set1.pipe(HashSet.isSubset(set2)) // false
 * set1.pipe(HashSet.isSubset(set3)) // true
 *
 * // or with `data-first` API
 * HashSet.isSubset(set1, set2) // false
 * HashSet.isSubset(set1, set3) // true)
 * ```
 *
 * @see Other `HashSet` elements are {@link has} {@link some} {@link every}
 */
export const isSubset: {
  /**
   * @example
   *
   * ```ts
   * import { HashSet, pipe } from "effect"
   * import * as assert from "node:assert/strict"
   *
   * assert.equal(
   *   pipe(
   *     HashSet.make(0, 1), //
   *     HashSet.isSubset(HashSet.make(1, 2))
   *   ),
   *   false
   * )
   *
   * assert.equal(
   *   pipe(
   *     HashSet.make(0, 1), //
   *     HashSet.isSubset(HashSet.make(0, 1, 2))
   *   ),
   *   true
   * )
   * ```
   */
  <A>(that: HashSet<A>): (self: HashSet<A>) => boolean

  /**
   * @example
   *
   * ```ts
   * import { HashSet } from "effect"
   * import * as assert from "node:assert/strict"
   *
   * assert.equal(HashSet.isSubset(set1, set2), false)
   *
   * assert.equal(HashSet.isSubset(set1, set3), true)
   * ```
   */
  <A>(self: HashSet<A>, that: HashSet<A>): boolean
} = HS.isSubset

/**
 * Returns an `IterableIterator` of the values in the `HashSet`.
 *
 * Time complexity: **`O(1)`**
 *
 * @memberof HashSet
 * @since 2.0.0
 * @category getters
 * @example
 *
 * ```ts
 * import { HashSet, pipe } from "effect"
 *
 * const numberIterable = pipe(
 *   HashSet.make(0, 1, 1, 2), // HashSet.HashSet<number>
 *   HashSet.values // takes an HashSet<A> and returns an IterableIterator<A>
 * )
 *
 * for (const number of numberIterable) {
 *   console.log(number) // it will logs: 0, 1, 2
 * }
 * ```
 *
 * @see Other `HashSet` getters are {@link toValues} {@link size}
 */
export const values: <A>(self: HashSet<A>) => IterableIterator<A> = HS.values

/**
 * Returns an `Array` of the values within the `HashSet`.
 *
 * Time complexity: **`O(n)`** where n is the number of elements in the set
 *
 * @memberof HashSet
 * @since 3.13.0
 * @category getters
 * @example
 *
 * ```ts
 * import { HashSet, pipe } from "effect"
 * import { deepStrictEqual } from "node:assert/strict"
 *
 * deepStrictEqual(
 *   pipe(
 *     HashSet.make(0, 1, 1, 2), // HashSet<number>
 *     HashSet.toValues // takes an HashSet<A> and returns an Array<A>
 *   ),
 *   Array.of(0, 1, 2)
 * )
 * ```
 *
 * @see Other `HashSet` getters are {@link values} {@link size}
 */
export const toValues = <A>(self: HashSet<A>): Array<A> => Array.from(values(self))

/**
 * Calculates the number of values in the `HashSet`.
 *
 * Time complexity: **`O(1)`**
 *
 * @memberof HashSet
 * @since 2.0.0
 * @category getters
 * @example
 *
 * ```ts
 * import { HashSet, pipe } from "effect"
 * import assert from "node:assert/strict"
 *
 * assert.deepStrictEqual(pipe(HashSet.empty(), HashSet.size), 0)
 *
 * assert.deepStrictEqual(
 *   pipe(HashSet.make(1, 2, 2, 3, 4, 3), HashSet.size),
 *   4
 * )
 * ```
 *
 * @see Other `HashSet` getters are {@link values} {@link toValues}
 */
export const size: <A>(self: HashSet<A>) => number = HS.size

/**
 * Creates a new mutable version of the `HashSet`
 *
 * When a `HashSet` is mutable, operations like {@link add} and {@link remove}
 * modify the data structure in place instead of creating a new one, which is
 * more efficient when performing multiple operations.
 *
 * @memberof HashSet
 * @since 2.0.0
 * @example
 *
 * ```ts
 * import { HashSet } from "effect"
 * import assert from "node:assert/strict"
 *
 * const UPPER_BOUND = 10_000
 *
 * const immutableSet = HashSet.empty<number>().pipe(HashSet.add(0))
 *
 * // Create a mutable version of the immutableSet
 * const mutableSet = HashSet.beginMutation(immutableSet)
 *
 * for (let i = 1; i < UPPER_BOUND; i++) {
 *   // Operations now modify the set in place instead of creating new instances
 *   // This is more efficient when making multiple changes
 *   const pointerToMutableSet = HashSet.add(mutableSet, i)
 *
 *   // the two sets have the same identity, hence `add` is mutating mutableSet and not returning a new HashSet instance
 *   assert(Object.is(mutableSet, pointerToMutableSet))
 *   assert.equal(HashSet.has(mutableSet, i), true) // `i` is in the mutableSet
 *   assert.equal(HashSet.has(immutableSet, i), false) // `i` is not in the immutableSet
 * }
 *
 * const next = UPPER_BOUND + 1
 * // When done, mark the set as immutable again
 * HashSet.endMutation(mutableSet).pipe(
 *   HashSet.add(next) // since this returns a new HashSet, it will not be logged as part of the mutableSet
 * )
 * assert.equal(HashSet.has(mutableSet, next), false)
 *
 * console.log(HashSet.toValues(immutableSet)) // [0]
 * console.log(HashSet.toValues(mutableSet).sort((a, b) => a - b)) // [0, 1, 2, 3, ...rest]
 * ```
 *
 * @see Other `HashSet` mutations are {@link add} {@link remove} {@link toggle} {@link endMutation} {@link mutate}
 */
export const beginMutation: <A>(self: HashSet<A>) => HashSet<A> = HS.beginMutation

/**
 * Makes the `HashSet` immutable again.
 *
 * After calling `endMutation`, operations like {@link add} and {@link remove}
 * will create new instances of the `HashSet` instead of modifying the existing
 * one.
 *
 * @memberof HashSet
 * @since 2.0.0
 * @example
 *
 * ```ts
 * import { HashSet } from "effect"
 * import assert from "node:assert/strict"
 *
 * // Create a mutable set
 * const mutableSet = HashSet.beginMutation(HashSet.empty<number>())
 *
 * // Add some elements to the mutable set
 * HashSet.add(mutableSet, 1)
 * HashSet.add(mutableSet, 2)
 *
 * // Before endMutation, operations modify the set in place
 * const sameSet = HashSet.add(mutableSet, 3)
 * assert(Object.is(mutableSet, sameSet)) // true - same object reference
 * assert.deepStrictEqual(HashSet.toValues(mutableSet).sort(), [1, 2, 3])
 *
 * // Make the set immutable again
 * const immutableSet = HashSet.endMutation(mutableSet)
 *
 * // endMutation returns the same set instance, now made immutable
 * assert(Object.is(mutableSet, immutableSet)) // true - same object reference
 *
 * // After endMutation, operations create new instances
 * const newSet = HashSet.add(immutableSet, 4)
 * assert(!Object.is(immutableSet, newSet)) // false - different object references
 *
 * // The original set remains unchanged
 * assert.deepStrictEqual(HashSet.toValues(immutableSet).sort(), [1, 2, 3])
 *
 * // The new set contains the added element
 * assert.deepStrictEqual(HashSet.toValues(newSet).sort(), [1, 2, 3, 4])
 * ```
 *
 * @see Other `HashSet` mutations are {@linkcode HashSet.add} {@linkcode HashSet.remove} {@linkcode HashSet.toggle} {@linkcode HashSet.beginMutation} {@linkcode HashSet.mutate}
 */
export const endMutation: <A>(self: HashSet<A>) => HashSet<A> = HS.endMutation

/**
 * Mutates the `HashSet` within the context of the provided function.
 *
 * You can consider it a functional abstraction on top of the lower-level
 * mutation primitives of {@linkcode HashSet.beginMutation} `->` `mutable
 * context` `->` {@linkcode HashSet.endMutation}.
 *
 * @memberof HashSet
 * @since 2.0.0
 * @example **Syntax**
 *
 * ```ts
 * import { HashSet, pipe } from "effect"
 *
 * // with data-last, a.k.a. pipeable API
 * pipe(
 *   HashSet.make(1, 2, 3),
 *   HashSet.mutate((set) => {
 *     HashSet.add(set, 4)
 *     HashSet.remove(set, 1)
 *   })
 * )
 *
 * // or piped with the pipe function
 * HashSet.make(1, 2, 3).pipe(
 *   HashSet.mutate((set) => {
 *     HashSet.add(set, 4)
 *     HashSet.remove(set, 1)
 *   })
 * )
 *
 * // or with data-first API
 * HashSet.mutate(HashSet.make(1, 2, 3), (set) => {
 *   HashSet.add(set, 4)
 *   HashSet.remove(set, 1)
 * })
 * ```
 *
 * @see Other `HashSet` mutations are {@linkcode HashSet.add} {@linkcode HashSet.remove} {@linkcode HashSet.toggle} {@linkcode HashSet.beginMutation} {@linkcode HashSet.endMutation}
 */
export const mutate: {
  /**
   * @example {@linkcode HashSet.mutate} `data-last` a.k.a. `pipeable` API
   *
   * ```ts
   * import { HashSet, pipe } from "effect"
   * import assert from "node:assert/strict"
   *
   * // Create a set with initial values
   * const immutableSet = HashSet.make(1, 2, 3)
   *
   * // Use mutate to perform multiple operations efficiently
   * const result = pipe(
   *   immutableSet,
   *   HashSet.mutate((set) => {
   *     assert.equal(Object.is(immutableSet, set), false)
   *
   *     // The set is temporarily mutable inside this function
   *     const mod1 = HashSet.add(set, 4)
   *     const mod2 = HashSet.remove(set, 1)
   *     assert.equal(Object.is(mod1, mod2), true) // they are the same object by reference
   *   })
   * )
   *
   * // The original set is unchanged
   * assert.equal(Object.is(immutableSet, result), false)
   * assert.deepStrictEqual(
   *   HashSet.toValues(immutableSet).sort(),
   *   [1, 2, 3]
   * )
   *
   * // The result contains the mutations
   * assert.deepStrictEqual(HashSet.toValues(result).sort(), [2, 3, 4])
   * ```
   */
  <A>(f: (set: HashSet<A>) => void): (self: HashSet<A>) => HashSet<A>

  /**
   * @example {@linkcode HashSet.mutate} `data-first` API
   *
   * ```ts
   * import { HashSet } from "effect"
   * import assert from "node:assert/strict"
   *
   * // Create a set with initial values
   * const immutableSet = HashSet.make(1, 2, 3)
   *
   * // Use mutate with data-first API
   * const result = HashSet.mutate(immutableSet, (set) => {
   *   // The set is temporarily mutable inside this function
   *   HashSet.add(set, 4)
   *   HashSet.remove(set, 1)
   * })
   *
   * // The original set is unchanged
   * assert.equal(Object.is(immutableSet, result), false)
   * assert.deepStrictEqual(
   *   HashSet.toValues(immutableSet).sort(),
   *   [1, 2, 3]
   * )
   *
   * // The result contains the mutations
   * assert.deepStrictEqual(HashSet.toValues(result).sort(), [2, 3, 4])
   * ```
   */
  <A>(self: HashSet<A>, f: (set: HashSet<A>) => void): HashSet<A>
} = HS.mutate

/**
 * Adds a value to the `HashSet`.
 *
 * Time complexity: **`O(1)`** average
 *
 * @remarks
 * Remember that a `HashSet` is a collection of unique values, so adding a value
 * that already exists in the `HashSet` will not add a duplicate.
 *
 * Remember that HashSet is an immutable data structure, so the `add` function,
 * like all other functions that modify the HashSet, will return a new HashSet
 * with the added value.
 * @memberof HashSet
 * @since 2.0.0
 * @example **Syntax**
 *
 * ```ts
 * import { HashSet, pipe } from "effect"
 *
 * // with data-last, a.k.a. pipeable API
 * pipe(HashSet.empty(), HashSet.add(0), HashSet.add(0))
 *
 * // or piped with the pipe function
 * HashSet.empty().pipe(HashSet.add(0))
 *
 * // or with data-first API
 * HashSet.add(HashSet.empty(), 0)
 * ```
 *
 * @see Other `HashSet` mutations are {@link remove} {@link toggle} {@link beginMutation} {@link endMutation} {@link mutate}
 */
export const add: {
  /**
   * @example {@link add} `data-last` a.k.a. `pipeable` API
   *
   * ```ts
   * import { HashSet, pipe } from "effect"
   * import assert from "node:assert/strict"
   *
   * assert.deepStrictEqual(
   *   pipe(
   *     HashSet.empty<number>(), // HashSet.HashSet<number>
   *     HashSet.add(0),
   *     HashSet.add(1),
   *     HashSet.add(1),
   *     HashSet.add(2),
   *     HashSet.toValues
   *   ),
   *   Array.of(0, 1, 2)
   * )
   * ```
   */
  <A>(value: A): (self: HashSet<A>) => HashSet<A>

  /**
   * @example {@link add} `data-first` API
   *
   * ```ts
   * import { HashSet, pipe } from "effect"
   * import assert from "node:assert/strict"
   *
   * const empty = HashSet.empty<number>()
   * const withZero = HashSet.add(empty, 0)
   * const withOne = HashSet.add(withZero, 1)
   * const withTwo = HashSet.add(withOne, 2)
   * const withTwoTwo = HashSet.add(withTwo, 2)
   *
   * assert.deepStrictEqual(HashSet.toValues(withTwoTwo), Array.of(0, 1, 2))
   * ```
   */
  <A>(self: HashSet<A>, value: A): HashSet<A>
} = HS.add

/**
 * Removes a value from the `HashSet`.
 *
 * Time complexity: **`O(1)`** average
 *
 * @memberof HashSet
 * @since 2.0.0
 * @example **Syntax**
 *
 * ```ts
 * import { HashSet, pipe } from "effect"
 *
 * // with `data-last`, a.k.a. `pipeable` API
 * pipe(HashSet.make(0, 1, 2), HashSet.remove(0))
 *
 * // or piped with the pipe function
 * HashSet.make(0, 1, 2).pipe(HashSet.remove(0))
 *
 * // or with `data-first` API
 * HashSet.remove(HashSet.make(0, 1, 2), 0)
 * ```
 *
 * @see Other `HashSet` mutations are {@link add} {@link toggle} {@link beginMutation} {@link endMutation} {@link mutate}
 */
export const remove: {
  /**
   * @example {@link remove} `data-last` a.k.a. `pipeable` API
   *
   * ```ts
   * import { HashSet, pipe } from "effect"
   * import * as assert from "node:assert/strict"
   *
   * const set = HashSet.make(0, 1, 2)
   * const result = pipe(set, HashSet.remove(0))
   *
   * assert.equal(pipe(result, HashSet.has(0)), false) // it has correctly removed 0
   * assert.equal(pipe(set, HashSet.has(0)), true) // it does not mutate the original set
   * assert.equal(pipe(result, HashSet.has(1)), true)
   * assert.equal(pipe(result, HashSet.has(2)), true)
   * ```
   */
  <A>(value: A): (self: HashSet<A>) => HashSet<A>

  /**
   * @example {@link remove} `data-first` API
   *
   * ```ts
   * import { HashSet, pipe } from "effect"
   * import * as assert from "node:assert/strict"
   *
   * const set = HashSet.make(0, 1, 2)
   * const result = HashSet.remove(set, 0)
   *
   * assert.equal(HashSet.has(result, 0), false) // it has correctly removed 0
   * assert.equal(HashSet.has(set, 0), true) // it does not mutate the original set
   * assert.equal(HashSet.has(result, 1), true)
   * assert.equal(HashSet.has(result, 2), true)
   * ```
   */
  <A>(self: HashSet<A>, value: A): HashSet<A>
} = HS.remove

/**
 * Computes the set difference `(A - B)` between this `HashSet` and the
 * specified `Iterable<A>`.
 *
 * Time complexity: **`O(n)`** where n is the number of elements in the set
 *
 * **NOTE**: the hash and equal of the values in both the set and the iterable
 * must be the same; meaning we cannot compute a difference between a `HashSet
 * of bananas` and a `HashSet of elephants` as they are not the same type and
 * won't implement the Equal trait in the same way.
 *
 * @memberof HashSet
 * @since 2.0.0
 * @example **Syntax**
 *
 * ```ts
 * import { HashSet, pipe } from "effect"
 *
 * // with data-last, a.k.a. pipeable API
 * pipe(HashSet.make(1, 2, 3), HashSet.difference(HashSet.make(3, 4, 5)))
 *
 * // or piped with the pipe function
 * HashSet.make(1, 2, 3).pipe(HashSet.difference(HashSet.make(3, 4, 5)))
 *
 * // or with data-first API
 * HashSet.difference(HashSet.make(1, 2, 3), HashSet.make(3, 4, 5))
 * ```
 *
 * @see Other `HashSet` operations are {@link intersection} {@link union}
 */
export const difference: {
  /**
   * @example {@link difference} `data-last` a.k.a. `pipeable` API
   *
   * ```ts
   * import { HashSet, pipe } from "effect"
   * import * as assert from "node:assert/strict"
   *
   * // Create two sets with some overlapping elements
   * const thisSet = HashSet.make(1, 2, 3)
   * const thatIterable = HashSet.make(3, 4, 5)
   *
   * // Compute the difference (elements in thisSet that are not in thatIterable)
   * const result = pipe(thisSet, HashSet.difference(thatIterable))
   *
   * // The result contains only elements from thisSet that are not in thatIterable
   * assert.deepStrictEqual(HashSet.toValues(result).sort(), [1, 2])
   *
   * // The original sets are unchanged
   * assert.deepStrictEqual(HashSet.toValues(thisSet).sort(), [1, 2, 3])
   * assert.deepStrictEqual(
   *   HashSet.toValues(thatIterable).sort(),
   *   [3, 4, 5]
   * )
   *
   * // You can also use arrays or other iterables
   * const diffWithArray = pipe(thisSet, HashSet.difference([3, 4]))
   * assert.deepStrictEqual(HashSet.toValues(diffWithArray).sort(), [1, 2])
   * ```
   */
  <A>(that: Iterable<A>): (self: HashSet<A>) => HashSet<A>

  /**
   * @example {@link difference} `data-first` API
   *
   * ```ts
   * import { HashSet } from "effect"
   * import * as assert from "node:assert/strict"
   *
   * // Create two sets with some overlapping elements
   * const thisSet = HashSet.make(1, 2, 3)
   * const thatIterable = HashSet.make(3, 4, 5)
   *
   * // Compute the difference using data-first API
   * const result = HashSet.difference(thisSet, thatIterable)
   *
   * // The result contains only elements from thisSet that are not in thatIterable
   * assert.deepStrictEqual(HashSet.toValues(result).sort(), [1, 2])
   *
   * // The original sets are unchanged
   * assert.deepStrictEqual(HashSet.toValues(thisSet).sort(), [1, 2, 3])
   * assert.deepStrictEqual(
   *   HashSet.toValues(thatIterable).sort(),
   *   [3, 4, 5]
   * )
   *
   * // You can also compute the difference in the other direction
   * const reverseResult = HashSet.difference(thatIterable, thisSet)
   * assert.deepStrictEqual(HashSet.toValues(reverseResult).sort(), [4, 5])
   * ```
   */
  <A>(self: HashSet<A>, that: Iterable<A>): HashSet<A>
} = HS.difference

/**
 * Returns a `HashSet` of values which are present in both this set and that
 * `Iterable<A>`. Computes set intersection (A ∩ B)
 *
 * Time complexity: **`O(n)`** where n is the number of elements in the smaller
 * set
 *
 * **NOTE**: the hash and equal of the values in both the set and the iterable
 * must be the same.
 *
 * @memberof HashSet
 * @since 2.0.0
 * @example **Syntax**
 *
 * ```ts
 * import { HashSet, pipe } from "effect"
 *
 * // with data-last, a.k.a. pipeable API
 * pipe(HashSet.make(1, 2, 3), HashSet.intersection(HashSet.make(2, 3, 4)))
 *
 * // or piped with the pipe function
 * HashSet.make(1, 2, 3).pipe(HashSet.intersection(HashSet.make(2, 3, 4)))
 *
 * // or with data-first API
 * HashSet.intersection(HashSet.make(1, 2, 3), HashSet.make(2, 3, 4))
 * ```
 *
 * @see Other `HashSet` operations are {@link difference} {@link union}
 */
export const intersection: {
  /**
   * @example {@link intersection} `data-last` a.k.a. `pipeable` API
   *
   * ```ts
   * import { HashSet, pipe } from "effect"
   * import * as assert from "node:assert/strict"
   *
   * // Create two sets with some overlapping elements
   * const set1 = HashSet.make(1, 2, 3)
   * const set2 = HashSet.make(2, 3, 4)
   *
   * // Compute the intersection (elements that are in both sets)
   * const result = pipe(set1, HashSet.intersection(set2))
   *
   * // The result contains only elements that are in both sets
   * assert.deepStrictEqual(HashSet.toValues(result).sort(), [2, 3])
   *
   * // The original sets are unchanged
   * assert.deepStrictEqual(HashSet.toValues(set1).sort(), [1, 2, 3])
   * assert.deepStrictEqual(HashSet.toValues(set2).sort(), [2, 3, 4])
   *
   * // You can also use arrays or other iterables
   * const intersectWithArray = pipe(set1, HashSet.intersection([2, 3, 5]))
   * assert.deepStrictEqual(
   *   HashSet.toValues(intersectWithArray).sort(),
   *   [2, 3]
   * )
   * ```
   */
  <A>(that: Iterable<A>): (self: HashSet<A>) => HashSet<A>

  /**
   * @example {@link intersection} `data-first` API
   *
   * ```ts
   * import { HashSet } from "effect"
   * import * as assert from "node:assert/strict"
   *
   * // Create two sets with some overlapping elements
   * const set1 = HashSet.make(1, 2, 3)
   * const set2 = HashSet.make(2, 3, 4)
   *
   * // Compute the intersection using data-first API
   * const result = HashSet.intersection(set1, set2)
   *
   * // The result contains only elements that are in both sets
   * assert.deepStrictEqual(HashSet.toValues(result).sort(), [2, 3])
   *
   * // The original sets are unchanged
   * assert.deepStrictEqual(HashSet.toValues(set1).sort(), [1, 2, 3])
   * assert.deepStrictEqual(HashSet.toValues(set2).sort(), [2, 3, 4])
   *
   * // You can also use arrays or other iterables
   * const intersectWithArray = HashSet.intersection(set1, [2, 3, 5])
   * assert.deepStrictEqual(
   *   HashSet.toValues(intersectWithArray).sort(),
   *   [2, 3]
   * )
   * ```
   */
  <A>(self: HashSet<A>, that: Iterable<A>): HashSet<A>
} = HS.intersection

/**
 * Computes the set union `( self ∪ that )` between this `HashSet` and the
 * specified `Iterable<A>`.
 *
 * Time complexity: **`O(n)`** where n is the number of elements in the set
 *
 * **NOTE**: the hash and equal of the values in both the set and the iterable
 * must be the same.
 *
 * @memberof HashSet
 * @since 2.0.0
 * @example **Syntax**
 *
 * ```ts
 * import { HashSet, pipe } from "effect"
 *
 * // with data-last, a.k.a. pipeable API
 * pipe(HashSet.make(1, 2, 3), HashSet.union(HashSet.make(3, 4, 5)))
 *
 * // or piped with the pipe function
 * HashSet.make(1, 2, 3).pipe(HashSet.union(HashSet.make(3, 4, 5)))
 *
 * // or with data-first API
 * HashSet.union(HashSet.make(1, 2, 3), HashSet.make(3, 4, 5))
 * ```
 *
 * @see Other `HashSet` operations are {@link difference} {@link intersection}
 */
export const union: {
  /**
   * @example {@link union} `data-last` a.k.a. `pipeable` API
   *
   * ```ts
   * import { HashSet, pipe } from "effect"
   * import * as assert from "node:assert/strict"
   *
   * // Create two sets with some overlapping elements
   * const selfSet = HashSet.make(1, 2, 3)
   * const thatIterable = HashSet.make(3, 4, 5)
   *
   * // Compute the union (all elements from both sets)
   * const result = pipe(selfSet, HashSet.union(thatIterable))
   *
   * // The result contains all elements from both sets (without duplicates)
   * assert.deepStrictEqual(
   *   HashSet.toValues(result).sort(),
   *   [1, 2, 3, 4, 5]
   * )
   *
   * // The original sets are unchanged
   * assert.deepStrictEqual(HashSet.toValues(selfSet).sort(), [1, 2, 3])
   * assert.deepStrictEqual(
   *   HashSet.toValues(thatIterable).sort(),
   *   [3, 4, 5]
   * )
   *
   * // You can also use arrays or other iterables
   * const unionWithArray = pipe(selfSet, HashSet.union([4, 5, 6]))
   * assert.deepStrictEqual(
   *   HashSet.toValues(unionWithArray).sort(),
   *   [1, 2, 3, 4, 5, 6]
   * )
   * ```
   */
  <A>(that: Iterable<A>): (self: HashSet<A>) => HashSet<A>

  /**
   * @example {@link union} `data-first` API
   *
   * ```ts
   * import { HashSet } from "effect"
   * import * as assert from "node:assert/strict"
   *
   * // Create two sets with some overlapping elements
   * const selfSet = HashSet.make(1, 2, 3)
   * const thatIterable = HashSet.make(3, 4, 5)
   *
   * // Compute the union using data-first API
   * const result = HashSet.union(selfSet, thatIterable)
   *
   * // The result contains all elements from both sets (without duplicates)
   * assert.deepStrictEqual(
   *   HashSet.toValues(result).sort(),
   *   [1, 2, 3, 4, 5]
   * )
   *
   * // The original sets are unchanged
   * assert.deepStrictEqual(HashSet.toValues(selfSet).sort(), [1, 2, 3])
   * assert.deepStrictEqual(
   *   HashSet.toValues(thatIterable).sort(),
   *   [3, 4, 5]
   * )
   *
   * // You can also use arrays or other iterables
   * const unionWithArray = HashSet.union(selfSet, [4, 5, 6])
   * assert.deepStrictEqual(
   *   HashSet.toValues(unionWithArray).sort(),
   *   [1, 2, 3, 4, 5, 6]
   * )
   * ```
   */
  <A>(self: HashSet<A>, that: Iterable<A>): HashSet<A>
} = HS.union

/**
 * Checks if a value is present in the `HashSet`. If it is present, the value
 * will be removed from the `HashSet`, otherwise the value will be added to the
 * `HashSet`.
 *
 * Time complexity: **`O(1)`** average
 *
 * @memberof HashSet
 * @since 2.0.0
 * @example **Syntax**
 *
 * ```ts
 * import { HashSet, pipe } from "effect"
 *
 * // with `data-last`, a.k.a. `pipeable` API
 * pipe(HashSet.make(0, 1, 2), HashSet.toggle(0))
 *
 * // or piped with the pipe function
 * HashSet.make(0, 1, 2).pipe(HashSet.toggle(0))
 *
 * // or with `data-first` API
 * HashSet.toggle(HashSet.make(0, 1, 2), 0)
 * ```
 *
 * @returns A new `HashSet` where the toggled value is being either added or
 *   removed based on the initial `HashSet` state.
 * @see Other `HashSet` mutations are {@link add} {@link remove} {@link beginMutation} {@link endMutation} {@link mutate}
 */
export const toggle: {
  /**
   * @example {@link toggle} `data-last` a.k.a. `pipeable` API
   *
   * ```ts
   * import { HashSet, pipe } from "effect"
   * import assert from "node:assert/strict"
   *
   * // arrange
   * let set = HashSet.make(0, 1, 2)
   *
   * // assert 1: 0 is in the set
   * assert.equal(pipe(set, HashSet.has(0)), true)
   *
   * // act 2: toggle 0 once on the set
   * set = pipe(set, HashSet.toggle(0))
   *
   * // assert 2: 0 is not in the set any longer
   * assert.equal(pipe(set, HashSet.has(0)), false)
   *
   * // act 3: toggle 0 once again on the set
   * set = pipe(set, HashSet.toggle(0))
   *
   * // assert 3: 0 in now back in the set
   * assert.equal(pipe(set, HashSet.has(0)), true)
   * ```
   */
  <A>(value: A): (self: HashSet<A>) => HashSet<A>

  /**
   * @example {@link toggle} `data-first` API
   *
   * ```ts
   * import { HashSet, pipe } from "effect"
   * import assert from "node:assert/strict"
   *
   * // arrange
   * let set = HashSet.make(0, 1, 2)
   *
   * // assert 1: 0 is in the set
   * assert.equal(HashSet.has(set, 0), true)
   *
   * // act 2: toggle 0 once on the set
   * set = HashSet.toggle(set, 0)
   *
   * // assert 2: 0 is not in the set any longer
   * assert.equal(HashSet.has(set, 0), false)
   *
   * // act 3: toggle 0 once again on the set
   * set = HashSet.toggle(set, 0)
   *
   * // assert 3: 0 in now back in the set
   * assert.equal(HashSet.has(set, 0), true)
   * ```
   */
  <A>(self: HashSet<A>, value: A): HashSet<A>
} = HS.toggle

/**
 * Maps over the values of the `HashSet` using the specified function.
 *
 * The time complexity is of **`O(n)`**.
 *
 * @memberof HashSet
 * @since 2.0.0
 * @category mapping
 * @example **Syntax**
 *
 * ```ts
 * import { HashSet, pipe } from "effect"
 *
 * // with `data-last`, a.k.a. `pipeable` API
 * pipe(
 *   HashSet.make(0, 1, 2), // HashSet.HashSet<number>
 *   HashSet.map(String) // HashSet.HashSet<string>
 * )
 *
 * // or piped with the pipe method
 * HashSet.make(0, 1, 2).pipe(HashSet.map(String))
 *
 * // or with `data-first` API
 * HashSet.map(HashSet.make(0, 1, 2), String)
 * ```
 */
export const map: {
  /**
   * @example
   *
   * ```ts
   * import { HashSet, pipe } from "effect"
   * import * as assert from "node:assert/strict"
   *
   * assert.deepStrictEqual(
   *   pipe(
   *     HashSet.make(0, 1, 2), //    HashSet.HashSet<number>
   *     HashSet.map((n) => String(n + 1)) // HashSet.HashSet<String>
   *   ),
   *   HashSet.make("1", "2", "3")
   * )
   * ```
   */
  <A, B>(f: (a: A) => B): (self: HashSet<A>) => HashSet<B>

  /**
   * @example
   *
   * ```ts
   * import { HashSet, pipe } from "effect"
   * import * as assert from "node:assert/strict"
   *
   * assert.deepStrictEqual(
   *   HashSet.map(
   *     HashSet.make(0, 1, 2), //    HashSet.HashSet<number>
   *     (n) => String(n + 1)
   *   ), // HashSet.HashSet<String>
   *   HashSet.make("1", "2", "3")
   * )
   * ```
   */
  <A, B>(self: HashSet<A>, f: (a: A) => B): HashSet<B>
} = HS.map

/**
 * Chains over the values of the `HashSet` using the specified function.
 *
 * The time complexity is of **`O(n)`**.
 *
 * @memberof HashSet
 * @since 2.0.0
 * @category sequencing
 * @example **Syntax**
 *
 * ```ts
 * import { HashSet, pipe } from "effect"
 *
 * // with `data-last`, a.k.a. `pipeable` API
 * pipe(
 *   HashSet.make(0, 1, 2), // HashSet.HashSet<number>
 *   HashSet.flatMap((n) => Array.of(String(n))) // HashSet.HashSet<string>
 * )
 *
 * // or piped with the pipe method
 * HashSet.make(0, 1, 2) // HashSet.HashSet<number>
 *   .pipe(
 *     HashSet.flatMap((n) => Array.of(String(n))) // HashSet.HashSet<string>
 *   )
 *
 * // or with `data-first` API
 * HashSet.flatMap(HashSet.make(0, 1, 2), (n) => Array.of(String(n)))
 * ```
 */
export const flatMap: {
  /**
   * @example
   *
   * ```ts
   * import { HashSet, pipe, List } from "effect"
   * import * as assert from "node:assert/strict"
   *
   * assert.deepStrictEqual(
   *   pipe(
   *     HashSet.make(0, 1, 2),
   *     HashSet.flatMap((n) => List.of(String(n * n))) // needs to return an Iterable
   *   ),
   *   HashSet.make("0", "1", "4")
   * )
   * ```
   */
  <A, B>(f: (a: A) => Iterable<B>): (self: HashSet<A>) => HashSet<B>

  /**
   * @example
   *
   * ```ts
   * import { HashSet, pipe, List } from "effect"
   * import * as assert from "node:assert/strict"
   *
   * assert.deepStrictEqual(
   *   HashSet.flatMap(HashSet.make(0, 1, 2), (n) =>
   *     List.of(String(n * n * n))
   *   ), // needs to return an Iterable
   *   HashSet.make("0", "1", "8")
   * )
   * ```
   */
  <A, B>(self: HashSet<A>, f: (a: A) => Iterable<B>): HashSet<B>
} = HS.flatMap

/**
 * Applies the specified function to the values of the `HashSet`.
 *
 * The time complexity is of **`O(n)`**.
 *
 * @memberof HashSet
 * @since 2.0.0
 * @category traversing
 * @example **Syntax**
 *
 * ```ts
 * import { HashSet, pipe } from "effect"
 *
 * // with `data-last`, a.k.a. `pipeable` API
 * pipe(HashSet.make(0, 1, 2), HashSet.forEach(console.log)) // logs: 0 1 2
 *
 * // or piped with the pipe method
 * HashSet.make(0, 1, 2).pipe(HashSet.forEach(console.log)) // logs: 0 1 2
 *
 * // or with `data-first` API
 * HashSet.forEach(HashSet.make(0, 1, 2), console.log) // logs: 0 1 2
 * ```
 */
export const forEach: {
  /**
   * @example
   *
   * ```ts
   * import { HashSet, pipe } from "effect"
   * import * as assert from "node:assert/strict"
   *
   * const result: Array<number> = []
   *
   * pipe(
   *   HashSet.make(0, 1, 2),
   *   HashSet.forEach((n): void => {
   *     result.push(n)
   *   })
   * )
   *
   * assert.deepStrictEqual(result, [0, 1, 2])
   * ```
   */
  <A>(f: (value: A) => void): (self: HashSet<A>) => void

  /**
   * @example
   *
   * ```ts
   * import { HashSet, pipe } from "effect"
   * import * as assert from "node:assert/strict"
   *
   * const result: Array<number> = []
   *
   * HashSet.forEach(HashSet.make(0, 1, 2), (n): void => {
   *   result.push(n)
   * })
   *
   * assert.deepStrictEqual(result, [0, 1, 2])
   * ```
   */
  <A>(self: HashSet<A>, f: (value: A) => void): void
} = HS.forEach

/**
 * Reduces the specified state over the values of the `HashSet`.
 *
 * The time complexity is of **`O(n)`**.
 *
 * @memberof HashSet
 * @since 2.0.0
 * @category folding
 * @example **Syntax**
 *
 * ```ts
 * import { HashSet, pipe } from "effect"
 *
 * const sum = (a: number, b: number): number => a + b
 *
 * // with `data-last`, a.k.a. `pipeable` API
 * pipe(HashSet.make(0, 1, 2), HashSet.reduce(0, sum))
 *
 * // or with the pipe method
 * HashSet.make(0, 1, 2).pipe(HashSet.reduce(0, sum))
 *
 * // or with `data-first` API
 * HashSet.reduce(HashSet.make(0, 1, 2), 0, sum)
 * ```
 */
export const reduce: {
  /**
   * @example
   *
   * ```ts
   * import { HashSet, pipe } from "effect"
   * import * as assert from "node:assert/strict"
   *
   * assert.equal(
   *   pipe(
   *     HashSet.make(0, 1, 2),
   *     HashSet.reduce(10, (accumulator, value) => accumulator + value)
   *   ),
   *   13
   * )
   * ```
   */
  <A, Z>(zero: Z, f: (accumulator: Z, value: A) => Z): (self: HashSet<A>) => Z

  /**
   * @example
   *
   * ```ts
   * import { HashSet } from "effect"
   * import * as assert from "node:assert/strict"
   *
   * assert.equal(
   *   HashSet.reduce(
   *     HashSet.make(0, 1, 2),
   *     -3,
   *     (accumulator, value) => accumulator + value
   *   ),
   *   0
   * )
   * ```
   */
  <A, Z>(self: HashSet<A>, zero: Z, f: (accumulator: Z, value: A) => Z): Z
} = HS.reduce

/**
 * Filters values out of a `HashSet` using the specified predicate.
 *
 * The time complexity is of **`O(n)`**.
 *
 * @memberof HashSet
 * @since 2.0.0
 * @category filtering
 * @example **Syntax** with {@link Predicate}
 *
 * ```ts
 * import { HashSet, type Predicate, pipe } from "effect"
 *
 * const filterPositiveNumbers: Predicate.Predicate<number> = (n) => n > 0
 *
 * // with `data-last`, a.k.a. `pipeable` API
 * pipe(
 *   HashSet.make(-2, -1, 0, 1, 2),
 *   HashSet.filter(filterPositiveNumbers)
 * )
 *
 * // or with the pipe method
 * HashSet.make(-2, -1, 0, 1, 2).pipe(HashSet.filter(filterPositiveNumbers))
 *
 * // or with `data-first` API
 * HashSet.filter(HashSet.make(-2, -1, 0, 1, 2), filterPositiveNumbers)
 * ```
 *
 * @example **Syntax** with {@link Refinement}
 *
 * ```ts
 * import { HashSet, pipe } from "effect"
 *
 * const stringRefinement = (value: unknown): value is string =>
 *   typeof value === "string"
 *
 * // with `data-last`, a.k.a. `pipeable` API
 * pipe(
 *   HashSet.make(1, "unos", 2, "two", 3, "trois", 4, "vier"), // // HashSet.HashSet<number | string>
 *   HashSet.filter(stringRefinement)
 * ) // HashSet.HashSet<string>
 *
 * // or with the pipe method
 * HashSet.make(1, "unos", 2, "two", 3, "trois", 4, "vier") // HashSet.HashSet<number | string>
 *   .pipe(HashSet.filter(stringRefinement)) // HashSet.HashSet<string>
 *
 * // or with `data-first` API
 * HashSet.filter(
 *   HashSet.make(1, "unos", 2, "two", 3, "trois", 4, "vier"), // HashSet.HashSet<number | string>
 *   stringRefinement
 * ) // HashSet.HashSet<string>
 * ```
 */
export const filter: {
  /**
   * @example
   *
   * ```ts
   * import { HashSet, pipe, Predicate } from "effect"
   * import * as assert from "node:assert/strict"
   *
   * const numbersAndStringsHashSet: HashSet.HashSet<number | string> =
   *   HashSet.make(1, "unos", 2, "two", 3, "trois", 4, "vier")
   *
   * const stringRefinement: Predicate.Refinement<
   *   string | number,
   *   string
   * > = (value) => typeof value === "string"
   *
   * const stringHashSet: HashSet.HashSet<string> = pipe(
   *   numbersAndStringsHashSet,
   *   HashSet.filter(stringRefinement)
   * )
   *
   * assert.equal(
   *   pipe(stringHashSet, HashSet.every(Predicate.isString)),
   *   true
   * )
   * ```
   */
  <A, B extends A>(
    refinement: Refinement<NoInfer<A>, B>
  ): (self: HashSet<A>) => HashSet<B>

  /**
   * @example
   *
   * ```ts
   * import { HashSet, pipe, type Predicate } from "effect"
   * import * as assert from "node:assert/strict"
   *
   * const filterPositiveNumbers: Predicate.Predicate<number> = (n) => n > 0
   *
   * assert.deepStrictEqual(
   *   pipe(
   *     HashSet.make(-2, -1, 0, 1, 2),
   *     HashSet.filter(filterPositiveNumbers)
   *   ),
   *   HashSet.make(1, 2)
   * )
   * ```
   */
  <A>(predicate: Predicate<NoInfer<A>>): (self: HashSet<A>) => HashSet<A>

  /**
   * @example
   *
   * ```ts
   * import { HashSet, Predicate } from "effect"
   * import * as assert from "node:assert/strict"
   *
   * const numbersAndStringsHashSet: HashSet.HashSet<number | string> =
   *   HashSet.make(1, "unos", 2, "two", 3, "trois", 4, "vier")
   *
   * const stringRefinement: Predicate.Refinement<
   *   string | number,
   *   string
   * > = (value) => typeof value === "string"
   *
   * const stringHashSet: HashSet.HashSet<string> = HashSet.filter(
   *   numbersAndStringsHashSet,
   *   stringRefinement
   * )
   *
   * assert.equal(HashSet.every(stringHashSet, Predicate.isString), true)
   * ```
   */
  <A, B extends A>(
    self: HashSet<A>,
    refinement: Refinement<A, B>
  ): HashSet<B>

  /**
   * @example
   *
   * ```ts
   * import { HashSet, pipe, type Predicate } from "effect"
   * import * as assert from "node:assert/strict"
   *
   * const filterPositiveNumbers: Predicate.Predicate<number> = (n) => n > 0
   *
   * assert.deepStrictEqual(
   *   HashSet.filter(HashSet.make(-2, -1, 0, 1, 2), filterPositiveNumbers),
   *   HashSet.make(1, 2)
   * )
   * ```
   */
  <A>(self: HashSet<A>, predicate: Predicate<A>): HashSet<A>
} = HS.filter

/**
 * Partition the values of a `HashSet` using the specified predicate.
 *
 * If a value matches the predicate, it will be placed into the `HashSet` on the
 * right side of the resulting `Tuple`, otherwise the value will be placed into
 * the left side.
 *
 * Time complexity is of **`O(n)`**.
 *
 * @memberof HashSet
 * @since 2.0.0
 * @category partitioning
 * @example **Syntax** with {@link Predicate}
 *
 * ```ts
 * import { HashSet, pipe, Predicate } from "effect"
 *
 * // with `data-last`, a.k.a. `pipeable` API
 * pipe(
 *   HashSet.make(0, 1, 2, 3, 4, 5),
 *   HashSet.partition((n) => n % 2 === 0)
 * )
 *
 * // or with the pipe method
 * HashSet.make(0, 1, 2, 3, 4, 5).pipe(
 *   HashSet.partition((n) => n % 2 === 0)
 * )
 *
 * // or with `data-first` API
 * HashSet.partition(HashSet.make(0, 1, 2, 3, 4, 5), (n) => n % 2 === 0)
 * ```
 *
 * @example **Syntax** with {@link Refinement}
 *
 * ```ts
 * import { HashSet, pipe, Predicate } from "effect"
 *
 * const stringRefinement: Predicate.Refinement<string | number, string> = (
 *   value
 * ) => typeof value === "string"
 *
 * // with `data-last`, a.k.a. `pipeable` API
 * pipe(
 *   HashSet.make(1, "unos", 2, "two", 3, "trois", 4, "vier"),
 *   HashSet.partition(stringRefinement)
 * )
 *
 * // or with the pipe method
 * HashSet.make(1, "unos", 2, "two", 3, "trois", 4, "vier").pipe(
 *   HashSet.partition(stringRefinement)
 * )
 *
 * // or with `data-first` API
 * HashSet.partition(
 *   HashSet.make(1, "unos", 2, "two", 3, "trois", 4, "vier"),
 *   stringRefinement
 * )
 * ```
 */
export const partition: {
  /**
   * @example
   *
   * ```ts
   * import { HashSet, pipe, Predicate } from "effect"
   * import * as assert from "node:assert/strict"
   *
   * const numbersAndStringsHashSet: HashSet.HashSet<number | string> =
   *   HashSet.make(1, "unos", 2, "two", 3, "trois", 4, "vier")
   *
   * const stringRefinement: Predicate.Refinement<
   *   string | number,
   *   string
   * > = (value) => typeof value === "string"
   *
   * const [
   *   excluded, // HashSet.HashSet<number>
   *   satisfying // HashSet.HashSet<string>
   * ] = pipe(numbersAndStringsHashSet, HashSet.partition(stringRefinement))
   *
   * assert.equal(pipe(satisfying, HashSet.every(Predicate.isString)), true)
   * assert.equal(pipe(excluded, HashSet.every(Predicate.isNumber)), true)
   *
   * assert.deepStrictEqual(excluded, HashSet.make(1, 2, 3, 4))
   * assert.deepStrictEqual(
   *   satisfying,
   *   HashSet.make("unos", "two", "trois", "vier")
   * )
   * ```
   */
  <A, B extends A>(
    refinement: Refinement<NoInfer<A>, B>
  ): (
    self: HashSet<A>
  ) => [excluded: HashSet<Exclude<A, B>>, satisfying: HashSet<B>]

  /**
   * @example
   *
   * ```ts
   * import { HashSet, pipe } from "effect"
   * import * as assert from "node:assert/strict"
   *
   * const [excluded, satisfying] = pipe(
   *   HashSet.make(0, 1, 2, 3, 4, 5),
   *   HashSet.partition((n) => n % 2 === 0)
   * )
   *
   * assert.deepStrictEqual(excluded, HashSet.make(1, 3, 5))
   * assert.deepStrictEqual(satisfying, HashSet.make(0, 2, 4))
   * ```
   */
  <A>(
    predicate: Predicate<NoInfer<A>>
  ): (self: HashSet<A>) => [excluded: HashSet<A>, satisfying: HashSet<A>]

  /**
   * @example
   *
   * ```ts
   * import { HashSet, pipe, Predicate } from "effect"
   * import * as assert from "node:assert/strict"
   *
   * const numbersAndStringsHashSet: HashSet.HashSet<number | string> =
   *   HashSet.make(1, "unos", 2, "two", 3, "trois", 4, "vier")
   *
   * const stringRefinement: Predicate.Refinement<
   *   string | number,
   *   string
   * > = (value) => typeof value === "string"
   *
   * const [
   *   excluded, // HashSet.HashSet<number>
   *   satisfying // HashSet.HashSet<string>
   * ] = HashSet.partition(numbersAndStringsHashSet, stringRefinement)
   *
   * assert.equal(HashSet.every(satisfying, Predicate.isString), true)
   * assert.equal(HashSet.every(excluded, Predicate.isNumber), true)
   *
   * assert.deepStrictEqual(excluded, HashSet.make(1, 2, 3, 4))
   * assert.deepStrictEqual(
   *   satisfying,
   *   HashSet.make("unos", "two", "trois", "vier")
   * )
   * ```
   */
  <A, B extends A>(
    self: HashSet<A>,
    refinement: Refinement<A, B>
  ): [excluded: HashSet<Exclude<A, B>>, satisfying: HashSet<B>]

  /**
   * @example
   *
   * ```ts
   * import { HashSet } from "effect"
   * import * as assert from "node:assert/strict"
   *
   * const [excluded, satisfying] = HashSet.partition(
   *   HashSet.make(0, 1, 2, 3, 4, 5),
   *   (n) => n % 2 === 0
   * )
   *
   * assert.deepStrictEqual(excluded, HashSet.make(1, 3, 5))
   * assert.deepStrictEqual(satisfying, HashSet.make(0, 2, 4))
   * ```
   */
  <A>(
    self: HashSet<A>,
    predicate: Predicate<A>
  ): [excluded: HashSet<A>, satisfying: HashSet<A>]
} = HS.partition
