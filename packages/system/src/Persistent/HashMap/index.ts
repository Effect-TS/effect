/**
 * Based on https://github.com/mattbierner/hamt_plus/blob/master/lib/hamt.js
 */
import type { Equal } from "../../Equal"
import type { Endomorphism } from "../../Function"
import { constant, identity, tuple } from "../../Function"
import type { Hash } from "../../Hash"
import * as O from "../../Option"
import { fromBitmap, hashFragment, toBitmap } from "./Bitwise"
import { SIZE } from "./Config"
import { randomHash } from "./Hash"
import type { Node, UpdateFn } from "./Nodes"
import { Empty, isEmptyNode } from "./Nodes"

export type Config<K> = Equal<K> & Hash<K>

export class HashMap<K, V> implements Iterable<readonly [K, V]> {
  readonly _K!: () => K
  readonly _V!: () => V

  constructor(
    public editable: boolean,
    public edit: number,
    readonly config: Config<K>,
    public root: Node<K, V>,
    public size: number
  ) {
    this.get = this.get.bind(this)
    this.set = this.set.bind(this)
    this.keys = this.keys.bind(this)
    this.values = this.values.bind(this)
    this.modify = this.modify.bind(this)
    this.update = this.update.bind(this)
    this.has = this.has.bind(this)
    this.remove = this.remove.bind(this)
    this.mutate = this.mutate.bind(this)
  }

  [Symbol.iterator](): Iterator<readonly [K, V]> {
    return new HashMapIterator(this, identity)
  }

  get(key: K): O.Option<V> {
    return get_(this, key)
  }

  set(key: K, value: V): HashMap<K, V> {
    return set_(this, key, value)
  }

  get isEmpty(): boolean {
    return isEmpty(this)
  }

  has(key: K): boolean {
    return has_(this, key)
  }

  keys(): IterableIterator<K> {
    return keys(this)
  }

  values(): IterableIterator<V> {
    return values(this)
  }

  modify(key: K, f: UpdateFn<V>): HashMap<K, V> {
    return modify_(this, key, f)
  }

  update(key: K, f: Endomorphism<V>): HashMap<K, V> {
    return update_(this, key, f)
  }

  remove(key: K): HashMap<K, V> {
    return remove_(this, key)
  }

  mutate(f: (map: HashMap<K, V>) => void): HashMap<K, V> {
    return mutate_(this, f)
  }
}

export class HashMapIterator<K, V, T> implements IterableIterator<T> {
  v = visitLazy(this.map.root, this.f, undefined)

  constructor(readonly map: HashMap<K, V>, readonly f: TraversalFn<K, V, T>) {}

  next(): IteratorResult<T> {
    if (O.isNone(this.v)) {
      return { done: true, value: undefined }
    }
    const v0 = this.v.value
    this.v = applyCont(v0.cont)
    return { done: false, value: v0.value }
  }

  [Symbol.iterator](): IterableIterator<T> {
    return new HashMapIterator(this.map, this.f)
  }
}

/**
 * Creates a new map
 */
export function make<K, V>(K: Hash<K> & Equal<K>) {
  return new HashMap<K, V>(false, 0, K, new Empty(), 0)
}

/**
 * Set the root of the map
 */
export function setTree_<K, V>(
  map: HashMap<K, V>,
  newRoot: Node<K, V>,
  newSize: number
) {
  if (map.editable) {
    map.root = newRoot
    map.size = newSize
    return map
  }
  return newRoot === map.root
    ? map
    : new HashMap(map.editable, map.edit, map.config, newRoot, newSize)
}

/**
 * Lookup the value for `key` in `map` using custom hash.
 */
