import { concreteTArray } from "@effect/core/stm/TArray/operations/_internal/InternalTArray"
import * as Chunk from "@fp-ts/data/Chunk"
import { pipe } from "@fp-ts/data/Function"
import * as Option from "@fp-ts/data/Option"

/**
 * Find the first element in the array matching a transactional predicate.
 *
 * @tsplus static effect/core/stm/TArray.Aspects findSTM
 * @tsplus pipeable effect/core/stm/TArray findSTM
 * @category elements
 * @since 1.0.0
 */
export function findSTM<E, A>(f: (a: A) => STM<never, E, boolean>) {
  return (self: TArray<A>): STM<never, E, Option.Option<A>> => {
    concreteTArray(self)
    const init = [Option.none, 0 as number] as [Option.Option<A>, number]
    const cont = (s: readonly [Option.Option<A>, number]) =>
      Option.isNone(s[0]) && s[1] < self.chunk.length
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
            index + 1
          ] as [Option.Option<A>, number]
        )
      )
    }).map((tuple) => tuple[0])
  }
}
