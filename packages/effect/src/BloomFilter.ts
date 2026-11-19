import { dual } from "./Function.ts"
import type { Inspectable } from "./Inspectable.ts"
import * as internal from "./internal/bloomFilter.ts"
import type { Pipeable } from "./Pipeable.ts"
import type { Covariant } from "./Types.ts"

const BloomFilterTypeId = internal.BloomFilterTypeId
const MutableBloomFilterTypeId = internal.MutableBloomFilterTypeId
const ScalableBloomFilterTypeId = internal.ScalableBloomFilterTypeId
const MutableScalableBloomFilterTypeId = internal.MutableScalableBloomFilterTypeId

export interface BloomFilterOptions {
  readonly expectedItems: number
  readonly falsePositiveRate?: number | undefined
}

export interface ScalableBloomFilterOptions extends BloomFilterOptions {
  readonly growthFactor?: number | undefined
  readonly tighteningRatio?: number | undefined
}

export interface BloomFilter<A> extends Pipeable, Inspectable {
  readonly [BloomFilterTypeId]: typeof BloomFilterTypeId
  readonly "~A": Covariant<A>
  readonly expectedItems: number
  readonly falsePositiveRate: number
  readonly bits: number
  readonly hashes: number
}

export interface MutableBloomFilter<A> extends Pipeable, Inspectable {
  readonly [MutableBloomFilterTypeId]: typeof MutableBloomFilterTypeId
  readonly "~A": Covariant<A>
  readonly expectedItems: number
  readonly falsePositiveRate: number
  readonly bits: number
  readonly hashes: number
}

export interface ScalableBloomFilter<A> extends Pipeable, Inspectable {
  readonly [ScalableBloomFilterTypeId]: typeof ScalableBloomFilterTypeId
  readonly "~A": Covariant<A>
  readonly expectedItems: number
  readonly falsePositiveRate: number
  readonly growthFactor: number
  readonly tighteningRatio: number
  readonly slices: number
}

export interface MutableScalableBloomFilter<A> extends Pipeable, Inspectable {
  readonly [MutableScalableBloomFilterTypeId]: typeof MutableScalableBloomFilterTypeId
  readonly "~A": Covariant<A>
  readonly expectedItems: number
  readonly falsePositiveRate: number
  readonly growthFactor: number
  readonly tighteningRatio: number
  readonly slices: number
}

export const isBloomFilter: (u: unknown) => u is BloomFilter<any> = internal.isBloomFilter

export const isMutableBloomFilter: (u: unknown) => u is MutableBloomFilter<any> = internal.isMutableBloomFilter

export const isScalableBloomFilter: (u: unknown) => u is ScalableBloomFilter<any> = internal.isScalableBloomFilter

export const isMutableScalableBloomFilter: (
  u: unknown
) => u is MutableScalableBloomFilter<any> = internal.isMutableScalableBloomFilter

export const make: <A>(options: BloomFilterOptions) => BloomFilter<A> = internal.makeBloomFilter

export const fromIterable: <A>(
  values: Iterable<A>,
  options: BloomFilterOptions
) => BloomFilter<A> = internal.fromIterableBloomFilter

export const add: {
  <A>(value: A): (self: BloomFilter<A>) => BloomFilter<A>
  <A>(self: BloomFilter<A>, value: A): BloomFilter<A>
} = dual(2, internal.addBloomFilter)

export const addAll: {
  <A>(values: Iterable<A>): (self: BloomFilter<A>) => BloomFilter<A>
  <A>(self: BloomFilter<A>, values: Iterable<A>): BloomFilter<A>
} = dual(2, internal.addAllBloomFilter)

export const has: {
  <A>(value: A): (self: BloomFilter<A>) => boolean
  <A>(self: BloomFilter<A>, value: A): boolean
} = dual(2, internal.hasBloomFilter)

export const isEmpty: <A>(self: BloomFilter<A>) => boolean = internal.isEmptyBloomFilter

export const saturation: <A>(self: BloomFilter<A>) => number = internal.saturationBloomFilter

export const estimatedFalsePositiveRate: <A>(self: BloomFilter<A>) => number =
  internal.estimatedFalsePositiveRateBloomFilter

export const toBytes: <A>(self: BloomFilter<A>) => Uint8Array<ArrayBuffer> = internal.toBytesBloomFilter

export const fromBytes: <A>(bytes: Uint8Array) => BloomFilter<A> = internal.fromBytesBloomFilter