export function tryGetHash_<K, V>(
  map: HashMap<K, V>,
  key: K,
  hash: number
): O.Option<V> {
  let node = map.root
  let shift = 0
  const keyEq = map.config.equals

  // eslint-disable-next-line no-constant-condition
  while (true)
    switch (node._tag) {
      case "LeafNode": {
        return keyEq(node.key)(key) ? node.value : O.none
      }
      case "CollisionNode": {
        if (hash === node.hash) {
          const children = node.children
          for (let i = 0, len = children.length; i < len; ++i) {
            const child = children[i]
            if ("key" in child && keyEq(child.key)(key)) return child.value
          }
        }
        return O.none
      }
      case "IndexedNode": {
        const frag = hashFragment(shift, hash)
        const bit = toBitmap(frag)
        if (node.mask & bit) {
          node = node.children[fromBitmap(node.mask, bit)]
          shift += SIZE
          break
        }
        return O.none
      }
      case "ArrayNode": {
        node = node.children[hashFragment(shift, hash)]
        if (node) {
          shift += SIZE
          break
        }
        return O.none
      }
      default:
        return O.none
    }
}

/**
 * Lookup the value for `key` in `map` using custom hash.
 */
export function getHash_<K, V>(map: HashMap<K, V>, key: K, hash: number): O.Option<V> {
  return tryGetHash_(map, key, hash)
}

/**
 * Lookup the value for `key` in `map` using internal hash function.
 */
export function get_<K, V>(map: HashMap<K, V>, key: K): O.Option<V> {
  return tryGetHash_(map, key, map.config.hash(key))
}

/**
 * Lookup the value for `key` in `map` using internal hash function.
 */
export function get<K>(key: K) {
  return <V>(map: HashMap<K, V>) => get_(map, key)
}

/**
 * Does an entry exist for `key` in `map`? Uses custom `hash`.
 */
export function hasHash_<K, V>(map: HashMap<K, V>, key: K, hash: number): boolean {
  return O.isNone(tryGetHash_(map, key, hash))
}

/**
 * Does an entry exist for `key` in `map`? Uses internal hash function.
 */
export function has_<K, V>(map: HashMap<K, V>, key: K): boolean {
  return O.isSome(tryGetHash_(map, key, map.config.hash(key)))
}

/**
 * Does `map` contain any elements?
 */
export function isEmpty<K, V>(map: HashMap<K, V>): boolean {
  return map && !!isEmptyNode(map.root)
}

/**
 * Alter the value stored for `key` in `map` using function `f` using custom hash.
 *
 *  `f` is invoked with the current value for `k` if it exists,
 * or no arguments if no such value exists.
 *
 * `modify` will always either update or insert a value into the map.
 * Returns a map with the modified value. Does not alter `map`.
 */
export function modifyHash_<K, V>(
  map: HashMap<K, V>,
  key: K,
  hash: number,
  f: UpdateFn<V>
): HashMap<K, V> {
  const size = { value: map.size }
  const newRoot = map.root.modify(
    map.editable ? map.edit : NaN,
    map.config.equals,
    0,
    f,
    hash,
    key,
    size
  )
  return setTree_(map, newRoot, size.value)
}

/**
 * Alter the value stored for `key` in `map` using function `f` using internal hash function.
 *
 *  `f` is invoked with the current value for `k` if it exists,
 * or no arguments if no such value exists.
 *
 * `modify` will always either update or insert a value into the map.
 * Returns a map with the modified value. Does not alter `map`.
 */
export function modify_<K, V>(map: HashMap<K, V>, key: K, f: UpdateFn<V>) {
  return modifyHash_(map, key, map.config.hash(key), f)
}

/**
 * Store `value` for `key` in `map` using custom hash.
 */
export function setHash_<K, V>(map: HashMap<K, V>, key: K, hash: number, value: V) {
  return modifyHash_(map, key, hash, constant(O.some(value)))
}

/**
 * Store `value` for `key` in `map` using internal hash function.
 */
export function set_<K, V>(map: HashMap<K, V>, key: K, value: V) {
  return modify_(map, key, constant(O.some(value)))
}

/**
 * Store `value` for `key` in `map` using internal hash function.
 */
export function set<K, V>(key: K, value: V) {
  return (map: HashMap<K, V>) => set_(map, key, value)
}

/**
 *  Remove the entry for `key` in `map` using custom hash.
 */
export function removeHash_<K, V>(map: HashMap<K, V>, key: K, hash: number) {
  return modifyHash_<K, V>(map, key, hash, constant(O.none))
}

/**
 *  Remove the entry for `key` in `map` using internal hash.
 */
