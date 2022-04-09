/**
 * Repeats this effect until its value satisfies the specified effectful
 * predicate or until the first failure.
 *
 * @tsplus fluent ets/Effect repeatUntilEffect
 */
export function repeatUntilEffect_<R, E, A, R1>(
  self: Effect<R, E, A>,
  f: (a: A) => Effect<R1, never, boolean>,
  __tsplusTrace?: string
): Effect<R & R1, E, A> {
  return self.flatMap((a) =>
    f(a).flatMap((b) => b ? Effect.succeedNow(a) : Effect.yieldNow.zipRight(repeatUntilEffect_(self, f)))
  );
}

/**
 * Repeats this effect until its value satisfies the specified effectful
 * predicate or until the first failure.
 *
 * @tsplus static ets/Effect/Aspects repeatUntilEffect
 */
export const repeatUntilEffect = Pipeable(repeatUntilEffect_);
