// Shared state and helpers for `Equal.ts` and `Hash.ts`.

// JavaScriptCore (Bun, Safari) stamps the construction site onto every Error as
// non-enumerable own properties. Like `stack`, they describe where the error was
// created, not what it is.
const errorSiteKeys = ["line", "column", "sourceURL", "originalLine", "originalColumn"]

const ownKeys = (obj: object): Array<PropertyKey> => {
  const names = Object.getOwnPropertyNames(obj)
  const syms = Object.getOwnPropertySymbols(obj)
  return syms.length > 0 ? [...names, ...syms] : names
}

/** @internal */
export const getAllObjectKeys = (obj: object): Array<PropertyKey> | Set<PropertyKey> => {
  const own = ownKeys(obj)
  const proto = Object.getPrototypeOf(obj)
  if (proto === Object.prototype || proto === null) return own
  const keys = new Set<PropertyKey>(own)

  if (obj instanceof Error) {
    keys.delete("stack")
    for (const key of errorSiteKeys) {
      if (!Object.prototype.propertyIsEnumerable.call(obj, key)) keys.delete(key)
    }
  }

  let current = proto
  while (current !== null && current !== Object.prototype) {
    for (const key of ownKeys(current)) keys.add(key)
    current = Object.getPrototypeOf(current)
  }
  if (typeof obj.constructor === "function" && proto === obj.constructor.prototype) {
    keys.delete("constructor")
  }

  return keys
}

/** @internal */
export const byReferenceInstances = new WeakSet<object>()

/** @internal */
export const objectKind = (u: object): number =>
  Array.isArray(u) ?
    5 :
    ArrayBuffer.isView(u) ?
    (u instanceof DataView ? 7 : 6) :
    Object.getPrototypeOf(u) === Object.prototype ?
    0 :
    u instanceof Date ?
    1 :
    u instanceof RegExp ?
    2 :
    u instanceof Map ?
    3 :
    u instanceof Set ?
    4 :
    u instanceof ArrayBuffer ?
    8 :
    typeof SharedArrayBuffer !== "undefined" && u instanceof SharedArrayBuffer ?
    9 :
    0

/**
 * Returns `undefined` for detached buffers, which can no longer be read.
 *
 * @internal
 */
export const toBytes = (u: ArrayBufferLike | DataView, kind: number): Uint8Array | undefined => {
  try {
    return kind === 7 ?
      new Uint8Array((u as DataView).buffer, (u as DataView).byteOffset, (u as DataView).byteLength) :
      new Uint8Array(u as ArrayBufferLike)
  } catch {
    return undefined
  }
}

/**
 * Back-edge count used to avoid caching entry-point-dependent hashes and
 * comparisons.
 *
 * @internal
 */
export let backEdges = 0

/** @internal */
export const addBackEdge = (): void => {
  backEdges++
}

/** @internal */
export const hashCache = new WeakMap<object, number>()

// 32-bit MurmurHash3 finalizer.
/** @internal */
export const mix = (h: number): number => {
  h ^= h >>> 16
  h = Math.imul(h, 0x85ebca6b)
  h ^= h >>> 13
  h = Math.imul(h, 0xc2b2ae35)
  return h ^ (h >>> 16)
}

/**
 * Data-first `Hash.combine` used by `Hash.ts` and runtime data types so
 * hashing does not pull in `Function.dual`.
 *
 * @internal
 */
export const combine = (self: number, b: number): number => mix(Math.imul(self, 0x9e3779b1) + Math.imul(b, 0x85ebca6b))
