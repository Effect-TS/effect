import type { Effect } from "./effect"
import { flip } from "./flip"
import { forEach_, forEachPar_, forEachParN_ } from "./forEach"

/**
 * Feeds elements of type `A` to `f` until it succeeds. Returns first success
 * or the accumulation of all errors.
 */
export function validateFirst_<A, R, E, B>(
  i: Iterable<A>,
  f: (a: A) => Effect<R, E, B>
): Effect<R, readonly E[], B> {
  return flip(forEach_(i, (a) => flip(f(a))))
}

/**
 * Feeds elements of type `A` to `f` until it succeeds. Returns first success
 * or the accumulation of all errors.
 *
 * @dataFirst validateFirst_
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
  return flip(forEachPar_(i, (a) => flip(f(a))))
}

/**
 * Feeds elements of type `A` to `f`, in parallel, until it succeeds. Returns
 * first success or the accumulation of all errors.
 *
 * In case of success all other running fibers are terminated.
 *
 * @dataFirst validateFirstPar_
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
export function validateFirstParN_<A, R, E, B>(
  i: Iterable<A>,
  n: number,
  f: (a: A) => Effect<R, E, B>
): Effect<R, readonly E[], B> {
  return flip(forEachParN_(i, n, (a) => flip(f(a))))
}

/**
 * Feeds elements of type `A` to `f`, in parallel, until it succeeds. Returns
 * first success or the accumulation of all errors.
 *
 * In case of success all other running fibers are terminated.
 *
 * Uses up to N fibers.
 *
 * @dataFirst validateFirstParN_
 */
export function validateFirstParN<A, R, E, B>(
  n: number,
  f: (a: A) => Effect<R, E, B>
): (i: Iterable<A>) => Effect<R, readonly E[], B> {
  return (i) => validateFirstParN_(i, n, f)
}
