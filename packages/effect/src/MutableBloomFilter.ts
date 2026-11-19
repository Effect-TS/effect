/**
 * Stores values in mutable, fixed-size Bloom filters for fast membership checks with false positives.
 *
 * Updates happen in place, which avoids copying the bit array on every add. A filter never reports a false
 * negative for an inserted value, but it may report a false positive for one that was never added.
 *
 * @stability unstable
 * @since 4.2.0
 */
import type { BloomFilterOptions } from "./BloomFilter.ts"
import { dual } from "./Function.ts"
import type { Inspectable } from "./Inspectable.ts"
import * as internal from "./internal/bloomFilter.ts"
import type { Pipeable } from "./Pipeable.ts"
import type { Covariant } from "./Types.ts"

const TypeId = internal.MutableBloomFilterTypeId

/**
 * A mutable classic Bloom filter.
 *
 * **Example** (Using a mutable filter)
 *
 * ```ts import.meta.vitest
 * import { MutableBloomFilter } from "effect"
 *
 * const filter: MutableBloomFilter.MutableBloomFilter<string> =
 *   MutableBloomFilter.make<string>({ expectedItems: 100 })
 *
 * MutableBloomFilter.add(filter, "alice")
 *
 * MutableBloomFilter.has(filter, "alice") // => true
 * ```
 *
 * @stability unstable
 * @category models
 * @since 4.2.0
 */
export interface MutableBloomFilter<A> extends Pipeable, Inspectable {
  readonly [TypeId]: typeof TypeId
  readonly "~A": Covariant<A>
  readonly expectedItems: number
  readonly falsePositiveRate: number
  readonly bits: number
  readonly hashes: number
}

/**
 * Checks whether a value is a mutable classic `MutableBloomFilter`.
 *
 * **Example** (Checking filter type)
 *
 * ```ts import.meta.vitest
 * import { BloomFilter, MutableBloomFilter } from "effect"
 *
 * const filter = MutableBloomFilter.make<string>({ expectedItems: 100 })
 *
 * MutableBloomFilter.isMutableBloomFilter(filter) // => true
 * BloomFilter.isBloomFilter(filter) // => false
 * ```
 *
 * @stability unstable
 * @category guards
 * @since 4.2.0
 */
export const isMutableBloomFilter: (u: unknown) => u is MutableBloomFilter<any> = internal.isMutableBloomFilter

/**
 * Creates an empty mutable classic Bloom filter sized for the expected number of values.
 *
 * **Details**
 *
 * `falsePositiveRate` defaults to `0.01`. Invalid or unsupported sizing parameters throw a `RangeError`.
 *
 * **Example** (Creating a mutable filter)
 *
 * ```ts import.meta.vitest
 * import { MutableBloomFilter } from "effect"
 *
 * const filter = MutableBloomFilter.make<string>({ expectedItems: 1_000 })
 *
 * MutableBloomFilter.has(filter, "alice") // => false
 * MutableBloomFilter.add(filter, "alice")
 * MutableBloomFilter.has(filter, "alice") // => true
 * ```
 *
 * @stability unstable
 * @category constructors
 * @since 4.2.0
 */
export const make: <A>(options: BloomFilterOptions) => MutableBloomFilter<A> = internal.makeMutableBloomFilter

/**
 * Creates a mutable classic filter and adds every value from an iterable.
 *
 * **Example** (Creating a filter from existing values)
 *
 * ```ts import.meta.vitest
 * import { MutableBloomFilter } from "effect"
 *
 * const filter = MutableBloomFilter.fromIterable(["alice", "bob"], { expectedItems: 100 })
 *
 * MutableBloomFilter.has(filter, "alice") // => true
 * MutableBloomFilter.has(filter, "carol") // => false
 * ```
 *
 * @stability unstable
 * @category constructors
 * @since 4.2.0
 */
export const fromIterable: <A>(
  values: Iterable<A>,
  options: BloomFilterOptions
) => MutableBloomFilter<A> = internal.fromIterableMutableBloomFilter

