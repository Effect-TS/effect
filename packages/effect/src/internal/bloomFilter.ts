import * as Hash from "../Hash.ts"
import type { Inspectable } from "../Inspectable.ts"
import type { Pipeable } from "../Pipeable.ts"
import { hasProperty } from "../Predicate.ts"
import type { Covariant } from "../Types.ts"
import { PipeInspectableProto } from "./core.ts"

/** @internal */
export const BloomFilterTypeId = "~effect/BloomFilter" as const

/** @internal */
export const MutableBloomFilterTypeId = "~effect/MutableBloomFilter" as const

/** @internal */
export const ScalableBloomFilterTypeId = "~effect/ScalableBloomFilter" as const

/** @internal */
export const MutableScalableBloomFilterTypeId = "~effect/MutableScalableBloomFilter" as const

/** @internal */
export interface MakeOptions {
  readonly expectedItems: number
  readonly falsePositiveRate?: number | undefined
}

/** @internal */
export interface ScalableMakeOptions extends MakeOptions {
  readonly growthFactor?: number | undefined
  readonly tighteningRatio?: number | undefined
}

/** @internal */
export interface BloomFilter<A> extends Pipeable, Inspectable {
  readonly [BloomFilterTypeId]: typeof BloomFilterTypeId
  readonly "~A": Covariant<A>
  readonly expectedItems: number
  readonly falsePositiveRate: number
  readonly bits: number
  readonly hashes: number
}

/** @internal */
export interface MutableBloomFilter<A> extends Pipeable, Inspectable {
  readonly [MutableBloomFilterTypeId]: typeof MutableBloomFilterTypeId
  readonly "~A": Covariant<A>
  readonly expectedItems: number
  readonly falsePositiveRate: number
  readonly bits: number
  readonly hashes: number
}

/** @internal */
export interface ScalableBloomFilter<A> extends Pipeable, Inspectable {
  readonly [ScalableBloomFilterTypeId]: typeof ScalableBloomFilterTypeId
  readonly "~A": Covariant<A>
  readonly expectedItems: number
  readonly falsePositiveRate: number
  readonly growthFactor: number
  readonly tighteningRatio: number
  readonly slices: number
}

/** @internal */
export interface MutableScalableBloomFilter<A> extends Pipeable, Inspectable {
  readonly [MutableScalableBloomFilterTypeId]: typeof MutableScalableBloomFilterTypeId
  readonly "~A": Covariant<A>
  readonly expectedItems: number
  readonly falsePositiveRate: number
  readonly growthFactor: number
  readonly tighteningRatio: number
  readonly slices: number
}

interface ClassicState {
  readonly words: Uint32Array
  readonly bits: number
  readonly hashes: number
  readonly expectedItems: number
  readonly falsePositiveRate: number
  setBits: number
}

interface Slice {
  readonly bits: number
  readonly hashes: number
  readonly words: Uint32Array
  setBits: number
  count: number
}

interface ScalableState {
  readonly slices: Array<Slice>
  readonly expectedItems: number
  readonly falsePositiveRate: number
  readonly growthFactor: number
  readonly tighteningRatio: number
}

interface ScalableConfig {
  readonly expectedItems: number
  readonly falsePositiveRate: number
  readonly growthFactor: number
  readonly tighteningRatio: number
}

const DEFAULT_FALSE_POSITIVE_RATE = 0.01
const DEFAULT_GROWTH_FACTOR = 2
const DEFAULT_TIGHTENING_RATIO = 0.9
const MAX_U32 = 0xffffffff
const MAX_BITS = 0xffffffe0
const MAX_HASHES = 64
const MAGIC_FIRST = 0x45
const MAGIC_SECOND = 0x42
const MAGIC_THIRD = 0x46
const FORMAT_VERSION = 1
const CLASSIC_VARIANT = 0
const SCALABLE_VARIANT = 1
const CLASSIC_HEADER_SIZE = 28
const SCALABLE_HEADER_SIZE = 40
const SLICE_HEADER_SIZE = 12

const validateExpectedItems = (expectedItems: number): void => {
  if (!Number.isSafeInteger(expectedItems) || expectedItems <= 0 || expectedItems > MAX_U32) {
    throw new RangeError(
      `BloomFilter: expectedItems must be a positive safe integer no greater than ${MAX_U32}, received ${expectedItems}`
    )
  }
}

const validateFalsePositiveRate = (falsePositiveRate: number): void => {
  if (!Number.isFinite(falsePositiveRate) || falsePositiveRate <= 0 || falsePositiveRate >= 1) {
    throw new RangeError(
      `BloomFilter: falsePositiveRate must be a finite number between 0 and 1 exclusive, received ${falsePositiveRate}`
    )
  }
}

