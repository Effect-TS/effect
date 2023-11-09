import * as Equal from "../Equal.js"
import * as Dual from "../Function.js"
import * as Hash from "../Hash.js"
import type { HashMap } from "../HashMap.js"
import type * as HS from "../HashSet.js"
import { NodeInspectSymbol, toJSON, toString } from "../Inspectable.js"
import { pipeArguments } from "../Pipeable.js"
import type { Predicate, Refinement } from "../Predicate.js"
import { hasProperty } from "../Predicate.js"
import * as HM from "./hashMap.js"

/** @internal */
export const HashSetTypeId: HS.TypeId = Symbol.for("effect/HashSet") as HS.TypeId

/** @internal */
export interface HashSetImpl<A> extends HS.HashSet<A> {
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
  <A>(u: Iterable<A>): u is HS.HashSet<A>
  (u: unknown): u is HS.HashSet<unknown>
} = (u: unknown): u is HS.HashSet<unknown> => hasProperty(u, HashSetTypeId)

const _empty = makeImpl<never>(HM.empty())

/** @internal */
export const empty = <A = never>(): HS.HashSet<A> => _empty

/** @internal */
export const fromIterable = <A>(elements: Iterable<A>): HS.HashSet<A> => {
  const set = beginMutation(empty<A>())
  for (const value of elements) {
    add(set, value)
  }
  return endMutation(set)
}

/** @internal */
export const make = <As extends ReadonlyArray<any>>(...elements: As): HS.HashSet<As[number]> => {
  const set = beginMutation(empty<As[number]>())
  for (const value of elements) {
    add(set, value)
  }
  return endMutation(set)
}

/** @internal */
export const has = Dual.dual<
  <A>(value: A) => (self: HS.HashSet<A>) => boolean,
  <A>(self: HS.HashSet<A>, value: A) => boolean
>(2, <A>(self: HS.HashSet<A>, value: A) => HM.has((self as HashSetImpl<A>)._keyMap, value))

/** @internal */
export const some = Dual.dual<
  <A>(f: Predicate<A>) => (self: HS.HashSet<A>) => boolean,
  <A>(self: HS.HashSet<A>, f: Predicate<A>) => boolean
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
  <A, B extends A>(refinement: Refinement<A, B>): (self: HS.HashSet<A>) => self is HS.HashSet<B>
  <A>(predicate: Predicate<A>): (self: HS.HashSet<A>) => boolean
  <A, B extends A>(self: HS.HashSet<A>, refinement: Refinement<A, B>): self is HS.HashSet<B>
  <A>(self: HS.HashSet<A>, predicate: Predicate<A>): boolean
} = Dual.dual(
  2,
  <A, B extends A>(self: HS.HashSet<A>, refinement: Refinement<A, B>): self is HS.HashSet<B> =>
    !some(self, (a) => !refinement(a))
)

/** @internal */
export const isSubset = Dual.dual<
  <A>(that: HS.HashSet<A>) => (self: HS.HashSet<A>) => boolean,
  <A>(self: HS.HashSet<A>, that: HS.HashSet<A>) => boolean
>(2, (self, that) => every(self, (value) => has(that, value)))

/** @internal */
export const values = <A>(self: HS.HashSet<A>): IterableIterator<A> => HM.keys((self as HashSetImpl<A>)._keyMap)

/** @internal */
export const size = <A>(self: HS.HashSet<A>): number => HM.size((self as HashSetImpl<A>)._keyMap)

/** @internal */
export const beginMutation = <A>(self: HS.HashSet<A>): HS.HashSet<A> =>
  makeImpl(HM.beginMutation((self as HashSetImpl<A>)._keyMap))

/** @internal */
export const endMutation = <A>(self: HS.HashSet<A>): HS.HashSet<A> => {
  ;((self as HashSetImpl<A>)._keyMap as HM.HashMapImpl<A, unknown>)._editable = false
  return self
}

/** @internal */
export const mutate = Dual.dual<
  <A>(f: (set: HS.HashSet<A>) => void) => (self: HS.HashSet<A>) => HS.HashSet<A>,
  <A>(self: HS.HashSet<A>, f: (set: HS.HashSet<A>) => void) => HS.HashSet<A>
>(2, (self, f) => {
  const transient = beginMutation(self)
  f(transient)
  return endMutation(transient)
})

/** @internal */
export const add = Dual.dual<
  <A>(value: A) => (self: HS.HashSet<A>) => HS.HashSet<A>,
  <A>(self: HS.HashSet<A>, value: A) => HS.HashSet<A>
>(
  2,
  <A>(self: HS.HashSet<A>, value: A) =>
    ((self as HashSetImpl<A>)._keyMap as HM.HashMapImpl<A, unknown>)._editable
      ? (HM.set(value as A, true as unknown)((self as HashSetImpl<A>)._keyMap), self)
      : makeImpl(HM.set(value as A, true as unknown)((self as HashSetImpl<A>)._keyMap))
)

