/**
 * A schedule that recurs anywhere, collecting all inputs into a `Chunk`.
 *
 * @tsplus static ets/Schedule/Ops collectAll
 */
export function collectAll<A>(): Schedule.WithState<
  Tuple<[void, Chunk<A>]>,
  unknown,
  A,
  Chunk<A>
> {
  return Schedule.identity<A>().collectAll();
}
