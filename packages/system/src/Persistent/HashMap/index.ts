import type { Equal } from "../../Equal"
import { constant } from "../../Function"
import type { Hash } from "../../Hash"
import { arraySpliceIn, arraySpliceOut, arrayUpdate } from "./Array"
import { fromBitmap, hashFragment, toBitmap } from "./Bitwise"
import { MAX_INDEX_NODE, MIN_ARRAY_NODE, SIZE } from "./Config"

export const emptySymbol = Symbol()

export const nothing = {}

export type Node<K, V> =
  | LeafNode<K, V>
  | CollisionNode<K, V>
  | IndexedNode<K, V>
  | Empty<K, V>
  | ArrayNode<K, V>

export interface SizeRef {
  value: number
}

export class Empty<K, V> {
  readonly _tag = "Empty"

  modify(
    edit: number,
    _keyEq: KeyEq<K>,
    _shift: number,
    f: UpdateFn<V>,
    hash: number,
    key: K,
    size: SizeRef
  ): Node<K, V> {
    const v = f()
    if (v === nothing) return new Empty()
    ++size.value
    return new LeafNode(edit, hash, key, v)
  }
}

export function isEmptyNode(a: unknown): a is Empty<unknown, unknown> {
  return a instanceof Empty
}

export function isLeaf<K, V>(
  node: Node<K, V>
): node is Empty<K, V> | LeafNode<K, V> | CollisionNode<K, V> {
  return isEmptyNode(node) || node._tag === "LeafNode" || node._tag === "CollisionNode"
}

export function canEditNode<K, V>(edit: number, node: Node<K, V>): boolean {
  return isEmptyNode(node) ? false : edit === node.edit
}

export type KeyEq<K> = (a: K, b: K) => boolean

export type UpdateFn<V> = (v?: V | undefined) => V | undefined

export class LeafNode<K, V> {
  readonly _tag = "LeafNode"

  constructor(
    readonly edit: number,
    readonly hash: number,
    readonly key: K,
    public value: V | undefined
  ) {}

  modify(
    edit: number,
    keyEq: KeyEq<K>,
    shift: number,
    f: UpdateFn<V>,
    hash: number,
    key: K,
    size: SizeRef
  ): Node<K, V> {
    if (keyEq(key, this.key)) {
      const v = f(this.value)
      if (v === this.value) return this
      else if (v === nothing) {
        --size.value
        return new Empty()
      }
      if (canEditNode(edit, this)) {
        this.value = v
        return this
      }
      return new LeafNode(edit, hash, key, v)
    }
    const v = f()
    if (v === nothing) return this
    ++size.value
    return mergeLeaves(
      edit,
      shift,
      this.hash,
      this,
      hash,
      new LeafNode(edit, hash, key, v)
    )
  }
}

export class CollisionNode<K, V> {
  readonly _tag = "CollisionNode"

  constructor(
    readonly edit: number,
    readonly hash: number,
    readonly children: Array<Node<K, V>>
  ) {}

  modify(
    edit: number,
    keyEq: KeyEq<K>,
    shift: number,
    f: UpdateFn<V>,
    hash: number,
    key: K,
    size: SizeRef
  ) {
    if (hash === this.hash) {
      const canEdit = canEditNode(edit, this)
      const list = this.updateCollisionList(
        canEdit,
        edit,
        keyEq,
        this.hash,
        this.children,
        f,
        key,
        size
      )
      if (list === this.children) return this

      return list.length > 1 ? new CollisionNode(edit, this.hash, list) : list[0] // collapse single element collision list
    }
    const v = f()
    if (v === nothing) return this
    ++size.value
    return mergeLeaves(
      edit,
      shift,
      this.hash,
      this,
      hash,
      new LeafNode(edit, hash, key, v)
    )
  }

  updateCollisionList(
    mutate: boolean,
    edit: number,
    keyEq: KeyEq<K>,
    hash: number,
    list: Node<K, V>[],
    f: UpdateFn<V>,
    key: K,
    size: SizeRef
  ) {
    const len = list.length
    for (let i = 0; i < len; ++i) {
      const child = list[i]
      if ("key" in child && keyEq(key, child.key)) {
        const value = child.value
        const newValue = f(value)
        if (newValue === value) return list

        if (newValue === nothing) {
          --size.value
          return arraySpliceOut(mutate, i, list)
        }
        return arrayUpdate(mutate, i, new LeafNode(edit, hash, key, newValue), list)
      }
    }

    const newValue = f()
    if (newValue === nothing) return list
    ++size.value
    return arrayUpdate(mutate, len, new LeafNode(edit, hash, key, newValue), list)
  }
}

