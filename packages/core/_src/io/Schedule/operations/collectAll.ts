/**
 * A schedule that recurs anywhere, collecting all inputs into a `Chunk`.
 *
 * @tsplus static ets/Schedule/Ops collectAll
 */
export function collectAll<A>(): Schedule<
  Tuple<[void, Chunk<A>]>,
  never,
  A,
  Chunk<A>
> {
  return Schedule.identity<A>().collectAll()
}
