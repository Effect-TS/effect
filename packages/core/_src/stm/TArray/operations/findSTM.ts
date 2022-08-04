import { concreteTArray } from "@effect/core/stm/TArray/operations/_internal/InternalTArray"

/**
 * Find the first element in the array matching a transactional predicate.
 *
 * @tsplus static effect/core/stm/TArray.Aspects findSTM
 * @tsplus pipeable effect/core/stm/TArray findSTM
 */
export function findSTM<E, A>(f: (a: A) => STM<never, E, boolean>) {
  return (self: TArray<A>): STM<never, E, Maybe<A>> => {
    concreteTArray(self)
    const init = Tuple(Maybe.empty<A>(), 0)
    const cont = (s: Tuple<[Maybe<A>, number]>) => s.get(0).isNone() && s.get(1) < self.chunk.length
    return STM.iterate(
      init,
      cont
    )((s) => {
      const index = s.get(1)
      return self.chunk
        .unsafeGet(index)!
        .get
        .flatMap((a) => f(a).map((result) => Tuple(result ? Maybe.some(a) : Maybe.none, index + 1)))
    }).map((tuple) => tuple.get(0))
  }
}
