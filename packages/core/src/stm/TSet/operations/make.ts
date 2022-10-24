/**
 * Makes a new `TSet` that is initialized with specified values.
 *
 * @tsplus static effect/core/stm/TSet.Ops make
 * @tsplus static effect/core/stm/TSet.Ops __call
 * @category constructors
 * @since 1.0.0
 */
export function make<A>(...data: Array<A>): USTM<TSet<A>> {
  return TSet.fromIterable(data)
}
