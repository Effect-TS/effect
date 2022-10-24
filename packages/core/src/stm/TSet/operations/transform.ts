import { concreteTSet } from "@effect/core/stm/TSet/operations/_internal/InternalTSet"

/**
 * Atomically updates all elements using a pure function.
 *
 * @tsplus static effect/core/stm/TSet.Aspects transform
 * @tsplus pipeable effect/core/stm/TSet transform
 * @category mutations
 * @since 1.0.0
 */
export function transform<A>(f: (a: A) => A) {
  return (self: TSet<A>): STM<never, never, void> => {
    concreteTSet(self)
    return self.tmap.transform((kv) => [f(kv[0]), kv[1]])
  }
}
