/**
 * Red Black Tree
 *
 * Based on: https://github.com/mikolalysenko/functional-red-black-tree/blob/master/rbtree.js
 */
import { tuple } from "../../Function"
import * as O from "../../Option"
import type { Ord } from "../../Ord"
import type { Ordering } from "../../Ordering"
import { Stack } from "../../Stack"

type Color = "Red" | "Black"

class Node<K, V> {
  constructor(
    public color: Color,
    readonly key: K,
    readonly value: V,
    public left: Node<K, V> | undefined,
    public right: Node<K, V> | undefined,
    public count: number
  ) {}
}

//function cloneNode<K, V>(node: Node<K, V>) {
//  return new Node(node.color, node.key, node.value, node.left, node.right, node.count)
//}

function repaintNode<K, V>(node: Node<K, V>, color: Color) {
  return new Node(color, node.key, node.value, node.left, node.right, node.count)
}

function recountNode<K, V>(node: Node<K, V>) {
  node.count = 1 + (node.left?.count ?? 0) + (node.right?.count ?? 0)
}

export interface RedBlackTreeIterable<K, V> extends Iterable<readonly [K, V]> {
  [Symbol.iterator](): RedBlackTreeIterator<K, V>
}

export class RedBlackTree<K, V> implements Iterable<readonly [K, V]> {
  constructor(readonly ord: Ord<K>, readonly root: Node<K, V> | undefined) {}

  [Symbol.iterator](): RedBlackTreeIterator<K, V> {
    const stack: Node<K, V>[] = []
    let n = this.root
    while (n) {
      stack.push(n)
      n = n.left
    }
    return new RedBlackTreeIterator(this, stack, "Forward")
  }
}

/**
 * Creates a new Red-Black Tree
 */
export function make<K, V>(ord: Ord<K>) {
  return new RedBlackTree<K, V>(ord, undefined)
}

/**
 * Returns the length of the tree
 */
export function size<K, V>(self: RedBlackTree<K, V>) {
  return self.root?.count ?? 0
}

/**
 * Insert a new item into the tree
 */
export function insert_<K, V>(
  self: RedBlackTree<K, V>,
  key: K,
  value: V
): RedBlackTree<K, V> {
  const cmp = self.ord.compare
  //Find point to insert new node at
  let n: Node<K, V> | undefined = self.root
  const n_stack: Node<K, V>[] = []
  const d_stack: Ordering[] = []
  while (n) {
    const d = cmp(n.key)(key)
    n_stack.push(n)
    d_stack.push(d)
    if (d <= 0) {
      n = n.left
    } else {
      n = n.right
    }
  }
  //Rebuild path to leaf node
  n_stack.push(new Node("Red", key, value, undefined, undefined, 1))
  for (let s = n_stack.length - 2; s >= 0; --s) {
    const n2 = n_stack[s]!
    if (d_stack[s]! <= 0) {
      n_stack[s] = new Node(
        n2.color,
        n2.key,
        n2.value,
        n_stack[s + 1],
        n2.right,
        n2.count + 1
      )
    } else {
      n_stack[s] = new Node(
        n2.color,
        n2.key,
        n2.value,
        n2.left,
        n_stack[s + 1],
        n2.count + 1
      )
    }
  }
  //Rebalance tree using rotations
  for (let s = n_stack.length - 1; s > 1; --s) {
    const p = n_stack[s - 1]!
    const n3 = n_stack[s]!
    if (p.color === "Black" || n3.color === "Black") {
      break
    }
    const pp = n_stack[s - 2]!
    if (pp.left === p) {
      if (p.left === n3) {
        const y = pp.right
        if (y && y.color === "Red") {
          p.color = "Black"
          pp.right = repaintNode(y, "Black")
          pp.color = "Red"
          s -= 1
        } else {
          pp.color = "Red"
          pp.left = p.right
          p.color = "Black"
          p.right = pp
          n_stack[s - 2] = p
          n_stack[s - 1] = n3
          recountNode(pp)
          recountNode(p)
          if (s >= 3) {
            const ppp = n_stack[s - 3]!
            if (ppp.left === pp) {
              ppp.left = p
            } else {
              ppp.right = p
            }
          }
          break
        }
      } else {
        const y = pp.right
        if (y && y.color === "Red") {
          p.color = "Black"
          pp.right = repaintNode(y, "Black")
          pp.color = "Red"
          s -= 1
        } else {
          p.right = n3.left
          pp.color = "Red"
          pp.left = n3.right
          n3.color = "Black"
          n3.left = p
          n3.right = pp
          n_stack[s - 2] = n3
          n_stack[s - 1] = p
          recountNode(pp)
          recountNode(p)
          recountNode(n3)
          if (s >= 3) {
            const ppp = n_stack[s - 3]!
            if (ppp.left === pp) {
              ppp.left = n3
            } else {
              ppp.right = n3
            }
          }
          break
        }
      }
    } else {
      if (p.right === n3) {
        const y = pp.left
        if (y && y.color === "Red") {
          p.color = "Black"
          pp.left = repaintNode(y, "Black")
          pp.color = "Red"
          s -= 1
        } else {
          pp.color = "Red"
          pp.right = p.left
          p.color = "Black"
          p.left = pp
          n_stack[s - 2] = p
          n_stack[s - 1] = n3
          recountNode(pp)
          recountNode(p)
          if (s >= 3) {
            const ppp = n_stack[s - 3]!
            if (ppp.right === pp) {
              ppp.right = p
            } else {
              ppp.left = p
            }
          }
          break
        }
      } else {
        const y = pp.left
        if (y && y.color === "Red") {
          p.color = "Black"
          pp.left = repaintNode(y, "Black")
          pp.color = "Red"
          s -= 1
        } else {
          p.left = n3.right
          pp.color = "Red"
          pp.right = n3.left
          n3.color = "Black"
          n3.right = p
          n3.left = pp
          n_stack[s - 2] = n3
          n_stack[s - 1] = p
          recountNode(pp)
          recountNode(p)
          recountNode(n3)
          if (s >= 3) {
            const ppp = n_stack[s - 3]!
            if (ppp.right === pp) {
              ppp.right = n3
            } else {
              ppp.left = n3
            }
          }
          break
        }
      }
    }
  }
  //Return new tree
  n_stack[0]!.color = "Black"
  return new RedBlackTree(self.ord, n_stack[0])
}

