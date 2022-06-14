/**
 * A schedule that recurs until the condition f fails, collecting all inputs
 * into a list.
 *
 * @tsplus static ets/Schedule/Ops collectUntil
 */
export function collectUntil<A>(
  f: Predicate<A>
): Schedule<Tuple<[void, Chunk<A>]>, never, A, Chunk<A>> {
  return Schedule.recurUntil(f).collectAll
}
