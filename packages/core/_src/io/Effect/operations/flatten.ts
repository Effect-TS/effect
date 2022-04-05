/**
 * Returns an effect that performs the outer effect first, followed by the
 * inner effect, yielding the value of the inner effect.
 *
 * This method can be used to "flatten" nested effects.
 *
 * @tsplus static ets/Effect/Ops flatten
 */
export function flatten<R, E, R1, E1, A>(
  effect: LazyArg<Effect<R, E, Effect<R1, E1, A>>>,
  __tsplusTrace?: string
): Effect<R & R1, E | E1, A> {
  return Effect.succeed(effect).flatMap((_) => _.flatMap(identity));
}

/**
 * Returns an effect that performs the outer effect first, followed by the
 * inner effect, yielding the value of the inner effect.
 *
 * This method can be used to "flatten" nested effects.
 *
 * @tsplus fluent ets/Effect flatten
 */
export function flattenNow<R, E, R1, E1, A>(
  self: Effect<R, E, Effect<R1, E1, A>>,
  __tsplusTrace?: string
): Effect<R & R1, E | E1, A> {
  return self.flatMap(identity);
}
