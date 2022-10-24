import { StreamInternal } from "@effect/core/stream/Stream/operations/_internal/StreamInternal"
import * as Chunk from "@fp-ts/data/Chunk"
import type { Option } from "@fp-ts/data/Option"

/**
 * Creates a stream from an effect producing a value of type `A` or an empty
 * `Stream`.
 *
 * @tsplus static effect/core/stream/Stream.Ops fromEffectOption
 * @category conversions
 * @since 1.0.0
 */
export function fromEffectOption<R, E, A>(effect: Effect<R, Option<E>, A>): Stream<R, E, A> {
  return new StreamInternal(
    Channel.unwrap(
      effect.fold(
        (option) => {
          switch (option._tag) {
            case "None": {
              return Channel.unit
            }
            case "Some": {
              return Channel.fail(option.value)
            }
          }
        },
        (a) => Channel.write(Chunk.single(a))
      )
    )
  )
}
