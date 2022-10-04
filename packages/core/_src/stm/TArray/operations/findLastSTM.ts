import { concreteTArray } from "@effect/core/stm/TArray/operations/_internal/InternalTArray"

/**
 * Find the last element in the array matching a transactional predicate.
 *
 * @tsplus static effect/core/stm/TArray.Aspects findLastSTM
 * @tsplus pipeable effect/core/stm/TArray findLastSTM
 */
export function findLastSTM<E, A>(f: (a: A) => STM<never, E, boolean>) {
  return (self: TArray<A>): STM<never, E, Maybe<A>> => {
    concreteTArray(self)
    const init = [Maybe.empty<A>(), self.chunk.length - 1] as const
    const cont = (s: readonly [Maybe<A>, number]) => s[0].isNone() && s[1] >= 0
    return STM.iterate(
      init,
      cont
    )((s) => {
      const index = s[1]
      return self.chunk
        .unsafeGet(index)!
        .get
        .flatMap((a) =>
          f(a).map((result) => [result ? Maybe.some(a) : Maybe.none, index - 1] as const)
        )
    }).map((tuple) => tuple[0])
  }
}
