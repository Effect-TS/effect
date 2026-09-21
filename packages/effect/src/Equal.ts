/**
 * Compares values with Effect's structural equality rules.
 *
 * `equals` compares primitives, arrays, plain objects, maps, sets, dates,
 * regular expressions, and values that implement the `Equal` interface. This
 * module also defines the equality symbol, guards, adapters, map and set
 * comparison builders, and helpers for marking objects that should compare only
 * by reference.
 *
 * @since 2.0.0
 */
import type { Equivalence } from "./Equivalence.ts"
import * as Hash from "./Hash.ts"
import { byReferenceInstances, getAllObjectKeys, prototypeLayout } from "./internal/equal.ts"
import { hasProperty } from "./Predicate.ts"

/**
 * Defines the unique string identifier for the `Equal` interface.
 *
 * **When to use**
 *
 * Use when you implement custom equality and need the computed property key for
 * the equality method.
 *
 * **Details**
 *
 * This is a pure constant with no allocation or side effects.
 *
 * **Example** (Implementing Equal on a class)
 *
 * ```ts import.meta.vitest
 * import { Equal, Hash } from "effect"
 *
 * class UserId implements Equal.Equal {
 *   constructor(readonly id: string) {}
 *
 *   [Equal.symbol](that: Equal.Equal): boolean {
 *     return that instanceof UserId && this.id === that.id
 *   }
 *
 *   [Hash.symbol](): number {
 *     return Hash.string(this.id)
 *   }
 * }
 *
 * Equal.equals(new UserId("1"), new UserId("1")) // => true
 * Equal.equals(new UserId("1"), new UserId("2")) // => false
 * ```
 *
 * @see {@link Equal} — the interface that uses this symbol
 * @see {@link isEqual} — type guard for `Equal` implementors
 * @category symbols
 * @since 2.0.0
 */
export const symbol = "~effect/Equal"

/**
 * The interface for types that define their own equality logic.
 *
 * **When to use**
 *
 * Use when you need value-based equality for a class (e.g. domain IDs,
 *   coordinates, money values).
 * - When your type will be stored in `HashMap` or `HashSet`.
 * - When the default structural comparison is too broad or too narrow for
 *   your type.
 *
 * **Details**
 *
 * Any object that implements both `[Equal.symbol]` (equality) and
 * `[Hash.symbol]` (hashing) is recognized by {@link equals} and by hash-based
 * collections such as `HashMap` and `HashSet`.
 *
 * - Extends `Hash.Hash`, so implementors **must** also provide `[Hash.symbol]`.
 * - The hash contract: if `a[Equal.symbol](b)` returns `true`, then
 *   `Hash.hash(a)` must equal `Hash.hash(b)`.
 * - {@link equals} delegates to this method when both operands implement it.
 *   If only one operand implements `Equal`, they are considered unequal.
 *
 * **Example** (Comparing coordinates by value)
 *
 * ```ts import.meta.vitest
 * import { Equal, Hash } from "effect"
 *
 * class Coordinate implements Equal.Equal {
 *   constructor(readonly x: number, readonly y: number) {}
 *
 *   [Equal.symbol](that: Equal.Equal): boolean {
 *     return that instanceof Coordinate &&
 *       this.x === that.x &&
 *       this.y === that.y
 *   }
 *
 *   [Hash.symbol](): number {
 *     return Hash.string(`${this.x},${this.y}`)
 *   }
 * }
 *
 * Equal.equals(new Coordinate(1, 2), new Coordinate(1, 2)) // => true
 * Equal.equals(new Coordinate(1, 2), new Coordinate(3, 4)) // => false
 * ```
 *
 * @see {@link symbol} — the property key used by the equality method
 * @see {@link equals} — the main comparison function
 * @see {@link isEqual} — type guard for `Equal` implementors
 * @category models
 * @since 2.0.0
 */
export interface Equal extends Hash.Hash {
  [symbol](that: Equal): boolean
}

