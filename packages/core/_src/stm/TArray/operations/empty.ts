/**
 * Makes a new `TArray` that is initialized with specified values.
 *
 * @tsplus static effect/core/stm/TArray.Ops empty
 */
export function empty<A>(): STM<never, never, TArray<A>> {
  return TArray.from<A>([])
}
