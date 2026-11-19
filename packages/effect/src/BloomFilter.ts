/**
 * Stores values in Bloom filters for fast membership checks with false positives.
 *
 * A filter never reports a false negative for an inserted value, but it may report a false positive for one
 * that was never added. This module provides immutable and mutable classic filters, plus scalable variants
 * that grow by adding slices.
 *
 * @stability unstable
 * @since 4.2.0
 */
import { dual } from "./Function.ts"
import type { Inspectable } from "./Inspectable.ts"
import * as internal from "./internal/bloomFilter.ts"
import type { Pipeable } from "./Pipeable.ts"
import type { Covariant } from "./Types.ts"

const BloomFilterTypeId = internal.BloomFilterTypeId
const MutableBloomFilterTypeId = internal.MutableBloomFilterTypeId
const ScalableBloomFilterTypeId = internal.ScalableBloomFilterTypeId
const MutableScalableBloomFilterTypeId = internal.MutableScalableBloomFilterTypeId

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
 * Options for creating scalable Bloom filters.
 *
 * **Details**
 *
 * `growthFactor` defaults to `2` and `tighteningRatio` defaults to `0.9`.
 *
 * **Example** (Configuring scalable growth)
 *
 * ```ts
 * import { BloomFilter } from "effect"
 *
 * const options: BloomFilter.ScalableBloomFilterOptions = {
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
  readonly [BloomFilterTypeId]: typeof BloomFilterTypeId
  readonly "~A": Covariant<A>
  readonly expectedItems: number
  readonly falsePositiveRate: number
  readonly bits: number
  readonly hashes: number
}

/**
 * A mutable classic Bloom filter.
 *
 * **Example** (Using a mutable filter)
 *
 * ```ts import.meta.vitest
 * import { BloomFilter } from "effect"
 *
 * const filter: BloomFilter.MutableBloomFilter<string> =
 *   BloomFilter.MutableBloomFilter.make<string>({ expectedItems: 100 })
 *
 * BloomFilter.MutableBloomFilter.add(filter, "alice")
 *
 * BloomFilter.MutableBloomFilter.has(filter, "alice") // => true
 * ```
 *
 * @stability unstable
 * @category models
 * @since 4.2.0
 */
export interface MutableBloomFilter<A> extends Pipeable, Inspectable {
  readonly [MutableBloomFilterTypeId]: typeof MutableBloomFilterTypeId
  readonly "~A": Covariant<A>
  readonly expectedItems: number
  readonly falsePositiveRate: number
  readonly bits: number
  readonly hashes: number
}

/**
 * An immutable scalable Bloom filter that grows by adding slices.
 *
 * **Example** (Growing beyond the initial capacity)
 *
 * ```ts import.meta.vitest
 * import { BloomFilter } from "effect"
 *
 * const filter: BloomFilter.ScalableBloomFilter<string> =
 *   BloomFilter.ScalableBloomFilter.fromIterable(
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
  readonly [ScalableBloomFilterTypeId]: typeof ScalableBloomFilterTypeId
  readonly "~A": Covariant<A>
  readonly expectedItems: number
  readonly falsePositiveRate: number
  readonly growthFactor: number
  readonly tighteningRatio: number
  readonly slices: number
}

/**
 * A mutable scalable Bloom filter that grows by adding slices.
 *
 * **Example** (Growing beyond the initial capacity)
 *
 * ```ts import.meta.vitest
 * import { BloomFilter } from "effect"
 *
 * const filter = BloomFilter.MutableScalableBloomFilter.fromIterable(
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
  readonly [MutableScalableBloomFilterTypeId]: typeof MutableScalableBloomFilterTypeId
  readonly "~A": Covariant<A>
  readonly expectedItems: number
  readonly falsePositiveRate: number
  readonly growthFactor: number
  readonly tighteningRatio: number
  readonly slices: number
}

/**
 * Checks whether a value is an immutable classic `BloomFilter`.
 *
 * **Example** (Checking filter type)
 *
 * ```ts import.meta.vitest
 * import { BloomFilter } from "effect"
 *
 * const filter = BloomFilter.make<string>({ expectedItems: 100 })
 *
 * BloomFilter.isBloomFilter(filter) // => true
 * BloomFilter.isMutableBloomFilter(filter) // => false
 * ```
 *
 * @stability unstable
 * @category guards
 * @since 4.2.0
 */
