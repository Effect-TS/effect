// ets_tracing: off

import { chain_, succeed, yieldNow } from "./core.js"
import type { Effect } from "./effect.js"
import { zipRight_ } from "./zips.js"

/**
 * Repeats this effect until its error satisfies the specified effectful predicate.
 *
 * @ets_data_first repeatUntilM_
 */
export function repeatUntilM<A, R1, E1>(
  f: (a: A) => Effect<R1, E1, boolean>,
  __trace?: string
) {
  return <R, E>(self: Effect<R, E, A>): Effect<R & R1, E | E1, A> =>
    repeatUntilM_(self, f)
}

/**
 * Repeats this effect until its error satisfies the specified effectful predicate.
 */
export function repeatUntilM_<R, E, A, R1, E1>(
  self: Effect<R, E, A>,
  f: (a: A) => Effect<R1, E1, boolean>,
  __trace?: string
): Effect<R & R1, E | E1, A> {
  return chain_(
    self,
    (a) =>
      chain_(f(a), (b) =>
        b ? succeed(a) : zipRight_(yieldNow, repeatUntilM_(self, f))
      ),
    __trace
  )
}

/**
 * Repeats this effect until its error satisfies the specified predicate.
 *
 * @ets_data_first repeatUntil_
 */
export function repeatUntil<A>(f: (a: A) => boolean, __trace?: string) {
  return <R, E>(self: Effect<R, E, A>) => repeatUntil_(self, f, __trace)
}

/**
 * Repeats this effect until its error satisfies the specified predicate.
 */
export function repeatUntil_<R, E, A>(
  self: Effect<R, E, A>,
  f: (a: A) => boolean,
  __trace?: string
) {
  return repeatUntilM_(self, (a) => succeed(f(a)), __trace)
}