const validateGrowthFactor = (growthFactor: number): void => {
  if (!Number.isFinite(growthFactor) || growthFactor <= 1) {
    throw new RangeError(
      `BloomFilter: growthFactor must be a finite number greater than 1, received ${growthFactor}`
    )
  }
}

const validateTighteningRatio = (tighteningRatio: number): void => {
  if (!Number.isFinite(tighteningRatio) || tighteningRatio <= 0 || tighteningRatio >= 1) {
    throw new RangeError(
      `BloomFilter: tighteningRatio must be a finite number between 0 and 1 exclusive, received ${tighteningRatio}`
    )
  }
}

const sizeFor = (
  expectedItems: number,
  falsePositiveRate: number
): { readonly bits: number; readonly hashes: number } => {
  const rawBits = Math.ceil(-expectedItems * Math.log(falsePositiveRate) / (Math.LN2 * Math.LN2))
  const bits = Math.ceil(rawBits / 32) * 32

  if (!Number.isFinite(bits) || bits <= 0 || bits > MAX_BITS) {
    throw new RangeError(
      "BloomFilter: computed bit count exceeds the supported maximum; use a larger falsePositiveRate"
    )
  }

  const hashes = Math.max(1, Math.round((bits / expectedItems) * Math.LN2))
  if (hashes > MAX_HASHES) {
    throw new RangeError(
      `BloomFilter: computed hash count exceeds ${MAX_HASHES}; use a larger falsePositiveRate`
    )
  }

  return { bits, hashes }
}

const capacityFor = (config: ScalableConfig, index: number): number => {
  const capacity = Math.ceil(config.expectedItems * Math.pow(config.growthFactor, index))

  if (!Number.isSafeInteger(capacity) || capacity <= 0 || capacity > MAX_U32) {
    throw new RangeError(
      `BloomFilter: scalable growth exceeded the maximum supported capacity at slice ${index}`
    )
  }

  return capacity
}

const sliceFalsePositiveRate = (config: ScalableConfig, index: number): number =>
  config.falsePositiveRate * (1 - config.tighteningRatio) * Math.pow(config.tighteningRatio, index)

const makeSlice = (index: number, config: ScalableConfig): Slice => {
  const capacity = capacityFor(config, index)
  const { bits, hashes } = sizeFor(capacity, sliceFalsePositiveRate(config, index))
  return {
    bits,
    hashes,
    words: new Uint32Array(bits >>> 5),
    setBits: 0,
    count: 0
  }
}

const classicState = (self: any): ClassicState => self.state

const scalableState = (self: any): ScalableState => self.state

const hashPair = (value: unknown): readonly [number, number] => {
  const hash = Hash.hash(value) >>> 0
  return [
    Hash.combine(hash, 0x9e3779b1) >>> 0,
    Hash.combine(hash, 0x85ebca6b) >>> 0
  ]
}

const getBit = (words: Uint32Array, index: number): boolean => (words[index >>> 5] & (1 << (index & 31))) !== 0

const setBit = (words: Uint32Array, index: number): boolean => {
  const word = index >>> 5
  const mask = 1 << (index & 31)
  if ((words[word] & mask) !== 0) {
    return false
  }
  words[word] |= mask
  return true
}

const hasPosition = (
  words: Uint32Array,
  bits: number,
  hashes: number,
  hash1: number,
  hash2: number
): boolean => {
  let position = hash1
  for (let i = 0; i < hashes; i++) {
    if (!getBit(words, position % bits)) {
      return false
    }
    position = (position + hash2 + 2 * i + 1) >>> 0
  }
  return true
}

const addPosition = (
  words: Uint32Array,
  bits: number,
  hashes: number,
  hash1: number,
  hash2: number
): number => {
  let added = 0
  let position = hash1
  for (let i = 0; i < hashes; i++) {
    if (setBit(words, position % bits)) {
      added++
    }
    position = (position + hash2 + 2 * i + 1) >>> 0
  }
  return added
}

const popcount = (n: number): number => {
  n = n - ((n >>> 1) & 0x55555555)
  n = (n & 0x33333333) + ((n >>> 2) & 0x33333333)
  return Math.imul((n + (n >>> 4)) & 0x0f0f0f0f, 0x01010101) >>> 24
}

const classicSaturation = (state: ClassicState): number => state.bits === 0 ? 0 : state.setBits / state.bits

const classicFalsePositiveRate = (state: ClassicState): number => Math.pow(classicSaturation(state), state.hashes)

