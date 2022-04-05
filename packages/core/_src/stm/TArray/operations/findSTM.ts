import { concreteTArray } from "@effect-ts/core/stm/TArray/operations/_internal/InternalTArray";

/**
 * Find the first element in the array matching a transactional predicate.
 *
 * @tsplus fluent ets/TArray findSTM
 */
export function findSTM_<E, A>(
  self: TArray<A>,
  f: (a: A) => STM<unknown, E, boolean>
): STM<unknown, E, Option<A>> {
  concreteTArray(self);
  const init = Tuple(Option.emptyOf<A>(), 0);
  const cont = (s: Tuple<[Option<A>, number]>) => s.get(0).isNone() && s.get(1) < self.chunk.length;
  return STM.iterate(
    init,
    cont
  )((s) => {
    const index = s.get(1);
    return self.chunk
      .unsafeGet(index)!
      .get()
      .flatMap((a) => f(a).map((result) => Tuple(result ? Option.some(a) : Option.none, index + 1)));
  }).map((tuple) => tuple.get(0));
}

/**
 * Find the first element in the array matching a transactional predicate.
 *
 * @tsplus static ets/TArray/Aspects findSTM
 */
export const findSTM = Pipeable(findSTM_);
