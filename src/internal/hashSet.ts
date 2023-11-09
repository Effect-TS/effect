import { Equal } from "../exports/Equal.js"
import { dual } from "../exports/Function.js"
import { Hash } from "../exports/Hash.js"
import type { HashMap } from "../exports/HashMap.js"
import type { HashSet as HS } from "../exports/HashSet.js"
import { NodeInspectSymbol, toJSON, toString } from "../exports/Inspectable.js"
import { pipeArguments } from "../exports/Pipeable.js"
import type { Predicate, Refinement } from "../exports/Predicate.js"
import { hasProperty } from "../exports/Predicate.js"
import * as HM from "./hashMap.js"

/** @internal */
export const HashSetTypeId: HS.TypeId = Symbol.for("effect/HashSet") as HS.TypeId

/** @internal */
export interface HashSetImpl<A> extends HS<A> {
  readonly _keyMap: HashMap<A, unknown>
}

const HashSetProto: Omit<HashSetImpl<unknown>, "_keyMap"> = {
  [HashSetTypeId]: HashSetTypeId,
  [Symbol.iterator]<A>(this: HashSetImpl<A>): Iterator<A> {
    return HM.keys(this._keyMap)
  },
  [Hash.symbol]<A>(this: HashSetImpl<A>): number {
    return Hash.combine(Hash.hash(this._keyMap))(Hash.hash("HashSet"))
  },
  [Equal.symbol]<A>(this: HashSetImpl<A>, that: unknown): boolean {
    if (isHashSet(that)) {
      return (
        HM.size(this._keyMap) === HM.size((that as HashSetImpl<A>)._keyMap) &&
        Equal.equals(this._keyMap, (that as HashSetImpl<A>)._keyMap)
      )
    }
    return false
  },
  toString() {
    return toString(this.toJSON())
  },
  toJSON() {
    return {
      _id: "HashSet",
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

/** @internal */
export const makeImpl = <A>(keyMap: HashMap<A, unknown>): HashSetImpl<A> => {
  const set = Object.create(HashSetProto)
  set._keyMap = keyMap
  return set
}

/** @internal */
export const isHashSet: {
  <A>(u: Iterable<A>): u is HS<A>
  (u: unknown): u is HS<unknown>
} = (u: unknown): u is HS<unknown> => hasProperty(u, HashSetTypeId)

const _empty = makeImpl<never>(HM.empty())

/** @internal */
export const empty = <A = never>(): HS<A> => _empty

/** @internal */
export const fromIterable = <A>(elements: Iterable<A>): HS<A> => {
  const set = beginMutation(empty<A>())
  for (const value of elements) {
    add(set, value)
  }
  return endMutation(set)
}

/** @internal */
export const make = <As extends ReadonlyArray<any>>(...elements: As): HS<As[number]> => {
  const set = beginMutation(empty<As[number]>())
  for (const value of elements) {
    add(set, value)
  }
  return endMutation(set)
}

/** @internal */
export const has = dual<
  <A>(value: A) => (self: HS<A>) => boolean,
  <A>(self: HS<A>, value: A) => boolean
>(2, <A>(self: HS<A>, value: A) => HM.has((self as HashSetImpl<A>)._keyMap, value))

/** @internal */
export const some = dual<
  <A>(f: Predicate<A>) => (self: HS<A>) => boolean,
  <A>(self: HS<A>, f: Predicate<A>) => boolean
>(2, (self, f) => {
  let found = false
  for (const value of self) {
    found = f(value)
    if (found) {
      break
    }
  }
  return found
})

/** @internal */
export const every: {
  <A, B extends A>(refinement: Refinement<A, B>): (self: HS<A>) => self is HS<B>
  <A>(predicate: Predicate<A>): (self: HS<A>) => boolean
  <A, B extends A>(self: HS<A>, refinement: Refinement<A, B>): self is HS<B>
  <A>(self: HS<A>, predicate: Predicate<A>): boolean
} = dual(
  2,
  <A, B extends A>(self: HS<A>, refinement: Refinement<A, B>): self is HS<B> => !some(self, (a) => !refinement(a))
)

/** @internal */
export const isSubset = dual<
  <A>(that: HS<A>) => (self: HS<A>) => boolean,
  <A>(self: HS<A>, that: HS<A>) => boolean
>(2, (self, that) => every(self, (value) => has(that, value)))

/** @internal */
export const values = <A>(self: HS<A>): IterableIterator<A> => HM.keys((self as HashSetImpl<A>)._keyMap)

/** @internal */
export const size = <A>(self: HS<A>): number => HM.size((self as HashSetImpl<A>)._keyMap)

/** @internal */
export const beginMutation = <A>(self: HS<A>): HS<A> => makeImpl(HM.beginMutation((self as HashSetImpl<A>)._keyMap))

/** @internal */
export const endMutation = <A>(self: HS<A>): HS<A> => {
  ;((self as HashSetImpl<A>)._keyMap as HM.HashMapImpl<A, unknown>)._editable = false
  return self
}

/** @internal */
export const mutate = dual<
  <A>(f: (set: HS<A>) => void) => (self: HS<A>) => HS<A>,
  <A>(self: HS<A>, f: (set: HS<A>) => void) => HS<A>
>(2, (self, f) => {
  const transient = beginMutation(self)
  f(transient)
  return endMutation(transient)
})

/** @internal */
export const add = dual<
  <A>(value: A) => (self: HS<A>) => HS<A>,
  <A>(self: HS<A>, value: A) => HS<A>
>(
  2,
  <A>(self: HS<A>, value: A) =>
    ((self as HashSetImpl<A>)._keyMap as HM.HashMapImpl<A, unknown>)._editable
      ? (HM.set(value as A, true as unknown)((self as HashSetImpl<A>)._keyMap), self)
      : makeImpl(HM.set(value as A, true as unknown)((self as HashSetImpl<A>)._keyMap))
)

/** @internal */
export const remove = dual<
  <A>(value: A) => (self: HS<A>) => HS<A>,
  <A>(self: HS<A>, value: A) => HS<A>
>(
  2,
  <A>(self: HS<A>, value: A) =>
    (((self as HashSetImpl<A>)._keyMap) as HM.HashMapImpl<A, unknown>)._editable
      ? (HM.remove(value)((self as HashSetImpl<A>)._keyMap), self)
      : makeImpl(HM.remove(value)((self as HashSetImpl<A>)._keyMap))
)

/** @internal */
export const difference = dual<
  <A>(that: Iterable<A>) => (self: HS<A>) => HS<A>,
  <A>(self: HS<A>, that: Iterable<A>) => HS<A>
>(2, (self, that) =>
  mutate(self, (set) => {
    for (const value of that) {
      remove(set, value)
    }
  }))

/** @internal */
export const intersection = dual<
  <A>(that: Iterable<A>) => (self: HS<A>) => HS<A>,
  <A>(self: HS<A>, that: Iterable<A>) => HS<A>
>(2, (self, that) =>
  mutate(empty(), (set) => {
    for (const value of that) {
      if (has(value)(self)) {
        add(value)(set)
      }
    }
  }))

/** @internal */
export const union = dual<
  <A>(that: Iterable<A>) => (self: HS<A>) => HS<A>,
  <A>(self: HS<A>, that: Iterable<A>) => HS<A>
>(2, (self, that) =>
  mutate(empty(), (set) => {
    forEach(self, (value) => add(set, value))
    for (const value of that) {
      add(set, value)
    }
  }))

/** @internal */
export const toggle = dual<
  <A>(value: A) => (self: HS<A>) => HS<A>,
  <A>(self: HS<A>, value: A) => HS<A>
>(2, (self, value) => has(self, value) ? remove(self, value) : add(self, value))

/** @internal */
export const map = dual<
  <A, B>(f: (a: A) => B) => (self: HS<A>) => HS<B>,
  <A, B>(self: HS<A>, f: (a: A) => B) => HS<B>
>(2, (self, f) =>
  mutate(empty(), (set) => {
    forEach(self, (a) => {
      const b = f(a)
      if (!has(set, b)) {
        add(set, b)
      }
    })
  }))

/** @internal */
export const flatMap = dual<
  <A, B>(f: (a: A) => Iterable<B>) => (self: HS<A>) => HS<B>,
  <A, B>(self: HS<A>, f: (a: A) => Iterable<B>) => HS<B>
>(2, (self, f) =>
  mutate(empty(), (set) => {
    forEach(self, (a) => {
      for (const b of f(a)) {
        if (!has(set, b)) {
          add(set, b)
        }
      }
    })
  }))

/** @internal */
export const forEach = dual<
  <A>(f: (value: A) => void) => (self: HS<A>) => void,
  <A>(self: HS<A>, f: (value: A) => void) => void
>(2, <A>(self: HS<A>, f: (value: A) => void) =>
  HM.forEach(
    (self as HashSetImpl<A>)._keyMap,
    (_, k) => f(k)
  ))

/** @internal */
export const reduce = dual<
  <A, Z>(zero: Z, f: (accumulator: Z, value: A) => Z) => (self: HS<A>) => Z,
  <A, Z>(self: HS<A>, zero: Z, f: (accumulator: Z, value: A) => Z) => Z
>(3, <A, Z>(self: HS<A>, zero: Z, f: (accumulator: Z, value: A) => Z) =>
  HM.reduce(
    (self as HashSetImpl<A>)._keyMap,
    zero,
    (z, _, a) => f(z, a)
  ))

/** @internal */
export const filter = dual<
  {
    <A, B extends A>(f: Refinement<A, B>): (self: HS<A>) => HS<B>
    <A>(f: Predicate<A>): (self: HS<A>) => HS<A>
  },
  {
    <A, B extends A>(self: HS<A>, f: Refinement<A, B>): HS<B>
    <A>(self: HS<A>, f: Predicate<A>): HS<A>
  }
>(2, <A>(self: HS<A>, f: Predicate<A>) => {
  return mutate(empty(), (set) => {
    const iterator = values(self)
    let next: IteratorResult<A, any>
    while (!(next = iterator.next()).done) {
      const value = next.value
      if (f(value)) {
        add(set, value)
      }
    }
  })
})

/** @internal */
export const partition: {
  <C extends A, B extends A, A = C>(
    refinement: Refinement<A, B>
  ): (self: HS<C>) => [HS<Exclude<C, B>>, HS<B>]
  <B extends A, A = B>(predicate: (a: A) => boolean): (self: HS<B>) => [HS<B>, HS<B>]
  <C extends A, B extends A, A = C>(
    self: HS<C>,
    refinement: Refinement<A, B>
  ): [HS<Exclude<C, B>>, HS<B>]
  <B extends A, A = B>(self: HS<B>, predicate: (a: A) => boolean): [HS<B>, HS<B>]
} = dual(2, <A>(self: HS<A>, f: Predicate<A>) => {
  const iterator = values(self)
  let next: IteratorResult<A, any>
  const right = beginMutation(empty<A>())
  const left = beginMutation(empty<A>())
  while (!(next = iterator.next()).done) {
    const value = next.value
    if (f(value)) {
      add(right, value)
    } else {
      add(left, value)
    }
  }
  return [endMutation(left), endMutation(right)] as const
})
