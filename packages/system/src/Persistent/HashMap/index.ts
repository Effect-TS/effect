/**
 * Based on https://github.com/mattbierner/hamt_plus/blob/master/lib/hamt.js
 */
import type { Equal } from "../../Equal"
import { constant, identity, tuple } from "../../Function"
import type { Hash } from "../../Hash"
import * as O from "../../Option"
import { fromBitmap, hashFragment, toBitmap } from "./Bitwise"
import { SIZE } from "./Config"
import type { KeyEq, Node, UpdateFn } from "./Nodes"
import { Empty, isEmptyNode } from "./Nodes"

export interface Config<K> {
  keyEq: KeyEq<K>
  hash: (k: K) => number
}

export class HashMap<K, V> implements Iterable<readonly [K, V]> {
  readonly _K!: () => K
  readonly _V!: () => V

  constructor(
    public editable: boolean,
    public edit: number,
    readonly config: Config<K>,
    public root: Node<K, V>,
    public size: number
  ) {}

  [Symbol.iterator](): Iterator<readonly [K, V]> {
    return new HashMapIterator(visitLazy(this.root, identity, undefined))
  }
}

export class HashMapIterator<K, V> implements Iterator<readonly [K, V]> {
  constructor(private v: O.Option<VisitResult<K, V, readonly [K, V]>>) {}

  next(): IteratorResult<readonly [K, V]> {
    if (O.isNone(this.v)) {
      return { done: true, value: undefined }
    }
    const v0 = this.v.value
    this.v = applyCont(v0.cont)
    return { done: false, value: v0.value }
  }
}

export function make<K, V>(K: Hash<K> & Equal<K>) {
  return new HashMap<K, V>(
    false,
    0,
    {
      keyEq: K.equals,
      hash: K.hash
    },
    new Empty(),
    0
  )
}

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
  const keyEq = map.config.keyEq

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
    map.config.keyEq,
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
  return (map: HashMap<K, V>) => {
    const transient = beginMutation(map)
    f(transient)
    return endMutation(transient)
  }
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

export function visitLazy<K, V, A>(
  node: Node<K, V>,
  f: TraversalFn<K, V, A>,
  cont: Cont<K, V, A>
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
