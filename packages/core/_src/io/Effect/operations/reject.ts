/**
 * Fail with the returned value if the `PartialFunction` matches, otherwise
 * continue with our held value.
 *
 * @tsplus static effect/core/io/Effect.Aspects reject
 * @tsplus pipeable effect/core/io/Effect reject
 */
export function reject<A, E1>(pf: (a: A) => Maybe<E1>, __tsplusTrace?: string) {
  return <R, E>(self: Effect<R, E, A>): Effect<R, E | E1, A> => self.rejectEffect((a) => pf(a).map(Effect.fail))
}