/**
 * Adds a value in place and returns the same filter.
 *
 * **Example** (Adding a value)
 *
 * ```ts import.meta.vitest
 * import { MutableBloomFilter } from "effect"
 *
 * const filter = MutableBloomFilter.make<string>({ expectedItems: 100 })
 *
 * MutableBloomFilter.add(filter, "alice")
 *
 * MutableBloomFilter.has(filter, "alice") // => true
 * ```
 *
 * @stability unstable
 * @category mutations
 * @since 4.2.0
 */
export const add: {
  <A>(value: A): (self: MutableBloomFilter<A>) => MutableBloomFilter<A>
  <A>(self: MutableBloomFilter<A>, value: A): MutableBloomFilter<A>
} = dual(2, internal.addMutableBloomFilter)

/**
 * Adds every value from an iterable in place and returns the same filter.
 *
 * **Example** (Adding several values)
 *
 * ```ts import.meta.vitest
 * import { MutableBloomFilter } from "effect"
 *
 * const filter = MutableBloomFilter.make<string>({ expectedItems: 100 })
 *
 * MutableBloomFilter.addAll(filter, ["alice", "bob"])
 *
 * MutableBloomFilter.has(filter, "bob") // => true
 * ```
 *
 * @stability unstable
 * @category mutations
 * @since 4.2.0
 */
export const addAll: {
  <A>(values: Iterable<A>): (self: MutableBloomFilter<A>) => MutableBloomFilter<A>
  <A>(self: MutableBloomFilter<A>, values: Iterable<A>): MutableBloomFilter<A>
} = dual(2, internal.addAllMutableBloomFilter)

/**
 * Checks whether a value may be present in a mutable classic Bloom filter.
 *
 * **Details**
 *
 * A `true` result may be a false positive. A `false` result means the value was never added.
 *
 * **Example** (Checking membership)
 *
 * ```ts import.meta.vitest
 * import { MutableBloomFilter } from "effect"
 *
 * const filter = MutableBloomFilter.fromIterable(["alice"], { expectedItems: 100 })
 *
 * MutableBloomFilter.has(filter, "alice") // => true
 * MutableBloomFilter.has(filter, "bob") // => false
 * ```
 *
 * @stability unstable
 * @category predicates
 * @since 4.2.0
 */
export const has: {
  <A>(value: A): (self: MutableBloomFilter<A>) => boolean
  <A>(self: MutableBloomFilter<A>, value: A): boolean
} = dual(2, internal.hasMutableBloomFilter)

/**
 * Removes every value in place and returns the same filter.
 *
 * **Example** (Clearing a filter)
 *
 * ```ts import.meta.vitest
 * import { MutableBloomFilter } from "effect"
 *
 * const filter = MutableBloomFilter.fromIterable(["alice"], { expectedItems: 100 })
 *
 * MutableBloomFilter.clear(filter)
 *
 * MutableBloomFilter.has(filter, "alice") // => false
 * ```
 *
 * @stability unstable
 * @category mutations
 * @since 4.2.0
 */
export const clear: <A>(self: MutableBloomFilter<A>) => MutableBloomFilter<A> = internal.clearMutableBloomFilter

/**
 * Creates an independent copy of a mutable classic Bloom filter.
 *
 * **Example** (Cloning a filter)
 *
 * ```ts import.meta.vitest
 * import { MutableBloomFilter } from "effect"
 *
 * const filter = MutableBloomFilter.fromIterable(["alice"], { expectedItems: 100 })
 * const copy = MutableBloomFilter.clone(filter)
 *
 * MutableBloomFilter.add(copy, "bob")
 * MutableBloomFilter.has(filter, "bob") // => false
 * ```
 *
 * @stability unstable
 * @category constructors
 * @since 4.2.0
 */
export const clone: <A>(self: MutableBloomFilter<A>) => MutableBloomFilter<A> = internal.cloneMutableBloomFilter

