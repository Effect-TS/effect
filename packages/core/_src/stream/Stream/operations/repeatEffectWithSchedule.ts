/**
 * Creates a stream from an effect producing a value of type `A`, which is
 * repeated using the specified schedule.
 *
 * @tsplus static ets/Stream/Ops repeatEffectWithSchedule
 */
export function repeatEffectWithSchedule<S, R, E, A>(
  effect: LazyArg<Effect<R, E, A>>,
  schedule: LazyArg<Schedule.WithState<S, R, A, unknown>>,
  __tsplusTrace?: string
): Stream<R, E, A>;
export function repeatEffectWithSchedule<R, E, A>(
  effect: LazyArg<Effect<R, E, A>>,
  schedule: LazyArg<Schedule<R, A, unknown>>,
  __tsplusTrace?: string
): Stream<R, E, A> {
  return Stream.succeed(Tuple(effect(), schedule())).flatMap(
    ({ tuple: [effect, schedule] }) =>
      Stream.fromEffect(effect.zip(schedule.driver())).flatMap(
        ({ tuple: [a, driver] }) =>
          Stream.succeed(a) +
          Stream.unfoldEffect(a, (a) =>
            driver.next(a).foldEffect(
              (e) => Effect.succeed(e),
              () => effect.map((nextA) => Option.some(Tuple(nextA, nextA)))
            ))
      )
  );
}
