/* adapted from https://github.com/gcanti/fp-ts */

import { Separated } from "../Base"
import { Either } from "../Either"
import { Eq, fromEquals } from "../Eq"
import { identity, not, Predicate, Refinement } from "../Function"
import { Monoid } from "../Monoid"
import { Option } from "../Option"
import { Ord } from "../Ord"
import { Semigroup } from "../Semigroup"
import { Show } from "../Show"

export const empty: ReadonlySet<never> =
  /*#__PURE__*/
  (() => new Set())() as any

export function getIntersectionSemigroup<A>(E: Eq<A>): Semigroup<ReadonlySet<A>> {
  return {
    concat: intersection_(E)
  }
}

export function getUnionMonoid<A>(E: Eq<A>): Monoid<ReadonlySet<A>> {
  return {
    concat: union_(E),
    empty
  }
}

/**
 * The set of elements which are in both the first and second set
 */
export function intersection_<A>(
  E: Eq<A>
): (set: ReadonlySet<A>, y: ReadonlySet<A>) => ReadonlySet<A> {
  const elemE = elem_(E)
  return (x, y) => {
    if (x === empty || y === empty) {
      return empty
    }
    const r = new Set<A>()
    x.forEach((e) => {
      if (elemE(y, e)) {
        r.add(e)
      }
    })
    return r
  }
}

