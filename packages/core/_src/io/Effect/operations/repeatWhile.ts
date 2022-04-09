/**
 * Repeats this effect while its value satisfies the specified effectful
 * predicate or until the first failure.
 *
 * @tsplus fluent ets/Effect repeatWhile
 */
export function repeatWhile_<R, E, A>(
  self: Effect<R, E, A>,
  f: Predicate<A>,
  __tsplusTrace?: string
): Effect<R, E, A> {
  return self.repeatWhileEffect((a) => Effect.succeed(f(a)));
}

/**
 * Repeats this effect while its value satisfies the specified effectful
 * predicate or until the first failure.
 *
 * @tsplus static ets/Effect/Aspects repeatWhile
 */
export const repeatWhile = Pipeable(repeatWhile_);
