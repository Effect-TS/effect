// ets_tracing: off

import "../../../Operator/index.js"

import type { Equal } from "../../../Equal/index.js"
import type { Predicate, Refinement } from "../../../Function/index.js"
import { not } from "../../../Function/index.js"
import type { Ord } from "../../../Ord/index.js"
import * as St from "../../../Structural/index.js"
import type { Next } from "../Map/index.js"
import * as RB from "../RedBlackTree/index.js"
import * as Tp from "../Tuple/index.js"

export class SortedSet<V> implements Iterable<V> {
  constructor(readonly keyTree: RB.RedBlackTree<V, any>) {}

  [Symbol.iterator](): Iterator<V> {
    return RB.keys_(this.keyTree)
  }

  get [St.hashSym](): number {
    return this.keyTree[St.hashSym]
  }

  [St.equalsSym](that: unknown): boolean {
    return this.keyTree[St.equalsSym](that)
  }
}

export function make<V>(K: Ord<V>) {
  return new SortedSet(RB.make(K))
}

export function add_<V>(set: SortedSet<V>, v: V) {
  return RB.has_(set.keyTree, v) ? set : new SortedSet(RB.insert_(set.keyTree, v, true))
}

export function add<V>(v: V) {
  return (set: SortedSet<V>) => add_(set, v)
}

export function remove_<V>(set: SortedSet<V>, v: V) {
  return new SortedSet(RB.removeFirst_(set.keyTree, v))
}

export function remove<V>(v: V) {
  return (set: SortedSet<V>) => remove_(set, v)
}

export function values<V>(set: SortedSet<V>) {
  return RB.keys_(set.keyTree)
}

export function has_<V>(set: SortedSet<V>, v: V) {
  return RB.has_(set.keyTree, v)
}

/**
 * Apply f to each element
 */
export function forEach_<V>(map: SortedSet<V>, f: (v: V) => void) {
  RB.forEach_(map.keyTree, (k) => {
    f(k)
  })
}

/**
 * The set of elements which are in both the first and second set,
 *
 * the hash and equal of the 2 sets has to be the same
 */
export function intersection_<A>(l: SortedSet<A>, r: Iterable<A>): SortedSet<A> {
  let x = make<A>(l.keyTree.ord)

  for (const k of r) {
    if (has_(l, k)) {
      x = add_(x, k)
    }
  }

  return x
}

/**
 * The set of elements which are in both the first and second set
 *
 * @ets_data_first intersection_
 */
export function intersection<A>(r: Iterable<A>) {
  return (l: SortedSet<A>) => intersection_(l, r)
}

/**
 * Projects a Set through a function
 */
export function map_<B>(
  E: Ord<B>
): <A>(set: SortedSet<A>, f: (x: A) => B) => SortedSet<B> {
  return (set, f) => {
    let r = make(E)
    forEach_(set, (e) => {
      const v = f(e)
      if (!has_(r, v)) {
        r = add_(r, v)
      }
    })
    return r
  }
}

/**
 * Projects a Set through a function
 *
 * @ets_data_first map_
 */
export function map<B>(
  E: Ord<B>
): <A>(f: (x: A) => B) => (set: SortedSet<A>) => SortedSet<B> {
  const m = map_(E)
  return (f) => (set) => m(set, f)
}

/**
 * true if one or more elements match predicate
 *
 * @ets_data_first some_
 */
export function some<A>(predicate: Predicate<A>): (set: SortedSet<A>) => boolean {
  return (set) => some_(set, predicate)
}

/**
 * true if one or more elements match predicate
 */
export function some_<A>(set: SortedSet<A>, predicate: Predicate<A>): boolean {
  let found = false
  for (const e of set) {
    found = predicate(e)
    if (found) {
      break
    }
  }
  return found
}

/**
 * Calculate the number of keys pairs in a set
 */
export function size<A>(set: SortedSet<A>) {
  return RB.size(set.keyTree)
}

/**
 * Creates an equal for a set
 */
export function equal<A>(): Equal<SortedSet<A>> {
  return {
    equals: (x, y) => {
      if (y === x) {
        return true
      }
      if (size(x) !== size(y)) {
        return false
      }
      let eq = true
      for (const vx of x) {
        if (!has_(y, vx)) {
          eq = false
          break
        }
      }
      return eq
    }
  }
}

/**
 * true if all elements match predicate
 *
 * @ets_data_first every_
 */
export function every<A>(predicate: Predicate<A>): (set: SortedSet<A>) => boolean {
  return (set) => every_(set, predicate)
}

/**
 * true if all elements match predicate
 */
export function every_<A>(set: SortedSet<A>, predicate: Predicate<A>): boolean {
  return not(some(not(predicate)))(set)
}

/**
 * Map + Flatten
 *
 * @ets_data_first chain_
 */
export function chain<B>(
  E: Ord<B>
): <A>(f: (x: A) => Iterable<B>) => (set: SortedSet<A>) => SortedSet<B> {
  const c = chain_(E)
  return (f) => (set) => c(set, f)
}

/**
 * Map + Flatten
 */
export function chain_<B>(
  E: Ord<B>
): <A>(set: SortedSet<A>, f: (x: A) => Iterable<B>) => SortedSet<B> {
  return (set, f) => {
    let r = make<B>(E)
    forEach_(set, (e) => {
      for (const a of f(e)) {
        if (!has_(r, a)) {
          r = add_(r, a)
        }
      }
    })
    return r
  }
}

