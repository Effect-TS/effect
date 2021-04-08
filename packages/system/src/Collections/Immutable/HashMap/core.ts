// tracing: off

import "../../../Operator"

/**
 * Based on https://github.com/mattbierner/hamt_plus/blob/master/lib/hamt.js
 */
import type { Equal } from "../../../Equal"
import type { Refinement } from "../../../Function"
import { constant, identity, tuple } from "../../../Function"
import type { Hash } from "../../../Hash"
import { hash } from "../../../Hash"
import * as O from "../../../Option"
import { fromBitmap, hashFragment, toBitmap } from "./Bitwise"
import { SIZE } from "./Config"
import type { Node, UpdateFn } from "./Nodes"
import { Empty, isEmptyNode } from "./Nodes"

export class HashMap<K, V> implements Iterable<readonly [K, V]> {
  readonly _K!: () => K
  readonly _V!: () => V

  constructor(
    public editable: boolean,
    public edit: number,
    readonly eqKey: Equal<K>,
    readonly hashKey: Hash<K>,
    public root: Node<K, V>,
    public size: number
  ) {}

  [Symbol.iterator](): Iterator<readonly [K, V]> {
    return new HashMapIterator(this, identity)
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
export function make<K, V>(E: Equal<K>, H: Hash<K>) {
  return new HashMap<K, V>(false, 0, E, H, new Empty(), 0)
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
    : new HashMap(map.editable, map.edit, map.eqKey, map.hashKey, newRoot, newSize)
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
  const keyEq = map.eqKey.equals

  // eslint-disable-next-line no-constant-condition
  while (true)
    switch (node._tag) {
      case "LeafNode": {
        return keyEq(key, node.key) ? node.value : O.none
      }
      case "CollisionNode": {
        if (hash === node.hash) {
          const children = node.children
          for (let i = 0, len = children.length; i < len; ++i) {
            const child = children[i]!
            if ("key" in child && keyEq(key, child.key)) return child.value
          }
        }
        return O.none
      }
      case "IndexedNode": {
        const frag = hashFragment(shift, hash)
        const bit = toBitmap(frag)
        if (node.mask & bit) {
          node = node.children[fromBitmap(node.mask, bit)]!
          shift += SIZE
          break
        }
        return O.none
      }
      case "ArrayNode": {
        node = node.children[hashFragment(shift, hash)]!
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
  return tryGetHash_(map, key, map.hashKey.hash(key))
}

/**
 * Lookup the value for `key` in `map` using internal hash function.
 *
 * @dataFirst get_
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
  return O.isSome(tryGetHash_(map, key, map.hashKey.hash(key)))
}

/**
 * Does an entry exist for `key` in `map`? Uses internal hash function.
 *
 * @dataFirst has_
 */
export function has<K>(key: K) {
  return <V>(map: HashMap<K, V>) => has_(map, key)
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
    map.eqKey.equals,
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
  return modifyHash_(map, key, map.hashKey.hash(key), f)
}

/**
 * Alter the value stored for `key` in `map` using function `f` using internal hash function.
 *
 *  `f` is invoked with the current value for `k` if it exists,
 * or no arguments if no such value exists.
 *
 * `modify` will always either update or insert a value into the map.
 * Returns a map with the modified value. Does not alter `map`.
 *
 * @dataFirst modify_
 */
export function modify<K, V>(key: K, f: UpdateFn<V>) {
  return (map: HashMap<K, V>) => modify_(map, key, f)
}

/**
 * Store `value` for `key` in `map` using internal hash function.
 */
export function set_<K, V>(map: HashMap<K, V>, key: K, value: V) {
  return modify_(map, key, constant(O.some(value)))
}

/**
 * Store `value` for `key` in `map` using internal hash function.
 *
 * @dataFirst set_
 */
export function set<K, V>(key: K, value: V) {
  return (map: HashMap<K, V>) => set_(map, key, value)
}

/**
 * Remove the entry for `key` in `map` using internal hash.
 */
export function remove_<K, V>(map: HashMap<K, V>, key: K) {
  return modify_(map, key, constant(O.none))
}

/**
 * Remove the entry for `key` in `map` using internal hash.
 *
 * @dataFirst remove_
 */
export function remove<K>(key: K) {
  return <V>(map: HashMap<K, V>) => remove_(map, key)
}

/**
 * Mark `map` as mutable.
 */
export function beginMutation<K, V>(map: HashMap<K, V>) {
  return new HashMap(true, map.edit + 1, map.eqKey, map.hashKey, map.root, map.size)
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
 *
 * @dataFirst mutate_
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
 *
 * @dataFirst update_
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
 *
 * @dataFirst reduceWithIndex_
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
 *
 * @dataFirst reduce_
 */
export function reduce<V, Z>(z: Z, f: (z: Z, v: V) => Z) {
  return <K>(map: HashMap<K, V>) => reduce_(map, z, f)
}

/**
 * Make a new map that has randomly cached hash and referential equality
 */
export function makeDefault<K, V>() {
  return make<K, V>(
    {
      equals: (x, y) => x === y
    },
    {
      hash
    }
  )
}

/**
 * Apply f to each element
 */
export function forEachWithIndex_<K, V>(map: HashMap<K, V>, f: (k: K, v: V) => void) {
  reduceWithIndex_(map, undefined as void, (_, key, value) => f(key, value))
}

/**
 * Apply f to each element
 *
 * @dataFirst forEachWithIndex_
 */
export function forEachWithIndex<K, V>(f: (k: K, v: V) => void) {
  return (map: HashMap<K, V>) => forEachWithIndex_(map, f)
}

/**
 * Apply f to each element
 */
export function forEach_<K, V>(map: HashMap<K, V>, f: (v: V) => void) {
  forEachWithIndex_(map, (_, value) => f(value))
}

/**
 * Apply f to each element
 *
 * @dataFirst forEach_
 */
export function forEach<V>(f: (v: V) => void) {
  return <K>(map: HashMap<K, V>) => forEach_(map, f)
}

/**
 * Maps over the map entries
 */
export function mapWithIndex_<K, V, A>(map: HashMap<K, V>, f: (k: K, v: V) => A) {
  return reduceWithIndex_(map, make<K, A>(map.eqKey, map.hashKey), (z, k, v) =>
    set_(z, k, f(k, v))
  )
}

/**
 * Maps over the map entries
 *
 * @dataFirst mapWithIndex_
 */
export function mapWithIndex<K, V, A>(f: (k: K, v: V) => A) {
  return (map: HashMap<K, V>) => mapWithIndex_(map, f)
}

/**
 * Maps over the map entries
 */
export function map_<K, V, A>(map: HashMap<K, V>, f: (v: V) => A) {
  return reduceWithIndex_(map, make<K, A>(map.eqKey, map.hashKey), (z, k, v) =>
    set_(z, k, f(v))
  )
}

/**
 * Maps over the map entries
 *
 * @dataFirst map_
 */
export function map<V, A>(f: (v: V) => A) {
  return <K>(map: HashMap<K, V>) => map_(map, f)
}

/**
 * Chain over the map entries, the hash and equal of the 2 maps has to be the same
 */
export function chain_<K, V, A>(map: HashMap<K, V>, f: (v: V) => HashMap<K, A>) {
  return reduceWithIndex_(map, make<K, A>(map.eqKey, map.hashKey), (z, _, v) =>
    mutate_(z, (m) => {
      forEachWithIndex_(f(v), (_k, _a) => {
        set_(m, _k, _a)
      })
    })
  )
}

/**
 * Chain over the map entries, the hash and equal of the 2 maps has to be the same
 *
 * @dataFirst chain_
 */
export function chain<K, V, A>(f: (v: V) => HashMap<K, A>) {
  return (map: HashMap<K, V>) => chain_(map, f)
}

/**
 * Chain over the map entries, the hash and equal of the 2 maps has to be the same
 */
export function chainWithIndex_<K, V, A>(
  map: HashMap<K, V>,
  f: (k: K, v: V) => HashMap<K, A>
) {
  return reduceWithIndex_(map, make<K, A>(map.eqKey, map.hashKey), (z, k, v) =>
    mutate_(z, (m) => {
      forEachWithIndex_(f(k, v), (_k, _a) => {
        set_(m, _k, _a)
      })
    })
  )
}

/**
 * Chain over the map entries, the hash and equal of the 2 maps has to be the same
 *
 * @dataFirst chainWithIndex_
 */
export function chainWithIndex<K, V, A>(f: (k: K, v: V) => HashMap<K, A>) {
  return (map: HashMap<K, V>) => chainWithIndex_(map, f)
}

/**
 * Removes None values
 */
export function compact<K, A>(fa: HashMap<K, O.Option<A>>): HashMap<K, A> {
  return filterMapWithIndex_(fa, (_, a) => a)
}

/**
 * Filter out None and map
 */
export function filterMapWithIndex_<K, A, B>(
  fa: HashMap<K, A>,
  f: (k: K, a: A) => O.Option<B>
): HashMap<K, B> {
  const m = make<K, B>(fa.eqKey, fa.hashKey)

  return mutate_(m, (m) => {
    for (const [k, a] of fa) {
      const o = f(k, a)
      if (O.isSome(o)) {
        set_(m, k, o.value)
      }
    }
  })
}

/**
 * Filter out None and map
 *
 * @dataFirst filterMapWithIndex_
 */
export function filterMapWithIndex<K, A, B>(f: (k: K, a: A) => O.Option<B>) {
  return (fa: HashMap<K, A>) => filterMapWithIndex_(fa, f)
}

/**
 * Filter out None and map
 */
export function filterMap_<E, A, B>(
  fa: HashMap<E, A>,
  f: (a: A) => O.Option<B>
): HashMap<E, B> {
  return filterMapWithIndex_(fa, (_, a) => f(a))
}

/**
 * Filter out None and map
 *
 * @dataFirst filterMap_
 */
export function filterMap<A, B>(f: (a: A) => O.Option<B>) {
  return <E>(fa: HashMap<E, A>) => filterMap_(fa, f)
}

/**
 * Filter out by predicate
 */
export function filterWithIndex_<K, A>(
  fa: HashMap<K, A>,
  p: (k: K, a: A) => boolean
): HashMap<K, A> {
  const m = make<K, A>(fa.eqKey, fa.hashKey)

  return mutate_(m, (m) => {
    for (const [k, a] of fa) {
      if (p(k, a)) {
        set_(m, k, a)
      }
    }
  })
}

/**
 * Filter out by predicate
 *
 * @dataFirst filterWithIndex_
 */
export function filterWithIndex<K, A>(p: (k: K, a: A) => boolean) {
  return (fa: HashMap<K, A>) => filterWithIndex_(fa, p)
}

/**
 * Filter out by predicate
 */
export function filter_<K, A, B extends A>(
  fa: HashMap<K, A>,
  p: Refinement<A, B>
): HashMap<K, B>
export function filter_<K, A>(fa: HashMap<K, A>, p: (a: A) => boolean): HashMap<K, A>
export function filter_<K, A>(fa: HashMap<K, A>, p: (a: A) => boolean): HashMap<K, A> {
  return filterWithIndex_(fa, (_, a) => p(a))
}

/**
 * Filter out by predicate
 *
 * @dataFirst filter_
 */
export function filter<A, B extends A>(
  p: Refinement<A, B>
): <K>(fa: HashMap<K, A>) => HashMap<K, A>
export function filter<A>(
  p: (a: A) => boolean
): <K>(fa: HashMap<K, A>) => HashMap<K, A> {
  return (fa) => filter_(fa, p)
}

/**
 * Calculate the number of key/value pairs in a map
 */
export function size<K, V>(map: HashMap<K, V>) {
  return map.size
}

/**
 * Remove many keys
 */
export function removeMany_<K, V>(self: HashMap<K, V>, ks: Iterable<K>): HashMap<K, V> {
  return mutate_(self, (m) => {
    for (const k of ks) {
      remove_(m, k)
    }
  })
}

/**
 * Remove many keys
 *
 * @dataFirst removeMany_
 */
export function removeMany<K>(ks: Iterable<K>) {
  return <V>(self: HashMap<K, V>) => removeMany_(self, ks)
}
