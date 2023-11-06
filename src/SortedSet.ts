/**
 * @since 2.0.0
 */
import * as Equal from "./Equal.js"
import * as Dual from "./Function.js"
import { pipe } from "./Function.js"
import * as Hash from "./Hash.js"
import type { Inspectable } from "./Inspectable.js"
import { NodeInspectSymbol, toJSON, toString } from "./Inspectable.js"
import type { Order } from "./Order.js"
import type { Pipeable } from "./Pipeable.js"
import { pipeArguments } from "./Pipeable.js"
import type { Predicate, Refinement } from "./Predicate.js"
import { hasProperty } from "./Predicate.js"
import * as RBT from "./RedBlackTree.js"

const TypeId: unique symbol = Symbol.for("effect/SortedSet")

/**
 * @since 2.0.0
 * @category symbol
 */
export type TypeId = typeof TypeId

/**
 * @since 2.0.0
 * @category models
 */
export interface SortedSet<A> extends Iterable<A>, Equal.Equal, Pipeable, Inspectable {
  readonly [TypeId]: {
    readonly _A: (_: never) => A
  }
  /** @internal */
  readonly keyTree: RBT.RedBlackTree<A, boolean>
}

const SortedSetProto: Omit<SortedSet<unknown>, "keyTree"> = {
  [TypeId]: {
    _A: (_: never) => _
  },
  [Hash.symbol]<A>(this: SortedSet<A>): number {
    return pipe(Hash.hash(this.keyTree), Hash.combine(Hash.hash(TypeId)))
  },
  [Equal.symbol]<A>(this: SortedSet<A>, that: unknown): boolean {
    return isSortedSet(that) && Equal.equals(this.keyTree, that.keyTree)
  },
  [Symbol.iterator]<A>(this: SortedSet<A>): Iterator<A> {
    return RBT.keys(this.keyTree)
  },
  toString<A>(this: SortedSet<A>) {
    return toString(this.toJSON())
  },
  toJSON() {
    return {
      _id: "SortedSet",
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

const fromTree = <A>(keyTree: RBT.RedBlackTree<A, boolean>): SortedSet<A> => {
  const a = Object.create(SortedSetProto)
  a.keyTree = keyTree
  return a
}

/**
 * @since 2.0.0
 * @category refinements
 */
export const isSortedSet: {
  <A>(u: Iterable<A>): u is SortedSet<A>
  (u: unknown): u is SortedSet<unknown>
} = (u: unknown): u is SortedSet<unknown> => hasProperty(u, TypeId)

/**
 * @since 2.0.0
 * @category constructors
 */
export const empty = <A>(O: Order<A>): SortedSet<A> => fromTree(RBT.empty(O))

/**
 * @since 2.0.0
 * @category constructors
 */
export const fromIterable = <K>(ord: Order<K>) => (iterable: Iterable<K>): SortedSet<K> =>
  fromTree(RBT.fromIterable<K, boolean>(ord)(Array.from(iterable).map((k) => [k, true])))

/**
 * @since 2.0.0
 * @category constructors
 */
export const make =
  <K>(ord: Order<K>) => <Entries extends ReadonlyArray<K>>(...entries: Entries): SortedSet<Entries[number]> =>
    fromIterable(ord)(entries)

/**
 * @since 2.0.0
 * @category elements
 */
export const add: {
  <A>(value: A): (self: SortedSet<A>) => SortedSet<A>
  <A>(self: SortedSet<A>, value: A): SortedSet<A>
} = Dual.dual<
  <A>(value: A) => (self: SortedSet<A>) => SortedSet<A>,
  <A>(self: SortedSet<A>, value: A) => SortedSet<A>
>(2, (self, value) =>
  RBT.has(self.keyTree, value)
    ? self
    : fromTree(RBT.insert(self.keyTree, value, true)))

/**
 * @since 2.0.0
 */
export const difference: {
  <A, B extends A>(that: Iterable<B>): (self: SortedSet<A>) => SortedSet<A>
  <A, B extends A>(self: SortedSet<A>, that: Iterable<B>): SortedSet<A>
} = Dual.dual<
  <A, B extends A>(that: Iterable<B>) => (self: SortedSet<A>) => SortedSet<A>,
  <A, B extends A>(self: SortedSet<A>, that: Iterable<B>) => SortedSet<A>
>(2, <A, B extends A>(self: SortedSet<A>, that: Iterable<B>) => {
  let out = self
  for (const value of that) {
    out = remove<A | B>(out, value)
  }
  return out
})

/**
 * Check if a predicate holds true for every `SortedSet` element.
 *
 * @since 2.0.0
 * @category elements
 */
export const every: {
  <A, B extends A>(refinement: Refinement<A, B>): (self: SortedSet<A>) => self is SortedSet<B>
  <A>(predicate: Predicate<A>): (self: SortedSet<A>) => boolean
  <A, B extends A>(self: SortedSet<A>, refinement: Refinement<A, B>): self is SortedSet<B>
  <A>(self: SortedSet<A>, predicate: Predicate<A>): boolean
} = Dual.dual(2, <A, B extends A>(self: SortedSet<A>, refinement: Refinement<A, B>): self is SortedSet<B> => {
  for (const value of self) {
    if (!refinement(value)) {
      return false
    }
  }
  return true
})

/**
 * @since 2.0.0
 * @category filtering
 */
export const filter: {
  <A, B extends A>(refinement: Refinement<A, B>): (self: SortedSet<A>) => SortedSet<B>
  <A>(predicate: Predicate<A>): (self: SortedSet<A>) => SortedSet<A>
  <A, B extends A>(self: SortedSet<A>, refinement: Refinement<A, B>): SortedSet<B>
  <A>(self: SortedSet<A>, predicate: Predicate<A>): SortedSet<A>
} = Dual.dual<
  {
    <A, B extends A>(refinement: Refinement<A, B>): (self: SortedSet<A>) => SortedSet<B>
    <A>(predicate: Predicate<A>): (self: SortedSet<A>) => SortedSet<A>
  },
  {
    <A, B extends A>(self: SortedSet<A>, refinement: Refinement<A, B>): SortedSet<B>
    <A>(self: SortedSet<A>, predicate: Predicate<A>): SortedSet<A>
  }
>(2, <A>(self: SortedSet<A>, predicate: Predicate<A>) => {
  const ord = RBT.getOrder(self.keyTree)
  let out = empty<A>(ord)
  for (const value of self) {
    if (predicate(value)) {
      out = add(out, value)
    }
  }
  return out
})

/**
 * @since 2.0.0
 * @category sequencing
 */
export const flatMap: {
  <B, A>(O: Order<B>, f: (a: A) => Iterable<B>): (self: SortedSet<A>) => SortedSet<B>
  <A, B>(self: SortedSet<A>, O: Order<B>, f: (a: A) => Iterable<B>): SortedSet<B>
} = Dual.dual<
  <B, A>(O: Order<B>, f: (a: A) => Iterable<B>) => (self: SortedSet<A>) => SortedSet<B>,
  <A, B>(self: SortedSet<A>, O: Order<B>, f: (a: A) => Iterable<B>) => SortedSet<B>
>(3, (self, O, f) => {
  let out = empty(O)
  forEach(self, (a) => {
    for (const b of f(a)) {
      out = add(out, b)
    }
  })
  return out
})

/**
 * @since 2.0.0
 * @category traversing
 */
export const forEach: {
  <A>(f: (a: A) => void): (self: SortedSet<A>) => void
  <A>(self: SortedSet<A>, f: (a: A) => void): void
} = Dual.dual<
  <A>(f: (a: A) => void) => (self: SortedSet<A>) => void,
  <A>(self: SortedSet<A>, f: (a: A) => void) => void
>(2, (self, f) => RBT.forEach(self.keyTree, f))

/**
 * @since 2.0.0
 * @category elements
 */
export const has: {
  <A>(value: A): (self: SortedSet<A>) => boolean
  <A>(self: SortedSet<A>, value: A): boolean
} = Dual.dual<
  <A>(value: A) => (self: SortedSet<A>) => boolean,
  <A>(self: SortedSet<A>, value: A) => boolean
>(2, (self, value) => RBT.has(self.keyTree, value))

/**
 * @since 2.0.0
 */
export const intersection: {
  <A>(that: Iterable<A>): (self: SortedSet<A>) => SortedSet<A>
  <A>(self: SortedSet<A>, that: Iterable<A>): SortedSet<A>
} = Dual.dual<
  <A>(that: Iterable<A>) => (self: SortedSet<A>) => SortedSet<A>,
  <A>(self: SortedSet<A>, that: Iterable<A>) => SortedSet<A>
>(2, (self, that) => {
  const ord = RBT.getOrder(self.keyTree)
  let out = empty(ord)
  for (const value of that) {
    if (has(self, value)) {
      out = add(out, value)
    }
  }
  return out
})

/**
 * @since 2.0.0
 * @category elements
 */
export const isSubset: {
  <A>(that: SortedSet<A>): (self: SortedSet<A>) => boolean
  <A>(self: SortedSet<A>, that: SortedSet<A>): boolean
} = Dual.dual<
  <A>(that: SortedSet<A>) => (self: SortedSet<A>) => boolean,
  <A>(self: SortedSet<A>, that: SortedSet<A>) => boolean
>(2, (self, that) => every(self, (a) => has(that, a)))

/**
 * @since 2.0.0
 * @category mapping
 */
export const map: {
  <B, A>(O: Order<B>, f: (a: A) => B): (self: SortedSet<A>) => SortedSet<B>
  <B, A>(self: SortedSet<A>, O: Order<B>, f: (a: A) => B): SortedSet<B>
} = Dual.dual<
  <B, A>(O: Order<B>, f: (a: A) => B) => (self: SortedSet<A>) => SortedSet<B>,
  <B, A>(self: SortedSet<A>, O: Order<B>, f: (a: A) => B) => SortedSet<B>
>(3, (self, O, f) => {
  let out = empty(O)
  forEach(self, (a) => {
    const b = f(a)
    if (!has(out, b)) {
      out = add(out, b)
    }
  })
  return out
})

/**
 * @since 2.0.0
 * @category filtering
 */
export const partition: {
  <C extends A, B extends A, A = C>(
    refinement: Refinement<A, B>
  ): (self: SortedSet<C>) => [SortedSet<Exclude<C, B>>, SortedSet<B>]
  <B extends A, A = B>(predicate: (a: A) => boolean): (self: SortedSet<B>) => [SortedSet<B>, SortedSet<B>]
  <C extends A, B extends A, A = C>(
    self: SortedSet<C>,
    refinement: Refinement<A, B>
  ): [SortedSet<Exclude<C, B>>, SortedSet<B>]
  <B extends A, A = B>(self: SortedSet<B>, predicate: (a: A) => boolean): [SortedSet<B>, SortedSet<B>]
} = Dual.dual(2, <A>(self: SortedSet<A>, predicate: Predicate<A>) => {
  const ord = RBT.getOrder(self.keyTree)
  let right = empty(ord)
  let left = empty(ord)
  for (const value of self) {
    if (predicate(value)) {
      right = add(right, value)
    } else {
      left = add(left, value)
    }
  }
  return [left, right] as const
})

/**
 * @since 2.0.0
 * @category elements
 */
export const remove: {
  <A>(value: A): (self: SortedSet<A>) => SortedSet<A>
  <A>(self: SortedSet<A>, value: A): SortedSet<A>
} = Dual.dual<
  <A>(value: A) => (self: SortedSet<A>) => SortedSet<A>,
  <A>(self: SortedSet<A>, value: A) => SortedSet<A>
>(2, (self, value) => fromTree(RBT.removeFirst(self.keyTree, value)))

/**
 * @since 2.0.0
 * @category getters
 */
export const size = <A>(self: SortedSet<A>): number => RBT.size(self.keyTree)

/**
 * Check if a predicate holds true for some `SortedSet` element.
 *
 * @since 2.0.0
 * @category elements
 */
export const some: {
  <A>(predicate: Predicate<A>): (self: SortedSet<A>) => boolean
  <A>(self: SortedSet<A>, predicate: Predicate<A>): boolean
} = Dual.dual<
  <A>(predicate: Predicate<A>) => (self: SortedSet<A>) => boolean,
  <A>(self: SortedSet<A>, predicate: Predicate<A>) => boolean
>(2, (self, predicate) => {
  for (const value of self) {
    if (predicate(value)) {
      return true
    }
  }
  return false
})

/**
 * @since 2.0.0
 * @category elements
 */
export const toggle: {
  <A>(value: A): (self: SortedSet<A>) => SortedSet<A>
  <A>(self: SortedSet<A>, value: A): SortedSet<A>
} = Dual.dual<
  <A>(value: A) => (self: SortedSet<A>) => SortedSet<A>,
  <A>(self: SortedSet<A>, value: A) => SortedSet<A>
>(2, (self, value) => has(self, value) ? remove(self, value) : add(self, value))

/**
 * @since 2.0.0
 */
export const union: {
  <A>(that: Iterable<A>): (self: SortedSet<A>) => SortedSet<A>
  <A>(self: SortedSet<A>, that: Iterable<A>): SortedSet<A>
} = Dual.dual<
  <A>(that: Iterable<A>) => (self: SortedSet<A>) => SortedSet<A>,
  <A>(self: SortedSet<A>, that: Iterable<A>) => SortedSet<A>
>(2, <A>(self: SortedSet<A>, that: Iterable<A>) => {
  const ord = RBT.getOrder(self.keyTree)
  let out = empty<A>(ord)
  for (const value of self) {
    out = add(value)(out)
  }
  for (const value of that) {
    out = add(value)(out)
  }
  return out
})

/**
 * @since 2.0.0
 * @category getters
 */
export const values = <A>(self: SortedSet<A>): IterableIterator<A> => RBT.keys(self.keyTree)
