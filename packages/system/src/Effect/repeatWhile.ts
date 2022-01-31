// ets_tracing: off

import { chain_, succeed } from "./core.js"
import type { Effect } from "./effect.js"

/**
 * Repeats this effect while its error satisfies the specified effectful predicate.
 *
 * @ets_data_first repeatWhileM_
 */
export function repeatWhileM<A, R1, E1>(
  f: (a: A) => Effect<R1, E1, boolean>,
  __trace?: string
) {
  return <R, E>(self: Effect<R, E, A>): Effect<R & R1, E | E1, A> =>
    repeatWhileM_(self, f, __trace)
}

/**
 * Repeats this effect while its error satisfies the specified effectful predicate.
 */
export function repeatWhileM_<R, E, A, R1, E1>(
  self: Effect<R, E, A>,
  f: (a: A) => Effect<R1, E1, boolean>,
  __trace?: string
): Effect<R & R1, E | E1, A> {
  return chain_(
    self,
    (a) => chain_(f(a), (b) => (b ? repeatWhileM_(self, f) : succeed(a))),
    __trace
  )
}

/**
 * Repeats this effect while its error satisfies the specified predicate.
 *
 * @ets_data_first repeatWhile_
 */
export function repeatWhile<A>(f: (a: A) => boolean, __trace?: string) {
  return <R, E>(self: Effect<R, E, A>) => repeatWhile_(self, f, __trace)
}

/**
 * Repeats this effect while its error satisfies the specified predicate.
 */
export function repeatWhile_<R, E, A>(
  self: Effect<R, E, A>,
  f: (a: A) => boolean,
  __trace?: string
) {
  return repeatWhileM_(self, (a) => succeed(f(a)), __trace)
}
