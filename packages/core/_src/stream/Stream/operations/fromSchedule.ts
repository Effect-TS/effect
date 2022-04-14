/**
 * Creates a stream from a `Schedule` that does not require any further
 * input. The stream will emit an element for each value output from the
 * schedule, continuing for as long as the schedule continues.
 *
 * @tsplus static ets/Stream/Ops fromSchedule
 */
export function fromSchedule<S, R, A>(
  schedule: LazyArg<Schedule<S, R, unknown, A>>,
  __tsplusTrace?: string
): Stream<R, never, A> {
  return Stream.unwrap(
    schedule()
      .driver()
      .map((driver) => Stream.repeatEffectOption(driver.next(undefined)))
  );
}
