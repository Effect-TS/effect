/**
 * Computes Effect hash values and defines the interface for objects that want
 * to provide their own hash implementation. Hashes are small numeric
 * fingerprints used by Effect data structures to bucket values quickly; they
 * are not cryptographic digests and they are not proof that two values are
 * equal. The module also includes helpers for primitive, structure, array, and
 * reference-based hashes, plus functions for combining and optimizing numeric
 * hash values.
 *
 * @since 2.0.0
 */
import { dual } from "./Function.ts"
import { byReferenceInstances, prototypeLayout } from "./internal/equal.ts"
import {
  combineOrdered,
  elementTerm,
  entryTerm,
  finishOrdered,
  mix,
  optimize as optimizeInternal,
  scramble,
  tag
} from "./internal/hash.ts"
import { hasProperty } from "./Predicate.ts"

/**
 * Defines the unique identifier used to identify objects that implement the Hash interface.
 *
 * **When to use**
 *
 * Use as the computed property key for the method that supplies a custom hash
 * value on a `Hash` implementor.
 *
 * @see {@link Hash} for the interface implemented with this symbol
 * @see {@link isHash} for checking whether a value implements `Hash`
 * @see {@link hash} for computing hash values
 *
 * @category symbols
 * @since 2.0.0
 */
export const symbol = "~effect/Hash"

/**
 * A type that represents an object that can be hashed.
 *
 * **When to use**
 *
 * Use to let a custom type provide its own stable hash value.
 *
 * **Details**
 *
 * Objects implementing this interface provide a method to compute their hash value,
 * which is used for efficient comparison and storage operations.
 *
 * **Example** (Implementing Hash)
 *
 * ```ts import.meta.vitest
 * import { Hash } from "effect"
 *
 * class MyClass implements Hash.Hash {
 *   constructor(private value: number) {}
 *
 *   [Hash.symbol](): number {
 *     return Hash.hash(this.value)
 *   }
 * }
 *
 * new MyClass(42)[Hash.symbol]() // => 42
 * ```
 *
 * @category models
 * @since 2.0.0
 */
export interface Hash {
  [symbol](): number
}

/**
 * Computes a hash value for any given value.
 *
 * **When to use**
 *
 * Use to compute an Effect hash for primitives, collections, and hashable
 * objects.
 *
 * **Details**
 *
 * This function can hash primitives (numbers, strings, booleans, etc.) as well as
 * objects, arrays, and other complex data structures. It automatically handles
 * different types and provides a consistent hash value for equivalent inputs.
 *
 * **Gotchas**
 *
 * Objects being hashed must be treated as immutable after their first hash
 * computation. Hash results are cached, so mutating an object after hashing will
 * lead to stale cached values and broken hash-based operations. For mutable
 * objects, implement a custom `Hash` interface that hashes the object reference
 * rather than its content.
 *
 * Class instances without their own `Hash` implementation (for example
 * `Data.Class` and `Schema.Class` instances) are hashed structurally, including
 * the members of their prototype chain below `Object.prototype`. That chain is
 * read once per prototype, so members added, removed or redefined on it after
 * such instances have been hashed are not reflected. Values implementing `Hash`,
 * plain objects, arrays and other built-ins are not affected.
 *
 * Prototype members that hold functions or objects (such as methods) contribute
 * through their key only, so structural hashes do not depend on function
 * identity and are stable across processes.
 *
 * **Example** (Hashing different values)
 *
 * ```ts import.meta.vitest
 * import { Hash } from "effect"
 *
 * Hash.hash(42) === Hash.hash(42) // => true
 * Hash.hash("hello") === Hash.hash("hello") // => true
 * Hash.hash([1, 2, 3]) === Hash.hash([1, 2, 3]) // => true
 * ```
 *
 * @category hashing
 * @since 2.0.0
 */