const scalableSaturation = (state: ScalableState): number => {
  let setBits = 0
  let bits = 0
  for (const slice of state.slices) {
    setBits += slice.setBits
    bits += slice.bits
  }
  return bits === 0 ? 0 : setBits / bits
}

const scalableFalsePositiveRate = (state: ScalableState): number => {
  let allMisses = 1
  for (const slice of state.slices) {
    const saturation = slice.bits === 0 ? 0 : slice.setBits / slice.bits
    allMisses *= 1 - Math.pow(saturation, slice.hashes)
  }
  return 1 - allMisses
}

const BloomFilterProto = {
  ...PipeInspectableProto,
  [BloomFilterTypeId]: BloomFilterTypeId,
  toJSON(this: any) {
    return {
      _id: "BloomFilter",
      expectedItems: this.state.expectedItems,
      falsePositiveRate: this.state.falsePositiveRate,
      bits: this.state.bits,
      hashes: this.state.hashes,
      saturation: classicSaturation(this.state)
    }
  }
}

const MutableBloomFilterProto = {
  ...PipeInspectableProto,
  [MutableBloomFilterTypeId]: MutableBloomFilterTypeId,
  toJSON(this: any) {
    return {
      _id: "MutableBloomFilter",
      expectedItems: this.state.expectedItems,
      falsePositiveRate: this.state.falsePositiveRate,
      bits: this.state.bits,
      hashes: this.state.hashes,
      saturation: classicSaturation(this.state)
    }
  }
}

const ScalableBloomFilterProto = {
  ...PipeInspectableProto,
  [ScalableBloomFilterTypeId]: ScalableBloomFilterTypeId,
  toJSON(this: any) {
    return {
      _id: "ScalableBloomFilter",
      expectedItems: this.state.expectedItems,
      falsePositiveRate: this.state.falsePositiveRate,
      growthFactor: this.state.growthFactor,
      tighteningRatio: this.state.tighteningRatio,
      slices: this.state.slices.length,
      saturation: scalableSaturation(this.state)
    }
  }
}

const MutableScalableBloomFilterProto = {
  ...PipeInspectableProto,
  [MutableScalableBloomFilterTypeId]: MutableScalableBloomFilterTypeId,
  toJSON(this: any) {
    return {
      _id: "MutableScalableBloomFilter",
      expectedItems: this.state.expectedItems,
      falsePositiveRate: this.state.falsePositiveRate,
      growthFactor: this.state.growthFactor,
      tighteningRatio: this.state.tighteningRatio,
      slices: this.state.slices.length,
      saturation: scalableSaturation(this.state)
    }
  }
}

const createClassicObject = (state: ClassicState, mutable: boolean): any => {
  const self = Object.create(mutable ? MutableBloomFilterProto : BloomFilterProto)
  self.state = state
  self.expectedItems = state.expectedItems
  self.falsePositiveRate = state.falsePositiveRate
  self.bits = state.bits
  self.hashes = state.hashes
  return self
}

const createScalableObject = (state: ScalableState, mutable: boolean): any => {
  const self = Object.create(
    mutable ? MutableScalableBloomFilterProto : ScalableBloomFilterProto
  )
  self.state = state
  self.expectedItems = state.expectedItems
  self.falsePositiveRate = state.falsePositiveRate
  self.growthFactor = state.growthFactor
  self.tighteningRatio = state.tighteningRatio
  self.slices = state.slices.length
  return self
}

const addClassicHash = (state: ClassicState, hash1: number, hash2: number): void => {
  state.setBits += addPosition(state.words, state.bits, state.hashes, hash1, hash2)
}

const sliceHas = (slice: Slice, hash1: number, hash2: number): boolean =>
  hasPosition(slice.words, slice.bits, slice.hashes, hash1, hash2)

const sliceAdd = (slice: Slice, hash1: number, hash2: number): void => {
  slice.setBits += addPosition(slice.words, slice.bits, slice.hashes, hash1, hash2)
}

const addScalableMutable = (state: ScalableState, hash1: number, hash2: number): void => {
  let activeIndex = state.slices.length - 1
  let active = state.slices[activeIndex]

  if (active.count >= capacityFor(state, activeIndex)) {
    active = makeSlice(state.slices.length, state)
    state.slices.push(active)
  }

  sliceAdd(active, hash1, hash2)
  active.count++
}

