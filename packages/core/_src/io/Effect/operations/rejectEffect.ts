/**
 * Continue with the returned computation if the `PartialFunction` matches,
 * translating the successful match into a failure, otherwise continue with
 * our held value.
 *
 * @tsplus static effect/core/io/Effect.Aspects rejectEffect
 * @tsplus pipeable effect/core/io/Effect rejectEffect
 */
export function rejectEffect<A, R1, E1>(
  pf: (a: A) => Maybe<Effect<R1, E1, E1>>,
  __tsplusTrace?: string
) {
  return <R, E>(self: Effect<R, E, A>): Effect<R | R1, E | E1, A> =>
    self.flatMap((a) =>
      pf(a).fold(
        () => Effect.succeed(a),
        (effect) => effect.flatMap(Effect.fail)
      )
    )
}
