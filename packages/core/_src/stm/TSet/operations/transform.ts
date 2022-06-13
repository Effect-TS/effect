import { concreteTSet } from "@effect/core/stm/TSet/operations/_internal/InternalTSet"

/**
 * Atomically updates all elements using a pure function.
 *
 * @tsplus fluent ets/TSet transform
 */
export function transform_<A>(self: TSet<A>, f: (a: A) => A): USTM<void> {
  concreteTSet(self)
  return self.tmap.transform((kv) => Tuple(f(kv.get(0)), kv.get(1)))
}

/**
 * Atomically updates all elements using a pure function.
 *
 * @tsplus static ets/TSet/Aspects transform
 */
export const transform = Pipeable(transform_)
