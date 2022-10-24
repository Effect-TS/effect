import { InternalTSet } from "@effect/core/stm/TSet/operations/_internal/InternalTSet"

/**
 * Makes a new `TSet` initialized with provided iterable.
 *
 * @tsplus static effect/core/stm/TSet.Ops fromIterable
 * @category constructors
 * @since 1.0.0
 */
export function fromIterable<A>(data: Iterable<A>): USTM<TSet<A>> {
  return TMap.fromIterable(Array.from(data).map((_) => [_, undefined as void] as const))
    .map((_) => new InternalTSet(_))
}