export const hash: <A>(self: A) => number = <A>(self: A) => {
  switch (typeof self) {
    case "number":
      return number(self)
    case "bigint":
      return string(self.toString(10))
    case "string":
      return string(self)
    case "undefined":
      return undefinedHash
    case "boolean":
      return self ? trueHash : falseHash
    case "function":
    case "object": {
      if (self === null) {
        return nullHash
      }
      const cached = hashCache.get(self)
      if (cached !== undefined) {
        return cached
      }
      if (byReferenceInstances.has(self)) {
        return random(self)
      }
      const cycles = cyclesDetected
      let h: number
      if (isHash(self)) {
        h = tracked(self, true)
      } else if (typeof self === "function") {
        h = random(self)
      } else if (self instanceof Date) {
        // Recomputing costs about as much as a cache lookup and far less than
        // a cache write, so dates are not cached.
        const time = self.getTime()
        return time !== time ? invalidDateHash : number(time)
      } else if (self instanceof RegExp) {
        // Equal compares `/source/flags`; hash the parts without concatenating.
        h = optimize(entryTerm(string(self.source), string(self.flags)))
      } else {
        h = lazilyTracked(self)
        if (h !== h) {
          h = tracked(self, false)
        }
      }
      if (cyclesDetected !== cycles) {
        // A hash computed across a cycle depends on where the traversal
        // started, so it is never cached. Each request then recomputes from its
        // own root, making the result independent of what was hashed before.
        return h
      }
      hashCache.set(self, h)
      return h
    }
    default:
      // The remaining primitive type is symbol.
      return symbolHash(self as symbol)
  }
}

/**
 * Generates a random hash value for an object and caches it.
 *
 * **When to use**
 *
 * Use to hash an object by reference identity instead of structural content.
 *
 * **Details**
 *
 * This function creates a random hash value for objects that don't have their own
 * hash implementation. The hash value is cached using a WeakMap, so the same object
 * will always return the same hash value during its lifetime.
 *
 * **Example** (Hashing objects by reference)
 *
 * ```ts import.meta.vitest
 * import { Hash } from "effect"
 *
 * const obj1 = { a: 1 }
 * const obj2 = { a: 1 }
 *
 * Hash.random(obj1) === Hash.random(obj1) // => true
 *
 * typeof Hash.random(obj2) // => "number"
 * ```
 *
 * @category hashing
 * @since 2.0.0
 */
export const random: <A extends object>(self: A) => number = (self) => {
  if (!randomHashCache.has(self)) {
    randomHashCache.set(self, number(Math.floor(Math.random() * Number.MAX_SAFE_INTEGER)))
  }
  return randomHashCache.get(self)!
}

/**
 * Combines two hash values into a single hash value.
 *
 * **When to use**
 *
 * Use to build a hash for a composite value by folding together hash values for
 * its parts.
 *
 * **Details**
 *
 * Supports both direct and pipeable usage. The combination is non-linear and
 * sensitive to argument order, so folding several hashes through `combine`
 * does not let differences between parts cancel out.
 *
 * **Example** (Combining hash values)
 *
 * ```ts import.meta.vitest
 * import { Hash, pipe } from "effect"
 *
 * const hash1 = Hash.hash("hello")
 * const hash2 = Hash.hash("world")
 *
 * const combined = Hash.combine(hash2)(hash1)
 * combined === pipe(hash1, Hash.combine(hash2)) // => true
 * ```
 *
 * @see {@link hash} for computing hash values from arbitrary inputs
 * @see {@link structureKeys} for hashing selected object fields without manual combination
 *
 * @category hashing
 * @since 2.0.0
 */
export const combine: {
  (b: number): (self: number) => number
  (self: number, b: number): number
} = dual(2, (self: number, b: number): number => optimize(mix(self ^ scramble(b))))

/**
 * Applies bit manipulation techniques to optimize a hash value.
 *
 * **When to use**
 *
 * Use to improve the bit distribution of a raw numeric hash value.
 *
 * **Details**
 *
 * This function takes a hash value and applies bitwise operations to improve
 * the distribution of hash values, reducing the likelihood of collisions.
 *
 * **Example** (Optimizing a hash value)
 *
 * ```ts import.meta.vitest
 * import { Hash } from "effect"
 *
 * Hash.optimize(1234567890) // => 160826066
 * ```
 *
 * @category hashing
 * @since 2.0.0
 */
export const optimize: (n: number) => number = optimizeInternal

