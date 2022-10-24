import { concreteTArray } from "@effect/core/stm/TArray/operations/_internal/InternalTArray"
import * as Chunk from "@fp-ts/data/Chunk"
import { pipe } from "@fp-ts/data/Function"
import * as Option from "@fp-ts/data/Option"

/**
 * Find the last element in the array matching a transactional predicate.
 *
 * @tsplus static effect/core/stm/TArray.Aspects findLastSTM
 * @tsplus pipeable effect/core/stm/TArray findLastSTM
 * @category elements
 * @since 1.0.0
 */
export function findLastSTM<E, A>(f: (a: A) => STM<never, E, boolean>) {
  return (self: TArray<A>): STM<never, E, Option.Option<A>> => {
    concreteTArray(self)
    const init = [Option.none, self.chunk.length - 1] as [Option.Option<A>, number]
    const cont = (s: readonly [Option.Option<A>, number]) => Option.isNone(s[0]) && s[1] >= 0
    return STM.iterate(
      init,
      cont
    )((s) => {
      const index = s[1]
      return pipe(
        self.chunk,
        Chunk.unsafeGet(index)
      ).get.flatMap((a) =>
        f(a).map((result) =>
          [
            result ? Option.some(a) : Option.none,
            index - 1
          ] as [Option.Option<A>, number]
        )
      )
    }).map((tuple) => tuple[0])
  }
}