/**
 * Checks whether two values are deeply structurally equal.
 *
 * **When to use**
 *
 * Use when you need Effect's default structural equality check.
 *
 * **Details**
 *
 * Returns a `boolean` and never throws. Primitives are compared by value, and
 * `NaN` equals `NaN`. Objects implementing `Equal` delegate to their
 * `[Equal.symbol]` method; if only one operand implements `Equal`, the result
 * is `false`.
 *
 * Dates compare by ISO string, RegExps compare by string representation,
 * arrays compare element-by-element, Maps and Sets compare entries
 * order-independently, and plain objects compare enumerable keys recursively.
 * Functions without an `Equal` implementation compare by reference. Circular
 * references are handled when both structures are circular at the same depth.
 *
 * Hash values are checked first as a fast-path rejection (hashes of objects are
 * computed once and cached). The function also supports dual data-last usage:
 * call it with one argument to get a curried predicate.
 *
 * **Gotchas**
 *
 * - Values proven equal by a completed comparison are remembered (as
 *   equivalence classes, held weakly), so later comparisons of them, including
 *   ones implied by transitivity, are cheap. **Objects must not be mutated
 *   after they have been compared.** For class instances without their own
 *   `Equal` implementation, this includes their prototype chain below
 *   `Object.prototype`, which is read once per prototype.
 * - Map and Set comparisons match entries by hash, taking expected linear time.
 *
 * **Example** (Comparing values)
 *
 * ```ts import.meta.vitest
 * import { Equal } from "effect"
 *
 * Equal.equals(1, 1) // => true
 * Equal.equals(NaN, NaN) // => true
 * Equal.equals("a", "b") // => false
 *
 * Equal.equals({ a: 1, b: 2 }, { a: 1, b: 2 }) // => true
 * Equal.equals([1, [2, 3]], [1, [2, 3]]) // => true
 *
 * Equal.equals(new Date("2024-01-01"), new Date("2024-01-01")) // => true
 *
 * const m1 = new Map([["a", 1], ["b", 2]])
 * const m2 = new Map([["b", 2], ["a", 1]])
 * Equal.equals(m1, m2) // => true
 *
 * const is5 = Equal.equals(5)
 * is5(5) // => true
 * is5(3) // => false
 * ```
 *
 * @see {@link Equal} — the interface for custom equality
 * @see {@link isEqual} — check whether a value implements `Equal`
 * @see {@link asEquivalence} — wrap `equals` as an `Equivalence`
 * @category equality
 * @since 2.0.0
 */
export function equals<B>(that: B): <A>(self: A) => boolean
export function equals<A, B>(self: A, that: B): boolean
export function equals(): any {
  if (arguments.length === 1) {
    return (self: unknown) => compareBoth(self, arguments[0])
  }
  return compareBoth(arguments[0], arguments[1])
}

function compareBoth(self: unknown, that: unknown): boolean {
  if (self === that) return true
  if (self == null || that == null) return false
  const selfType = typeof self
  if (selfType !== typeof that) {
    return false
  }
  // Special case for NaN: NaN should be considered equal to NaN
  if (selfType === "number" && self !== self && that !== that) {
    return true
  }
  if (selfType !== "object" && selfType !== "function") {
    return false
  }

  if (byReferenceInstances.has(self) || byReferenceInstances.has(that)) {
    return false
  }

  return compareObjects(self, that)
}

const visitedLeft = new WeakSet<object>()
const visitedRight = new WeakSet<object>()