export function remove_<K, V>(map: HashMap<K, V>, key: K) {
  return modifyHash_(map, key, map.config.hash(key), constant(O.none))
}

/**
 *  Remove the entry for `key` in `map` using internal hash.
 */
export function remove<K>(key: K) {
  return <V>(map: HashMap<K, V>) => remove_(map, key)
}

/**
 * Mark `map` as mutable.
 */
export function beginMutation<K, V>(map: HashMap<K, V>) {
  return new HashMap(true, map.edit + 1, map.config, map.root, map.size)
}

/**
 * Mark `map` as immutable.
 */
export function endMutation<K, V>(map: HashMap<K, V>) {
  map.editable = false
  return map
}

/**
 * Mutate `map` within the context of `f`.
 */
export function mutate<K, V>(f: (map: HashMap<K, V>) => void) {
  return (map: HashMap<K, V>) => mutate_(map, f)
}

/**
 * Mutate `map` within the context of `f`.
 */
export function mutate_<K, V>(map: HashMap<K, V>, f: (map: HashMap<K, V>) => void) {
  const transient = beginMutation(map)
  f(transient)
  return endMutation(transient)
}

export type Cont<K, V, A> =
  | [
      len: number,
      children: Node<K, V>[],
      i: number,
      f: TraversalFn<K, V, A>,
      cont: Cont<K, V, A>
    ]
  | undefined

export function applyCont<K, V, A>(cont: Cont<K, V, A>) {
  return cont ? visitLazyChildren(cont[0], cont[1], cont[2], cont[3], cont[4]) : O.none
}

export function visitLazyChildren<K, V, A>(
  len: number,
  children: Node<K, V>[],
  i: number,
  f: TraversalFn<K, V, A>,
  cont: Cont<K, V, A>
): O.Option<VisitResult<K, V, A>> {
  while (i < len) {
    const child = children[i++]
    if (child && !isEmptyNode(child)) {
      return visitLazy(child, f, [len, children, i, f, cont])
    }
  }
  return applyCont(cont)
}

export interface VisitResult<K, V, A> {
  value: A
  cont: Cont<K, V, A>
}

export type TraversalFn<K, V, A> = (node: readonly [K, V]) => A

/**
 * Visit each leaf lazily
 */
export function visitLazy<K, V, A>(
  node: Node<K, V>,
  f: TraversalFn<K, V, A>,
  cont: Cont<K, V, A> = undefined
): O.Option<VisitResult<K, V, A>> {
  switch (node._tag) {
    case "LeafNode": {
      return O.isSome(node.value)
        ? O.some({
            value: f(tuple(node.key, node.value.value)),
            cont
          })
        : applyCont(cont)
    }
    case "CollisionNode":
    case "ArrayNode":
    case "IndexedNode": {
      const children = node.children
      return visitLazyChildren(children.length, children, 0, f, cont)
    }
    default: {
      return applyCont(cont)
    }
  }
}

/**
 * Get an IterableIterator of the map keys
 */
export function keys<K, V>(map: HashMap<K, V>): IterableIterator<K> {
  return new HashMapIterator(map, ([k]) => k)
}

/**
 * Get an IterableIterator of the map values
 */
export function values<K, V>(map: HashMap<K, V>): IterableIterator<V> {
  return new HashMapIterator(map, ([, v]) => v)
}

/**
 * Update a value if exists
 */
export function update_<K, V>(map: HashMap<K, V>, key: K, f: (v: V) => V) {
  return modify_(map, key, O.map(f))
}

/**
 * Update a value if exists
 */
export function update<K, V>(key: K, f: (v: V) => V) {
  return (map: HashMap<K, V>) => update_(map, key, f)
}

/**
 * Reduce a state over the map entries
 */
