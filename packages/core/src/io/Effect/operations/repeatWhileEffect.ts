import type { Effect, RIO } from "../definition"

/**
 * Repeats this effect while its value satisfies the specified effectful
 * predicate or until the first failure.
 *
 * @tsplus fluent ets/Effect repeatWhileEffect
 */
export function repeatWhileEffect_<R, R1, E, A>(
  self: Effect<R, E, A>,
  f: (a: A) => RIO<R1, boolean>,
  __tsplusTrace?: string
): Effect<R & R1, E, A> {
  return self.repeatUntilEffect((a) => f(a).negate())
}

/**
 * Repeats this effect while its value satisfies the specified effectful
 * predicate or until the first failure.
 *
 * @ets_data_first repeatWhileEffect_
 */
export function repeatWhileEffect<R1, A>(
  f: (a: A) => RIO<R1, boolean>,
  __tsplusTrace?: string
) {
  return <R, E>(self: Effect<R, E, A>): Effect<R & R1, E, A> =>
    self.repeatWhileEffect(f)
}
