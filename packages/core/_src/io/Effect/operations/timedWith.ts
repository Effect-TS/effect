/**
 * A more powerful variation of `timed` that allows specifying the clock.
 *
 * @tsplus fluent ets/Effect timedWith
 */
export function timedWith_<R, E, A, R1, E1>(
  self: Effect<R, E, A>,
  milliseconds: LazyArg<Effect<R1, E1, number>>,
  __tsplusTrace?: string
): Effect<R & R1, E | E1, Tuple<[Duration, A]>> {
  return self.summarized(milliseconds, (start, end) => new Duration(end - start));
}

/**
 * A more powerful variation of `timed` that allows specifying the clock.
 *
 * @tsplus static ets/Effect/Aspects timedWith
 */
export const timedWith = Pipeable(timedWith_);
