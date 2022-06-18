/**
 * Repeats this effect while its value satisfies the specified effectful
 * predicate or until the first failure.
 *
 * @tsplus fluent ets/Effect repeatWhileEffect
 */
export function repeatWhileEffect_<R, R1, E, A>(
  self: Effect<R, E, A>,
  f: (a: A) => Effect<R1, never, boolean>,
  __tsplusTrace?: string
): Effect<R | R1, E, A> {
  return self.repeatUntilEffect((a) => f(a).negate())
}

/**
 * Repeats this effect while its value satisfies the specified effectful
 * predicate or until the first failure.
 *
 * @tsplus static ets/Effect/Aspects repeatWhileEffect
 */
export const repeatWhileEffect = Pipeable(repeatWhileEffect_)