/**
 * Checks whether a value implements the Hash interface.
 *
 * **When to use**
 *
 * Use to detect whether an unknown value provides a custom hash implementation.
 *
 * **Details**
 *
 * This function determines whether a given value has the Hash symbol property,
 * indicating that it can provide its own hash value implementation.
 *
 * **Example** (Checking for Hash support)
 *
 * ```ts import.meta.vitest
 * import { Hash } from "effect"
 *
 * class MyHashable implements Hash.Hash {
 *   [Hash.symbol]() {
 *     return 42
 *   }
 * }
 *
 * Hash.isHash(new MyHashable()) // => true
 * Hash.isHash({}) // => false
 * Hash.isHash("string") // => false
 * ```
 *
 * @category guards
 * @since 2.0.0
 */
export const isHash = (u: unknown): u is Hash => hasProperty(u, symbol)

/**
 * Computes a hash value for a number.
 *
 * **When to use**
 *
 * Use to hash a JavaScript number with Effect's numeric hash semantics.
 *
 * **Details**
 *
 * This function creates a hash value for numeric inputs, handling special cases
 * like NaN, Infinity, and -Infinity with distinct hash values. It uses bitwise operations to ensure good distribution
 * of hash values across different numeric inputs.
 *
 * **Example** (Hashing numbers)
 *
 * ```ts import.meta.vitest
 * import { Hash } from "effect"
 *
 * Number.isInteger(Hash.number(42)) // => true
 * Number.isInteger(Hash.number(3.14)) // => true
 * Hash.number(NaN) === Hash.number(NaN) // => true
 * Hash.number(Infinity) === Hash.number(Infinity) // => true
 * Hash.number(100) === Hash.number(100) // => true
 * ```
 *
 * @category hashing
 * @since 2.0.0
 */
export const number = (n: number) => {
  const h = n | 0
  // Integers in the 32-bit range are their own hash; `-0` maps to `0`.
  // (`NaN | 0` is `0`, so NaN never takes this path.)
  if (h === n) {
    return optimize(h)
  }
  if (n !== n) {
    return nanHash
  }
  if (n === Infinity || n === -Infinity) {
    return n > 0 ? infinityHash : negativeInfinityHash
  }
  // Fractions and integers beyond 32 bits: hash the IEEE-754 bits, which
  // identify the value exactly, mixed down to the hash width.
  float64[0] = n
  return optimize(mix(float64Words[0] ^ float64Words[1]))
}

/**
 * Computes a hash value for a string using the djb2 algorithm.
 *
 * **When to use**
 *
 * Use when you need a string field to contribute to a custom structural hash
 * implementation.
 *
 * **Details**
 *
 * This function implements a variation of the djb2 hash algorithm, which is
 * known for its good distribution properties and speed. It processes each
 * character of the string to produce a consistent hash value.
 *
 * **Example** (Hashing strings)
 *
 * ```ts import.meta.vitest
 * import { Hash } from "effect"
 *
 * Hash.string("hello") // => 181380007
 * Hash.string("world") // => 164394279
 * Hash.string("") // => 5381
 * Hash.string("test") === Hash.string("test") // => true
 * ```
 *
 * @category hashing
 * @since 2.0.0
 */
export const string = (str: string) => {
  let h = 5381, i = str.length
  while (i) {
    h = (h * 33) ^ str.charCodeAt(--i)
  }
  return optimize(h)
}

/**
 * Computes a hash value for an object using only the specified keys.
 *
 * **When to use**
 *
 * Use to hash an object by a selected set of property keys.
 *
 * **Details**
 *
 * This function allows you to hash an object by considering only specific keys,
 * which is useful when you want to create a hash based on a subset of an object's
 * properties.
 *
 * **Example** (Hashing selected object keys)
 *
 * ```ts import.meta.vitest
 * import { Hash } from "effect"
 *
 * const person = { name: "John", age: 30, city: "New York" }
 *
 * const hash1 = Hash.structureKeys(person, ["name", "age"])
 * const hash2 = Hash.structureKeys(person, ["name", "city"])
 *
 * hash1 // => 503991967
 * hash2 // => 761742579
 *
 * const person2 = { name: "John", age: 30, city: "Boston" }
 * const hash3 = Hash.structureKeys(person2, ["name", "age"])
 * hash1 === hash3 // => true
 * ```
 *
 * @category hashing
 * @since 2.0.0
 */