function compareObjects(self: object, that: object): boolean {
  // Hashes are fingerprints: computed once per value and cached, they reject
  // every later unequal partner in O(1), so a value compared many times (for
  // example in pairwise deduplication) is traversed once rather than per pair.
  if (Hash.hash(self) !== Hash.hash(that)) {
    return false
  }
  if (self instanceof Date) {
    if (!(that instanceof Date)) return false
    const selfTime = self.getTime()
    const thatTime = that.getTime()
    return selfTime === thatTime || (Number.isNaN(selfTime) && Number.isNaN(thatTime))
  } else if (self instanceof RegExp) {
    if (!(that instanceof RegExp)) return false
    return self.toString() === that.toString()
  }
  const selfIsEqual = isEqual(self)
  const thatIsEqual = isEqual(that)
  if (selfIsEqual !== thatIsEqual) return false
  const bothEquals = selfIsEqual && thatIsEqual
  if (typeof self === "function" && !bothEquals) {
    return false
  }
  const topLevel = comparisonsInProgress === 0
  if (topLevel && knownEqual(self, that)) {
    return true
  }
  const hasLeft = visitedLeft.has(self)
  const hasRight = visitedRight.has(that)
  if (hasLeft && hasRight) {
    return true // Both are circular at the same level
  }
  if (hasLeft || hasRight) {
    return false // Only one is circular
  }
  visitedLeft.add(self)
  visitedRight.add(that)
  comparisonsInProgress++
  let result: boolean
  // `finally`, so a throwing custom `Equal` cannot leave the pair marked.
  try {
    result = compareStructure(self, that, bothEquals)
  } finally {
    comparisonsInProgress--
    visitedLeft.delete(self)
    visitedRight.delete(that)
  }
  if (topLevel && result) {
    recordEqual(self, that)
  }
  return result
}

// Equivalence classes of values proven equal, kept with union-find (as in
// Hopcroft–Karp equivalence checking), so repeated comparisons of the same
// values, and of values related through transitivity, are answered without
// re-traversing them.
//
// Only top-level `true` results are recorded. Inside a comparison, results can
// depend on the provisional assumption that a pair still being compared is
// equal (how cycles are handled), and that assumption may fail later; once
// the outermost comparison completes with `true`, every such assumption has
// been confirmed. Unequal results are not recorded: known hashes already reject
// most unequal pairs.
//
// Objects map to class tokens through a WeakMap, and tokens only reference
// their parent token, so no object keeps another alive.
interface ClassToken {
  parent: ClassToken | undefined
}

let comparisonsInProgress = 0
const equivalenceClasses = new WeakMap<object, ClassToken>()

function findClass(token: ClassToken): ClassToken {
  while (token.parent !== undefined) {
    // Path halving.
    if (token.parent.parent !== undefined) {
      token.parent = token.parent.parent
    }
    token = token.parent
  }
  return token
}

function knownEqual(self: object, that: object): boolean {
  const selfToken = equivalenceClasses.get(self)
  if (selfToken === undefined) return false
  const thatToken = equivalenceClasses.get(that)
  return thatToken !== undefined && findClass(selfToken) === findClass(thatToken)
}

function recordEqual(self: object, that: object): void {
  const selfToken = equivalenceClasses.get(self)
  const thatToken = equivalenceClasses.get(that)
  if (selfToken === undefined) {
    if (thatToken === undefined) {
      const token: ClassToken = { parent: undefined }
      equivalenceClasses.set(self, token)
      equivalenceClasses.set(that, token)
    } else {
      equivalenceClasses.set(self, findClass(thatToken))
    }
  } else if (thatToken === undefined) {
    equivalenceClasses.set(that, findClass(selfToken))
  } else {
    const selfRoot = findClass(selfToken)
    const thatRoot = findClass(thatToken)
    if (selfRoot !== thatRoot) {
      selfRoot.parent = thatRoot
    }
  }
}

function compareStructure(self: object, that: object, bothEquals: boolean): boolean {
  if (bothEquals) {
    return (self as any)[symbol](that)
  } else if (Array.isArray(self)) {
    if (!Array.isArray(that) || self.length !== that.length) {
      return false
    }
    return compareArrays(self, that)
  } else if (ArrayBuffer.isView(self)) {
    const selfIsDataView = self instanceof DataView
    if (
      !ArrayBuffer.isView(that) ||
      self.byteLength !== that.byteLength ||
      selfIsDataView !== (that instanceof DataView)
    ) {
      return false
    }
    if (selfIsDataView) {
      const thatDataView = that as DataView
      return compareTypedArrays(
        new Uint8Array(self.buffer, self.byteOffset, self.byteLength),
        new Uint8Array(thatDataView.buffer, thatDataView.byteOffset, thatDataView.byteLength)
      )
    }
    return compareTypedArrays(self as Uint8Array, that as Uint8Array)
  } else if (self instanceof Map) {
    if (!(that instanceof Map) || self.size !== that.size) {
      return false
    }
    return compareHashed(self, that, true)
  } else if (self instanceof Set) {
    if (!(that instanceof Set) || self.size !== that.size) {
      return false
    }
    return compareHashed(self, that, false)
  }
  return compareRecords(self as any, that as any)
}