/**
 * Checks whether a mutable classic Bloom filter has no bits set.
 *
 * **Example** (Checking for an empty filter)
 *
 * ```ts import.meta.vitest
 * import { MutableBloomFilter } from "effect"
 *
 * const filter = MutableBloomFilter.make<string>({ expectedItems: 100 })
 *
 * MutableBloomFilter.isEmpty(filter) // => true
 *
 * MutableBloomFilter.add(filter, "alice")
 *
 * MutableBloomFilter.isEmpty(filter) // => false
 * ```
 *
 * @stability unstable
 * @category predicates
 * @since 4.2.0
 */
export const isEmpty: <A>(self: MutableBloomFilter<A>) => boolean = internal.isEmptyMutableBloomFilter

/**
 * Returns the fraction of bits set in a mutable classic Bloom filter.
 *
 * **Example** (Inspecting filter saturation)
 *
 * ```ts import.meta.vitest
 * import { MutableBloomFilter } from "effect"
 *
 * const filter = MutableBloomFilter.make<string>({ expectedItems: 100 })
 * const before = MutableBloomFilter.saturation(filter)
 *
 * MutableBloomFilter.add(filter, "alice")
 *
 * MutableBloomFilter.saturation(filter) > before // => true
 * ```
 *
 * @stability unstable
 * @category getters
 * @since 4.2.0
 */
export const saturation: <A>(self: MutableBloomFilter<A>) => number = internal.saturationMutableBloomFilter

/**
 * Estimates the current false positive rate of a mutable classic Bloom filter.
 *
 * **Example** (Inspecting the estimated false positive rate)
 *
 * ```ts import.meta.vitest
 * import { MutableBloomFilter } from "effect"
 *
 * const filter = MutableBloomFilter.fromIterable(["alice"], { expectedItems: 100 })
 *
 * MutableBloomFilter.estimatedFalsePositiveRate(filter) > 0 // => true
 * ```
 *
 * @stability unstable
 * @category getters
 * @since 4.2.0
 */
export const estimatedFalsePositiveRate: <A>(self: MutableBloomFilter<A>) => number =
  internal.estimatedFalsePositiveRateMutableBloomFilter

/**
 * Serializes a mutable classic Bloom filter to bytes.
 *
 * **Example** (Serializing and restoring a filter)
 *
 * ```ts import.meta.vitest
 * import { MutableBloomFilter } from "effect"
 *
 * const filter = MutableBloomFilter.fromIterable(["alice"], { expectedItems: 100 })
 * const restored = MutableBloomFilter.fromBytes<string>(MutableBloomFilter.toBytes(filter))
 *
 * MutableBloomFilter.has(restored, "alice") // => true
 * ```
 *
 * @stability unstable
 * @category serialization
 * @since 4.2.0
 */
export const toBytes: <A>(self: MutableBloomFilter<A>) => Uint8Array<ArrayBuffer> = internal.toBytesMutableBloomFilter

/**
 * Restores a mutable classic Bloom filter from bytes produced by `toBytes`.
 *
 * **Gotchas**
 *
 * The bytes must be restored with the same Effect version and value semantics, because `Hash.hash` is not a
 * versioned contract. Malformed bytes or a non-classic variant throw an `Error`.
 *
 * **Example** (Restoring a filter)
 *
 * ```ts import.meta.vitest
 * import { MutableBloomFilter } from "effect"
 *
 * const filter = MutableBloomFilter.fromIterable(["alice"], { expectedItems: 100 })
 * const restored = MutableBloomFilter.fromBytes<string>(MutableBloomFilter.toBytes(filter))
 *
 * MutableBloomFilter.has(restored, "alice") // => true
 * ```
 *
 * @stability unstable
 * @category serialization
 * @since 4.2.0
 */
export const fromBytes: <A>(bytes: Uint8Array) => MutableBloomFilter<A> = internal.fromBytesMutableBloomFilter