export const structureKeys = (o: object, keys: Iterable<PropertyKey>) => {
  let h = 12289
  for (const key of keys) {
    h ^= entryTerm(hash(key), hash((o as any)[key]))
  }
  return optimize(h)
}

/**
 * Computes a structural hash for an object using Effect's object key collection.
 *
 * **When to use**
 *
 * Use to hash an object from all structural keys collected by Effect.
 *
 * **Details**
 *
 * The hash is based on the object's structural keys and their values, including
 * symbol keys and relevant prototype keys for non-plain objects.
 *
 * **Example** (Hashing object structures)
 *
 * ```ts import.meta.vitest
 * import { Hash } from "effect"
 *
 * const obj1 = { name: "John", age: 30 }
 * const obj2 = { name: "Jane", age: 25 }
 * const obj3 = { name: "John", age: 30 }
 *
 * Hash.structure(obj1) // => 503991967
 * Hash.structure(obj2) // => -764438887
 * Hash.structure(obj3) // => 503991967
 * Hash.structure(obj1) === Hash.structure(obj3) // => true
 * ```
 *
 * @category hashing
 * @since 2.0.0
 */
export const structure = <A extends object>(o: A): number => isPlain(o) ? hashPlainObject(o) : fusedStructure(o)

/**
 * Computes a hash value for an iterable by hashing all of its elements.
 *
 * **When to use**
 *
 * Use to hash the values yielded by an iterable with Effect hash semantics.
 *
 * **Details**
 *
 * Element hashes are folded in order, so reordering or repeating elements
 * changes the hash.
 *
 * **Gotchas**
 *
 * A hash is not an equality proof: distinct inputs can still collide.
 *
 * **Example** (Hashing arrays)
 *
 * ```ts import.meta.vitest
 * import { Hash } from "effect"
 *
 * const arr1 = [1, 2, 3]
 * const arr2 = [1, 2, 3]
 * const arr3 = [3, 2, 1]
 *
 * Hash.array(arr1) // => -713336228
 * Hash.array(arr2) // => -713336228
 * Hash.array(arr3) // => 859902775
 * Hash.array(arr1) === Hash.array(arr2) // => true
 * Hash.array(arr1) === Hash.array(arr3) // => false
 * ```
 *
 * @see {@link hash} for the general-purpose hash dispatcher
 *
 * @category hashing
 * @since 2.0.0
 */
export const array: <A>(arr: Iterable<A>) => number = (arr) => {
  let h = arraySeed
  let length = 0
  for (const element of arr) {
    h = combineOrdered(h, hash(element))
    length++
  }
  return finishOrdered(h, length)
}

const arraySeed = 6151
const mapSeed = tag(8)
const setSeed = tag(9)

const float64 = new Float64Array(1)
const float64Words = new Int32Array(float64.buffer)

// Reads bytes in place instead of allocating a `Uint8Array` view.
const dataView = (view: DataView): number => {
  let h = arraySeed
  for (let i = 0; i < view.byteLength; i++) {
    h = combineOrdered(h, view.getUint8(i))
  }
  return finishOrdered(h, view.byteLength)
}

// `forEach` passes keys and values as arguments, so no entry tuple is
// allocated per element.
const hashMap = (map: Map<unknown, unknown>): number => {
  let h = mapSeed
  map.forEach((value, key) => {
    h ^= entryTerm(hash(key), hash(value))
  })
  return optimize(h)
}

const hashSet = (set: Set<unknown>): number => {
  let h = setSeed
  set.forEach((value) => {
    h ^= elementTerm(hash(value))
  })
  return optimize(h)
}

const hasOwn = Object.prototype.hasOwnProperty

