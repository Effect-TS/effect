// copyright https://github.com/frptools

import { constant, identity } from "../../../../Function"
import type { ChangeFlag } from "../../../_internal/Core/ChangeFlag"
import { isObject, isUndefined } from "../../../_internal/Guards"
import { hash, isEqual, unwrap, unwrapKey } from "../../../_internal/Structural"
import type { AssociativeMap } from "../../../_internal/Types"
import { bitmapToIndex, hashFragment, SIZE, stringHash, toBitmap } from "../Common"
import type { HashMap } from "../HashMap"
import type { AnyNode, ArrayNode, IndexedNode, Leaf, LeafNode } from "../Nodes"
import { NodeType, NOTHING } from "../Nodes"

export function findHash(key: any): number {
  const hash: number =
    typeof key === "number"
      ? key
      : typeof key === "string"
      ? stringHash(key)
      : Math.abs(stringHash(JSON.stringify(key)))

  return hash
}

/**
 * Tries to find the value of a hash and key in a HashMap
 */
export function getHash<K, V, R>(
  defaultValue: R,
  hash: number,
  key: K,
  map: HashMap<K, V>
): V | R {
  let node = map._root
  let shift = 0

  // eslint-disable-next-line no-constant-condition
  while (true)
    switch (node.type) {
      case NodeType.LEAF: {
        return isEqual(key, (node as LeafNode<K, V>).key)
          ? (node as LeafNode<K, V>).value
          : defaultValue
      }

      case NodeType.INDEX: {
        const fragment = hashFragment(shift, hash)
        const bit = toBitmap(fragment)

        if ((node as IndexedNode<K, V>).mask & bit) {
          const i = bitmapToIndex((node as IndexedNode<K, V>).mask, bit)
          node = (node as IndexedNode<K, V>).children[i]
          shift += SIZE
          break
        }

        return defaultValue
      }

      case NodeType.ARRAY: {
        node = (node as ArrayNode<K, V>).children[hashFragment(shift, hash)]

        if (node) {
          shift += SIZE
          break
        }

        return defaultValue
      }

      case NodeType.COLLISION: {
        if (hash === node.hash) {
          const children = node.children

          for (let i = 0; i < children.length; ++i) {
            const child = children[i] as LeafNode<K, V>

            if (isEqual(key, child.key)) {
              return child.value
            }
          }
        }
        return defaultValue
      }

      default:
        return defaultValue
    }
}

export function iterator<K, V, R>(
  node: AnyNode<K, V>,
  f: (leaf: Leaf<K, V>) => R
): IterableIterator<R> {
  return new HashMapIterator<R>(lazyVisit(node, f, []))
}

class HashMapIterator<R> implements IterableIterator<R> {
  constructor(private _iterate: { value: R; rest: Array<any> }) {}

  public next(): IteratorResult<R> {
    if (!this._iterate) {
      return ({ done: true, value: null } as any) as IteratorResult<R>
    }

    const value = this._iterate.value
    const rest = this._iterate.rest

    this._iterate = continuation(rest)

    return { done: false, value }
  }

  public [Symbol.iterator]() {
    return this
  }
}

const continuation = (k: Array<any>): any =>
  k && lazyVisitChildren(k[0], k[1], k[2], k[3], k[4])

function lazyVisit<K, V, R>(
  node: AnyNode<K, V>,
  f: (leaf: Leaf<K, V>) => R,
  k: Array<any>
): any {
  switch (node.type) {
    case NodeType.LEAF:
      return { value: f(node), rest: k }

    case NodeType.COLLISION:
    case NodeType.ARRAY:
    case NodeType.INDEX: {
      const children = node.children
      return lazyVisitChildren(children.length, children, 0, f, k)
    }

    default:
      return continuation(k)
  }
}

function lazyVisitChildren<K, V, R>(
  length: number,
  children: Array<AnyNode<K, V>>,
  index: number,
  f: (leaf: Leaf<K, V>) => R,
  k: Array<any>
): { value: R; rest: Array<any> } {
  while (index < length) {
    const child = children[index++]
    if (child && notEmptyNode(child)) {
      return lazyVisit(child, f, [length, children, index, f, k])
    }
  }

  return continuation(k)
}

function notEmptyNode<K, V>(node: AnyNode<K, V>): boolean {
  return node && node.type !== NodeType.EMPTY
}

export function unwrapInto<K, V>(
  target: AssociativeMap<V>,
  map: HashMap<K, V>
): AssociativeMap<V> {
  const it = iterator(map._root, identity)
  let current: IteratorResult<Leaf<K, V>>
  while (!(current = it.next()).done) {
    const entry = current.value
    const value = entry.value
    target[unwrapKey(entry.key)] = isObject(value) ? unwrap<V>(value) : value
  }
  return target
}

export function fold<K, V, R>(
  f: (accum: R, value: V, key: K, index: number) => R,
  seed: R,
  map: HashMap<K, V>,
  cancelOnFalse?: boolean
): R {
  const node = map._root

  if (node.type === NodeType.EMPTY) {
    return seed
  }

  if (node.type === NodeType.LEAF) {
    return f(seed, node.value, node.key, 0)
  }

  const nodesToVisit = [node.children]

  let children,
    index = 0

  while ((!cancelOnFalse || <any>seed !== false) && (children = nodesToVisit.shift())) {
    for (
      let i = 0;
      i < children.length && (!cancelOnFalse || <any>seed !== false);
      ++i
    ) {
      const child = children[i]

      if (!child) continue

      if (child.type === NodeType.EMPTY) {
        continue
      } else if (child.type === NodeType.LEAF) {
        seed = f(seed, child.value, child.key, index++)
      } else {
        nodesToVisit.push(child.children)
      }
    }
  }

  return seed
}

export function setKeyValue<K, V>(
  key: K,
  value: V,
  change: ChangeFlag,
  map: HashMap<K, V>
): HashMap<K, V> {
  if (isUndefined(value)) {
    value = NOTHING as V
  }

  const hash_: number = hash(key)
  const newNode: AnyNode<K, V> = map._root.modify(
    map,
    change,
    0,
    constant(value),
    hash_,
    key
  )

  if (newNode !== map._root && !change.confirmed) {
    throw new Error(
      "Investigate how the root managed to change without the change flag being set"
    )
  }

  if (change.confirmed) {
    map._root = newNode
    map._size += change.delta
  }

  return map
}