function compareArrays(self: Array<unknown>, that: Array<unknown>): boolean {
  for (let i = 0; i < self.length; i++) {
    if (!compareBoth(self[i], that[i])) {
      return false
    }
  }

  return true
}

function compareTypedArrays(self: Uint8Array, that: Uint8Array): boolean {
  if (self.length !== that.length) {
    return false
  }
  for (let i = 0; i < self.length; i++) {
    if (self[i] !== that[i]) {
      return false
    }
  }
  return true
}

function compareRecords(
  self: Record<PropertyKey, unknown>,
  that: Record<PropertyKey, unknown>
): boolean {
  if (self.constructor === Object && that.constructor === Object) {
    // For plain objects `getAllObjectKeys` is exactly the own keys. Values are
    // compared first, so unequal records return at the first difference; only
    // when every value matches are `that`'s keys counted to rule out extras.
    const selfKeys = Reflect.ownKeys(self)
    for (let i = 0; i < selfKeys.length; i++) {
      const key = selfKeys[i]
      if (!hasOwn.call(that, key) || !compareBoth(self[key], that[key])) {
        return false
      }
    }
    return Reflect.ownKeys(that).length === selfKeys.length
  }
  const proto = Object.getPrototypeOf(self)
  if (
    proto !== null && proto !== Object.prototype && proto === Object.getPrototypeOf(that) &&
    !hasOwn.call(self, "constructor") && !hasOwn.call(that, "constructor")
  ) {
    return compareSamePrototype(self, that, proto)
  }
  const selfKeys = getAllObjectKeys(self)
  const thatKeys = getAllObjectKeys(that)

  if (selfKeys.size !== thatKeys.size) {
    return false
  }

  for (const key of selfKeys) {
    if (!(thatKeys.has(key)) || !compareBoth(self[key], that[key])) {
      return false
    }
  }

  return true
}

/** @internal */
export function makeCompareMap<K, V>(keyEquivalence: Equivalence<K>, valueEquivalence: Equivalence<V>) {
  return function compareMaps(self: Iterable<[K, V]>, that: Iterable<[K, V]>): boolean {
    const thatEntries = Array.from(that)
    for (const [selfKey, selfValue] of self) {
      let found = false
      for (let i = 0; i < thatEntries.length; i++) {
        const [thatKey, thatValue] = thatEntries[i]
        if (keyEquivalence(selfKey, thatKey) && valueEquivalence(selfValue, thatValue)) {
          thatEntries[i] = thatEntries[thatEntries.length - 1]
          thatEntries.pop()
          found = true
          break
        }
      }
      if (!found) {
        return false
      }
    }

    return true
  }
}

/** @internal */
export function makeCompareSet<A>(equivalence: Equivalence<A>) {
  return function compareSets(self: Iterable<A>, that: Iterable<A>): boolean {
    const thatValues = Array.from(that)
    for (const selfValue of self) {
      let found = false
      for (let i = 0; i < thatValues.length; i++) {
        const thatValue = thatValues[i]
        if (equivalence(selfValue, thatValue)) {
          thatValues[i] = thatValues[thatValues.length - 1]
          thatValues.pop()
          found = true
          break
        }
      }
      if (!found) {
        return false
      }
    }

    return true
  }
}

const hasOwn = Object.prototype.hasOwnProperty

// Own keys as `getAllObjectKeys` counts them: an Error's own `stack` excluded.
const isOwnKey = (o: object, key: PropertyKey, skipStack: boolean): boolean =>
  hasOwn.call(o, key) && !(skipStack && key === "stack")

