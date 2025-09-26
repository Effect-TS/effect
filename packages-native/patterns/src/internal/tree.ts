/**
 * Internal implementation for the `Tree` data structure.
 *
 * @since 0.0.0
 * @internal
 */
import * as Effect from "effect/Effect"
import * as Equal from "effect/Equal"
import * as Hash from "effect/Hash"
import type { Pipeable } from "effect/Pipeable"
import { pipeArguments } from "effect/Pipeable"

/** @internal */
export const TypeId: unique symbol = Symbol.for("@effect-native/patterns/Tree") as TypeId

/** @internal */
export type TypeId = typeof TypeId

interface TreeConfig<A> {
  readonly value: A
  readonly children?: Iterable<Tree<A>>
}

/** @internal */
export interface Tree<A> extends Pipeable, Equal.Equal, Iterable<A> {
  readonly [TypeId]: TypeId
  readonly value: A
  readonly children: ReadonlyArray<Tree<A>>
  readonly size: number
}

const equalsTree = <A>(self: Tree<A>, that: Tree<unknown>): boolean => {
  if (self.size !== that.size || self.children.length !== that.children.length) {
    return false
  }
  if (!Equal.equals(self.value, that.value)) {
    return false
  }
  for (let i = 0; i < self.children.length; i++) {
    if (!Equal.equals(self.children[i], that.children[i])) {
      return false
    }
  }
  return true
}

const hashTree = (self: Tree<unknown>): number => {
  let hash = Hash.hash(self.size)
  hash = Hash.combine(Hash.hash(self.value))(hash)
  for (const child of self.children) {
    hash = Hash.combine(Hash.hash(child))(hash)
  }
  return Hash.cached(self, hash)
}

const Proto = {
  [TypeId]: TypeId,
  pipe<A>(this: Tree<A>) {
    return pipeArguments(this, arguments)
  },
  [Equal.symbol]<A>(this: Tree<A>, that: unknown): boolean {
    return isTree(that) && equalsTree(this, that)
  },
  [Hash.symbol]<A>(this: Tree<A>): number {
    return hashTree(this)
  },
  [Symbol.iterator]<A>(this: Tree<A>) {
    return iterator(this)
  }
}

const iterator = function*<A>(self: Tree<A>): Generator<A> {
  yield self.value
  for (const child of self.children) {
    yield* iterator(child)
  }
}

const makeChildren = <A>(children?: Iterable<Tree<A>>): ReadonlyArray<Tree<A>> => {
  if (!children) {
    return []
  }
  return Array.from(children)
}

const calculateSize = <A>(children: ReadonlyArray<Tree<A>>): number => {
  let size = 1
  for (const child of children) {
    size += child.size
  }
  return size
}

const instantiate = <A>(config: TreeConfig<A>): Tree<A> => {
  const children = makeChildren(config.children)
  return Object.assign(Object.create(Proto), {
    value: config.value,
    children,
    size: calculateSize(children)
  })
}

/** @internal */
export const make = <A>(config: TreeConfig<A>): Tree<A> => instantiate(config)

/** @internal */
export const of = <A>(value: A): Tree<A> => make({ value })

/** @internal */
export const isTree = (u: unknown): u is Tree<unknown> => typeof u === "object" && u !== null && TypeId in u

/** @internal */
export const children = <A>(self: Tree<A>): ReadonlyArray<Tree<A>> => self.children

/** @internal */
export const toArray = <A>(self: Tree<A>): Array<A> => Array.from(self)

/** @internal */
export const appendChild = <A>(self: Tree<A>, child: Tree<A>): Tree<A> => {
  const children = self.children.concat(child)
  return instantiate({ value: self.value, children })
}

/** @internal */
export const map = <A, B>(self: Tree<A>, f: (value: A) => B): Tree<B> => {
  const mappedChildren = self.children.map((child) => map(child, f))
  return instantiate({ value: f(self.value), children: mappedChildren })
}

/** @internal */
export const reduce = <A, B>(self: Tree<A>, initial: B, f: (accumulator: B, value: A) => B): B => {
  let acc = f(initial, self.value)
  for (const child of self.children) {
    acc = reduce(child, acc, f)
  }
  return acc
}

/** @internal */
export const forEachEffect = <A, E, R>(
  self: Tree<A>,
  f: (value: A, indexPath: ReadonlyArray<number>) => Effect.Effect<void, E, R>
): Effect.Effect<void, E, R> => traverseEffect(self, f, [0])

const traverseEffect = <A, E, R>(
  self: Tree<A>,
  f: (value: A, indexPath: ReadonlyArray<number>) => Effect.Effect<void, E, R>,
  path: ReadonlyArray<number>
): Effect.Effect<void, E, R> =>
  Effect.gen(function*() {
    yield* f(self.value, path)
    for (let i = 0; i < self.children.length; i++) {
      yield* traverseEffect(self.children[i]!, f, [...path, i])
    }
  })