/**
 * Insert a new item into the tree
 */
export function insert<K, V>(key: K, value: V) {
  return (self: RedBlackTree<K, V>) => insert_(self, key, value)
}

/**
 * Visit all nodes inorder until a Some is returned
 */
export function visitFull<K, V, A>(
  node: Node<K, V>,
  visit: (key: K, value: V) => O.Option<A>
): O.Option<A> {
  let current: Node<K, V> | undefined = node
  let stack: Stack<Node<K, V>> | undefined = undefined
  let done = false

  while (!done) {
    if (current) {
      stack = new Stack(current, stack)
      current = current.left
    } else if (stack) {
      const v = visit(stack.value.key, stack.value.value)

      if (O.isSome(v)) {
        return v
      }

      current = stack.value.right
      stack = stack.previous
    } else {
      done = true
    }
  }

  return O.none
}

/**
 * Visit each node of the tree in order
 */
export function forEach_<K, V>(
  self: RedBlackTree<K, V>,
  visit: (key: K, value: V) => void
) {
  if (self.root) {
    visitFull(self.root, (key, value) => {
      visit(key, value)
      return O.none
    })
  }
}

/**
 * Visit each node of the tree in order
 */
export function forEach<K, V>(visit: (key: K, value: V) => void) {
  return (self: RedBlackTree<K, V>) => forEach_(self, visit)
}

export type Direction = "Forward" | "Backward"

/**
 * Stateful iterator
 */
export class RedBlackTreeIterator<K, V> implements Iterator<readonly [K, V]> {
  private count = 0

  constructor(
    readonly self: RedBlackTree<K, V>,
    readonly stack: Node<K, V>[],
    readonly direction: Direction
  ) {}

  /**
   * Clones the iterator
   */
  clone(): RedBlackTreeIterator<K, V> {
    return new RedBlackTreeIterator(this.self, this.stack.slice(), this.direction)
  }

  /**
   * Reverse the traversal direction
   */
  reversed(): RedBlackTreeIterator<K, V> {
    return new RedBlackTreeIterator(
      this.self,
      this.stack.slice(),
      this.direction === "Forward" ? "Backward" : "Forward"
    )
  }

