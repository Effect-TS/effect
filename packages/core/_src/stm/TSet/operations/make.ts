/**
 * Makes a new `TSet` that is initialized with specified values.
 *
 * @tsplus static effect/core/stm/TSet.Ops make
 * @tsplus static effect/core/stm/TSet.Ops __call
 */
export function make<A>(...data: Array<A>): USTM<TSet<A>> {
  return TSet.fromIterable(data)
}
