// ets_tracing: off

import type { Chunk } from "../Collections/Immutable/Chunk/index.js"
import type { Effect } from "./effect.js"
import { forEach_, forEachPar_, forEachParN_ } from "./excl-forEach.js"
import { flip } from "./flip.js"

/**
 * Feeds elements of type `A` to `f` until it succeeds. Returns first success
 * or the accumulation of all errors.
 */
export function validateFirst_<A, R, E, B>(
  i: Iterable<A>,
  f: (a: A) => Effect<R, E, B>,
  __trace?: string
): Effect<R, Chunk<E>, B> {
  return flip(forEach_(i, (a) => flip(f(a)), __trace))
}

/**
 * Feeds elements of type `A` to `f` until it succeeds. Returns first success
 * or the accumulation of all errors.
 *
 * @ets_data_first validateFirst_
 */
export function validateFirst<A, R, E, B>(
  f: (a: A) => Effect<R, E, B>,
  __trace?: string
) {
  return (i: Iterable<A>): Effect<R, Chunk<E>, B> => validateFirst_(i, f, __trace)
}

/**
 * Feeds elements of type `A` to `f`, in parallel, until it succeeds. Returns
 * first success or the accumulation of all errors.
 *
 * In case of success all other running fibers are terminated.
 */
export function validateFirstPar_<A, R, E, B>(
  i: Iterable<A>,
  f: (a: A) => Effect<R, E, B>,
  __trace?: string
): Effect<R, Chunk<E>, B> {
  return flip(forEachPar_(i, (a) => flip(f(a)), __trace))
}

/**
 * Feeds elements of type `A` to `f`, in parallel, until it succeeds. Returns
 * first success or the accumulation of all errors.
 *
 * In case of success all other running fibers are terminated.
 *
 * @ets_data_first validateFirstPar_
 */
export function validateFirstPar<A, R, E, B>(
  f: (a: A) => Effect<R, E, B>,
  __trace?: string
) {
  return (i: Iterable<A>): Effect<R, Chunk<E>, B> => validateFirstPar_(i, f, __trace)
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
  f: (a: A) => Effect<R, E, B>,
  __trace?: string
): Effect<R, Chunk<E>, B> {
  return flip(forEachParN_(i, n, (a) => flip(f(a)), __trace))
}

/**
 * Feeds elements of type `A` to `f`, in parallel, until it succeeds. Returns
 * first success or the accumulation of all errors.
 *
 * In case of success all other running fibers are terminated.
 *
 * Uses up to N fibers.
 *
 * @ets_data_first validateFirstParN_
 */
export function validateFirstParN<A, R, E, B>(
  n: number,
  f: (a: A) => Effect<R, E, B>,
  __trace?: string
): (i: Iterable<A>) => Effect<R, Chunk<E>, B> {
  return (i) => validateFirstParN_(i, n, f, __trace)
}
