// ets_tracing: off

import "../../../Operator/index.js"

import type { Equal } from "../../../Equal/index.js"
import type { Predicate, Refinement } from "../../../Function/index.js"
import { not } from "../../../Function/index.js"
import * as I from "../../../Iterable/index.js"
import * as St from "../../../Structural/index.js"
import * as HM from "../HashMap/core.js"
import type { Next } from "../Map/index.js"
import * as Tp from "../Tuple/index.js"

export class HashSet<V> implements Iterable<V>, St.HasHash, St.HasEquals {
  constructor(readonly keyMap: HM.HashMap<V, unknown>) {}

  [Symbol.iterator](): Iterator<V> {
    return HM.keys(this.keyMap)
  }

  get [St.hashSym](): number {
    return St.hashIterator(this[Symbol.iterator]())
  }

  [St.equalsSym](that: unknown): boolean {
    return (
      that instanceof HashSet &&
      that.keyMap.size === this.keyMap.size &&
      I.corresponds(this, that, St.equals)
    )
  }
}

export function make<V>() {
  return new HashSet<V>(HM.make())
}

/**
 * Creates a new set from an Iterable
 */
export function from<K, V>(xs: Iterable<V>): HashSet<V> {
  return I.reduce_(xs, make<V>(), (s, v) => add_(s, v))
}

export function add_<V>(set: HashSet<V>, v: V) {
  return set.keyMap.editable
    ? (HM.set_(set.keyMap, v, true), set)
    : new HashSet(HM.set_(set.keyMap, v, true))
}

export function add<V>(v: V) {
  return (set: HashSet<V>) => add_(set, v)
}

export function remove_<V>(set: HashSet<V>, v: V) {
  return set.keyMap.editable
    ? (HM.remove_(set.keyMap, v), set)
    : new HashSet(HM.remove_(set.keyMap, v))
}

export function remove<V>(v: V) {
  return (set: HashSet<V>) => remove_(set, v)
}

export function values<V>(set: HashSet<V>) {
  return HM.keys(set.keyMap)
}

export function has_<V>(set: HashSet<V>, v: V) {
  return HM.has_(set.keyMap, v)
}

/**
 * Apply f to each element
 */
export function forEach_<V>(map: HashSet<V>, f: (v: V) => void) {
  HM.forEachWithIndex_(map.keyMap, (k) => {
    f(k)
  })
}

/**
 * Mutate `set` within the context of `f`.
 */
export function mutate_<V>(set: HashSet<V>, transient: (set: HashSet<V>) => void) {
  const s = beginMutation(set)
  transient(s)
  return endMutation(s)
}

/**
 * The set of elements which are in both the first and second set,
 *
 * the hash and equal of the 2 sets has to be the same
 */
export function intersection_<A>(l: HashSet<A>, r: Iterable<A>): HashSet<A> {
  const x = make<A>()

  return mutate_(x, (y) => {
    for (const k of r) {
      if (has_(l, k)) {
        add_(y, k)
      }
    }
  })
}

/**
 * The set of elements which are in both the first and second set
 *
 * @ets_data_first intersection_
 */
export function intersection<A>(r: Iterable<A>) {
  return (l: HashSet<A>) => intersection_(l, r)
}

/**
 * Projects a Set through a function
 */
export function map_<A, B>(set: HashSet<A>, f: (x: A) => B): HashSet<B> {
  const r = make<B>()

  return mutate_(r, (r) => {
    forEach_(set, (e) => {
      const v = f(e)
      if (!has_(r, v)) {
        add_(r, v)
      }
    })
  })
}

/**
 * Projects a Set through a function
 *
 * @ets_data_first map_
 */
export function map<A, B>(f: (x: A) => B): (set: HashSet<A>) => HashSet<B> {
  return (set) => map_(set, f)
}

/**
 * true if one or more elements match predicate
 *
 * @ets_data_first some_
 */
export function some<A>(predicate: Predicate<A>): (set: HashSet<A>) => boolean {
  return (set) => some_(set, predicate)
}

/**
 * true if one or more elements match predicate
 */
