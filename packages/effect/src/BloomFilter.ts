/**
 * Stores values in immutable, fixed-size Bloom filters for fast membership checks with false positives.
 *
 * A filter never reports a false negative for an inserted value, but it may report a false positive for one
 * that was never added. Use `MutableBloomFilter` for in-place updates, or the scalable variants when the
 * filter must grow beyond its initial capacity.
 *
 * @stability unstable
 * @since 4.2.0
 */
import { dual } from "./Function.ts"
import type { Inspectable } from "./Inspectable.ts"
import * as internal from "./internal/bloomFilter.ts"
import type { Pipeable } from "./Pipeable.ts"
import type { Covariant } from "./Types.ts"

const TypeId = internal.BloomFilterTypeId

/**
 * Options for creating classic Bloom filters.
 *
 * **Example** (Configuring filter size)
 *
 * ```ts
 * import { BloomFilter } from "effect"
 *
 * const options: BloomFilter.BloomFilterOptions = {
 *   expectedItems: 1_000,
 *   falsePositiveRate: 0.001
 * }
 * ```
 *
 * @stability unstable
 * @category models
 * @since 4.2.0
 */
export interface BloomFilterOptions {
  readonly expectedItems: number
  readonly falsePositiveRate?: number | undefined
}

/**
 * An immutable classic Bloom filter.
 *
 * **Example** (Using an immutable filter)
 *
 * ```ts import.meta.vitest
 * import { BloomFilter } from "effect"
 *
 * const filter: BloomFilter.BloomFilter<string> = BloomFilter.make<string>({ expectedItems: 100 })
 * const next = BloomFilter.add(filter, "alice")
 *
 * BloomFilter.has(filter, "alice") // => false
 * BloomFilter.has(next, "alice") // => true
 * ```
 *
 * @stability unstable
 * @category models
 * @since 4.2.0
 */
export interface BloomFilter<A> extends Pipeable, Inspectable {
  readonly [TypeId]: typeof TypeId
  readonly "~A": Covariant<A>
  readonly expectedItems: number
  readonly falsePositiveRate: number
  readonly bits: number
  readonly hashes: number
}

/**
 * Checks whether a value is an immutable classic `BloomFilter`.
 *
 * **Example** (Checking filter type)
 *
 * ```ts import.meta.vitest
 * import { BloomFilter, MutableBloomFilter } from "effect"
 *
 * const filter = BloomFilter.make<string>({ expectedItems: 100 })
 *
 * BloomFilter.isBloomFilter(filter) // => true
 * MutableBloomFilter.isMutableBloomFilter(filter) // => false
 * ```
 *
 * @stability unstable
 * @category guards
 * @since 4.2.0
 */
export const isBloomFilter: (u: unknown) => u is BloomFilter<any> = internal.isBloomFilter

/**
 * Creates an empty classic Bloom filter sized for the expected number of values.
 *
 * **Details**
 *
 * `falsePositiveRate` defaults to `0.01`. Invalid or unsupported sizing parameters throw a `RangeError`.
 *
 * **Example** (Creating a Bloom filter)
 *
 * ```ts import.meta.vitest
 * import { BloomFilter } from "effect"
 *
 * const filter = BloomFilter.make<string>({ expectedItems: 1_000 })
 *
 * BloomFilter.has(filter, "alice") // => false
 * BloomFilter.has(BloomFilter.add(filter, "alice"), "alice") // => true
 * ```
 *
 * @stability unstable
 * @category constructors
 * @since 4.2.0
 */
export const make: <A>(options: BloomFilterOptions) => BloomFilter<A> = internal.makeBloomFilter

/**
 * Creates a classic Bloom filter from an iterable of values.
 *
 * **Example** (Creating a filter from existing values)
 *
 * ```ts import.meta.vitest
 * import { BloomFilter } from "effect"
 *
 * const filter = BloomFilter.fromIterable(["alice", "bob"], { expectedItems: 100 })
 *
 * BloomFilter.has(filter, "alice") // => true
 * BloomFilter.has(filter, "carol") // => false
 * ```
 *
 * @stability unstable
 * @category constructors
 * @since 4.2.0
 */
export const fromIterable: <A>(
  values: Iterable<A>,
  options: BloomFilterOptions
) => BloomFilter<A> = internal.fromIterableBloomFilter

/**
 * Adds a value to a classic Bloom filter, returning a new filter.
 *
 * **Example** (Adding a value)
 *
 * ```ts import.meta.vitest
 * import { BloomFilter } from "effect"
 *
 * const filter = BloomFilter.make<string>({ expectedItems: 100 })
 * const next = BloomFilter.add(filter, "alice")
 *
 * BloomFilter.has(filter, "alice") // => false
 * BloomFilter.has(next, "alice") // => true
 * ```
 *
 * @stability unstable
 * @category mutations
 * @since 4.2.0
 */
export const add: {
  <A>(value: A): (self: BloomFilter<A>) => BloomFilter<A>
  <A>(self: BloomFilter<A>, value: A): BloomFilter<A>
} = dual(2, internal.addBloomFilter)

