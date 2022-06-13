import { InternalTSet } from "@effect/core/stm/TSet/operations/_internal/InternalTSet"

/**
 * Makes a new `TSet` initialized with provided iterable.
 *
 * @tsplus static ets/TSet/Ops fromIterable
 */
export function fromIterable<A>(data: Collection<A>): USTM<TSet<A>> {
  return TMap.fromIterable(data.map((_) => Tuple(_, undefined as void))).map((_) => new InternalTSet(_))
}