export class IndexedNode<K, V> {
  readonly _tag = "IndexedNode"

  constructor(
    readonly edit: number,
    public mask: number,
    public children: Node<K, V>[]
  ) {}

  modify(
    edit: number,
    keyEq: KeyEq<K>,
    shift: number,
    f: UpdateFn<V>,
    hash: number,
    key: K,
    size: SizeRef
  ): Node<K, V> {
    const mask = this.mask
    const children = this.children
    const frag = hashFragment(shift, hash)
    const bit = toBitmap(frag)
    const indx = fromBitmap(mask, bit)
    const exists = mask & bit
    const current = exists ? children[indx] : new Empty<K, V>()
    const child = current.modify(edit, keyEq, shift + SIZE, f, hash, key, size)

    if (current === child) return this

    const canEdit = canEditNode(edit, this)
    let bitmap = mask
    let newChildren
    if (exists && isEmptyNode(child)) {
      // remove
      bitmap &= ~bit
      if (!bitmap) return new Empty()
      if (children.length <= 2 && isLeaf(children[indx ^ 1])) return children[indx ^ 1] // collapse

      newChildren = arraySpliceOut(canEdit, indx, children)
    } else if (!exists && !isEmptyNode(child)) {
      // add
      if (children.length >= MAX_INDEX_NODE)
        return expand(edit, frag, child, mask, children)

      bitmap |= bit
      newChildren = arraySpliceIn(canEdit, indx, child, children)
    } else {
      // modify
      newChildren = arrayUpdate(canEdit, indx, child, children)
    }

    if (canEdit) {
      this.mask = bitmap
      this.children = newChildren
      return this
    }
    return new IndexedNode(edit, bitmap, newChildren)
  }
}

export class ArrayNode<K, V> {
  readonly _tag = "ArrayNode"

  public size = 0

  constructor(
    readonly edit: number,
    public mask: number,
    public children: Node<K, V>[]
  ) {}

  modify(
    edit: number,
    keyEq: KeyEq<K>,
    shift: number,
    f: UpdateFn<V>,
    hash: number,
    key: K,
    size: SizeRef
  ): Node<K, V> {
    let count = this.size
    const children = this.children
    const frag = hashFragment(shift, hash)
    const child = children[frag]
    const newChild = (child || new Empty<K, V>()).modify(
      edit,
      keyEq,
      shift + SIZE,
      f,
      hash,
      key,
      size
    )

    if (child === newChild) return this

    const canEdit = canEditNode(edit, this)
    let newChildren
    if (isEmptyNode(child) && !isEmptyNode(newChild)) {
      // add
      ++count
      newChildren = arrayUpdate(canEdit, frag, newChild, children)
    } else if (!isEmptyNode(child) && isEmptyNode(newChild)) {
      // remove
      --count
      if (count <= MIN_ARRAY_NODE) {
        return pack(edit, count, frag, children)
      }
      newChildren = arrayUpdate(canEdit, frag, new Empty<K, V>(), children)
    } else {
      // modify
      newChildren = arrayUpdate(canEdit, frag, newChild, children)
    }

    if (canEdit) {
      this.size = count
      this.children = newChildren
      return this
    }
    return new ArrayNode(edit, count, newChildren)
  }
}

function pack<K, V>(
  edit: number,
  count: number,
  removed: number,
  elements: Node<K, V>[]
) {
  const children = new Array<Node<K, V>>(count - 1)
  let g = 0
  let bitmap = 0
  for (let i = 0, len = elements.length; i < len; ++i) {
    if (i !== removed) {
      const elem = elements[i]
      if (elem && !isEmptyNode(elem)) {
        children[g++] = elem
        bitmap |= 1 << i
      }
    }
  }
  return new IndexedNode(edit, bitmap, children)
}

