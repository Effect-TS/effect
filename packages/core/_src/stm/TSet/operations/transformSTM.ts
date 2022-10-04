import { concreteTSet } from "@effect/core/stm/TSet/operations/_internal/InternalTSet"

/**
 * Atomically updates all elements using a transactional function.
 *
 * @tsplus static effect/core/stm/TSet.Aspects transformSTM
 * @tsplus pipeable effect/core/stm/TSet transformSTM
 */
export function transformSTM<A, R, E>(f: (a: A) => STM<R, E, A>) {
  return (self: TSet<A>): STM<R, E, void> => {
    concreteTSet(self)
    return self.tmap.transformSTM((kv) => f(kv[0]).map((_) => [_, kv[1]]))
  }
}
