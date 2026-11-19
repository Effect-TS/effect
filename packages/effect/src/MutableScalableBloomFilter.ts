/**
 * Stores values in mutable, scalable Bloom filters that grow by adding slices.
 *
 * Updates happen in place, and the filter adds geometrically larger slices as earlier ones fill. A filter
 * never reports a false negative for an inserted value, but it may report a false positive for one that was
 * never added.
 *
 * @stability unstable
 * @since 4.2.0
 */
import { dual } from "./Function.ts"
import type { Inspectable } from "./Inspectable.ts"
import * as internal from "./internal/bloomFilter.ts"
import type { Pipeable } from "./Pipeable.ts"
import type { ScalableBloomFilterOptions } from "./ScalableBloomFilter.ts"
import type { Covariant } from "./Types.ts"

const TypeId = internal.MutableScalableBloomFilterTypeId

/**
 * A mutable scalable Bloom filter that grows by adding slices.
 *
 * **Example** (Growing beyond the initial capacity)
 *
 * ```ts import.meta.vitest
 * import { MutableScalableBloomFilter } from "effect"
 *
 * const filter = MutableScalableBloomFilter.fromIterable(
 *   Array.from({ length: 250 }, (_, i) => `value-${i}`),
 *   { expectedItems: 100 }
 * )
 *
 * filter.slices // => 2
 * ```
 *
 * @stability unstable
 * @category models
 * @since 4.2.0
 */
export interface MutableScalableBloomFilter<A> extends Pipeable, Inspectable {
  readonly [TypeId]: typeof TypeId
  readonly "~A": Covariant<A>
  readonly expectedItems: number
  readonly falsePositiveRate: number
  readonly growthFactor: number
  readonly tighteningRatio: number
  readonly slices: number
}

/**
 * Checks whether a value is a mutable scalable `MutableScalableBloomFilter`.
 *
 * **Example** (Checking filter type)
 *
 * ```ts import.meta.vitest
 * import { ScalableBloomFilter, MutableScalableBloomFilter } from "effect"
 *
 * const filter = MutableScalableBloomFilter.make<string>({ expectedItems: 100 })
 *
 * MutableScalableBloomFilter.isMutableScalableBloomFilter(filter) // => true
 * ScalableBloomFilter.isScalableBloomFilter(filter) // => false
 * ```
 *
 * @stability unstable
 * @category guards
 * @since 4.2.0
 */
export const isMutableScalableBloomFilter: (
  u: unknown
) => u is MutableScalableBloomFilter<any> = internal.isMutableScalableBloomFilter

/**
 * Creates an empty mutable scalable Bloom filter sized for the initial number of values.
 *
 * **Details**
 *
 * `falsePositiveRate` defaults to `0.01`. Invalid or unsupported sizing parameters throw a `RangeError`.
 *
 * **Example** (Creating a mutable scalable filter)
 *
 * ```ts import.meta.vitest
 * import { MutableScalableBloomFilter } from "effect"
 *
 * const filter = MutableScalableBloomFilter.make<string>({ expectedItems: 1_000 })
 *
 * MutableScalableBloomFilter.has(filter, "alice") // => false
 * MutableScalableBloomFilter.add(filter, "alice")
 * MutableScalableBloomFilter.has(filter, "alice") // => true
 * ```
 *
 * @stability unstable
 * @category constructors
 * @since 4.2.0
 */
export const make: <A>(options: ScalableBloomFilterOptions) => MutableScalableBloomFilter<A> =
  internal.makeMutableScalableBloomFilter

/**
 * Creates a mutable scalable filter and adds every value from an iterable.
 *
 * **Example** (Creating a filter from existing values)
 *
 * ```ts import.meta.vitest
 * import { MutableScalableBloomFilter } from "effect"
 *
 * const filter = MutableScalableBloomFilter.fromIterable(["alice", "bob"], { expectedItems: 100 })
 *
 * MutableScalableBloomFilter.has(filter, "alice") // => true
 * MutableScalableBloomFilter.has(filter, "carol") // => false
 * ```
 *
 * @stability unstable
 * @category constructors
 * @since 4.2.0
 */
export const fromIterable: <A>(
  values: Iterable<A>,
  options: ScalableBloomFilterOptions
) => MutableScalableBloomFilter<A> = internal.fromIterableMutableScalableBloomFilter

