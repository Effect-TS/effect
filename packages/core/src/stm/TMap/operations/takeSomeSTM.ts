import * as Chunk from "@fp-ts/data/Chunk"
import { pipe } from "@fp-ts/data/Function"
import * as Option from "@fp-ts/data/Option"
/**
 * Takes all matching values, or retries until there is at least one.
 *
 * @tsplus static effect/core/stm/TMap.Aspects takeSomeSTM
 * @tsplus pipeable effect/core/stm/TMap takeSomeSTM
 * @category mutations
 * @since 1.0.0
 */
export function takeSomeSTM<K, V, R, E, A>(
  pf: (kv: readonly [K, V]) => STM<R, Option.Option<E>, A>
) {
  return (self: TMap<K, V>): STM<R, E, Chunk.Chunk<A>> =>
    // todo: rewrite to STM<R, E, NonEmptyChunk<A>>
    self
      .findAllSTM((kv) => pf(kv).map((a) => [kv[0], a] as const))
      .map(Chunk.fromIterable)
      .continueOrRetry((chunk) => chunk.length > 0 ? Option.some(chunk) : Option.none)
      .flatMap((both) =>
        self
          .deleteAll(pipe(both, Chunk.map((entry) => entry[0])))
          .as(pipe(both, Chunk.map((entry) => entry[1])))
      )
}