/**
 * `true` if and only if every element in the first set is an element of the second set,
 *
 * the hash and equal of the 2 sets has to be the same
 *
 * @ets_data_first isSubset_
 */
export function isSubset<A>(y: SortedSet<A>): (x: SortedSet<A>) => boolean {
  return (x) => isSubset_(y, x)
}

/**
 * `true` if and only if every element in the first set is an element of the second set,
 *
 * the hash and equal of the 2 sets has to be the same
 */
export function isSubset_<A>(x: SortedSet<A>, y: SortedSet<A>): boolean {
  return every_(x, (a: A) => has_(y, a))
}

/**
 * Filter set values using predicate
 *
 * @ets_data_first filter_
 */
export function filter<A, B extends A>(
  refinement: Refinement<A, B>
): (set: SortedSet<A>) => SortedSet<B>
export function filter<A>(predicate: Predicate<A>): (set: SortedSet<A>) => SortedSet<A>
export function filter<A>(
  predicate: Predicate<A>
): (set: SortedSet<A>) => SortedSet<A> {
  return (set) => filter_(set, predicate)
}

/**
 * Filter set values using predicate
 */
export function filter_<A, B extends A>(
  set: SortedSet<A>,
  refinement: Refinement<A, B>
): SortedSet<B>
export function filter_<A>(set: SortedSet<A>, predicate: Predicate<A>): SortedSet<A>
export function filter_<A>(set: SortedSet<A>, predicate: Predicate<A>): SortedSet<A> {
  let r = make(set.keyTree.ord)

  const values_ = values(set)
  let e: Next<A>
  while (!(e = values_.next()).done) {
    const value = e.value
    if (predicate(value)) {
      r = add_(r, value)
    }
  }
  return r
}

/**
 * Partition set values using predicate
 *
 * @ets_data_first partition_
 */
export function partition<A, B extends A>(
  refinement: Refinement<A, B>
): (set: SortedSet<A>) => Tp.Tuple<[SortedSet<A>, SortedSet<B>]>
export function partition<A>(
  predicate: Predicate<A>
): (set: SortedSet<A>) => Tp.Tuple<[SortedSet<A>, SortedSet<A>]>
export function partition<A>(
  predicate: Predicate<A>
): (set: SortedSet<A>) => Tp.Tuple<[SortedSet<A>, SortedSet<A>]> {
  return (set) => partition_(set, predicate)
}

/**
 * Partition set values using predicate
 */
export function partition_<A, B extends A>(
  set: SortedSet<A>,
  refinement: Refinement<A, B>
): Tp.Tuple<[SortedSet<A>, SortedSet<B>]>
export function partition_<A>(
  set: SortedSet<A>,
  predicate: Predicate<A>
): Tp.Tuple<[SortedSet<A>, SortedSet<A>]>
export function partition_<A>(
  set: SortedSet<A>,
  predicate: Predicate<A>
): Tp.Tuple<[SortedSet<A>, SortedSet<A>]> {
  const values_ = values(set)
  let e: Next<A>
  let right = make(set.keyTree.ord)
  let left = make(set.keyTree.ord)
  while (!(e = values_.next()).done) {
    const value = e.value
    if (predicate(value)) {
      right = add_(right, value)
    } else {
      left = add_(left, value)
    }
  }
  return Tp.tuple(left, right)
}

/**
 * Form the set difference (`x` - `y`)
 */
export function difference_<A>(x: SortedSet<A>, y: Iterable<A>): SortedSet<A> {
  let s = x
  for (const k of y) {
    s = remove_(s, k)
  }
  return s
}

/**
 * Form the set difference (`x` - `y`)
 *
 * @ets_data_first difference_
 */
export function difference<A>(y: Iterable<A>): (x: SortedSet<A>) => SortedSet<A> {
  return (x) => difference_(x, y)
}

/**
 * Reduce a state over the map entries
 */
export function reduce_<V, Z>(set: SortedSet<V>, z: Z, f: (z: Z, v: V) => Z): Z {
  return RB.reduceWithIndex_(set.keyTree, z, (z, v) => f(z, v))
}

/**
 * Reduce a state over the map entries
 *
 * @ets_data_first reduce_
 */
export function reduce<V, Z>(z: Z, f: (z: Z, v: V) => Z) {
  return (set: SortedSet<V>) => reduce_(set, z, f)
}

/**
 * If element is present remove it, if not add it
 *
 * @ets_data_first toggle_
 */
export function toggle<A>(a: A): (set: SortedSet<A>) => SortedSet<A> {
  return (set) => toggle_(set, a)
}

/**
 * If element is present remove it, if not add it
 */
export function toggle_<A>(set: SortedSet<A>, a: A): SortedSet<A> {
  return (has_(set, a) ? remove : add)(a)(set)
}

/**
 * Form the union of two sets,
 *
 * the hash and equal of the 2 sets has to be the same
 */
export function union_<A>(l: SortedSet<A>, r: Iterable<A>): SortedSet<A> {
  let x = make(l.keyTree.ord)

  forEach_(l, (a) => {
    x = add_(x, a)
  })
  for (const a of r) {
    x = add_(x, a)
  }
  return x
}

/**
 * Form the union of two sets,
 *
 * the hash and equal of the 2 sets has to be the same
 *
 * @ets_data_first union_
 */
export function union<A>(y: Iterable<A>): (x: SortedSet<A>) => SortedSet<A> {
  return (x) => union_(x, y)
}