// Instances sharing a prototype share every key it contributes, and its data
// members are the same values for both, so only own keys and accessors need
// comparing. Follows `getAllObjectKeys`: an Error's own `stack` is excluded
// (a prototype-declared `stack` is compared by reading it), and `constructor`
// is excluded when it is the class constructor. Callers exclude instances with
// an own `constructor`.
function compareSamePrototype(
  self: Record<PropertyKey, unknown>,
  that: Record<PropertyKey, unknown>,
  proto: object
): boolean {
  const layout = prototypeLayout(proto)
  const skipStack = self instanceof Error
  const ctor = self.constructor
  const skipConstructor = typeof ctor === "function" && proto === ctor.prototype
  const selfKeys = Reflect.ownKeys(self)
  let selfExtra = 0
  for (let i = 0; i < selfKeys.length; i++) {
    const key = selfKeys[i]
    if (skipStack && key === "stack") continue
    if (!layout.keySet.has(key)) {
      selfExtra++
      if (!isOwnKey(that, key, skipStack)) return false
    }
    if (!compareBoth(self[key], that[key])) return false
  }
  const thatKeys = Reflect.ownKeys(that)
  let thatExtra = 0
  for (let i = 0; i < thatKeys.length; i++) {
    const key = thatKeys[i]
    if (skipStack && key === "stack") continue
    if (!layout.keySet.has(key)) {
      thatExtra++
    } else if (!isOwnKey(self, key, skipStack) && !compareBoth(self[key], that[key])) {
      return false
    }
  }
  if (selfExtra !== thatExtra) return false
  const keys = layout.keys
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i]
    // Data members own on neither side are identical; own ones were compared.
    if (layout.constant[i] || isOwnKey(self, key, skipStack) || isOwnKey(that, key, skipStack)) continue
    if (skipConstructor && key === "constructor") continue
    if (!compareBoth(self[key], that[key])) return false
  }
  return true
}

// Multiset matching grouped by hash: an element can only match within its own
// hash group (equal values have equal hashes), so matching is O(n) expected
// instead of O(n²), over exactly the pairs the quadratic scan would consider.
// Maps match entries (key and value) grouped by key hash; sets match values.
function compareHashed(self: Iterable<any>, that: Iterable<any>, isMap: boolean): boolean {
  const groups = new Map<number, Array<any>>()
  for (const item of that) {
    const h = Hash.hash(isMap ? item[0] : item)
    const group = groups.get(h)
    if (group === undefined) groups.set(h, [item])
    else group.push(item)
  }
  outer: for (const item of self) {
    const group = groups.get(Hash.hash(isMap ? item[0] : item))
    if (group !== undefined) {
      for (let i = 0; i < group.length; i++) {
        const other = group[i]
        if (isMap ? compareBoth(item[0], other[0]) && compareBoth(item[1], other[1]) : compareBoth(item, other)) {
          // Swap-remove, like the quadratic scan.
          group[i] = group[group.length - 1]
          group.pop()
          continue outer
        }
      }
    }
    return false
  }
  return true
}

/**
 * Checks whether a value implements the {@link Equal} interface.
 *
 * **When to use**
 *
 * Use when you need generic utility code to distinguish `Equal` implementors
 * from plain values before calling `[Equal.symbol]` directly.
 *
 * **Details**
 *
 * - Pure function, no side effects.
 * - Returns `true` if and only if `u` has a property keyed by
 *   {@link symbol}.
 * - Acts as a TypeScript type guard, narrowing the input to {@link Equal}.
 *
 * **Example** (Checking Equal values)
 *
 * ```ts import.meta.vitest
 * import { Equal, Hash } from "effect"
 *
 * class Token implements Equal.Equal {
 *   constructor(readonly value: string) {}
 *   [Equal.symbol](that: Equal.Equal): boolean {
 *     return that instanceof Token && this.value === that.value
 *   }
 *   [Hash.symbol](): number {
 *     return Hash.string(this.value)
 *   }
 * }
 *
 * Equal.isEqual(new Token("abc")) // => true
 * Equal.isEqual({ x: 1 }) // => false
 * Equal.isEqual(42) // => false
 * ```
 *
 * @see {@link Equal} — the interface being checked
 * @see {@link symbol} — the property key that signals `Equal` support
 * @category guards
 * @since 2.0.0
 */