const readHeader = (bytes: Uint8Array, variant: number): DataView => {
  if (bytes.length < 8) {
    return invalidBytes("header is truncated")
  }
  if (bytes[0] !== MAGIC_FIRST || bytes[1] !== MAGIC_SECOND || bytes[2] !== MAGIC_THIRD) {
    return invalidBytes("bad magic")
  }
  if (bytes[3] !== FORMAT_VERSION) {
    return invalidBytes(`unsupported version ${bytes[3]}`)
  }
  if (bytes[4] !== variant) {
    return invalidBytes(
      variant === CLASSIC_VARIANT ? "expected a classic filter" : "expected a scalable filter"
    )
  }
  if (bytes[5] !== 0) {
    return invalidBytes("unsupported flags")
  }
  if (bytes[6] !== 0 || bytes[7] !== 0) {
    return invalidBytes("unsupported reserved bytes")
  }
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
}

const readConfiguration = (view: DataView): {
  readonly expectedItems: number
  readonly falsePositiveRate: number
} => {
  const expectedItems = view.getUint32(8, true)
  const falsePositiveRate = view.getFloat64(12, true)

  if (expectedItems === 0) {
    return invalidBytes("expectedItems must be positive")
  }
  if (!Number.isFinite(falsePositiveRate) || falsePositiveRate <= 0 || falsePositiveRate >= 1) {
    return invalidBytes("invalid falsePositiveRate")
  }

  return { expectedItems, falsePositiveRate }
}

const encodeClassic = (state: ClassicState): Uint8Array<ArrayBuffer> => {
  const words = state.words
  const buffer = new ArrayBuffer(CLASSIC_HEADER_SIZE + words.length * 4)
  const view = new DataView(buffer)
  const bytes = new Uint8Array(buffer)

  bytes[0] = MAGIC_FIRST
  bytes[1] = MAGIC_SECOND
  bytes[2] = MAGIC_THIRD
  bytes[3] = FORMAT_VERSION
  bytes[4] = CLASSIC_VARIANT
  bytes[5] = 0
  bytes[6] = 0
  bytes[7] = 0
  view.setUint32(8, state.expectedItems, true)
  view.setFloat64(12, state.falsePositiveRate, true)
  view.setUint32(20, state.bits, true)
  view.setUint32(24, state.hashes, true)

  for (let i = 0; i < words.length; i++) {
    view.setUint32(CLASSIC_HEADER_SIZE + i * 4, words[i], true)
  }

  return bytes
}

const encodeScalable = (state: ScalableState): Uint8Array<ArrayBuffer> => {
  let length = SCALABLE_HEADER_SIZE
  for (const slice of state.slices) {
    length += SLICE_HEADER_SIZE + slice.words.length * 4
  }

  const buffer = new ArrayBuffer(length)
  const view = new DataView(buffer)
  const bytes = new Uint8Array(buffer)

  bytes[0] = MAGIC_FIRST
  bytes[1] = MAGIC_SECOND
  bytes[2] = MAGIC_THIRD
  bytes[3] = FORMAT_VERSION
  bytes[4] = SCALABLE_VARIANT
  bytes[5] = 0
  bytes[6] = 0
  bytes[7] = 0
  view.setUint32(8, state.expectedItems, true)
  view.setFloat64(12, state.falsePositiveRate, true)
  view.setFloat64(20, state.growthFactor, true)
  view.setFloat64(28, state.tighteningRatio, true)
  view.setUint32(36, state.slices.length, true)

  let offset = SCALABLE_HEADER_SIZE
  for (const slice of state.slices) {
    view.setUint32(offset, slice.bits, true)
    view.setUint32(offset + 4, slice.hashes, true)
    view.setUint32(offset + 8, slice.count, true)
    for (let i = 0; i < slice.words.length; i++) {
      view.setUint32(offset + SLICE_HEADER_SIZE + i * 4, slice.words[i], true)
    }
    offset += SLICE_HEADER_SIZE + slice.words.length * 4
  }

  return bytes
}

const decodeClassic = (bytes: Uint8Array): ClassicState => {
  if (bytes.length < CLASSIC_HEADER_SIZE) {
    return invalidBytes("classic header is truncated")
  }

  const view = readHeader(bytes, CLASSIC_VARIANT)
  const { expectedItems, falsePositiveRate } = readConfiguration(view)
  const bits = view.getUint32(20, true)
  const hashes = view.getUint32(24, true)

  if (bits === 0 || bits % 32 !== 0 || bits > MAX_BITS) {
    return invalidBytes("invalid bit count")
  }
  if (hashes < 1 || hashes > MAX_HASHES) {
    return invalidBytes("invalid hash count")
  }

  const wordsLength = bits >>> 5
  if (bytes.length !== CLASSIC_HEADER_SIZE + wordsLength * 4) {
    return invalidBytes("length mismatch")
  }

  const words = new Uint32Array(wordsLength)
  let setBits = 0
  for (let i = 0; i < wordsLength; i++) {
    const word = view.getUint32(CLASSIC_HEADER_SIZE + i * 4, true)
    words[i] = word
    setBits += popcount(word)
  }

  return { words, bits, hashes, expectedItems, falsePositiveRate, setBits }
}