/** @internal */
export const remove = Dual.dual<
  <A>(value: A) => (self: HS.HashSet<A>) => HS.HashSet<A>,
  <A>(self: HS.HashSet<A>, value: A) => HS.HashSet<A>
>(
  2,
  <A>(self: HS.HashSet<A>, value: A) =>
    (((self as HashSetImpl<A>)._keyMap) as HM.HashMapImpl<A, unknown>)._editable
      ? (HM.remove(value)((self as HashSetImpl<A>)._keyMap), self)
      : makeImpl(HM.remove(value)((self as HashSetImpl<A>)._keyMap))
)

/** @internal */
export const difference = Dual.dual<
  <A>(that: Iterable<A>) => (self: HS.HashSet<A>) => HS.HashSet<A>,
  <A>(self: HS.HashSet<A>, that: Iterable<A>) => HS.HashSet<A>
>(2, (self, that) =>
  mutate(self, (set) => {
    for (const value of that) {
      remove(set, value)
    }
  }))

/** @internal */
export const intersection = Dual.dual<
  <A>(that: Iterable<A>) => (self: HS.HashSet<A>) => HS.HashSet<A>,
  <A>(self: HS.HashSet<A>, that: Iterable<A>) => HS.HashSet<A>
>(2, (self, that) =>
  mutate(empty(), (set) => {
    for (const value of that) {
      if (has(value)(self)) {
        add(value)(set)
      }
    }
  }))

/** @internal */
export const union = Dual.dual<
  <A>(that: Iterable<A>) => (self: HS.HashSet<A>) => HS.HashSet<A>,
  <A>(self: HS.HashSet<A>, that: Iterable<A>) => HS.HashSet<A>
>(2, (self, that) =>
  mutate(empty(), (set) => {
    forEach(self, (value) => add(set, value))
    for (const value of that) {
      add(set, value)
    }
  }))

/** @internal */
export const toggle = Dual.dual<
  <A>(value: A) => (self: HS.HashSet<A>) => HS.HashSet<A>,
  <A>(self: HS.HashSet<A>, value: A) => HS.HashSet<A>
>(2, (self, value) => has(self, value) ? remove(self, value) : add(self, value))

/** @internal */
export const map = Dual.dual<
  <A, B>(f: (a: A) => B) => (self: HS.HashSet<A>) => HS.HashSet<B>,
  <A, B>(self: HS.HashSet<A>, f: (a: A) => B) => HS.HashSet<B>
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
export const flatMap = Dual.dual<
  <A, B>(f: (a: A) => Iterable<B>) => (self: HS.HashSet<A>) => HS.HashSet<B>,
  <A, B>(self: HS.HashSet<A>, f: (a: A) => Iterable<B>) => HS.HashSet<B>
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
export const forEach = Dual.dual<
  <A>(f: (value: A) => void) => (self: HS.HashSet<A>) => void,
  <A>(self: HS.HashSet<A>, f: (value: A) => void) => void
>(2, <A>(self: HS.HashSet<A>, f: (value: A) => void) =>
  HM.forEach(
    (self as HashSetImpl<A>)._keyMap,
    (_, k) => f(k)
  ))

/** @internal */
export const reduce = Dual.dual<
  <A, Z>(zero: Z, f: (accumulator: Z, value: A) => Z) => (self: HS.HashSet<A>) => Z,
  <A, Z>(self: HS.HashSet<A>, zero: Z, f: (accumulator: Z, value: A) => Z) => Z
>(3, <A, Z>(self: HS.HashSet<A>, zero: Z, f: (accumulator: Z, value: A) => Z) =>
  HM.reduce(
    (self as HashSetImpl<A>)._keyMap,
    zero,
    (z, _, a) => f(z, a)
  ))

/** @internal */
export const filter = Dual.dual<
  {
    <A, B extends A>(f: Refinement<A, B>): (self: HS.HashSet<A>) => HS.HashSet<B>
    <A>(f: Predicate<A>): (self: HS.HashSet<A>) => HS.HashSet<A>
  },
  {
    <A, B extends A>(self: HS.HashSet<A>, f: Refinement<A, B>): HS.HashSet<B>
    <A>(self: HS.HashSet<A>, f: Predicate<A>): HS.HashSet<A>
  }
>(2, <A>(self: HS.HashSet<A>, f: Predicate<A>) => {
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
  ): (self: HS.HashSet<C>) => [HS.HashSet<Exclude<C, B>>, HS.HashSet<B>]
  <B extends A, A = B>(predicate: (a: A) => boolean): (self: HS.HashSet<B>) => [HS.HashSet<B>, HS.HashSet<B>]
  <C extends A, B extends A, A = C>(
    self: HS.HashSet<C>,
    refinement: Refinement<A, B>
  ): [HS.HashSet<Exclude<C, B>>, HS.HashSet<B>]
  <B extends A, A = B>(self: HS.HashSet<B>, predicate: (a: A) => boolean): [HS.HashSet<B>, HS.HashSet<B>]
} = Dual.dual(2, <A>(self: HS.HashSet<A>, f: Predicate<A>) => {
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