// Property keys behave like field indices: every instance of a class shares the
// same names. Per prototype, the deduplicated prototype-chain keys and their
// hashes are computed once, and own field-name hashes are memoized, so
// structural hashing neither re-runs the string hasher per field nor re-walks
// the chain. Entries are held weakly by the prototype and die with the class.
//
// Prototype data members resolve to the same value for every instance, so their
// combined contribution is a constant of the shape, folded once. An instance
// that shadows such a key XORs its contribution back out. Members holding
// functions or objects (methods, variance markers) contribute through their key
// alone; primitives also contribute their value. Equal objects share keys and
// equal values, so dropping information only adds collisions, and it keeps
// shape constants free of identity hashes, which are random per process.
// Accessors read instance state and stay per instance, as do `constructor` and
// `stack`, whose inclusion depends on the instance.
// A prototype chain is assumed unchanged once instances with it have been hashed.
interface Shape {
  readonly constant: number
  readonly constantByKey: Map<PropertyKey, number>
  readonly dynamicKeys: ReadonlyArray<PropertyKey>
  readonly dynamicKeyHashes: ReadonlyArray<number>
  readonly ownKeyHashes: Map<string, number>
}

const shapeCache = new WeakMap<object, Shape>()
// Bounds own-key memoization for classes whose instances carry dynamic keys.
const ownKeyHashesLimit = 256

const shapeOf = (proto: object): Shape => {
  let shape = shapeCache.get(proto)
  if (shape === undefined) {
    const layout = prototypeLayout(proto)
    let constant = 0
    const constantByKey = new Map<PropertyKey, number>()
    const dynamicKeys: Array<PropertyKey> = []
    const dynamicKeyHashes: Array<number> = []
    for (let i = 0; i < layout.keys.length; i++) {
      const key = layout.keys[i]
      if (layout.constant[i]) {
        const value = layout.values[i]
        const contribution = entryTerm(
          hash(key),
          typeof value === "function" || (typeof value === "object" && value !== null) ? protoMemberHash : hash(value)
        )
        constant ^= contribution
        constantByKey.set(key, contribution)
      } else {
        dynamicKeys.push(key)
        dynamicKeyHashes.push(hash(key))
      }
    }
    shape = { constant, constantByKey, dynamicKeys, dynamicKeyHashes, ownKeyHashes: new Map<string, number>() }
    shapeCache.set(proto, shape)
  }
  return shape
}

// Only string keys are memoized: field names are literals the class already
// holds, while symbols may be collectable and must not be retained here.
const ownKeyHash = (shape: Shape, key: PropertyKey): number => {
  if (typeof key !== "string") return hash(key)
  let h = shape.ownKeyHashes.get(key)
  if (h === undefined) {
    h = hash(key)
    if (shape.ownKeyHashes.size < ownKeyHashesLimit) shape.ownKeyHashes.set(key, h)
  }
  return h
}

// Folds over the keys `getAllObjectKeys` would collect, without materializing
// them in a `Set`.
const fusedStructure = (o: object): number => {
  const own = Reflect.ownKeys(o)
  let h = 12289
  const ctor = o.constructor
  const proto = Object.getPrototypeOf(o)
  const shape = shapeOf(proto)
  const skipStack = o instanceof Error
  const skipConstructor = typeof ctor === "function" && proto === ctor.prototype
  const constantByKey = shape.constantByKey
  h ^= shape.constant
  for (let i = 0; i < own.length; i++) {
    const key = own[i]
    if ((skipStack && key === "stack") || (skipConstructor && key === "constructor")) continue
    if (constantByKey.size > 0) {
      const shadowed = constantByKey.get(key)
      if (shadowed !== undefined) h ^= shadowed
    }
    h ^= entryTerm(ownKeyHash(shape, key), hash((o as any)[key]))
  }
  const dynamicKeys = shape.dynamicKeys
  for (let i = 0; i < dynamicKeys.length; i++) {
    const key = dynamicKeys[i]
    // Like `getAllObjectKeys`, `stack` is only excluded as an own key: when a
    // prototype also declares it, it is collected again, reading `o.stack`.
    if (skipConstructor && key === "constructor") continue
    if (hasOwn.call(o, key) && !(skipStack && key === "stack")) continue
    h ^= entryTerm(shape.dynamicKeyHashes[i], hash((o as any)[key]))
  }
  return optimize(h)
}

const nullHash = tag(1)
const undefinedHash = tag(2)
const trueHash = tag(3)
const falseHash = tag(4)
const invalidDateHash = tag(5)
const circularHash = tag(6)
const protoMemberHash = tag(7)
const nanHash = tag(10)
const infinityHash = tag(11)
const negativeInfinityHash = tag(12)
const symbolSeed = tag(14)

