import type { Equal } from "../../Equal"
import type { Predicate, Refinement } from "../../Function"
import { not } from "../../Function"
import type { Hash } from "../../Hash"
import type { Next } from "../../Map"
import type { Separated } from "../../Utils"
import * as HM from "../HashMap"

export class HashSet<V> implements Iterable<V> {
  constructor(readonly keyMap: HM.HashMap<V, any>) {
    this.add = this.add.bind(this)
    this.remove = this.remove.bind(this)
    this.values = this.values.bind(this)
    this.has = this.has.bind(this)
    this.forEach = this.forEach.bind(this)
    this.mutate = this.mutate.bind(this)
    this.intersection = this.intersection.bind(this)
    this.union = this.union.bind(this)
    this.difference = this.difference.bind(this)
    this.map = this.map.bind(this)
    this.chain = this.chain.bind(this)
    this.some = this.some.bind(this)
    this.every = this.every.bind(this)
    this.filter = this.filter.bind(this)
    this.reduce = this.reduce.bind(this)
    this.toggle = this.toggle.bind(this)
    this.partition = this.partition.bind(this)
  }

  [Symbol.iterator](): Iterator<V> {
    return HM.keys(this.keyMap)
  }

  add(v: V): HashSet<V> {
    return add_(this, v)
  }

  remove(v: V): HashSet<V> {
    return remove_(this, v)
  }

  values(): IterableIterator<V> {
    return values(this)
  }

  has(v: V): boolean {
    return has_(this, v)
  }

  forEach(f: (v: V) => void): HashSet<V> {
    return forEach_(this, f)
  }

  mutate(f: (set: HashSet<V>) => void): HashSet<V> {
    return mutate_(this, f)
  }

  intersection(other: Iterable<V>): HashSet<V> {
    return intersection_(this, other)
  }

  union(other: Iterable<V>): HashSet<V> {
    return union_(this, other)
  }

  difference(other: Iterable<V>): HashSet<V> {
    return difference_(this, other)
  }

  map<B>(C: HM.Config<B>): (f: (a: V) => B) => HashSet<B> {
    const m = map_(C)
    return (f) => m(this, f)
  }

  chain<B>(C: HM.Config<B>): (f: (a: V) => Iterable<B>) => HashSet<B> {
    const m = chain_(C)
    return (f) => m(this, f)
  }

  some(p: Predicate<V>): boolean {
    return some_(this, p)
  }

  every(p: Predicate<V>): boolean {
    return every_(this, p)
  }

  filter<B extends V>(p: Refinement<V, B>): HashSet<B>
  filter(p: Predicate<V>): HashSet<V>
  filter(p: Predicate<V>): HashSet<V> {
    return filter_(this, p)
  }

  reduce<Z>(z: Z, f: (z: Z, v: V) => Z): Z {
    return reduce_(this, z, f)
  }

  toggle(v: V): HashSet<V> {
    return toggle_(this, v)
  }

  partition<B extends V>(p: Refinement<V, B>): Separated<HashSet<V>, HashSet<B>> {
    return partition_(this, p)
  }
}

export function make<V>(K: Hash<V> & Equal<V>) {
  return new HashSet(HM.make(K))
}

export function makeDefault<V>() {
  return new HashSet<V>(HM.makeDefault())
}

export function add_<V>(set: HashSet<V>, v: V) {
  return set.keyMap.editable
    ? (set.keyMap.set(v, true), set)
    : new HashSet(set.keyMap.set(v, true))
}

export function add<V>(v: V) {
  return (set: HashSet<V>) => add_(set, v)
}

export function remove_<V>(set: HashSet<V>, v: V) {
  return set.keyMap.editable
    ? (set.keyMap.remove(v), set)
    : new HashSet(set.keyMap.remove(v))
}

export function remove<V>(v: V) {
  return (set: HashSet<V>) => remove_(set, v)
}

export function values<V>(set: HashSet<V>) {
  return set.keyMap.keys()
}

export function has_<V>(set: HashSet<V>, v: V) {
  return HM.has_(set.keyMap, v)
}

/**
 * Apply f to each element
 */
