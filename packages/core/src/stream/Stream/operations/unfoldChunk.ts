import { StreamInternal } from "@effect/core/stream/Stream/operations/_internal/StreamInternal"
import type { Chunk } from "@fp-ts/data/Chunk"
import type { Option } from "@fp-ts/data/Option"

/**
 * Creates a stream by peeling off the "layers" of a value of type `S`.
 *
 * @tsplus static effect/core/stream/Stream.Ops unfoldChunk
 * @category constructors
 * @since 1.0.0
 */
export function unfoldChunk<S, A>(
  s: S,
  f: (s: S) => Option<readonly [Chunk<A>, S]>
): Stream<never, never, A> {
  return new StreamInternal(Channel.suspend(loop(s, f)))
}

function loop<S, A>(
  s: S,
  f: (s: S) => Option<readonly [Chunk<A>, S]>
): Channel<never, unknown, unknown, unknown, never, Chunk<A>, unknown> {
  const option = f(s)
  switch (option._tag) {
    case "None": {
      return Channel.unit
    }
    case "Some": {
      const [as, s] = option.value
      return Channel.write(as).flatMap(() => loop(s, f))
    }
  }
}
