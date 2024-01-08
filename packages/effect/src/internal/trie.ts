import * as Equal from "../Equal.js"
import { dual, pipe } from "../Function.js"
import * as Hash from "../Hash.js"
import { format, NodeInspectSymbol, toJSON } from "../Inspectable.js"
import * as Option from "../Option.js"
import type * as Ordering from "../Ordering.js"
import { pipeArguments } from "../Pipeable.js"
import { hasProperty } from "../Predicate.js"
import type * as TR from "../Trie.js"
import * as Node from "./trie/node.js"

const TrieSymbolKey = "effect/Trie"

/** @internal */
export const TrieTypeId: TR.TypeId = Symbol.for(TrieSymbolKey) as TR.TypeId

/** @internal */
export interface TrieImpl<out V> extends TR.Trie<V> {
  readonly _root: Node.Node<V> | undefined
  readonly _count: number
}

const trieVariance = {
  /* c8 ignore next */
  _Key: (_: any) => _,
  /* c8 ignore next */
  _Value: (_: never) => _
}

const TrieProto: TR.Trie<unknown> = {
  [TrieTypeId]: trieVariance,
  [Symbol.iterator]<V>(this: TrieImpl<V>): Iterator<[string, V]> {
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
  trie._count = root?.count ?? 0
  return trie
}

class TrieIterator<in out V> implements IterableIterator<[string, V]> {
  stack: Array<[Node.Node<V>, string]> = []

  constructor(readonly trie: TrieImpl<V>) {
    const root = trie._root != null ? trie._root : undefined
    if (root != null) {
      this.stack.push([root, ""])
    }
  }

  next(): IteratorResult<[string, V]> {
    while (this.stack.length > 0) {
      const [node, keyString] = this.stack.pop()!

      this.addToStack(node, keyString)

      if (node.value != null) {
        return { done: false, value: [keyString + node.key, node.value] }
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

  [Symbol.iterator](): IterableIterator<[string, V]> {
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

  // -1:left | 0:mid | 1:right
  const d_stack: Array<Ordering.Ordering> = []
  const n_stack: Array<Node.Node<V>> = []
  let n: Node.Node<V> = (self as TrieImpl<V>)._root ?? new Node.Node(key[0], 0)
  const count = n.count + 1
  let cIndex = 0

  while (cIndex < key.length) {
    const c = key[cIndex]
    n_stack.push(n)
    if (c > n.key) {
      d_stack.push(1)
      if (n.right == null) {
        n = new Node.Node<V>(c, count)
      } else {
        n = n.right
      }
    } else if (c < n.key) {
      d_stack.push(-1)
      if (n.left == null) {
        n = new Node.Node<V>(c, count)
      } else {
        n = n.left
      }
    } else {
      if (cIndex === key.length - 1) {
        n.value = value
      } else if (n.mid == null) {
        d_stack.push(0)
        n = new Node.Node<V>(key[cIndex + 1], count)
      } else {
        d_stack.push(0)
        n = n.mid
      }

      cIndex += 1
    }
  }

  // Rebuild path to leaf node (Path-copying immutability)
  for (let s = n_stack.length - 2; s >= 0; --s) {
    const n2 = n_stack[s]
    const d = d_stack[s]
    if (d === -1) {
      // left
      n_stack[s] = new Node.Node(
        n2.key,
        count,
        n2.value,
        n_stack[s + 1],
        n2.mid,
        n2.right
      )
    } else if (d === 1) {
      // right
      n_stack[s] = new Node.Node(
        n2.key,
        count,
        n2.value,
        n2.left,
        n2.mid,
        n_stack[s + 1]
      )
    } else {
      // mid
      n_stack[s] = new Node.Node(
        n2.key,
        count,
        n2.value,
        n2.left,
        n_stack[s + 1],
        n2.right
      )
    }
  }

  n_stack[0].count = count
  return makeImpl(n_stack[0])
})

/** @internal */
export const size = <V>(self: TR.Trie<V>): number => (self as TrieImpl<V>)._root?.count ?? 0

/** @internal */
export const get = dual<
  (key: string) => <V>(self: TR.Trie<V>) => Option.Option<V>,
  <V>(self: TR.Trie<V>, key: string) => Option.Option<V>
>(
  2,
  <V>(self: TR.Trie<V>, key: string) => {
    let n: Node.Node<V> | undefined = (self as TrieImpl<V>)._root
    if (n == null || key.length === 0) return Option.none()
    let cIndex = 0
    while (cIndex < key.length) {
      const c = key[cIndex]
      if (c > n.key) {
        if (n.right == null) {
          return Option.none()
        } else {
          n = n.right
        }
      } else if (c < n.key) {
        if (n.left == null) {
          return Option.none()
        } else {
          n = n.left
        }
      } else {
        if (cIndex === key.length - 1) {
          if (n.value != null) {
            return Option.some(n.value)
          }
        } else {
          if (n.mid == null) {
            return Option.none()
          } else {
            n = n.mid
            cIndex += 1
          }
        }
      }
    }
    return Option.none()
  }
)

/** @internal */
export const unsafeGet = dual<
  (key: string) => <V>(self: TR.Trie<V>) => V,
  <V>(self: TR.Trie<V>, key: string) => V
>(2, (self, key) => {
  const element = get(self, key)
  if (Option.isNone(element)) {
    throw new Error("Error: Expected trie to contain key")
  }
  return element.value
})

/** @internal */
export const remove = dual<
  (key: string) => <V>(self: TR.Trie<V>) => TR.Trie<V>,
  <V>(self: TR.Trie<V>, key: string) => TR.Trie<V>
>(
  2,
  <V>(self: TR.Trie<V>, key: string) => {
    let n: Node.Node<V> | undefined = (self as TrieImpl<V>)._root
    if (n == null || key.length === 0) return self

    const count = n.count - 1
    const n_stack: Array<Node.Node<V>> = []
    const d_stack: Array<Ordering.Ordering> = []

    let cIndex = 0
    while (cIndex < key.length) {
      const c = key[cIndex]
      if (c > n.key) {
        if (n.right == null) {
          return self
        } else {
          n_stack.push(n)
          d_stack.push(1)
          n = n.right
        }
      } else if (c < n.key) {
        if (n.left == null) {
          return self
        } else {
          n_stack.push(n)
          d_stack.push(-1)
          n = n.left
        }
      } else {
        if (cIndex === key.length - 1) {
          if (n.value != null) {
            n_stack.push(n)
            d_stack.push(0)
            cIndex += 1
          } else {
            return self
          }
        } else {
          if (n.mid == null) {
            return self
          } else {
            n_stack.push(n)
            d_stack.push(0)
            n = n.mid
            cIndex += 1
          }
        }
      }
    }

    const removeNode = n_stack[n_stack.length - 1]
    n_stack[n_stack.length - 1] = new Node.Node(
      removeNode.key,
      count,
      undefined, // Remove
      removeNode.left,
      removeNode.mid,
      removeNode.right
    )

    // Rebuild path to leaf node (Path-copying immutability)
    for (let s = n_stack.length - 2; s >= 0; --s) {
      const n2 = n_stack[s]
      const d = d_stack[s]
      const child = n_stack[s + 1]
      const nc = child.left == null && child.mid == null && child.right == null ? undefined : child
      if (d === -1) {
        // left
        n_stack[s] = new Node.Node(
          n2.key,
          count,
          n2.value,
          nc,
          n2.mid,
          n2.right
        )
      } else if (d === 1) {
        // right
        n_stack[s] = new Node.Node(
          n2.key,
          count,
          n2.value,
          n2.left,
          n2.mid,
          nc
        )
      } else {
        // mid
        n_stack[s] = new Node.Node(
          n2.key,
          count,
          n2.value,
          n2.left,
          nc,
          n2.right
        )
      }
    }

    n_stack[0].count = count
    return makeImpl(n_stack[0])
  }
)