/**
 * Adds a value in place, adding a slice when the active one is full.
 *
 * **Example** (Adding a value)
 *
 * ```ts import.meta.vitest
 * import { MutableScalableBloomFilter } from "effect"
 *
 * const filter = MutableScalableBloomFilter.make<string>({ expectedItems: 100 })
 *
 * MutableScalableBloomFilter.add(filter, "alice")
 *
 * MutableScalableBloomFilter.has(filter, "alice") // => true
 * ```
 *
 * @stability unstable
 * @category mutations
 * @since 4.2.0
 */
export const add: {
  <A>(value: A): (self: MutableScalableBloomFilter<A>) => MutableScalableBloomFilter<A>
  <A>(self: MutableScalableBloomFilter<A>, value: A): MutableScalableBloomFilter<A>
} = dual(2, internal.addMutableScalableBloomFilter)

/**
 * Adds every value from an iterable in place and returns the same filter.
 *
 * **Example** (Adding several values)
 *
 * ```ts import.meta.vitest
 * import { MutableScalableBloomFilter } from "effect"
 *
 * const filter = MutableScalableBloomFilter.make<string>({ expectedItems: 100 })
 *
 * MutableScalableBloomFilter.addAll(filter, ["alice", "bob"])
 *
 * MutableScalableBloomFilter.has(filter, "bob") // => true
 * ```
 *
 * @stability unstable
 * @category mutations
 * @since 4.2.0
 */
export const addAll: {
  <A>(values: Iterable<A>): (self: MutableScalableBloomFilter<A>) => MutableScalableBloomFilter<A>
  <A>(self: MutableScalableBloomFilter<A>, values: Iterable<A>): MutableScalableBloomFilter<A>
} = dual(2, internal.addAllMutableScalableBloomFilter)

/**
 * Checks whether a value may be present in any slice of a mutable scalable Bloom filter.
 *
 * **Details**
 *
 * A `true` result may be a false positive. A `false` result means the value was never added.
 *
 * **Example** (Checking membership)
 *
 * ```ts import.meta.vitest
 * import { MutableScalableBloomFilter } from "effect"
 *
 * const filter = MutableScalableBloomFilter.fromIterable(["alice"], { expectedItems: 100 })
 *
 * MutableScalableBloomFilter.has(filter, "alice") // => true
 * MutableScalableBloomFilter.has(filter, "bob") // => false
 * ```
 *
 * @stability unstable
 * @category predicates
 * @since 4.2.0
 */
export const has: {
  <A>(value: A): (self: MutableScalableBloomFilter<A>) => boolean
  <A>(self: MutableScalableBloomFilter<A>, value: A): boolean
} = dual(2, internal.hasMutableScalableBloomFilter)

/**
 * Removes every value in place and resets the filter to one empty slice.
 *
 * **Example** (Clearing a filter)
 *
 * ```ts import.meta.vitest
 * import { MutableScalableBloomFilter } from "effect"
 *
 * const filter = MutableScalableBloomFilter.fromIterable(["alice"], { expectedItems: 100 })
 *
 * MutableScalableBloomFilter.clear(filter)
 *
 * MutableScalableBloomFilter.has(filter, "alice") // => false
 * filter.slices // => 1
 * ```
 *
 * @stability unstable
 * @category mutations
 * @since 4.2.0
 */
export const clear: <A>(self: MutableScalableBloomFilter<A>) => MutableScalableBloomFilter<A> =
  internal.clearMutableScalableBloomFilter

/**
 * Creates an independent copy of a mutable scalable Bloom filter.
 *
 * **Example** (Cloning a filter)
 *
 * ```ts import.meta.vitest
 * import { MutableScalableBloomFilter } from "effect"
 *
 * const filter = MutableScalableBloomFilter.fromIterable(["alice"], { expectedItems: 100 })
 * const copy = MutableScalableBloomFilter.clone(filter)
 *
 * MutableScalableBloomFilter.add(copy, "bob")
 * MutableScalableBloomFilter.has(filter, "bob") // => false
 * ```
 *
 * @stability unstable
 * @category constructors
 * @since 4.2.0
 */
export const clone: <A>(self: MutableScalableBloomFilter<A>) => MutableScalableBloomFilter<A> =
  internal.cloneMutableScalableBloomFilter

