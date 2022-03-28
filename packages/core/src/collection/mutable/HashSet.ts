import * as I from "../../collection/immutable/Iterable"
import * as MHM from "../../collection/mutable/HashMap"
import * as O from "../../data/Option"

/**
 * @tsplus type ets/MutableHashSet
 * @tsplus companion ets/MutableHashSetOps
 */
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
 * Creates a new empty set.
 *
 * @tsplus static ets/MutableHashSetOps empty
 */
export function empty<A>(): HashSet<A> {
  return new HashSet()
}

/**
 * Creates a new set.
 *
 * @tsplus static ets/MutableHashSetOps make
 */
export function make<A>(): HashSet<A> {
  return new HashSet()
}

/**
 * Calculate the number of values in a set.
 *
 * @tsplus getter ets/MutableHashSet size
 */
export function size<A>(self: HashSet<A>): number {
  return self.size()
}

/**
 * Returns `true` if the set is empty.
 *
 * @tsplus fluent ets/MutableHashSet isEmpty
 */
export function isEmpty<A>(self: HashSet<A>): boolean {
  return self.isEmpty()
}

/**
 * Returns `true` if the set contains the specified value.
 *
 * @tsplus fluent ets/MutableHashSet contains
 */
export function contains_<A>(self: HashSet<A>, a: A): boolean {
  return self.contains(a)
}

/**
 * Returns `true` if the set contains the specified value.
 */
export const contains = Pipeable(contains_)

/**
 * Adds the specified value to the set.
 *
 * @tsplus operator ets/MutableHashSet +
 * @tsplus fluent ets/MutableHashSet add
 */
export function add_<A>(self: HashSet<A>, a: A): boolean {
  return self.add(a)
}

/**
 * Adds the specified value to the set.
 */
export const add = Pipeable(add_)

/**
 * Removes the specified value from the set.
 *
 * @tsplus operator ets/MutableHashSet -
 * @tsplus fluent ets/MutableHashSet remove
 */
export function remove_<A>(self: HashSet<A>, a: A): boolean {
  return self.remove(a)
}

/**
 * Removes the specified value from the set.
 */
export const remove = Pipeable(remove_)
