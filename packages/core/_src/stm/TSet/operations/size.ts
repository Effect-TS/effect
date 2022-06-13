/**
 * Returns the set's cardinality.
 *
 * @tsplus getter ets/TSet size
 */
export function size<A>(self: TSet<A>): USTM<number> {
  return self.toList.map((_) => _.length)
}
