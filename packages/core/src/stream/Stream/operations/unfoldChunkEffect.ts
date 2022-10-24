import { StreamInternal } from "@effect/core/stream/Stream/operations/_internal/StreamInternal"
import type { Chunk } from "@fp-ts/data/Chunk"
import type { Option } from "@fp-ts/data/Option"

/**
 * Creates a stream by effectfully peeling off the "layers" of a value of type
 * `S`.
 *
 * @tsplus static effect/core/stream/Stream.Ops unfoldChunkEffect
 * @category constructors
 * @since 1.0.0
 */
export function unfoldChunkEffect<S, R, E, A>(
  s: S,
  f: (s: S) => Effect<R, E, Option<readonly [Chunk<A>, S]>>
): Stream<R, E, A> {
  return new StreamInternal(loop(s, f))
}

function loop<S, R, E, A>(
  s: S,
  f: (s: S) => Effect<R, E, Option<readonly [Chunk<A>, S]>>
): Channel<R, unknown, unknown, unknown, E, Chunk<A>, unknown> {
  return Channel.unwrap(
    f(s).map((option) => {
      switch (option._tag) {
        case "None": {
          return Channel.unit
        }
        case "Some": {
          const [as, s] = option.value
          return Channel.write(as).flatMap(() => loop(s, f))
        }
      }
    })
  )
}