  next(): IteratorResult<readonly [K, V]> {
    const entry = this.entry
    this.count++
    if (this.direction === "Forward") {
      this.moveNext()
    } else {
      this.movePrev()
    }
    return O.fold_(
      entry,
      () => ({ done: true, value: this.count }),
      (kv) => ({ done: false, value: kv })
    )
  }

  /**
   * Returns the key
   */
  get key(): O.Option<K> {
    if (this.stack.length > 0) {
      return O.some(this.stack[this.stack.length - 1]!.key)
    }
    return O.none
  }

  /**
   * Returns the value
   */
  get value(): O.Option<V> {
    if (this.stack.length > 0) {
      return O.some(this.stack[this.stack.length - 1]!.value)
    }
    return O.none
  }

  /**
   * Returns the key
   */
  get entry(): O.Option<readonly [K, V]> {
    if (this.stack.length > 0) {
      return O.some([
        this.stack[this.stack.length - 1]!.key,
        this.stack[this.stack.length - 1]!.value
      ])
    }
    return O.none
  }

  /**
   * Returns the position of this iterator in the sorted list
   */
  get index(): number {
    let idx = 0
    const stack = this.stack
    if (stack.length === 0) {
      const r = this.self.root
      if (r) {
        return r.count
      }
      return 0
    } else if (stack[stack.length - 1]!.left) {
      idx = stack[stack.length - 1]!.left!.count
    }
    for (let s = stack.length - 2; s >= 0; --s) {
      if (stack[s + 1] === stack[s]!.right) {
        ++idx
        if (stack[s]!.left) {
          idx += stack[s]!.left!.count
        }
      }
    }
    return idx
  }

  /**
   * Advances iterator to next element in list
   */
  moveNext() {
    const stack = this.stack
    if (stack.length === 0) {
      return
    }
    let n: Node<K, V> | undefined = stack[stack.length - 1]!
    if (n.right) {
      n = n.right
      while (n) {
        stack.push(n)
        n = n.left
      }
    } else {
      stack.pop()
      while (stack.length > 0 && stack[stack.length - 1]!.right === n) {
        n = stack[stack.length - 1]
        stack.pop()
      }
    }
  }

  /**
   * Checks if there is a next element
   */
  get hasNext() {
    const stack = this.stack
    if (stack.length === 0) {
      return false
    }
    if (stack[stack.length - 1]!.right) {
      return true
    }
    for (let s = stack.length - 1; s > 0; --s) {
      if (stack[s - 1]!.left === stack[s]) {
        return true
      }
    }
    return false
  }

  /**
   * Advances iterator to previous element in list
   */
  movePrev() {
    const stack = this.stack
    if (stack.length === 0) {
      return
    }
    let n = stack[stack.length - 1]
    if (n && n.left) {
      n = n.left
      while (n) {
        stack.push(n)
        n = n.right
      }
    } else {
      stack.pop()
      while (stack.length > 0 && stack[stack.length - 1]!.left === n) {
        n = stack[stack.length - 1]
        stack.pop()
      }
    }
  }

  /**
   * Checks if there is a previous element
   */
  get hasPrev() {
    const stack = this.stack
    if (stack.length === 0) {
      return false
    }
    if (stack[stack.length - 1]!.left) {
      return true
    }
    for (let s = stack.length - 1; s > 0; --s) {
      if (stack[s - 1]!.right === stack[s]) {
        return true
      }
    }
    return false
  }
}

/**
 * Returns the first entry in the tree
 */
export function getFirst<K, V>(tree: RedBlackTree<K, V>): O.Option<readonly [K, V]> {
  let n: Node<K, V> | undefined = tree.root
  let c: Node<K, V> | undefined = tree.root
  while (n) {
    c = n
    n = n.left
  }
  return c ? O.some(tuple(c.key, c.value)) : O.none
}

/**
 * Returns the last entry in the tree
 */
export function getLast<K, V>(tree: RedBlackTree<K, V>): O.Option<readonly [K, V]> {
  let n: Node<K, V> | undefined = tree.root
  let c: Node<K, V> | undefined = tree.root
  while (n) {
    c = n
    n = n.right
  }
  return c ? O.some(tuple(c.key, c.value)) : O.none
}

/**
 * Returns an iterator that points to the element i of the tree
 */