/**
 * Checks whether a mutable scalable Bloom filter has no bits set.
 *
 * **Example** (Checking for an empty filter)
 *
 * ```ts import.meta.vitest
 * import { MutableScalableBloomFilter } from "effect"
 *
 * const filter = MutableScalableBloomFilter.make<string>({ expectedItems: 100 })
 *
 * MutableScalableBloomFilter.isEmpty(filter) // => true
 *
 * MutableScalableBloomFilter.add(filter, "alice")
 *
 * MutableScalableBloomFilter.isEmpty(filter) // => false
 * ```
 *
 * @stability unstable
 * @category predicates
 * @since 4.2.0
 */
export const isEmpty: <A>(self: MutableScalableBloomFilter<A>) => boolean = internal.isEmptyMutableScalableBloomFilter

/**
 * Returns the fraction of bits set across all slices of a mutable scalable Bloom filter.
 *
 * **Example** (Inspecting filter saturation)
 *
 * ```ts import.meta.vitest
 * import { MutableScalableBloomFilter } from "effect"
 *
 * const filter = MutableScalableBloomFilter.make<string>({ expectedItems: 100 })
 * const before = MutableScalableBloomFilter.saturation(filter)
 *
 * MutableScalableBloomFilter.add(filter, "alice")
 *
 * MutableScalableBloomFilter.saturation(filter) > before // => true
 * ```
 *
 * @stability unstable
 * @category getters
 * @since 4.2.0
 */
export const saturation: <A>(self: MutableScalableBloomFilter<A>) => number =
  internal.saturationMutableScalableBloomFilter

/**
 * Estimates the combined false positive rate across all slices of a mutable scalable Bloom filter.
 *
 * **Example** (Inspecting the estimated false positive rate)
 *
 * ```ts import.meta.vitest
 * import { MutableScalableBloomFilter } from "effect"
 *
 * const filter = MutableScalableBloomFilter.fromIterable(["alice"], { expectedItems: 100 })
 *
 * MutableScalableBloomFilter.estimatedFalsePositiveRate(filter) > 0 // => true
 * ```
 *
 * @stability unstable
 * @category getters
 * @since 4.2.0
 */
export const estimatedFalsePositiveRate: <A>(self: MutableScalableBloomFilter<A>) => number =
  internal.estimatedFalsePositiveRateMutableScalableBloomFilter

/**
 * Serializes a mutable scalable Bloom filter to bytes.
 *
 * **Example** (Serializing and restoring a filter)
 *
 * ```ts import.meta.vitest
 * import { MutableScalableBloomFilter } from "effect"
 *
 * const filter = MutableScalableBloomFilter.fromIterable(["alice"], { expectedItems: 100 })
 * const restored = MutableScalableBloomFilter.fromBytes<string>(
 *   MutableScalableBloomFilter.toBytes(filter)
 * )
 *
 * MutableScalableBloomFilter.has(restored, "alice") // => true
 * ```
 *
 * @stability unstable
 * @category serialization
 * @since 4.2.0
 */
export const toBytes: <A>(self: MutableScalableBloomFilter<A>) => Uint8Array<ArrayBuffer> =
  internal.toBytesMutableScalableBloomFilter

/**
 * Restores a mutable scalable Bloom filter from bytes produced by `toBytes`.
 *
 * **Gotchas**
 *
 * The bytes must be restored with the same Effect version and value semantics, because `Hash.hash` is not a
 * versioned contract. Malformed bytes or a non-scalable variant throw an `Error`.
 *
 * **Example** (Restoring a filter)
 *
 * ```ts import.meta.vitest
 * import { MutableScalableBloomFilter } from "effect"
 *
 * const filter = MutableScalableBloomFilter.fromIterable(["alice"], { expectedItems: 100 })
 * const restored = MutableScalableBloomFilter.fromBytes<string>(
 *   MutableScalableBloomFilter.toBytes(filter)
 * )
 *
 * MutableScalableBloomFilter.has(restored, "alice") // => true
 * ```
 *
 * @stability unstable
 * @category serialization
 * @since 4.2.0
 */
export const fromBytes: <A>(bytes: Uint8Array) => MutableScalableBloomFilter<A> =
  internal.fromBytesMutableScalableBloomFilter