export function forEach_<V>(map: HashSet<V>, f: (v: V, m: HashSet<V>) => void) {
  return new HashSet(
    map.keyMap.forEachWithIndex((k, _, m) => {
      f(k, new HashSet(m))
    })
  )
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
  const x = make<A>(l.keyMap.config)

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
 * @dataFirst intersection_
 */
export function intersection<A>(r: Iterable<A>) {
  return (l: HashSet<A>) => intersection_(l, r)
}

/**
 * Projects a Set through a function
 */
export function map_<B>(
  E: HM.Config<B>
): <A>(set: HashSet<A>, f: (x: A) => B) => HashSet<B> {
  const r = make(E)

  return (set, f) =>
    mutate_(r, (r) => {
      forEach_(set, (e) => {
        const v = f(e)
        if (!has_(r, v)) {
          add_(r, v)
        }
      })
      return r
    })
}

/**
 * Projects a Set through a function
 *
 * @dataFirst map_
 */
export function map<B>(
  E: HM.Config<B>
): <A>(f: (x: A) => B) => (set: HashSet<A>) => HashSet<B> {
  const m = map_(E)
  return (f) => (set) => m(set, f)
}

/**
 * true if one or more elements match predicate
 *
 * @dataFirst some_
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
    equals: (y) => (x) => {
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
 * @dataFirst every_
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
 * @dataFirst chain_
 */
export function chain<B>(
  E: HM.Config<B>
): <A>(f: (x: A) => Iterable<B>) => (set: HashSet<A>) => HashSet<B> {
  const c = chain_(E)
  return (f) => (set) => c(set, f)
}

/**
 * Map + Flatten
 */
export function chain_<B>(
  E: HM.Config<B>
): <A>(set: HashSet<A>, f: (x: A) => Iterable<B>) => HashSet<B> {
  const r = make<B>(E)
  return (set, f) =>
    mutate_(r, (r) => {
      forEach_(set, (e) => {
        for (const a of f(e)) {
          if (!has_(r, a)) {
            add_(r, a)
          }
        }
      })
      return r
    })
}

/**
 * `true` if and only if every element in the first set is an element of the second set,
 *
 * the hash and equal of the 2 sets has to be the same
 *
 * @dataFirst isSubset_
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
 * @dataFirst filter_
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
  const r = make(set.keyMap.config)

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
 * @dataFirst partition_
 */
export function partition<A, B extends A>(
  refinement: Refinement<A, B>
): (set: HashSet<A>) => Separated<HashSet<A>, HashSet<B>>
export function partition<A>(
  predicate: Predicate<A>
): (set: HashSet<A>) => Separated<HashSet<A>, HashSet<A>>
export function partition<A>(
  predicate: Predicate<A>
): (set: HashSet<A>) => Separated<HashSet<A>, HashSet<A>> {
  return (set) => partition_(set, predicate)
}

/**
 * Partition set values using predicate
 */
export function partition_<A, B extends A>(
  set: HashSet<A>,
  refinement: Refinement<A, B>
): Separated<HashSet<A>, HashSet<B>>
export function partition_<A>(
  set: HashSet<A>,
  predicate: Predicate<A>
): Separated<HashSet<A>, HashSet<A>>
export function partition_<A>(
  set: HashSet<A>,
  predicate: Predicate<A>
): Separated<HashSet<A>, HashSet<A>> {
  const values_ = values(set)
  let e: Next<A>
  const right = beginMutation(make(set.keyMap.config))
  const left = beginMutation(make(set.keyMap.config))
  while (!(e = values_.next()).done) {
    const value = e.value
    if (predicate(value)) {
      add_(right, value)
    } else {
      add_(left, value)
    }
  }
  return { left: endMutation(left), right: endMutation(right) }
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
 * @dataFirst difference_
 */
export function difference<A>(y: Iterable<A>): (x: HashSet<A>) => HashSet<A> {
  return (x) => difference_(x, y)
}

/**
 * Reduce a state over the map entries
 */
export function reduce_<V, Z>(set: HashSet<V>, z: Z, f: (z: Z, v: V) => Z): Z {
  return set.keyMap.reduceWithIndex(z, (z, v) => f(z, v))
}

/**
 * Reduce a state over the map entries
 *
 * @dataFirst reduce_
 */
export function reduce<V, Z>(z: Z, f: (z: Z, v: V) => Z) {
  return (set: HashSet<V>) => reduce_(set, z, f)
}

/**
 * If element is present remove it, if not add it
 *
 * @dataFirst toggle_
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
  const x = make(l.keyMap.config)

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
 * @dataFirst union_
 */
export function union<A>(y: Iterable<A>): (x: HashSet<A>) => HashSet<A> {
  return (x) => union_(x, y)
}
