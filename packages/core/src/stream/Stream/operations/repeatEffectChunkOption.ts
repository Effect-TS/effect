import type { Chunk } from "@fp-ts/data/Chunk"
import * as Option from "@fp-ts/data/Option"

/**
 * Creates a stream from an effect producing chunks of `A` values until it
 * fails with `None`.
 *
 * @tsplus static effect/core/stream/Stream.Ops repeatEffectChunkOption
 * @category repetition
 * @since 1.0.0
 */
export function repeatEffectChunkOption<R, E, A>(
  effect: Effect<R, Option.Option<E>, Chunk<A>>
): Stream<R, E, A> {
  return Stream.unfoldChunkEffect(effect, (eff) =>
    eff
      .map((chunk) => Option.some([chunk, eff] as const))
      .catchAll((option) => {
        switch (option._tag) {
          case "None": {
            return Effect.none
          }
          case "Some": {
            return Effect.fail(option.value)
          }
        }
      }))
}
