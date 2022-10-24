import * as List from "@fp-ts/data/List"

/**
 * Makes an empty `TSet`.
 *
 * @tsplus static effect/core/stm/TSet.Ops empty
 * @category constructors
 * @since 1.0.0
 */
export function empty<A>(): USTM<TSet<A>> {
  return TSet.fromIterable(List.nil())
}