export const isBloomFilter: (u: unknown) => u is BloomFilter<any> = internal.isBloomFilter

/**
 * Checks whether a value is a mutable classic `MutableBloomFilter`.
 *
 * **Example** (Checking filter type)
 *
 * ```ts import.meta.vitest
 * import { BloomFilter } from "effect"
 *
 * const filter = BloomFilter.MutableBloomFilter.make<string>({ expectedItems: 100 })
 *
 * BloomFilter.isMutableBloomFilter(filter) // => true
 * BloomFilter.isBloomFilter(filter) // => false
 * ```
 *
 * @stability unstable
 * @category guards
 * @since 4.2.0
 */
export const isMutableBloomFilter: (u: unknown) => u is MutableBloomFilter<any> = internal.isMutableBloomFilter

/**
 * Checks whether a value is an immutable scalable `ScalableBloomFilter`.
 *
 * **Example** (Checking filter type)
 *
 * ```ts import.meta.vitest
 * import { BloomFilter } from "effect"
 *
 * const filter = BloomFilter.ScalableBloomFilter.make<string>({ expectedItems: 100 })
 *
 * BloomFilter.isScalableBloomFilter(filter) // => true
 * BloomFilter.isBloomFilter(filter) // => false
 * ```
 *
 * @stability unstable
 * @category guards
 * @since 4.2.0
 */
export const isScalableBloomFilter: (u: unknown) => u is ScalableBloomFilter<any> = internal.isScalableBloomFilter

/**
 * Checks whether a value is a mutable scalable `MutableScalableBloomFilter`.
 *
 * **Example** (Checking filter type)
 *
 * ```ts import.meta.vitest
 * import { BloomFilter } from "effect"
 *
 * const filter = BloomFilter.MutableScalableBloomFilter.make<string>({ expectedItems: 100 })
 *
 * BloomFilter.isMutableScalableBloomFilter(filter) // => true
 * BloomFilter.isScalableBloomFilter(filter) // => false
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

/**
 * Constructors and operations for mutable classic Bloom filters.
 *
 * **When to use**
 *
 * Use when updates happen in place and the filter is not shared across fibers.
 *
 * **Example** (Using a mutable filter)
 *
 * ```ts import.meta.vitest
 * import { BloomFilter } from "effect"
 *
 * const filter = BloomFilter.MutableBloomFilter.make<string>({ expectedItems: 100 })
 *
 * BloomFilter.MutableBloomFilter.add(filter, "alice")
 *
 * BloomFilter.MutableBloomFilter.has(filter, "alice") // => true
 * ```
 *
 * @stability unstable
 * @category namespaces
 * @since 4.2.0
 */
export const MutableBloomFilter: {
  /** Creates an empty mutable classic Bloom filter. */
  readonly make: <A>(options: BloomFilterOptions) => MutableBloomFilter<A>
  /** Creates a mutable classic filter and adds every value from an iterable. */
  readonly fromIterable: <A>(
    values: Iterable<A>,
    options: BloomFilterOptions
  ) => MutableBloomFilter<A>
  /** Adds a value in place and returns the same filter. */
  readonly add: {
    <A>(value: A): (self: MutableBloomFilter<A>) => MutableBloomFilter<A>
    <A>(self: MutableBloomFilter<A>, value: A): MutableBloomFilter<A>
  }
  /** Adds every value from an iterable in place and returns the same filter. */
  readonly addAll: {
    <A>(values: Iterable<A>): (self: MutableBloomFilter<A>) => MutableBloomFilter<A>
    <A>(self: MutableBloomFilter<A>, values: Iterable<A>): MutableBloomFilter<A>
  }
  /** Checks whether a value may be present in the filter. */
  readonly has: {
    <A>(value: A): (self: MutableBloomFilter<A>) => boolean
    <A>(self: MutableBloomFilter<A>, value: A): boolean
  }
  /** Removes every value in place and returns the same filter. */
  readonly clear: <A>(self: MutableBloomFilter<A>) => MutableBloomFilter<A>
  /** Creates an independent copy of the filter. */
  readonly clone: <A>(self: MutableBloomFilter<A>) => MutableBloomFilter<A>
  /** Checks whether the filter has no bits set. */
  readonly isEmpty: <A>(self: MutableBloomFilter<A>) => boolean
  /** Returns the fraction of bits set in the filter. */
  readonly saturation: <A>(self: MutableBloomFilter<A>) => number
  /** Estimates the current false positive rate of the filter. */
  readonly estimatedFalsePositiveRate: <A>(self: MutableBloomFilter<A>) => number
  /** Serializes the filter to bytes. */
  readonly toBytes: <A>(self: MutableBloomFilter<A>) => Uint8Array<ArrayBuffer>
  /** Restores a mutable filter from bytes produced by `toBytes`. */
  readonly fromBytes: <A>(bytes: Uint8Array) => MutableBloomFilter<A>
} = {
  make: internal.makeMutableBloomFilter,
  fromIterable: internal.fromIterableMutableBloomFilter,
  add: dual(2, internal.addMutableBloomFilter),
  addAll: dual(2, internal.addAllMutableBloomFilter),
  has: dual(2, internal.hasMutableBloomFilter),
  clear: internal.clearMutableBloomFilter,
  clone: internal.cloneMutableBloomFilter,
  isEmpty: internal.isEmptyMutableBloomFilter,
  saturation: internal.saturationMutableBloomFilter,
  estimatedFalsePositiveRate: internal.estimatedFalsePositiveRateMutableBloomFilter,
  toBytes: internal.toBytesMutableBloomFilter,
  fromBytes: internal.fromBytesMutableBloomFilter
}

