import { InternalTSet } from "@effect/core/stm/TSet/operations/_internal/InternalTSet"

/**
 * Makes a new `TSet` initialized with provided iterable.
 *
 * @tsplus static effect/core/stm/TSet.Ops fromIterable
 */
export function fromIterable<A>(data: Collection<A>): USTM<TSet<A>> {
  return TMap.fromIterable(data.map((_) => [_, undefined as void] as const))
    .map((_) => new InternalTSet(_))
}