const randomHashCache = new WeakMap<any, number>()
const hashCache = new WeakMap<object, number>()

// Symbols compare by identity; the description (the key, for registered
// symbols) is a stable stand-in, and distinct symbols sharing it merely collide.
const symbolHash = (sym: symbol): number => optimize(entryTerm(symbolSeed, string(sym.description ?? "")))

const visitedObjects = new WeakSet<object>()

// Incremented whenever a traversal reaches an object already on its stack.
let cyclesDetected = 0

// Hashes an object that may recurse into its contents, tracking the traversal
// stack for cycle detection. A plain function rather than a callback wrapper,
// so no closure is allocated per hash.
function tracked(obj: object, custom: boolean): number {
  if (visitedObjects.has(obj)) {
    cyclesDetected++
    return circularHash
  }
  visitedObjects.add(obj)
  // `finally`, so a throwing custom hash cannot leave `obj` marked as visited.
  try {
    return custom ? (obj as Hash)[symbol]() : structural(obj)
  } finally {
    visitedObjects.delete(obj)
  }
}

// Arrays and plain objects join the cycle-tracking set lazily, only when they
// first meet an object member (just before recursing). Members hashed before
// that point cannot re-enter the container, so this is exact, and containers
// of primitives never pay for tracking. Returns `NaN` (never a valid hash) for
// other objects, which take the eagerly tracked path.
const lazilyTracked = (self: object): number => {
  if (Array.isArray(self)) {
    return hashArray(self)
  }
  if (ArrayBuffer.isView(self)) {
    // Elements of typed arrays and bytes of data views are always primitives.
    return self instanceof DataView ? dataView(self) : hashArray(self as unknown as ArrayLike<unknown>)
  }
  return isPlain(self) ? hashPlainObject(self) : NaN
}

const isObjectLike = (value: unknown): boolean => {
  const type = typeof value
  return (type === "object" && value !== null) || type === "function"
}

const hashArray = (self: ArrayLike<unknown>): number => {
  if (visitedObjects.has(self)) {
    cyclesDetected++
    return circularHash
  }
  let h = arraySeed
  let tracking = false
  try {
    for (let i = 0; i < self.length; i++) {
      const element = self[i]
      if (!tracking && isObjectLike(element)) {
        visitedObjects.add(self)
        tracking = true
      }
      h = combineOrdered(h, hash(element))
    }
  } finally {
    if (tracking) visitedObjects.delete(self)
  }
  return finishOrdered(h, self.length)
}

// Objects whose structural keys are exactly their own keys, as in
// `getAllObjectKeys`: those whose constructor is `Object`, and those whose
// prototype is `Object.prototype` or `null` (no prototype keys to add).
const isPlain = (self: object): boolean => {
  if ((self as any).constructor === Object) return true
  const proto = Object.getPrototypeOf(self)
  return proto === Object.prototype || proto === null
}

const hashPlainObject = (self: object): number => {
  if (visitedObjects.has(self)) {
    cyclesDetected++
    return circularHash
  }
  const keys = Reflect.ownKeys(self)
  // `getAllObjectKeys` drops `constructor` when it is a class constructor
  // whose prototype is the object's prototype.
  const ctor = (self as any).constructor
  const skip = ctor !== Object && typeof ctor === "function" && ctor.prototype === Object.getPrototypeOf(self)
    ? "constructor"
    : undefined
  let h = 12289
  let tracking = false
  try {
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i]
      if (key === skip) continue
      const value = (self as any)[key]
      if (!tracking && isObjectLike(value)) {
        visitedObjects.add(self)
        tracking = true
      }
      h ^= entryTerm(hash(key), hash(value))
    }
  } finally {
    if (tracking) visitedObjects.delete(self)
  }
  return optimize(h)
}

// Objects not handled by `lazilyTracked`: maps, sets and class instances.
const structural = (self: object): number => {
  if (self instanceof Map) {
    return hashMap(self)
  } else if (self instanceof Set) {
    return hashSet(self)
  }
  return fusedStructure(self)
}
