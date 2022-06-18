import { StreamInternal } from "@effect/core/stream/Stream/operations/_internal/StreamInternal"

/**
 * Creates a stream by effectfully peeling off the "layers" of a value of type
 * `S`.
 *
 * @tsplus static ets/Stream/Ops unfoldChunkEffect
 */
export function unfoldChunkEffect<S, R, E, A>(
  s: LazyArg<S>,
  f: (s: S) => Effect<R, E, Maybe<Tuple<[Chunk<A>, S]>>>
): Stream<R, E, A> {
  return new StreamInternal(loop(s, f))
}

function loop<S, R, E, A>(
  s: LazyArg<S>,
  f: (s: S) => Effect<R, E, Maybe<Tuple<[Chunk<A>, S]>>>
): Channel<R, unknown, unknown, unknown, E, Chunk<A>, unknown> {
  return Channel.unwrap(
    f(s()).map((option) => option.fold(Channel.unit, ({ tuple: [as, s] }) => Channel.write(as) > loop(s, f)))
  )
}