export const MutableBloomFilter: {
  readonly make: <A>(options: BloomFilterOptions) => MutableBloomFilter<A>
  readonly fromIterable: <A>(
    values: Iterable<A>,
    options: BloomFilterOptions
  ) => MutableBloomFilter<A>
  readonly add: {
    <A>(value: A): (self: MutableBloomFilter<A>) => MutableBloomFilter<A>
    <A>(self: MutableBloomFilter<A>, value: A): MutableBloomFilter<A>
  }
  readonly addAll: {
    <A>(values: Iterable<A>): (self: MutableBloomFilter<A>) => MutableBloomFilter<A>
    <A>(self: MutableBloomFilter<A>, values: Iterable<A>): MutableBloomFilter<A>
  }
  readonly has: {
    <A>(value: A): (self: MutableBloomFilter<A>) => boolean
    <A>(self: MutableBloomFilter<A>, value: A): boolean
  }
  readonly clear: <A>(self: MutableBloomFilter<A>) => MutableBloomFilter<A>
  readonly clone: <A>(self: MutableBloomFilter<A>) => MutableBloomFilter<A>
  readonly isEmpty: <A>(self: MutableBloomFilter<A>) => boolean
  readonly saturation: <A>(self: MutableBloomFilter<A>) => number
  readonly estimatedFalsePositiveRate: <A>(self: MutableBloomFilter<A>) => number
  readonly toBytes: <A>(self: MutableBloomFilter<A>) => Uint8Array<ArrayBuffer>
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

export const ScalableBloomFilter: {
  readonly make: <A>(options: ScalableBloomFilterOptions) => ScalableBloomFilter<A>
  readonly fromIterable: <A>(
    values: Iterable<A>,
    options: ScalableBloomFilterOptions
  ) => ScalableBloomFilter<A>
  readonly add: {
    <A>(value: A): (self: ScalableBloomFilter<A>) => ScalableBloomFilter<A>
    <A>(self: ScalableBloomFilter<A>, value: A): ScalableBloomFilter<A>
  }
  readonly addAll: {
    <A>(values: Iterable<A>): (self: ScalableBloomFilter<A>) => ScalableBloomFilter<A>
    <A>(self: ScalableBloomFilter<A>, values: Iterable<A>): ScalableBloomFilter<A>
  }
  readonly has: {
    <A>(value: A): (self: ScalableBloomFilter<A>) => boolean
    <A>(self: ScalableBloomFilter<A>, value: A): boolean
  }
  readonly isEmpty: <A>(self: ScalableBloomFilter<A>) => boolean
  readonly saturation: <A>(self: ScalableBloomFilter<A>) => number
  readonly estimatedFalsePositiveRate: <A>(self: ScalableBloomFilter<A>) => number
  readonly toBytes: <A>(self: ScalableBloomFilter<A>) => Uint8Array<ArrayBuffer>
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

export const MutableScalableBloomFilter: {
  readonly make: <A>(options: ScalableBloomFilterOptions) => MutableScalableBloomFilter<A>
  readonly fromIterable: <A>(
    values: Iterable<A>,
    options: ScalableBloomFilterOptions
  ) => MutableScalableBloomFilter<A>
  readonly add: {
    <A>(value: A): (self: MutableScalableBloomFilter<A>) => MutableScalableBloomFilter<A>
    <A>(self: MutableScalableBloomFilter<A>, value: A): MutableScalableBloomFilter<A>
  }
  readonly addAll: {
    <A>(values: Iterable<A>): (self: MutableScalableBloomFilter<A>) => MutableScalableBloomFilter<A>
    <A>(self: MutableScalableBloomFilter<A>, values: Iterable<A>): MutableScalableBloomFilter<A>
  }
  readonly has: {
    <A>(value: A): (self: MutableScalableBloomFilter<A>) => boolean
    <A>(self: MutableScalableBloomFilter<A>, value: A): boolean
  }
  readonly clear: <A>(self: MutableScalableBloomFilter<A>) => MutableScalableBloomFilter<A>
  readonly clone: <A>(self: MutableScalableBloomFilter<A>) => MutableScalableBloomFilter<A>
  readonly isEmpty: <A>(self: MutableScalableBloomFilter<A>) => boolean
  readonly saturation: <A>(self: MutableScalableBloomFilter<A>) => number
  readonly estimatedFalsePositiveRate: <A>(self: MutableScalableBloomFilter<A>) => number
  readonly toBytes: <A>(self: MutableScalableBloomFilter<A>) => Uint8Array<ArrayBuffer>
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
