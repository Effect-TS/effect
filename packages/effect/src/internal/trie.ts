import * as Equal from "../Equal.js"
import { dual, identity, pipe } from "../Function.js"
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

type TraversalMap<K, V, A> = (k: K, v: V) => A

type TraversalFilter<K, V> = (k: K, v: V) => boolean

/** @internal */
export interface TrieImpl<in out V> extends TR.Trie<V> {
  readonly _root: Node.Node<V> | undefined
  readonly _count: number
}

const trieVariance = {
  /* c8 ignore next */
  _Value: (_: unknown) => _
}

const TrieProto: TR.Trie<unknown> = {
  [TrieTypeId]: trieVariance,
  [Symbol.iterator]<V>(this: TrieImpl<V>): Iterator<[string, V]> {
    return new TrieIterator(this, (k, v) => [k, v], () => true)
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

class TrieIterator<in out V, out T> implements IterableIterator<T> {
  stack: Array<[Node.Node<V>, string]> = []

  constructor(
    readonly trie: TrieImpl<V>,
    readonly f: TraversalMap<string, V, T>,
    readonly filter: TraversalFilter<string, V>
  ) {
    const root = trie._root !== undefined ? trie._root : undefined
    if (root !== undefined) {
      this.stack.push([root, ""])
    }
  }

  next(): IteratorResult<T> {
    while (this.stack.length > 0) {
      const [node, keyString] = this.stack.pop()!

      this.addToStack(node, keyString)

      const value = node.value
      if (value !== undefined) {
        const key = keyString + node.key
        if (this.filter(key, value)) {
          return { done: false, value: this.f(key, value) }
        }
      }
    }

    return { done: true, value: undefined }
  }

  addToStack(node: Node.Node<V>, keyString: string) {
    if (node.right !== undefined) {
      this.stack.push([node.right, keyString])
    }
    if (node.left !== undefined) {
      this.stack.push([node.left, keyString])
    }
    if (node.mid !== undefined) {
      this.stack.push([node.mid, keyString + node.key])
    }
  }

  [Symbol.iterator](): IterableIterator<T> {
    return new TrieIterator(this.trie, this.f, this.filter)
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
export const make = <Entries extends Array<readonly [string, any]>>(...entries: Entries): TR.Trie<
  Entries[number] extends readonly [any, infer V] ? V : never
> => {
  return fromIterable(entries)
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
      if (n.right === undefined) {
        n = new Node.Node<V>(c, count)
      } else {
        n = n.right
      }
    } else if (c < n.key) {
      d_stack.push(-1)
      if (n.left === undefined) {
        n = new Node.Node<V>(c, count)
      } else {
        n = n.left
      }
    } else {
      if (cIndex === key.length - 1) {
        n.value = value
      } else if (n.mid === undefined) {
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
export const isEmpty = <V>(self: TR.Trie<V>): boolean => size(self) === 0

/** @internal */
export const keys = <V>(self: TR.Trie<V>): IterableIterator<string> =>
  new TrieIterator(self as TrieImpl<V>, (key) => key, () => true)

/** @internal */
export const values = <V>(self: TR.Trie<V>): IterableIterator<V> =>
  new TrieIterator(self as TrieImpl<V>, (_, value) => value, () => true)

/** @internal */
export const entries = <V>(self: TR.Trie<V>): IterableIterator<[string, V]> =>
  new TrieIterator(self as TrieImpl<V>, (key, value) => [key, value], () => true)

/** @internal */
export const reduce = dual<
  <Z, V>(
    zero: Z,
    f: (accumulator: Z, value: V, key: string) => Z
  ) => (self: TR.Trie<V>) => Z,
  <Z, V>(self: TR.Trie<V>, zero: Z, f: (accumulator: Z, value: V, key: string) => Z) => Z
>(3, (self, zero, f) => {
  let accumulator = zero
  for (const entry of self) {
    accumulator = f(accumulator, entry[1], entry[0])
  }
  return accumulator
})

/** @internal */
export const map = dual<
  <A, V>(f: (value: V, key: string) => A) => (self: TR.Trie<V>) => TR.Trie<A>,
  <V, A>(self: TR.Trie<V>, f: (value: V, key: string) => A) => TR.Trie<A>
>(2, (self, f) =>
  reduce(
    self,
    empty(),
    (trie, value, key) => insert(trie, key, f(value, key))
  ))

/** @internal */
export const filter: {
  <A, B extends A>(f: (a: A, k: string) => a is B): (self: TR.Trie<A>) => TR.Trie<B>
  <B extends A, A = B>(f: (a: A, k: string) => boolean): (self: TR.Trie<B>) => TR.Trie<B>
  <A, B extends A>(self: TR.Trie<A>, f: (a: A, k: string) => a is B): TR.Trie<B>
  <A>(self: TR.Trie<A>, f: (a: A, k: string) => boolean): TR.Trie<A>
} = dual(
  2,
  <A>(self: TR.Trie<A>, f: (a: A, k: string) => boolean): TR.Trie<A> =>
    reduce(
      self,
      empty(),
      (trie, value, key) => f(value, key) ? insert(trie, key, value) : trie
    )
)

/** @internal */
export const filterMap = dual<
  <A, B>(
    f: (value: A, key: string) => Option.Option<B>
  ) => (self: TR.Trie<A>) => TR.Trie<B>,
  <A, B>(self: TR.Trie<A>, f: (value: A, key: string) => Option.Option<B>) => TR.Trie<B>
>(2, (self, f) =>
  reduce(
    self,
    empty(),
    (trie, value, key) => {
      const option = f(value, key)
      return Option.isSome(option) ? insert(trie, key, option.value) : trie
    }
  ))

/** @internal */
export const compact = <A>(self: TR.Trie<Option.Option<A>>) => filterMap(self, identity)

/** @internal */
export const forEach = dual<
  <V>(f: (value: V, key: string) => void) => (self: TR.Trie<V>) => void,
  <V>(self: TR.Trie<V>, f: (value: V, key: string) => void) => void
>(2, (self, f) => reduce(self, void 0 as void, (_, value, key) => f(value, key)))

/** @internal */
export const keysWithPrefix = dual<
  (prefix: string) => <V>(self: TR.Trie<V>) => IterableIterator<string>,
  <V>(self: TR.Trie<V>, prefix: string) => IterableIterator<string>
>(
  2,
  <V>(self: TR.Trie<V>, prefix: string): IterableIterator<string> =>
    new TrieIterator(self as TrieImpl<V>, (key) => key, (key) => key.startsWith(prefix))
)

/** @internal */
export const valuesWithPrefix = dual<
  (prefix: string) => <V>(self: TR.Trie<V>) => IterableIterator<V>,
  <V>(self: TR.Trie<V>, prefix: string) => IterableIterator<V>
>(
  2,
  <V>(self: TR.Trie<V>, prefix: string): IterableIterator<V> =>
    new TrieIterator(self as TrieImpl<V>, (_, value) => value, (key) => key.startsWith(prefix))
)

/** @internal */
export const entriesWithPrefix = dual<
  (prefix: string) => <V>(self: TR.Trie<V>) => IterableIterator<[string, V]>,
  <V>(self: TR.Trie<V>, prefix: string) => IterableIterator<[string, V]>
>(
  2,
  <V>(self: TR.Trie<V>, prefix: string): IterableIterator<[string, V]> =>
    new TrieIterator(self as TrieImpl<V>, (key, value) => [key, value], (key) => key.startsWith(prefix))
)

/** @internal */
export const toEntriesWithPrefix = dual<
  (prefix: string) => <V>(self: TR.Trie<V>) => Array<[string, V]>,
  <V>(self: TR.Trie<V>, prefix: string) => Array<[string, V]>
>(
  2,
  <V>(self: TR.Trie<V>, prefix: string): Array<[string, V]> => Array.from(entriesWithPrefix(self, prefix))
)

/** @internal */
export const get = dual<
  (key: string) => <V>(self: TR.Trie<V>) => Option.Option<V>,
  <V>(self: TR.Trie<V>, key: string) => Option.Option<V>
>(
  2,
  <V>(self: TR.Trie<V>, key: string) => {
    let n: Node.Node<V> | undefined = (self as TrieImpl<V>)._root
    if (n === undefined || key.length === 0) return Option.none()
    let cIndex = 0
    while (cIndex < key.length) {
      const c = key[cIndex]
      if (c > n.key) {
        if (n.right === undefined) {
          return Option.none()
        } else {
          n = n.right
        }
      } else if (c < n.key) {
        if (n.left === undefined) {
          return Option.none()
        } else {
          n = n.left
        }
      } else {
        if (cIndex === key.length - 1) {
          if (n.value !== undefined) {
            return Option.some(n.value)
          }
        } else {
          if (n.mid === undefined) {
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
export const has = dual<
  (key: string) => <V>(self: TR.Trie<V>) => boolean,
  <V>(self: TR.Trie<V>, key: string) => boolean
>(2, (self, key) => Option.isSome(get(self, key)))

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
    if (n === undefined || key.length === 0) return self

    const count = n.count - 1
    // -1:left | 0:mid | 1:right
    const d_stack: Array<Ordering.Ordering> = []
    const n_stack: Array<Node.Node<V>> = []

    let cIndex = 0
    while (cIndex < key.length) {
      const c = key[cIndex]
      if (c > n.key) {
        if (n.right === undefined) {
          return self
        } else {
          n_stack.push(n)
          d_stack.push(1)
          n = n.right
        }
      } else if (c < n.key) {
        if (n.left === undefined) {
          return self
        } else {
          n_stack.push(n)
          d_stack.push(-1)
          n = n.left
        }
      } else {
        if (cIndex === key.length - 1) {
          if (n.value !== undefined) {
            n_stack.push(n)
            d_stack.push(0)
            cIndex += 1
          } else {
            return self
          }
        } else {
          if (n.mid === undefined) {
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
      const nc = child.left === undefined && child.mid === undefined && child.right === undefined ? undefined : child
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

/** @internal */
export const removeMany = dual<
  (keys: Iterable<string>) => <V>(self: TR.Trie<V>) => TR.Trie<V>,
  <V>(self: TR.Trie<V>, keys: Iterable<string>) => TR.Trie<V>
>(2, (self, keys) => {
  let trie = self
  for (const key of keys) {
    trie = remove(key)(trie)
  }
  return trie
})

/** @internal */
export const modify = dual<
  <V>(key: string, f: (v: V) => V) => (self: TR.Trie<V>) => TR.Trie<V>,
  <V>(self: TR.Trie<V>, key: string, f: (v: V) => V) => TR.Trie<V>
>(
  3,
  <V>(self: TR.Trie<V>, key: string, f: (v: V) => V): TR.Trie<V> => {
    let n: Node.Node<V> | undefined = (self as TrieImpl<V>)._root
    if (n === undefined || key.length === 0) return self

    // -1:left | 0:mid | 1:right
    const d_stack: Array<Ordering.Ordering> = []
    const n_stack: Array<Node.Node<V>> = []

    let cIndex = 0
    while (cIndex < key.length) {
      const c = key[cIndex]
      if (c > n.key) {
        if (n.right === undefined) {
          return self
        } else {
          n_stack.push(n)
          d_stack.push(1)
          n = n.right
        }
      } else if (c < n.key) {
        if (n.left === undefined) {
          return self
        } else {
          n_stack.push(n)
          d_stack.push(-1)
          n = n.left
        }
      } else {
        if (cIndex === key.length - 1) {
          if (n.value !== undefined) {
            n_stack.push(n)
            d_stack.push(0)
            cIndex += 1
          } else {
            return self
          }
        } else {
          if (n.mid === undefined) {
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

    const updateNode = n_stack[n_stack.length - 1]
    if (updateNode.value === undefined) {
      return self
    }

    n_stack[n_stack.length - 1] = new Node.Node(
      updateNode.key,
      updateNode.count,
      f(updateNode.value), // Update
      updateNode.left,
      updateNode.mid,
      updateNode.right
    )

    // Rebuild path to leaf node (Path-copying immutability)
    for (let s = n_stack.length - 2; s >= 0; --s) {
      const n2 = n_stack[s]
      const d = d_stack[s]
      const child = n_stack[s + 1]
      if (d === -1) {
        // left
        n_stack[s] = new Node.Node(
          n2.key,
          n2.count,
          n2.value,
          child,
          n2.mid,
          n2.right
        )
      } else if (d === 1) {
        // right
        n_stack[s] = new Node.Node(
          n2.key,
          n2.count,
          n2.value,
          n2.left,
          n2.mid,
          child
        )
      } else {
        // mid
        n_stack[s] = new Node.Node(
          n2.key,
          n2.count,
          n2.value,
          n2.left,
          child,
          n2.right
        )
      }
    }

    return makeImpl(n_stack[0])
  }
)

/** @internal */
export const longestPrefixOf = dual<
  (key: string) => <V>(self: TR.Trie<V>) => Option.Option<[string, V]>,
  <V>(self: TR.Trie<V>, key: string) => Option.Option<[string, V]>
>(
  2,
  <V>(self: TR.Trie<V>, key: string) => {
    let n: Node.Node<V> | undefined = (self as TrieImpl<V>)._root
    if (n === undefined || key.length === 0) return Option.none()
    let longestPrefixNode: [string, V] | undefined = undefined
    let cIndex = 0
    while (cIndex < key.length) {
      const c = key[cIndex]
      if (n.value !== undefined) {
        longestPrefixNode = [key.slice(0, cIndex + 1), n.value]
      }

      if (c > n.key) {
        if (n.right === undefined) {
          break
        } else {
          n = n.right
        }
      } else if (c < n.key) {
        if (n.left === undefined) {
          break
        } else {
          n = n.left
        }
      } else {
        if (n.mid === undefined) {
          break
        } else {
          n = n.mid
          cIndex += 1
        }
      }
    }

    return Option.fromNullable(longestPrefixNode)
  }
)
