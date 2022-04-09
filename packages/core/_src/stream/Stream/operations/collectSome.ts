/**
 * Filters any 'None' values.
 *
 * @tsplus fluent ets/Stream collectSome
 */
export function collectSome<R, E, A>(
  self: Stream<R, E, Option<A>>,
  __tsplusTrace?: string
): Stream<R, E, A> {
  return self.collect((option) => option.isSome() ? Option.some(option.value) : Option.none);
}
