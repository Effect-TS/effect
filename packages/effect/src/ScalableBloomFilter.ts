/**
 * Stores values in immutable, scalable Bloom filters that grow by adding slices.
 *
 * A filter starts with one slice and adds geometrically larger slices as earlier ones fill, so it can grow
 * beyond its initial capacity. A filter never reports a false negative for an inserted value, but it may
 * report a false positive for one that was never added.
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

const TypeId = internal.ScalableBloomFilterTypeId

/**
 * Options for creating scalable Bloom filters.
 *
 * **Details**
 *
 * `growthFactor` defaults to `2` and `tighteningRatio` defaults to `0.9`.
 *
 * **Example** (Configuring scalable growth)
 *
 * ```ts
 * import { ScalableBloomFilter } from "effect"
 *
 * const options: ScalableBloomFilter.ScalableBloomFilterOptions = {
 *   expectedItems: 1_000,
 *   growthFactor: 4,
 *   tighteningRatio: 0.8
 * }
 * ```
 *
 * @stability unstable
 * @category models
 * @since 4.2.0
 */
export interface ScalableBloomFilterOptions extends BloomFilterOptions {
  readonly growthFactor?: number | undefined
  readonly tighteningRatio?: number | undefined
}

/**
 * An immutable scalable Bloom filter that grows by adding slices.
 *
 * **Example** (Growing beyond the initial capacity)
 *
 * ```ts import.meta.vitest
 * import { ScalableBloomFilter } from "effect"
 *
 * const filter: ScalableBloomFilter.ScalableBloomFilter<string> =
 *   ScalableBloomFilter.fromIterable(
 *     Array.from({ length: 250 }, (_, i) => `value-${i}`),
 *     { expectedItems: 100 }
 *   )
 *
 * filter.slices // => 2
 * ```
 *
 * @stability unstable
 * @category models
 * @since 4.2.0
 */
export interface ScalableBloomFilter<A> extends Pipeable, Inspectable {
  readonly [TypeId]: typeof TypeId
  readonly "~A": Covariant<A>
  readonly expectedItems: number
  readonly falsePositiveRate: number
  readonly growthFactor: number
  readonly tighteningRatio: number
  readonly slices: number
}

/**
 * Checks whether a value is an immutable scalable `ScalableBloomFilter`.
 *
 * **Example** (Checking filter type)
 *
 * ```ts import.meta.vitest
 * import { BloomFilter, MutableScalableBloomFilter, ScalableBloomFilter } from "effect"
 *
 * const filter = ScalableBloomFilter.make<string>({ expectedItems: 100 })
 *
 * ScalableBloomFilter.isScalableBloomFilter(filter) // => true
 * BloomFilter.isBloomFilter(filter) // => false
 * MutableScalableBloomFilter.isMutableScalableBloomFilter(filter) // => false
 * ```
 *
 * @stability unstable
 * @category guards
 * @since 4.2.0
 */
export const isScalableBloomFilter: (u: unknown) => u is ScalableBloomFilter<any> = internal.isScalableBloomFilter

/**
 * Creates an empty scalable Bloom filter sized for the initial number of values.
 *
 * **Details**
 *
 * `falsePositiveRate` defaults to `0.01`. Invalid or unsupported sizing parameters throw a `RangeError`.
 *
 * **Example** (Creating a scalable filter)
 *
 * ```ts import.meta.vitest
 * import { ScalableBloomFilter } from "effect"
 *
 * const filter = ScalableBloomFilter.make<string>({ expectedItems: 1_000 })
 *
 * ScalableBloomFilter.has(filter, "alice") // => false
 * ScalableBloomFilter.has(ScalableBloomFilter.add(filter, "alice"), "alice") // => true
 * ```
 *
 * @stability unstable
 * @category constructors
 * @since 4.2.0
 */
export const make: <A>(options: ScalableBloomFilterOptions) => ScalableBloomFilter<A> = internal.makeScalableBloomFilter

/**
 * Creates an immutable scalable filter and adds every value from an iterable.
 *
 * **Example** (Creating a filter from existing values)
 *
 * ```ts import.meta.vitest
 * import { ScalableBloomFilter } from "effect"
 *
 * const filter = ScalableBloomFilter.fromIterable(["alice", "bob"], { expectedItems: 100 })
 *
 * ScalableBloomFilter.has(filter, "alice") // => true
 * ScalableBloomFilter.has(filter, "carol") // => false
 * ```
 *
 * @stability unstable
 * @category constructors
 * @since 4.2.0
 */
export const fromIterable: <A>(
  values: Iterable<A>,
  options: ScalableBloomFilterOptions
) => ScalableBloomFilter<A> = internal.fromIterableScalableBloomFilter

/**
 * Adds a value and returns a new filter, adding a slice when the active one is full.
 *
 * **Example** (Adding a value)
 *
 * ```ts import.meta.vitest
 * import { ScalableBloomFilter } from "effect"
 *
 * const filter = ScalableBloomFilter.make<string>({ expectedItems: 100 })
 * const next = ScalableBloomFilter.add(filter, "alice")
 *
 * ScalableBloomFilter.has(filter, "alice") // => false
 * ScalableBloomFilter.has(next, "alice") // => true
 * ```
 *
 * @stability unstable
 * @category mutations
 * @since 4.2.0
 */
export const add: {
  <A>(value: A): (self: ScalableBloomFilter<A>) => ScalableBloomFilter<A>
  <A>(self: ScalableBloomFilter<A>, value: A): ScalableBloomFilter<A>
} = dual(2, internal.addScalableBloomFilter)