export const isEqual = (u: unknown): u is Equal => hasProperty(u, symbol)

/**
 * Wraps {@link equals} as an `Equivalence<A>`.
 *
 * **When to use**
 *
 * Use when you want to pass `Equal.equals` to APIs that require an
 * `Equivalence`.
 *
 * **Details**
 *
 * - Returns a function `(a: A, b: A) => boolean` that delegates to
 *   {@link equals}.
 * - Pure; allocates a thin wrapper on each call.
 *
 * **Example** (Deduplicating with Equal semantics)
 *
 * ```ts import.meta.vitest
 * import { Array, Equal } from "effect"
 *
 * Array.dedupeWith([1, 2, 2, 3, 1], Equal.asEquivalence<number>()) // => [1, 2, 3]
 * ```
 *
 * @see {@link equals} — the underlying comparison function
 * @category instances
 * @since 4.0.0
 */
export const asEquivalence: <A>() => Equivalence<A> = () => equals

/**
 * Creates a proxy that uses reference equality instead of structural equality.
 *
 * **When to use**
 *
 * Use when you need to compare a plain object or array by identity without
 * mutating the original value.
 *
 * **Details**
 *
 * - Returns a `Proxy` wrapping `obj`. The proxy reads through to the
 *   original, so property access is unchanged.
 * - The proxy is registered in an internal WeakSet; {@link equals} returns
 *   `false` for any pair where at least one operand is in that set (unless
 *   they are the same reference).
 * - Each call creates a **new** proxy, so `byReference(x) !== byReference(x)`.
 * - Does **not** mutate the original object (unlike {@link byReferenceUnsafe}).
 *
 * **Example** (Opting out of structural equality)
 *
 * ```ts import.meta.vitest
 * import { Equal } from "effect"
 *
 * const a = { x: 1 }
 * const b = { x: 1 }
 *
 * Equal.equals(a, b) // => true
 *
 * const aRef = Equal.byReference(a)
 * Equal.equals(aRef, b) // => false
 * Equal.equals(aRef, aRef) // => true
 * aRef.x // => 1
 * ```
 *
 * @see {@link byReferenceUnsafe} — same effect without a proxy (mutates the
 *   original)
 * @see {@link equals} — the comparison function affected by this opt-out
 * @category equality
 * @since 4.0.0
 */
export const byReference = <T extends object>(obj: T): T => byReferenceUnsafe(new Proxy(obj, {}))

/**
 * Marks an object permanently to use reference equality, without creating a proxy.
 *
 * **When to use**
 *
 * Use when you need reference equality without proxy allocation and accept
 * permanently marking the original object for reference-only equality.
 *
 * **Details**
 *
 * - Adds `obj` to an internal WeakSet. From that point on, {@link equals}
 *   treats it as reference-only.
 * - Returns the **same** object (not a copy or proxy), so
 *   `byReferenceUnsafe(x) === x`.
 * - Does **not** affect the object's prototype, properties, or behavior
 *   beyond equality checks.
 *
 * **Gotchas**
 *
 * The marking is irreversible for the lifetime of the object.
 *
 * **Example** (Marking an object for reference equality)
 *
 * ```ts import.meta.vitest
 * import { Equal } from "effect"
 *
 * const obj1 = { a: 1, b: 2 }
 * const obj2 = { a: 1, b: 2 }
 *
 * const marked = Equal.byReferenceUnsafe(obj1)
 *
 * Equal.equals(obj1, obj2) // => false
 * Equal.equals(obj1, obj1) // => true
 * marked === obj1 // => true
 * ```
 *
 * @see {@link byReference} — safer alternative that creates a proxy
 * @see {@link equals} — the comparison function affected by this opt-out
 * @category unsafe
 * @since 4.0.0
 */
export const byReferenceUnsafe = <T extends object>(obj: T): T => {
  byReferenceInstances.add(obj)
  return obj
}