const decodeScalable = (bytes: Uint8Array): ScalableState => {
  if (bytes.length < SCALABLE_HEADER_SIZE) {
    return invalidBytes("scalable header is truncated")
  }

  const view = readHeader(bytes, SCALABLE_VARIANT)
  const { expectedItems, falsePositiveRate } = readConfiguration(view)
  const growthFactor = view.getFloat64(20, true)
  const tighteningRatio = view.getFloat64(28, true)
  const sliceCount = view.getUint32(36, true)

  if (!Number.isFinite(growthFactor) || growthFactor <= 1) {
    return invalidBytes("invalid growthFactor")
  }
  if (!Number.isFinite(tighteningRatio) || tighteningRatio <= 0 || tighteningRatio >= 1) {
    return invalidBytes("invalid tighteningRatio")
  }
  if (sliceCount < 1) {
    return invalidBytes("sliceCount must be positive")
  }

  let offset = SCALABLE_HEADER_SIZE
  const slices: Array<Slice> = []

  for (let index = 0; index < sliceCount; index++) {
    if (offset + SLICE_HEADER_SIZE > bytes.length) {
      return invalidBytes("slice header is truncated")
    }

    const bits = view.getUint32(offset, true)
    const hashes = view.getUint32(offset + 4, true)
    const count = view.getUint32(offset + 8, true)

    if (bits === 0 || bits % 32 !== 0 || bits > MAX_BITS) {
      return invalidBytes("invalid slice bit count")
    }
    if (hashes < 1 || hashes > MAX_HASHES) {
      return invalidBytes("invalid slice hash count")
    }

    const wordsLength = bits >>> 5
    const sliceLength = SLICE_HEADER_SIZE + wordsLength * 4
    if (offset + sliceLength > bytes.length) {
      return invalidBytes("slice is truncated")
    }

    const words = new Uint32Array(wordsLength)
    let setBits = 0
    for (let i = 0; i < wordsLength; i++) {
      const word = view.getUint32(offset + SLICE_HEADER_SIZE + i * 4, true)
      words[i] = word
      setBits += popcount(word)
    }

    const capacity = expectedItems * Math.pow(growthFactor, index)
    if (
      Number.isFinite(capacity) &&
      capacity > 0 &&
      capacity <= MAX_U32 &&
      count > Math.ceil(capacity)
    ) {
      return invalidBytes("slice count exceeds its capacity")
    }

    slices.push({ bits, hashes, words, setBits, count })
    offset += sliceLength
  }

  if (offset !== bytes.length) {
    return invalidBytes("trailing bytes")
  }

  return { slices, expectedItems, falsePositiveRate, growthFactor, tighteningRatio }
}

function invalidBytes(reason: string): never {
  throw new Error(`Invalid BloomFilter bytes: ${reason}`)
}

/** @internal */
export const isBloomFilter = (u: unknown): u is BloomFilter<any> => hasProperty(u, BloomFilterTypeId)

/** @internal */
export const isMutableBloomFilter = (u: unknown): u is MutableBloomFilter<any> =>
  hasProperty(u, MutableBloomFilterTypeId)

/** @internal */
export const isScalableBloomFilter = (u: unknown): u is ScalableBloomFilter<any> =>
  hasProperty(u, ScalableBloomFilterTypeId)

/** @internal */
export const isMutableScalableBloomFilter = (u: unknown): u is MutableScalableBloomFilter<any> =>
  hasProperty(u, MutableScalableBloomFilterTypeId)

/** @internal */
export const makeBloomFilter = <A>(options: MakeOptions): BloomFilter<A> => {
  const expectedItems = options.expectedItems
  const falsePositiveRate = options.falsePositiveRate ?? DEFAULT_FALSE_POSITIVE_RATE
  validateExpectedItems(expectedItems)
  validateFalsePositiveRate(falsePositiveRate)
  const { bits, hashes } = sizeFor(expectedItems, falsePositiveRate)
  return createClassicObject(
    {
      words: new Uint32Array(bits >>> 5),
      bits,
      hashes,
      expectedItems,
      falsePositiveRate,
      setBits: 0
    },
    false
  )
}