export function reduceWithIndex_<K, V, Z>(
  map: HashMap<K, V>,
  z: Z,
  f: (z: Z, k: K, v: V) => Z
): Z {
  const root = map.root
  if (root._tag === "LeafNode")
    return O.isSome(root.value) ? f(z, root.key, root.value.value) : z
  if (root._tag === "Empty") {
    return z
  }
  const toVisit = [root.children]
  let children
  while ((children = toVisit.pop())) {
    for (let i = 0, len = children.length; i < len; ) {
      const child = children[i++]
      if (child && !isEmptyNode(child)) {
        if (child._tag === "LeafNode") {
          if (O.isSome(child.value)) {
            z = f(z, child.key, child.value.value)
          }
        } else toVisit.push(child.children)
      }
    }
  }
  return z
}

/**
 * Reduce a state over the map entries
 */
export function reduceWithIndex<K, V, Z>(z: Z, f: (z: Z, k: K, v: V) => Z) {
  return (map: HashMap<K, V>) => reduceWithIndex_(map, z, f)
}

/**
 * Reduce a state over the map entries
 */
export function reduce_<K, V, Z>(map: HashMap<K, V>, z: Z, f: (z: Z, v: V) => Z): Z {
  return reduceWithIndex_(map, z, (z, _, v) => f(z, v))
}

/**
 * Reduce a state over the map entries
 */
export function reduce<V, Z>(z: Z, f: (z: Z, v: V) => Z) {
  return <K>(map: HashMap<K, V>) => reduce_(map, z, f)
}

/**
 * Make a new map that has randomly cached hash and referential equality
 */
export function makeDefault<K, V>() {
  return make<K, V>({
    equals: (y) => (x) => x === y,
    hash: randomHash
  })
}

/**
 * Apply f to each element
 */
export function forEachWithIndex_<K, V>(
  map: HashMap<K, V>,
  f: (k: K, v: V, m: HashMap<K, V>) => void
) {
  return reduceWithIndex_(map, undefined as void, (_, key, value) => f(key, value, map))
}

/**
 * Apply f to each element
 */
export function forEach_<K, V>(
  map: HashMap<K, V>,
  f: (v: V, m: HashMap<K, V>) => void
) {
  return forEachWithIndex_(map, (_, value, map) => f(value, map))
}

/**
 * Maps over the map entries
 */
export function mapWithIndex_<K, V, A>(map: HashMap<K, V>, f: (k: K, v: V) => A) {
  return reduceWithIndex_(map, make<K, A>(map.config), (z, k, v) => set_(z, k, f(k, v)))
}

/**
 * Maps over the map entries
 */
export function mapWithIndex<K, V, A>(f: (k: K, v: V) => A) {
  return (map: HashMap<K, V>) => mapWithIndex_(map, f)
}

/**
 * Maps over the map entries
 */
export function map_<K, V, A>(map: HashMap<K, V>, f: (v: V) => A) {
  return reduceWithIndex_(map, make<K, A>(map.config), (z, k, v) => set_(z, k, f(v)))
}

/**
 * Maps over the map entries
 */
export function map<V, A>(f: (v: V) => A) {
  return <K>(map: HashMap<K, V>) => map_(map, f)
}

/**
 * Chain over the map entries
 */
export function chain_<K, V, A>(map: HashMap<K, V>, f: (v: V) => HashMap<K, A>) {
  return reduceWithIndex_(map, make<K, A>(map.config), (z, _, v) =>
    z.mutate((m) => {
      forEachWithIndex_(f(v), (_k, _a) => {
        set_(m, _k, _a)
      })
    })
  )
}

/**
 * Chain over the map entries
 */
export function chain<K, V, A>(f: (v: V) => HashMap<K, A>) {
  return (map: HashMap<K, V>) => chain_(map, f)
}

/**
 * Chain over the map entries
 */
export function chainWithIndex_<K, V, A>(
  map: HashMap<K, V>,
  f: (k: K, v: V) => HashMap<K, A>
) {
  return reduceWithIndex_(map, make<K, A>(map.config), (z, k, v) =>
    z.mutate((m) => {
      forEachWithIndex_(f(k, v), (_k, _a) => {
        set_(m, _k, _a)
      })
    })
  )
}

/**
 * Chain over the map entries
 */
export function chainWithIndex<K, V, A>(f: (k: K, v: V) => HashMap<K, A>) {
  return (map: HashMap<K, V>) => chainWithIndex_(map, f)
}
