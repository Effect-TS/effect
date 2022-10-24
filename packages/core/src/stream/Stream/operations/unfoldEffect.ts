import * as Chunk from "@fp-ts/data/Chunk"
import * as Option from "@fp-ts/data/Option"

/**
 * Creates a stream by effectfully peeling off the "layers" of a value of type
 * `S`.
 *
 * @tsplus static effect/core/stream/Stream.Ops unfoldEffect
 * @category constructors
 * @since 1.0.0
 */
export function unfoldEffect<S, R, E, A>(
  s: S,
  f: (s: S) => Effect<R, E, Option.Option<readonly [A, S]>>
): Stream<R, E, A> {
  return Stream.unfoldChunkEffect<S, R, E, A>(
    s,
    (s) => f(s).map(Option.map(([a, s]) => [Chunk.single(a), s]))
  )
}