function expand<K, V>(
  edit: number,
  frag: number,
  child: Node<K, V>,
  bitmap: number,
  subNodes: Node<K, V>[]
) {
  const arr = []
  let bit = bitmap
  let count = 0
  for (let i = 0; bit; ++i) {
    if (bit & 1) arr[i] = subNodes[count++]
    bit >>>= 1
  }
  arr[frag] = child
  return new ArrayNode(edit, count + 1, arr)
}

function mergeLeaves<K, V>(
  edit: number,
  shift: number,
  h1: number,
  n1: Node<K, V>,
  h2: number,
  n2: Node<K, V>
): Node<K, V> {
  if (h1 === h2) return new CollisionNode(edit, h1, [n2, n1])

  const subH1 = hashFragment(shift, h1)
  const subH2 = hashFragment(shift, h2)
  return new IndexedNode(
    edit,
    toBitmap(subH1) | toBitmap(subH2),
    subH1 === subH2
      ? [mergeLeaves(edit, shift + SIZE, h1, n1, h2, n2)]
      : subH1 < subH2
      ? [n1, n2]
      : [n2, n1]
  )
}

export interface Config<K> {
  keyEq: KeyEq<K>
  hash: (k: K) => number
}

export class HashMap<K, V> {
  constructor(
    readonly editable: boolean,
    readonly edit: number,
    readonly config: Config<K>,
    public root: Node<K, V>,
    public size: number
  ) {}
}

export function make<K, V>(K: Hash<K> & Equal<K>) {
  return new HashMap<K, V>(
    false,
    0,
    {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      keyEq: (x, y) => K.equals!(y)(x),
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
export function tryGetHash_<K, V, D>(
  map: HashMap<K, V>,
  key: K,
  hash: number,
  alt: D
): V | D {
  let node = map.root
  let shift = 0
  const keyEq = map.config.keyEq

  // eslint-disable-next-line no-constant-condition
  while (true)
    switch (node._tag) {
      case "LeafNode": {
        return keyEq(key, node.key) && node.value ? node.value : alt
      }
      case "CollisionNode": {
        if (hash === node.hash) {
          const children = node.children
          for (let i = 0, len = children.length; i < len; ++i) {
            const child = children[i]
            if ("key" in child && keyEq(key, child.key)) return child.value || alt
          }
        }
        return alt
      }
      case "IndexedNode": {
        const frag = hashFragment(shift, hash)
        const bit = toBitmap(frag)
        if (node.mask & bit) {
          node = node.children[fromBitmap(node.mask, bit)]
          shift += SIZE
          break
        }
        return alt
      }
      case "ArrayNode": {
        node = node.children[hashFragment(shift, hash)]
        if (node) {
          shift += SIZE
          break
        }
        return alt
      }
      default:
        return alt
    }
}

/**
 * Lookup the value for `key` in `map` using custom hash.
 */
export function getHash_<K, V>(
  map: HashMap<K, V>,
  key: K,
  hash: number
): V | undefined {
  return tryGetHash_(map, key, hash, undefined)
}

/**
 * Lookup the value for `key` in `map` using internal hash function.
 */
export function get_<K, V>(map: HashMap<K, V>, key: K): V | undefined {
  return tryGetHash_(map, key, map.config.hash(key), undefined)
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
  return tryGetHash_(map, key, hash, nothing) !== nothing
}

/**
 * Does an entry exist for `key` in `map`? Uses internal hash function.
 */
export function has_<K, V>(map: HashMap<K, V>, key: K): boolean {
  return tryGetHash_(map, key, map.config.hash(key), nothing) !== nothing
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
) {
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
  return modifyHash_(map, key, hash, constant(value))
}

/**
 * Store `value` for `key` in `map` using internal hash function.
 */
export function set_<K, V>(map: HashMap<K, V>, key: K, value: V) {
  return modify_(map, key, constant(value))
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
  return modifyHash_(map, key, hash, constant(nothing))
}

/**
 *  Remove the entry for `key` in `map` using internal hash.
 */
export function remove_<K, V>(map: HashMap<K, V>, key: K) {
  return modifyHash_(map, key, map.config.hash(key), constant(nothing))
}

/**
 *  Remove the entry for `key` in `map` using internal hash.
 */
export function remove<K>(key: K) {
  return <V>(map: HashMap<K, V>) => remove_(map, key)
}
