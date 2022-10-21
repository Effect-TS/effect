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
    const init = [Maybe.empty<A>(), 0 as number] as const
    const cont = (s: readonly [Maybe<A>, number]) => s[0].isNone() && s[1] < self.chunk.length
    return STM.iterate(
      init,
      cont
    )((s) => {
      const index = s[1]
      return self.chunk
        .unsafeGet(index)!
        .get
        .flatMap((a) =>
          f(a).map((result) => [result ? Maybe.some(a) : Maybe.none, index + 1] as const)
        )
    }).map((tuple) => tuple[0])
  }
}
