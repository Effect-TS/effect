// Implementation of IndexMap here.

import * as Equal from "../Equal.js"
import { dual, pipe } from "../Function.js"
import * as Hash from "../Hash.js"
import * as HashMap from "../HashMap.js"
import type * as IM from "../IndexMap.js"
import { format, NodeInspectSymbol, toJSON } from "../Inspectable.js"
import * as Option from "../Option.js"
import { pipeArguments } from "../Pipeable.js"
import { hasProperty } from "../Predicate.js"
import type { NoInfer } from "../Types.js"

const IndexMapSymbolKey = "effect/IndexMap"

/** @internal */
export const IndexMapTypeId: IM.TypeId = Symbol.for(IndexMapSymbolKey) as IM.TypeId

/** @internal */
export interface IndexMapImpl<out K, out V> extends IM.IndexMap<K, V> {
  _editable: boolean // mutable by design
  _keys: Array<K> // order of insertion
  _indices: HashMap.HashMap<K, number> // key -> index mapping
  _values: Array<V> // values at positions
}

const IndexMapProto: IM.IndexMap<unknown, unknown> = {
  [IndexMapTypeId]: IndexMapTypeId,
  [Symbol.iterator]<K, V>(this: IndexMapImpl<K, V>): Iterator<[K, V]> {
    return new IndexMapIterator(this, (k, v) => [k, v])
  },
  [Hash.symbol](this: IM.IndexMap<unknown, unknown>): number {
    let hash = Hash.hash(IndexMapSymbolKey)
    for (const item of this) {
      hash ^= pipe(Hash.hash(item[0]), Hash.combine(Hash.hash(item[1])))
    }
    return Hash.cached(this, hash)
  },
  [Equal.symbol]<K, V>(this: IndexMapImpl<K, V>, that: unknown): boolean {
    if (isIndexMap(that)) {
      if ((that as IndexMapImpl<K, V>)._keys.length !== this._keys.length) {
        return false
      }
      for (let i = 0; i < this._keys.length; i++) {
        const thisKey = this._keys[i]
        const thisValue = this._values[i]

        // Check if keys are in the same order and values are equal
        if (
          !Equal.equals(thisKey, (that as IndexMapImpl<K, V>)._keys[i]) ||
          !Equal.equals(thisValue, (that as IndexMapImpl<K, V>)._values[i])
        ) {
          return false
        }
      }
      return true
    }
    return false
  },
  toString<K, V>(this: IndexMapImpl<K, V>) {
    return format(this.toJSON())
  },
  toJSON() {
    return {
      _id: "IndexMap",
      values: Array.from(this).map(toJSON)
    }
  },
  [NodeInspectSymbol]() {
    return this.toJSON()
  },
  pipe() {
    return pipeArguments(this, arguments)
  }
}

type TraversalFn<K, V, A> = (k: K, v: V) => A

class IndexMapIterator<in out K, in out V, out T> implements IterableIterator<T> {
  private index = 0

  constructor(readonly map: IndexMapImpl<K, V>, readonly f: TraversalFn<K, V, T>) {}

  next(): IteratorResult<T> {
    if (this.index >= this.map._keys.length) {
      return { done: true, value: undefined }
    }
    const key = this.map._keys[this.index]
    const value = this.map._values[this.index]
    this.index++
    return { done: false, value: this.f(key, value) }
  }

  [Symbol.iterator](): IterableIterator<T> {
    return new IndexMapIterator(this.map, this.f)
  }
}

const makeImpl = <K, V>(
  editable: boolean,
  keys: Array<K>,
  indices: HashMap.HashMap<K, number>,
  values: Array<V>
): IndexMapImpl<K, V> => {
  const map = Object.create(IndexMapProto)
  map._editable = editable
  map._keys = keys
  map._indices = indices
  map._values = values
  return map
}

const _empty = makeImpl<never, never>(false, [], HashMap.empty(), [])

/** @internal */
export const empty = <K = never, V = never>(): IM.IndexMap<K, V> => _empty

