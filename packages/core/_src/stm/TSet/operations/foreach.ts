import { concreteTSet } from "@effect/core/stm/TSet/operations/_internal/InternalTSet"

/**
 * Atomically performs transactional-effect for each element in set.
 *
 * @tsplus fluent ets/TSet foreach
 */
export function foreach_<A, R, E>(self: TSet<A>, f: (a: A) => STM<R, E, void>): STM<R, E, void> {
  concreteTSet(self)
  return self.tmap.foldSTM(undefined as void, (_, kv) => f(kv.get(0)))
}

/**
 * Atomically performs transactional-effect for each element in set.
 *
 * @tsplus static ets/TSet/Aspects foreach
 */
export const foreach = Pipeable(foreach_)