/** @internal */
export const fromIterableBloomFilter = <A>(
  values: Iterable<A>,
  options: MakeOptions
): BloomFilter<A> => addAllBloomFilter(makeBloomFilter<A>(options), values)

/** @internal */
export const addBloomFilter = <A>(self: BloomFilter<A>, value: A): BloomFilter<A> => {
  const state = classicState(self)
  const [hash1, hash2] = hashPair(value)

  if (hasPosition(state.words, state.bits, state.hashes, hash1, hash2)) {
    return self
  }

  const words = state.words.slice()
  let setBits = state.setBits
  setBits += addPosition(words, state.bits, state.hashes, hash1, hash2)
  return createClassicObject({ ...state, words, setBits }, false)
}

/** @internal */
export const addAllBloomFilter = <A>(
  self: BloomFilter<A>,
  values: Iterable<A>
): BloomFilter<A> => {
  const list = Array.from(values)
  if (list.length === 0) {
    return self
  }

  const state = classicState(self)
  const hashes = list.map(hashPair)
  let changed = false

  for (const [hash1, hash2] of hashes) {
    if (!hasPosition(state.words, state.bits, state.hashes, hash1, hash2)) {
      changed = true
      break
    }
  }

  if (!changed) {
    return self
  }

  const words = state.words.slice()
  let setBits = state.setBits
  for (const [hash1, hash2] of hashes) {
    setBits += addPosition(words, state.bits, state.hashes, hash1, hash2)
  }

  return createClassicObject({ ...state, words, setBits }, false)
}

/** @internal */
export const hasBloomFilter = <A>(self: BloomFilter<A>, value: A): boolean => {
  const state = classicState(self)
  const [hash1, hash2] = hashPair(value)
  return hasPosition(state.words, state.bits, state.hashes, hash1, hash2)
}

/** @internal */
export const isEmptyBloomFilter = <A>(self: BloomFilter<A>): boolean => classicState(self).setBits === 0

/** @internal */
export const saturationBloomFilter = <A>(self: BloomFilter<A>): number => classicSaturation(classicState(self))

/** @internal */
export const estimatedFalsePositiveRateBloomFilter = <A>(self: BloomFilter<A>): number =>
  classicFalsePositiveRate(classicState(self))

/** @internal */
export const toBytesBloomFilter = <A>(self: BloomFilter<A>): Uint8Array<ArrayBuffer> =>
  encodeClassic(classicState(self))

/** @internal */
export const fromBytesBloomFilter = <A>(bytes: Uint8Array): BloomFilter<A> =>
  createClassicObject(decodeClassic(bytes), false)

/** @internal */
export const makeMutableBloomFilter = <A>(options: MakeOptions): MutableBloomFilter<A> => {
  const expectedItems = options.expectedItems
  const falsePositiveRate = options.falsePositiveRate ?? DEFAULT_FALSE_POSITIVE_RATE
  validateExpectedItems(expectedItems)
  validateFalsePositiveRate(falsePositiveRate)
  const { bits, hashes } = sizeFor(expectedItems, falsePositiveRate)
  return createClassicObject(
    {
      words: new Uint32Array(bits >>> 5),
      bits,
      hashes,
      expectedItems,
      falsePositiveRate,
      setBits: 0
    },
    true
  )
}

/** @internal */
export const fromIterableMutableBloomFilter = <A>(
  values: Iterable<A>,
  options: MakeOptions
): MutableBloomFilter<A> => addAllMutableBloomFilter(makeMutableBloomFilter<A>(options), values)

/** @internal */
export const addMutableBloomFilter = <A>(
  self: MutableBloomFilter<A>,
  value: A
): MutableBloomFilter<A> => {
  const state = classicState(self)
  const [hash1, hash2] = hashPair(value)
  addClassicHash(state, hash1, hash2)
  return self
}

/** @internal */
export const addAllMutableBloomFilter = <A>(
  self: MutableBloomFilter<A>,
  values: Iterable<A>
): MutableBloomFilter<A> => {
  const state = classicState(self)
  for (const value of values) {
    const [hash1, hash2] = hashPair(value)
    addClassicHash(state, hash1, hash2)
  }
  return self
}

/** @internal */
export const hasMutableBloomFilter = <A>(self: MutableBloomFilter<A>, value: A): boolean => {
  const state = classicState(self)
  const [hash1, hash2] = hashPair(value)
  return hasPosition(state.words, state.bits, state.hashes, hash1, hash2)
}

/** @internal */
export const clearMutableBloomFilter = <A>(self: MutableBloomFilter<A>): MutableBloomFilter<A> => {
  const state = classicState(self)
  state.words.fill(0)
  state.setBits = 0
  return self
}