/**
 * Adds every value from an iterable and returns a new filter.
 *
 * **Example** (Adding several values)
 *
 * ```ts import.meta.vitest
 * import { ScalableBloomFilter } from "effect"
 *
 * const filter = ScalableBloomFilter.addAll(
 *   ScalableBloomFilter.make<string>({ expectedItems: 100 }),
 *   ["alice", "bob"]
 * )
 *
 * ScalableBloomFilter.has(filter, "bob") // => true
 * ```
 *
 * @stability unstable
 * @category mutations
 * @since 4.2.0
 */
export const addAll: {
  <A>(values: Iterable<A>): (self: ScalableBloomFilter<A>) => ScalableBloomFilter<A>
  <A>(self: ScalableBloomFilter<A>, values: Iterable<A>): ScalableBloomFilter<A>
} = dual(2, internal.addAllScalableBloomFilter)

/**
 * Checks whether a value may be present in any slice of a scalable Bloom filter.
 *
 * **Details**
 *
 * A `true` result may be a false positive. A `false` result means the value was never added.
 *
 * **Example** (Checking membership)
 *
 * ```ts import.meta.vitest
 * import { ScalableBloomFilter } from "effect"
 *
 * const filter = ScalableBloomFilter.fromIterable(["alice"], { expectedItems: 100 })
 *
 * ScalableBloomFilter.has(filter, "alice") // => true
 * ScalableBloomFilter.has(filter, "bob") // => false
 * ```
 *
 * @stability unstable
 * @category predicates
 * @since 4.2.0
 */
export const has: {
  <A>(value: A): (self: ScalableBloomFilter<A>) => boolean
  <A>(self: ScalableBloomFilter<A>, value: A): boolean
} = dual(2, internal.hasScalableBloomFilter)

/**
 * Checks whether a scalable Bloom filter has no bits set.
 *
 * **Example** (Checking for an empty filter)
 *
 * ```ts import.meta.vitest
 * import { ScalableBloomFilter } from "effect"
 *
 * const empty = ScalableBloomFilter.make<string>({ expectedItems: 100 })
 * const filled = ScalableBloomFilter.add(empty, "alice")
 *
 * ScalableBloomFilter.isEmpty(empty) // => true
 * ScalableBloomFilter.isEmpty(filled) // => false
 * ```
 *
 * @stability unstable
 * @category predicates
 * @since 4.2.0
 */
export const isEmpty: <A>(self: ScalableBloomFilter<A>) => boolean = internal.isEmptyScalableBloomFilter

/**
 * Returns the fraction of bits set across all slices of a scalable Bloom filter.
 *
 * **Example** (Inspecting filter saturation)
 *
 * ```ts import.meta.vitest
 * import { ScalableBloomFilter } from "effect"
 *
 * const empty = ScalableBloomFilter.make<string>({ expectedItems: 100 })
 * const filled = ScalableBloomFilter.add(empty, "alice")
 *
 * ScalableBloomFilter.saturation(empty) // => 0
 * ScalableBloomFilter.saturation(filled) > 0 // => true
 * ```
 *
 * @stability unstable
 * @category getters
 * @since 4.2.0
 */
export const saturation: <A>(self: ScalableBloomFilter<A>) => number = internal.saturationScalableBloomFilter

/**
 * Estimates the combined false positive rate across all slices of a scalable Bloom filter.
 *
 * **Example** (Inspecting the estimated false positive rate)
 *
 * ```ts import.meta.vitest
 * import { ScalableBloomFilter } from "effect"
 *
 * const filter = ScalableBloomFilter.fromIterable(["alice"], { expectedItems: 100 })
 *
 * ScalableBloomFilter.estimatedFalsePositiveRate(filter) > 0 // => true
 * ```
 *
 * @stability unstable
 * @category getters
 * @since 4.2.0
 */
export const estimatedFalsePositiveRate: <A>(self: ScalableBloomFilter<A>) => number =
  internal.estimatedFalsePositiveRateScalableBloomFilter

/**
 * Serializes a scalable Bloom filter to bytes.
 *
 * **Example** (Serializing and restoring a filter)
 *
 * ```ts import.meta.vitest
 * import { ScalableBloomFilter } from "effect"
 *
 * const filter = ScalableBloomFilter.fromIterable(["alice"], { expectedItems: 100 })
 * const restored = ScalableBloomFilter.fromBytes<string>(ScalableBloomFilter.toBytes(filter))
 *
 * ScalableBloomFilter.has(restored, "alice") // => true
 * ```
 *
 * @stability unstable
 * @category serialization
 * @since 4.2.0
 */
export const toBytes: <A>(self: ScalableBloomFilter<A>) => Uint8Array<ArrayBuffer> = internal.toBytesScalableBloomFilter

/**
 * Restores a scalable Bloom filter from bytes produced by `toBytes`.
 *
 * **Gotchas**
 *
 * The bytes must be restored with the same Effect version and value semantics, because `Hash.hash` is not a
 * versioned contract. Malformed bytes or a non-scalable variant throw an `Error`.
 *
 * **Example** (Restoring a filter)
 *
 * ```ts import.meta.vitest
 * import { ScalableBloomFilter } from "effect"
 *
 * const filter = ScalableBloomFilter.fromIterable(["alice"], { expectedItems: 100 })
 * const restored = ScalableBloomFilter.fromBytes<string>(ScalableBloomFilter.toBytes(filter))
 *
 * ScalableBloomFilter.has(restored, "alice") // => true
 * ```
 *
 * @stability unstable
 * @category serialization
 * @since 4.2.0
 */
export const fromBytes: <A>(bytes: Uint8Array) => ScalableBloomFilter<A> = internal.fromBytesScalableBloomFilter
