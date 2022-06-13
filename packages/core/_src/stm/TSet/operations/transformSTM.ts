import { concreteTSet } from "@effect/core/stm/TSet/operations/_internal/InternalTSet"

/**
 * Atomically updates all elements using a transactional function.
 *
 * @tsplus fluent ets/TSet transformSTM
 */
export function transformSTM_<A, R, E>(self: TSet<A>, f: (a: A) => STM<R, E, A>): STM<R, E, void> {
  concreteTSet(self)
  return self.tmap.transformSTM((kv) => f(kv.get(0)).map((_) => Tuple(_, kv.get(1))))
}

/**
 * Atomically updates all elements using a transactional function.
 *
 * @tsplus static ets/TSet/Aspects transformSTM
 */
export const transformSTM = Pipeable(transformSTM_)