/** @internal */
export const cloneMutableBloomFilter = <A>(self: MutableBloomFilter<A>): MutableBloomFilter<A> => {
  const state = classicState(self)
  return createClassicObject({ ...state, words: state.words.slice() }, true)
}

/** @internal */
export const isEmptyMutableBloomFilter = <A>(self: MutableBloomFilter<A>): boolean => classicState(self).setBits === 0

/** @internal */
export const saturationMutableBloomFilter = <A>(self: MutableBloomFilter<A>): number =>
  classicSaturation(classicState(self))

/** @internal */
export const estimatedFalsePositiveRateMutableBloomFilter = <A>(
  self: MutableBloomFilter<A>
): number => classicFalsePositiveRate(classicState(self))

/** @internal */
export const toBytesMutableBloomFilter = <A>(
  self: MutableBloomFilter<A>
): Uint8Array<ArrayBuffer> => encodeClassic(classicState(self))

/** @internal */
export const fromBytesMutableBloomFilter = <A>(bytes: Uint8Array): MutableBloomFilter<A> =>
  createClassicObject(decodeClassic(bytes), true)

/** @internal */
export const makeScalableBloomFilter = <A>(options: ScalableMakeOptions): ScalableBloomFilter<A> => {
  const expectedItems = options.expectedItems
  const falsePositiveRate = options.falsePositiveRate ?? DEFAULT_FALSE_POSITIVE_RATE
  const growthFactor = options.growthFactor ?? DEFAULT_GROWTH_FACTOR
  const tighteningRatio = options.tighteningRatio ?? DEFAULT_TIGHTENING_RATIO
  validateExpectedItems(expectedItems)
  validateFalsePositiveRate(falsePositiveRate)
  validateGrowthFactor(growthFactor)
  validateTighteningRatio(tighteningRatio)
  const config = { expectedItems, falsePositiveRate, growthFactor, tighteningRatio }
  return createScalableObject({ ...config, slices: [makeSlice(0, config)] }, false)
}

/** @internal */
export const fromIterableScalableBloomFilter = <A>(
  values: Iterable<A>,
  options: ScalableMakeOptions
): ScalableBloomFilter<A> => addAllScalableBloomFilter(makeScalableBloomFilter<A>(options), values)

/** @internal */
export const addScalableBloomFilter = <A>(
  self: ScalableBloomFilter<A>,
  value: A
): ScalableBloomFilter<A> => {
  const state = scalableState(self)
  const [hash1, hash2] = hashPair(value)
  const activeIndex = state.slices.length - 1
  const active = state.slices[activeIndex]

  if (active.count >= capacityFor(state, activeIndex)) {
    const next = makeSlice(state.slices.length, state)
    sliceAdd(next, hash1, hash2)
    next.count = 1
    return createScalableObject({ ...state, slices: [...state.slices, next] }, false)
  }

  const next = { ...active, words: active.words.slice() }
  sliceAdd(next, hash1, hash2)
  next.count = active.count + 1
  const slices = state.slices.slice()
  slices[activeIndex] = next
  return createScalableObject({ ...state, slices }, false)
}

/** @internal */
export const addAllScalableBloomFilter = <A>(
  self: ScalableBloomFilter<A>,
  values: Iterable<A>
): ScalableBloomFilter<A> => {
  const list = Array.from(values)
  if (list.length === 0) {
    return self
  }

  const state = scalableState(self)
  const working: ScalableState = {
    ...state,
    slices: state.slices.map((slice, index) =>
      index === state.slices.length - 1 ? { ...slice, words: slice.words.slice() } : slice
    )
  }

  for (const value of list) {
    const [hash1, hash2] = hashPair(value)
    addScalableMutable(working, hash1, hash2)
  }

  return createScalableObject(working, false)
}

/** @internal */
export const hasScalableBloomFilter = <A>(self: ScalableBloomFilter<A>, value: A): boolean => {
  const state = scalableState(self)
  const [hash1, hash2] = hashPair(value)
  for (const slice of state.slices) {
    if (sliceHas(slice, hash1, hash2)) {
      return true
    }
  }
  return false
}

/** @internal */
export const isEmptyScalableBloomFilter = <A>(self: ScalableBloomFilter<A>): boolean =>
  scalableState(self).slices.every((slice) => slice.setBits === 0)

/** @internal */
export const saturationScalableBloomFilter = <A>(self: ScalableBloomFilter<A>): number =>
  scalableSaturation(scalableState(self))

