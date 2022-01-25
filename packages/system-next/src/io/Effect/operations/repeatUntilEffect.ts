import type { Effect } from "../definition"
import { chain_ } from "./chain"
import { succeedNow } from "./succeedNow"
import { yieldNow } from "./yieldNow"
import { zipRight_ } from "./zipRight"

/**
 * Repeats this effect until its value satisfies the specified effectful
 * predicate or until the first failure.
 *
 * @ets_data_first repeatUntilEffect_
 */
export function repeatUntilEffect<A, R1>(
  f: (a: A) => Effect<R1, never, boolean>,
  __etsTrace?: string
) {
  return <R, E>(self: Effect<R, E, A>): Effect<R & R1, E, A> =>
    repeatUntilEffect_(self, f, __etsTrace)
}

/**
 * Repeats this effect until its value satisfies the specified effectful
 * predicate or until the first failure.
 *
 * @ets fluent ets/Effect repeatUntilEffect
 */
export function repeatUntilEffect_<R, E, A, R1>(
  self: Effect<R, E, A>,
  f: (a: A) => Effect<R1, never, boolean>,
  __etsTrace?: string
): Effect<R & R1, E, A> {
  return chain_(self, (a) =>
    chain_(
      f(a),
      (b) =>
        b
          ? succeedNow(a)
          : zipRight_(yieldNow, repeatUntilEffect_(self, f, __etsTrace)),
      __etsTrace
    )
  )
}
