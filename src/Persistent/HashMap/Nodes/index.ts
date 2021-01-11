import type { Equal } from "packages/system/src/Equal"

import * as O from "../../../Option"
import { arraySpliceIn, arraySpliceOut, arrayUpdate } from "../Array"
import { fromBitmap, hashFragment, toBitmap } from "../Bitwise"
import { MAX_INDEX_NODE, MIN_ARRAY_NODE, SIZE } from "../Config"

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
    const v = f(O.none)
    if (O.isNone(v)) return new Empty()
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

export type KeyEq<K> = Equal<K>["equals"]

export type UpdateFn<V> = (v: O.Option<V>) => O.Option<V>

export class LeafNode<K, V> {
  readonly _tag = "LeafNode"

  constructor(
    readonly edit: number,
    readonly hash: number,
    readonly key: K,
    public value: O.Option<V>
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
    if (keyEq(this.key)(key)) {
      const v = f(this.value)
      if (v === this.value) return this
      else if (O.isNone(v)) {
        --size.value
        return new Empty()
      }
      if (canEditNode(edit, this)) {
        this.value = v
        return this
      }
      return new LeafNode(edit, hash, key, v)
    }
    const v = f(O.none)
    if (O.isNone(v)) return this
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
    const v = f(O.none)
    if (O.isNone(v)) return this
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
      if ("key" in child && keyEq(child.key)(key)) {
        const value = child.value
        const newValue = f(value)
        if (newValue === value) return list
        if (O.isNone(newValue)) {
          --size.value
          return arraySpliceOut(mutate, i, list)
        }
        return arrayUpdate(mutate, i, new LeafNode(edit, hash, key, newValue), list)
      }
    }

    const newValue = f(O.none)
    if (O.isNone(newValue)) return list
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
