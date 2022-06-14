import { concreteTArray } from "@effect/core/stm/TArray/operations/_internal/InternalTArray"

/**
 * Find the last element in the array matching a transactional predicate.
 *
 * @tsplus fluent ets/TArray findLastSTM
 */
export function findLastSTM_<E, A>(
  self: TArray<A>,
  f: (a: A) => STM<never, E, boolean>
): STM<never, E, Option<A>> {
  concreteTArray(self)
  const init = Tuple(Option.emptyOf<A>(), self.chunk.length - 1)
  const cont = (s: Tuple<[Option<A>, number]>) => s.get(0).isNone() && s.get(1) >= 0
  return STM.iterate(
    init,
    cont
  )((s) => {
    const index = s.get(1)
    return self.chunk
      .unsafeGet(index)!
      .get
      .flatMap((a) => f(a).map((result) => Tuple(result ? Option.some(a) : Option.none, index - 1)))
  }).map((tuple) => tuple.get(0))
}

/**
 * Find the last element in the array matching a transactional predicate.
 *
 * @tsplus static ets/TArray/Aspects findLastSTM
 */
export const findLastSTM = Pipeable(findLastSTM_)
