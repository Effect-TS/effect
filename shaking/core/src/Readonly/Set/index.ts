/* adapted from https://github.com/gcanti/fp-ts */
import { Separated } from "../../Base"
import { Either } from "../../Either"
import { Eq, fromEquals } from "../../Eq"
import { identity, not, Predicate, Refinement } from "../../Function"
import { Monoid } from "../../Monoid"
import { Option } from "../../Option"
import { Ord } from "../../Ord"
import { Semigroup } from "../../Semigroup"
import { Show } from "../../Show"

export const empty: ReadonlySet<never> =
  /*#__PURE__*/
  (() => new Set())() as any

export function getIntersectionSemigroup<A>(E: Eq<A>): Semigroup<ReadonlySet<A>> {
  return {
    concat: intersection(E)
  }
}

export function getUnionMonoid<A>(E: Eq<A>): Monoid<ReadonlySet<A>> {
  return {
    concat: union(E),
    empty
  }
}

/**
 * The set of elements which are in both the first and second set
 */
export function intersection<A>(
  E: Eq<A>
): (set: ReadonlySet<A>, y: ReadonlySet<A>) => ReadonlySet<A> {
  const elemE = elem(E)
  return (x, y) => {
    if (x === empty || y === empty) {
      return empty
    }
    const r = new Set<A>()
    x.forEach((e) => {
      if (elemE(e, y)) {
        r.add(e)
      }
    })
    return r
  }
}

export function fromSet<A>(s: Set<A>): ReadonlySet<A> {
  return new Set(s)
}

export function toSet<A>(s: ReadonlySet<A>): Set<A> {
  return new Set(s)
}

export function getShow<A>(S: Show<A>): Show<ReadonlySet<A>> {
  return {
    show: (s) => {
      let elements = ""
      s.forEach((a) => {
        elements += S.show(a) + ", "
      })
      if (elements !== "") {
        elements = elements.substring(0, elements.length - 2)
      }
      return `new Set([${elements}])`
    }
  }
}

export function toReadonlyArray<A>(
  O: Ord<A>
): (set: ReadonlySet<A>) => ReadonlyArray<A> {
  return (x) => {
    const r: Array<A> = []
    x.forEach((e) => r.push(e))
    return r.sort(O.compare)
  }
}

export function getEq<A>(E: Eq<A>): Eq<ReadonlySet<A>> {
  const subsetE = isSubset(E)
  return fromEquals((x, y) => subsetE(x, y) && subsetE(y, x))
}

interface Next<A> {
  readonly done?: boolean
  readonly value: A
}

export function some<A>(predicate: Predicate<A>): (set: ReadonlySet<A>) => boolean {
  return (set) => {
    const values = set.values()
    let e: Next<A>
    let found = false
    while (!found && !(e = values.next()).done) {
      found = predicate(e.value)
    }
    return found
  }
}

/**
 * Projects a Set through a function
 */
export function map<B>(
  E: Eq<B>
): <A>(f: (x: A) => B) => (set: ReadonlySet<A>) => ReadonlySet<B> {
  const elemE = elem(E)
  return (f) => (set) => {
    const r = new Set<B>()
    set.forEach((e) => {
      const v = f(e)
      if (!elemE(v, r)) {
        r.add(v)
      }
    })
    return r
  }
}

export function every<A>(predicate: Predicate<A>): (set: ReadonlySet<A>) => boolean {
  return not(some(not(predicate)))
}

export function chain<B>(
  E: Eq<B>
): <A>(f: (x: A) => ReadonlySet<B>) => (set: ReadonlySet<A>) => ReadonlySet<B> {
  const elemE = elem(E)
  return (f) => (set) => {
    const r = new Set<B>()
    set.forEach((e) => {
      f(e).forEach((e) => {
        if (!elemE(e, r)) {
          r.add(e)
        }
      })
    })
    return r
  }
}

/**
 * `true` if and only if every element in the first set is an element of the second set
 */
export function isSubset<A>(
  E: Eq<A>
): (x: ReadonlySet<A>, y: ReadonlySet<A>) => boolean {
  const elemE = elem(E)
  return (x, y) => every((a: A) => elemE(a, y))(x)
}

export function filter<A, B extends A>(
  refinement: Refinement<A, B>
): (set: ReadonlySet<A>) => ReadonlySet<B>
export function filter<A>(
  predicate: Predicate<A>
): (set: ReadonlySet<A>) => ReadonlySet<A>
export function filter<A>(
  predicate: Predicate<A>
): (set: ReadonlySet<A>) => ReadonlySet<A> {
  return (set) => {
    const values = set.values()
    let e: Next<A>
    const r = new Set<A>()
    while (!(e = values.next()).done) {
      const value = e.value
      if (predicate(value)) {
        r.add(value)
      }
    }
    return r
  }
}

export function partition<A, B extends A>(
  refinement: Refinement<A, B>
): (set: ReadonlySet<A>) => Separated<ReadonlySet<A>, ReadonlySet<B>>
export function partition<A>(
  predicate: Predicate<A>
): (set: ReadonlySet<A>) => Separated<ReadonlySet<A>, ReadonlySet<A>>
export function partition<A>(
  predicate: Predicate<A>
): (set: ReadonlySet<A>) => Separated<ReadonlySet<A>, ReadonlySet<A>> {
  return (set) => {
    const values = set.values()
    let e: Next<A>
    const right = new Set<A>()
    const left = new Set<A>()
    while (!(e = values.next()).done) {
      const value = e.value
      if (predicate(value)) {
        right.add(value)
      } else {
        left.add(value)
      }
    }
    return { left, right }
  }
}

