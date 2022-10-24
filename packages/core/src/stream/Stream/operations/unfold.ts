import * as Chunk from "@fp-ts/data/Chunk"
import { pipe } from "@fp-ts/data/Function"
import * as Option from "@fp-ts/data/Option"

/**
 * Creates a stream by peeling off the "layers" of a value of type `S`.
 *
 * @tsplus static effect/core/stream/Stream.Ops unfold
 * @category constructors
 * @since 1.0.0
 */
export function unfold<S, A>(
  s: S,
  f: (s: S) => Option.Option<readonly [A, S]>
): Stream<never, never, A> {
  return Stream.unfoldChunk(s, (s) =>
    pipe(
      f(s),
      Option.map(([a, s]) => [Chunk.single(a), s])
    ))
}
