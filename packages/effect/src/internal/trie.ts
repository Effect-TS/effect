import * as Brand from "../Brand.js"
import * as Equal from "../Equal.js"
import { dual, pipe } from "../Function.js"
import * as Hash from "../Hash.js"
import { format, NodeInspectSymbol, toJSON } from "../Inspectable.js"
import { pipeArguments } from "../Pipeable.js"
import { hasProperty } from "../Predicate.js"
import type * as TR from "../Trie.js"
import * as Node from "./trie/node.js"

const TrieSymbolKey = "effect/Trie"

/** @internal */
export const TrieTypeId: TR.TypeId = Symbol.for(TrieSymbolKey) as TR.TypeId

/** @internal */
export type TrieKey = string & Brand.Brand<"TrieKey">

/** @internal */
export const TrieKey = Brand.nominal<TrieKey>()

/** @internal */
export interface TrieImpl<out V> extends TR.Trie<V> {
  readonly _root: Node.Node<V> | undefined
}

const trieVariance = {
  /* c8 ignore next */
  _Key: (_: any) => _,
  /* c8 ignore next */
  _Value: (_: never) => _
}

const TrieProto: TR.Trie<unknown> = {
  [TrieTypeId]: trieVariance,
  [Symbol.iterator]<V>(this: TrieImpl<V>): Iterator<[TrieKey, V]> {
    return new TrieIterator(this)
  },
  [Hash.symbol](): number {
    let hash = Hash.hash(TrieSymbolKey)
    for (const item of this) {
      hash ^= pipe(Hash.hash(item[0]), Hash.combine(Hash.hash(item[1])))
    }
    return hash
  },
  [Equal.symbol]<V>(this: TrieImpl<V>, that: unknown): boolean {
    if (isTrie(that)) {
      const entries = Array.from(that)
      return Array.from(this).every((itemSelf, i) => {
        const itemThat = entries[i]
        return Equal.equals(itemSelf[0], itemThat[0]) && Equal.equals(itemSelf[1], itemThat[1])
      })
    }
    return false
  },
  toString() {
    return format(this.toJSON())
  },
  toJSON() {
    return {
      _id: "Trie",
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

const makeImpl = <V>(root: Node.Node<V> | undefined): TrieImpl<V> => {
  const trie = Object.create(TrieProto)
  trie._root = root
  return trie
}

class TrieIterator<in out V> implements IterableIterator<[TrieKey, V]> {
  stack: Array<[Node.Node<V>, string]> = []

  constructor(readonly trie: TrieImpl<V>) {
    const root = trie._root != null ? trie._root : undefined
    if (root != null) {
      this.stack.push([root, ""])
    }
  }

  next(): IteratorResult<[TrieKey, V]> {
    while (this.stack.length > 0) {
      const [node, keyString] = this.stack.pop()!

      this.addToStack(node, keyString)

      if (node.value != null) {
        return { done: false, value: [TrieKey(keyString + node.key), node.value] }
      }
    }

    return { done: true, value: undefined }
  }

  addToStack(node: Node.Node<V>, keyString: string) {
    if (node.right != null) {
      this.stack.push([node.right, keyString])
    }
    if (node.left != null) {
      this.stack.push([node.left, keyString])
    }
    if (node.mid != null) {
      this.stack.push([node.mid, keyString + node.key])
    }
  }

  [Symbol.iterator](): IterableIterator<[TrieKey, V]> {
    return new TrieIterator(this.trie)
  }
}

/** @internal */
export const isTrie: {
  <V>(u: Iterable<readonly [string, V]>): u is TR.Trie<V>
  (u: unknown): u is TR.Trie<unknown>
} = (u: unknown): u is TR.Trie<unknown> => hasProperty(u, TrieTypeId)

/** @internal */
export const empty = <V = never>(): TR.Trie<V> => makeImpl<V>(undefined)

/** @internal */
export const fromIterable = <V>(entries: Iterable<readonly [string, V]>) => {
  let trie = empty<V>()
  for (const [key, value] of entries) {
    trie = insert(trie, key, value)
  }
  return trie
}

/** @internal */
export const insert = dual<
  <V>(key: string, value: V) => (self: TR.Trie<V>) => TR.Trie<V>,
  <V>(self: TR.Trie<V>, key: string, value: V) => TR.Trie<V>
>(3, <V>(self: TR.Trie<V>, key: string, value: V) => {
  if (key.length === 0) return self

  const n_stack: Array<Node.Node<V>> = []
  let n: Node.Node<V> = (self as TrieImpl<V>)._root ?? new Node.Node(key[0])
  let cIndex = 0

  while (cIndex < key.length) {
    const c = key[cIndex]
    n_stack.push(n)
    if (c > n.key) {
      if (n.right == null) {
        const newNode = new Node.Node<V>(c)
        n.right = newNode // ⛔️
        n = newNode
      } else {
        n = n.right
      }
    } else if (c < n.key) {
      if (n.left == null) {
        const newNode = new Node.Node<V>(c)
        n.left = newNode // ⛔️
        n = newNode
      } else {
        n = n.left
      }
    } else {
      if (cIndex === key.length - 1) {
        n.value = value
      } else if (n.mid == null) {
        const newNode = new Node.Node<V>(key[cIndex + 1])
        n.mid = newNode // ⛔️
        n = newNode
      } else {
        n = n.mid
      }

      cIndex += 1
    }
  }

  return makeImpl(n_stack[0])
})