/** @internal */
export const estimatedFalsePositiveRateScalableBloomFilter = <A>(
  self: ScalableBloomFilter<A>
): number => scalableFalsePositiveRate(scalableState(self))

/** @internal */
export const toBytesScalableBloomFilter = <A>(
  self: ScalableBloomFilter<A>
): Uint8Array<ArrayBuffer> => encodeScalable(scalableState(self))

/** @internal */
export const fromBytesScalableBloomFilter = <A>(bytes: Uint8Array): ScalableBloomFilter<A> =>
  createScalableObject(decodeScalable(bytes), false)

/** @internal */
export const makeMutableScalableBloomFilter = <A>(
  options: ScalableMakeOptions
): MutableScalableBloomFilter<A> => {
  const expectedItems = options.expectedItems
  const falsePositiveRate = options.falsePositiveRate ?? DEFAULT_FALSE_POSITIVE_RATE
  const growthFactor = options.growthFactor ?? DEFAULT_GROWTH_FACTOR
  const tighteningRatio = options.tighteningRatio ?? DEFAULT_TIGHTENING_RATIO
  validateExpectedItems(expectedItems)
  validateFalsePositiveRate(falsePositiveRate)
  validateGrowthFactor(growthFactor)
  validateTighteningRatio(tighteningRatio)
  const config = { expectedItems, falsePositiveRate, growthFactor, tighteningRatio }
  return createScalableObject({ ...config, slices: [makeSlice(0, config)] }, true)
}

/** @internal */
export const fromIterableMutableScalableBloomFilter = <A>(
  values: Iterable<A>,
  options: ScalableMakeOptions
): MutableScalableBloomFilter<A> => addAllMutableScalableBloomFilter(makeMutableScalableBloomFilter<A>(options), values)

/** @internal */
export const addMutableScalableBloomFilter = <A>(
  self: MutableScalableBloomFilter<A>,
  value: A
): MutableScalableBloomFilter<A> => {
  const state = scalableState(self)
  const [hash1, hash2] = hashPair(value)
  addScalableMutable(state, hash1, hash2)
  ;(self as any).slices = state.slices.length
  return self
}

/** @internal */
export const addAllMutableScalableBloomFilter = <A>(
  self: MutableScalableBloomFilter<A>,
  values: Iterable<A>
): MutableScalableBloomFilter<A> => {
  const state = scalableState(self)
  for (const value of values) {
    const [hash1, hash2] = hashPair(value)
    addScalableMutable(state, hash1, hash2)
  }
  ;(self as any).slices = state.slices.length
  return self
}

/** @internal */
export const hasMutableScalableBloomFilter = <A>(
  self: MutableScalableBloomFilter<A>,
  value: A
): boolean => {
  const state = scalableState(self)
  const [hash1, hash2] = hashPair(value)
  for (const slice of state.slices) {
    if (sliceHas(slice, hash1, hash2)) {
      return true
    }
  }
  return false
}

/** @internal */
export const clearMutableScalableBloomFilter = <A>(
  self: MutableScalableBloomFilter<A>
): MutableScalableBloomFilter<A> => {
  const state = scalableState(self)
  const first = makeSlice(0, state)
  state.slices.length = 0
  state.slices.push(first)
  ;(self as any).slices = 1
  return self
}

/** @internal */
export const cloneMutableScalableBloomFilter = <A>(
  self: MutableScalableBloomFilter<A>
): MutableScalableBloomFilter<A> => {
  const state = scalableState(self)
  const slices = state.slices.map((slice) => ({ ...slice, words: slice.words.slice() }))
  return createScalableObject({ ...state, slices }, true)
}

/** @internal */
export const isEmptyMutableScalableBloomFilter = <A>(
  self: MutableScalableBloomFilter<A>
): boolean => scalableState(self).slices.every((slice) => slice.setBits === 0)

/** @internal */
export const saturationMutableScalableBloomFilter = <A>(
  self: MutableScalableBloomFilter<A>
): number => scalableSaturation(scalableState(self))

/** @internal */
export const estimatedFalsePositiveRateMutableScalableBloomFilter = <A>(
  self: MutableScalableBloomFilter<A>
): number => scalableFalsePositiveRate(scalableState(self))

/** @internal */
export const toBytesMutableScalableBloomFilter = <A>(
  self: MutableScalableBloomFilter<A>
): Uint8Array<ArrayBuffer> => encodeScalable(scalableState(self))

/** @internal */
export const fromBytesMutableScalableBloomFilter = <A>(
  bytes: Uint8Array
): MutableScalableBloomFilter<A> => createScalableObject(decodeScalable(bytes), true)
