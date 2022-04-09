/**
 * Filters any `Exit.Failure` values.
 *
 * @tsplus fluent ets/Stream collectSuccess
 */
export function collectSuccess<R, E, L, A>(
  self: Stream<R, E, Exit<L, A>>,
  __tsplusTrace?: string
): Stream<R, E, A> {
  return self.collect((exit) => exit.isSuccess() ? Option.some(exit.value) : Option.none);
}