/**
 * Adds every value from an iterable to a classic Bloom filter, returning a new filter.
 *
 * **Example** (Adding several values)
 *
 * ```ts import.meta.vitest
 * import { BloomFilter } from "effect"
 *
 * const filter = BloomFilter.addAll(
 *   BloomFilter.make<string>({ expectedItems: 100 }),
 *   ["alice", "bob"]
 * )
 *
 * BloomFilter.has(filter, "bob") // => true
 * ```
 *
 * @stability unstable
 * @category mutations
 * @since 4.2.0
 */
export const addAll: {
  <A>(values: Iterable<A>): (self: BloomFilter<A>) => BloomFilter<A>
  <A>(self: BloomFilter<A>, values: Iterable<A>): BloomFilter<A>
} = dual(2, internal.addAllBloomFilter)

/**
 * Checks whether a value may be present in a classic Bloom filter.
 *
 * **Details**
 *
 * A `true` result may be a false positive. A `false` result means the value was never added.
 *
 * **Example** (Checking membership)
 *
 * ```ts import.meta.vitest
 * import { BloomFilter } from "effect"
 *
 * const filter = BloomFilter.fromIterable(["alice"], { expectedItems: 100 })
 *
 * BloomFilter.has(filter, "alice") // => true
 * BloomFilter.has(filter, "bob") // => false
 * ```
 *
 * @stability unstable
 * @category predicates
 * @since 4.2.0
 */
export const has: {
  <A>(value: A): (self: BloomFilter<A>) => boolean
  <A>(self: BloomFilter<A>, value: A): boolean
} = dual(2, internal.hasBloomFilter)

/**
 * Checks whether a classic Bloom filter has no bits set.
 *
 * **Example** (Checking for an empty filter)
 *
 * ```ts import.meta.vitest
 * import { BloomFilter } from "effect"
 *
 * const empty = BloomFilter.make<string>({ expectedItems: 100 })
 * const filled = BloomFilter.add(empty, "alice")
 *
 * BloomFilter.isEmpty(empty) // => true
 * BloomFilter.isEmpty(filled) // => false
 * ```
 *
 * @stability unstable
 * @category predicates
 * @since 4.2.0
 */
export const isEmpty: <A>(self: BloomFilter<A>) => boolean = internal.isEmptyBloomFilter

/**
 * Returns the fraction of bits set in a classic Bloom filter.
 *
 * **Example** (Inspecting filter saturation)
 *
 * ```ts import.meta.vitest
 * import { BloomFilter } from "effect"
 *
 * const empty = BloomFilter.make<string>({ expectedItems: 100 })
 * const filled = BloomFilter.add(empty, "alice")
 *
 * BloomFilter.saturation(empty) // => 0
 * BloomFilter.saturation(filled) > 0 // => true
 * ```
 *
 * @stability unstable
 * @category getters
 * @since 4.2.0
 */
export const saturation: <A>(self: BloomFilter<A>) => number = internal.saturationBloomFilter

/**
 * Estimates the current false positive rate of a classic Bloom filter.
 *
 * **Example** (Inspecting the estimated false positive rate)
 *
 * ```ts import.meta.vitest
 * import { BloomFilter } from "effect"
 *
 * const filter = BloomFilter.fromIterable(["alice"], { expectedItems: 100 })
 *
 * BloomFilter.estimatedFalsePositiveRate(filter) > 0 // => true
 * ```
 *
 * @stability unstable
 * @category getters
 * @since 4.2.0
 */
export const estimatedFalsePositiveRate: <A>(self: BloomFilter<A>) => number =
  internal.estimatedFalsePositiveRateBloomFilter

/**
 * Serializes a classic Bloom filter to bytes.
 *
 * **Example** (Serializing and restoring a filter)
 *
 * ```ts import.meta.vitest
 * import { BloomFilter } from "effect"
 *
 * const filter = BloomFilter.fromIterable(["alice"], { expectedItems: 100 })
 * const restored = BloomFilter.fromBytes<string>(BloomFilter.toBytes(filter))
 *
 * BloomFilter.has(restored, "alice") // => true
 * ```
 *
 * @stability unstable
 * @category serialization
 * @since 4.2.0
 */
export const toBytes: <A>(self: BloomFilter<A>) => Uint8Array<ArrayBuffer> = internal.toBytesBloomFilter

/**
 * Restores a classic Bloom filter from bytes produced by `toBytes`.
 *
 * **Gotchas**
 *
 * The bytes must be restored with the same Effect version and value semantics, because `Hash.hash` is not a
 * versioned contract. Malformed bytes or a non-classic variant throw an `Error`.
 *
 * **Example** (Restoring a filter)
 *
 * ```ts import.meta.vitest
 * import { BloomFilter } from "effect"
 *
 * const filter = BloomFilter.fromIterable(["alice"], { expectedItems: 100 })
 * const restored = BloomFilter.fromBytes<string>(BloomFilter.toBytes(filter))
 *
 * BloomFilter.has(restored, "alice") // => true
 * ```
 *
 * @stability unstable
 * @category serialization
 * @since 4.2.0
 */
export const fromBytes: <A>(bytes: Uint8Array) => BloomFilter<A> = internal.fromBytesBloomFilter
