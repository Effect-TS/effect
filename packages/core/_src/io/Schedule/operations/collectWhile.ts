/**
 * A schedule that recurs as long as the condition f holds, collecting all
 * inputs into a list.
 *
 * @tsplus static effect/core/io/Schedule.Ops collectWhile
 */
export function collectWhile<A>(
  f: Predicate<A>
): Schedule<Tuple<[void, Chunk<A>]>, never, A, Chunk<A>> {
  return Schedule.recurWhile(f).collectAll
}
