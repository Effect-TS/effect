/**
 * Repeats this effect until its value satisfies the specified predicate or
 * until the first failure.
 *
 * @tsplus fluent ets/Effect repeatUntil
 */
export function repeatUntil_<R, E, A>(
  self: Effect<R, E, A>,
  p: Predicate<A>,
  __tsplusTrace?: string
): Effect<R, E, A> {
  return self.repeatUntilEffect((a) => Effect.succeed(p(a)))
}

/**
 * Repeats this effect until its value satisfies the specified predicate or
 * until the first failure.
 *
 * @tsplus static ets/Effect/Aspects repeatUntil
 */
export const repeatUntil = Pipeable(repeatUntil_)
