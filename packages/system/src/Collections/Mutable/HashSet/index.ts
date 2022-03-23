// ets_tracing: off

import * as I from "../../../Iterable/index.js"
import * as O from "../../../Option/index.js"
import * as MHM from "../HashMap/index.js"

export class HashSet<A> {
  private hashMap: MHM.HashMap<A, boolean>

  constructor() {
    this.hashMap = MHM.make()
  }

  size(): number {
    return this.hashMap.length.get
  }

  isEmpty(): boolean {
    return this.size() === 0
  }

  contains(a: A): boolean {
    return O.getOrElse_(this.hashMap.get(a), () => false)
  }

  add(a: A): boolean {
    this.hashMap.set(a, true)

    return this.contains(a)
  }

  remove(a: A): boolean {
    this.hashMap.remove(a)

    return !this.contains(a)
  }

  [Symbol.iterator](): Iterator<A> {
    return I.map_(this.hashMap, ([a]) => a)[Symbol.iterator]()
  }
}

/**
 * Creates a new set
 */
export function make<A>(): HashSet<A> {
  return new HashSet()
}

/**
 * Creates a new set from an Iterable
 */
export function from<K, V>(xs: Iterable<V>): HashSet<V> {
  const res = make<V>()
  for (const v of xs) {
    res.add(v)
  }
  return res
}

/**
 * Calculate the number of values in a set
 */
export function size<A>(self: HashSet<A>): number {
  return self.size()
}

/**
 * returns `true` if the set is empty
 */
export function isEmpty<A>(self: HashSet<A>): boolean {
  return self.isEmpty()
}

/**
 * Creates a new set
 *
 * @ets_data_first contains_
 */
export function contains_<A>(self: HashSet<A>, a: A): boolean {
  return self.contains(a)
}

/**
 * return true if the set contains `a`
 *
 * @ets_data_first contains_
 */
export function contains<A>(a: A) {
  return (self: HashSet<A>) => contains_(self, a)
}

/**
 * add `a` to the set
 */
export function add_<A>(self: HashSet<A>, a: A): boolean {
  return self.add(a)
}

/**
 * add `a` to the set
 *
 * @ets_data_first add_
 */
export function add<A>(a: A) {
  return (self: HashSet<A>) => add_(self, a)
}

/**
 * remove `a` from the set
 */
export function remove_<A>(self: HashSet<A>, a: A): boolean {
  return self.remove(a)
}

/**
 * remove `a` from the set
 *
 * @ets_data_first remove_
 */
export function remove<A>(a: A) {
  return (self: HashSet<A>) => remove_(self, a)
}