/**
 * Test if a value is a member of a set
 */
export function elem<A>(E: Eq<A>): (a: A, set: ReadonlySet<A>) => boolean {
  return (a, set) => {
    const values = set.values()
    let e: Next<A>
    let found = false
    while (!found && !(e = values.next()).done) {
      found = E.equals(a, e.value)
    }
    return found
  }
}

export function partitionMap<B, C>(
  EB: Eq<B>,
  EC: Eq<C>
): <A>(
  f: (a: A) => Either<B, C>
) => (set: ReadonlySet<A>) => Separated<ReadonlySet<B>, ReadonlySet<C>> {
  return <A>(f: (a: A) => Either<B, C>) => (set: ReadonlySet<A>) => {
    const values = set.values()
    let e: Next<A>
    const left = new Set<B>()
    const right = new Set<C>()
    const hasB = elem(EB)
    const hasC = elem(EC)
    while (!(e = values.next()).done) {
      const v = f(e.value)
      switch (v._tag) {
        case "Left":
          if (!hasB(v.left, left)) {
            left.add(v.left)
          }
          break
        case "Right":
          if (!hasC(v.right, right)) {
            right.add(v.right)
          }
          break
      }
    }
    return { left, right }
  }
}

/**
 * Form the set difference (`x` - `y`)
 *
 * @example
 * import { difference } from '@matechs/core/Readonly/Set'
 * import { eqNumber } from '@matechs/core/Eq'
 *
 * assert.deepStrictEqual(difference(eqNumber)(new Set([1, 2]), new Set([1, 3])), new Set([2]))
 */
export function difference<A>(
  E: Eq<A>
): (x: ReadonlySet<A>, y: ReadonlySet<A>) => ReadonlySet<A> {
  const elemE = elem(E)
  return (x, y) => filter((a: A) => !elemE(a, y))(x)
}

export function reduce<A>(
  O: Ord<A>
): <B>(b: B, f: (b: B, a: A) => B) => (fa: ReadonlySet<A>) => B {
  const toArrayO = toReadonlyArray(O)
  return (b, f) => (fa) => toArrayO(fa).reduce(f, b)
}

export function foldMap<A, M>(
  O: Ord<A>,
  M: Monoid<M>
): (f: (a: A) => M) => (fa: ReadonlySet<A>) => M {
  const toArrayO = toReadonlyArray(O)
  return (f) => (fa) => toArrayO(fa).reduce((b, a) => M.concat(b, f(a)), M.empty)
}

/**
 * Create a set with one element
 */
export function singleton<A>(a: A): ReadonlySet<A> {
  return new Set([a])
}

/**
 * Insert a value into a set
 */
export function insert<A>(E: Eq<A>): (a: A) => (set: ReadonlySet<A>) => ReadonlySet<A> {
  const elemE = elem(E)
  return (a) => (set) => {
    if (!elemE(a, set)) {
      const r = new Set(set)
      r.add(a)
      return r
    } else {
      return set
    }
  }
}

/**
 * Delete a value from a set
 */
export function remove<A>(E: Eq<A>): (a: A) => (set: ReadonlySet<A>) => ReadonlySet<A> {
  return (a) => (set) => filter((ax: A) => !E.equals(a, ax))(set)
}

/**
 * Create a set from an array
 */
export function fromArray<A>(E: Eq<A>): (as: ReadonlyArray<A>) => ReadonlySet<A> {
  return (as) => {
    const len = as.length
    const r = new Set<A>()
    const has = elem(E)
    for (let i = 0; i < len; i++) {
      const a = as[i]
      if (!has(a, r)) {
        r.add(a)
      }
    }
    return r
  }
}

export function compact<A>(E: Eq<A>): (fa: ReadonlySet<Option<A>>) => ReadonlySet<A> {
  return filterMap(E)(identity)
}

export function separate<E, A>(
  EE: Eq<E>,
  EA: Eq<A>
): (fa: ReadonlySet<Either<E, A>>) => Separated<ReadonlySet<E>, ReadonlySet<A>> {
  return (fa) => {
    const elemEE = elem(EE)
    const elemEA = elem(EA)
    const left: Set<E> = new Set()
    const right: Set<A> = new Set()
    fa.forEach((e) => {
      switch (e._tag) {
        case "Left":
          if (!elemEE(e.left, left)) {
            left.add(e.left)
          }
          break
        case "Right":
          if (!elemEA(e.right, right)) {
            right.add(e.right)
          }
          break
      }
    })
    return { left, right }
  }
}

export function filterMap<B>(
  E: Eq<B>
): <A>(f: (a: A) => Option<B>) => (fa: ReadonlySet<A>) => ReadonlySet<B> {
  const elemE = elem(E)
  return (f) => (fa) => {
    const r: Set<B> = new Set()
    fa.forEach((a) => {
      const ob = f(a)
      if (ob._tag === "Some" && !elemE(ob.value, r)) {
        r.add(ob.value)
      }
    })
    return r
  }
}

/**
 * Form the union of two sets
 */

export function union<A>(
  E: Eq<A>
): (set: ReadonlySet<A>, y: ReadonlySet<A>) => ReadonlySet<A> {
  const elemE = elem(E)
  return (x, y) => {
    if (x === empty) {
      return y
    }
    if (y === empty) {
      return x
    }
    const r = new Set(x)
    y.forEach((e) => {
      if (!elemE(e, r)) {
        r.add(e)
      }
    })
    return r
  }
}
