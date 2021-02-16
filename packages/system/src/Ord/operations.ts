import type { Ordering } from "../Ordering"
import type { Ord } from "./definition"

/**
 * Creates Ord[A] from a compare function
 */
export function fromCompare<A>(compare: (y: A) => (x: A) => Ordering): Ord<A> {
  return {
    equals: (y) => (x) => compare(y)(x) === 0,
    compare
  }
}

/**
 * Creates Ord[A] from a compare function
 */
export function fromCompare_<A>(compare: (x: A, y: A) => Ordering): Ord<A> {
  return {
    equals: (y) => (x) => compare(x, y) === 0,
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
  return fromCompare((y) => (x) => fa.compare(f(y))(f(x)))
}

/**
 * Test whether one value is _strictly greater than_ another
 */
export function gt<A>(O: Ord<A>): (y: A) => (x: A) => boolean {
  return (y) => (x) => O.compare(y)(x) === 1
}

/**
 * Test whether one value is _non-strictly less than_ another
 */
export function leq<A>(O: Ord<A>): (y: A) => (x: A) => boolean {
  return (y) => (x) => O.compare(y)(x) !== 1
}

/**
 * Test whether one value is _strictly less than_ another
 */
export function lt<A>(O: Ord<A>): (y: A) => (x: A) => boolean {
  return (y) => (x) => O.compare(y)(x) === -1
}

/**
 * Take the maximum of two values. If they are considered equal, the first argument is chosen
 */
export function max<A>(O: Ord<A>): (y: A) => (x: A) => A {
  return (y) => (x) => (O.compare(y)(x) === -1 ? y : x)
}

/**
 * Take the minimum of two values. If they are considered equal, the first argument is chosen
 */
export function min<A>(O: Ord<A>): (y: A) => (x: A) => A {
  return (y) => (x) => (O.compare(y)(x) === 1 ? y : x)
}

/**
 * Test whether a value is between a minimum and a maximum (inclusive)
 */
export function between<A>(O: Ord<A>): (low: A, hi: A) => (x: A) => boolean {
  const lessThanO = lt(O)
  const greaterThanO = gt(O)
  return (low, hi) => (x) => (lessThanO(low)(x) || greaterThanO(hi)(x) ? false : true)
}

/**
 * Clamp a value between a minimum and a maximum
 */
export function clamp<A>(O: Ord<A>): (low: A, hi: A) => (x: A) => A {
  const minO = min(O)
  const maxO = max(O)
  return (low, hi) => (x) => maxO(low)(minO(hi)(x))
}

/**
 * Get the dual of an Ord
 */
export function dual<A>(O: Ord<A>) {
  return fromCompare<A>((y) => (x) => O.compare(x)(y))
}