/**
 * Constructors and operations for immutable scalable Bloom filters.
 *
 * **When to use**
 *
 * Use when the number of values is not known in advance and the filter may need to grow.
 *
 * **Example** (Growing a scalable filter)
 *
 * ```ts import.meta.vitest
 * import { BloomFilter } from "effect"
 *
 * const filter = BloomFilter.ScalableBloomFilter.fromIterable(
 *   Array.from({ length: 250 }, (_, i) => `value-${i}`),
 *   { expectedItems: 100 }
 * )
 *
 * filter.slices // => 2
 * ```
 *
 * @stability unstable
 * @category namespaces
 * @since 4.2.0
 */
export const ScalableBloomFilter: {
  /** Creates an empty immutable scalable Bloom filter. */
  readonly make: <A>(options: ScalableBloomFilterOptions) => ScalableBloomFilter<A>
  /** Creates an immutable scalable filter and adds every value from an iterable. */
  readonly fromIterable: <A>(
    values: Iterable<A>,
    options: ScalableBloomFilterOptions
  ) => ScalableBloomFilter<A>
  /** Adds a value and returns a new filter, adding a slice when the active one is full. */
  readonly add: {
    <A>(value: A): (self: ScalableBloomFilter<A>) => ScalableBloomFilter<A>
    <A>(self: ScalableBloomFilter<A>, value: A): ScalableBloomFilter<A>
  }
  /** Adds every value from an iterable and returns a new filter. */
  readonly addAll: {
    <A>(values: Iterable<A>): (self: ScalableBloomFilter<A>) => ScalableBloomFilter<A>
    <A>(self: ScalableBloomFilter<A>, values: Iterable<A>): ScalableBloomFilter<A>
  }
  /** Checks whether a value may be present in any slice. */
  readonly has: {
    <A>(value: A): (self: ScalableBloomFilter<A>) => boolean
    <A>(self: ScalableBloomFilter<A>, value: A): boolean
  }
  /** Checks whether the filter has no bits set. */
  readonly isEmpty: <A>(self: ScalableBloomFilter<A>) => boolean
  /** Returns the fraction of bits set across all slices. */
  readonly saturation: <A>(self: ScalableBloomFilter<A>) => number
  /** Estimates the combined false positive rate across all slices. */
  readonly estimatedFalsePositiveRate: <A>(self: ScalableBloomFilter<A>) => number
  /** Serializes the filter to bytes. */
  readonly toBytes: <A>(self: ScalableBloomFilter<A>) => Uint8Array<ArrayBuffer>
  /** Restores a scalable filter from bytes produced by `toBytes`. */
  readonly fromBytes: <A>(bytes: Uint8Array) => ScalableBloomFilter<A>
} = {
  make: internal.makeScalableBloomFilter,
  fromIterable: internal.fromIterableScalableBloomFilter,
  add: dual(2, internal.addScalableBloomFilter),
  addAll: dual(2, internal.addAllScalableBloomFilter),
  has: dual(2, internal.hasScalableBloomFilter),
  isEmpty: internal.isEmptyScalableBloomFilter,
  saturation: internal.saturationScalableBloomFilter,
  estimatedFalsePositiveRate: internal.estimatedFalsePositiveRateScalableBloomFilter,
  toBytes: internal.toBytesScalableBloomFilter,
  fromBytes: internal.fromBytesScalableBloomFilter
}

