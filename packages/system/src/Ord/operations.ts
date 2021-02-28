import type { Ordering } from "../Ordering"
import type { Ord } from "./definition"

/**
 * Creates Ord[A] from a compare function
 */
export function fromCompare<A>(compare: (x: A, y: A) => Ordering): Ord<A> {
  return {
    equals: (x, y) => compare(x, y) === 0,
    compare
  }
}

/**
 * Creates Ord[A] from equals & compare functions
 */
export function makeOrd<A>(
  equals: (x: A, y: A) => boolean,
  compare: (x: A, y: A) => Ordering
): Ord<A> {
  return {
    compare,
    equals
  }
}

/**
 * Contramap Ord input
 */
export function contramap<A, B>(f: (b: B) => A): (fa: Ord<A>) => Ord<B> {
  return (fa) => contramap_(fa, f)
}

/**
 * Contramap Ord input
 */
export function contramap_<A, B>(fa: Ord<A>, f: (b: B) => A): Ord<B> {
  return fromCompare((x, y) => fa.compare(f(x), f(y)))
}

/**
 * Test whether one value is _strictly greater than_ another
 */
export function gt<A>(O: Ord<A>): (x: A, y: A) => boolean {
  return (x, y) => O.compare(x, y) === 1
}

/**
 * Test whether one value is _non-strictly less than_ another
 */
export function leq<A>(O: Ord<A>): (x: A, y: A) => boolean {
  return (x, y) => O.compare(x, y) !== 1
}

/**
 * Test whether one value is _strictly less than_ another
 */
export function lt<A>(O: Ord<A>): (x: A, y: A) => boolean {
  return (x, y) => O.compare(x, y) === -1
}

/**
 * Take the maximum of two values. If they are considered equal, the first argument is chosen
 */
export function max<A>(O: Ord<A>): (x: A, y: A) => A {
  return (x, y) => (O.compare(x, y) === -1 ? y : x)
}

/**
 * Take the minimum of two values. If they are considered equal, the first argument is chosen
 */
export function min<A>(O: Ord<A>): (x: A, y: A) => A {
  return (x, y) => (O.compare(x, y) === 1 ? y : x)
}

/**
 * Test whether a value is between a minimum and a maximum (inclusive)
 */
export function between<A>(O: Ord<A>): (low: A, hi: A) => (x: A) => boolean {
  const lessThanO = lt(O)
  const greaterThanO = gt(O)
  return (low, hi) => (x) => (lessThanO(x, low) || greaterThanO(x, hi) ? false : true)
}

/**
 * Clamp a value between a minimum and a maximum
 */
export function clamp<A>(O: Ord<A>): (low: A, hi: A) => (x: A) => A {
  const minO = min(O)
  const maxO = max(O)
  return (low, hi) => (x) => maxO(minO(x, hi), low)
}

/**
 * Get the dual of an Ord
 */
export function inverted<A>(O: Ord<A>) {
  return fromCompare<A>((x, y) => O.compare(y, x))
}
