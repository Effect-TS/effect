/**
 * Repeats this effect until its value is equal to the specified value or
 * until the first failure.
 *
 * @tsplus fluent ets/Effect repeatUntilEquals
 */
export function repeatUntilEquals_<R, E, A>(self: Effect<R, E, A>, E: Equivalence<A>) {
  return (a: LazyArg<A>, __tsplusTrace?: string): Effect<R, E, A> =>
    Effect.succeed(a).flatMap((a) => self.repeatUntil((_) => E.equals(_, a)));
}

/**
 * Repeats this effect until its value is equal to the specified value or
 * until the first failure.
 *
 * @tsplus static ets/Effect/Aspects repeatUntilEquals
 */
export const repeatUntilEquals = Pipeable(repeatUntilEquals_);
