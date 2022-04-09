/**
 * A schedule that recurs as long as the condition f holds, collecting all
 * inputs into a list.
 *
 * @tsplus static ets/Schedule/Ops collectWhile
 */
export function collectWhile<A>(
  f: Predicate<A>
): Schedule.WithState<Tuple<[void, Chunk<A>]>, unknown, A, Chunk<A>> {
  return Schedule.recurWhile(f).collectAll();
}