/** @internal */
export const make = <Entries extends ReadonlyArray<readonly [any, any]>>(
  ...entries: Entries
): IM.IndexMap<
  Entries[number] extends readonly [infer K, any] ? K : never,
  Entries[number] extends readonly [any, infer V] ? V : never
> => fromIterable(entries)

/** @internal */
export const fromIterable = <K, V>(entries: Iterable<readonly [K, V]>): IM.IndexMap<K, V> => {
  const map = beginMutation(empty<K, V>())
  for (const entry of entries) {
    set(map, entry[0], entry[1])
  }
  return endMutation(map)
}

/** @internal */
export const isIndexMap: {
  <K, V>(u: Iterable<readonly [K, V]>): u is IM.IndexMap<K, V>
  (u: unknown): u is IM.IndexMap<unknown, unknown>
} = (u: unknown): u is IM.IndexMap<unknown, unknown> => hasProperty(u, IndexMapTypeId)

/** @internal */
export const isEmpty = <K, V>(self: IM.IndexMap<K, V>): boolean => (self as IndexMapImpl<K, V>)._keys.length === 0

/** @internal */
export const size = <K, V>(self: IM.IndexMap<K, V>): number => (self as IndexMapImpl<K, V>)._keys.length

/** @internal */
export const get = dual<
  <K1>(key: K1) => <K, V>(self: IM.IndexMap<K, V>) => Option.Option<V>,
  <K, V, K1>(self: IM.IndexMap<K, V>, key: K1) => Option.Option<V>
>(2, (self, key) => {
  const impl = self as IndexMapImpl<K, V>
  const indexOption = HashMap.get(impl._indices, key)
  return Option.flatMap(indexOption, (index) => {
    if (index >= 0 && index < impl._values.length) {
      return Option.some(impl._values[index])
    }
    return Option.none()
  })
})

/** @internal */
export const unsafeGet = dual<
  <K1>(key: K1) => <K, V>(self: IM.IndexMap<K, V>) => V,
  <K, V, K1>(self: IM.IndexMap<K, V>, key: K1) => V
>(2, (self, key) => {
  const element = get(self, key)
  if (Option.isNone(element)) {
    throw new Error("Expected map to contain key")
  }
  return element.value
})

/** @internal */
export const has = dual<
  <K1>(key: K1) => <K, V>(self: IM.IndexMap<K, V>) => boolean,
  <K, V, K1>(self: IM.IndexMap<K, V>, key: K1) => boolean
>(2, (self, key) => Option.isSome(get(self, key)))

/** @internal */
export const set = dual<
  <K, V>(key: K, value: V) => (self: IM.IndexMap<K, V>) => IM.IndexMap<K, V>,
  <K, V>(self: IM.IndexMap<K, V>, key: K, value: V) => IM.IndexMap<K, V>
>(3, <K, V>(self: IM.IndexMap<K, V>, key: K, value: V) => {
  const impl = self as IndexMapImpl<K, V>
  const indexOption = HashMap.get(impl._indices, key)

  if (impl._editable) {
    if (Option.isSome(indexOption)) {
      // Update existing entry
      impl._values[indexOption.value] = value
    } else {
      // Add new entry
      const newIndex = impl._keys.length
      impl._keys.push(key)
      impl._values.push(value)
      impl._indices = HashMap.set(impl._indices, key, newIndex)
    }
    return self
  } else {
    // Create a new map
    const newKeys = [...impl._keys]
    const newValues = [...impl._values]
    let newIndices = impl._indices

    if (Option.isSome(indexOption)) {
      // Update existing entry
      newValues[indexOption.value] = value
    } else {
      // Add new entry
      const newIndex = newKeys.length
      newKeys.push(key)
      newValues.push(value)
      newIndices = HashMap.set(newIndices, key, newIndex)
    }

    return makeImpl(false, newKeys, newIndices, newValues)
  }
})

