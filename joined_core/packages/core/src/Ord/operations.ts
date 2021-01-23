import type { Associative } from "../Associative"
import { makeAssociative } from "../Associative"
import type { Identity } from "../Identity"
import { makeIdentity } from "../Identity"
import { Associative as OrderingAssociative, Ordering } from "../Ordering"
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
 * Returns a `Associative` such that:
 *
 * - its `combine(ord2)(ord1)` operation will order first by `ord1`, and then by `ord2`
 */
export function getAssociative<A = never>(): Associative<Ord<A>> {
  return makeAssociative((y) => (x) =>
    fromCompare((b) => (a) =>
      OrderingAssociative.combine(y.compare(b)(a))(x.compare(b)(a))
    )
  )
}

/**
 * Returns a `Identity` such that:
 *
 * - its `combine(ord2)(ord1)` operation will order first by `ord1`, and then by `ord2`
 * - its `empty` value is an `Ord` that always considers compared elements equal
 */
export function getIdentity<A = never>(): Identity<Ord<A>> {
  return makeIdentity(
    fromCompare(() => () => Ordering.wrap("eq")),
    getAssociative<A>().combine
  )
}

/**
 * Test whether one value is _strictly greater than_ another
 */
export function gt<A>(O: Ord<A>): (y: A) => (x: A) => boolean {
  return (y) => (x) => O.compare(y)(x) === Ordering.wrap("gt")
}

/**
 * Test whether one value is _non-strictly less than_ another
 */
export function leq<A>(O: Ord<A>): (y: A) => (x: A) => boolean {
  return (y) => (x) => O.compare(y)(x) !== Ordering.wrap("gt")
}

/**
 * Test whether one value is _strictly less than_ another
 */
export function lt<A>(O: Ord<A>): (y: A) => (x: A) => boolean {
  return (y) => (x) => O.compare(y)(x) === Ordering.wrap("lt")
}

/**
 * Take the maximum of two values. If they are considered equal, the first argument is chosen
 */
export function max<A>(O: Ord<A>): (y: A) => (x: A) => A {
  return (y) => (x) => (O.compare(y)(x) === Ordering.wrap("lt") ? y : x)
}

/**
 * Take the minimum of two values. If they are considered equal, the first argument is chosen
 */
export function min<A>(O: Ord<A>): (y: A) => (x: A) => A {
  return (y) => (x) => (O.compare(y)(x) === Ordering.wrap("gt") ? y : x)
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
