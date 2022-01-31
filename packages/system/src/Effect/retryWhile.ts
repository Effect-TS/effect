// ets_tracing: off

import { pipe } from "../Function/index.js"
import * as catchAll from "./catchAll.js"
import * as core from "./core.js"
import type { Effect } from "./effect.js"
import * as fail from "./fail.js"

/**
 * Retries this effect while its error satisfies the specified effectful predicate.
 *
 * @ets_data_first retryWhileM_
 */
export function retryWhileM<E, R1, E1>(
  f: (a: E) => Effect<R1, E1, boolean>,
  __trace?: string
) {
  return <R, A>(self: Effect<R, E, A>): Effect<R & R1, E | E1, A> =>
    retryWhileM_(self, f)
}

/**
 * Retries this effect while its error satisfies the specified effectful predicate.
 */
export function retryWhileM_<R, E, A, R1, E1>(
  self: Effect<R, E, A>,
  f: (a: E) => Effect<R1, E1, boolean>,
  __trace?: string
): Effect<R & R1, E | E1, A> {
  return core.suspend(
    () =>
      pipe(
        self,
        catchAll.catchAll((e) =>
          pipe(
            f(e),
            core.chain((b) => (b ? retryWhileM_(self, f) : fail.fail(e)))
          )
        )
      ),
    __trace
  )
}

/**
 * Retries this effect while its error satisfies the specified predicate.
 *
 * @ets_data_first retryWhile_
 */
export function retryWhile<E>(f: (a: E) => boolean, __trace?: string) {
  return <R, A>(self: Effect<R, E, A>) => retryWhile_(self, f, __trace)
}

/**
 * Retries this effect while its error satisfies the specified predicate.
 */
export function retryWhile_<R, E, A>(
  self: Effect<R, E, A>,
  f: (a: E) => boolean,
  __trace?: string
) {
  return retryWhileM_(self, (a) => core.succeed(f(a)), __trace)
}
