import type { Effect } from "./effect"
import { zipWith_ } from "./zipWith_"
import { zipWithPar_ } from "./zipWithPar_"

/**
 * Sequentially zips this effect with the specified effect
 * returning the left side
 */
export function zipLeft_<R, E, A, R2, E2, A2>(
  a: Effect<R, E, A>,
  b: Effect<R2, E2, A2>
): Effect<R & R2, E | E2, A> {
  return zipWith_(a, b, (a) => a)
}

/**
 * Sequentially zips this effect with the specified effect
 * returning the left side
 */
export function zipLeft<R2, E2, A2>(b: Effect<R2, E2, A2>) {
  return <R, E, A>(a: Effect<R, E, A>) => zipLeft_(a, b)
}

/**
 * Parallelly zips this effect with the specified effect
 * returning the left side
 */
export function zipLeftPar_<R, E, A, R2, E2, A2>(
  a: Effect<R, E, A>,
  b: Effect<R2, E2, A2>
): Effect<R & R2, E | E2, A> {
  return zipWithPar_(a, b, (a) => a)
}

/**
 * Parallelly zips this effect with the specified effect
 * returning the left side
 */
export function zipLeftPar<R2, E2, A2>(b: Effect<R2, E2, A2>) {
  return <R, E, A>(a: Effect<R, E, A>) => zipLeftPar_(a, b)
}

/**
 * Sequentially zips this effect with the specified effect
 * returning the right side
 */
export function zipRight_<R, E, A, R2, E2, A2>(
  a: Effect<R, E, A>,
  b: Effect<R2, E2, A2>
): Effect<R & R2, E | E2, A2> {
  return zipWith_(a, b, (_, a) => a)
}

/**
 * Sequentially zips this effect with the specified effect
 * returning the right side
 */
export function zipRight<R2, E2, A2>(b: Effect<R2, E2, A2>) {
  return <R, E, A>(a: Effect<R, E, A>) => zipRight_(a, b)
}

/**
 * Parallelly zips this effect with the specified effect
 * returning the right side
 */
export function zipRightPar_<R, E, A, R2, E2, A2>(
  a: Effect<R, E, A>,
  b: Effect<R2, E2, A2>
): Effect<R & R2, E | E2, A2> {
  return zipWithPar_(a, b, (_, a) => a)
}

/**
 * Parallelly zips this effect with the specified effect
 * returning the right side
 */
export function zipRightPar<R2, E2, A2>(b: Effect<R2, E2, A2>) {
  return <R, E, A>(a: Effect<R, E, A>) => zipRightPar_(a, b)
}
