import { StreamInternal } from "@effect/core/stream/Stream/operations/_internal/StreamInternal"
import type { Chunk } from "@fp-ts/data/Chunk"
import type { Option } from "@fp-ts/data/Option"

/**
 * Like `unfoldChunkEffect`, but allows the emission of values to end one step
 * further than the unfolding of the state. This is useful for embedding
 * paginated APIs, hence the name.
 *
 * @tsplus static effect/core/stream/Stream.Ops paginateChunkEffect
 * @category mutations
 * @since 1.0.0
 */
export function paginateChunkEffect<S, R, E, A>(
  s: S,
  f: (s: S) => Effect<R, E, readonly [Chunk<A>, Option<S>]>
): Stream<R, E, A> {
  return new StreamInternal(Channel.suspend(loop(s, f)))
}

function loop<S, R, E, A>(
  s: S,
  f: (s: S) => Effect<R, E, readonly [Chunk<A>, Option<S>]>
): Channel<R, unknown, unknown, unknown, E, Chunk<A>, unknown> {
  return Channel.unwrap(
    f(s).map(([as, option]) => {
      switch (option._tag) {
        case "None": {
          return Channel.write(as).zipRight(Channel.unit)
        }
        case "Some": {
          return Channel.write(as).flatMap(() => loop(s, f))
        }
      }
    })
  )
}