/**
 * Constructors and operations for mutable scalable Bloom filters.
 *
 * **When to use**
 *
 * Use when values are added in place to a filter that may grow beyond its initial capacity.
 *
 * **Example** (Growing a mutable scalable filter)
 *
 * ```ts import.meta.vitest
 * import { BloomFilter } from "effect"
 *
 * const filter = BloomFilter.MutableScalableBloomFilter.make<string>({ expectedItems: 100 })
 *
 * BloomFilter.MutableScalableBloomFilter.addAll(
 *   filter,
 *   Array.from({ length: 250 }, (_, i) => `value-${i}`)
 * )
 *
 * filter.slices // => 2
 * ```
 *
 * @stability unstable
 * @category namespaces
 * @since 4.2.0
 */
export const MutableScalableBloomFilter: {
  /** Creates an empty mutable scalable Bloom filter. */
  readonly make: <A>(options: ScalableBloomFilterOptions) => MutableScalableBloomFilter<A>
  /** Creates a mutable scalable filter and adds every value from an iterable. */
  readonly fromIterable: <A>(
    values: Iterable<A>,
    options: ScalableBloomFilterOptions
  ) => MutableScalableBloomFilter<A>
  /** Adds a value in place and returns the same filter, adding a slice when the active one is full. */
  readonly add: {
    <A>(value: A): (self: MutableScalableBloomFilter<A>) => MutableScalableBloomFilter<A>
    <A>(self: MutableScalableBloomFilter<A>, value: A): MutableScalableBloomFilter<A>
  }
  /** Adds every value from an iterable in place and returns the same filter. */
  readonly addAll: {
    <A>(values: Iterable<A>): (self: MutableScalableBloomFilter<A>) => MutableScalableBloomFilter<A>
    <A>(self: MutableScalableBloomFilter<A>, values: Iterable<A>): MutableScalableBloomFilter<A>
  }
  /** Checks whether a value may be present in any slice. */
  readonly has: {
    <A>(value: A): (self: MutableScalableBloomFilter<A>) => boolean
    <A>(self: MutableScalableBloomFilter<A>, value: A): boolean
  }
  /** Removes every value in place and returns the same filter with one empty slice. */
  readonly clear: <A>(self: MutableScalableBloomFilter<A>) => MutableScalableBloomFilter<A>
  /** Creates an independent copy of the filter. */
  readonly clone: <A>(self: MutableScalableBloomFilter<A>) => MutableScalableBloomFilter<A>
  /** Checks whether the filter has no bits set. */
  readonly isEmpty: <A>(self: MutableScalableBloomFilter<A>) => boolean
  /** Returns the fraction of bits set across all slices. */
  readonly saturation: <A>(self: MutableScalableBloomFilter<A>) => number
  /** Estimates the combined false positive rate across all slices. */
  readonly estimatedFalsePositiveRate: <A>(self: MutableScalableBloomFilter<A>) => number
  /** Serializes the filter to bytes. */
  readonly toBytes: <A>(self: MutableScalableBloomFilter<A>) => Uint8Array<ArrayBuffer>
  /** Restores a mutable scalable filter from bytes produced by `toBytes`. */
  readonly fromBytes: <A>(bytes: Uint8Array) => MutableScalableBloomFilter<A>
} = {
  make: internal.makeMutableScalableBloomFilter,
  fromIterable: internal.fromIterableMutableScalableBloomFilter,
  add: dual(2, internal.addMutableScalableBloomFilter),
  addAll: dual(2, internal.addAllMutableScalableBloomFilter),
  has: dual(2, internal.hasMutableScalableBloomFilter),
  clear: internal.clearMutableScalableBloomFilter,
  clone: internal.cloneMutableScalableBloomFilter,
  isEmpty: internal.isEmptyMutableScalableBloomFilter,
  saturation: internal.saturationMutableScalableBloomFilter,
  estimatedFalsePositiveRate: internal.estimatedFalsePositiveRateMutableScalableBloomFilter,
  toBytes: internal.toBytesMutableScalableBloomFilter,
  fromBytes: internal.fromBytesMutableScalableBloomFilter
}
