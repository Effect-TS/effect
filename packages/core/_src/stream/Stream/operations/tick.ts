/**
 * Returns a stream that emits `undefined` values spaced by the specified
 * duration.
 *
 * @tsplus static ets/Stream/Ops tick
 */
export function tick(
  interval: LazyArg<Duration>,
  __tsplusTrace?: string
): Stream<unknown, never, void> {
  return Stream.repeatWithSchedule(() => undefined, Schedule.spaced(interval));
}
