// ets_tracing: off

import { pipe } from "../Function/index.js"
import * as catchAll from "./catchAll.js"
import * as core from "./core.js"
import type { Effect } from "./effect.js"
import * as fail from "./fail.js"
import { zipRight_ } from "./zips.js"

/**
 * Retries this effect until its error satisfies the specified effectful predicate.
 *
 * @ets_data_first retryUtilM_
 */
export function retryUntilM<E, R1, E1>(
  f: (a: E) => Effect<R1, E1, boolean>,
  __trace?: string
) {
  return <R, A>(self: Effect<R, E, A>): Effect<R & R1, E | E1, A> =>
    retryUntilM_(self, f)
}

/**
 * Retries this effect until its error satisfies the specified effectful predicate.
 */
export function retryUntilM_<R, E, A, R1, E1>(
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
            core.chain((b) =>
              b ? fail.fail(e) : zipRight_(core.yieldNow, retryUntilM_(self, f))
            )
          )
        )
      ),
    __trace
  )
}

/**
 * Retries this effect until its error satisfies the specified predicate.
 *
 * @ets_data_first retryUntil_
 */
export function retryUntil<E>(f: (a: E) => boolean, __trace?: string) {
  return <R, A>(self: Effect<R, E, A>) => retryUntil_(self, f, __trace)
}

/**
 * Retries this effect until its error satisfies the specified predicate.
 */
export function retryUntil_<R, E, A>(
  self: Effect<R, E, A>,
  f: (a: E) => boolean,
  __trace?: string
) {
  return retryUntilM_(self, (a) => core.succeed(f(a)), __trace)
}
