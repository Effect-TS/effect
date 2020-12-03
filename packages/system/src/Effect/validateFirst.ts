import type { Effect } from "./effect"
import { flip } from "./flip"
import { foreach_, foreachPar_ } from "./foreach"
import { foreachParN_ } from "./foreachParN_"

/**
 * Feeds elements of type `A` to `f` until it succeeds. Returns first success
 * or the accumulation of all errors.
 */
export function validateFirst_<A, R, E, B>(
  i: Iterable<A>,
  f: (a: A) => Effect<R, E, B>
): Effect<R, readonly E[], B> {
  return flip(foreach_(i, (a) => flip(f(a))))
}

/**
 * Feeds elements of type `A` to `f` until it succeeds. Returns first success
 * or the accumulation of all errors.
 */
export function validateFirst<A, R, E, B>(f: (a: A) => Effect<R, E, B>) {
  return (i: Iterable<A>): Effect<R, readonly E[], B> => validateFirst_(i, f)
}

/**
 * Feeds elements of type `A` to `f`, in parallel, until it succeeds. Returns
 * first success or the accumulation of all errors.
 *
 * In case of success all other running fibers are terminated.
 */
export function validateFirstPar_<A, R, E, B>(
  i: Iterable<A>,
  f: (a: A) => Effect<R, E, B>
): Effect<R, readonly E[], B> {
  return flip(foreachPar_(i, (a) => flip(f(a))))
}

/**
 * Feeds elements of type `A` to `f`, in parallel, until it succeeds. Returns
 * first success or the accumulation of all errors.
 *
 * In case of success all other running fibers are terminated.
 */
export function validateFirstPar<A, R, E, B>(f: (a: A) => Effect<R, E, B>) {
  return (i: Iterable<A>): Effect<R, readonly E[], B> => validateFirstPar_(i, f)
}

/**
 * Feeds elements of type `A` to `f`, in parallel, until it succeeds. Returns
 * first success or the accumulation of all errors.
 *
 * In case of success all other running fibers are terminated.
 *
 * Uses up to N fibers.
 */
export function validateFirstParN_(
  n: number
): <A, R, E, B>(
  i: Iterable<A>,
  f: (a: A) => Effect<R, E, B>
) => Effect<R, readonly E[], B> {
  return (i, f) => flip(foreachParN_(n)(i, (a) => flip(f(a))))
}

/**
 * Feeds elements of type `A` to `f`, in parallel, until it succeeds. Returns
 * first success or the accumulation of all errors.
 *
 * In case of success all other running fibers are terminated.
 *
 * Uses up to N fibers.
 */
export function validateFirstParN(n: number) {
  return <A, R, E, B>(f: (a: A) => Effect<R, E, B>) => (
    i: Iterable<A>
  ): Effect<R, readonly E[], B> => validateFirstParN_(n)(i, f)
}
