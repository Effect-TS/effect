/**
 * Internal linked-list utilities backing the public `List` API.
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
export const TypeId: unique symbol = Symbol.for("@effect-native/patterns/List") as TypeId

/** @internal */
export type TypeId = typeof TypeId

/** @internal */
export interface List<A> extends Pipeable, Equal.Equal {
  readonly [TypeId]: TypeId
  readonly isEmpty: boolean
  readonly size: number
  readonly head: A | undefined
  readonly tail: List<A>
}

const iterator = function*<A>(self: List<A>) {
  let current: List<A> = self
  while (!current.isEmpty) {
    yield current.head as A
    current = current.tail
  }
}

const equalsList = <A>(self: List<A>, that: List<unknown>): boolean => {
  if (self.size !== that.size) {
    return false
  }
  let left: List<A> = self
  let right: List<unknown> = that
  while (!left.isEmpty && !right.isEmpty) {
    if (!Equal.equals(left.head, right.head)) {
      return false
    }
    left = left.tail
    right = right.tail
  }
  return left.isEmpty === right.isEmpty
}

const hashList = (self: List<unknown>): number => {
  let hash = Hash.hash(self.size)
  let current: List<unknown> = self
  while (!current.isEmpty) {
    hash = Hash.combine(Hash.hash(current.head))(hash)
    current = current.tail
  }
  return Hash.cached(self, hash)
}

const Proto = {
  [TypeId]: TypeId,
  pipe<A>(this: List<A>) {
    return pipeArguments(this, arguments)
  },
  [Equal.symbol]<A>(this: List<A>, that: unknown): boolean {
    return isList(that) && equalsList(this, that)
  },
  [Hash.symbol]<A>(this: List<A>): number {
    return hashList(this)
  },
  [Symbol.iterator]<A>(this: List<A>) {
    return iterator(this)
  }
}

const Empty: List<never> = Object.create(Proto)
Object.defineProperties(Empty, {
  isEmpty: { value: true, enumerable: true },
  size: { value: 0, enumerable: true },
  head: { value: undefined, enumerable: true },
  tail: { value: Empty, enumerable: true }
})

const makeNode = <A>(value: A, tail: List<A>): List<A> =>
  Object.assign(Object.create(Proto), {
    isEmpty: false,
    size: tail.size + 1,
    head: value,
    tail
  })

/** @internal */
export const empty = <A = never>(): List<A> => Empty as List<A>

/** @internal */
export const isList = (u: unknown): u is List<unknown> => typeof u === "object" && u !== null && TypeId in u

/** @internal */
export const cons = <A>(self: List<A>, value: A): List<A> => makeNode(value, self)

/** @internal */
export const fromIterable = <A>(iterable: Iterable<A>): List<A> => {
  let result = empty<A>()
  for (const value of iterable) {
    result = makeNode(value, result)
  }
  return reverse(result)
}

/** @internal */
export const reverse = <A>(self: List<A>): List<A> => {
  let result = empty<A>()
  let current = self
  while (!current.isEmpty) {
    result = makeNode(current.head as A, result)
    current = current.tail
  }
  return result
}

/** @internal */
export const of = <A>(...values: ReadonlyArray<A>): List<A> => fromIterable(values)

/** @internal */
export const toArray = <A>(self: List<A>): Array<A> => {
  const out: Array<A> = []
  let current: List<A> = self
  while (!current.isEmpty) {
    out.push(current.head as A)
    current = current.tail
  }
  return out
}

/** @internal */
export const append = <A>(self: List<A>, value: A): List<A> => {
  if (self.isEmpty) {
    return makeNode(value, empty<A>())
  }
  const buffer = toArray(self)
  buffer.push(value)
  return fromIterable(buffer)
}

/** @internal */
export const map = <A, B>(self: List<A>, f: (value: A, index: number) => B): List<B> => {
  const values = toArray(self)
  const mapped = values.map((value, index) => f(value, index))
  return fromIterable(mapped)
}

/** @internal */
export const reduce = <A, B>(
  self: List<A>,
  initial: B,
  f: (accumulator: B, value: A, index: number) => B
): B => {
  let acc = initial
  let current: List<A> = self
  let index = 0
  while (!current.isEmpty) {
    acc = f(acc, current.head as A, index)
    current = current.tail
    index++
  }
  return acc
}

/** @internal */
export const forEachEffect = <A, E, R>(
  self: List<A>,
  f: (value: A, index: number) => Effect.Effect<void, E, R>
): Effect.Effect<void, E, R> =>
  Effect.gen(function*() {
    let current: List<A> = self
    let index = 0
    while (!current.isEmpty) {
      yield* f(current.head as A, index)
      current = current.tail
      index++
    }
  })