export function at_<K, V>(
  tree: RedBlackTree<K, V>,
  idx: number,
  direction: Direction = "Forward"
): RedBlackTreeIterable<K, V> {
  return {
    [Symbol.iterator]: () => {
      if (idx < 0) {
        return new RedBlackTreeIterator(tree, [], direction)
      }
      let n = tree.root
      const stack: Node<K, V>[] = []
      while (n) {
        stack.push(n)
        if (n.left) {
          if (idx < n.left.count) {
            n = n.left
            continue
          }
          idx -= n.left.count
        }
        if (!idx) {
          return new RedBlackTreeIterator(tree, stack, direction)
        }
        idx -= 1
        if (n.right) {
          if (idx >= n.right.count) {
            break
          }
          n = n.right
        } else {
          break
        }
      }
      return new RedBlackTreeIterator(tree, [], direction)
    }
  }
}

/**
 * Returns an iterator that points to the element i of the tree
 */
export function at(idx: number) {
  return <K, V>(tree: RedBlackTree<K, V>) => at_(tree, idx)
}

/**
 * Returns an iterator that traverse entries with keys less or equal then key
 */
export function le_<K, V>(
  tree: RedBlackTree<K, V>,
  key: K,
  direction: Direction = "Forward"
): RedBlackTreeIterable<K, V> {
  return {
    [Symbol.iterator]: () => {
      const cmp = tree.ord.compare
      let n = tree.root
      const stack = []
      let last_ptr = 0
      while (n) {
        const d = cmp(n.key)(key)
        stack.push(n)
        if (d <= 0) {
          last_ptr = stack.length
        }
        if (d <= 0) {
          n = n.left
        } else {
          n = n.right
        }
      }
      stack.length = last_ptr
      return new RedBlackTreeIterator(tree, stack, direction)
    }
  }
}

/**
 * Returns an iterator that traverse entries with keys less or equal then key
 */
export function le<K, V>(
  key: K,
  direction: Direction = "Forward"
): (tree: RedBlackTree<K, V>) => RedBlackTreeIterable<K, V> {
  return (tree) => le_(tree, key, direction)
}

/**
 * Traverse the tree backwards
 */
export function backwards<K, V>(self: RedBlackTree<K, V>): RedBlackTreeIterable<K, V> {
  return {
    [Symbol.iterator]: () => {
      const stack: Node<K, V>[] = []
      let n = self.root
      while (n) {
        stack.push(n)
        n = n.right
      }
      return new RedBlackTreeIterator(self, stack, "Backward")
    }
  }
}

/**
 * Get the values of the tree
 */
export function values_<K, V>(
  self: RedBlackTree<K, V>,
  direction: Direction = "Forward"
): Iterable<V> {
  return {
    [Symbol.iterator]: () => {
      const begin = self[Symbol.iterator]()
      let count = 0
      return {
        next: (): IteratorResult<V> => {
          count++
          const entry = begin.value
          if (direction === "Forward") {
            begin.moveNext()
          } else {
            begin.movePrev()
          }
          return O.fold_(
            entry,
            () => ({ value: count, done: true }),
            (entry) => ({ value: entry, done: false })
          )
        }
      }
    }
  }
}

/**
 * Get the values of the tree
 */
export function values(
  direction: Direction = "Forward"
): <K, V>(self: RedBlackTree<K, V>) => Iterable<V> {
  return (self) => values_(self, direction)
}

/**
 * Get the keys of the tree
 */
export function keys_<K, V>(
  self: RedBlackTree<K, V>,
  direction: Direction = "Forward"
): Iterable<K> {
  return {
    [Symbol.iterator]: () => {
      const begin = self[Symbol.iterator]()
      let count = 0

      return {
        next: (): IteratorResult<K> => {
          count++
          const entry = begin.key
          if (direction === "Forward") {
            begin.moveNext()
          } else {
            begin.movePrev()
          }
          return O.fold_(
            entry,
            () => ({ value: count, done: true }),
            (entry) => ({ value: entry, done: false })
          )
        }
      }
    }
  }
}

/**
 * Get the keys of the tree
 */
export function keys(
  direction: Direction = "Forward"
): <K, V>(self: RedBlackTree<K, V>) => Iterable<K> {
  return (self) => keys_(self, direction)
}
