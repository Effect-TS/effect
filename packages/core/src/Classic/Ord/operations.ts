import { Ordering } from "../Ordering"
import type { Ord } from "./definition"

/**
 * Creates Ord[A] from a compare function
 */
export function fromCompare<A>(compare: (y: A) => (x: A) => Ordering): Ord<A> {
  return {
    equals: (y) => (x) => Ordering.unwrap(compare(y)(x)) === "eq",
    compare
  }
}

/**
 * Creates Ord[A] from a compare function
 */
export function fromCompare_<A>(compare: (x: A, y: A) => Ordering): Ord<A> {
  return {
    equals: (y) => (x) => Ordering.unwrap(compare(x, y)) === "eq",
    compare: (y) => (x) => compare(x, y)
  }
}

/**
 * Creates Ord[A] from equals & compare functions
 */
export function makeOrd<A>(
  equals: (y: A) => (x: A) => boolean,
  compare: (y: A) => (x: A) => Ordering
): Ord<A> {
  return {
    compare,
    equals
  }
}
