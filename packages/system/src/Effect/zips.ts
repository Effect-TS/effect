// ets_tracing: off

import type { Effect } from "./effect"
import { zipWith_ } from "./zipWith"
import { zipWithPar_ } from "./zipWithPar"

/**
 * Sequentially zips this effect with the specified effect
 * returning the left side
 */
export function zipLeft_<R, E, A, R2, E2, A2>(
  a: Effect<R, E, A>,
  b: Effect<R2, E2, A2>,
  __trace?: string
): Effect<R & R2, E | E2, A> {
  return zipWith_(a, b, (a) => a, __trace)
}

/**
 * Sequentially zips this effect with the specified effect
 * returning the left side
 *
 * @ets_data_first zipLeft
 */
export function zipLeft<R2, E2, A2>(b: Effect<R2, E2, A2>, __trace?: string) {
  return <R, E, A>(a: Effect<R, E, A>) => zipLeft_(a, b, __trace)
}

/**
 * Parallelly zips this effect with the specified effect
 * returning the left side
 */
export function zipLeftPar_<R, E, A, R2, E2, A2>(
  a: Effect<R, E, A>,
  b: Effect<R2, E2, A2>,
  __trace?: string
): Effect<R & R2, E | E2, A> {
  return zipWithPar_(a, b, (a) => a, __trace)
}

/**
 * Parallelly zips this effect with the specified effect
 * returning the left side
 *
 * @ets_data_first zipLeftPar_
 */
export function zipLeftPar<R2, E2, A2>(b: Effect<R2, E2, A2>, __trace?: string) {
  return <R, E, A>(a: Effect<R, E, A>) => zipLeftPar_(a, b, __trace)
}

/**
 * Sequentially zips this effect with the specified effect
 * returning the right side
 */
export function zipRight_<R, E, A, R2, E2, A2>(
  a: Effect<R, E, A>,
  b: Effect<R2, E2, A2>,
  __trace?: string
): Effect<R & R2, E | E2, A2> {
  return zipWith_(a, b, (_, a) => a, __trace)
}

/**
 * Sequentially zips this effect with the specified effect
 * returning the right side
 *
 * @ets_data_first zipRight_
 */
export function zipRight<R2, E2, A2>(b: Effect<R2, E2, A2>, __trace?: string) {
  return <R, E, A>(a: Effect<R, E, A>) => zipRight_(a, b, __trace)
}

/**
 * Parallelly zips this effect with the specified effect
 * returning the right side
 */
export function zipRightPar_<R, E, A, R2, E2, A2>(
  a: Effect<R, E, A>,
  b: Effect<R2, E2, A2>,
  __trace?: string
): Effect<R & R2, E | E2, A2> {
  return zipWithPar_(a, b, (_, a) => a, __trace)
}

/**
 * Parallelly zips this effect with the specified effect
 * returning the right side
 *
 * @ets_data_first zipRightPar_
 */
export function zipRightPar<R2, E2, A2>(b: Effect<R2, E2, A2>, __trace?: string) {
  return <R, E, A>(a: Effect<R, E, A>) => zipRightPar_(a, b, __trace)
}
