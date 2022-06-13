/**
 * Makes an empty `TSet`.
 *
 * @tsplus static ets/TSet/Ops empty
 */
export function empty<A>(): USTM<TSet<A>> {
  return TSet.fromIterable(List.nil())
}
