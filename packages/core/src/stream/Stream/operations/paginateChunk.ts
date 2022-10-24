import { StreamInternal } from "@effect/core/stream/Stream/operations/_internal/StreamInternal"
import type { Chunk } from "@fp-ts/data/Chunk"
import type { Option } from "@fp-ts/data/Option"

/**
 * Like `unfoldChunk`, but allows the emission of values to end one step
 * further than the unfolding of the state. This is useful for embedding
 * paginated APIs, hence the name.
 *
 * @tsplus static effect/core/stream/Stream.Ops paginateChunk
 * @category mutations
 * @since 1.0.0
 */
export function paginateChunk<S, A>(
  s: S,
  f: (s: S) => readonly [Chunk<A>, Option<S>]
): Stream<never, never, A> {
  return new StreamInternal(Channel.suspend(loop(s, f)))
}

function loop<S, A>(
  s: S,
  f: (s: S) => readonly [Chunk<A>, Option<S>]
): Channel<never, unknown, unknown, unknown, never, Chunk<A>, unknown> {
  const [as, option] = f(s)
  switch (option._tag) {
    case "None": {
      return Channel.write(as).zipRight(Channel.unit)
    }
    case "Some": {
      return Channel.write(as).flatMap(() => loop(s, f))
    }
  }
}