export function some_<A>(set: HashSet<A>, predicate: Predicate<A>): boolean {
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
export function size<A>(set: HashSet<A>) {
  return HM.size(set.keyMap)
}

/**
 * Creates an equal for a set
 */
export function equal<A>(): Equal<HashSet<A>> {
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
export function every<A>(predicate: Predicate<A>): (set: HashSet<A>) => boolean {
  return (set) => every_(set, predicate)
}

/**
 * true if all elements match predicate
 */
export function every_<A>(set: HashSet<A>, predicate: Predicate<A>): boolean {
  return not(some(not(predicate)))(set)
}

/**
 * Map + Flatten
 *
 * @ets_data_first chain_
 */
export function chain<A, B>(f: (x: A) => Iterable<B>): (set: HashSet<A>) => HashSet<B> {
  return (set) => chain_(set, f)
}

/**
 * Map + Flatten
 */
export function chain_<A, B>(set: HashSet<A>, f: (x: A) => Iterable<B>): HashSet<B> {
  const r = make<B>()
  mutate_(r, (r) => {
    forEach_(set, (e) => {
      for (const a of f(e)) {
        if (!has_(r, a)) {
          add_(r, a)
        }
      }
    })
  })
  return r
}

/**
 * `true` if and only if every element in the first set is an element of the second set,
 *
 * the hash and equal of the 2 sets has to be the same
 *
 * @ets_data_first isSubset_
 */
export function isSubset<A>(y: HashSet<A>): (x: HashSet<A>) => boolean {
  return (x) => isSubset_(y, x)
}

/**
 * `true` if and only if every element in the first set is an element of the second set,
 *
 * the hash and equal of the 2 sets has to be the same
 */
export function isSubset_<A>(x: HashSet<A>, y: HashSet<A>): boolean {
  return every_(x, (a: A) => has_(y, a))
}

/**
 * Filter set values using predicate
 *
 * @ets_data_first filter_
 */
export function filter<A, B extends A>(
  refinement: Refinement<A, B>
): (set: HashSet<A>) => HashSet<B>
export function filter<A>(predicate: Predicate<A>): (set: HashSet<A>) => HashSet<A>
export function filter<A>(predicate: Predicate<A>): (set: HashSet<A>) => HashSet<A> {
  return (set) => filter_(set, predicate)
}

/**
 * Filter set values using predicate
 */
export function filter_<A, B extends A>(
  set: HashSet<A>,
  refinement: Refinement<A, B>
): HashSet<B>
export function filter_<A>(set: HashSet<A>, predicate: Predicate<A>): HashSet<A>
export function filter_<A>(set: HashSet<A>, predicate: Predicate<A>): HashSet<A> {
  const r = make<A>()

  return mutate_(r, (r) => {
    const values_ = values(set)
    let e: Next<A>
    while (!(e = values_.next()).done) {
      const value = e.value
      if (predicate(value)) {
        add_(r, value)
      }
    }
    return r
  })
}

/**
 * Partition set values using predicate
 *
 * @ets_data_first partition_
 */
export function partition<A, B extends A>(
  refinement: Refinement<A, B>
): (set: HashSet<A>) => Tp.Tuple<[HashSet<A>, HashSet<B>]>
export function partition<A>(
  predicate: Predicate<A>
): (set: HashSet<A>) => Tp.Tuple<[HashSet<A>, HashSet<A>]>
export function partition<A>(
  predicate: Predicate<A>
): (set: HashSet<A>) => Tp.Tuple<[HashSet<A>, HashSet<A>]> {
  return (set) => partition_(set, predicate)
}

/**
 * Partition set values using predicate
 */
export function partition_<A, B extends A>(
  set: HashSet<A>,
  refinement: Refinement<A, B>
): Tp.Tuple<[HashSet<A>, HashSet<B>]>
export function partition_<A>(
  set: HashSet<A>,
  predicate: Predicate<A>
): Tp.Tuple<[HashSet<A>, HashSet<A>]>
export function partition_<A>(
  set: HashSet<A>,
  predicate: Predicate<A>
): Tp.Tuple<[HashSet<A>, HashSet<A>]> {
  const values_ = values(set)
  let e: Next<A>
  const right = beginMutation(make<A>())
  const left = beginMutation(make<A>())
  while (!(e = values_.next()).done) {
    const value = e.value
    if (predicate(value)) {
      add_(right, value)
    } else {
      add_(left, value)
    }
  }
  return Tp.tuple(endMutation(left), endMutation(right))
}

/**
 * Mark `set` as mutable.
 */
export function beginMutation<K>(set: HashSet<K>) {
  return new HashSet(HM.beginMutation(set.keyMap))
}

/**
 * Mark `set` as immutable.
 */
export function endMutation<K>(set: HashSet<K>) {
  set.keyMap.editable = false
  return set
}

/**
 * Form the set difference (`x` - `y`)
 */
export function difference_<A>(x: HashSet<A>, y: Iterable<A>): HashSet<A> {
  return mutate_(x, (s) => {
    for (const k of y) {
      remove_(s, k)
    }
  })
}

/**
 * Form the set difference (`x` - `y`)
 *
 * @ets_data_first difference_
 */
export function difference<A>(y: Iterable<A>): (x: HashSet<A>) => HashSet<A> {
  return (x) => difference_(x, y)
}

/**
 * Reduce a state over the map entries
 */
export function reduce_<V, Z>(set: HashSet<V>, z: Z, f: (z: Z, v: V) => Z): Z {
  return HM.reduceWithIndex_(set.keyMap, z, (z, v) => f(z, v))
}

/**
 * Reduce a state over the map entries
 *
 * @ets_data_first reduce_
 */
export function reduce<V, Z>(z: Z, f: (z: Z, v: V) => Z) {
  return (set: HashSet<V>) => reduce_(set, z, f)
}

/**
 * If element is present remove it, if not add it
 *
 * @ets_data_first toggle_
 */
export function toggle<A>(a: A): (set: HashSet<A>) => HashSet<A> {
  return (set) => toggle_(set, a)
}

/**
 * If element is present remove it, if not add it
 */
export function toggle_<A>(set: HashSet<A>, a: A): HashSet<A> {
  return (has_(set, a) ? remove : add)(a)(set)
}

/**
 * Form the union of two sets,
 *
 * the hash and equal of the 2 sets has to be the same
 */
export function union_<A>(l: HashSet<A>, r: Iterable<A>): HashSet<A> {
  const x = make<A>()

  return mutate_(x, (x) => {
    forEach_(l, (a) => {
      add_(x, a)
    })
    for (const a of r) {
      add_(x, a)
    }
  })
}

/**
 * Form the union of two sets,
 *
 * the hash and equal of the 2 sets has to be the same
 *
 * @ets_data_first union_
 */
export function union<A>(y: Iterable<A>): (x: HashSet<A>) => HashSet<A> {
  return (x) => union_(x, y)
}