/** @internal */
export const remove = dual<
  <K>(key: K) => <V>(self: IM.IndexMap<K, V>) => IM.IndexMap<K, V>,
  <K, V>(self: IM.IndexMap<K, V>, key: K) => IM.IndexMap<K, V>
>(2, <K, V>(self: IM.IndexMap<K, V>, key: K) => {
  const impl = self as IndexMapImpl<K, V>
  const indexOption = HashMap.get(impl._indices, key)

  if (Option.isNone(indexOption)) {
    return self
  }

  const index = indexOption.value

  if (impl._editable) {
    // Remove element and shift all indices
    impl._keys.splice(index, 1)
    impl._values.splice(index, 1)

    // Update indices
    impl._indices = HashMap.remove(impl._indices, key)

    // Update all indices for elements after the removed one
    for (let i = index; i < impl._keys.length; i++) {
      impl._indices = HashMap.set(impl._indices, impl._keys[i], i)
    }

    return self
  } else {
    // Create a new map
    const newKeys = impl._keys.slice(0, index).concat(impl._keys.slice(index + 1))
    const newValues = impl._values.slice(0, index).concat(impl._values.slice(index + 1))

    // Build new indices
    let newIndices = HashMap.empty<K, number>()
    for (let i = 0; i < newKeys.length; i++) {
      newIndices = HashMap.set(newIndices, newKeys[i], i)
    }

    return makeImpl(false, newKeys, newIndices, newValues)
  }
})

/** @internal */
export const beginMutation = <K, V>(self: IM.IndexMap<K, V>): IM.IndexMap<K, V> => {
  const impl = self as IndexMapImpl<K, V>
  return makeImpl(
    true,
    [...impl._keys],
    HashMap.beginMutation(impl._indices),
    [...impl._values]
  )
}

/** @internal */
export const endMutation = <K, V>(self: IM.IndexMap<K, V>): IM.IndexMap<K, V> => {
  const impl = self as IndexMapImpl<K, V>
  impl._editable = false
  impl._indices = HashMap.endMutation(impl._indices)
  return self
}

/** @internal */
export const mutate = dual<
  <K, V>(f: (self: IM.IndexMap<K, V>) => void) => (self: IM.IndexMap<K, V>) => IM.IndexMap<K, V>,
  <K, V>(self: IM.IndexMap<K, V>, f: (self: IM.IndexMap<K, V>) => void) => IM.IndexMap<K, V>
>(2, (self, f) => {
  const transient = beginMutation(self)
  f(transient)
  return endMutation(transient)
})

/** @internal */
export const forEach = dual<
  <V, K>(f: (value: V, key: K) => void) => (self: IM.IndexMap<K, V>) => void,
  <V, K>(self: IM.IndexMap<K, V>, f: (value: V, key: K) => void) => void
>(2, (self, f) => {
  const impl = self as IndexMapImpl<K, V>
  for (let i = 0; i < impl._keys.length; i++) {
    f(impl._values[i], impl._keys[i])
  }
})

/** @internal */
export const reduce = dual<
  <Z, V, K>(zero: Z, f: (accumulator: Z, value: V, key: K) => Z) => (self: IM.IndexMap<K, V>) => Z,
  <Z, V, K>(self: IM.IndexMap<K, V>, zero: Z, f: (accumulator: Z, value: V, key: K) => Z) => Z
>(3, <Z, V, K>(self: IM.IndexMap<K, V>, zero: Z, f: (accumulator: Z, value: V, key: K) => Z) => {
  const impl = self as IndexMapImpl<K, V>
  let result = zero
  for (let i = 0; i < impl._keys.length; i++) {
    result = f(result, impl._values[i], impl._keys[i])
  }
  return result
})

/** @internal */
export const keys = <K, V>(self: IM.IndexMap<K, V>): IterableIterator<K> =>
  new IndexMapIterator(self as IndexMapImpl<K, V>, (key) => key)