export function intersection<A>(
  E: Eq<A>
): (y: ReadonlySet<A>) => (set: ReadonlySet<A>) => ReadonlySet<A> {
  const elemE = elem_(E)
  return (x) => (y) => {
    if (x === empty || y === empty) {
      return empty
    }
    const r = new Set<A>()
    x.forEach((e) => {
      if (elemE(y, e)) {
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

export function toReadonlyArray_<A>(x: ReadonlySet<A>, O: Ord<A>): ReadonlyArray<A> {
  const r: Array<A> = []
  x.forEach((e) => r.push(e))
  return r.sort(O.compare)
}

export function getEq<A>(E: Eq<A>): Eq<ReadonlySet<A>> {
  const subsetE = isSubset_(E)
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

export function some_<A>(set: ReadonlySet<A>, predicate: Predicate<A>): boolean {
  const values = set.values()
  let e: Next<A>
  let found = false
  while (!found && !(e = values.next()).done) {
    found = predicate(e.value)
  }
  return found
}

/**
 * Projects a Set through a function
 */
export function map<B>(
  E: Eq<B>
): <A>(f: (x: A) => B) => (set: ReadonlySet<A>) => ReadonlySet<B> {
  const elemE = elem_(E)
  return (f) => (set) => {
    const r = new Set<B>()
    set.forEach((e) => {
      const v = f(e)
      if (!elemE(r, v)) {
        r.add(v)
      }
    })
    return r
  }
}

export function map_<B>(
  E: Eq<B>
): <A>(set: ReadonlySet<A>, f: (x: A) => B) => ReadonlySet<B> {
  const elemE = elem_(E)
  return (set, f) => {
    const r = new Set<B>()
    set.forEach((e) => {
      const v = f(e)
      if (!elemE(r, v)) {
        r.add(v)
      }
    })
    return r
  }
}

export function every<A>(predicate: Predicate<A>): (set: ReadonlySet<A>) => boolean {
  return not(some(not(predicate)))
}

export function every_<A>(set: ReadonlySet<A>, predicate: Predicate<A>): boolean {
  return not(some(not(predicate)))(set)
}

export function chain<B>(
  E: Eq<B>
): <A>(f: (x: A) => ReadonlySet<B>) => (set: ReadonlySet<A>) => ReadonlySet<B> {
  const elemE = elem_(E)
  return (f) => (set) => {
    const r = new Set<B>()
    set.forEach((e) => {
      f(e).forEach((e) => {
        if (!elemE(r, e)) {
          r.add(e)
        }
      })
    })
    return r
  }
}

export function chain_<B>(
  E: Eq<B>
): <A>(set: ReadonlySet<A>, f: (x: A) => ReadonlySet<B>) => ReadonlySet<B> {
  const elemE = elem_(E)
  return (set, f) => {
    const r = new Set<B>()
    set.forEach((e) => {
      f(e).forEach((e) => {
        if (!elemE(r, e)) {
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
): (y: ReadonlySet<A>) => (x: ReadonlySet<A>) => boolean {
  const elemE = elem_(E)
  return (y) => (x) => every((a: A) => elemE(y, a))(x)
}

export function isSubset_<A>(
  E: Eq<A>
): (x: ReadonlySet<A>, y: ReadonlySet<A>) => boolean {
  const elemE = elem_(E)
  return (x, y) => every((a: A) => elemE(y, a))(x)
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

export function filter_<A, B extends A>(
  set: ReadonlySet<A>,
  refinement: Refinement<A, B>
): ReadonlySet<B>
export function filter_<A>(set: ReadonlySet<A>, predicate: Predicate<A>): ReadonlySet<A>
export function filter_<A>(
  set: ReadonlySet<A>,
  predicate: Predicate<A>
): ReadonlySet<A> {
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

export function partition_<A, B extends A>(
  set: ReadonlySet<A>,
  refinement: Refinement<A, B>
): Separated<ReadonlySet<A>, ReadonlySet<B>>
export function partition_<A>(
  set: ReadonlySet<A>,
  predicate: Predicate<A>
): Separated<ReadonlySet<A>, ReadonlySet<A>>
export function partition_<A>(
  set: ReadonlySet<A>,
  predicate: Predicate<A>
): Separated<ReadonlySet<A>, ReadonlySet<A>> {
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

/**
 * Test if a value is a member of a set
 */
export function elem_<A>(E: Eq<A>): (set: ReadonlySet<A>, a: A) => boolean {
  return (set, a) => {
    const values = set.values()
    let e: Next<A>
    let found = false
    while (!found && !(e = values.next()).done) {
      found = E.equals(a, e.value)
    }
    return found
  }
}

export function elem<A>(E: Eq<A>): (a: A) => (set: ReadonlySet<A>) => boolean {
  return (a) => (set) => {
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
    const hasB = elem_(EB)
    const hasC = elem_(EC)
    while (!(e = values.next()).done) {
      const v = f(e.value)
      switch (v._tag) {
        case "Left":
          if (!hasB(left, v.left)) {
            left.add(v.left)
          }
          break
        case "Right":
          if (!hasC(right, v.right)) {
            right.add(v.right)
          }
          break
      }
    }
    return { left, right }
  }
}

export function partitionMap_<B, C>(
  EB: Eq<B>,
  EC: Eq<C>
): <A>(
  set: ReadonlySet<A>,
  f: (a: A) => Either<B, C>
) => Separated<ReadonlySet<B>, ReadonlySet<C>> {
  return <A>(set: ReadonlySet<A>, f: (a: A) => Either<B, C>) => {
    const values = set.values()
    let e: Next<A>
    const left = new Set<B>()
    const right = new Set<C>()
    const hasB = elem_(EB)
    const hasC = elem_(EC)
    while (!(e = values.next()).done) {
      const v = f(e.value)
      switch (v._tag) {
        case "Left":
          if (!hasB(left, v.left)) {
            left.add(v.left)
          }
          break
        case "Right":
          if (!hasC(right, v.right)) {
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
 * assert.deepStrictEqual(difference_(eqNumber)(new Set([1, 2]), new Set([1, 3])), new Set([2]))
 */
export function difference_<A>(
  E: Eq<A>
): (x: ReadonlySet<A>, y: ReadonlySet<A>) => ReadonlySet<A> {
  const elemE = elem_(E)
  return (x, y) => filter((a: A) => !elemE(y, a))(x)
}

export function difference<A>(
  E: Eq<A>
): (y: ReadonlySet<A>) => (x: ReadonlySet<A>) => ReadonlySet<A> {
  const elemE = elem_(E)
  return (y) => (x) => filter((a: A) => !elemE(y, a))(x)
}

export function reduce<A>(
  O: Ord<A>
): <B>(b: B, f: (b: B, a: A) => B) => (fa: ReadonlySet<A>) => B {
  const toArrayO = toReadonlyArray(O)
  return (b, f) => (fa) => toArrayO(fa).reduce(f, b)
}

export function reduce_<A>(
  O: Ord<A>
): <B>(fa: ReadonlySet<A>, b: B, f: (b: B, a: A) => B) => B {
  const toArrayO = toReadonlyArray(O)
  return (fa, b, f) => toArrayO(fa).reduce(f, b)
}

export function foldMap<A, M>(
  O: Ord<A>,
  M: Monoid<M>
): (f: (a: A) => M) => (fa: ReadonlySet<A>) => M {
  const toArrayO = toReadonlyArray(O)
  return (f) => (fa) => toArrayO(fa).reduce((b, a) => M.concat(b, f(a)), M.empty)
}

export function foldMap_<A, M>(
  O: Ord<A>,
  M: Monoid<M>
): (fa: ReadonlySet<A>, f: (a: A) => M) => M {
  const toArrayO = toReadonlyArray(O)
  return (fa, f) => toArrayO(fa).reduce((b, a) => M.concat(b, f(a)), M.empty)
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
  const elemE = elem_(E)
  return (a) => (set) => {
    if (!elemE(set, a)) {
      const r = new Set(set)
      r.add(a)
      return r
    } else {
      return set
    }
  }
}

export function insert_<A>(E: Eq<A>): (set: ReadonlySet<A>, a: A) => ReadonlySet<A> {
  const elemE = elem_(E)
  return (set, a) => {
    if (!elemE(set, a)) {
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

export function remove_<A>(E: Eq<A>): (set: ReadonlySet<A>, a: A) => ReadonlySet<A> {
  return (set, a) => filter((ax: A) => !E.equals(a, ax))(set)
}

export function toggle<A>(E: Eq<A>): (a: A) => (set: ReadonlySet<A>) => ReadonlySet<A> {
  const elemE = elem_(E)
  const removeE = remove(E)
  const insertE = insert(E)
  return (a) => (set) => (elemE(set, a) ? removeE : insertE)(a)(set)
}

export function toggle_<A>(E: Eq<A>): (set: ReadonlySet<A>, a: A) => ReadonlySet<A> {
  const elemE = elem_(E)
  const removeE = remove(E)
  const insertE = insert(E)
  return (set, a) => (elemE(set, a) ? removeE : insertE)(a)(set)
}

/**
 * Create a set from an array
 */
export function fromArray<A>(E: Eq<A>): (as: ReadonlyArray<A>) => ReadonlySet<A> {
  return (as) => {
    const len = as.length
    const r = new Set<A>()
    const has = elem_(E)
    for (let i = 0; i < len; i++) {
      const a = as[i]
      if (!has(r, a)) {
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
    const elemEE = elem_(EE)
    const elemEA = elem_(EA)
    const left: Set<E> = new Set()
    const right: Set<A> = new Set()
    fa.forEach((e) => {
      switch (e._tag) {
        case "Left":
          if (!elemEE(left, e.left)) {
            left.add(e.left)
          }
          break
        case "Right":
          if (!elemEA(right, e.right)) {
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
  const elemE = elem_(E)
  return (f) => (fa) => {
    const r: Set<B> = new Set()
    fa.forEach((a) => {
      const ob = f(a)
      if (ob._tag === "Some" && !elemE(r, ob.value)) {
        r.add(ob.value)
      }
    })
    return r
  }
}

export function filterMap_<B>(
  E: Eq<B>
): <A>(fa: ReadonlySet<A>, f: (a: A) => Option<B>) => ReadonlySet<B> {
  const elemE = elem_(E)
  return (fa, f) => {
    const r: Set<B> = new Set()
    fa.forEach((a) => {
      const ob = f(a)
      if (ob._tag === "Some" && !elemE(r, ob.value)) {
        r.add(ob.value)
      }
    })
    return r
  }
}

/**
 * Form the union of two sets
 */

export function union_<A>(
  E: Eq<A>
): (set: ReadonlySet<A>, y: ReadonlySet<A>) => ReadonlySet<A> {
  const elemE = elem_(E)
  return (x, y) => {
    if (x === empty) {
      return y
    }
    if (y === empty) {
      return x
    }
    const r = new Set(x)
    y.forEach((e) => {
      if (!elemE(r, e)) {
        r.add(e)
      }
    })
    return r
  }
}

export function union<A>(
  E: Eq<A>
): (y: ReadonlySet<A>) => (set: ReadonlySet<A>) => ReadonlySet<A> {
  const elemE = elem_(E)
  return (y) => (x) => {
    if (x === empty) {
      return y
    }
    if (y === empty) {
      return x
    }
    const r = new Set(x)
    y.forEach((e) => {
      if (!elemE(r, e)) {
        r.add(e)
      }
    })
    return r
  }
}
