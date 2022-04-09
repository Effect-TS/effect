/**
 * A schedule that recurs until the condition f fails, collecting all inputs
 * into a list.
 *
 * @tsplus static ets/Schedule/Ops collectUntil
 */
export function collectUntil<A>(
  f: Predicate<A>
): Schedule.WithState<Tuple<[void, Chunk<A>]>, unknown, A, Chunk<A>> {
  return Schedule.recurUntil(f).collectAll();
}
