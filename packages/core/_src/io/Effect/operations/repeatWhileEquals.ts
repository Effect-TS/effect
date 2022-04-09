/**
 * Repeats this effect for as long as its value is equal to the specified
 * value or until the first failure.
 *
 * @tsplus fluent ets/Effect repeatWhileEquals
 */
export function repeatWhileEquals_<R, E, A>(self: Effect<R, E, A>, E: Equivalence<A>) {
  return (a: LazyArg<A>, __tsplusTrace?: string): Effect<R, E, A> =>
    Effect.succeed(a).flatMap((a) => self.repeatWhile((_) => E.equals(_, a)));
}

/**
 * Repeats this effect for as long as its value is equal to the specified
 * value or until the first failure.
 *
 * @tsplus static ets/Effect/Aspects repeatWhileEquals
 */
export const repeatWhileEquals = Pipeable(repeatWhileEquals_);
