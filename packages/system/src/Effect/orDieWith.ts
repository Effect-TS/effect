// tracing: off

import { succeed } from "./core"
import { die } from "./die"
import type { Effect } from "./effect"
import { foldM_ } from "./foldM"

/**
 * Keeps none of the errors, and terminates the fiber with them, using
 * the specified function to convert the `E` into a `unknown`.
 *
 * @dataFirst orDieWith_
 */
export function orDieWith<E>(f: (e: E) => unknown, __trace?: string) {
  return <R, A>(effect: Effect<R, E, A>) => orDieWith_(effect, f, __trace)
}

/**
 * Keeps none of the errors, and terminates the fiber with them, using
 * the specified function to convert the `E` into a `unknown`.
 */
export function orDieWith_<R, E, A>(
  effect: Effect<R, E, A>,
  f: (e: E) => unknown,
  __trace?: string
) {
  return foldM_(effect, (e) => die(f(e)), succeed, __trace)
}