/** @internal */
export const values = <K, V>(self: IM.IndexMap<K, V>): IterableIterator<V> =>
  new IndexMapIterator(self as IndexMapImpl<K, V>, (_, value) => value)

/** @internal */
export const entries = <K, V>(self: IM.IndexMap<K, V>): IterableIterator<[K, V]> =>
  new IndexMapIterator(self as IndexMapImpl<K, V>, (key, value) => [key, value])

/** @internal */
export const getIndex = dual<
  (index: number) => <K, V>(self: IM.IndexMap<K, V>) => Option.Option<[K, V]>,
  <K, V>(self: IM.IndexMap<K, V>, index: number) => Option.Option<[K, V]>
>(2, <K, V>(self: IM.IndexMap<K, V>, index: number) => {
  const impl = self as IndexMapImpl<K, V>
  if (index < 0 || index >= impl._keys.length) {
    return Option.none()
  }
  return Option.some([impl._keys[index], impl._values[index]])
})

/** @internal */
export const pop = <K, V>(self: IM.IndexMap<K, V>): Option.Option<[[K, V], IM.IndexMap<K, V>]> => {
  const impl = self as IndexMapImpl<K, V>
  if (impl._keys.length === 0) {
    return Option.none()
  }

  const lastIndex = impl._keys.length - 1
  const lastKey = impl._keys[lastIndex]
  const lastValue = impl._values[lastIndex]
  const newMap = remove(self, lastKey)

  return Option.some([[lastKey, lastValue], newMap])
}

/** @internal */
export const findFirst: {
  <K, A, B extends A>(predicate: (a: NoInfer<A>, k: K) => a is B): (self: IM.IndexMap<K, A>) => Option.Option<[K, B]>
  <K, A>(predicate: (a: NoInfer<A>, k: K) => boolean): (self: IM.IndexMap<K, A>) => Option.Option<[K, A]>
  <K, A, B extends A>(self: IM.IndexMap<K, A>, predicate: (a: A, k: K) => a is B): Option.Option<[K, B]>
  <K, A>(self: IM.IndexMap<K, A>, predicate: (a: A, k: K) => boolean): Option.Option<[K, A]>
} = dual(
  2,
  <K, A>(self: IM.IndexMap<K, A>, predicate: (a: A, k: K) => boolean): Option.Option<[K, A]> => {
    const impl = self as IndexMapImpl<K, A>
    for (let i = 0; i < impl._keys.length; i++) {
      if (predicate(impl._values[i], impl._keys[i])) {
        return Option.some([impl._keys[i], impl._values[i]])
      }
    }
    return Option.none()
  }
)

/** @internal */
export const filter: {
  <K, A, B extends A>(f: (a: NoInfer<A>, k: K) => a is B): (self: IM.IndexMap<K, A>) => IM.IndexMap<K, B>
  <K, A>(f: (a: NoInfer<A>, k: K) => boolean): (self: IM.IndexMap<K, A>) => IM.IndexMap<K, A>
  <K, A, B extends A>(self: IM.IndexMap<K, A>, f: (a: A, k: K) => a is B): IM.IndexMap<K, B>
  <K, A>(self: IM.IndexMap<K, A>, f: (a: A, k: K) => boolean): IM.IndexMap<K, A>
} = dual(
  2,
  <K, A>(self: IM.IndexMap<K, A>, f: (a: A, k: K) => boolean): IM.IndexMap<K, A> =>
    mutate(empty(), (map) => {
      forEach(self, (value, key) => {
        if (f(value, key)) {
          set(map, key, value)
        }
      })
    })
)

/** @internal */
export const map = dual<
  <A, V, K>(f: (value: V, key: K) => A) => (self: IM.IndexMap<K, V>) => IM.IndexMap<K, A>,
  <K, V, A>(self: IM.IndexMap<K, V>, f: (value: V, key: K) => A) => IM.IndexMap<K, A>
>(2, (self, f) =>
  reduce(
    self,
    empty(),
    (map, value, key) => set(map, key, f(value, key))
  ))
