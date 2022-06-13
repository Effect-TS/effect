/**
 * Makes a new `TSet` that is initialized with specified values.
 *
 * @tsplus static ets/TSet/Ops make
 * @tsplus static ets/TSet/Ops __call
 */
export function make<A>(...data: Array<A>): USTM<TSet<A>> {
  return TSet.fromIterable(data)
}
