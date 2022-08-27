/**
 * Creates a stream from an effect producing a value of type `A`, which is
 * repeated using the specified schedule.
 *
 * @tsplus static effect/core/stream/Stream.Ops repeatEffectWithSchedule
 */
export function repeatEffectWithSchedule<S, R, E, A>(
  effect: Effect<R, E, A>,
  schedule: Schedule<S, R, A, unknown>
): Stream<R, E, A> {
  return Stream.fromEffect(effect.zip(schedule.driver)).flatMap(
    ({ tuple: [a, driver] }) =>
      Stream.succeed(a) +
      Stream.unfoldEffect(a, (a) =>
        driver.next(a).foldEffect(
          (e) => Effect.succeed(e),
          () => effect.map((nextA) => Maybe.some(Tuple(nextA, nextA)))
        ))
  )
}
